package com.example.Bakend.optimisation.affectation;

import com.example.Bakend.dto.optimisation.*;
import com.example.Bakend.dto.optimisation.AffectationPreviewResponse.*;
import com.example.Bakend.dto.optimisation.AffectationSimulateResponse.AffectationResultat;
import com.example.Bakend.entity.*;
import com.example.Bakend.entity.enums.ModeLivraison;
import com.example.Bakend.entity.enums.SacStatut;
import com.example.Bakend.entity.enums.TypeAlgorithme;
import com.example.Bakend.entity.enums.VehiculeStatut;
import com.example.Bakend.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service de simulation d'affectation : preview sans persistance, validation avec edition.
 *
 * 1. Preview : retourne les sacs + candidats chauffeur/vehicule (y compris vehicules personnels freelance)
 * 2. Simule : applique les decisions d'affectation et verifie (avec raisons detaillees)
 * 3. Valide : persiste les affectations
 */
@Service
public class AffectationSimulationService {

    private static final Logger log = LoggerFactory.getLogger(AffectationSimulationService.class);

    private final SacRepository sacRepository;
    private final ChauffeurRepository chauffeurRepository;
    private final VehiculeRepository vehiculeRepository;
    private final CompatibiliteChauffeurVehiculeRepository compatibiliteRepository;
    private final PMEClienteRepository pmeClienteRepository;
    private final OptimisationRunRepository optimisationRunRepository;
    private final IndisponibiliteChauffeurRepository indispoChauffeurRepository;
    private final IndisponibiliteVehiculeRepository indispoVehiculeRepository;

    public AffectationSimulationService(SacRepository sacRepository,
                                         ChauffeurRepository chauffeurRepository,
                                         VehiculeRepository vehiculeRepository,
                                         CompatibiliteChauffeurVehiculeRepository compatibiliteRepository,
                                         PMEClienteRepository pmeClienteRepository,
                                         OptimisationRunRepository optimisationRunRepository,
                                         IndisponibiliteChauffeurRepository indispoChauffeurRepository,
                                         IndisponibiliteVehiculeRepository indispoVehiculeRepository) {
        this.sacRepository = sacRepository;
        this.chauffeurRepository = chauffeurRepository;
        this.vehiculeRepository = vehiculeRepository;
        this.compatibiliteRepository = compatibiliteRepository;
        this.pmeClienteRepository = pmeClienteRepository;
        this.optimisationRunRepository = optimisationRunRepository;
        this.indispoChauffeurRepository = indispoChauffeurRepository;
        this.indispoVehiculeRepository = indispoVehiculeRepository;
    }

