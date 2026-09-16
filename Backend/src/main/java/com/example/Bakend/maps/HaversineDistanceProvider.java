package com.example.Bakend.maps;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Distance provider basé sur la formule Haversine (vol d'oiseau).
 * Applique un facteur de circuity (×1.35) pour estimer la distance routière réelle.
 *
 * Route 3 segments :
 *   1. hub → collecte
 *   2. collecte → livraison
 *   3. livraison → hub
 *
 * Le facteur 1.35 est un standard transport terrestre pour :
 *   - détours liés au réseau routier (pas de vol d'oiseau)
 *   - relief (hauts plateaux, vallées)
 *   - routes sinueuses typiques de Madagascar
 *
 * Comparable à OSRM pour validation empirique (future branche OsrmDistanceProvider).
 */
@Component
public class HaversineDistanceProvider implements DistanceProvider {

    /**
     * Facteur de circuity : distance routière ≈ vol d'oiseau × 1.35.
     * Standard industriel pour réseaux routiers non optimisés (range 1.2-1.5).
     * À calibrer par validation avec OSRM en phase de测试.
     */
    private static final double ROUTE_FACTOR = 1.35;

    @Override
    public BigDecimal calculerTourneeKm(double hubLat, double hubLon,
                                         double collLat, double collLon,
                                         double livLat, double livLon) {
        double d1 = HaversineUtil.distance(hubLat, hubLon, collLat, collLon);
        double d2 = HaversineUtil.distance(collLat, collLon, livLat, livLon);
        double d3 = HaversineUtil.distance(livLat, livLon, hubLat, hubLon);

        double totalVolOiseau = d1 + d2 + d3;
        double totalRoutier = totalVolOiseau * ROUTE_FACTOR;

        return BigDecimal.valueOf(totalRoutier).setScale(2, RoundingMode.HALF_UP);
    }
}
