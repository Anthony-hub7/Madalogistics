package com.example.Bakend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.datasource.DataSourceUtils;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.sql.DataSource;
import java.io.IOException;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.Statement;
import java.util.UUID;

/**
 * Filtre qui propage le tenant_id et le role vers PostgreSQL via SET LOCAL,
 * pour alimenter les fonctions current_tenant_id() et le paramètre
 * app.current_role utilisés par les policies RLS.
 *
 * Désactive auto-commit sur la connexion empruntée pour garantir que
 * les SET LOCAL persistent pendant toute la durée de la transaction
 * (SET LOCAL est scope transaction, pas session).
 *
 * Ordre : juste après le JwtAuthenticationFilter (HIGHEST_PRECEDENCE + 10).
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class TenantFilter extends OncePerRequestFilter {

    private final DataSource dataSource;

    public TenantFilter(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        UUID tenantId = TenantContext.getTenantId();
        String role = TenantContext.getRole();

        if (tenantId != null || role != null) {
            Connection connection = null;
            boolean originalAutoCommit = true;
            try {
                connection = DataSourceUtils.getConnection(dataSource);
                originalAutoCommit = connection.getAutoCommit();

                // Désactiver auto-commit pour que SET LOCAL persiste
                // pendant toute la durée de la transaction (@Transactional)
                if (originalAutoCommit) {
                    connection.setAutoCommit(false);
                }

                try (Statement stmt = connection.createStatement()) {
                    if (tenantId != null) {
                        stmt.execute("SET LOCAL app.current_tenant_id = '" + tenantId + "'");
                    }
                    if (role != null) {
                        stmt.execute("SET LOCAL app.current_role = '" + role.toLowerCase() + "'");
                    }
                }
            } catch (Exception e) {
                logger.warn("Erreur lors du SET LOCAL tenant/role : " + e.getMessage());
            } finally {
                // Ne pas rétablir auto-commit ici — la transaction @Transactional
                // gère le commit/rollback. Le nettoyage est fait par Spring.
            }
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }
}
