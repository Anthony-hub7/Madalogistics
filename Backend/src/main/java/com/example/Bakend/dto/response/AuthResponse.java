package com.example.Bakend.dto.response;

import java.util.UUID;

/**
 * Réponse d'authentification / inscription : token JWT + informations utilisateur.
 * Le rôle n'est jamais exposé — seul le chemin de redirection est renvoyé.
 * Champs optionnels : statutDossier, motifRefus, typeChauffeur, agenceNom pour les chauffeurs.
 */
public record AuthResponse(
        String token,
        UUID utilisateurId,
        UUID tenantId,
        String email,
        String fullName,
        String redirectPath,
        String statutDossier,
        String motifRefus,
        String typeChauffeur,
        String agenceNom
) {
    /**
     * Constructeur compat pour les cas non-chauffeur (pas de statut dossier).
     */
    public AuthResponse(String token, UUID utilisateurId, UUID tenantId,
                        String email, String fullName, String redirectPath) {
        this(token, utilisateurId, tenantId, email, fullName, redirectPath, null, null, null, null);
    }
}