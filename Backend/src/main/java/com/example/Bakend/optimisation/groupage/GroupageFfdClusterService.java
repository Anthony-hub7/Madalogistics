package com.example.Bakend.optimisation.groupage;

import com.example.Bakend.entity.*;
import com.example.Bakend.entity.enums.DemandeStatut;
import com.example.Bakend.entity.enums.TypeAlgorithme;
import com.example.Bakend.entity.enums.VehiculeStatut;
import com.example.Bakend.optimisation.delai.DelaiService;
import com.example.Bakend.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Option A — FFD par cluster (heuristique gloutonne, First Fit Decreasing).
 *
 * Principe : partitionne les colis par cluster (categorie.classe_code),
 * puis lance un FFD independant par cluster. Un sac ne contient que des
 * colis du meme cluster (homogeneite garantie).
 *
 * Algorithme : FFD, garantie 11/9 * OPT + 1 (Johnson 1973).
 *
 * Sortie : simulation pure — aucun Sac n'est persiste.
 * Seul un OptimisationRun (BIN_PACKING) est cree pour la trace.
 *
 * Note : contrairement a GroupageOrchestrationService, ce service ne modifie
 * PAS le statut des demandes (pas de GROUPEE) et ne lie PAS les colis a des sacs.
 * C'est le endpoint /valider qui fera la persistance reelle.
 */
@Service
public class GroupageFfdClusterService {

    private static final Logger log = LoggerFactory.getLogger(GroupageFfdClusterService.class);

    private static final long SCALE = 100;
    private static final String CLUSTER_STANDARD = "STANDARD";

    private final DemandeTransportRepository demandeRepository;
    private final ColisRepository colisRepository;
    private final VehiculeRepository vehiculeRepository;
    private final PMEClienteRepository pmeClienteRepository;
    private final OptimisationRunRepository optimisationRunRepository;
    private final BinPackingService binPackingService;

    public GroupageFfdClusterService(DemandeTransportRepository demandeRepository,
                                      ColisRepository colisRepository,
                                      VehiculeRepository vehiculeRepository,
                                      PMEClienteRepository pmeClienteRepository,
                                      OptimisationRunRepository optimisationRunRepository,
                                      BinPackingService binPackingService) {
        this.demandeRepository = demandeRepository;
        this.colisRepository = colisRepository;
        this.vehiculeRepository = vehiculeRepository;
        this.pmeClienteRepository = pmeClienteRepository;
        this.optimisationRunRepository = optimisationRunRepository;
        this.binPackingService = binPackingService;
    }

    /**
     * Resultat du FFD par cluster pour un sac.
     */
    public record FfdClusterSacInfo(
            UUID sacId,
            String cluster,
            int nbColis,
            double tauxRemplissage,
            long poidsTotalKg,
            long volumeTotalM3,
            LocalDate dateDepartPlafond,
            boolean departForce
    ) {}

    /**
     * Resultat complet de l'option A.
     */
    public record FfdClusterResult(
            String algo,
            UUID runId,
            List<FfdClusterSacInfo> sacs,
            int nbColisTotaux,
            int nbColisGroupes,
            int nbClusters,
            long dureeMs,
            String justification,
            Map<String, Object> parametres
    ) {}

    /**
     * Lance le FFD par cluster en simulation pure (pas de persistance Sac).
     */
    @Transactional(readOnly = true)
    public FfdClusterResult lancerFfdParCluster(UUID tenantId, UUID hubId) {
        long start = System.currentTimeMillis();

        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new NoSuchElementException("Tenant introuvable : " + tenantId));

        // 1. Charger les demandes en attente
        List<DemandeTransport> demandes = demandeRepository
                .rechercherParHubEtStatutOrderByDateDepart(tenantId, hubId, DemandeStatut.EN_ATTENTE_GROUPAGE);

        if (demandes.isEmpty()) {
            return buildEmptyResult("Aucune demande en attente de groupage.");
        }

