package com.example.Bakend.config;

import java.util.UUID;

/**
 * Contexte multi-tenant basé sur ThreadLocal.
 * Le JwtAuthenticationFilter positionne le tenantId et le role
 * résolus depuis le JWT ; le filtre JDBC les lit pour exécuter
 * les SET LOCAL qui alimentent les policies RLS PostgreSQL.
 */
public final class TenantContext {

    private static final ThreadLocal<UUID> TENANT_ID = new ThreadLocal<>();
    private static final ThreadLocal<String> ROLE = new ThreadLocal<>();

    private TenantContext() {
    }

    public static void setTenantId(UUID tenantId) {
        TENANT_ID.set(tenantId);
    }

    public static UUID getTenantId() {
        return TENANT_ID.get();
    }

    public static void setRole(String role) {
        ROLE.set(role);
    }

    public static String getRole() {
        return ROLE.get();
    }

    public static void clear() {
        TENANT_ID.remove();
        ROLE.remove();
    }
}
