package com.example.Bakend.dto.demande;

import java.math.BigDecimal;
import java.util.List;

/**
 * Reponse de devis (V14) : montant total + distance + decomposition par categorie.
 */
public record DemandeDevisResponse(
        BigDecimal montantEstime,
        String grilleUtilisee,
        BigDecimal prixParKg,
        BigDecimal prixParM3,
        BigDecimal prixMinimum,

        // V14
        BigDecimal distanceKm,
        List<DetailCategorie> detailParCategorie,
        BigDecimal minimumApplique
) {

    /**
     * Ligne de detail tarifaire pour une categorie de colis.
     */
    public record DetailCategorie(
            String categorieLibelle,
            String classeCode,
            int nbColis,
            BigDecimal poidsTotalKg,
            BigDecimal volumeTotalM3,
            BigDecimal partPoidsKg,
            BigDecimal partVolumeM3,
            BigDecimal partCategorie
    ) {
    }
}
