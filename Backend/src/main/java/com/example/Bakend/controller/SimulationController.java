package com.example.Bakend.controller;

import com.example.Bakend.dto.simulation.SimulationGroupeRequest;
import com.example.Bakend.dto.simulation.SimulationGroupeResponse;
import com.example.Bakend.optimisation.simulation.SimulationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Simulation de groupage 100% hors BDD (page Simulation du gestionnaire).
 *
 * Contrairement a /api/optimisation/groupage/* qui lit les demandes, les hubs
 * et les vehicules reels puis ecrit sur validation, ce controleur ne prend
 * que des donnees saisies par l'utilisateur et ne retourne que des resultats
 * calcules : aucune lecture ni ecriture en base.
 */
@RestController
@RequestMapping("/api/simulation")
@PreAuthorize("hasAnyRole('GESTIONNAIRE','DIRECTION')")
public class SimulationController {

    private static final Logger log = LoggerFactory.getLogger(SimulationController.class);

    private final SimulationService simulationService;

    public SimulationController(SimulationService simulationService) {
        this.simulationService = simulationService;
    }

    /**
     * POST /api/simulation/groupage — simule le groupage des colis saisis.
     */
    @PostMapping("/groupage")
    public ResponseEntity<?> grouper(@RequestBody SimulationGroupeRequest request) {
        try {
            SimulationGroupeResponse result = simulationService.grouper(request);
            return ResponseEntity.ok(result);

        } catch (IllegalStateException e) {
            log.warn("Simulation groupage invalide (400) : {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()));

        } catch (Exception e) {
            log.error("Simulation groupage echouee (500)", e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", e.getMessage() != null ? e.getMessage() : e.getClass().getName()));
        }
    }
}
