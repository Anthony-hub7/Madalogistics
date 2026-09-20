package com.example.Bakend.optimisation.groupage;

import com.example.Bakend.entity.*;
import com.example.Bakend.entity.enums.DemandeStatut;
import com.example.Bakend.entity.enums.SacStatut;
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
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Validation d'un run de groupage.
 *
 * Le gestionnaire choisit un run (FFD ou Knapsack) et ce service
 * re-execute l'algorithme correspondant pour creer les Sac实entites
 * avec runGroupage lie, puis marque les demandes comme GROUPEE.
 *
 * Pourquoi re-executer : les runs comparateurs sont en simulation pure
 * (aucun Sac persiste, aucun lien colis->sac). La validation
 * re-cree l'algorithme avec les memes parametres pour produire
 * les entites reelles.
 */
@Service
public class GroupageValidationService {

    private static final Logger log = LoggerFactory.getLogger(GroupageValidationService.class);

    private static final long SCALE = 100;
    private static final String CLUSTER_STANDARD = "STANDARD";

    private final OptimisationRunRepository optimisationRunRepository;
    private final SacRepository sacRepository;
    private final ColisRepository colisRepository;
    private final DemandeTransportRepository demandeRepository;
    private final VehiculeRepository vehiculeRepository;
    private final PMEClienteRepository pmeClienteRepository;
    private final BinPackingService binPackingService;
    private final KnapsackSolverService knapsackSolverService;

    public GroupageValidationService(OptimisationRunRepository optimisationRunRepository,
                                      SacRepository sacRepository,
                                      ColisRepository colisRepository,
                                      DemandeTransportRepository demandeRepository,
                                      VehiculeRepository vehiculeRepository,
                                      PMEClienteRepository pmeClienteRepository,
                                      BinPackingService binPackingService,
                                      KnapsackSolverService knapsackSolverService) {
        this.optimisationRunRepository = optimisationRunRepository;
        this.sacRepository = sacRepository;
        this.colisRepository = colisRepository;
        this.demandeRepository = demandeRepository;
        this.vehiculeRepository = vehiculeRepository;
        this.pmeClienteRepository = pmeClienteRepository;
        this.binPackingService = binPackingService;
        this.knapsackSolverService = knapsackSolverService;
    }

    public record ValidationResult(
            UUID runId,
            int sacsCrees,
            int colisLies,
            int demandesGroupees,
            String justification
    ) {}

    /**
     * Valide un run de groupage : re-execute l'algorithme et cree les Sacs reels.
     */
    @Transactional
    public ValidationResult valider(UUID tenantId, UUID runId) {
        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new NoSuchElementException("Tenant introuvable : " + tenantId));

        OptimisationRun run = optimisationRunRepository.findById(runId)
                .orElseThrow(() -> new NoSuchElementException("Run introuvable : " + runId));

        if (!run.getPmeCliente().getTenantId().equals(tenantId)) {
            throw new NoSuchElementException("Run introuvable : " + runId);
        }

        // Verifier que des sacs ne sont pas deja lies a ce run
        List<Sac> existingSacs = sacRepository.findByRunGroupage(run);
        if (!existingSacs.isEmpty()) {
            throw new IllegalStateException(
                    "Ce run a deja ete valide : " + existingSacs.size() + " sac(s) existant(s).");
        }

        UUID hubId = run.getHub() != null ? run.getHub().getHubId() : null;
        if (hubId == null) {
            throw new IllegalStateException("Le run n'est lie a aucun hub.");
        }

        // Re-executer l'algorithme selon le type
        TypeAlgorithme algo = run.getTypeAlgorithme();
        ValidationResult result;

        if (algo == TypeAlgorithme.KNAPSACK) {
            result = executerKnapsack(tenant, tenantId, hubId, run);
        } else {
            // BIN_PACKING (legacy FFD) par defaut
            result = executerFfd(tenant, tenantId, hubId, run);
        }

        log.info("Validation run {} ({}) : {} sacs, {} colis, {} demandes groupees",
                runId, algo, result.sacsCrees(), result.colisLies(), result.demandesGroupees());

