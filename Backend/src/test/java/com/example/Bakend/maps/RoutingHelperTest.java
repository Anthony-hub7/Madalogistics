package com.example.Bakend.maps;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class RoutingHelperTest {

    @Test
    void pointsToCoordsFormat() {
        List<double[]> pts = List.of(
                new double[]{-18.914, 47.541},
                new double[]{-18.150, 49.388});
        assertEquals("47.541,-18.914;49.388,-18.15", RoutingController.pointsToCoords(pts));
    }

    @Test
    void hashPointsDeterministic() {
        List<double[]> pts = List.of(
                new double[]{-18.914, 47.541},
                new double[]{-18.150, 49.388});
        String h1 = RoutingController.hashPoints(pts);
        String h2 = RoutingController.hashPoints(pts);
        assertEquals(h1, h2);
    }

    @Test
    void hashPointsDifferentForDifferentInputs() {
        List<double[]> a = List.of(new double[]{-18.9, 47.5});
        List<double[]> b = List.of(new double[]{-18.1, 49.3});
        assertNotEquals(RoutingController.hashPoints(a), RoutingController.hashPoints(b));
    }
}
