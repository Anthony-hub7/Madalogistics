package com.example.Bakend.dto.demande;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Requête de prédiction de classe pour un colis.
 * Fragilité (0-10) et niveau de valeur (FAIBLE/MOYENNE/ELEVEE) remplacent l'ancien Ariary.
 */
public record PredireClasseRequest(
        @NotNull(message = "Le poids est obligatoire")
        BigDecimal poidsKg,

        @NotNull(message = "Le volume est obligatoire")
        BigDecimal volumeM3,

        boolean express,

        @Min(0) @Max(10)
        Integer fragilite,

        String niveauValeur
) {
}
