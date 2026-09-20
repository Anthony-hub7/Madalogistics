package com.example.Bakend.controller;

import com.example.Bakend.config.TenantContext;
import com.example.Bakend.dto.optimisation.GroupagePreviewResponse;
import com.example.Bakend.dto.optimisation.GroupageValiderRequest;
import com.example.Bakend.dto.optimisation.GroupageValiderResponse;
import com.example.Bakend.entity.enums.TypeAlgorithme;
import com.example.Bakend.optimisation.groupage.GroupageOrchestrationService;
import com.example.Bakend.optimisation.groupage.GroupageSimulationService;
import com.example.Bakend.optimisation.groupage.GroupageValidationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Endpoint groupage : preview + edition + validation.
 *
 * Nouveau flow (simulation avant enregistrement) :
 *   1. POST /preview   → retourne le plan SANS persister
 *   2. PUT  /editer    → applique des deplacements/exclusions sur le preview
 *   3. POST /valider   → persiste le plan edite
 *
 * Anciens endpoints conserves pour retrocompatibilite (marques deprecated).
 */
@RestController
@RequestMapping("/api/optimisation/groupage")
public class GroupageController {

    private static final Logger log = LoggerFactory.getLogger(GroupageController.class);

    private final GroupageOrchestrationService orchestrationService;
    private final GroupageValidationService validationService;
    private final GroupageSimulationService simulationService;

    public GroupageController(GroupageOrchestrationService orchestrationService,
                               GroupageValidationService validationService,
                               GroupageSimulationService simulationService) {
        this.orchestrationService = orchestrationService;
        this.validationService = validationService;
        this.simulationService = simulationService;
    }

    // ═══════════════════════════════════════════════════════════════
    // NOUVEAU FLOW : Simulation avant enregistrement
    // ═══════════════════════════════════════════════════════════════

    /**
     * Preview groupage : execute l'algorithme SANS persister.
     *
     * POST /api/optimisation/groupage/preview?hubId={uuid}&algo={BIN_PACKING|KNAPSACK}
     */
    @PostMapping("/preview")
    public ResponseEntity<?> previewGroupage(
            @RequestParam UUID hubId,
            @RequestParam(defaultValue = "BIN_PACKING") TypeAlgorithme algo) {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Contexte tenant manquant"));
        }

        log.info("Preview groupage {} tenant {} hub {}", algo, tenantId, hubId);

        try {
            GroupagePreviewResponse result = simulationService.preview(tenantId, hubId, algo);
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Preview groupage echouee tenant {} hub {}", tenantId, hubId, e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", e.getMessage() != null ? e.getMessage() : e.getClass().getName()));
        }
    }

    /**
     * Valide un run de groupage avec les sacs potentially edites.
     *
     * POST /api/optimisation/groupage/valider-edite
     */
    @PostMapping("/valider-edite")
    public ResponseEntity<?> validerGroupageEdite(@RequestBody GroupageValiderRequest request) {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Contexte tenant manquant"));
        }

        log.info("Validation groupage edite tenant {} run {}", tenantId, request.runId());

        try {
            GroupageValiderResponse result = simulationService.valider(tenantId, request);
            return ResponseEntity.ok(result);

        } catch (IllegalStateException e) {
            log.warn("Validation groupage edite echouee (400) : {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()));

        } catch (Exception e) {
            log.error("Validation groupage edite echouee (500) tenant {} run {}",
                    tenantId, request.runId(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", e.getMessage() != null ? e.getMessage() : e.getClass().getName()));
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // LEGACY : ancien flow (persiste immediatement) - DEPRECATED
    // ═══════════════════════════════════════════════════════════════

    /**
     * @deprecated Utiliser /preview au lieu de ce endpoint.
     * Lance le groupage FFD pour un hub et cree les Sacs immediatement.
     */
    @Deprecated
    @PostMapping
    public ResponseEntity<Map<String, Object>> lancerGroupage(@RequestParam UUID hubId) {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Contexte tenant manquant"));
        }

        log.info("Demande groupage (LEGACY) tenant {} hub {}", tenantId, hubId);

        try {
            GroupageOrchestrationService.GroupageResult result =
                    orchestrationService.lancerGroupage(tenantId, hubId);

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("success", true);
            response.put("run_id", result.runId() != null ? result.runId().toString() : null);
            response.put("sacs", result.sacs().stream()
                    .map(s -> {
                        Map<String, Object> sacMap = new LinkedHashMap<>();
                        sacMap.put("sac_id", s.sacId().toString());
                        sacMap.put("taux_remplissage", s.tauxRemplissage());
                        sacMap.put("nb_colis", s.nbColis());
                        sacMap.put("date_depart_plafond", s.dateDepartPlafond().toString());
                        sacMap.put("depart_force", s.departForce());
                        return sacMap;
                    })
                    .toList());
            response.put("nb_non_groupes", result.nbNonGroupes());
            response.put("justification", result.justification());

            return ResponseEntity.ok(response);

        } catch (IllegalStateException e) {
            log.warn("Groupage échoué (400) : {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()));

        } catch (Exception e) {
            log.error("Groupage échoué (500) tenant {} hub {}", tenantId, hubId, e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", e.getMessage() != null ? e.getMessage() : e.getClass().getName()));
        }
    }

    /**
     * @deprecated Utiliser /valider-edite au lieu de ce endpoint.
     * Valide un run de groupage : re-execute l'algorithme et cree les Sacs reels.
     */
    @Deprecated
    @PostMapping("/valider")
    public ResponseEntity<Map<String, Object>> validerGroupage(@RequestParam UUID runId) {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Contexte tenant manquant"));
        }

        log.info("Validation groupage (LEGACY) tenant {} run {}", tenantId, runId);

        try {
            GroupageValidationService.ValidationResult result =
                    validationService.valider(tenantId, runId);

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("success", true);
            response.put("run_id", result.runId().toString());
            response.put("sacs_crees", result.sacsCrees());
            response.put("colis_lies", result.colisLies());
            response.put("demandes_groupees", result.demandesGroupees());
            response.put("justification", result.justification());

            return ResponseEntity.ok(response);

        } catch (IllegalStateException e) {
            log.warn("Validation echouee (400) : {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()));

        } catch (Exception e) {
            log.error("Validation echouee (500) tenant {} run {}", tenantId, runId, e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", e.getMessage() != null ? e.getMessage() : e.getClass().getName()));
        }
    }
}
