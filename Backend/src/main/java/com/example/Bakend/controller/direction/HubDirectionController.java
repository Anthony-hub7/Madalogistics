package com.example.Bakend.controller.direction;

import com.example.Bakend.dto.direction.HubRequest;
import com.example.Bakend.dto.direction.HubResponse;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.security.SecurityUtils;
import com.example.Bakend.service.hub.HubService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/direction/hubs")
@PreAuthorize("hasRole('DIRECTION')")
public class HubDirectionController {

    private final HubService hubService;

    public HubDirectionController(HubService hubService) {
        this.hubService = hubService;
    }

    @GetMapping
    public List<HubResponse> lister() {
        return hubService.lister(requireTenantId()).stream()
                .map(HubResponse::new)
                .toList();
    }

    @GetMapping("/{hubId}")
    public HubResponse obtenir(@PathVariable UUID hubId) {
        return new HubResponse(hubService.obtenir(requireTenantId(), hubId));
    }

    @PostMapping
    public HubResponse creer(@Valid @RequestBody HubRequest request) {
        return new HubResponse(hubService.creer(requireTenantId(), request));
    }

    @PutMapping("/{hubId}")
    public HubResponse modifier(@PathVariable UUID hubId, @Valid @RequestBody HubRequest request) {
        return new HubResponse(hubService.modifier(requireTenantId(), hubId, request));
    }

    @DeleteMapping("/{hubId}")
    public ResponseEntity<Map<String, String>> supprimer(@PathVariable UUID hubId) {
        hubService.supprimer(requireTenantId(), hubId);
        return ResponseEntity.ok(Map.of("message", "Hub supprimé avec succès"));
    }

    @PatchMapping("/{hubId}/actif")
    public HubResponse toggleActif(@PathVariable UUID hubId) {
        return new HubResponse(hubService.toggleActif(requireTenantId(), hubId));
    }

    private UUID requireTenantId() {
        UUID tenantId = SecurityUtils.getTenantId();
        if (tenantId == null) {
            throw new BusinessException(
                    "Contexte tenant manquant : l'opération requiert un utilisateur DIRECTION rattaché à une agence",
                    403);
        }
        return tenantId;
    }
}
