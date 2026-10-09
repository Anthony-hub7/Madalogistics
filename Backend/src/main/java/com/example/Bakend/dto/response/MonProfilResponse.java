package com.example.Bakend.dto.response;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Profil de l'utilisateur connecte (lecture seule, endpoint /api/auth/me).
 * Les champs metier (chauffeur / client) sont null pour les autres roles.
 */
public record MonProfilResponse(
        UUID utilisateurId,
        String nom,
        String email,
        String role,
        UUID tenantId,
        String tenantNom,
        String cin,
        LocalDate dateNaissance,
        String sexe,
        String adresse,
        /** Chauffeur uniquement. */
        String telephone,
        String typeChauffeur,
        String statutDossier,
        String immatriculation,
        /** Client final uniquement. */
        String clientNom) {}
