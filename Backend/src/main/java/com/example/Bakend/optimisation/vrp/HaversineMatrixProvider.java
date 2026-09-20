package com.example.Bakend.optimisation.vrp;

import com.example.Bakend.maps.HaversineUtil;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Matrice temps basée sur Haversine (vol d'oiseau).
 * Calcul local pur — aucun appel réseau.
 */
@Component
public class HaversineMatrixProvider implements VrpMatrixProvider {

    private static final int VITESSE_FALLBACK_KMH = 40;

    @Override
    public long[][] matriceTemps(List<GeoPoint> points) {
        int n = points.size();
        long[][] matrix = new long[n][n];

        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                double distKm = HaversineUtil.distance(
                        points.get(i).lat(), points.get(i).lon(),
                        points.get(j).lat(), points.get(j).lon());
                long timeSec = (long) ((distKm / VITESSE_FALLBACK_KMH) * 3600);
                matrix[i][j] = timeSec;
                matrix[j][i] = timeSec;
            }
        }
        return matrix;
    }
}
