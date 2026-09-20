package com.example.Bakend.controller;

import com.example.Bakend.config.TenantContext;
import com.example.Bakend.dto.optimisation.SacPipelineResponse;
import com.example.Bakend.optimisation.groupage.SacPipelineService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Pipeline : lister tous les sacs pour le dashboard optimisation.
 *
 * GET /api/sacs → tous les sacs du tenant, avec statut, poids, volume, chauffeur, vehicule, tournee.
 */
@RestController
@RequestMapping("/api/sacs")
public class SacController {

    private static final Logger log = LoggerFactory.getLogger(SacController.class);

    private final SacPipelineService sacPipelineService;

    public SacController(SacPipelineService sacPipelineService) {
        this.sacPipelineService = sacPipelineService;
    }

    @GetMapping
    public ResponseEntity<?> listerSacs() {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Contexte tenant manquant"));
        }

        log.info("Pipeline sacs tenant {}", tenantId);

        try {
            List<SacPipelineResponse> sacs = sacPipelineService.listerParTenant(tenantId);
            return ResponseEntity.ok(sacs);
        } catch (Exception e) {
            log.error("Pipeline sacs echoue tenant {}", tenantId, e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", e.getMessage() != null ? e.getMessage() : e.getClass().getName()));
        }
    }
}
