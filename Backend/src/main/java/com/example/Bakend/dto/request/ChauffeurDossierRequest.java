package com.example.Bakend.dto.request;

import jakarta.validation.constraints.*;

import java.util.UUID;

/**
 * Dossier d'inscription d'un chauffeur (multipart : JSON + permisScan).
 * Pattern identique à AgenceDossierRequest.
 */
public record ChauffeurDossierRequest(
        // ── Identité ──
        @NotBlank(message = "Le prenom est obligatoire")
        String prenom,

        @NotBlank(message = "Le nom est obligatoire")
        String nom,

        @NotBlank(message = "Le CIN est obligatoire")
        @Size(min = 12, max = 20, message = "Le CIN doit contenir entre 12 et 20 caracteres")
        String cin,

        String dateNaissance,

        String sexe,

        @NotBlank(message = "Le telephone est obligatoire")
        String telephone,

        @NotBlank(message = "L'email est obligatoire")
        @Email(message = "Format d'email invalide")
        String email,

        String adresse,

        @NotBlank(message = "Le mot de passe est obligatoire")
        @Size(min = 8, message = "Le mot de passe doit contenir au moins 8 caracteres")
        String motDePasse,

        // ── Permis ──
        @NotBlank(message = "Le numero de permis est obligatoire")
        String permisNumero,

        @NotBlank(message = "La categorie de permis est obligatoire")
        String permisCategorie,

        String permisCategories,

        @NotBlank(message = "La date d'expiration du permis est obligatoire")
        String permisExpiration,

        Integer experienceAnnees,

        // ── Type ──
        @NotBlank(message = "Le type de chauffeur est obligatoire")
        String typeChauffeur,

        // ── Agence cible (si rattaché) ──
        UUID agenceId,

        // ── Véhicule (si aVehiculeAssigne = true) ──
        Boolean aVehiculeAssigne,
        String immatriculation,
        String typeVehicule,
        String marqueModele,
        Integer annee,
        String ptacTonnes,
        String capaciteVolumeM3
) {
}
