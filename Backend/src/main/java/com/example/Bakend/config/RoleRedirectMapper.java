package com.example.Bakend.config;

import com.example.Bakend.entity.enums.Role;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Mappe chaque rôle vers le chemin de redirection côté frontend.
 * Le frontend ne connaît jamais le rôle — il reçoit seulement le chemin.
 */
@Component
public class RoleRedirectMapper {

    private static final Map<Role, String> ROLE_PATH = Map.of(
            Role.ADMIN_SAAS, "/admin",
            Role.GESTIONNAIRE, "/logistics",
            Role.CLIENT_FINAL, "/client",
            Role.CHAUFFEUR, "/driver",
            Role.DIRECTION, "/direction"
    );

    public String getRedirectPath(Role role) {
        return ROLE_PATH.getOrDefault(role, "/");
    }
}
