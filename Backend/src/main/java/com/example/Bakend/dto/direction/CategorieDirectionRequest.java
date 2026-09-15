package com.example.Bakend.dto.direction;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request pour la modification d'une catégorie (PUT /api/direction/categories/{id}).
 * V15 : les prix sont dans grille_tarifaire, plus dans categorie_produit.
 * classeCode est immuable après création (histoire cohérente colis.categorie_id).
 */
public record CategorieDirectionRequest(
        @NotBlank(message = "Le libellé est obligatoire")
        @Size(max = 255, message = "Le libellé ne doit pas dépasser 255 caractères")
        String libelle,

        @Size(max = 2000, message = "La justification ne doit pas dépasser 2000 caractères")
        String justification,

        SeuilsMl seuilsMl,

        Boolean habiliteRequis
) {
}
