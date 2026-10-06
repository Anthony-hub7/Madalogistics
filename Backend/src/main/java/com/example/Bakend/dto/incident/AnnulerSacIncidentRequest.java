package com.example.Bakend.dto.incident;

/**
 * Annulation douce d'un sac en incident par le gestionnaire.
 * Les colis sont liberes et redeviennent groupables.
 *
 * @param motif motif trace dans l'audit (ex : panne vehicule)
 */
public record AnnulerSacIncidentRequest(String motif) {}
