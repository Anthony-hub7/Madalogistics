package com.example.Bakend.maps;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Slf4j
@RestController
@RequestMapping("/api/maps")
@RequiredArgsConstructor
public class GeocodingController {

    private final MapsProperties props;
    private final MapsHttpClient httpClient;
    private final MapsManualCache<String, String> geoCache;

    @GetMapping(value = "/geocode", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> geocode(
            @RequestParam String q,
            @RequestParam(defaultValue = "5") int limit,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lon) {

        String cacheKey = "geocode:" + q.toLowerCase().trim() + ":" + limit + ":" + lat + ":" + lon;
        String cached = geoCache.getIfPresent(cacheKey);
        if (cached != null) {
            return ResponseEntity.ok(cached);
        }

        try {
            String encodedQ = URLEncoder.encode(q, StandardCharsets.UTF_8);
            StringBuilder uri = new StringBuilder(props.getGeocodeUrl())
                    .append("/search?q=").append(encodedQ)
                    .append("&format=json")
                    .append("&limit=").append(limit)
                    .append("&accept-language=fr")
                    .append("&countrycodes=mg");

            if (lat != null && lon != null) {
                uri.append("&viewbox=").append(lon - 0.5).append(",")
                        .append(lat - 0.5).append(",")
                        .append(lon + 0.5).append(",")
                        .append(lat + 0.5)
                        .append("&bounded=1");
            }

            String body = httpClient.fetchString(uri.toString(), props.getUserAgent());
            geoCache.put(cacheKey, body);
            return ResponseEntity.ok(body);

        } catch (Exception e) {
            log.error("Geocode failed: {}", e.getMessage());
            return ResponseEntity.status(502).contentType(MediaType.APPLICATION_JSON)
                    .body("{\"error\":\"Service de géocodage indisponible\"}");
        }
    }

    @GetMapping(value = "/reverse", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> reverse(
            @RequestParam double lat,
            @RequestParam double lon) {

        String cacheKey = "reverse:" + lat + ":" + lon;
        String cached = geoCache.getIfPresent(cacheKey);
        if (cached != null) {
            return ResponseEntity.ok(cached);
        }

        try {
            String uri = props.getGeocodeUrl()
                    + "/reverse?lat=" + lat + "&lon=" + lon
                    + "&format=json&accept-language=fr&zoom=18";

            String body = httpClient.fetchString(uri, props.getUserAgent());
            geoCache.put(cacheKey, body);
            return ResponseEntity.ok(body);

        } catch (Exception e) {
            log.error("Reverse geocode failed: {}", e.getMessage());
            return ResponseEntity.status(502).contentType(MediaType.APPLICATION_JSON)
                    .body("{\"error\":\"Service de géocodage inversé indisponible\"}");
        }
    }
}