    /**
     * Preview : retourne les sacs + chauffeurs + vehicules sans affecter.
     * Inclut les vehicules personnels des chauffeurs freelances (hub null).
     */
    @Transactional(readOnly = true)
    public AffectationPreviewResponse preview(UUID tenantId, UUID hubId) {
        // 1. Sacs CONSTITUE du hub
        List<Sac> sacs = sacRepository.rechercherParHubEtStatutHorsMode(tenantId, hubId, SacStatut.CONSTITUE, ModeLivraison.FREELANCE);

        // 2. Chauffeurs disponibles
        List<Chauffeur> chauffeurs = chauffeurRepository.findByPmeClienteTenantIdAndDisponibleTrue(tenantId)
                .stream()
                .filter(c -> "VALIDEE".equals(c.getStatutDossier()))
                .collect(Collectors.toList());

        // 3. Vehicules DISPONIBLES du hub
        List<Vehicule> vehiculesHub = vehiculeRepository.rechercherDisponiblesParHub(
                tenantId, hubId, VehiculeStatut.DISPONIBLE);

        // 3b. Vehicules personnels des chauffeurs freelances (hub null, possedes par le chauffeur)
        Map<UUID, Vehicule> vehiculesPersoMap = new HashMap<>();
        for (Chauffeur ch : chauffeurs) {
            if (ch.getVehicule() != null && ch.getVehicule().getHub() == null
                    && ch.getVehicule().getStatut() == VehiculeStatut.DISPONIBLE) {
                vehiculesPersoMap.put(ch.getVehicule().getVehiculeId(), ch.getVehicule());
            }
        }

        // Fusionner vehicules hub + vehicules perso
        Map<UUID, Vehicule> tousVehicules = new LinkedHashMap<>();
        for (Vehicule v : vehiculesHub) {
            tousVehicules.put(v.getVehiculeId(), v);
        }
        for (Vehicule v : vehiculesPersoMap.values()) {
            tousVehicules.putIfAbsent(v.getVehiculeId(), v);
        }
        List<Vehicule> vehicules = new ArrayList<>(tousVehicules.values());

        // 4. Matrice compatibilite
        Map<UUID, Map<UUID, Boolean>> matrice = chargerMatrice(tenantId);

        // 5. Compter les paires compatibles (permis + matrice)
        double chargeMoyenne = calculerChargeMoyenne(sacs);
        int nbPaires = 0;
        for (Chauffeur ch : chauffeurs) {
            for (Vehicule v : vehicules) {
                PermisService.Autorisation auth = PermisService.verifier(ch, v, matrice, null, null);
                if (auth.autorise()) nbPaires++;
            }
        }

        List<SacAffectation> sacDtos = sacs.stream().map(s -> {
            double poids = s.getColis() != null
                    ? s.getColis().stream().mapToDouble(c -> c.getPoidsKg() != null ? c.getPoidsKg().doubleValue() : 0).sum()
                    : 0;
            double volume = s.getColis() != null
                    ? s.getColis().stream().mapToDouble(c -> c.getVolumeM3() != null ? c.getVolumeM3().doubleValue() : 0).sum()
                    : 0;

            // Calculer dateLivraison = max(dateSouhaitee) des demandes du sac
            LocalDate dateLivraison = null;
            if (s.getColis() != null) {
                dateLivraison = s.getColis().stream()
                        .map(c -> c.getDemande() != null ? c.getDemande().getDateSouhaitee() : null)
                        .filter(Objects::nonNull)
                        .max(Comparator.naturalOrder())
                        .orElse(null);
            }

            return new SacAffectation(
                    s.getSacId(),
                    s.getCategorieDominante(),
                    s.getColis() != null ? s.getColis().size() : 0,
                    s.getTauxRemplissage() != null ? s.getTauxRemplissage().doubleValue() : 0,
                    null, null,
                    poids, volume,
                    dateLivraison,
                    s.getDateDepartPrevue(),
                    0, null
            );
        }).toList();

        List<ChauffeurCandidate> chauffeurDtos = chauffeurs.stream().map(ch -> new ChauffeurCandidate(
                ch.getChauffeurId(),
                ch.getUtilisateur() != null ? ch.getUtilisateur().getNom() : "N/A",
                ch.getUtilisateur() != null ? ch.getUtilisateur().getNom() : "",
                PermisService.parsePermisCategories(ch.getPermisCategories()).stream().toList(),
                ch.isDisponible()
        )).toList();

        List<VehiculeCandidate> vehiculeDtos = vehicules.stream().map(v -> {
            boolean isPerso = vehiculesPersoMap.containsKey(v.getVehiculeId());
            UUID proprietaireId = null;
            if (isPerso) {
                proprietaireId = chauffeurs.stream()
                        .filter(ch -> ch.getVehicule() != null && ch.getVehicule().getVehiculeId().equals(v.getVehiculeId()))
                        .map(ch -> ch.getChauffeurId())
                        .findFirst().orElse(null);
            }
            return new VehiculeCandidate(
                    v.getVehiculeId(),
                    v.getImmatriculation(),
                    v.getTypeVehicule() != null ? v.getTypeVehicule().name() : "N/A",
                    v.getCapacitePoidsKg() != null ? v.getCapacitePoidsKg().doubleValue() : 0,
                    v.getCapaciteVolumeM3() != null ? v.getCapaciteVolumeM3().doubleValue() : 0,
                    v.getPtacTonnes() != null ? v.getPtacTonnes().doubleValue() : 0,
                    isPerso,
                    proprietaireId
            );
        }).toList();

        return new AffectationPreviewResponse(
                hubId, sacDtos, chauffeurDtos, vehiculeDtos,
                new AffectationMeta(sacs.size(), chauffeurs.size(), vehicules.size(), nbPaires));
    }

