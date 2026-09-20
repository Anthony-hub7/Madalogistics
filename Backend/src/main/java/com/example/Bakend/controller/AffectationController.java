package com.example.Bakend.controller;

import com.example.Bakend.config.TenantContext;
import com.example.Bakend.dto.optimisation.*;
import com.example.Bakend.optimisation.affectation.AffectationService;
import com.example.Bakend.optimisation.affectation.AffectationSimulationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Phase 5 — Endpoint d'affectation : preview + simulate + validate.
 *
 * Nouveau flow :
 *   1. POST /preview   → retourne les sacs + chauffeurs + vehicules
 *   2. POST /simuler   → verifie les decisions d'affectation
 *   3. POST /valider   → persiste les affectations
 *
 * Legacy conserv pour retrocompatibilite.
 */
@RestController
@RequestMapping("/api/optimisation/affectation")
public class AffectationController {

    private static final Logger log = LoggerFactory.getLogger(AffectationController.class);

    private final AffectationService affectationService;
    private final AffectationSimulationService simulationService;

    public AffectationController(AffectationService affectationService,
                                  AffectationSimulationService simulationService) {
        this.affectationService = affectationService;
        this.simulationService = simulationService;
    }

    // ═══════════════════════════════════════════════════════════════
    // NOUVEAU FLOW : Simulation avant enregistrement
    // ═══════════════════════════════════════════════════════════════

    /**
     * Preview : retourne les sacs + chauffeurs + vehicules sans affecter.
     *
     * POST /api/optimisation/affectation/preview?hubId={uuid}
     */
    @PostMapping("/preview")
    public ResponseEntity<?> previewAffectation(@RequestParam UUID hubId) {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Contexte tenant manquant"));
        }

        log.info("Preview affectation tenant {} hub {}", tenantId, hubId);

        try {
            AffectationPreviewResponse result = simulationService.preview(tenantId, hubId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Preview affectation echouee tenant {} hub {}", tenantId, hubId, e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", e.getMessage() != null ? e.getMessage() : e.getClass().getName()));
        }
    }

    /**
     * Simule : verifie les decisions d'affectation SANS persister.
     *
     * POST /api/optimisation/affectation/simuler
     */
    @PostMapping("/simuler")
    public ResponseEntity<?> simulerAffectation(@RequestBody AffectationSimulateRequest request) {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Contexte tenant manquant"));
        }

        log.info("Simulation affectation tenant {} hub {}", tenantId, request.hubId());

        try {
            AffectationSimulateResponse result = simulationService.simuler(tenantId, request);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Simulation affectation echouee tenant {} hub {}", tenantId, request.hubId(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", e.getMessage() != null ? e.getMessage() : e.getClass().getName()));
        }
    }

    /**
     * Valide : persiste les affectations chauffeur/vehicule.
     *
     * POST /api/optimisation/affectation/valider
     */
    @PostMapping("/valider")
    public ResponseEntity<?> validerAffectation(@RequestBody AffectationValiderRequest request) {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Contexte tenant manquant"));
        }

        log.info("Validation affectation tenant {} hub {}", tenantId, request.hubId());

        try {
            AffectationValiderResponse result = simulationService.valider(tenantId, request);
            return ResponseEntity.ok(result);
        } catch (IllegalStateException e) {
            log.warn("Validation affectation echouee (400) : {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()));
        } catch (Exception e) {
            log.error("Validation affectation echouee (500) tenant {} hub {}", tenantId, request.hubId(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", e.getMessage() != null ? e.getMessage() : e.getClass().getName()));
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // LEGACY : ancien flow (persiste immediatement) - DEPRECATED
    // ═══════════════════════════════════════════════════════════════

    /**
     * @deprecated Utiliser /preview + /valider au lieu de ce endpoint.
     */
    @Deprecated
    @PostMapping
    public ResponseEntity<Map<String, Object>> affecter(@RequestParam UUID hubId) {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Contexte tenant manquant"));
        }

        log.info("Affectation (LEGACY) tenant {} hub {}", tenantId, hubId);

        try {
            AffectationService.AffectationResult result =
                    affectationService.affecter(tenantId, hubId);

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("success", true);
            response.put("run_id", result.runId() != null ? result.runId().toString() : null);
            response.put("nb_sacs_affectes", result.nbSacsAffectes());
            response.put("nb_sacs_non_affectes", result.nbSacsNonAffectes());
            response.put("affectations", result.affectations().stream()
                    .map(d -> {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("sac_id", d.sacId().toString());
                        m.put("affecte", d.affecte());
                        if (d.affecte()) {
                            m.put("chauffeur_id", d.chauffeurId().toString());
                            m.put("chauffeur_nom", d.chauffeurNom());
                            m.put("vehicule_id", d.vehiculeId().toString());
                            m.put("immatriculation", d.immatriculation());
                        } else {
                            m.put("motif_refus", d.motifRefus());
                        }
                        return m;
                    })
                    .toList());
            response.put("justification", result.justification());

            return ResponseEntity.ok(response);

        } catch (IllegalStateException e) {
            log.warn("Affectation echouee (400) : {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()));

        } catch (Exception e) {
            log.error("Affectation echouee (500) tenant {} hub {}", tenantId, hubId, e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", e.getMessage() != null ? e.getMessage() : e.getClass().getName()));
        }
    }
}
