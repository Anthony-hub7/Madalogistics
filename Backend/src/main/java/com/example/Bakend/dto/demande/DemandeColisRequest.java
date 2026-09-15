package com.example.Bakend.dto.demande;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO pour un colis dans la création de demande.
 */
public record DemandeColisRequest(
        @NotNull(message = "Le poids est obligatoire")
        @Positive(message = "Le poids doit être supérieur à 0")
        BigDecimal poidsKg,

        @NotNull(message = "Le volume est obligatoire")
        @Positive(message = "Le volume doit être supérieur à 0")
        BigDecimal volumeM3,

        UUID categorieId
) {
}
