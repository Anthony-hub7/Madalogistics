package com.example.Bakend.maps;

import lombok.extern.slf4j.Slf4j;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Cache L1 manuel LRU + TTL — remplace Caffeine.
 * Zero dependance externe.
 *
 * @param <K> type des cles
 * @param <V> type des valeurs
 */
@Slf4j
public class MapsManualCache<K, V> {

    private final int maxSize;
    private final long ttlMillis;
    private final ConcurrentHashMap<K, Entry<V>> store = new ConcurrentHashMap<>();

    public MapsManualCache(int maxSize, long ttlMillis) {
        this.maxSize = maxSize;
        this.ttlMillis = ttlMillis;
    }

    public V getIfPresent(K key) {
        Entry<V> e = store.get(key);
        if (e == null) return null;
        if (System.currentTimeMillis() > e.expiresAt) {
            store.remove(key);
            return null;
        }
        return e.value;
    }

    public void put(K key, V value) {
        if (store.size() >= maxSize) {
            evictOldest();
        }
        store.put(key, new Entry<>(value, System.currentTimeMillis() + ttlMillis));
    }

    public void invalidateAll() {
        store.clear();
    }

    public int size() {
        return store.size();
    }

    private void evictOldest() {
        long oldest = Long.MAX_VALUE;
        K oldestKey = null;
        for (Map.Entry<K, Entry<V>> e : store.entrySet()) {
            if (e.getValue().createdAt < oldest) {
                oldest = e.getValue().createdAt;
                oldestKey = e.getKey();
            }
        }
        if (oldestKey != null) store.remove(oldestKey);
    }

    private static class Entry<V> {
        final V value;
        final long expiresAt;
        final long createdAt;

        Entry(V value, long expiresAt) {
            this.value = value;
            this.expiresAt = expiresAt;
            this.createdAt = System.currentTimeMillis();
        }
    }
}
