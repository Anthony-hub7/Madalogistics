package com.example.Bakend.maps;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class MapsRateLimitFilter extends OncePerRequestFilter {

    private final MapsProperties props;
    private final MapsManualRateLimiter rateLimiter;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String uri = request.getRequestURI();
        if (!uri.startsWith("/api/maps/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String key = resolveKey(request);
        int capacity;
        if (uri.contains("/route") || uri.contains("/distance-matrix")) {
            capacity = props.getRateLimitRoutePerTenant();
        } else {
            capacity = props.getRateLimitGeoPerTenant();
        }

        if (rateLimiter.tryConsume(key, capacity, props.getRateLimitWindowSeconds())) {
            filterChain.doFilter(request, response);
        } else {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", String.valueOf(props.getRateLimitWindowSeconds()));
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Trop de requêtes, réessayez plus tard.\"}");
        }
    }

    private String resolveKey(HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getName() != null && !"anonymousUser".equals(auth.getName())) {
            return request.getRequestURI() + ":" + auth.getName();
        }
        String ip = request.getRemoteAddr();
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            ip = forwarded.split(",")[0].trim();
        }
        return request.getRequestURI() + ":" + ip;
    }
}
