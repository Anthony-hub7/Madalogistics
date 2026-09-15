package com.example.Bakend.dto.direction;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Request pour la création d'une grille tarifaire (POST /api/direction/tarifs).
 * V15 : prix par catégorie + prix/km. categorieId nullable = repli global.
 */
public record GrilleTarifaireRequest(
        @NotBlank(message = "Le libellé est obligatoire")
        @Size(max = 255, message = "Le libellé ne doit pas dépasser 255 caractères")
        String libelle,

        BigDecimal prixParKg,

        BigDecimal prixParM3,

        BigDecimal prixParKm,

        BigDecimal prixMinimum,

        UUID categorieId
) {
}
