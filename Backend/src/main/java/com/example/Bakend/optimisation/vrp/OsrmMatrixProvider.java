package com.example.Bakend.optimisation.vrp;

import com.example.Bakend.maps.MapsHttpClient;
import com.example.Bakend.maps.MapsProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Matrice temps via OSRM /table/v1/driving/.
 * Fallback Haversine si OSRM indisponible (timeout, erreur HTTP).
 * @Primary : injecté par défaut dans VrpMatrixBuilder.
 */
@Primary
@Component
public class OsrmMatrixProvider implements VrpMatrixProvider {

    private static final Logger log = LoggerFactory.getLogger(OsrmMatrixProvider.class);

    private static final Pattern NUM_PATTERN = Pattern.compile("[-+]?\\d+(\\.\\d+)?([eE][-+]?\\d+)?");

    private final MapsHttpClient httpClient;
    private final MapsProperties props;
    private final HaversineMatrixProvider fallback;

    public OsrmMatrixProvider(MapsHttpClient httpClient, MapsProperties props,
                              HaversineMatrixProvider fallback) {
        this.httpClient = httpClient;
        this.props = props;
        this.fallback = fallback;
    }

    @Override
    public long[][] matriceTemps(List<GeoPoint> points) {
        try {
            return osrmTable(points);
        } catch (Exception e) {
            log.warn("OSRM table échoué, fallback Haversine : {}", e.getMessage());
            return fallback.matriceTemps(points);
        }
    }

    private long[][] osrmTable(List<GeoPoint> points) throws Exception {
        String coords = pointsToCoords(points);
        String uri = props.getRoutingUrl()
                + "/table/v1/driving/" + coords
                + "?annotations=duration";

        String body = httpClient.fetchString(uri, props.getUserAgent());

        return parseDurations(body, points.size());
    }

    /**
     * Parse "durations":[[0.0,123.4,...],[...]] depuis la réponse OSRM.
     * Pas de Jackson — extraction regex/substring.
     */
    static long[][] parseDurations(String json, int expectedSize) {
        int idx = json.indexOf("\"durations\"");
        if (idx < 0) {
            throw new RuntimeException("Clé 'durations' absente dans la réponse OSRM");
        }

        int startBracket = json.indexOf('[', idx + 11);
        if (startBracket < 0) {
            throw new RuntimeException("Format durations invalide");
        }

        // Trouver le ] fermant du tableau externe
        int depth = 0;
        int endBracket = -1;
        for (int i = startBracket; i < json.length(); i++) {
            char c = json.charAt(i);
            if (c == '[') depth++;
            else if (c == ']') {
                depth--;
                if (depth == 0) {
                    endBracket = i;
                    break;
                }
            }
        }
        if (endBracket < 0) {
            throw new RuntimeException("Bracket fermant durations introuvable");
        }

        String durationsRaw = json.substring(startBracket, endBracket + 1);

        // Parser les lignes [row0], [row1], ...
        Matcher numMatcher = NUM_PATTERN.matcher(durationsRaw);
        List<List<Long>> rows = new ArrayList<>();
        List<Long> currentRow = new ArrayList<>();
        int bracketDepth = 0;

        for (int i = 0; i < durationsRaw.length(); i++) {
            char c = durationsRaw.charAt(i);
            if (c == '[') {
                bracketDepth++;
            } else if (c == ']') {
                bracketDepth--;
                if (bracketDepth == 1 && !currentRow.isEmpty()) {
                    rows.add(new ArrayList<>(currentRow));
                    currentRow.clear();
                }
            } else if (bracketDepth == 2 && (Character.isDigit(c) || c == '-' || c == '.' || c == '+')) {
                numMatcher.region(i, durationsRaw.length());
                if (numMatcher.lookingAt()) {
                    double val = Double.parseDouble(numMatcher.group());
                    currentRow.add(Math.round(val));
                    i = numMatcher.end() - 1;
                }
            }
        }

        if (rows.size() != expectedSize) {
            throw new RuntimeException(
                    "Nombre de lignes durations (" + rows.size() + ") ≠ taille attendue (" + expectedSize + ")");
        }

        long[][] matrix = new long[expectedSize][expectedSize];
        for (int i = 0; i < expectedSize; i++) {
            List<Long> row = rows.get(i);
            for (int j = 0; j < Math.min(row.size(), expectedSize); j++) {
                matrix[i][j] = row.get(j);
            }
        }
        return matrix;
    }

    private String pointsToCoords(List<GeoPoint> points) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < points.size(); i++) {
            if (i > 0) sb.append(";");
            sb.append(points.get(i).lon()).append(",").append(points.get(i).lat());
        }
        return sb.toString();
    }
}
