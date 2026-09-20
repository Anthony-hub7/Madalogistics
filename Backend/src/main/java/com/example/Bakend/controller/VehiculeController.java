package com.example.Bakend.controller;

import com.example.Bakend.dto.request.VehiculeRequest;
import com.example.Bakend.dto.response.VehiculeDTO;
import com.example.Bakend.entity.Vehicule;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.security.SecurityUtils;
import com.example.Bakend.service.VehiculeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/vehicules")
@PreAuthorize("hasAnyRole('GESTIONNAIRE','DIRECTION')")
public class VehiculeController {

    private final VehiculeService vehiculeService;

    public VehiculeController(VehiculeService vehiculeService) {
        this.vehiculeService = vehiculeService;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<VehiculeDTO> lister(
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) UUID hubId) {
        UUID tenantId = requireTenantId();
        return vehiculeService.lister(tenantId, statut, hubId).stream()
                .map(VehiculeDTO::new)
                .toList();
    }

    @GetMapping("/{vehiculeId}")
    @Transactional(readOnly = true)
    public VehiculeDTO obtenir(@PathVariable UUID vehiculeId) {
        UUID tenantId = requireTenantId();
        return new VehiculeDTO(vehiculeService.obtenir(tenantId, vehiculeId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public VehiculeDTO creer(@Valid @RequestBody VehiculeRequest request) {
        UUID tenantId = requireTenantId();
        Vehicule vehicule = vehiculeService.creer(tenantId, request);
        return new VehiculeDTO(vehicule);
    }

    @PutMapping("/{vehiculeId}")
    public VehiculeDTO modifier(@PathVariable UUID vehiculeId,
                                @Valid @RequestBody VehiculeRequest request) {
        UUID tenantId = requireTenantId();
        Vehicule vehicule = vehiculeService.modifier(tenantId, vehiculeId, request);
        return new VehiculeDTO(vehicule);
    }

    @PatchMapping("/{vehiculeId}/statut")
    public ResponseEntity<Map<String, String>> changerStatut(
            @PathVariable UUID vehiculeId,
            @RequestBody Map<String, String> body) {
        UUID tenantId = requireTenantId();
        String nouveauStatut = body.get("statut");
        if (nouveauStatut == null || nouveauStatut.isBlank()) {
            throw new BusinessException("Le champ 'statut' est obligatoire", 400);
        }
        vehiculeService.changerStatut(tenantId, vehiculeId, nouveauStatut);
        return ResponseEntity.ok(Map.of("message", "Statut mis a jour avec succes"));
    }

    @DeleteMapping("/{vehiculeId}")
    public ResponseEntity<Map<String, String>> supprimer(@PathVariable UUID vehiculeId) {
        UUID tenantId = requireTenantId();
        vehiculeService.supprimer(tenantId, vehiculeId);
        return ResponseEntity.ok(Map.of("message", "Vehicule desactive (HORS_SERVICE)"));
    }

    private UUID requireTenantId() {
        UUID tenantId = SecurityUtils.getTenantId();
        if (tenantId == null) {
            throw new BusinessException("Contexte tenant manquant", 403);
        }
        return tenantId;
    }
}
