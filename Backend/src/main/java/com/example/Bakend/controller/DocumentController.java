package com.example.Bakend.controller;

import com.example.Bakend.entity.Chauffeur;
import com.example.Bakend.entity.PMECliente;
import com.example.Bakend.exception.ResourceNotFoundException;
import com.example.Bakend.repository.ChauffeurRepository;
import com.example.Bakend.repository.PMEClienteRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Contrôleur REST pour le téléchargement/preview des documents justificatifs.
 * Utilisé par l'admin SAAS pour vérifier les profils d'agences et de chauffeurs.
 */
@RestController
@RequestMapping("/api/admin/documents")
@PreAuthorize("hasRole('ADMIN_SAAS')")
public class DocumentController {

    private final PMEClienteRepository pmeClienteRepository;
    private final ChauffeurRepository chauffeurRepository;

    public DocumentController(PMEClienteRepository pmeClienteRepository,
                              ChauffeurRepository chauffeurRepository) {
        this.pmeClienteRepository = pmeClienteRepository;
        this.chauffeurRepository = chauffeurRepository;
    }

    // ── Documents agence ──

    @GetMapping("/agence/{tenantId}/kbis")
    public ResponseEntity<byte[]> downloadKbis(@PathVariable UUID tenantId) {
        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Agence introuvable : " + tenantId));
        byte[] data = tenant.getDocumentKbis();
        if (data == null || data.length == 0) {
            throw new ResourceNotFoundException("Document KBIS non fourni pour cette agence");
        }
        return buildResponse(data, "kbis_" + tenantId + ".pdf");
    }

    @GetMapping("/agence/{tenantId}/attestation")
    public ResponseEntity<byte[]> downloadAttestation(@PathVariable UUID tenantId) {
        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Agence introuvable : " + tenantId));
        byte[] data = tenant.getDocumentAttestation();
        if (data == null || data.length == 0) {
            throw new ResourceNotFoundException("Document attestation non fourni pour cette agence");
        }
        return buildResponse(data, "attestation_" + tenantId + ".pdf");
    }

    @GetMapping("/agence/{tenantId}/assurance")
    public ResponseEntity<byte[]> downloadAssurance(@PathVariable UUID tenantId) {
        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Agence introuvable : " + tenantId));
        byte[] data = tenant.getDocumentAssurance();
        if (data == null || data.length == 0) {
            throw new ResourceNotFoundException("Document assurance non fourni pour cette agence");
        }
        return buildResponse(data, "assurance_" + tenantId + ".pdf");
    }

    // ── Documents chauffeur ──

    @GetMapping("/chauffeur/{chauffeurId}/permis")
    public ResponseEntity<byte[]> downloadPermis(@PathVariable UUID chauffeurId) {
        Chauffeur chauffeur = chauffeurRepository.findById(chauffeurId)
                .orElseThrow(() -> new ResourceNotFoundException("Chauffeur introuvable : " + chauffeurId));
        byte[] data = chauffeur.getPermisScan();
        if (data == null || data.length == 0) {
            throw new ResourceNotFoundException("Scan du permis non fourni pour ce chauffeur");
        }
        return buildResponse(data, "permis_" + chauffeurId + ".pdf");
    }

    // ── Helpers ──

    private ResponseEntity<byte[]> buildResponse(byte[] data, String filename) {
        MediaType mediaType = detectMediaType(data);
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .body(data);
    }

    private MediaType detectMediaType(byte[] data) {
        if (data == null || data.length < 4) return MediaType.APPLICATION_OCTET_STREAM;

        // PDF: %PDF
        if (data[0] == 0x25 && data[1] == 0x50 && data[2] == 0x44 && data[3] == 0x46) {
            return MediaType.APPLICATION_PDF;
        }
        // JPEG: FF D8 FF
        if ((data[0] & 0xFF) == 0xFF && (data[1] & 0xFF) == 0xD8 && (data[2] & 0xFF) == 0xFF) {
            return MediaType.IMAGE_JPEG;
        }
        // PNG: 89 50 4E 47
        if ((data[0] & 0xFF) == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47) {
            return MediaType.IMAGE_PNG;
        }
        return MediaType.APPLICATION_OCTET_STREAM;
    }
}
