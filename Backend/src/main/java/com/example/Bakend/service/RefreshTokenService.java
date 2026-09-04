package com.example.Bakend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Gestion des refresh tokens opaques stockés en Redis.
 * Clé : refresh:{token} → JSON { userId, tenantId, exp }.
 * TTL configuré via app.refresh.token-expiration-days (défaut : 7 jours).
 */
@Service
@Transactional
public class RefreshTokenService {

    private static final String KEY_PREFIX = "refresh:";

    private final StringRedisTemplate redisTemplate;
    private final long tokenExpirationDays;

    public RefreshTokenService(StringRedisTemplate redisTemplate,
                               @Value("${app.refresh.token-expiration-days:7}") long tokenExpirationDays) {
        this.redisTemplate = redisTemplate;
        this.tokenExpirationDays = tokenExpirationDays;
    }

    /**
     * Génère un refresh token opaque et le stocke dans Redis.
     * @return le token opaque (UUID string)
     */
    public String createRefreshToken(UUID userId, UUID tenantId) {
        String token = UUID.randomUUID().toString();
        Instant expiry = Instant.now().plus(tokenExpirationDays, ChronoUnit.DAYS);

        Map<String, String> data = new HashMap<>();
        data.put("userId", userId.toString());
        data.put("tenantId", tenantId != null ? tenantId.toString() : "");
        data.put("exp", expiry.toString());

        String key = KEY_PREFIX + token;
        redisTemplate.opsForHash().putAll(key, data);
        redisTemplate.expire(key, Duration.ofDays(tokenExpirationDays));

        return token;
    }

    /**
     * Valide un refresh token : vérifie existence + expiry.
     * @return le payload (userId, tenantId) ou null si invalide/expiré
     */
    public Map<String, String> validateRefreshToken(String token) {
        String key = KEY_PREFIX + token;
        Map<Object, Object> data = redisTemplate.opsForHash().entries(key);

        if (data.isEmpty()) {
            return null;
        }

        Instant exp = Instant.parse((String) data.get("exp"));
        if (Instant.now().isAfter(exp)) {
            redisTemplate.delete(key);
            return null;
        }

        Map<String, String> result = new HashMap<>();
        result.put("userId", (String) data.get("userId"));
        result.put("tenantId", (String) data.get("tenantId"));
        result.put("exp", (String) data.get("exp"));
        return result;
    }

    /**
     * Supprime un refresh token de Redis (logout ou rotation).
     */
    public void deleteRefreshToken(String token) {
        redisTemplate.delete(KEY_PREFIX + token);
    }

    /**
     * Rotation : supprime l'ancien token et en crée un nouveau.
     * @return le nouveau token opaque
     */
    public String rotateRefreshToken(String oldToken, UUID userId, UUID tenantId) {
        deleteRefreshToken(oldToken);
        return createRefreshToken(userId, tenantId);
    }
}
