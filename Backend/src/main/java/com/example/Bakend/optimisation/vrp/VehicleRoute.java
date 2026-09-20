package com.example.Bakend.optimisation.vrp;

import java.util.List;

/**
 * Tournée d'un véhicule : séquence ordonnée de points + heure d'arrivée estimée.
 * departureTimeSec = heure de départ du dépôt (peut être > 0 si fenêtre décalée).
 */
public record VehicleRoute(
        int vehicleIndex,
        List<Integer> nodeIndices,
        List<Long> arrivalTimesSec,
        long departureTimeSec
) {
    public int nodeCount() {
        return nodeIndices == null ? 0 : nodeIndices.size();
    }

    public boolean isEmpty() {
        return nodeIndices == null || nodeIndices.isEmpty();
    }
}
