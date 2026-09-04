package com.example.Bakend.dto.response;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Corps de réponse d'erreur standardisé, renvoyé par le GlobalExceptionHandler.
 */
public record ErrorResponse(
        LocalDateTime timestamp,
        int status,
        String error,
        String message,
        String path,
        Map<String, List<String>> fieldErrors
) {

    public static ErrorResponse of(int status, String error, String message, String path) {
        return new ErrorResponse(LocalDateTime.now(), status, error, message, path, null);
    }
}