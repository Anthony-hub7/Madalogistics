package com.example.Bakend.dto.demande;

import java.util.UUID;

/**
 * Réponse de prédiction de classe pour un colis.
 */
public record PredireClasseResponse(
        UUID categorieId,
        String classeCode,
        String libelle,
        String source
) {
}
