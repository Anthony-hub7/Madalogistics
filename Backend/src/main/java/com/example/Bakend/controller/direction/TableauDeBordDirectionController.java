package com.example.Bakend.controller.direction;

import com.example.Bakend.dto.direction.TableauDeBordDirectionResponse;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.security.SecurityUtils;
import com.example.Bakend.service.direction.TableauDeBordDirectionService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Dashboard « Vue d'ensemble » (Direction).
 *
 * Un seul appel : activite (commandes/sacs/tournees), flotte + incidents,
 * tarification + facturation, equipe — resume de l'activite du responsable
 * logistique. Aucune simulation VRP (cf. /api/direction/gains).
 */
@RestController
@RequestMapping("/api/direction/tableau-de-bord")
@PreAuthorize("hasRole('DIRECTION')")
public class TableauDeBordDirectionController {

    private final TableauDeBordDirectionService tableauDeBordDirectionService;

    public TableauDeBordDirectionController(TableauDeBordDirectionService tableauDeBordDirectionService) {
        this.tableauDeBordDirectionService = tableauDeBordDirectionService;
    }

    @GetMapping
    public TableauDeBordDirectionResponse obtenir() {
        return tableauDeBordDirectionService.construire(requireTenantId());
    }

    private UUID requireTenantId() {
        UUID tenantId = SecurityUtils.getTenantId();
        if (tenantId == null) {
            throw new BusinessException(
                    "Contexte tenant manquant : l'operation requiert un utilisateur DIRECTION rattaché a une agence",
                    403);
        }
        return tenantId;
    }
}