        // 2. Extraire tous les colis et les indexer
        List<Colis> tousColis = new ArrayList<>();
        Map<UUID, DemandeTransport> demandeParColis = new LinkedHashMap<>();
        Map<UUID, LocalDate> dateDepartParDemande = new LinkedHashMap<>();

        for (DemandeTransport d : demandes) {
            List<Colis> colisDemande = colisRepository.findByDemandeDemandeId(d.getDemandeId());
            for (Colis c : colisDemande) {
                tousColis.add(c);
                demandeParColis.put(c.getColisId(), d);
            }
            dateDepartParDemande.put(d.getDemandeId(),
                    d.getDateDepartCalculee() != null ? d.getDateDepartCalculee() : LocalDate.now().plusDays(7));
        }

        if (tousColis.isEmpty()) {
            return buildEmptyResult("Les demandes selectionnees ne contiennent aucun colis.");
        }

        // 3. Capacite = plus grand vehicule disponible du hub
        long[] caps = calculerCapacite(tenantId, hubId);
        long capPoidsMax = caps[0];
        long capVolumeMax = caps[1];

        // 4. Partitionner par cluster (colis.categorie.classe_code)
        Map<String, List<Colis>> colisParCluster = partitionnerParCluster(tousColis);

        // 5. FFD par cluster
        List<FfdClusterSacInfo> allSacs = new ArrayList<>();
        LocalDate today = LocalDate.now();
        BigDecimal seuilRemplissage = tenant.getSeuilRemplissageMin();

        for (Map.Entry<String, List<Colis>> entry : colisParCluster.entrySet()) {
            String cluster = entry.getKey();
            List<Colis> colisCluster = entry.getValue();

            // Convertir en long[] pour le solveur
            List<Long> poids = new ArrayList<>();
            List<Long> volumes = new ArrayList<>();
            for (Colis c : colisCluster) {
                poids.add(c.getPoidsKg().multiply(BigDecimal.valueOf(SCALE)).longValue());
                volumes.add(c.getVolumeM3().multiply(BigDecimal.valueOf(SCALE)).longValue());
            }

            // FFD sur ce cluster
            BinPackingService.BinPackingResult bpResult =
                    binPackingService.solve(poids, volumes, capPoidsMax, capVolumeMax);

            // Analyser chaque sac FFD
            for (BinPackingService.SacFfd sacFfd : bpResult.sacs()) {
                // dateDepartLot = min(dateDepartCalculee) des colis du sac
                LocalDate dateDepartLot = sacFfd.indicesColis().stream()
                        .map(i -> colisCluster.get(i))
                        .map(c -> demandeParColis.get(c.getColisId()))
                        .filter(Objects::nonNull)
                        .map(d -> d.getDateDepartCalculee() != null
                                ? d.getDateDepartCalculee() : LocalDate.now().plusDays(7))
                        .min(Comparator.naturalOrder())
                        .orElse(LocalDate.now().plusDays(7));

                // Taux remplissage
                double tauxPoids = (double) sacFfd.poidsTotal() / capPoidsMax * 100;
                double tauxVolume = (double) sacFfd.volumeTotal() / capVolumeMax * 100;
                double taux = Math.max(tauxPoids, tauxVolume);

                // Regle de depart double
                boolean departForce = today.isAfter(dateDepartLot) || today.isEqual(dateDepartLot);
                boolean seuilAtteint = BigDecimal.valueOf(taux).compareTo(seuilRemplissage) >= 0;

                if (!seuilAtteint && !departForce) {
                    continue; // Sous-seuil et pas urgent
                }

                // Poids total en kg (pas en SCALE)
                long poidsTotalKg = sacFfd.poidsTotal() / SCALE;
                long volumeTotalM3 = sacFfd.volumeTotal() / SCALE;

                allSacs.add(new FfdClusterSacInfo(
                        UUID.randomUUID(), // ID temporaire (simulation)
                        cluster,
                        sacFfd.indicesColis().size(),
                        Math.round(taux * 100.0) / 100.0,
                        poidsTotalKg,
                        volumeTotalM3,
                        dateDepartLot,
                        departForce
                ));
            }
        }

