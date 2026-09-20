package com.example.Bakend.maps;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Service trajet : distance + durée via OSRM (réel), fallback Haversine.
 * Utilisé par DemandeService pour calculer delaiTransit et dateDepartCalculee.
 */
@Slf4j
@Service
public class TrajetService {

    private static final double VITESSE_FALLBACK_KMH = 40.0;
    private static final double ROUTE_FACTOR_HAVERSINE = 1.35;

    private final DistanceProvider distanceProvider;
    private final MapsManualCache<String, TrajetResult> cache;

    public TrajetService(DistanceProvider distanceProvider,
                         @Qualifier("trajetCache") MapsManualCache<String, TrajetResult> cache) {
        this.distanceProvider = distanceProvider;
        this.cache = cache;
    }

    /**
     * Résultat trajet structuré : distance routière + durée estimée + source.
     */
    public record TrajetResult(BigDecimal distanceKm, double dureeHeures, String source) {}

    /**
     * Calcul du trajet 3 segments : hub → collecte → livraison → hub.
     * Cache + fallback Haversine garanti.
     */
    public TrajetResult calculerTrajet(double hubLat, double hubLon,
                                        double collLat, double collLon,
                                        double livLat, double livLon) {
        String key = cacheKey(hubLat, hubLon, collLat, collLon, livLat, livLon);

        TrajetResult cached = cache.getIfPresent(key);
        if (cached != null) {
            return cached;
        }

        BigDecimal distanceKm;
        double dureeHeures;
        String source;

        if (distanceProvider instanceof OsrmDistanceProvider osrm) {
            try {
                TrajetResult osrmResult = osrm.getTrajetComplet(hubLat, hubLon, collLat, collLon, livLat, livLon);
                distanceKm = osrmResult.distanceKm();
                dureeHeures = osrmResult.dureeHeures();
                source = "OSRM";
            } catch (Exception e) {
                log.warn("OSRM trajet échoué, fallback Haversine : {}", e.getMessage());
                TrajetResult fallback = haversineFallback(hubLat, hubLon, collLat, collLon, livLat, livLon);
                distanceKm = fallback.distanceKm();
                dureeHeures = fallback.dureeHeures();
                source = "HAVERSINE_FALLBACK";
            }
        } else {
            TrajetResult fallback = haversineFallback(hubLat, hubLon, collLat, collLon, livLat, livLon);
            distanceKm = fallback.distanceKm();
            dureeHeures = fallback.dureeHeures();
            source = "HAVERSINE_FALLBACK";
        }

        TrajetResult result = new TrajetResult(distanceKm, dureeHeures, source);
        cache.put(key, result);
        return result;
    }

    private TrajetResult haversineFallback(double hubLat, double hubLon,
                                            double collLat, double collLon,
                                            double livLat, double livLon) {
        double d1 = HaversineUtil.distance(hubLat, hubLon, collLat, collLon);
        double d2 = HaversineUtil.distance(collLat, collLon, livLat, livLon);
        double d3 = HaversineUtil.distance(livLat, livLon, hubLat, hubLon);

        double totalKm = (d1 + d2 + d3) * ROUTE_FACTOR_HAVERSINE;
        double dureeHeures = totalKm / VITESSE_FALLBACK_KMH;

        return new TrajetResult(
                BigDecimal.valueOf(totalKm).setScale(2, RoundingMode.HALF_UP),
                dureeHeures,
                "HAVERSINE_FALLBACK");
    }

    private String cacheKey(double hubLat, double hubLon,
                            double collLat, double collLon,
                            double livLat, double livLon) {
        return String.format("%.6f,%.6f;%.6f,%.6f;%.6f,%.6f",
                hubLat, hubLon, collLat, collLon, livLat, livLon);
    }
}
