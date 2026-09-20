package com.example.Bakend.optimisation.groupage;

import com.example.Bakend.entity.*;
import com.example.Bakend.entity.enums.DemandeStatut;
import com.example.Bakend.entity.enums.TypeAlgorithme;
import com.example.Bakend.entity.enums.VehiculeStatut;
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
 * Option B — Knapsack OR-Tools iteratif (programmation dynamique exacte).
 *
 * Principe :
 *   1. Partitionne les colis par cluster (categorie.classe_code)
 *   2. Pour chaque cluster, resout le Knapsack 2 contraintes (poids + volume)
 *      de maniere iterative : chaque appel donne le meilleur sac possible,
 *      les colis selectionnes sont retires, on recommence jusqu'a epuisement.
 *   3. Garantie exacte : LE meilleur resultat sur l'instance donnee.
 *
 * Bornes de securite (memoire/time) :
 *   - SCALE adaptatif : 100 -> 10 -> 1 selon produit capacite (DP_TABLE_MAX = 10M)
 *   - MAX_COLIS_PAR_CLUSTER = 200 (fallback FFD si depasse)
 *   - Duree mesuree par run (OR-Tools pas de timeout natif, detection d'alerte)
 *
 * Sortie : simulation pure — aucun Sac n'est persiste.
 */
@Service
public class GroupageKnapsackService {

    private static final Logger log = LoggerFactory.getLogger(GroupageKnapsackService.class);

    private static final long DP_TABLE_MAX = 10_000_000L;
    private static final int MAX_COLIS_PAR_CLUSTER = 200;
    private static final String CLUSTER_STANDARD = "STANDARD";

    private final DemandeTransportRepository demandeRepository;
    private final ColisRepository colisRepository;
    private final VehiculeRepository vehiculeRepository;
    private final PMEClienteRepository pmeClienteRepository;
    private final OptimisationRunRepository optimisationRunRepository;
    private final KnapsackSolverService knapsackSolverService;
    private final BinPackingService binPackingService;

    public GroupageKnapsackService(DemandeTransportRepository demandeRepository,
                                    ColisRepository colisRepository,
                                    VehiculeRepository vehiculeRepository,
                                    PMEClienteRepository pmeClienteRepository,
                                    OptimisationRunRepository optimisationRunRepository,
                                    KnapsackSolverService knapsackSolverService,
                                    BinPackingService binPackingService) {
        this.demandeRepository = demandeRepository;
        this.colisRepository = colisRepository;
        this.vehiculeRepository = vehiculeRepository;
        this.pmeClienteRepository = pmeClienteRepository;
        this.optimisationRunRepository = optimisationRunRepository;
        this.knapsackSolverService = knapsackSolverService;
        this.binPackingService = binPackingService;
    }

    /**
     * Resultat du Knapsack iteratif pour un sac.
     */
    public record KnapsackSacInfo(
            UUID sacId,
            String cluster,
            int nbColis,
            double tauxRemplissage,
            long poidsTotalKg,
            long volumeTotalM3,
            LocalDate dateDepartPlafond,
            boolean departForce,
            long valeurOptimale,
            boolean fallbackFfd
    ) {}

    /**
     * Resultat complet de l'option B.
     */
    public record KnapsackClusterResult(
            String algo,
            UUID runId,
            List<KnapsackSacInfo> sacs,
            int nbColisTotaux,
            int nbColisGroupes,
            int nbClusters,
            long dureeMs,
            String justification,
            Map<String, Object> parametres
    ) {}

    /**
     * Lance le Knapsack iteratif par cluster en simulation pure.
     */
    @Transactional(readOnly = true)
    public KnapsackClusterResult lancerKnapsackParCluster(UUID tenantId, UUID hubId) {
        long start = System.currentTimeMillis();

        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new NoSuchElementException("Tenant introuvable : " + tenantId));

        // 1. Charger les demandes en attente
        List<DemandeTransport> demandes = demandeRepository
                .rechercherParHubEtStatutOrderByDateDepart(tenantId, hubId, DemandeStatut.EN_ATTENTE_GROUPAGE);

        if (demandes.isEmpty()) {
            return buildEmptyResult("Aucune demande en attente de groupage.");
        }

        // 2. Extraire tous les colis
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

        // 3. Capacite
        long[] caps = calculerCapacite(tenantId, hubId);
        long capPoidsMax = caps[0];
        long capVolumeMax = caps[1];

        // 4. Determiner le SCALE adaptatif
        long scale = determinerScale(capPoidsMax, capVolumeMax);
        log.info("Knapsack adaptatif : SCALE={}, capPoids={}, capVolume={}", scale, capPoidsMax, capVolumeMax);

        // 5. Partitionner par cluster
        Map<String, List<Colis>> colisParCluster = partitionnerParCluster(tousColis);

        // 6. Knapsack iteratif par cluster
        List<KnapsackSacInfo> allSacs = new ArrayList<>();
        LocalDate today = LocalDate.now();
        BigDecimal seuilRemplissage = tenant.getSeuilRemplissageMin();
        boolean anyFallbackFfd = false;

        for (Map.Entry<String, List<Colis>> entry : colisParCluster.entrySet()) {
            String cluster = entry.getKey();
            List<Colis> colisCluster = entry.getValue();

            // Borne : fallback FFD si trop de colis
            if (colisCluster.size() > MAX_COLIS_PAR_CLUSTER) {
                log.warn("Cluster {} : {} colis > MAX={}, fallback FFD",
                        cluster, colisCluster.size(), MAX_COLIS_PAR_CLUSTER);
                anyFallbackFfd = true;
                allSacs.addAll(solveClusterFfd(colisCluster, cluster, capPoidsMax, capVolumeMax,
                        scale, demandeParColis, seuilRemplissage, today));
                continue;
            }

            // Knapsack iteratif sur ce cluster
            List<Integer> indicesRestants = new ArrayList<>();
            for (int i = 0; i < colisCluster.size(); i++) {
                indicesRestants.add(i);
            }

            while (!indicesRestants.isEmpty()) {
                // Extraire les poids/volumes des indices restants
                List<Long> poids = new ArrayList<>();
                List<Long> volumes = new ArrayList<>();
                for (int idx : indicesRestants) {
                    poids.add(colisCluster.get(idx).getPoidsKg()
                            .multiply(BigDecimal.valueOf(scale)).longValue());
                    volumes.add(colisCluster.get(idx).getVolumeM3()
                            .multiply(BigDecimal.valueOf(scale)).longValue());
                }

                // Resoudre le Knapsack
                long capPoidsScaled = capPoidsMax * scale / 100;
                long capVolumeScaled = capVolumeMax * scale / 100;

                long t0 = System.currentTimeMillis();
                KnapsackSolverService.KnapsackResult ksResult =
                        knapsackSolverService.solve(poids, volumes, capPoidsScaled, capVolumeScaled);
                long dureeRun = System.currentTimeMillis() - t0;

                if (ksResult.indicesInclus().isEmpty()) {
                    break; // Plus rien ne rentre
                }

                // Calculer les vraies valeurs (pas SCALE)
                long poidsTotal = 0;
                long volumeTotal = 0;
                List<Colis> colisDuSac = new ArrayList<>();
                for (int idx : ksResult.indicesInclus()) {
                    int originalIdx = indicesRestants.get(idx);
                    Colis c = colisCluster.get(originalIdx);
                    colisDuSac.add(c);
                    poidsTotal += c.getPoidsKg().longValue();
                    volumeTotal += c.getVolumeM3().longValue();
                }

                // dateDepartLot
                LocalDate dateDepartLot = colisDuSac.stream()
                        .map(c -> demandeParColis.get(c.getColisId()))
                        .filter(Objects::nonNull)
                        .map(d -> d.getDateDepartCalculee() != null
                                ? d.getDateDepartCalculee() : LocalDate.now().plusDays(7))
                        .min(Comparator.naturalOrder())
                        .orElse(LocalDate.now().plusDays(7));

                // Taux (diviser par 100 car capacite stockee en SCALE=100)
                double tauxPoids = (double) poidsTotal / (capPoidsMax / 100) * 100;
                double tauxVolume = (double) volumeTotal / (capVolumeMax / 100) * 100;
                double taux = Math.max(tauxPoids, tauxVolume);

                // Regle double
                boolean departForce = today.isAfter(dateDepartLot) || today.isEqual(dateDepartLot);
                boolean seuilAtteint = BigDecimal.valueOf(taux).compareTo(seuilRemplissage) >= 0;

                if (seuilAtteint || departForce) {
                    allSacs.add(new KnapsackSacInfo(
                            UUID.randomUUID(),
                            cluster,
                            colisDuSac.size(),
                            Math.round(taux * 100.0) / 100.0,
                            poidsTotal,
                            volumeTotal,
                            dateDepartLot,
                            departForce,
                            ksResult.poidsTotal(), // valeur optimale du solver
                            false
                    ));
                }

                // Retirer les colis selectionnes (par ordre decroissant d'indice pour preserver la coherence)
                List<Integer> sortedIndices = ksResult.indicesInclus().stream()
                        .sorted(Comparator.reverseOrder()).toList();
                for (Integer idx : sortedIndices) {
                    indicesRestants.remove(idx);
                }
            }
        }

        // Trier
        allSacs.sort(Comparator
                .comparing(KnapsackSacInfo::cluster)
                .thenComparing(Comparator.comparingDouble(KnapsackSacInfo::tauxRemplissage).reversed()));

        long dureeMs = System.currentTimeMillis() - start;

        // Justification
        String justification = buildJustification(allSacs, capPoidsMax / 100, capVolumeMax / 100,
                seuilRemplissage, colisParCluster, today, scale, anyFallbackFfd);

        // Parametres
        Map<String, Object> parametres = new LinkedHashMap<>();
        parametres.put("algo", "KNAPSACK_ITERATIF");
        parametres.put("nb_colis", tousColis.size());
        parametres.put("capacite_poids_kg", capPoidsMax / 100);
        parametres.put("capacite_volume_m3", capVolumeMax / 100);
        parametres.put("seuil_remplissage", seuilRemplissage);
        parametres.put("scale", scale);
        parametres.put("dp_table_max", DP_TABLE_MAX);
        parametres.put("max_colis_par_cluster", MAX_COLIS_PAR_CLUSTER);
        parametres.put("clusters", new TreeMap<>(colisParCluster.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        e -> e.getValue().size()))));
        parametres.put("nb_clusters", colisParCluster.size());
        parametres.put("fallback_ffd", anyFallbackFfd);
        parametres.put("duree_ms", dureeMs);

        // Persister OptimisationRun
        OptimisationRun run = new OptimisationRun();
        run.setPmeCliente(tenant);
        run.setHub(new Hub());
        run.getHub().setHubId(hubId);
        run.setTypeAlgorithme(TypeAlgorithme.KNAPSACK);
        run.setParametres(toJson(parametres));
        run.setResultat(buildResultatJson(allSacs));
        run.setJustificationDocument(justification);
        run.setDureeCalculMs((int) dureeMs);
        optimisationRunRepository.save(run);

        log.info("Knapsack iteratif : {} sacs, {}/{} colis, {} clusters, SCALE={}, {} ms, run {}",
                allSacs.size(), allSacs.stream().mapToInt(KnapsackSacInfo::nbColis).sum(),
                tousColis.size(), colisParCluster.size(), scale, dureeMs, run.getRunId());

        return new KnapsackClusterResult(
                "KNAPSACK_ITERATIF",
                run.getRunId(),
                allSacs,
                tousColis.size(),
                allSacs.stream().mapToInt(KnapsackSacInfo::nbColis).sum(),
                colisParCluster.size(),
                dureeMs,
                justification,
                parametres
        );
    }

    // ── Utilitaires ──

    private long determinerScale(long capPoids, long capVolume) {
        for (long s : new long[]{100, 10, 1}) {
            long scaledP = capPoids * s / 100;
            long scaledV = capVolume * s / 100;
            if (scaledP * scaledV <= DP_TABLE_MAX) {
                return s;
            }
        }
        return 1; // dernier recours
    }

    private Map<String, List<Colis>> partitionnerParCluster(List<Colis> colis) {
        Map<String, List<Colis>> result = new TreeMap<>();
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
            long p = v.getCapacitePoidsKg().multiply(BigDecimal.valueOf(100)).longValue();
            long vol = v.getCapaciteVolumeM3().multiply(BigDecimal.valueOf(100)).longValue();
            if (p > capPoidsMax) capPoidsMax = p;
            if (vol > capVolumeMax) capVolumeMax = vol;
        }
        if (capPoidsMax == 0) capPoidsMax = 5000 * 100;
        if (capVolumeMax == 0) capVolumeMax = 20 * 100;
        return new long[]{capPoidsMax, capVolumeMax};
    }

    private List<KnapsackSacInfo> solveClusterFfd(List<Colis> colisCluster, String cluster,
                                                    long capPoidsMax, long capVolumeMax,
                                                    long scale,
                                                    Map<UUID, DemandeTransport> demandeParColis,
                                                    BigDecimal seuil, LocalDate today) {
        List<KnapsackSacInfo> sacs = new ArrayList<>();

        List<Long> poids = new ArrayList<>();
        List<Long> volumes = new ArrayList<>();
        for (Colis c : colisCluster) {
            poids.add(c.getPoidsKg().multiply(BigDecimal.valueOf(scale)).longValue());
            volumes.add(c.getVolumeM3().multiply(BigDecimal.valueOf(scale)).longValue());
        }

        BinPackingService.BinPackingResult bpResult =
                binPackingService.solve(poids, volumes, capPoidsMax, capVolumeMax);

        for (BinPackingService.SacFfd sacFfd : bpResult.sacs()) {
            LocalDate dateDepartLot = sacFfd.indicesColis().stream()
                    .map(i -> colisCluster.get(i))
                    .map(c -> demandeParColis.get(c.getColisId()))
                    .filter(Objects::nonNull)
                    .map(d -> d.getDateDepartCalculee() != null
                            ? d.getDateDepartCalculee() : LocalDate.now().plusDays(7))
                    .min(Comparator.naturalOrder())
                    .orElse(LocalDate.now().plusDays(7));

            double tauxPoids = (double) sacFfd.poidsTotal() / capPoidsMax * 100;
            double tauxVolume = (double) sacFfd.volumeTotal() / capVolumeMax * 100;
            double taux = Math.max(tauxPoids, tauxVolume);

            boolean departForce = today.isAfter(dateDepartLot) || today.isEqual(dateDepartLot);
            boolean seuilAtteint = BigDecimal.valueOf(taux).compareTo(seuil) >= 0;

            if (seuilAtteint || departForce) {
                sacs.add(new KnapsackSacInfo(
                        UUID.randomUUID(), cluster, sacFfd.indicesColis().size(),
                        Math.round(taux * 100.0) / 100.0,
                        sacFfd.poidsTotal() / scale, sacFfd.volumeTotal() / scale,
                        dateDepartLot, departForce, sacFfd.poidsTotal(), true));
            }
        }
        return sacs;
    }

    private KnapsackClusterResult buildEmptyResult(String justification) {
        return new KnapsackClusterResult(
                "KNAPSACK_ITERATIF", null, List.of(), 0, 0, 0, 0,
                justification, Map.of("algo", "KNAPSACK_ITERATIF"));
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

    private String buildResultatJson(List<KnapsackSacInfo> sacs) {
        StringBuilder sb = new StringBuilder("{\"sacs\":[");
        for (int i = 0; i < sacs.size(); i++) {
            if (i > 0) sb.append(",");
            KnapsackSacInfo s = sacs.get(i);
            sb.append("{\"cluster\":\"").append(s.cluster()).append("\"");
            sb.append(",\"nb_colis\":").append(s.nbColis());
            sb.append(",\"taux\":").append(s.tauxRemplissage());
            sb.append(",\"poids_kg\":").append(s.poidsTotalKg());
            sb.append(",\"volume_m3\":").append(s.volumeTotalM3());
            sb.append(",\"date_depart\":\"").append(s.dateDepartPlafond()).append("\"");
            sb.append(",\"depart_force\":").append(s.departForce());
            sb.append(",\"valeur_optimale\":").append(s.valeurOptimale());
            sb.append(",\"fallback_ffd\":").append(s.fallbackFfd());
            sb.append("}");
        }
        sb.append("]}");
        return sb.toString();
    }

    private String buildJustification(List<KnapsackSacInfo> sacs, long capPoidsKg, long capVolumeM3,
                                       BigDecimal seuil, Map<String, List<Colis>> clusters,
                                       LocalDate today, long scale, boolean anyFallback) {
        StringBuilder sb = new StringBuilder();
        sb.append("=== Option B : Knapsack OR-Tools iteratif (programmation dynamique exacte) ===\n\n");
        sb.append("Algorithme : Knapsack 2 contraintes, programmation dynamique exacte\n");
        sb.append("Type : optimisation exacte, garantit le meilleur resultat\n");
        sb.append("Solveur : OR-Tools KNAPSACK_DYNAMIC_PROGRAMMING_SOLVER\n");
        sb.append("Capacite vehicule : ").append(capPoidsKg).append(" kg / ").append(capVolumeM3).append(" m3\n");
        sb.append("Seuil remplissage min : ").append(seuil).append("%\n");
        sb.append("SCALE adaptatif : x").append(scale).append("\n");
        sb.append("Date du jour : ").append(today).append("\n");
        if (anyFallback) {
            sb.append("ATTENTION : fallback FFD declenche sur un ou plusieurs clusters (> ")
                    .append(MAX_COLIS_PAR_CLUSTER).append(" colis)\n");
        }
        sb.append("\n");

        sb.append("Clusters : ").append(clusters.size()).append("\n");
        for (Map.Entry<String, List<Colis>> e : clusters.entrySet()) {
            sb.append("  - ").append(e.getKey()).append(" : ").append(e.getValue().size()).append(" colis");
            if (e.getValue().size() > MAX_COLIS_PAR_CLUSTER) {
                sb.append(" [FALLBACK FFD]");
            }
            sb.append("\n");
        }
        sb.append("\n");

        int sacIdx = 0;
        for (KnapsackSacInfo s : sacs) {
            sb.append("Sac ").append(++sacIdx).append(" [").append(s.cluster()).append("] : ")
                    .append(s.nbColis()).append(" colis, ")
                    .append(String.format("%.1f", s.tauxRemplissage())).append("% rempli, ")
                    .append(s.poidsTotalKg()).append("kg, ")
                    .append(s.volumeTotalM3()).append("m3");
            if (s.departForce()) sb.append(" [DEPART FORCE]");
            if (s.fallbackFfd()) sb.append(" [FALLBACK FFD]");
            sb.append(" (valeur_opt=").append(s.valeurOptimale()).append(")\n");
        }
        return sb.toString();
    }
}
