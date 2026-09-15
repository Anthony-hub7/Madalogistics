package com.example.Bakend.controller.direction;

import com.example.Bakend.dto.direction.CategorieCreateRequest;
import com.example.Bakend.dto.direction.CategorieDirectionRequest;
import com.example.Bakend.dto.direction.CategorieDirectionResponse;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.security.SecurityUtils;
import com.example.Bakend.service.direction.CategorieDirectionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * API Direction pour le referentiel dynamique de categories (V12).
 *
 * POST   /api/direction/categories        — creer (libelle + classeCode + seuilsMl)
 * GET    /api/direction/categories        — lister
 * GET    /api/direction/categories/{id}   — detail
 * PUT    /api/direction/categories/{id}   — modifier (libelle + justification + seuilsMl + habiliteRequis)
 * PATCH  /api/direction/categories/{id}/actif — toggle soft-delete
 */
@RestController
@RequestMapping("/api/direction/categories")
@PreAuthorize("hasRole('DIRECTION')")
public class CategorieDirectionController {

    private final CategorieDirectionService categorieDirectionService;

    public CategorieDirectionController(CategorieDirectionService categorieDirectionService) {
        this.categorieDirectionService = categorieDirectionService;
    }

    /**
     * Creer une nouvelle categorie.
     * classeCode + seuilsMl obligatoires.
     */
    @PostMapping
    public ResponseEntity<CategorieDirectionResponse> creer(
            @Valid @RequestBody CategorieCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new CategorieDirectionResponse(
                        categorieDirectionService.creer(requireTenantId(), request)));
    }

    /**
     * Lister toutes les categories du tenant.
     */
    @GetMapping
    public List<CategorieDirectionResponse> lister() {
        return categorieDirectionService.lister(requireTenantId()).stream()
                .map(CategorieDirectionResponse::new)
                .toList();
    }

    /**
     * Detail d'une categorie.
     */
    @GetMapping("/{categorieId}")
    public CategorieDirectionResponse obtenir(@PathVariable UUID categorieId) {
        return new CategorieDirectionResponse(
                categorieDirectionService.obtenir(requireTenantId(), categorieId));
    }

    /**
     * Modifier libelle + justification + seuilsMl + habiliteRequis.
     * classeCode est immuable.
     */
    @PutMapping("/{categorieId}")
    public CategorieDirectionResponse modifier(
            @PathVariable UUID categorieId,
            @Valid @RequestBody CategorieDirectionRequest request) {
        return new CategorieDirectionResponse(
                categorieDirectionService.modifier(requireTenantId(), categorieId, request));
    }

    /**
     * Toggle soft-delete (actif/inactif).
     */
    @PatchMapping("/{categorieId}/actif")
    public CategorieDirectionResponse toggleActif(@PathVariable UUID categorieId) {
        return new CategorieDirectionResponse(
                categorieDirectionService.toggleActif(requireTenantId(), categorieId));
    }

    private UUID requireTenantId() {
        UUID tenantId = SecurityUtils.getTenantId();
        if (tenantId == null) {
            throw new BusinessException(
                    "Contexte tenant manquant : l'operation requiert un utilisateur DIRECTION rattache a une agence",
                    403);
        }
        return tenantId;
    }
}
