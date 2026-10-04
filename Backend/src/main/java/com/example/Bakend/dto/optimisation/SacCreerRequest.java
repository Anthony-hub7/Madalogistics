package com.example.Bakend.dto.optimisation;

import java.util.List;
import java.util.UUID;

/**
 * Creation manuelle d'un sac a partir de colis libres d'un hub.
 *
 * Aucun OptimisationRun ni donnee d'optimisation : le gestionnaire choisit
 * librement les colis du hub. Le backend re-verifie que chaque colis est
 * bien du hub annonce, sans sac et en etat EN_ATTENTE.
 */
public record SacCreerRequest(UUID hubId, List<UUID> colisIds) {

    public SacCreerRequest {
        colisIds = colisIds == null ? List.of() : List.copyOf(colisIds);
    }
}
