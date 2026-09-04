package com.example.Bakend.controller;

import com.example.Bakend.entity.PMECliente;
import com.example.Bakend.service.AgenceRegistrationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Contrôleur REST pour la gestion des dossiers d'inscription agence (admin SAAS).
 * Permet de lister, valider ou refuser les dossiers en attente.
 */
@RestController
@RequestMapping("/api/admin/agences")
@PreAuthorize("hasRole('ADMIN_SAAS')")
public class AdminAgenceController {

    private final AgenceRegistrationService agenceRegistrationService;

    public AdminAgenceController(AgenceRegistrationService agenceRegistrationService) {
        this.agenceRegistrationService = agenceRegistrationService;
    }

    /**
     * Liste les dossiers d'agences, optionnellement filtres par statut.
     */
    @GetMapping
    public List<PMECliente> listerDossiers(@RequestParam(required = false) String statut) {
        return agenceRegistrationService.listerDossiers(statut);
    }

    /**
     * Detail d'un dossier.
     */
    @GetMapping("/{tenantId}")
    public PMECliente obtenirDossier(@PathVariable UUID tenantId) {
        return agenceRegistrationService.obtenirDossier(tenantId);
    }

    /**
     * Valide un dossier d'agence.
     */
    @PostMapping("/{tenantId}/valider")
    public ResponseEntity<Map<String, String>> validerDossier(@PathVariable UUID tenantId) {
        agenceRegistrationService.validerDossier(tenantId);
        return ResponseEntity.ok(Map.of("message", "Dossier valide avec succes"));
    }

    /**
     * Refuse un dossier d'agence avec motif.
     */
    @PostMapping("/{tenantId}/refuser")
    public ResponseEntity<Map<String, String>> refuserDossier(@PathVariable UUID tenantId,
                                                              @RequestBody Map<String, String> body) {
        String motif = body.getOrDefault("motif", "Dossier non conforme");
        agenceRegistrationService.refuserDossier(tenantId, motif);
        return ResponseEntity.ok(Map.of("message", "Dossier refuse"));
    }
}
