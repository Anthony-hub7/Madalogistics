package com.example.Bakend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Changement du mot de passe de l'utilisateur connecte.
 * L'ancien mot de passe est verifie (BCrypt) avant ecrasement.
 */
public record ChangerMotDePasseRequest(
        @NotBlank(message = "L'ancien mot de passe est obligatoire")
        String ancienMotDePasse,
        @NotBlank(message = "Le nouveau mot de passe est obligatoire")
        @Size(min = 8, max = 128, message = "Le nouveau mot de passe doit contenir au moins 8 caracteres")
        String nouveauMotDePasse) {}
