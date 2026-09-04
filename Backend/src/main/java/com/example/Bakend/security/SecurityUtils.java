package com.example.Bakend.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

/**
 * Utilitaires d'accès à l'utilisateur courant et de résolution du tenant
 * depuis le SecurityContext, en amont des contrôleurs (isolation multi-tenant).
 */
public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static Authentication getAuthentication() {
        return SecurityContextHolder.getContext().getAuthentication();
    }

    /**
     * Retourne l'utilisateur courant s'il est authentifié, sinon null.
     */
    public static CustomUserDetails getCurrentUser() {
        Authentication auth = getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails userDetails) {
            return userDetails;
        }
        return null;
    }

    /**
     * Retourne le tenant_id de l'utilisateur courant.
     * Peut être null pour un ADMIN_SAAS transverse.
     */
    public static UUID getTenantId() {
        CustomUserDetails user = getCurrentUser();
        return user != null ? user.getTenantId() : null;
    }
}