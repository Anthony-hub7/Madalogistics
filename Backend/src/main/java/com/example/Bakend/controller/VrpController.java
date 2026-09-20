package com.example.Bakend.controller;

import com.example.Bakend.config.TenantContext;
import com.example.Bakend.dto.optimisation.VrpPreviewResponse;
import com.example.Bakend.dto.optimisation.VrpValiderRequest;
import com.example.Bakend.dto.optimisation.VrpValiderResponse;
import com.example.Bakend.entity.Tournee;
import com.example.Bakend.optimisation.vrp.VrpOrchestrationService;
import com.example.Bakend.optimisation.vrp.VrpSimulationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Endpoint VRP : preview + edition + validation.
 *
 * Nouveau flow :
 *   1. POST /preview   → retourne les etapes SANS persister
 *   2. POST /valider   → persiste la Tournee avec l'ordre edite
 *
 * Legacy conserv pour retrocompatibilite.
 */
@RestController
@RequestMapping("/api/optimisation/vrp")
public class VrpController {

    private static final Logger log = LoggerFactory.getLogger(VrpController.class);

    private final VrpOrchestrationService orchestrationService;
    private final VrpSimulationService simulationService;

    public VrpController(VrpOrchestrationService orchestrationService,
                          VrpSimulationService simulationService) {
        this.orchestrationService = orchestrationService;
        this.simulationService = simulationService;
    }

    // ═══════════════════════════════════════════════════════════════
    // NOUVEAU FLOW : Simulation avant enregistrement
    // ═══════════════════════════════════════════════════════════════

    /**
     * Preview : execute le VRP SANS persister.
     *
     * POST /api/optimisation/vrp/preview?sacId={uuid}
     */
    @PostMapping("/preview")
    public ResponseEntity<?> previewVrp(@RequestParam UUID sacId) {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Contexte tenant manquant"));
        }

        log.info("Preview VRP tenant {} sac {}", tenantId, sacId);

        try {
            VrpPreviewResponse result = simulationService.preview(tenantId, sacId);
            return ResponseEntity.ok(result);
        } catch (NoSuchElementException e) {
            log.warn("Preview VRP (404) : {}", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            log.warn("Preview VRP (400) : {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()));
        } catch (Exception e) {
            log.error("Preview VRP (500) tenant {} sac {}", tenantId, sacId, e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", e.getMessage() != null ? e.getMessage() : e.getClass().getName()));
        }
    }

    /**
     * Valide : persiste la Tournee avec l'ordre edite.
     *
     * POST /api/optimisation/vrp/valider
     */
    @PostMapping("/valider")
    public ResponseEntity<?> validerVrp(@RequestBody VrpValiderRequest request) {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Contexte tenant manquant"));
        }

        log.info("Validation VRP tenant {} sac {}", tenantId, request.sacId());

        try {
            VrpValiderResponse result = simulationService.valider(tenantId, request);
            return ResponseEntity.ok(result);
        } catch (NoSuchElementException e) {
            log.warn("Validation VRP (404) : {}", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            log.warn("Validation VRP (400) : {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()));
        } catch (Exception e) {
            log.error("Validation VRP (500) tenant {} sac {}", tenantId, request.sacId(), e);
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
    public ResponseEntity<Map<String, Object>> lancerVrp(@RequestParam UUID sacId) {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Contexte tenant manquant"));
        }

        log.info("Demande VRP (LEGACY) tenant {} sac {}", tenantId, sacId);

        try {
            Tournee tournee = orchestrationService.orchestrerVrp(tenantId, sacId);

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("success", true);
            response.put("tournee_id", tournee.getTourneeId().toString());
            response.put("statut", tournee.getStatut().name());
            response.put("distance_totale_km", tournee.getDistanceTotaleKm());
            response.put("run_id", tournee.getRunVrp() != null
                    ? tournee.getRunVrp().getRunId().toString() : null);
            response.put("nb_etapes", tournee.getEtapes().size());
            response.put("etapes", tournee.getEtapes().stream()
                    .map(e -> {
                        Map<String, Object> etapeMap = new LinkedHashMap<>();
                        etapeMap.put("ordre", e.getOrdre());
                        etapeMap.put("type", e.getTypeEtape().name());
                        etapeMap.put("colis_id", e.getColis().getColisId().toString());
                        etapeMap.put("date_heure_prevue", e.getDateHeurePrevue() != null
                                ? e.getDateHeurePrevue().toString() : null);
                        return etapeMap;
                    })
                    .collect(Collectors.toList()));

            return ResponseEntity.ok(response);

        } catch (java.util.NoSuchElementException e) {
            log.warn("VRP échoué (404) : {}", e.getMessage());
            return ResponseEntity.notFound().build();

        } catch (IllegalStateException e) {
            log.warn("VRP échoué (400) : {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()));

        } catch (Exception e) {
            log.error("VRP échoué (500) tenant {} sac {}", tenantId, sacId, e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", e.getMessage() != null ? e.getMessage() : e.getClass().getName()));
        }
    }
}
