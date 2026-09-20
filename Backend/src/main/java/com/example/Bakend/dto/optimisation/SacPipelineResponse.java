package com.example.Bakend.dto.optimisation;

import java.util.UUID;

/**
 * Pipeline : resume d'un sac pour le dashboard optimisation.
 */
public record SacPipelineResponse(
        UUID sacId,
        UUID hubId,
        String hubNom,
        String statut,
        String categorieDominante,
        int nbColis,
        double poidsKg,
        double volumeM3,
        double tauxRemplissage,
        UUID chauffeurId,
        String chauffeurNom,
        UUID vehiculeId,
        String immatriculation,
        boolean hasTournee,
        UUID tourneeId,
        String dateDepartPlafond
) {}
