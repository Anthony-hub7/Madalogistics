package com.example.Bakend.config;

import com.example.Bakend.entity.Chauffeur;
import com.example.Bakend.entity.enums.Role;
import com.example.Bakend.repository.ChauffeurRepository;
import com.example.Bakend.security.CustomUserDetails;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Filtre qui bloque les CHAUFFEURS dont le statutDossier != VALIDEE
 * sur les endpoints operationnels (missions, tournées, livraisons, flotte).
 *
 * Les endpoints autorises meme si non active :
 * - /api/auth/**
 * - /api/chauffeurs/mon-dossier/**
 * - /api/admin/**
 * - /api/agences/**
 *
 * Ordre : HIGHEST_PRECEDENCE + 20 (apres TenantFilter).
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class ChauffeurStatutFilter extends OncePerRequestFilter {

    private final ChauffeurRepository chauffeurRepository;

    /** Endpoints toujours accessibles aux chauffeurs non actifs */
    private static final Set<String> WHITELIST_PREFIXES = Set.of(
            "/api/auth/",
            "/api/chauffeurs/mon-dossier",
            "/api/admin/",
            "/api/agences/"
    );

    public ChauffeurStatutFilter(ChauffeurRepository chauffeurRepository) {
        this.chauffeurRepository = chauffeurRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof CustomUserDetails userDetails)) {
            filterChain.doFilter(request, response);
            return;
        }

        // Seuls les chauffeurs sont concernes
        if (userDetails.getUtilisateur().getRole() != Role.CHAUFFEUR) {
            filterChain.doFilter(request, response);
            return;
        }

        // Endpoints whiteliste toujours accessibles
        String path = request.getRequestURI();
        if (WHITELIST_PREFIXES.stream().anyMatch(path::startsWith)) {
            filterChain.doFilter(request, response);
            return;
        }

        // Verifier le statut du dossier
        Optional<Chauffeur> chauffeurOpt = chauffeurRepository.findByUtilisateurId(
                userDetails.getUtilisateurId());

        if (chauffeurOpt.isPresent()) {
            Chauffeur chauffeur = chauffeurOpt.get();
            String statut = chauffeur.getStatutDossier();

            if (!"VALIDEE".equals(statut)) {
                String motif = chauffeur.getMotifRefus() != null ? chauffeur.getMotifRefus() : "";
                response.setStatus(HttpStatus.FORBIDDEN.value());
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.setCharacterEncoding(StandardCharsets.UTF_8.name());
                String json = "{"
                        + "\"error\":\"COMPTE_INACTIF\","
                        + "\"message\":\"Votre compte n'est pas encore active. Statut : " + escapeJson(statut) + "\","
                        + "\"statutDossier\":\"" + escapeJson(statut) + "\","
                        + "\"motifRefus\":\"" + escapeJson(motif) + "\""
                        + "}";
                response.getOutputStream().write(json.getBytes(StandardCharsets.UTF_8));
                response.getOutputStream().flush();
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private String escapeJson(String val) {
        if (val == null) return "";
        return val.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n");
    }
}
