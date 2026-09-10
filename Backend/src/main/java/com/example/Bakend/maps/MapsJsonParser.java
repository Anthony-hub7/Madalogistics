package com.example.Bakend.maps;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Parse JSON minimal sans Jackson — extrait des listes de points [lat,lon]
 * à partir de body bruts reçus du frontend.
 */
public final class MapsJsonParser {

    private static final Pattern DOUBLE_PATTERN = Pattern.compile("[-+]?\\d+(\\.\\d+)?([eE][-+]?\\d+)?");

    private MapsJsonParser() {}

    /**
     * Extrait la liste de points depuis un body contenant "points":[[lat,lon],...]
     * Retourne une liste vide si le format est invalide.
     */
    public static List<double[]> parsePoints(String body) {
        List<double[]> points = new ArrayList<>();
        if (body == null || body.isBlank()) return points;

        int idx = body.indexOf("\"points\"");
        if (idx < 0) return points;

        int startBracket = body.indexOf('[', idx + 8);
        if (startBracket < 0) return points;

        Matcher m = DOUBLE_PATTERN.matcher(body);
        m.region(startBracket, body.length());

        List<Double> nums = new ArrayList<>();
        int bracketDepth = 0;
        int pos = startBracket;

        while (pos < body.length()) {
            char c = body.charAt(pos);
            if (c == '[') {
                bracketDepth++;
            } else if (c == ']') {
                bracketDepth--;
                if (bracketDepth <= 0) break;
                if (bracketDepth == 1 && nums.size() >= 2) {
                    points.add(new double[]{nums.get(0), nums.get(1)});
                    nums.clear();
                }
            } else if (c == ',' && bracketDepth == 2) {
                // séparateur interne paire [lat,lon] — ignore
            }
            pos++;
        }

        // Re-parse proprement
        points.clear();
        m = DOUBLE_PATTERN.matcher(body);
        m.region(startBracket, body.length());
        nums.clear();
        int depth = 0;
        pos = startBracket;

        while (pos < body.length()) {
            char c = body.charAt(pos);
            if (c == '[') {
                depth++;
            } else if (c == ']') {
                depth--;
                if (depth == 1 && nums.size() >= 2) {
                    points.add(new double[]{nums.get(0), nums.get(1)});
                    nums.clear();
                }
                if (depth <= 0) break;
            } else if (Character.isDigit(c) || c == '-' || c == '+' || c == '.') {
                if (depth == 2) {
                    m.region(pos, body.length());
                    if (m.lookingAt()) {
                        nums.add(Double.parseDouble(m.group()));
                        pos = m.end() - 1;
                    }
                }
            }
            pos++;
        }

        return points;
    }
}
