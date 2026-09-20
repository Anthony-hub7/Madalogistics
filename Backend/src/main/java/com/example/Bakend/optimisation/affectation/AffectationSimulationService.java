package com.example.Bakend.optimisation.affectation;

import com.example.Bakend.dto.optimisation.*;
import com.example.Bakend.dto.optimisation.AffectationPreviewResponse.*;
import com.example.Bakend.dto.optimisation.AffectationSimulateResponse.AffectationResultat;
import com.example.Bakend.entity.*;
import com.example.Bakend.entity.enums.SacStatut;
import com.example.Bakend.entity.enums.TypeAlgorithme;
import com.example.Bakend.entity.enums.VehiculeStatut;
import com.example.Bakend.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service de simulation d'affectation : preview sans persistance, validation avec edition.
 *
 * 1. Preview : retourne les sacs + candidats chauffeur/vehicule (compatibilite)
 * 2. Simule : applique les decisions d'affectation et verifie
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

    public AffectationSimulationService(SacRepository sacRepository,
                                         ChauffeurRepository chauffeurRepository,
                                         VehiculeRepository vehiculeRepository,
                                         CompatibiliteChauffeurVehiculeRepository compatibiliteRepository,
                                         PMEClienteRepository pmeClienteRepository,
                                         OptimisationRunRepository optimisationRunRepository) {
        this.sacRepository = sacRepository;
        this.chauffeurRepository = chauffeurRepository;
        this.vehiculeRepository = vehiculeRepository;
        this.compatibiliteRepository = compatibiliteRepository;
        this.pmeClienteRepository = pmeClienteRepository;
        this.optimisationRunRepository = optimisationRunRepository;
    }

    /**
     * Preview : retourne les sacs + chauffeurs + vehicules sans affecter.
     */
    @Transactional(readOnly = true)
    public AffectationPreviewResponse preview(UUID tenantId, UUID hubId) {
        // 1. Sacs CONSTITUE du hub
        List<Sac> sacs = sacRepository.rechercherParHubEtStatut(tenantId, hubId, SacStatut.CONSTITUE);

        // 2. Chauffeurs disponibles
        List<Chauffeur> chauffeurs = chauffeurRepository.findByPmeClienteTenantIdAndDisponibleTrue(tenantId)
                .stream()
                .filter(c -> "VALIDEE".equals(c.getStatutDossier()))
                .collect(Collectors.toList());

        // 3. Vehicules DISPONIBLES
        List<Vehicule> vehicules = vehiculeRepository.rechercherDisponiblesParHub(
                tenantId, hubId, VehiculeStatut.DISPONIBLE);

        // 4. Matrice compatibilite
        Map<UUID, Map<UUID, Boolean>> matrice = chargerMatrice(tenantId);

        // 5. Compter les paires compatibles
        int nbPaires = 0;
        for (Chauffeur ch : chauffeurs) {
            for (Vehicule v : vehicules) {
                Map<UUID, Boolean> lignes = matrice.get(ch.getChauffeurId());
                if (lignes != null && Boolean.TRUE.equals(lignes.get(v.getVehiculeId()))) {
                    nbPaires++;
                }
            }
        }

        List<SacAffectation> sacDtos = sacs.stream().map(s -> {
            double poids = s.getColis() != null
                    ? s.getColis().stream().mapToDouble(c -> c.getPoidsKg() != null ? c.getPoidsKg().doubleValue() : 0).sum()
                    : 0;
            double volume = s.getColis() != null
                    ? s.getColis().stream().mapToDouble(c -> c.getVolumeM3() != null ? c.getVolumeM3().doubleValue() : 0).sum()
                    : 0;
            return new SacAffectation(
                    s.getSacId(),
                    s.getCategorieDominante(),
                    s.getColis() != null ? s.getColis().size() : 0,
                    s.getTauxRemplissage() != null ? s.getTauxRemplissage().doubleValue() : 0,
                    null, null,
                    poids, volume
            );
        }).toList();

        List<ChauffeurCandidate> chauffeurDtos = chauffeurs.stream().map(ch -> new ChauffeurCandidate(
                ch.getChauffeurId(),
                ch.getUtilisateur() != null ? ch.getUtilisateur().getNom() : "N/A",
                ch.getUtilisateur() != null ? ch.getUtilisateur().getNom() : "",
                PermisService.parsePermisCategories(ch.getPermisCategories()).stream().toList()
        )).toList();

        List<VehiculeCandidate> vehiculeDtos = vehicules.stream().map(v -> new VehiculeCandidate(
                v.getVehiculeId(),
                v.getImmatriculation(),
                v.getTypeVehicule() != null ? v.getTypeVehicule().name() : "N/A",
                v.getCapacitePoidsKg() != null ? v.getCapacitePoidsKg().doubleValue() : 0,
                v.getCapaciteVolumeM3() != null ? v.getCapaciteVolumeM3().doubleValue() : 0,
                v.getPtacTonnes() != null ? v.getPtacTonnes().doubleValue() : 0
        )).toList();

        return new AffectationPreviewResponse(
                hubId, sacDtos, chauffeurDtos, vehiculeDtos,
                new AffectationMeta(sacs.size(), chauffeurs.size(), vehicules.size(), nbPaires));
    }

    /**
     * Simule : applique les decisions et verifie la compatibilite SANS persister.
     */
    @Transactional(readOnly = true)
    public AffectationSimulateResponse simuler(UUID tenantId, AffectationSimulateRequest request) {
        Map<UUID, Map<UUID, Boolean>> matrice = chargerMatrice(tenantId);

        // Charger chauffeurs et vehicules
        Map<UUID, Chauffeur> chauffeurMap = new HashMap<>();
        chauffeurRepository.findByPmeClienteTenantIdAndDisponibleTrue(tenantId)
                .forEach(ch -> chauffeurMap.put(ch.getChauffeurId(), ch));

        Map<UUID, Vehicule> vehiculeMap = new HashMap<>();
        vehiculeRepository.rechercherDisponiblesParHub(
                tenantId, request.hubId(), VehiculeStatut.DISPONIBLE)
                .forEach(v -> vehiculeMap.put(v.getVehiculeId(), v));

        // Charger les sacs
        Map<UUID, Sac> sacMap = new HashMap<>();
        sacRepository.rechercherParHubEtStatut(tenantId, request.hubId(), SacStatut.CONSTITUE)
                .forEach(s -> sacMap.put(s.getSacId(), s));

        List<AffectationResultat> resultats = new ArrayList<>();
        List<String> avertissements = new ArrayList<>();
        boolean valide = true;

        // Verifier chaque decision
        Set<UUID> chauffeursUtilises = new HashSet<>();
        Set<UUID> vehiculesUtilises = new HashSet<>();

        for (AffectationSimulateRequest.AffectationDecision decision : request.decisions()) {
            Sac sac = sacMap.get(decision.sacId());
            Chauffeur ch = chauffeurMap.get(decision.chauffeurId());
            Vehicule v = vehiculeMap.get(decision.vehiculeId());

            if (sac == null || ch == null || v == null) {
                resultats.add(new AffectationResultat(
                        decision.sacId(), decision.chauffeurId(), null,
                        decision.vehiculeId(), null,
                        false, "Sac, chauffeur ou vehicule introuvable", 0));
                valide = false;
                continue;
            }

            // Verifier doublons
            if (chauffeursUtilises.contains(decision.chauffeurId())) {
                avertissements.add("Chauffeur " + ch.getUtilisateur().getNom() + " deja utilise.");
            }
            if (vehiculesUtilises.contains(decision.vehiculeId())) {
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

            // Verifier compatibilite
            String catDom = sac.getCategorieDominante() != null ? sac.getCategorieDominante() : "STANDARD";
            PermisService.Autorisation auth = PermisService.verifier(ch, v, matrice, catDom, poidsSac, volumeSac);

            double score = auth.autorise() ? 1.0 : 0;

            resultats.add(new AffectationResultat(
                    sac.getSacId(),
                    ch.getChauffeurId(),
                    ch.getUtilisateur() != null ? ch.getUtilisateur().getNom() : "N/A",
                    v.getVehiculeId(),
                    v.getImmatriculation(),
                    auth.autorise(),
                    auth.motifRefus(),
                    score
            ));

            if (!auth.autorise()) {
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
        sacRepository.rechercherParHubEtStatut(tenantId, request.hubId(), SacStatut.CONSTITUE)
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
                sac.setChauffeur(chauffeurRepository.findById(decision.chauffeurId()).orElse(null));
                sac.setVehicule(vehiculeRepository.findById(decision.vehiculeId()).orElse(null));
                sac.setStatut(SacStatut.AFFECTE);
                sacRepository.save(sac);
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
}
