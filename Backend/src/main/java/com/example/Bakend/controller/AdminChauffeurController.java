package com.example.Bakend.controller;

import com.example.Bakend.dto.response.ChauffeurDossierDTO;
import com.example.Bakend.entity.Chauffeur;
import com.example.Bakend.service.ChauffeurRegistrationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Contrôleur REST pour la gestion des dossiers de chauffeurs freelance (admin SAAS).
 * Permet de lister, valider ou refuser les dossiers en attente.
 */
@RestController
@RequestMapping("/api/admin/chauffeurs")
@PreAuthorize("hasRole('ADMIN_SAAS')")
public class AdminChauffeurController {

    private final ChauffeurRegistrationService chauffeurRegistrationService;

    public AdminChauffeurController(ChauffeurRegistrationService chauffeurRegistrationService) {
        this.chauffeurRegistrationService = chauffeurRegistrationService;
    }

    /**
     * Liste les dossiers de chauffeurs freelance de la plateforme, optionnellement filtres par statut.
     */
    @GetMapping
    @Transactional(readOnly = true)
    public List<ChauffeurDossierDTO> listerDossiers(@RequestParam(required = false) String statut) {
        return chauffeurRegistrationService.listerDossiersPlateforme(statut).stream()
                .map(ChauffeurDossierDTO::new)
                .toList();
    }

    /**
     * Detail d'un dossier chauffeur.
     */
    @GetMapping("/{chauffeurId}")
    @Transactional(readOnly = true)
    public ChauffeurDossierDTO obtenirDossier(@PathVariable UUID chauffeurId) {
        Chauffeur entity = chauffeurRegistrationService.obtenirDossier(chauffeurId);
        return new ChauffeurDossierDTO(entity);
    }

    /**
     * Valide un dossier de chauffeur freelance.
     */
    @PostMapping("/{chauffeurId}/valider")
    public ResponseEntity<Map<String, String>> validerDossier(@PathVariable UUID chauffeurId) {
        chauffeurRegistrationService.validerDossier(chauffeurId);
        return ResponseEntity.ok(Map.of("message", "Dossier valide avec succes"));
    }

    /**
     * Refuse un dossier de chauffeur freelance avec motif.
     */
    @PostMapping("/{chauffeurId}/refuser")
    public ResponseEntity<Map<String, String>> refuserDossier(@PathVariable UUID chauffeurId,
                                                              @RequestBody Map<String, String> body) {
        String motif = body.getOrDefault("motif", "Dossier non conforme");
        chauffeurRegistrationService.refuserDossier(chauffeurId, motif);
        return ResponseEntity.ok(Map.of("message", "Dossier refuse"));
    }

    /**
     * Desactive un chauffeur freelance actif.
     */
    @PostMapping("/{chauffeurId}/desactiver")
    public ResponseEntity<Map<String, String>> desactiverDossier(@PathVariable UUID chauffeurId,
                                                                  @RequestBody Map<String, String> body) {
        String motif = body.getOrDefault("motif", "Desactive par l'administrateur");
        chauffeurRegistrationService.desactiverDossier(chauffeurId, motif);
        return ResponseEntity.ok(Map.of("message", "Chauffeur desactive avec succes"));
    }

    /**
     * Supprime un chauffeur freelance (soft delete).
     */
    @PostMapping("/{chauffeurId}/supprimer")
    public ResponseEntity<Map<String, String>> supprimerDossier(@PathVariable UUID chauffeurId,
                                                                  @RequestBody Map<String, String> body) {
        String motif = body.getOrDefault("motif", "Supprime par l'administrateur");
        chauffeurRegistrationService.supprimerDossier(chauffeurId, motif);
        return ResponseEntity.ok(Map.of("message", "Chauffeur supprime avec succes"));
    }

    /**
     * Reactive un chauffeur freelance desactive.
     */
    @PostMapping("/{chauffeurId}/reactiver")
    public ResponseEntity<Map<String, String>> reactiverDossier(@PathVariable UUID chauffeurId) {
        chauffeurRegistrationService.reactiverDossier(chauffeurId);
        return ResponseEntity.ok(Map.of("message", "Chauffeur reactivé avec succes"));
    }
}
