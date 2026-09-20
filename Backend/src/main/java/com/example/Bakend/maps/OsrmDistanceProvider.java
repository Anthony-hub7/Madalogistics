package com.example.Bakend.maps;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Distance provider via OSRM /route (distance routière réelle).
 * Fallback Haversine si OSRM indisponible.
 * @Primary : injecté par défaut dans TarificationService et TrajetService.
 */
@Slf4j
@Primary
@Component
public class OsrmDistanceProvider implements DistanceProvider {

    private static final Pattern DISTANCE_PATTERN = Pattern.compile("\"distance\"\\s*:\\s*([\\d.]+)");
    private static final Pattern DURATION_PATTERN = Pattern.compile("\"duration\"\\s*:\\s*([\\d.]+)");

    private final MapsHttpClient httpClient;
    private final MapsProperties props;
    private final HaversineDistanceProvider fallback;

    public OsrmDistanceProvider(MapsHttpClient httpClient, MapsProperties props,
                                HaversineDistanceProvider fallback) {
        this.httpClient = httpClient;
        this.props = props;
        this.fallback = fallback;
    }

    @Override
    public BigDecimal calculerTourneeKm(double hubLat, double hubLon,
                                         double collLat, double collLon,
                                         double livLat, double livLon) {
        try {
            TrajetService.TrajetResult result = getTrajetComplet(hubLat, hubLon, collLat, collLon, livLat, livLon);
            return result.distanceKm();
        } catch (Exception e) {
            log.warn("OSRM distance échoué, fallback Haversine : {}", e.getMessage());
            return fallback.calculerTourneeKm(hubLat, hubLon, collLat, collLon, livLat, livLon);
        }
    }

    /**
     * Appel OSRM /route 3 segments : retourne distance (km) + durée (heures).
     */
    public TrajetService.TrajetResult getTrajetComplet(double hubLat, double hubLon,
                                                        double collLat, double collLon,
                                                        double livLat, double livLon) throws Exception {
        String coords = String.format("%.6f,%.6f;%.6f,%.6f;%.6f,%.6f;%.6f,%.6f",
                hubLon, hubLat, collLon, collLat, livLon, livLat, hubLon, hubLat);

        String uri = props.getRoutingUrl()
                + "/route/v1/driving/" + coords
                + "?overview=false";

        String body = httpClient.fetchString(uri, props.getUserAgent());

        double distanceMeters = parseValue(body, DISTANCE_PATTERN, "distance");
        double durationSeconds = parseValue(body, DURATION_PATTERN, "duration");

        BigDecimal distanceKm = BigDecimal.valueOf(distanceMeters / 1000.0)
                .setScale(2, RoundingMode.HALF_UP);
        double dureeHeures = durationSeconds / 3600.0;

        return new TrajetService.TrajetResult(distanceKm, dureeHeures, "OSRM");
    }

    private double parseValue(String json, Pattern pattern, String field) {
        Matcher m = pattern.matcher(json);
        if (!m.find()) {
            throw new RuntimeException("Champ '" + field + "' absent dans la réponse OSRM");
        }
        return Double.parseDouble(m.group(1));
    }
}
