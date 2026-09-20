package com.example.Bakend.optimisation.vrp;

import java.util.List;

/**
 * Résultat du solveur VRP. Une liste de tournées, une par véhicule utilisé.
 * Le solveur ne persiste rien — la persistance (Tournee, EtapeLivraison, OptimisationRun)
 * sera faite par l'appelant (Service couches supérieures) en utilisant ces résultats.
 */
public record VrpSolution(
        List<VehicleRoute> routes,
        long solveTimeMs
) {
    /** Retourne vrai si la solution est vide (aucune route). */
    public boolean isEmpty() {
        return routes == null || routes.isEmpty();
    }

    /** Nombre total de points visités toutes routes confondues. */
    public int totalPointsServed() {
        if (routes == null) return 0;
        return routes.stream().mapToInt(VehicleRoute::nodeCount).sum();
    }
}
