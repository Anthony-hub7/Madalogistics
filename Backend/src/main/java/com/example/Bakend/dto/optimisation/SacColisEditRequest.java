package com.example.Bakend.dto.optimisation;

import java.util.List;
import java.util.UUID;

/**
 * Edition des colis d'un sac (V1-c) : ajouter des colis libres et/ou en retirer.
 * Interdite des qu'une tournee est planifiee (cote service).
 */
public record SacColisEditRequest(
    List<UUID> ajouter,
    List<UUID> retirer
) {
    public SacColisEditRequest {
        if (ajouter == null) ajouter = List.of();
        if (retirer == null) retirer = List.of();
    }
}