    /**
     * Simule : applique les decisions et verifie la compatibilite SANS persister.
     * Retourne les raisons detaillees d'incompatibilite.
     */
    @Transactional(readOnly = true)
    public AffectationSimulateResponse simuler(UUID tenantId, AffectationSimulateRequest request) {
        Map<UUID, Map<UUID, Boolean>> matrice = chargerMatrice(tenantId);

        // Charger chauffeurs
        Map<UUID, Chauffeur> chauffeurMap = new HashMap<>();
        chauffeurRepository.findByPmeClienteTenantIdAndDisponibleTrue(tenantId)
                .forEach(ch -> chauffeurMap.put(ch.getChauffeurId(), ch));

        // Charger vehicules hub
        Map<UUID, Vehicule> vehiculeMap = new HashMap<>();
        vehiculeRepository.rechercherDisponiblesParHub(
                tenantId, request.hubId(), VehiculeStatut.DISPONIBLE)
                .forEach(v -> vehiculeMap.put(v.getVehiculeId(), v));

        // Ajouter vehicules personnels des chauffeurs
        for (Chauffeur ch : chauffeurMap.values()) {
            if (ch.getVehicule() != null && ch.getVehicule().getHub() == null
                    && ch.getVehicule().getStatut() == VehiculeStatut.DISPONIBLE) {
                vehiculeMap.putIfAbsent(ch.getVehicule().getVehiculeId(), ch.getVehicule());
            }
        }

        // Charger les sacs
        Map<UUID, Sac> sacMap = new HashMap<>();
        sacRepository.rechercherParHubEtStatutHorsMode(tenantId, request.hubId(), SacStatut.CONSTITUE, ModeLivraison.FREELANCE)
                .forEach(s -> sacMap.put(s.getSacId(), s));

        List<AffectationResultat> resultats = new ArrayList<>();
        List<String> avertissements = new ArrayList<>();
        boolean valide = true;

        // Verifier chaque decision (1 sac = 1 chauffeur = 1 vehicule = 1 affectation)
        Set<UUID> chauffeursUtilises = new HashSet<>();
        Set<UUID> vehiculesUtilises = new HashSet<>();
        Set<UUID> sacsTraites = new HashSet<>();

        for (AffectationSimulateRequest.AffectationDecision decision : request.decisions()) {
            Sac sac = sacMap.get(decision.sacId());
            Chauffeur ch = chauffeurMap.get(decision.chauffeurId());
            Vehicule v = vehiculeMap.get(decision.vehiculeId());

            if (sac == null || ch == null || v == null) {
                String detail = "introuvable";
                if (sac == null) detail = "sac " + decision.sacId();
                else if (ch == null) detail = "chauffeur " + decision.chauffeurId();
                else if (v == null) detail = "vehicule " + decision.vehiculeId();
                resultats.add(new AffectationResultat(
                        decision.sacId(), decision.chauffeurId(), null,
                        decision.vehiculeId(), null,
                        false, "Element " + detail, List.of("Element " + detail), 0));
                valide = false;
                continue;
            }

            // Doublons = invalide (pas juste un avertissement)
            boolean doublonSac = !sacsTraites.add(decision.sacId());
            boolean doublonChauffeur = chauffeursUtilises.contains(decision.chauffeurId());
            boolean doublonVehicule = vehiculesUtilises.contains(decision.vehiculeId());
            if (doublonSac) {
                avertissements.add("Sac " + decision.sacId() + " deja traite dans ce lot.");
            }
            if (doublonChauffeur) {
                avertissements.add("Chauffeur " + ch.getUtilisateur().getNom() + " deja utilise.");
            }
            if (doublonVehicule) {
                avertissements.add("Vehicule " + v.getImmatriculation() + " deja utilise.");
            }

            // Calculer poids/volume du sac
            Double poidsSac = null;
            Double volumeSac = null;
            if (sac.getColis() != null && !sac.getColis().isEmpty()) {
                poidsSac = sac.getColis().stream()
                        .mapToDouble(c -> c.getPoidsKg() != null ? c.getPoidsKg().doubleValue() : 0).sum();
                volumeSac = sac.getColis().stream()
                        .mapToDouble(c -> c.getVolumeM3() != null ? c.getVolumeM3().doubleValue() : 0).sum();
            }

            // Recuperer indisponibilites chauffeur
            List<IndisponibiliteChauffeur> indispos = indispoChauffeurRepository
                    .findByChauffeurChauffeurId(decision.chauffeurId());

            PermisService.Autorisation auth = PermisService.verifier(
                    ch, v, matrice, poidsSac, volumeSac, null, indispos);

            List<String> raisons = new ArrayList<>(auth.raisons());
            String motifRefus = auth.autorise() ? null : auth.motifRefus();
            if (doublonSac) {
                raisons.add("Sac deja affecte dans ce lot (1 affectation par sac).");
                if (motifRefus == null) motifRefus = "Sac deja affecte dans ce lot.";
            }
            if (doublonChauffeur) {
                raisons.add("Chauffeur deja affecte a un autre sac de ce lot (1 chauffeur = 1 sac).");
                if (motifRefus == null) motifRefus = "Chauffeur deja affecte a un autre sac de ce lot.";
            }
            if (doublonVehicule) {
                raisons.add("Vehicule deja affecte a un autre sac de ce lot (1 vehicule = 1 sac).");
                if (motifRefus == null) motifRefus = "Vehicule " + v.getImmatriculation() + " deja affecte a un autre sac de ce lot.";
            }
            boolean autorise = auth.autorise() && !doublonSac && !doublonChauffeur && !doublonVehicule;
            double score = autorise ? 1.0 : 0;

            resultats.add(new AffectationResultat(
                    sac.getSacId(),
                    ch.getChauffeurId(),
                    ch.getUtilisateur() != null ? ch.getUtilisateur().getNom() : "N/A",
                    v.getVehiculeId(),
                    v.getImmatriculation(),
                    autorise,
                    motifRefus,
                    raisons,
                    score
            ));

            if (!autorise) {
                valide = false;
            }

            chauffeursUtilises.add(decision.chauffeurId());
            vehiculesUtilises.add(decision.vehiculeId());
        }

        return new AffectationSimulateResponse(resultats, avertissements, valide);
    }

