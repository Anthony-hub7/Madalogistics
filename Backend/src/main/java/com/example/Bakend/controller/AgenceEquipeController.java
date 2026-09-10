package com.example.Bakend.controller;

import com.example.Bakend.dto.response.ChauffeurDossierDTO;
import com.example.Bakend.entity.Chauffeur;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.security.SecurityUtils;
import com.example.Bakend.service.EquipeService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Contrôleur REST pour la gestion de l'équipe chauffeur par l'agence (DIRECTION).
 * Permet de lister, valider ou refuser les dossiers de chauffeurs rattachés à l'agence.
 * Miroir du AdminChauffeurController, mais scopé strictement au tenantId du JWT.
 */
@RestController
@RequestMapping("/api/agences/equipe/chauffeurs")
@PreAuthorize("hasRole('DIRECTION')")
public class AgenceEquipeController {

    private final EquipeService equipeService;

    public AgenceEquipeController(EquipeService equipeService) {
        this.equipeService = equipeService;
    }

    /**
     * Liste les dossiers de chauffeurs rattachés à l'agence, filtres par statut.
     */
    @GetMapping
    @Transactional(readOnly = true)
    public List<ChauffeurDossierDTO> listerDossiers(@RequestParam(required = false) String statut) {
        return equipeService.listerDossiers(requireTenantId(), statut).stream()
                .map(ChauffeurDossierDTO::new)
                .toList();
    }

    /**
     * Detail d'un dossier chauffeur de l'agence.
     */
    @GetMapping("/{chauffeurId}")
    @Transactional(readOnly = true)
    public ChauffeurDossierDTO obtenirDossier(@PathVariable UUID chauffeurId) {
        Chauffeur entity = equipeService.obtenirDossier(requireTenantId(), chauffeurId);
        return new ChauffeurDossierDTO(entity);
    }

    /**
     * Valide un dossier de chauffeur rattaché.
     */
    @PostMapping("/{chauffeurId}/valider")
    public ResponseEntity<Map<String, String>> validerDossier(@PathVariable UUID chauffeurId) {
        equipeService.validerDossier(requireTenantId(), chauffeurId);
        return ResponseEntity.ok(Map.of("message", "Chauffeur valide avec succes"));
    }

    /**
     * Refuse un dossier de chauffeur rattaché avec motif.
     */
    @PostMapping("/{chauffeurId}/refuser")
    public ResponseEntity<Map<String, String>> refuserDossier(@PathVariable UUID chauffeurId,
                                                              @RequestBody Map<String, String> body) {
        String motif = body.getOrDefault("motif", "Dossier non conforme");
        equipeService.refuserDossier(requireTenantId(), chauffeurId, motif);
        return ResponseEntity.ok(Map.of("message", "Dossier refuse"));
    }

    /**
     * Desactive un chauffeur actif de l'agence.
     */
    @PostMapping("/{chauffeurId}/desactiver")
    public ResponseEntity<Map<String, String>> desactiverDossier(@PathVariable UUID chauffeurId,
                                                                  @RequestBody Map<String, String> body) {
        String motif = body.getOrDefault("motif", "Desactive par l'agence");
        equipeService.desactiverDossier(requireTenantId(), chauffeurId, motif);
        return ResponseEntity.ok(Map.of("message", "Chauffeur desactive avec succes"));
    }

    /**
     * Reactive un chauffeur desactive de l'agence.
     */
    @PostMapping("/{chauffeurId}/reactiver")
    public ResponseEntity<Map<String, String>> reactiverDossier(@PathVariable UUID chauffeurId) {
        equipeService.reactiverDossier(requireTenantId(), chauffeurId);
        return ResponseEntity.ok(Map.of("message", "Chauffeur reactive avec succes"));
    }

    /**
     * Téléchargement du scan du permis pour un chauffeur de l'agence (scope agence).
     */
    @GetMapping("/{chauffeurId}/permis")
    public ResponseEntity<byte[]> downloadPermis(@PathVariable UUID chauffeurId) {
        Chauffeur chauffeur = equipeService.obtenirDossier(requireTenantId(), chauffeurId);
        byte[] data = chauffeur.getPermisScan();
        if (data == null || data.length == 0) {
            throw new BusinessException("Scan du permis non fourni pour ce chauffeur");
        }
        MediaType mediaType = detectMediaType(data);
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"permis_" + chauffeurId + ".pdf\"")
                .body(data);
    }

    /**
     * Résout le tenant de l'utilisateur courant ; requis pour toute opération scopée agence.
     */
    private UUID requireTenantId() {
        UUID tenantId = SecurityUtils.getTenantId();
        if (tenantId == null) {
            throw new BusinessException(
                    "Contexte tenant manquant : l'opération requiert un utilisateur DIRECTION rattache a une agence",
                    403);
        }
        return tenantId;
    }

    private MediaType detectMediaType(byte[] data) {
        if (data == null || data.length < 4) return MediaType.APPLICATION_OCTET_STREAM;
        if (data[0] == 0x25 && data[1] == 0x50 && data[2] == 0x44 && data[3] == 0x46) {
            return MediaType.APPLICATION_PDF;
        }
        if ((data[0] & 0xFF) == 0xFF && (data[1] & 0xFF) == 0xD8 && (data[2] & 0xFF) == 0xFF) {
            return MediaType.IMAGE_JPEG;
        }
        if ((data[0] & 0xFF) == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47) {
            return MediaType.IMAGE_PNG;
        }
        return MediaType.APPLICATION_OCTET_STREAM;
    }
}
