package com.example.Bakend.maps;

import java.math.BigDecimal;

/**
 * Provider abstrait pour le calcul de distance tournée.
 * Route 3 segments : hub → collecte → livraison → hub.
 * Implementations : Haversine (vol d'oiseau × facteur), Osrm (route réelle).
 */
public interface DistanceProvider {

    /**
     * Calcule la distance totale de tournée en km (3 segments × facteur circuity).
     *
     * @param hubLat     latitude du hub (point de départ/retour)
     * @param hubLon     longitude du hub
     * @param collLat    latitude du point de collecte
     * @param collLon    longitude du point de collecte
     * @param livLat     latitude du point de livraison
     * @param livLon     longitude du point de livraison
     * @return distance totale en km ((BigDecimal.ZERO si coords manquantes)
     */
    BigDecimal calculerTourneeKm(double hubLat, double hubLon,
                                  double collLat, double collLon,
                                  double livLat, double livLon);
}
