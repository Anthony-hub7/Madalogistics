package com.example.Bakend.dto.response;

import java.util.UUID;

/**
 * Réponse d'authentification / inscription : token JWT + informations utilisateur.
 * Le rôle n'est jamais exposé — seul le chemin de redirection est renvoyé.
 */
public record AuthResponse(
        String token,
        UUID utilisateurId,
        UUID tenantId,
        String email,
        String fullName,
        String redirectPath
) {
}