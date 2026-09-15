package com.example.Bakend.dto.direction;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Request pour la création d'une catégorie (POST /api/direction/categories).
 * V15 : les prix sont dans grille_tarifaire, plus ici.
 * classeCode + seuilsMl obligatoires à la création.
 */
public record CategorieCreateRequest(
        @NotBlank(message = "Le libellé est obligatoire")
        @Size(max = 255, message = "Le libellé ne doit pas dépasser 255 caractères")
        String libelle,

        @NotBlank(message = "Le code de classe est obligatoire")
        @Size(max = 20, message = "Le code de classe ne doit pas dépasser 20 caractères")
        String classeCode,

        @Size(max = 2000, message = "La justification ne doit pas dépasser 2000 caractères")
        String justification,

        @NotNull(message = "Les seuils ML sont obligatoires à la création")
        SeuilsMl seuilsMl,

        Boolean habiliteRequis
) {
}
