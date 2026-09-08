package com.example.Bakend.controller;

import com.example.Bakend.dto.response.AgenceDossierDTO;
import com.example.Bakend.entity.PMECliente;
import com.example.Bakend.service.AgenceRegistrationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
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
    @Transactional(readOnly = true)
    public List<AgenceDossierDTO> listerDossiers(@RequestParam(required = false) String statut) {
        return agenceRegistrationService.listerDossiers(statut).stream()
                .map(AgenceDossierDTO::new)
                .toList();
    }

    /**
     * Detail d'un dossier.
     */
    @GetMapping("/{tenantId}")
    @Transactional(readOnly = true)
    public AgenceDossierDTO obtenirDossier(@PathVariable UUID tenantId) {
        PMECliente entity = agenceRegistrationService.obtenirDossier(tenantId);
        return new AgenceDossierDTO(entity);
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

    /**
     * Desactive un compte d'agence activee.
     */
    @PostMapping("/{tenantId}/desactiver")
    public ResponseEntity<Map<String, String>> desactiverDossier(@PathVariable UUID tenantId,
                                                                 @RequestBody Map<String, String> body) {
        String motif = body.getOrDefault("motif", "Desactive par l'administrateur");
        agenceRegistrationService.desactiverDossier(tenantId, motif);
        return ResponseEntity.ok(Map.of("message", "Agence desactivee avec succes"));
    }

    /**
     * Supprime un compte d'agence (soft delete).
     */
    @PostMapping("/{tenantId}/supprimer")
    public ResponseEntity<Map<String, String>> supprimerDossier(@PathVariable UUID tenantId,
                                                                 @RequestBody Map<String, String> body) {
        String motif = body.getOrDefault("motif", "Supprime par l'administrateur");
        agenceRegistrationService.supprimerDossier(tenantId, motif);
        return ResponseEntity.ok(Map.of("message", "Agence supprimee avec succes"));
    }

    /**
     * Reactive un compte d'agence desactivee.
     */
    @PostMapping("/{tenantId}/reactiver")
    public ResponseEntity<Map<String, String>> reactiverDossier(@PathVariable UUID tenantId) {
        agenceRegistrationService.reactiverDossier(tenantId);
        return ResponseEntity.ok(Map.of("message", "Agence reactivée avec succes"));
    }
}
