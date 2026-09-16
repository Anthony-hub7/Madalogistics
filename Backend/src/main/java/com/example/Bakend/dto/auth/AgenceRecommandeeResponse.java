package com.example.Bakend.dto.auth;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Agence recommandée pour un client (module A).
 * Score pondéré backend, pas de calcul frontend.
 */
public record AgenceRecommandeeResponse(
        UUID tenantId,
        String nom,
        String telephone,
        String adresse,

        BigDecimal score,
        boolean recommande,

        BigDecimal proximite,
        BigDecimal fiabilite,
        BigDecimal disponibilite,
        BigDecimal delaiEstimeHeures,

        UUID hubId,
        String hubNom,

        String messageInfo
) {
}
