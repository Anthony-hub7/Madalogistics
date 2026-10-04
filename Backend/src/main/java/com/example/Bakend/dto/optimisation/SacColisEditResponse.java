package com.example.Bakend.dto.optimisation;

import java.util.UUID;

/**
 * Resultat d'une edition de colis d'un sac : etat recalcule apres modification.
 */
public record SacColisEditResponse(
    UUID sacId,
    String statut,
    int nbColis,
    double poidsKg,
    double volumeM3,
    double tauxRemplissage,
    String categorieDominante,
    int demandesModifiees
) {}
