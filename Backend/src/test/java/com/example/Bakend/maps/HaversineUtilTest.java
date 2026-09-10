package com.example.Bakend.maps;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class HaversineUtilTest {

    @Test
    void antananarivoToToamasina() {
        double d = HaversineUtil.distance(-18.914, 47.541, -18.150, 49.388);
        assertTrue(d > 180 && d < 260, "Expected ~212km, got " + d);
    }

    @Test
    void samePointReturnsZero() {
        assertEquals(0.0, HaversineUtil.distance(-18.914, 47.541, -18.914, 47.541), 0.001);
    }

    @Test
    void symmetric() {
        double d1 = HaversineUtil.distance(-18.914, 47.541, -18.150, 49.388);
        double d2 = HaversineUtil.distance(-18.150, 49.388, -18.914, 47.541);
        assertEquals(d1, d2, 0.001);
    }

    @Test
    void tanaToAntsirabe() {
        double d = HaversineUtil.distance(-18.914, 47.541, -19.866, 47.035);
        assertTrue(d > 100 && d < 140, "Expected ~118km, got " + d);
    }
}
