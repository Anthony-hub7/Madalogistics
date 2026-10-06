package com.example.Bakend.controller;

import com.example.Bakend.dto.incident.SignalerIncidentRequest;
import com.example.Bakend.dto.response.MissionDTO;
import com.example.Bakend.entity.enums.TypeEtape;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.security.SecurityUtils;
import com.example.Bakend.service.MissionService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

/**
 * Contrôleur REST pour les missions du chauffeur connecté.
 * Endpoints : lister, detail, prendre-en-charge, cloturer, photo.
 */
@RestController
@RequestMapping("/api/chauffeur/missions")
@PreAuthorize("hasRole('CHAUFFEUR')")
public class ChauffeurMissionController {

    private final MissionService missionService;

    public ChauffeurMissionController(MissionService missionService) {
        this.missionService = missionService;
    }

    /**
     * Lister les missions du chauffeur connecté (sacs AFFECTE ou EN_TRANSIT).
     */
    @GetMapping
    public ResponseEntity<List<MissionDTO>> listerMissions() {
        UUID tenantId = requireTenantId();
        UUID utilisateurId = requireUtilisateurId();
        List<MissionDTO> missions = missionService.listerMissions(tenantId, utilisateurId);
        return ResponseEntity.ok(missions);
    }

    /**
     * Détail d'une mission (sac + tournée + étapes + colis + véhicule).
     */
    @GetMapping("/{sacId}")
    public ResponseEntity<MissionDTO> detailMission(@PathVariable UUID sacId) {
        UUID tenantId = requireTenantId();
        UUID utilisateurId = requireUtilisateurId();
        MissionDTO mission = missionService.detailMission(tenantId, utilisateurId, sacId);
        return ResponseEntity.ok(mission);
    }

    /**
     * Prendre en charge une mission → bascule directe en EN_TRANSIT.
     * Pas de refus possible (rattaché obligatoire).
     */
    @PostMapping("/{sacId}/prendre-en-charge")
    public ResponseEntity<MissionDTO> prendreEnCharge(@PathVariable UUID sacId) {
        UUID tenantId = requireTenantId();
        UUID utilisateurId = requireUtilisateurId();
        MissionDTO mission = missionService.prendreEnCharge(tenantId, utilisateurId, sacId);
        return ResponseEntity.ok(mission);
    }

    /**
     * Valider une etape de livraison (photo par colis).
     * Si toutes les etapes LIVRAISON sont validees → cloture auto + facture.
     */
    @PostMapping("/{sacId}/etapes/{etapeId}/valider")
    public ResponseEntity<Map<String, Object>> validerEtape(
            @PathVariable UUID sacId,
            @PathVariable UUID etapeId,
            @RequestParam("photo") MultipartFile photo,
            @RequestParam(value = "signatureNom", required = false) String signatureNom,
            @RequestParam(value = "notes", required = false) String notes) {

        UUID tenantId = requireTenantId();
        UUID utilisateurId = requireUtilisateurId();

        if (photo.isEmpty()) {
            throw new BusinessException("Photo de preuve obligatoire", 400);
        }
        if (photo.getSize() > 6 * 1024 * 1024) {
            throw new BusinessException("Photo trop volumineuse (max 6 Mo)", 400);
        }

        byte[] photoBytes;
        try {
            photoBytes = photo.getBytes();
        } catch (IOException e) {
            throw new BusinessException("Erreur lecture photo : " + e.getMessage(), 500);
        }

        Map<String, Object> result = missionService.validerEtape(
                tenantId, utilisateurId, sacId, etapeId, photoBytes, signatureNom, notes);
        return ResponseEntity.ok(result);
    }

    /**
     * Clôturer une mission avec photo(s) de preuve obligatoire(s) par étape.
     * multipart : photos[etapeId] + signatureNom + notes
     */
    @PostMapping("/{sacId}/cloturer")
    public ResponseEntity<MissionDTO> cloturer(
            @PathVariable UUID sacId,
            @RequestParam(value = "signatureNom", required = false) String signatureNom,
            @RequestParam(value = "notes", required = false) String notes,
            @RequestPart(value = "photos", required = false) List<MultipartFile> photos,
            @RequestPart(value = "etapeIds", required = false) List<String> etapeIds) {

        UUID tenantId = requireTenantId();
        UUID utilisateurId = requireUtilisateurId();

        // Construire la map etapeId → photo bytes
        Map<UUID, byte[]> photosParEtape = new HashMap<>();
        if (photos != null && etapeIds != null) {
            if (photos.size() != etapeIds.size()) {
                throw new BusinessException("Le nombre de photos doit correspondre au nombre d'etapes", 400);
            }
            for (int i = 0; i < photos.size(); i++) {
                try {
                    MultipartFile photo = photos.get(i);
                    if (photo != null && !photo.isEmpty()) {
                        if (photo.getSize() > 6 * 1024 * 1024) {
                            throw new BusinessException("Photo trop volumineuse (max 6 Mo)", 400);
                        }
                        UUID etapeId = UUID.fromString(etapeIds.get(i));
                        photosParEtape.put(etapeId, photo.getBytes());
                    }
                } catch (IOException e) {
                    throw new BusinessException("Erreur lecture photo : " + e.getMessage(), 500);
                }
            }
        }

        MissionDTO mission = missionService.cloturer(tenantId, utilisateurId, sacId, photosParEtape, signatureNom, notes);
        return ResponseEntity.ok(mission);
    }

    /**
     * Signaler un incident vehicule (panne, route coupee...) sur la mission.
     * N'interrompt pas la mission : alerte le gestionnaire (notification + audit).
     */
    @PostMapping("/{sacId}/signaler-incident")
    public ResponseEntity<Map<String, Object>> signalerIncident(
            @PathVariable UUID sacId,
            @RequestBody(required = false) SignalerIncidentRequest request) {
        UUID tenantId = requireTenantId();
        UUID utilisateurId = requireUtilisateurId();
        missionService.signalerIncident(tenantId, utilisateurId, sacId,
                request != null ? request.type() : null,
                request != null ? request.message() : null);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Incident signale au responsable logistique"));
    }

    /**
     * Télécharger la photo de preuve d'une étape (même modèle que permis).
     */
    @GetMapping("/etapes/{etapeId}/photo")
    public ResponseEntity<byte[]> getPhotoPreuve(@PathVariable UUID etapeId) {
        UUID tenantId = requireTenantId();
        byte[] data = missionService.getPhotoPreuve(tenantId, etapeId);
        MediaType mediaType = detectMediaType(data);
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"preuve_" + etapeId + "\"")
                .body(data);
    }

    /**
     * Trace aller-retour pour la carte (hub → livraisons → hub).
     */
    @GetMapping("/{sacId}/trace")
    public ResponseEntity<Map<String, Object>> getTrace(@PathVariable UUID sacId) {
        UUID tenantId = requireTenantId();
        UUID utilisateurId = requireUtilisateurId();
        Map<String, Object> trace = missionService.getTrace(tenantId, utilisateurId, sacId);
        return ResponseEntity.ok(trace);
    }

    // ── Helpers ──

    private UUID requireTenantId() {
        UUID tenantId = SecurityUtils.getTenantId();
        if (tenantId == null) {
            throw new BusinessException("Non authentifie", 401);
        }
        return tenantId;
    }

    private UUID requireUtilisateurId() {
        var user = SecurityUtils.getCurrentUser();
        if (user == null) {
            throw new BusinessException("Non authentifie", 401);
        }
        return user.getUtilisateurId();
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
