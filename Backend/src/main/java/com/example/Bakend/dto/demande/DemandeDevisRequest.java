package com.example.Bakend.dto.demande;

import java.math.BigDecimal;
import java.util.List;

/**
 * Requête de calcul de devis (sans créer de commande).
 * V14 : colis individuels avec catégorie + coords pour calcul distance.
 */
public record DemandeDevisRequest(
        BigDecimal poidsTotalKg,
        BigDecimal volumeTotalM3,
        boolean assurance,
        boolean express,

        // V14 : colis individuels avec catégorie
        List<DevisColisRequest> colis,

        // V14 : coordonnées pour calcul distance
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
