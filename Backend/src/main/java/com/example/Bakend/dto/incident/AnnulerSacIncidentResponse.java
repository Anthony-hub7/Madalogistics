package com.example.Bakend.dto.incident;

/** Resultat de l'annulation d'un sac en incident. */
public record AnnulerSacIncidentResponse(
        java.util.UUID sacId,
        String statutSac,
        int colisLiberes,
        int demandesRetournees,
        boolean ressourcesLiberees) {}
