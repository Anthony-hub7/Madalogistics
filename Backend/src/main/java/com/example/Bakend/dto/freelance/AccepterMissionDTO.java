package com.example.Bakend.dto.freelance;

import java.util.UUID;

/**
 * Resultat d'une acceptation freelance (first-accept : le premier qui accepte gagne).
 * {@code coordonneesCompletes} indique si les donnees GPS du sac permettent
 * de calculer la tournee VRP automatiquement apres l'attribution.
 */
public record AccepterMissionDTO(
        UUID sacId,
        UUID chauffeurId,
        UUID vehiculeId,
        String statut,
        boolean coordonneesCompletes
) {}
