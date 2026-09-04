package com.example.Bakend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Dossier d'inscription d'une agence de transport.
 * Les documents (kbis, attestation, assurance) sont envoyés en multipart.
 */
public record AgenceDossierRequest(
        @NotBlank(message = "La raison sociale est obligatoire")
        String raisonSociale,

        @NotBlank(message = "Le NIF est obligatoire")
        String nif,

        String stat,

        @NotBlank(message = "L'email est obligatoire")
        @Email(message = "Format d'email invalide")
        String email,

        @NotBlank(message = "Le téléphone est obligatoire")
        String telephone,

        @NotBlank(message = "L'adresse est obligatoire")
        String adresse,

        String site
) {
}
