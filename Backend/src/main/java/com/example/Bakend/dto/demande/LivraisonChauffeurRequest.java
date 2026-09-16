package com.example.Bakend.dto.demande;

/**
 * Requête de marquage livré par le chauffeur (POD).
 */
public record LivraisonChauffeurRequest(
        String photoUrl,
        String signatureNom,
        String remarques
) {
}
