package com.example.Bakend.optimisation.vrp;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests unitaires de HaversineMatrixProvider.
 */
class HaversineMatrixProviderTest {

    private HaversineMatrixProvider provider;

    @BeforeEach
    void setUp() {
        provider = new HaversineMatrixProvider();
    }

    @Test
    void matrixIsSymmetric() {
        List<GeoPoint> points = List.of(
                new GeoPoint(-18.9, 47.5),
                new GeoPoint(-18.95, 47.55),
                new GeoPoint(-18.88, 47.48)
        );

        long[][] m = provider.matriceTemps(points);

        for (int i = 0; i < m.length; i++) {
            for (int j = 0; j < m.length; j++) {
                assertEquals(m[i][j], m[j][i],
                        "Symétrie [" + i + "][" + j + "] ≠ [" + j + "][" + i + "]");
            }
        }
    }

    @Test
    void diagonalIsZero() {
        List<GeoPoint> points = List.of(
                new GeoPoint(-18.9, 47.5),
                new GeoPoint(-18.95, 47.55)
        );

        long[][] m = provider.matriceTemps(points);

        assertEquals(0, m[0][0]);
        assertEquals(0, m[1][1]);
    }

    @Test
    void dimensionsMatchInput() {
        List<GeoPoint> points = List.of(
                new GeoPoint(-18.9, 47.5),
                new GeoPoint(-18.95, 47.55),
                new GeoPoint(-18.88, 47.48),
                new GeoPoint(-19.0, 47.6)
        );

        long[][] m = provider.matriceTemps(points);

        assertEquals(4, m.length);
        for (long[] row : m) {
            assertEquals(4, row.length);
        }
    }

    @Test
    void conversionKmToSecIsCorrect() {
        // Point a ~111 km au nord (1 degre latitude ≈ 111 km)
        List<GeoPoint> points = List.of(
                new GeoPoint(0.0, 0.0),
                new GeoPoint(1.0, 0.0)
        );

        long[][] m = provider.matriceTemps(points);

        // 111 km / 40 km/h = 2.775h = ~10007 sec
        long timeSec = m[0][1];
        assertTrue(timeSec > 9000 && timeSec < 11000,
                "Conversion ≈ 10007 sec (2.775h a 40km/h), got " + timeSec);
    }

    @Test
    void singlePointReturnsZeroMatrix() {
        List<GeoPoint> points = List.of(new GeoPoint(-18.9, 47.5));

        long[][] m = provider.matriceTemps(points);

        assertEquals(1, m.length);
        assertEquals(0, m[0][0]);
    }
}
