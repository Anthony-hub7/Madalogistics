package com.example.Bakend.maps;

import com.example.Bakend.maps.HaversineUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service de routage OSRM — appelé par les contrôleurs (Routing, Tournee).
 * Gère fallback Haversine si OSRM indisponible.
 */
@Slf4j
@Service
public class RoutingService {

    private final MapsHttpClient httpClient;
    private final MapsProperties props;
    private final MapsManualCache<String, String> routeCache;

    public RoutingService(MapsHttpClient httpClient, MapsProperties props,
                          MapsManualCache<String, String> routeCache) {
        this.httpClient = httpClient;
        this.props = props;
        this.routeCache = routeCache;
    }

    /**
     * Appelle OSRM /route et retourne le JSON brut (GeoJSON si geometries=geojson).
     * Fallback Haversine si échec.
     */
    public String getRoute(List<double[]> points, String profile) {
        String coords = RoutingController.pointsToCoords(points);
        String uri = props.getRoutingUrl()
                + "/route/v1/" + profile + "/" + coords
                + "?overview=full&geometries=geojson&steps=true";

        try {
            String body = httpClient.fetchString(uri, props.getUserAgent());
            return body;
        } catch (Exception e) {
            log.error("Routing failed: {}", e.getMessage());
            return haversineRouteFallback(points);
        }
    }

    private String haversineRouteFallback(List<double[]> points) {
        log.warn("Using Haversine fallback for route");
        double totalDistance = 0;
        double totalDuration = 0;

        for (int i = 1; i < points.size(); i++) {
            double d = HaversineUtil.distance(
                    points.get(i - 1)[0], points.get(i - 1)[1],
                    points.get(i)[0], points.get(i)[1]);
            totalDistance += d;
            totalDuration += d / 40.0 * 3600;
        }

        long distMeters = Math.round(totalDistance * 1000.0);
        long durSeconds = Math.round(totalDuration);

        return "{\"fallback\":true,\"code\":\"Ok\",\"routes\":[{\"distance\":"
                + distMeters + ",\"duration\":" + durSeconds + "}]}";
    }
}
