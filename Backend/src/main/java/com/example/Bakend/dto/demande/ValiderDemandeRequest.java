package com.example.Bakend.dto.demande;

/**
 * DTO pour la validation d'une commande (Phase 3bis).
 * modeLivraison nullable → défaut AGENCE côté service.
 */
public record ValiderDemandeRequest(
        String modeLivraison
) {
}
