package com.example.Bakend.optimisation.vrp;

import java.util.List;

/**
 * Entrée du solveur VRP. Matrice temps en secondes (pas de distances,
 * pas de calcul de route — reçu du DistanceProvider ou d'un OSRM matrix).
 * Chaque point a une fenêtre horaire [startSec, endSec] relative au jour de départ.
 * Le dépôt a ses propres fenêtres (ex. horaires d'ouverture du hub).
 */
public record VrpRequest(
        long[][] timeMatrixSec,
        int vehicleCount,
        int depotIndex,
        long[][] timeWindows,
        VrpMode mode,
        Integer timeLimitSeconds
) {
    public VrpRequest {
        if (timeMatrixSec == null || timeMatrixSec.length == 0) {
            throw new IllegalArgumentException("timeMatrixSec ne peut pas être vide");
        }
        int n = timeMatrixSec.length;
        if (vehicleCount < 1) {
            throw new IllegalArgumentException("vehicleCount doit être ≥ 1");
        }
        if (depotIndex < 0 || depotIndex >= n) {
            throw new IllegalArgumentException("depotIndex hors bornes : " + depotIndex);
        }
        if (timeWindows != null && timeWindows.length != n) {
            throw new IllegalArgumentException(
                    "timeWindows.length (" + timeWindows.length + ") ≠ nodes (" + n + ")");
        }
        if (mode == VrpMode.MULTI_DEPOT_OPEN) {
            throw new UnsupportedOperationException(
                    "MULTI_DEPOT_OPEN n'est pas encore implémenté");
        }
    }

    /** Convenience : fenêtres nulles = tout le jour [0, Long.MAX_VALUE]. */
    public long[][] effectiveTimeWindows() {
        if (timeWindows != null) return timeWindows;
        int n = timeMatrixSec.length;
        long[][] full = new long[n][2];
        for (int i = 0; i < n; i++) {
            full[i][0] = 0;
            full[i][1] = Long.MAX_VALUE;
        }
        return full;
    }
}
