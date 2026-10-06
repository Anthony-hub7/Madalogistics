package com.example.Bakend.dto.incident;

/**
 * Signalement d'incident vehicule par le chauffeur (panne, route coupee...).
 *
 * @param type PANNE, ROUTE_COUPEE ou AUTRE
 * @param message description libre (lieu, gravite...)
 */
public record SignalerIncidentRequest(String type, String message) {}
