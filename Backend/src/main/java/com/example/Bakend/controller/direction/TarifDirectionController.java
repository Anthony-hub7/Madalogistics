package com.example.Bakend.controller.direction;

import com.example.Bakend.dto.direction.GrilleTarifaireRequest;
import com.example.Bakend.dto.direction.GrilleTarifaireResponse;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.security.SecurityUtils;
import com.example.Bakend.service.tarification.GrilleTarifaireService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/direction/tarifs")
@PreAuthorize("hasRole('DIRECTION')")
public class TarifDirectionController {

    private final GrilleTarifaireService grilleTarifaireService;

    public TarifDirectionController(GrilleTarifaireService grilleTarifaireService) {
        this.grilleTarifaireService = grilleTarifaireService;
    }

    @GetMapping
    public List<GrilleTarifaireResponse> lister() {
        return grilleTarifaireService.lister(requireTenantId()).stream()
                .map(GrilleTarifaireResponse::new)
                .toList();
    }

    @PostMapping
    public GrilleTarifaireResponse creer(@Valid @RequestBody GrilleTarifaireRequest request) {
        return new GrilleTarifaireResponse(grilleTarifaireService.creer(requireTenantId(), request));
    }

    @PutMapping("/{grilleId}")
    public GrilleTarifaireResponse modifier(@PathVariable UUID grilleId,
                                             @Valid @RequestBody GrilleTarifaireRequest request) {
        return new GrilleTarifaireResponse(grilleTarifaireService.modifier(requireTenantId(), grilleId, request));
    }

    @DeleteMapping("/{grilleId}")
    public ResponseEntity<Map<String, String>> supprimer(@PathVariable UUID grilleId) {
        grilleTarifaireService.supprimer(requireTenantId(), grilleId);
        return ResponseEntity.ok(Map.of("message", "Grille tarifaire supprimée avec succès"));
    }

    @PatchMapping("/{grilleId}/actif")
    public GrilleTarifaireResponse toggleActif(@PathVariable UUID grilleId) {
        return new GrilleTarifaireResponse(grilleTarifaireService.toggleActif(requireTenantId(), grilleId));
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
