package com.example.Bakend.maps;

import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiter a fenetre glissante — remplace Bucket4j.
 * Zero dependance externe, thread-safe.
 */
@Component
public class MapsManualRateLimiter {

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    /**
     * @return true si la requete est autorisee, false si depassement
     */
    public boolean tryConsume(String key, int capacity, int windowSeconds) {
        long now = System.currentTimeMillis();
        long windowStart = now - (windowSeconds * 1000L);
        Bucket bucket = buckets.computeIfAbsent(key, k -> new Bucket());
        return bucket.tryConsume(now, windowStart, capacity);
    }

    public void reset(String key) {
        buckets.remove(key);
    }

    private static class Bucket {
        private final ArrayDeque<Long> timestamps = new ArrayDeque<>();

        synchronized boolean tryConsume(long now, long windowStart, int capacity) {
            while (!timestamps.isEmpty() && timestamps.peekFirst() < windowStart) {
                timestamps.pollFirst();
            }
            if (timestamps.size() < capacity) {
                timestamps.addLast(now);
                return true;
            }
            return false;
        }
    }
}