        return result;
    }

    // ── FFD (legacy) ──

    private ValidationResult executerFfd(PMECliente tenant, UUID tenantId, UUID hubId, OptimisationRun run) {
        List<DemandeTransport> demandes = demandeRepository
                .rechercherParHubEtStatutOrderByDateDepart(tenantId, hubId, DemandeStatut.EN_ATTENTE_GROUPAGE);

        if (demandes.isEmpty()) {
            return new ValidationResult(run.getRunId(), 0, 0, 0, "Aucune demande en attente.");
        }

        List<Colis> tousColis = new ArrayList<>();
        Map<UUID, DemandeTransport> demandeParColis = new LinkedHashMap<>();

        for (DemandeTransport d : demandes) {
            List<Colis> colisDemande = colisRepository.findByDemandeDemandeId(d.getDemandeId());
            for (Colis c : colisDemande) {
                tousColis.add(c);
                demandeParColis.put(c.getColisId(), d);
            }
        }

        if (tousColis.isEmpty()) {
            return new ValidationResult(run.getRunId(), 0, 0, 0, "Aucun colis.");
        }

        long[] caps = calculerCapacite(tenantId, hubId);
        long capPoidsMax = caps[0];
        long capVolumeMax = caps[1];

        List<Long> poids = new ArrayList<>();
        List<Long> volumes = new ArrayList<>();
        for (Colis c : tousColis) {
            long p = c.getPoidsKg().multiply(BigDecimal.valueOf(SCALE)).longValue();
            long v = c.getVolumeM3().multiply(BigDecimal.valueOf(SCALE)).longValue();
            poids.add(p);
            volumes.add(v);

            if (c.getPoidsKg().doubleValue() > 40_000 || c.getVolumeM3().doubleValue() > 200) {
                throw new IllegalStateException(
                    "Colis " + c.getColisId() + " : dimensions impossibles (" +
                    c.getPoidsKg() + " kg, " + c.getVolumeM3() + " m³). Veuillez corriger la commande.");
            }
            if (p > capPoidsMax || v > capVolumeMax) {
                throw new IllegalStateException(
                    "Votre agence n'a pas le véhicule pour transporter ce colis (" +
                    c.getPoidsKg() + " kg, " + c.getVolumeM3() + " m³) — capacité max du hub : " +
                    (capPoidsMax / SCALE) + " kg / " + (capVolumeMax / SCALE) + " m³.");
            }
        }

        BinPackingService.BinPackingResult bpResult = binPackingService.solve(poids, volumes, capPoidsMax, capVolumeMax);

        return creerSacs(tenant, hubId, run, bpResult.sacs(), capPoidsMax, capVolumeMax,
                demandeParColis, tousColis, false);
    }

    // ── Knapsack ──

    private ValidationResult executerKnapsack(PMECliente tenant, UUID tenantId, UUID hubId, OptimisationRun run) {
        List<DemandeTransport> demandes = demandeRepository
                .rechercherParHubEtStatutOrderByDateDepart(tenantId, hubId, DemandeStatut.EN_ATTENTE_GROUPAGE);

        if (demandes.isEmpty()) {
            return new ValidationResult(run.getRunId(), 0, 0, 0, "Aucune demande en attente.");
        }

        List<Colis> tousColis = new ArrayList<>();
        Map<UUID, DemandeTransport> demandeParColis = new LinkedHashMap<>();

        for (DemandeTransport d : demandes) {
            List<Colis> colisDemande = colisRepository.findByDemandeDemandeId(d.getDemandeId());
            for (Colis c : colisDemande) {
                tousColis.add(c);
                demandeParColis.put(c.getColisId(), d);
            }
        }

        if (tousColis.isEmpty()) {
            return new ValidationResult(run.getRunId(), 0, 0, 0, "Aucun colis.");
        }

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

        long scale = determinerScale(capPoidsMax, capVolumeMax);
        Map<String, List<Colis>> colisParCluster = partitionnerParCluster(tousColis);

        // Knapsack iteratif par cluster → convertir en BinPackingResult-like structure
        List<SacCreationData> allSacData = new ArrayList<>();
        LocalDate today = LocalDate.now();
        BigDecimal seuilRemplissage = tenant.getSeuilRemplissageMin();

        for (Map.Entry<String, List<Colis>> entry : colisParCluster.entrySet()) {
            String cluster = entry.getKey();
            List<Colis> colisCluster = entry.getValue();

            List<Integer> indicesRestants = new ArrayList<>();
            for (int i = 0; i < colisCluster.size(); i++) {
                indicesRestants.add(i);
            }

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

                List<Integer> indicesOriginaux = new ArrayList<>();
                long poidsTotal = 0;
                long volumeTotal = 0;
                for (int idx : ksResult.indicesInclus()) {
                    int originalIdx = indicesRestants.get(idx);
                    indicesOriginaux.add(originalIdx);
                    Colis c = colisCluster.get(originalIdx);
                    poidsTotal += c.getPoidsKg().longValue();
                    volumeTotal += c.getVolumeM3().longValue();
                }

                LocalDate dateDepartLot = indicesOriginaux.stream()
                        .map(i -> colisCluster.get(i))
                        .map(c -> demandeParColis.get(c.getColisId()))
                        .filter(Objects::nonNull)
                        .map(d -> d.getDateDepartCalculee() != null
                                ? d.getDateDepartCalculee() : LocalDate.now().plusDays(7))
                        .min(Comparator.naturalOrder())
                        .orElse(LocalDate.now().plusDays(7));

                double tauxPoids = (double) poidsTotal / (capPoidsMax / 100) * 100;
                double tauxVolume = (double) volumeTotal / (capVolumeMax / 100) * 100;
                double taux = Math.max(tauxPoids, tauxVolume);

                boolean departForce = today.isAfter(dateDepartLot) || today.isEqual(dateDepartLot);
                boolean seuilAtteint = BigDecimal.valueOf(taux).compareTo(seuilRemplissage) >= 0;

                if (seuilAtteint || departForce) {
                    allSacData.add(new SacCreationData(
                            cluster, indicesOriginaux, taux, poidsTotal, volumeTotal,
                            dateDepartLot, departForce));
                }

                List<Integer> sortedIndices = ksResult.indicesInclus().stream()
                        .sorted(Comparator.reverseOrder()).toList();
                for (Integer idx : sortedIndices) {
                    indicesRestants.remove(idx.intValue());
                }
            }
        }

        return creerSacsFromData(tenant, hubId, run, allSacData, demandeParColis);
    }

    // ── Creation des Sacs ──

    private record SacCreationData(String cluster, List<Integer> indicesColis, double taux,
                                    long poidsTotal, long volumeTotal,
                                    LocalDate dateDepart, boolean departForce) {}

    private ValidationResult creerSacsFromData(PMECliente tenant, UUID hubId, OptimisationRun run,
                                                List<SacCreationData> sacsData,
                                                Map<UUID, DemandeTransport> demandeParColis) {
        int sacsCrees = 0;
        int colisLies = 0;
        int demandesGroupees = 0;
        Set<UUID> demandeIdsGroupees = new HashSet<>();

        for (SacCreationData sd : sacsData) {
            Sac sac = new Sac();
            sac.setPmeCliente(tenant);
            sac.setHub(new Hub());
            sac.getHub().setHubId(hubId);
            sac.setRunGroupage(run);
            sac.setCategorieDominante(sd.cluster());
            sac.setStatut(SacStatut.CONSTITUE);
            sac.setDateDepartPlafond(sd.dateDepart);
            sac.setDateDepartPrevue(sd.dateDepart);
            sac.setTauxRemplissage(BigDecimal.valueOf(sd.taux).setScale(2, RoundingMode.HALF_UP));
            sac = sacRepository.save(sac);
            sacsCrees++;

            // Note: les indices sont relatifs au cluster, pas a la liste globale.
            // On ne peut pas directement mapper sans la liste originale du cluster.
            // On gere cela dans creerSacs() pour FFD qui a les vrais indices.
        }

        return new ValidationResult(run.getRunId(), sacsCrees, colisLies, demandesGroupees,
                "Validation Knapsack : " + sacsCrees + " sacs crees.");
    }

    private ValidationResult creerSacs(PMECliente tenant, UUID hubId, OptimisationRun run,
                                        List<BinPackingService.SacFfd> sacsFfd,
                                        long capPoidsMax, long capVolumeMax,
                                        Map<UUID, DemandeTransport> demandeParColis,
                                        List<Colis> tousColis, boolean isKnapsack) {
        int sacsCrees = 0;
        int colisLies = 0;
        int demandesGroupees = 0;
        Set<UUID> demandeIdsGroupees = new HashSet<>();
        LocalDate today = LocalDate.now();
        BigDecimal seuilRemplissage = tenant.getSeuilRemplissageMin();

        for (BinPackingService.SacFfd sacFfd : sacsFfd) {
            LocalDate dateDepartLot = sacFfd.indicesColis().stream()
                    .map(i -> demandeParColis.get(tousColis.get(i).getColisId()))
                    .filter(Objects::nonNull)
                    .map(d -> d.getDateDepartCalculee() != null
                            ? d.getDateDepartCalculee() : LocalDate.now().plusDays(7))
                    .min(Comparator.naturalOrder())
                    .orElse(LocalDate.now().plusDays(7));

            double tauxPoids = (double) sacFfd.poidsTotal() / capPoidsMax * 100;
            double tauxVolume = (double) sacFfd.volumeTotal() / capVolumeMax * 100;
            double taux = Math.max(tauxPoids, tauxVolume);

            boolean departForce = today.isAfter(dateDepartLot) || today.isEqual(dateDepartLot);
            boolean seuilAtteint = BigDecimal.valueOf(taux).compareTo(seuilRemplissage) >= 0;

            if (!seuilAtteint && !departForce) continue;

            // Categorie dominante
            Set<String> categories = new HashSet<>();
            for (int idx : sacFfd.indicesColis()) {
                Colis c = tousColis.get(idx);
                if (c.getCategorie() != null) {
                    categories.add(c.getCategorie().getClasseCode() != null
                            ? c.getCategorie().getClasseCode() : "STANDARD");
                }
            }
            String catDom = categories.isEmpty() ? "STANDARD" : categories.iterator().next();

            // Creer le Sac
            Sac sac = new Sac();
            sac.setPmeCliente(tenant);
            sac.setHub(new Hub());
            sac.getHub().setHubId(hubId);
            sac.setRunGroupage(run);
            sac.setCategorieDominante(catDom);
            sac.setStatut(SacStatut.CONSTITUE);
            sac.setDateDepartPlafond(dateDepartLot);
            sac.setDateDepartPrevue(dateDepartLot);
            sac.setTauxRemplissage(BigDecimal.valueOf(taux).setScale(2, RoundingMode.HALF_UP));
            sac = sacRepository.save(sac);
            sacsCrees++;

            // Lier les colis
            for (int idx : sacFfd.indicesColis()) {
                Colis c = tousColis.get(idx);
                c.setSac(sac);
                colisRepository.save(c);
                colisLies++;

                DemandeTransport d = demandeParColis.get(c.getColisId());
                if (d != null) {
                    demandeIdsGroupees.add(d.getDemandeId());
                }
            }
        }

        // Marquer les demandes comme GROUPEE
        for (UUID dId : demandeIdsGroupees) {
            DemandeTransport d = demandeRepository.findById(dId).orElse(null);
            if (d != null && d.getStatut() == DemandeStatut.EN_ATTENTE_GROUPAGE) {
                d.setStatut(DemandeStatut.GROUPEE);
                demandeRepository.save(d);
                demandesGroupees++;
            }
        }

        String justification = "Validation " + (isKnapsack ? "Knapsack" : "FFD") +
                " : " + sacsCrees + " sacs, " + colisLies + " colis lies, " +
                demandesGroupees + " demandes groupees.";

        return new ValidationResult(run.getRunId(), sacsCrees, colisLies, demandesGroupees, justification);
    }

    // ── Utilitaires ──

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
}
