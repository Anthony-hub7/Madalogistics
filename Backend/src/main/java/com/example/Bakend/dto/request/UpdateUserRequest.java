package com.example.Bakend.dto.request;

import com.example.Bakend.entity.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

/**
 * Requête de mise à jour partielle d'un utilisateur.
 * Tous les champs sont optionnels : seuls ceux fournis sont mis à jour.
 */
public record UpdateUserRequest(
        @Size(max = 255, message = "Le nom ne doit pas dépasser 255 caractères")
        String nom,

        @Email(message = "Format d'email invalide")
        @Size(max = 255, message = "L'email ne doit pas dépasser 255 caractères")
        String email,

        @Size(min = 8, message = "Le mot de passe doit contenir au moins 8 caractères")
        String password,

        Role role,

        Boolean habiliteValeur
) {
}