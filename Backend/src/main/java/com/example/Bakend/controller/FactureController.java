package com.example.Bakend.controller;

import com.example.Bakend.dto.facture.FactureListResponse;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.service.FactureHistoriqueService;
import com.example.Bakend.config.TenantContext;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Historique de facturation (page Historique, onglet Factures).
 *
 * GET /api/factures?statut=PAYEE&from=2026-01-01&to=2026-06-30
 *   → factures du tenant + commande liee + presence de preuves de livraison.
 * Le detail complet (preuves, images) reste GET /api/demandes/{id}/facture.
 */
@RestController
@RequestMapping("/api/factures")
public class FactureController {

    private final FactureHistoriqueService factureHistoriqueService;

    public FactureController(FactureHistoriqueService factureHistoriqueService) {
        this.factureHistoriqueService = factureHistoriqueService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('GESTIONNAIRE','DIRECTION')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<FactureListResponse>> lister(
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            throw new BusinessException("Contexte tenant manquant", 400);
        }
        return ResponseEntity.ok(factureHistoriqueService.lister(tenantId, statut, from, to));
    }
}
