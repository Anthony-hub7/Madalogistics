package com.example.Bakend.dto.request;

import com.example.Bakend.entity.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Requête d'inscription d'un nouveau tenant (PME) et de son premier utilisateur.
 */
public record RegisterRequest(
        @NotBlank(message = "Le nom de l'entreprise est obligatoire")
        String companyName,

        @NotBlank(message = "Le nom complet est obligatoire")
        String fullName,

        @NotBlank(message = "L'email est obligatoire")
        @Email(message = "Format d'email invalide")
        String email,

        @NotBlank(message = "Le mot de passe est obligatoire")
        @Size(min = 8, message = "Le mot de passe doit contenir au moins 8 caractères")
        String password,

        String nomHub,
        Role role
) {
}