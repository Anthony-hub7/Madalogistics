package com.example.Bakend.maps;

/**
 * Calcul Haversine pur JDK — fallback quand OSRM est indisponible.
 */
public final class HaversineUtil {

    private static final double R = 6371.0;

    private HaversineUtil() {}

    /**
     * @return distance en km entre deux points GPS
     */
    public static double distance(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
