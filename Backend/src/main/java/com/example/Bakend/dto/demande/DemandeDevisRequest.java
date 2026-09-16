package com.example.Bakend.dto.demande;

import java.math.BigDecimal;
import java.util.List;

/**
 * Requête de calcul de devis (sans créer de commande).
 * V16 : hubId pour calcul distance tournée 3 segments (hub→collecte→livraison→hub).
 */
public record DemandeDevisRequest(
        java.util.UUID hubId,
        BigDecimal poidsTotalKg,
        BigDecimal volumeTotalM3,
        boolean assurance,
        boolean express,

        List<DevisColisRequest> colis,

        Double latitudeCollecte,
        Double longitudeCollecte,
        Double latitudeLivraison,
        Double longitudeLivraison
) {

    /**
     * Un colis du devis avec sa catégorie.
     */
    public record DevisColisRequest(
            BigDecimal poidsKg,
            BigDecimal volumeM3,
            java.util.UUID categorieId
    ) {
    }
}
