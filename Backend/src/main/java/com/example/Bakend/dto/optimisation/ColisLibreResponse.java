package com.example.Bakend.dto.optimisation;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Colis libre (sans sac) affichable dans le panneau d'edition d'un sac.
 */
public record ColisLibreResponse(
    UUID colisId,
    double poidsKg,
    double volumeM3,
    String etat,
    UUID demandeId,
    String categorie,
    LocalDate dateSouhaitee,
    String clientNom
) {}
