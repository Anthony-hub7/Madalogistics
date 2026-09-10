package com.example.Bakend.maps;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class MapsManualRateLimiterTest {

    private MapsManualRateLimiter limiter;

    @BeforeEach
    void setUp() {
        limiter = new MapsManualRateLimiter();
    }

    @Test
    void allowsWithinCapacity() {
        assertTrue(limiter.tryConsume("k", 3, 60));
        assertTrue(limiter.tryConsume("k", 3, 60));
        assertTrue(limiter.tryConsume("k", 3, 60));
    }

    @Test
    void blocksOverCapacity() {
        assertTrue(limiter.tryConsume("k", 2, 60));
        assertTrue(limiter.tryConsume("k", 2, 60));
        assertFalse(limiter.tryConsume("k", 2, 60));
    }

    @Test
    void differentKeysAreIndependent() {
        assertTrue(limiter.tryConsume("keyA", 1, 60));
        assertTrue(limiter.tryConsume("keyB", 2, 60));
        assertFalse(limiter.tryConsume("keyA", 1, 60));
        assertTrue(limiter.tryConsume("keyB", 2, 60));
    }

    @Test
    void resetAllowsAgain() {
        limiter.tryConsume("k", 1, 60);
        assertFalse(limiter.tryConsume("k", 1, 60));
        limiter.reset("k");
        assertTrue(limiter.tryConsume("k", 1, 60));
    }
}
