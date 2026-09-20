package com.example.Bakend.optimisation.vrp;

import java.util.List;

/**
 * Provider de matrice temps NxN pour le VRP.
 * L'ordre des points est conservé : index 0 = dépôt, 1..N = clients.
 * Les implémentations gèrent Haversine (local) ou OSRM (HTTP).
 */
public interface VrpMatrixProvider {

    /**
     * Calcule la matrice temps en secondes entre N points.
     * OSRM retourne la duree reelle ; Haversine utilise une constante interne (40 km/h).
     *
     * @param points liste ordonnee (index 0 = depot)
     * @return matrice symetrique NxN en secondes
     */
    long[][] matriceTemps(List<GeoPoint> points);
}
