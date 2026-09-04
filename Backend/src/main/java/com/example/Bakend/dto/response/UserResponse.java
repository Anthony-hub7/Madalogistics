package com.example.Bakend.dto.response;

import com.example.Bakend.entity.enums.Role;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Réponse de lecture d'un utilisateur (masque l'empreinte du mot de passe).
 */
public record UserResponse(
        UUID utilisateurId,
        UUID tenantId,
        String nom,
        String email,
        Role role,
        boolean habiliteValeur,
        LocalDateTime createdAt
) {
}