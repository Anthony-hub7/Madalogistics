package com.example.Bakend.dto.direction;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record GrilleTarifaireRequest(
        @NotBlank(message = "Le libellé est obligatoire")
        @Size(max = 255, message = "Le libellé ne doit pas dépasser 255 caractères")
        String libelle,

        BigDecimal prixParKg,

        BigDecimal prixParM3,

        BigDecimal prixMinimum
) {
}
