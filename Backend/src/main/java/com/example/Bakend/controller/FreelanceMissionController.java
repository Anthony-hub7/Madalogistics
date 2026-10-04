package com.example.Bakend.controller;

import com.example.Bakend.dto.freelance.AccepterMissionDTO;
import com.example.Bakend.dto.freelance.MissionProposeeDTO;
import com.example.Bakend.dto.optimisation.VrpValiderRequest;
import com.example.Bakend.dto.optimisation.VrpValiderResponse;
import com.example.Bakend.dto.response.MissionDTO;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.optimisation.vrp.VrpSimulationService;
import com.example.Bakend.security.SecurityUtils;
import com.example.Bakend.service.FreelanceMissionService;
import com.example.Bakend.service.MissionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Appel d'offres freelance (place de marché multi-agences).
 *
 * GET  /api/chauffeur/missions-proposees
 *      → sacs CONSTITUE issus d'une demande FREELANCE, avec calcul
 *        d'eligibilite (capacite poids/volume du vehicule du freelance).
 *
 * POST /api/chauffeur/missions-proposees/{sacId}/accepter
 *      → first-accept : le premier freelance qui accepte gagne.
 *        L'attribution se fait dans une transaction, la tournee VRP dans une
 *        transaction separee : un echec de routage (coordonnees manquantes)
 *        n'annule jamais l'attribution, il est retourne en "avertissement".
 */
@RestController
@RequestMapping("/api/chauffeur/missions-proposees")
@PreAuthorize("hasRole('CHAUFFEUR')")
public class FreelanceMissionController {

    private static final Logger log = LoggerFactory.getLogger(FreelanceMissionController.class);

    private final FreelanceMissionService freelanceMissionService;
    private final VrpSimulationService vrpSimulationService;
    private final MissionService missionService;

    public FreelanceMissionController(FreelanceMissionService freelanceMissionService,
                                      VrpSimulationService vrpSimulationService,
                                      MissionService missionService) {
        this.freelanceMissionService = freelanceMissionService;
        this.vrpSimulationService = vrpSimulationService;
        this.missionService = missionService;
    }

    /**
     * Liste des missions ouvertes aux freelances (toutes agences).
     */
    @GetMapping
    public ResponseEntity<List<MissionProposeeDTO>> listerProposees() {
        return ResponseEntity.ok(freelanceMissionService.listerProposees(requireUtilisateurId()));
    }

    /**
     * Accepter une mission → attribution immediate + calcul automatique de la tournee.
     */
    @PostMapping("/{sacId}/accepter")
    public ResponseEntity<Map<String, Object>> accepter(@PathVariable UUID sacId) {
        UUID utilisateurId = requireUtilisateurId();

        // Transaction 1 : attribution (first-accept, verrou pessimiste)
        AccepterMissionDTO attribution = freelanceMissionService.accepter(utilisateurId, sacId);

        String avertissement = null;
        Map<String, Object> tournee = null;

        if (!attribution.coordonneesCompletes()) {
            avertissement = "Coordonnees GPS incompletes : itineraire non calcule. "
                    + "Renseignez les coordonnees du hub et des adresses de livraison.";
        } else {
            try {
                // Transaction 2 : calcul VRP (un echec ici n'annule pas l'attribution)
                UUID tenantAgence = freelanceMissionService.tenantDuSac(sacId);
                VrpValiderResponse vrp = vrpSimulationService.valider(
                        tenantAgence, new VrpValiderRequest(sacId, null));

                Map<String, Object> t = new LinkedHashMap<>();
                t.put("tourneeId", vrp.tourneeId());
                t.put("runId", vrp.runId());
                t.put("distanceKm", vrp.distanceTotaleKm());
                t.put("nbEtapes", vrp.nbEtapes());
                t.put("message", vrp.justification());
                tournee = t;
            } catch (Exception e) {
                log.warn("Mission {} attribuee mais tournee VRP non calculee : {}",
                        sacId, e.getMessage());
                avertissement = "Mission attribuee, mais l'itineraire n'a pas pu etre calcule : "
                        + (e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
            }
        }

        // Transaction 3 : vue mission complete (tournee + etapes si disponibles)
        MissionDTO mission = missionService.missionPourSac(sacId);

        Map<String, Object> reponse = new LinkedHashMap<>();
        reponse.put("success", true);
        reponse.put("mission", mission);
        reponse.put("tournee", tournee);
        reponse.put("avertissement", avertissement);

        return ResponseEntity.ok(reponse);
    }

    // ── Helpers ──

    private UUID requireUtilisateurId() {
        var user = SecurityUtils.getCurrentUser();
        if (user == null) {
            throw new BusinessException("Non authentifie", 401);
        }
        return user.getUtilisateurId();
    }
}
