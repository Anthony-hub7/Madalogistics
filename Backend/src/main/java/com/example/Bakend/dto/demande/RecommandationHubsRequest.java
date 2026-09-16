package com.example.Bakend.dto.demande;

import jakarta.validation.constraints.NotNull;

/**
 * Requête de recommandation de hubs intra-tenant.
 * Les coordonnées collecte/livraison servent au calcul de proximité et de tarif.
 */
public record RecommandationHubsRequest(
        @NotNull Double latitudeCollecte,
        @NotNull Double longitudeCollecte,
        @NotNull Double latitudeLivraison,
        @NotNull Double longitudeLivraison,
        boolean assurance,
        boolean express
) {
}
