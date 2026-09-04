package com.example.Bakend.security;

import com.example.Bakend.entity.Utilisateur;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

/**
 * Service de génération et de validation des JWT.
 * Le token embarque l'identifiant utilisateur, son role et le tenant_id
 * afin de permettre la double isolation par rôle et par tenant.
 */
@Service
public class JwtService {

    private final SecretKey secretKey;
    private final long expirationMs;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.expiration-ms}") long expirationMs) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    /**
     * Génère un token pour un utilisateur. Le tenant_id peut être null
     * (utilisateur transverse ADMIN_SAAS).
     */
    public String generateToken(Utilisateur utilisateur) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);
        return Jwts.builder()
                .subject(utilisateur.getEmail())
                .claim("utilisateur_id", utilisateur.getUtilisateurId().toString())
                .claim("tenant_id", utilisateur.getPmeCliente() != null
                        ? utilisateur.getPmeCliente().getTenantId().toString() : null)
                .claim("role", utilisateur.getRole().name())
                .issuedAt(now)
                .expiration(expiry)
                .signWith(secretKey)
                .compact();
    }

    /**
     * Extrait l'email (subject) contenu dans un token valide.
     *
     * @throws JwtException si le token est invalide ou expiré.
     */
    public String extractSubject(String token) {
        return parseClaims(token).getSubject();
    }

    public boolean isValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public String extractRole(String token) {
        return (String) parseClaims(token).get("role");
    }

    public UUID extractTenantId(String token) {
        String tenantId = (String) parseClaims(token).get("tenant_id");
        return tenantId != null ? UUID.fromString(tenantId) : null;
    }

    private Claims parseClaims(String token) throws JwtException {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}