    /**
     * Valide : persiste les affectations chauffeur/vehicule sur les sacs.
     */
    @Transactional
    public AffectationValiderResponse valider(UUID tenantId, AffectationValiderRequest request) {
        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new NoSuchElementException("Tenant introuvable : " + tenantId));

        // D'abord simuler pour valider
        List<AffectationSimulateRequest.AffectationDecision> simulateDecisions = request.decisions().stream()
                .map(d -> new AffectationSimulateRequest.AffectationDecision(d.sacId(), d.chauffeurId(), d.vehiculeId()))
                .toList();
        AffectationSimulateResponse simulation = simuler(tenantId,
                new AffectationSimulateRequest(request.hubId(), simulateDecisions));

        if (!simulation.valide()) {
            throw new IllegalStateException("Les affectations contiennent des erreurs. Corrigez-les avant de valider.");
        }

        // Charger les sacs
        Map<UUID, Sac> sacMap = new HashMap<>();
        sacRepository.rechercherParHubEtStatutHorsMode(tenantId, request.hubId(), SacStatut.CONSTITUE, ModeLivraison.FREELANCE)
                .forEach(s -> sacMap.put(s.getSacId(), s));

        int nbAffectes = 0;
        int nbNonAffectes = 0;
        Set<UUID> sacsAffectes = new HashSet<>();

