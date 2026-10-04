package com.example.Bakend.controller.direction;

import com.example.Bakend.dto.direction.GainsResponse;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.security.SecurityUtils;
import com.example.Bakend.service.direction.GainsService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Dashboard « Gains de l'optimisation » (Direction) — baseline vs optimise.
 *
 * Toutes les constantes de calcul sont configurables via query params (defauts README).
 */
@RestController
@RequestMapping("/api/direction/gains")
@PreAuthorize("hasRole('DIRECTION')")
public class GainsDirectionController {

    private final GainsService gainsService;

    public GainsDirectionController(GainsService gainsService) {
        this.gainsService = gainsService;
    }

    @GetMapping
    public GainsResponse comparer(
            @RequestParam(required = false) UUID hubId,
            @RequestParam(defaultValue = "40") double vitesseKmh,
            @RequestParam(defaultValue = "8") double consoL100km,
            @RequestParam(defaultValue = "5900") double prixFuelArParL,
            @RequestParam(defaultValue = "2.68") double facteurCo2KgParL,
            @RequestParam(defaultValue = "0") double coutHoraireAr) {
        GainsResponse.Hypotheses hypotheses = new GainsResponse.Hypotheses(
                vitesseKmh, consoL100km, prixFuelArParL, facteurCo2KgParL, coutHoraireAr);
        return gainsService.calculer(requireTenantId(), hubId, hypotheses);
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
