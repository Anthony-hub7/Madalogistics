package com.example.Bakend.dto.demande;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Score de recommandation d'un hub intra-tenant (Phase 1).
 * Formule : w1·proximite + w2·(1/tarif) + w3·fiabilite + w4·(1/delay)
 */
public record HubRecommandationResponse(
        UUID hubId,
        String nom,
        String adresse,
        Double latitude,
        Double longitude,

        BigDecimal score,
        boolean recommande,

        // Individuels (pour breakdown UI)
        BigDecimal proximiteZone,
        BigDecimal tarifEstime,
        BigDecimal fiabilite,
        BigDecimal delaiMoyenHeures,

        // Contexte
        long nbLivraisons,
        boolean donneesInsuffisantes,
        String messageInfo
) {
}