        for (AffectationValiderRequest.AffectationDecision decision : request.decisions()) {
            Sac sac = sacMap.get(decision.sacId());
            if (sac == null) {
                nbNonAffectes++;
                continue;
            }

            // Chercher le resultat correspondant
            AffectationResultat resultat = simulation.resultats().stream()
                    .filter(r -> r.sacId().equals(decision.sacId()))
                    .findFirst().orElse(null);

            if (resultat != null && resultat.autorise()) {
                Chauffeur chAffecte = chauffeurRepository.findById(decision.chauffeurId()).orElse(null);
                Vehicule vAffecte = vehiculeRepository.findById(decision.vehiculeId()).orElse(null);

                sac.setChauffeur(chAffecte);
                sac.setVehicule(vAffecte);
                sac.setStatut(SacStatut.AFFECTE);
                sacRepository.save(sac);

                // Indisponibilite immediate : la ressource est reservee par ce sac
                if (chAffecte != null) {
                    chAffecte.setDisponible(false);
                    chauffeurRepository.save(chAffecte);
                }
                if (vAffecte != null) {
                    vAffecte.setStatut(VehiculeStatut.AFFECTE);
                    vehiculeRepository.save(vAffecte);
                }

                sacsAffectes.add(decision.sacId());
                nbAffectes++;
            } else {
                nbNonAffectes++;
            }
        }

        // Creer OptimisationRun
        String justification = "Affectation preview : " + nbAffectes + " sacs affectes, " +
                nbNonAffectes + " non affectes.";

        OptimisationRun run = new OptimisationRun();
        run.setPmeCliente(tenant);
        run.setHub(new Hub());
        run.getHub().setHubId(request.hubId());
        run.setTypeAlgorithme(TypeAlgorithme.AFFECTATION);
        run.setParametres("{\"nb_sacs\":" + sacMap.size() + ",\"algo\":\"PREVIEW_VALIDATION\"}");
        run.setResultat("{\"nb_affectes\":" + nbAffectes + ",\"nb_non_affectes\":" + nbNonAffectes + "}");
        run.setJustificationDocument(justification);
        run.setDureeCalculMs(0);
        optimisationRunRepository.save(run);

        // Lier les sacs au run
        for (Sac sac : sacMap.values()) {
            if (sacsAffectes.contains(sac.getSacId())) {
                sac.setRunAffectation(run);
                sacRepository.save(sac);
            }
        }

        log.info("Affectation valider hub {} : {}/{} sacs, run {}", request.hubId(), nbAffectes, sacMap.size(), run.getRunId());

        return new AffectationValiderResponse(run.getRunId(), nbAffectes, nbNonAffectes, justification);
    }

    // ── Helpers ──

    private Map<UUID, Map<UUID, Boolean>> chargerMatrice(UUID tenantId) {
        Map<UUID, Map<UUID, Boolean>> matrice = new HashMap<>();
        List<CompatibiliteChauffeurVehicule> compatList = compatibiliteRepository.findByPmeClienteTenantId(tenantId);
        for (CompatibiliteChauffeurVehicule c : compatList) {
            matrice.computeIfAbsent(c.getChauffeurId(), k -> new HashMap<>())
                    .put(c.getVehiculeId(), c.isCompatible());
        }
        return matrice;
    }

    private double calculerChargeMoyenne(List<Sac> sacs) {
        if (sacs.isEmpty()) return 0;
        int totalColis = sacs.stream().mapToInt(s -> s.getColis() != null ? s.getColis().size() : 0).sum();
        return (double) totalColis / sacs.size();
    }
}
