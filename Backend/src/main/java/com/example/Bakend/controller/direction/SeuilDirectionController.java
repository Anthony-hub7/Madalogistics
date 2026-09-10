package com.example.Bakend.controller.direction;

import com.example.Bakend.dto.direction.SeuilRequest;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.security.SecurityUtils;
import com.example.Bakend.service.tarification.SeuilRemplissageService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/direction/seuil")
@PreAuthorize("hasRole('DIRECTION')")
public class SeuilDirectionController {

    private final SeuilRemplissageService seuilRemplissageService;

    public SeuilDirectionController(SeuilRemplissageService seuilRemplissageService) {
        this.seuilRemplissageService = seuilRemplissageService;
    }

    @GetMapping
    public Map<String, Object> obtenir() {
        BigDecimal seuil = seuilRemplissageService.obtenir(requireTenantId());
        return Map.of("seuil", seuil);
    }

    @PutMapping
    public Map<String, Object> mettreAJour(@Valid @RequestBody SeuilRequest request) {
        BigDecimal seuil = seuilRemplissageService.mettreAJour(requireTenantId(), request);
        return Map.of("seuil", seuil, "message", "Seuil mis à jour avec succès");
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
