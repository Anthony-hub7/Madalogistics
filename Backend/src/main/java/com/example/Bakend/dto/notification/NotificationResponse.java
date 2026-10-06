package com.example.Bakend.dto.notification;

/** Notification exposee au frontend (polling de la cloche). */
public record NotificationResponse(
        java.util.UUID notificationId,
        String type,
        String titre,
        String message,
        java.util.UUID sacId,
        boolean lu,
        java.time.LocalDateTime createdAt) {}
