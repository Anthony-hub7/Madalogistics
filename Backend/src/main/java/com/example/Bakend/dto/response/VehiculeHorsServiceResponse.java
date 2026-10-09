package com.example.Bakend.dto.response;

import java.util.UUID;

/**
 * Resultat de la mise hors service d'un vehicule sur incident (panne) :
 * les sacs actifs rattaches sont annules (annulation douce) avant le
 * basculement du vehicule en HORS_SERVICE.
 */
public record VehiculeHorsServiceResponse(
        UUID vehiculeId,
        String immatriculation,
        String statutVehicule,
        int sacsAnnules,
        int colisLiberes,
        int demandesRetournees,
        int tourneesTerminees) {}
