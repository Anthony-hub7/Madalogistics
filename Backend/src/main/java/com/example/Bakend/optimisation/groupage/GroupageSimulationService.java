package com.example.Bakend.optimisation.groupage;

import com.example.Bakend.dto.optimisation.GroupagePreviewResponse;
import com.example.Bakend.dto.optimisation.GroupagePreviewResponse.ColisNonGroupe;
import com.example.Bakend.dto.optimisation.GroupagePreviewResponse.PreviewMeta;
import com.example.Bakend.dto.optimisation.GroupagePreviewResponse.SacPreview;
import com.example.Bakend.dto.optimisation.GroupageValiderRequest;
import com.example.Bakend.dto.optimisation.GroupageValiderResponse;
import com.example.Bakend.entity.*;
import com.example.Bakend.entity.enums.*;
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
 * Service de simulation de groupage : preview sans persistance, validation avec edition.
 *
 * Contrairement a GroupageOrchestrationService (persiste immediatement)
 * et GroupageValidationService (re-execute l'algo),
 * ce service :
 *   1. Execute l'algorithme SANS creer de Sac
 *   2. Retourne un GroupagePreviewResponse avec colisIds par sac
 *   3. Accepte des edits (exclure, deplacer) avant validation
 *   4. Persiste uniquement sur valider()
 */
@Service
public class GroupageSimulationService {

    private static final Logger log = LoggerFactory.getLogger(GroupageSimulationService.class);

    private static final long SCALE = 100;
    private static final String CLUSTER_STANDARD = "STANDARD";

    private final DemandeTransportRepository demandeRepository;
    private final ColisRepository colisRepository;
    private final VehiculeRepository vehiculeRepository;
    private final PMEClienteRepository pmeClienteRepository;
    private final OptimisationRunRepository optimisationRunRepository;
    private final SacRepository sacRepository;
    private final BinPackingService binPackingService;
    private final KnapsackSolverService knapsackSolverService;

    public GroupageSimulationService(DemandeTransportRepository demandeRepository,
                                      ColisRepository colisRepository,
                                      VehiculeRepository vehiculeRepository,
                                      PMEClienteRepository pmeClienteRepository,
                                      OptimisationRunRepository optimisationRunRepository,
                                      SacRepository sacRepository,
                                      BinPackingService binPackingService,
                                      KnapsackSolverService knapsackSolverService) {
        this.demandeRepository = demandeRepository;
        this.colisRepository = colisRepository;
        this.vehiculeRepository = vehiculeRepository;
        this.pmeClienteRepository = pmeClienteRepository;
        this.optimisationRunRepository = optimisationRunRepository;
        this.sacRepository = sacRepository;
        this.binPackingService = binPackingService;
        this.knapsackSolverService = knapsackSolverService;
    }

    /**
     * Preview groupage : execute l'algorithme SANS persister.
     * Retourne le plan complet avec colisIds par sac.
     */
    @Transactional
    public GroupagePreviewResponse preview(UUID tenantId, UUID hubId, TypeAlgorithme algo) {
        long start = System.currentTimeMillis();

        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new NoSuchElementException("Tenant introuvable : " + tenantId));

        // 1. Charger les demandes en attente
        List<DemandeTransport> demandes = demandeRepository
                .rechercherParHubEtStatutOrderByDateDepart(tenantId, hubId, DemandeStatut.EN_ATTENTE_GROUPAGE);

        if (demandes.isEmpty()) {
            return buildEmptyPreview(hubId, algo, "Aucune demande en attente de groupage.");
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
            return buildEmptyPreview(hubId, algo, "Les demandes selectionnees ne contiennent aucun colis.");
        }

        // 3. Capacite
        long[] caps = calculerCapacite(tenantId, hubId);
        long capPoidsMax = caps[0];
        long capVolumeMax = caps[1];

        // Valider chaque colis avant groupage
        for (Colis c : tousColis) {
            if (c.getPoidsKg().doubleValue() > 40_000 || c.getVolumeM3().doubleValue() > 200) {
                throw new IllegalStateException(
                    "Colis " + c.getColisId() + " : dimensions impossibles (" +
                    c.getPoidsKg() + " kg, " + c.getVolumeM3() + " m³). Veuillez corriger la commande.");
            }
            if (c.getPoidsKg().doubleValue() > capPoidsMax / SCALE || c.getVolumeM3().doubleValue() > capVolumeMax / SCALE) {
                throw new IllegalStateException(
                    "Votre agence n'a pas le véhicule pour transporter ce colis (" +
                    c.getPoidsKg() + " kg, " + c.getVolumeM3() + " m³) — capacité max du hub : " +
                    (capPoidsMax / SCALE) + " kg / " + (capVolumeMax / SCALE) + " m³.");
            }
        }

        BigDecimal seuilRemplissage = tenant.getSeuilRemplissageMin();
        LocalDate today = LocalDate.now();

        // 4. Executer l'algorithme
        List<SacPreview> sacs;
        List<ColisNonGroupe> nonGroupes;

        if (algo == TypeAlgorithme.KNAPSACK) {
            // Knapsack par cluster
            sacs = executerKnapsackPreview(tousColis, demandeParColis, capPoidsMax, capVolumeMax,
                    seuilRemplissage, today);
            nonGroupes = new ArrayList<>();
        } else {
            // FFD BinPacking
            sacs = executerFfdPreview(tousColis, demandeParColis, capPoidsMax, capVolumeMax,
                    seuilRemplissage, today);
            nonGroupes = new ArrayList<>();
        }

        long dureeMs = System.currentTimeMillis() - start;

        // 5. Sauvegarder le run en SIMULE (non valide)
        OptimisationRun run = new OptimisationRun();
        run.setPmeCliente(tenant);
        run.setHub(new Hub());
        run.getHub().setHubId(hubId);
        run.setTypeAlgorithme(algo);
        run.setParametres(buildParametresJson(tousColis.size(), capPoidsMax, capVolumeMax, seuilRemplissage, algo));
        run.setResultat(buildResultatJson(sacs));
        run.setDureeCalculMs((int) dureeMs);
        optimisationRunRepository.save(run);

        int nbColisGroupes = sacs.stream().mapToInt(SacPreview::nbColis).sum();

        PreviewMeta meta = new PreviewMeta(
                tousColis.size(),
                nbColisGroupes,
                sacs.size(),
                capPoidsMax / SCALE,
                capVolumeMax / SCALE,
                seuilRemplissage,
                dureeMs,
                java.time.LocalDateTime.now()
        );

        log.info("Preview groupage {} hub {} : {} sacs, {}/{} colis, {} ms, run {}",
                algo, hubId, sacs.size(), nbColisGroupes, tousColis.size(), dureeMs, run.getRunId());

        return new GroupagePreviewResponse(run.getRunId(), hubId, algo, sacs, nonGroupes, meta);
    }

    /**
     * Valide un run de groupage avec les sacs potentially edites.
     * Persiste les Sac + lie les colis + marque les demandes GROUPEE.
     */
    @Transactional
    public GroupageValiderResponse valider(UUID tenantId, GroupageValiderRequest request) {
        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new NoSuchElementException("Tenant introuvable : " + tenantId));

        OptimisationRun run = optimisationRunRepository.findById(request.runId())
                .orElseThrow(() -> new NoSuchElementException("Run introuvable : " + request.runId()));

        if (!run.getPmeCliente().getTenantId().equals(tenantId)) {
            throw new NoSuchElementException("Run introuvable : " + request.runId());
        }

        // Verifier que non deja valide
        List<Sac> existingSacs = sacRepository.findByRunGroupage(run);
        if (!existingSacs.isEmpty()) {
            throw new IllegalStateException("Ce run a deja ete valide : " + existingSacs.size() + " sac(s) existant(s).");
        }

        UUID hubId = run.getHub() != null ? run.getHub().getHubId() : null;
        if (hubId == null) {
            throw new IllegalStateException("Le run n'est lie a aucun hub.");
        }

        // Charger tous les colis du run pour mapper les colisIds
        Map<UUID, Colis> colisMap = new HashMap<>();
        Map<UUID, DemandeTransport> demandeParColis = new LinkedHashMap<>();
        List<DemandeTransport> demandes = demandeRepository
                .rechercherParHubEtStatutOrderByDateDepart(tenantId, hubId, DemandeStatut.EN_ATTENTE_GROUPAGE);

        for (DemandeTransport d : demandes) {
            List<Colis> colisDemande = colisRepository.findByDemandeDemandeId(d.getDemandeId());
            for (Colis c : colisDemande) {
                colisMap.put(c.getColisId(), c);
                demandeParColis.put(c.getColisId(), d);
            }
        }

        // Calculer la capacite pour les taux
        long[] caps = calculerCapacite(tenantId, hubId);
        long capPoidsMax = caps[0];
        long capVolumeMax = caps[1];

        // Creer les Sacs a partir de l'edition
        List<GroupageValiderResponse.SacCree> sacsCrees = new ArrayList<>();
        Set<UUID> demandeIdsGroupees = new HashSet<>();
        int colisLies = 0;
        int nbSacsCrees = 0;

        for (GroupageValiderRequest.SacEdit sacEdit : request.sacs()) {
            if (sacEdit.supprime() || sacEdit.colisIds() == null || sacEdit.colisIds().isEmpty()) {
                continue;
            }

            // Filtrer les colis valides
            List<Colis> colisDuSac = sacEdit.colisIds().stream()
                    .map(colisMap::get)
                    .filter(Objects::nonNull)
                    .toList();

            if (colisDuSac.isEmpty()) continue;

            // Calculer poids et volume totaux
            long poidsTotal = colisDuSac.stream()
                    .mapToLong(c -> c.getPoidsKg().multiply(BigDecimal.valueOf(SCALE)).longValue())
                    .sum();
            long volumeTotal = colisDuSac.stream()
                    .mapToLong(c -> c.getVolumeM3().multiply(BigDecimal.valueOf(SCALE)).longValue())
                    .sum();

            double tauxPoids = (double) poidsTotal / capPoidsMax * 100;
            double tauxVolume = (double) volumeTotal / capVolumeMax * 100;
            double taux = Math.max(tauxPoids, tauxVolume);

            // Date depart = min des demandes
            LocalDate dateDepart = colisDuSac.stream()
                    .map(c -> demandeParColis.get(c.getColisId()))
                    .filter(Objects::nonNull)
                    .map(d -> d.getDateDepartCalculee() != null ? d.getDateDepartCalculee() : LocalDate.now().plusDays(7))
                    .min(Comparator.naturalOrder())
                    .orElse(LocalDate.now().plusDays(7));

            // Categorie dominante
            Set<String> categories = new HashSet<>();
            for (Colis c : colisDuSac) {
                if (c.getCategorie() != null) {
                    categories.add(c.getCategorie().getClasseCode() != null
                            ? c.getCategorie().getClasseCode() : CLUSTER_STANDARD);
                }
            }

            // Creer le Sac
            Sac sac = new Sac();
            sac.setPmeCliente(tenant);
            sac.setHub(new Hub());
            sac.getHub().setHubId(hubId);
            sac.setRunGroupage(run);
            sac.setCategorieDominante(categories.isEmpty() ? "STANDARD" : categories.iterator().next());
            sac.setStatut(SacStatut.CONSTITUE);
            sac.setDateDepartPlafond(dateDepart);
            sac.setDateDepartPrevue(dateDepart);
            sac.setTauxRemplissage(BigDecimal.valueOf(taux).setScale(2, RoundingMode.HALF_UP));
            sac = sacRepository.save(sac);
            nbSacsCrees++;

            // Lier les colis
            for (Colis c : colisDuSac) {
                c.setSac(sac);
                colisRepository.save(c);
                colisLies++;

                DemandeTransport d = demandeParColis.get(c.getColisId());
                if (d != null) {
                    demandeIdsGroupees.add(d.getDemandeId());
                }
            }

            sacsCrees.add(new GroupageValiderResponse.SacCree(
                    sac.getSacId(), colisDuSac.size(), Math.round(taux * 100.0) / 100.0));
        }

        // Marquer les demandes comme GROUPEE
        int demandesGroupees = 0;
        for (UUID dId : demandeIdsGroupees) {
            DemandeTransport d = demandeRepository.findById(dId).orElse(null);
            if (d != null && d.getStatut() == DemandeStatut.EN_ATTENTE_GROUPAGE) {
                d.setStatut(DemandeStatut.GROUPEE);
                demandeRepository.save(d);
                demandesGroupees++;
            }
        }

        String justification = "Validation groupage " + run.getTypeAlgorithme() +
                " : " + nbSacsCrees + " sacs, " + colisLies + " colis lies, " +
                demandesGroupees + " demandes groupees.";

        log.info("Validation groupage run {} : {} sacs, {} colis, {} demandes",
                request.runId(), nbSacsCrees, colisLies, demandesGroupees);

        return new GroupageValiderResponse(run.getRunId(), sacsCrees, colisLies, demandesGroupees, justification);
    }

    // ── FFD Preview ──

    private List<SacPreview> executerFfdPreview(List<Colis> tousColis,
                                                  Map<UUID, DemandeTransport> demandeParColis,
                                                  long capPoidsMax, long capVolumeMax,
                                                  BigDecimal seuil, LocalDate today) {

        List<Long> poids = new ArrayList<>();
        List<Long> volumes = new ArrayList<>();
        for (Colis c : tousColis) {
            poids.add(c.getPoidsKg().multiply(BigDecimal.valueOf(SCALE)).longValue());
            volumes.add(c.getVolumeM3().multiply(BigDecimal.valueOf(SCALE)).longValue());
        }

        BinPackingService.BinPackingResult bpResult = binPackingService.solve(poids, volumes, capPoidsMax, capVolumeMax);

        List<SacPreview> sacs = new ArrayList<>();
        int sacIdx = 0;

        for (BinPackingService.SacFfd sacFfd : bpResult.sacs()) {
            // Recuperer les colis reel pour ce sac
            List<Colis> colisDuSac = sacFfd.indicesColis().stream()
                    .map(tousColis::get)
                    .toList();

            List<UUID> colisIds = colisDuSac.stream().map(Colis::getColisId).toList();

            // Date depart
            LocalDate dateDepartLot = colisDuSac.stream()
                    .map(c -> demandeParColis.get(c.getColisId()))
                    .filter(Objects::nonNull)
                    .map(d -> d.getDateDepartCalculee() != null ? d.getDateDepartCalculee() : LocalDate.now().plusDays(7))
                    .min(Comparator.naturalOrder())
                    .orElse(LocalDate.now().plusDays(7));

            // Taux
            double tauxPoidsCalc = (double) sacFfd.poidsTotal() / capPoidsMax * 100;
            double tauxVolumeCalc = (double) sacFfd.volumeTotal() / capVolumeMax * 100;
            double taux = Math.max(tauxPoidsCalc, tauxVolumeCalc);

            // Depart force
            boolean departForce = today.isAfter(dateDepartLot) || today.isEqual(dateDepartLot);
            boolean seuilAtteint = BigDecimal.valueOf(taux).compareTo(seuil) >= 0;

            if (!seuilAtteint && !departForce) continue;

            // Categorie dominante
            Set<String> categories = new HashSet<>();
            for (Colis c : colisDuSac) {
                if (c.getCategorie() != null) {
                    categories.add(c.getCategorie().getClasseCode() != null
                            ? c.getCategorie().getClasseCode() : CLUSTER_STANDARD);
                }
            }

            sacs.add(new SacPreview(
                    "sac_" + (++sacIdx),
                    categories.isEmpty() ? CLUSTER_STANDARD : categories.iterator().next(),
                    colisIds,
                    colisIds.size(),
                    BigDecimal.valueOf(tauxPoidsCalc).setScale(2, RoundingMode.HALF_UP),
                    BigDecimal.valueOf(tauxVolumeCalc).setScale(2, RoundingMode.HALF_UP),
                    BigDecimal.valueOf(taux).setScale(2, RoundingMode.HALF_UP),
                    sacFfd.poidsTotal() / SCALE,
                    sacFfd.volumeTotal() / SCALE,
                    dateDepartLot,
                    departForce,
                    categories.isEmpty() ? "STANDARD" : categories.iterator().next()
            ));
        }
        return sacs;
    }

    // ── Knapsack Preview ──

    private List<SacPreview> executerKnapsackPreview(List<Colis> tousColis,
                                                       Map<UUID, DemandeTransport> demandeParColis,
                                                       long capPoidsMax, long capVolumeMax,
                                                       BigDecimal seuil, LocalDate today) {
        // Partitionner par cluster
        Map<String, List<Colis>> colisParCluster = new TreeMap<>();
        for (Colis c : tousColis) {
            String cluster = (c.getCategorie() != null && c.getCategorie().getClasseCode() != null)
                    ? c.getCategorie().getClasseCode() : CLUSTER_STANDARD;
            colisParCluster.computeIfAbsent(cluster, k -> new ArrayList<>()).add(c);
        }

        long scale = determinerScale(capPoidsMax, capVolumeMax);

        // Seuil sur le lot global (cohérent FFD) — le partitionnement cluster
        // reste pour l'optimisation knapsack, mais le filtre seuil s'applique
        // au taux global du lot entier pour éviter que des clusters petits
        // mais valides ensemble soient jetés.
        long poidsTotalGlobal = tousColis.stream()
                .mapToLong(c -> c.getPoidsKg().longValue()).sum();
        long volumeTotalGlobal = tousColis.stream()
                .mapToLong(c -> c.getVolumeM3().longValue()).sum();
        double tauxPoidsGlobal = (double) poidsTotalGlobal / (capPoidsMax / SCALE) * 100;
        double tauxVolumeGlobal = (double) volumeTotalGlobal / (capVolumeMax / SCALE) * 100;
        boolean lotSeuilAtteint = BigDecimal.valueOf(Math.max(tauxPoidsGlobal, tauxVolumeGlobal))
                .compareTo(seuil) >= 0;

        List<SacPreview> allSacs = new ArrayList<>();
        int sacIdx = 0;

        for (Map.Entry<String, List<Colis>> entry : colisParCluster.entrySet()) {
            String cluster = entry.getKey();
            List<Colis> colisCluster = entry.getValue();

            List<Integer> indicesRestants = new ArrayList<>();
            for (int i = 0; i < colisCluster.size(); i++) indicesRestants.add(i);

            while (!indicesRestants.isEmpty()) {
                List<Long> poids = new ArrayList<>();
                List<Long> volumes = new ArrayList<>();
                for (int idx : indicesRestants) {
                    poids.add(colisCluster.get(idx).getPoidsKg()
                            .multiply(BigDecimal.valueOf(scale)).longValue());
                    volumes.add(colisCluster.get(idx).getVolumeM3()
                            .multiply(BigDecimal.valueOf(scale)).longValue());
                }

                long capPoidsScaled = capPoidsMax * scale / 100;
                long capVolumeScaled = capVolumeMax * scale / 100;

                KnapsackSolverService.KnapsackResult ksResult =
                        knapsackSolverService.solve(poids, volumes, capPoidsScaled, capVolumeScaled);

                if (ksResult.indicesInclus().isEmpty()) break;

                List<Colis> colisDuSac = new ArrayList<>();
                List<UUID> colisIds = new ArrayList<>();
                long poidsTotal = 0;
                long volumeTotal = 0;

                for (int idx : ksResult.indicesInclus()) {
                    int originalIdx = indicesRestants.get(idx);
                    Colis c = colisCluster.get(originalIdx);
                    colisDuSac.add(c);
                    colisIds.add(c.getColisId());
                    poidsTotal += c.getPoidsKg().longValue();
                    volumeTotal += c.getVolumeM3().longValue();
                }

                LocalDate dateDepartLot = colisDuSac.stream()
                        .map(c -> demandeParColis.get(c.getColisId()))
                        .filter(Objects::nonNull)
                        .map(d -> d.getDateDepartCalculee() != null
                                ? d.getDateDepartCalculee() : LocalDate.now().plusDays(7))
                        .min(Comparator.naturalOrder())
                        .orElse(LocalDate.now().plusDays(7));

                double tauxPoidsCalc = (double) poidsTotal / (capPoidsMax / 100) * 100;
                double tauxVolumeCalc = (double) volumeTotal / (capVolumeMax / 100) * 100;
                double taux = Math.max(tauxPoidsCalc, tauxVolumeCalc);

                boolean departForce = today.isAfter(dateDepartLot) || today.isEqual(dateDepartLot);

                if (lotSeuilAtteint || departForce) {
                    allSacs.add(new SacPreview(
                            "sac_" + (++sacIdx),
                            cluster,
                            colisIds,
                            colisIds.size(),
                            BigDecimal.valueOf(tauxPoidsCalc).setScale(2, RoundingMode.HALF_UP),
                            BigDecimal.valueOf(tauxVolumeCalc).setScale(2, RoundingMode.HALF_UP),
                            BigDecimal.valueOf(taux).setScale(2, RoundingMode.HALF_UP),
                            poidsTotal,
                            volumeTotal,
                            dateDepartLot,
                            departForce,
                            cluster
                    ));
                }

                List<Integer> sortedIndices = ksResult.indicesInclus().stream()
                        .sorted(Comparator.reverseOrder()).toList();
                for (Integer idx : sortedIndices) {
                    indicesRestants.remove(idx.intValue());
                }
            }
        }

        // Trier par cluster puis taux descendant
        allSacs.sort(Comparator
                .comparing(SacPreview::cluster)
                .thenComparing(Comparator.comparingDouble((SacPreview s) -> s.tauxRemplissage().doubleValue()).reversed()));

        return allSacs;
    }

    // ── Helpers ──

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

    private long determinerScale(long capPoids, long capVolume) {
        for (long s : new long[]{100, 10, 1}) {
            long scaledP = capPoids * s / 100;
            long scaledV = capVolume * s / 100;
            if (scaledP * scaledV <= 10_000_000L) return s;
        }
        return 1;
    }

    private GroupagePreviewResponse buildEmptyPreview(UUID hubId, TypeAlgorithme algo, String justification) {
        return new GroupagePreviewResponse(
                null, hubId, algo, List.of(), List.of(),
                new PreviewMeta(0, 0, 0, 0, 0, BigDecimal.ZERO, 0, java.time.LocalDateTime.now()));
    }

    private String buildParametresJson(int nbColis, long capPoids, long capVolume,
                                         BigDecimal seuil, TypeAlgorithme algo) {
        return "{" +
                "\"nb_colis\":" + nbColis +
                ",\"capacite_poids\":" + (capPoids / SCALE) +
                ",\"capacite_volume\":" + (capVolume / SCALE) +
                ",\"seuil_remplissage\":" + seuil +
                ",\"algo\":\"" + algo + "\"" +
                "}";
    }

    private String buildResultatJson(List<SacPreview> sacs) {
        StringBuilder sb = new StringBuilder("{\"sacs\":[");
        for (int i = 0; i < sacs.size(); i++) {
            if (i > 0) sb.append(",");
            SacPreview s = sacs.get(i);
            sb.append("{\"tmp_sac_id\":\"").append(s.tmpSacId()).append("\"");
            sb.append(",\"cluster\":\"").append(s.cluster()).append("\"");
            sb.append(",\"nb_colis\":").append(s.nbColis());
            sb.append(",\"taux_remplissage\":").append(s.tauxRemplissage());
            sb.append(",\"date_depart\":\"").append(s.dateDepartPlafond()).append("\"");
            sb.append(",\"depart_force\":").append(s.departForce());
            sb.append(",\"colis_ids\":[");
            for (int j = 0; j < s.colisIds().size(); j++) {
                if (j > 0) sb.append(",");
                sb.append("\"").append(s.colisIds().get(j)).append("\"");
            }
            sb.append("]}");
        }
        sb.append("]}");
        return sb.toString();
    }
}
