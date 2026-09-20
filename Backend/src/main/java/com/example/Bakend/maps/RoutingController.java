package com.example.Bakend.maps;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/maps")
@RequiredArgsConstructor
public class RoutingController {

    private final MapsProperties props;
    private final MapsHttpClient httpClient;
    private final MapsManualCache<String, String> routeCache;
    private final RoutingService routingService;

    @Data
    public static class RouteRequest {
        private List<double[]> points;
        private String profile = "driving";
    }

    @PostMapping(value = "/route", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> route(@RequestBody String rawBody) {
        List<double[]> points = MapsJsonParser.parsePoints(rawBody);
        if (points.size() < 2) {
            return ResponseEntity.badRequest().contentType(MediaType.APPLICATION_JSON)
                    .body("{\"error\":\"Au moins 2 points requis\"}");
        }

        String profile = extractProfile(rawBody);
        String cacheKey = hashPoints(points) + ":" + profile;
        String cached = routeCache.getIfPresent(cacheKey);
        if (cached != null) {
            return ResponseEntity.ok(cached);
        }

        String body = routingService.getRoute(points, profile);
        routeCache.put(cacheKey, body);
        return ResponseEntity.ok(body);
    }

    @PostMapping(value = "/distance-matrix", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> distanceMatrix(@RequestBody String rawBody) {
        List<double[]> points = MapsJsonParser.parsePoints(rawBody);
        if (points.size() < 2) {
            return ResponseEntity.badRequest().contentType(MediaType.APPLICATION_JSON)
                    .body("{\"error\":\"Au moins 2 points requis\"}");
        }

        String profile = extractProfile(rawBody);
        String cacheKey = "dm:" + hashPoints(points) + ":" + profile;
        String cached = routeCache.getIfPresent(cacheKey);
        if (cached != null) {
            return ResponseEntity.ok(cached);
        }

        try {
            String coords = pointsToCoords(points);
            String uri = props.getRoutingUrl()
                    + "/table/v1/" + profile + "/" + coords
                    + "?annotations=distance,duration";

            String body = httpClient.fetchString(uri, props.getUserAgent());
            routeCache.put(cacheKey, body);
            return ResponseEntity.ok(body);

        } catch (Exception e) {
            log.error("Distance matrix failed: {}", e.getMessage());
            return haversineMatrixFallback(points, profile);
        }
    }

    // --- Fallback Haversine matrice (conservé inline car spécifique au endpoint) ---

    private ResponseEntity<String> haversineMatrixFallback(List<double[]> points, String profile) {
        log.warn("Using Haversine fallback for distance matrix");
        int n = points.size();

        StringBuilder dist = new StringBuilder("[");
        StringBuilder dur = new StringBuilder("[");

        for (int i = 0; i < n; i++) {
            if (i > 0) { dist.append(","); dur.append(","); }
            dist.append("["); dur.append("[");
            for (int j = 0; j < n; j++) {
                if (j > 0) { dist.append(","); dur.append(","); }
                if (i == j) {
                    dist.append("0"); dur.append("0");
                } else {
                    double d = HaversineUtil.distance(
                            points.get(i)[0], points.get(i)[1],
                            points.get(j)[0], points.get(j)[1]);
                    dist.append(Math.round(d * 1000.0));
                    dur.append(Math.round(d / 40.0 * 3600));
                }
            }
            dist.append("]"); dur.append("]");
        }
        dist.append("]"); dur.append("]");

        StringBuilder waypoints = new StringBuilder("[");
        for (int i = 0; i < n; i++) {
            if (i > 0) waypoints.append(",");
            waypoints.append("{\"location\":[").append(points.get(i)[1])
                     .append(",").append(points.get(i)[0]).append("]}");
        }
        waypoints.append("]");

        String json = "{\"fallback\":true,\"code\":\"Ok\",\"data\":{\"distances\":"
                + dist + ",\"durations\":" + dur
                + "},\"waypoints\":" + waypoints + "}";

        return ResponseEntity.ok(json);
    }

    // --- Helpers ---

    static String pointsToCoords(List<double[]> points) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < points.size(); i++) {
            if (i > 0) sb.append(";");
            sb.append(points.get(i)[1]).append(",").append(points.get(i)[0]);
        }
        return sb.toString();
    }

    static String hashPoints(List<double[]> points) {
        try {
            StringBuilder sb = new StringBuilder();
            for (double[] p : points) {
                sb.append(String.format("%.6f,%.6f;", p[0], p[1]));
            }
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(sb.toString().getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : digest) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception e) {
            return String.valueOf(points.hashCode());
        }
    }

    private String extractProfile(String rawBody) {
        if (rawBody != null && rawBody.contains("\"profile\"")) {
            int idx = rawBody.indexOf("\"profile\"");
            int start = rawBody.indexOf('"', idx + 9);
            if (start >= 0) {
                int end = rawBody.indexOf('"', start + 1);
                if (end > start) {
                    return rawBody.substring(start + 1, end);
                }
            }
        }
        return "driving";
    }
}
