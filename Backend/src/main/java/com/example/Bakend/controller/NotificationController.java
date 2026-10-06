package com.example.Bakend.controller;

import com.example.Bakend.dto.notification.NotificationResponse;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.security.SecurityUtils;
import com.example.Bakend.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Notifications du role courant (polling toutes les ~30 s cote frontend).
 *
 * GET   /api/notifications?nonLues=true → liste (plus recentes d'abord)
 * GET   /api/notifications/compteur     → { nonLues }
 * PATCH /api/notifications/{id}/lue     → marque lue
 * POST  /api/notifications/tout-marquer-lues
 */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> lister(
            @RequestParam(defaultValue = "false") boolean nonLues) {
        return ResponseEntity.ok(notificationService.lister(requireTenant(), nonLues));
    }

    @GetMapping("/compteur")
    public ResponseEntity<Map<String, Long>> compteur() {
        return ResponseEntity.ok(Map.of("nonLues", notificationService.compterNonLues(requireTenant())));
    }

    @PatchMapping("/{id}/lue")
    public ResponseEntity<Map<String, Object>> marquerLue(@PathVariable UUID id) {
        notificationService.marquerLue(requireTenant(), id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/tout-marquer-lues")
    public ResponseEntity<Map<String, Object>> toutMarquerLues() {
        int nb = notificationService.toutMarquerLues(requireTenant());
        return ResponseEntity.ok(Map.of("success", true, "marquees", nb));
    }

    private UUID requireTenant() {
        UUID tenantId = SecurityUtils.getTenantId();
        if (tenantId == null) {
            throw new BusinessException("Contexte tenant manquant", 400);
        }
        return tenantId;
    }
}