        // Trier les sacs par cluster puis par taux descendant
        allSacs.sort(Comparator
                .comparing(FfdClusterSacInfo::cluster)
                .thenComparing(Comparator.comparingDouble(FfdClusterSacInfo::tauxRemplissage).reversed()));

        long dureeMs = System.currentTimeMillis() - start;

        // Justification
        String justification = buildJustification(allSacs, capPoidsMax / SCALE, capVolumeMax / SCALE,
                seuilRemplissage, colisParCluster, today);

        // Parametres
        Map<String, Object> parametres = new LinkedHashMap<>();
        parametres.put("algo", "FFD_PAR_CLUSTER");
        parametres.put("nb_colis", tousColis.size());
        parametres.put("capacite_poids_kg", capPoidsMax / SCALE);
        parametres.put("capacite_volume_m3", capVolumeMax / SCALE);
        parametres.put("seuil_remplissage", seuilRemplissage);
        parametres.put("clusters", new TreeMap<>(colisParCluster.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        e -> e.getValue().size()))));
        parametres.put("nb_clusters", colisParCluster.size());
        parametres.put("duree_ms", dureeMs);

        // Persister OptimisationRun
        OptimisationRun run = new OptimisationRun();
        run.setPmeCliente(tenant);
        run.setHub(new Hub());
        run.getHub().setHubId(hubId);
        run.setTypeAlgorithme(TypeAlgorithme.BIN_PACKING);
        run.setParametres(toJson(parametres));
        run.setResultat(buildResultatJson(allSacs));
        run.setJustificationDocument(justification);
        run.setDureeCalculMs((int) dureeMs);
        optimisationRunRepository.save(run);

        log.info("FFD par cluster : {} sacs, {}/{} colis, {} clusters, {} ms, run {}",
                allSacs.size(), allSacs.stream().mapToInt(FfdClusterSacInfo::nbColis).sum(),
                tousColis.size(), colisParCluster.size(), dureeMs, run.getRunId());

        return new FfdClusterResult(
                "FFD_PAR_CLUSTER",
                run.getRunId(),
                allSacs,
                tousColis.size(),
                allSacs.stream().mapToInt(FfdClusterSacInfo::nbColis).sum(),
                colisParCluster.size(),
                dureeMs,
                justification,
                parametres
        );
    }

    // ── Utilitaires ──

    private Map<String, List<Colis>> partitionnerParCluster(List<Colis> colis) {
        Map<String, List<Colis>> result = new TreeMap<>(); // tri par cluster pour output deterministe
        for (Colis c : colis) {
            String cluster = (c.getCategorie() != null && c.getCategorie().getClasseCode() != null)
                    ? c.getCategorie().getClasseCode()
                    : CLUSTER_STANDARD;
            result.computeIfAbsent(cluster, k -> new ArrayList<>()).add(c);
        }
        return result;
    }

    private long[] calculerCapacite(UUID tenantId, UUID hubId) {
        List<Vehicule> vehicules = vehiculeRepository.rechercherDisponiblesParHub(
                tenantId, hubId, VehiculeStatut.DISPONIBLE);
        long capPoidsMax = 0;
        long capVolumeMax = 0;
        for (Vehicule v : vehicules) {
            long p = v.getCapacitePoidsKg().multiply(BigDecimal.valueOf(SCALE)).longValue();
            long vol = v.getCapaciteVolumeM3().multiply(BigDecimal.valueOf(SCALE)).longValue();
            if (p > capPoidsMax) capPoidsMax = p;
            if (vol > capVolumeMax) capVolumeMax = vol;
        }
        if (capPoidsMax == 0) capPoidsMax = 5000 * SCALE;
        if (capVolumeMax == 0) capVolumeMax = 20 * SCALE;
        return new long[]{capPoidsMax, capVolumeMax};
    }

    private FfdClusterResult buildEmptyResult(String justification) {
        return new FfdClusterResult(
                "FFD_PAR_CLUSTER", null, List.of(), 0, 0, 0, 0,
                justification, Map.of("algo", "FFD_PAR_CLUSTER"));
    }

    private String toJson(Map<String, Object> map) {
        StringBuilder sb = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, Object> e : map.entrySet()) {
            if (!first) sb.append(",");
            first = false;
            sb.append("\"").append(e.getKey()).append("\":");
            if (e.getValue() instanceof String s) {
                sb.append("\"").append(s.replace("\"", "\\\"")).append("\"");
            } else if (e.getValue() instanceof Map<?, ?> m) {
                sb.append("{");
                boolean f2 = true;
                for (Map.Entry<?, ?> me : m.entrySet()) {
                    if (!f2) sb.append(",");
                    f2 = false;
                    sb.append("\"").append(me.getKey()).append("\":").append(me.getValue());
                }
                sb.append("}");
            } else {
                sb.append(e.getValue());
            }
        }
        sb.append("}");
        return sb.toString();
    }

    private String buildResultatJson(List<FfdClusterSacInfo> sacs) {
        StringBuilder sb = new StringBuilder("{\"sacs\":[");
        for (int i = 0; i < sacs.size(); i++) {
            if (i > 0) sb.append(",");
            FfdClusterSacInfo s = sacs.get(i);
            sb.append("{\"cluster\":\"").append(s.cluster()).append("\"");
            sb.append(",\"nb_colis\":").append(s.nbColis());
            sb.append(",\"taux\":").append(s.tauxRemplissage());
            sb.append(",\"poids_kg\":").append(s.poidsTotalKg());
            sb.append(",\"volume_m3\":").append(s.volumeTotalM3());
            sb.append(",\"date_depart\":\"").append(s.dateDepartPlafond()).append("\"");
            sb.append(",\"depart_force\":").append(s.departForce());
            sb.append("}");
        }
        sb.append("]}");
        return sb.toString();
    }

    private String buildJustification(List<FfdClusterSacInfo> sacs, long capPoidsKg, long capVolumeM3,
                                       BigDecimal seuil, Map<String, List<Colis>> clusters, LocalDate today) {
        StringBuilder sb = new StringBuilder();
        sb.append("=== Option A : FFD par cluster (heuristique gloutonne) ===\n\n");
        sb.append("Algorithme : First Fit Decreasing (FFD)\n");
        sb.append("Type : heuristique approchee, borne 11/9 * OPT + 1 (Johnson 1973)\n");
        sb.append("Capacite vehicule : ").append(capPoidsKg).append(" kg / ").append(capVolumeM3).append(" m3\n");
        sb.append("Seuil remplissage min : ").append(seuil).append("%\n");
        sb.append("Date du jour : ").append(today).append("\n\n");

        sb.append("Clusters : ").append(clusters.size()).append("\n");
        for (Map.Entry<String, List<Colis>> e : clusters.entrySet()) {
            sb.append("  - ").append(e.getKey()).append(" : ").append(e.getValue().size()).append(" colis\n");
        }
        sb.append("\n");

        int sacIdx = 0;
        for (FfdClusterSacInfo s : sacs) {
            sb.append("Sac ").append(++sacIdx).append(" [").append(s.cluster()).append("] : ")
                    .append(s.nbColis()).append(" colis, ")
                    .append(String.format("%.1f", s.tauxRemplissage())).append("% rempli, ")
                    .append(s.poidsTotalKg()).append("kg, ")
                    .append(s.volumeTotalM3()).append("m3");
            if (s.departForce()) {
                sb.append(" [DEPART FORCE]");
            }
            sb.append("\n");
        }
        return sb.toString();
    }
}
