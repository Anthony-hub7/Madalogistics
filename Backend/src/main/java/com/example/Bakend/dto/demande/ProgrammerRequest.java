package com.example.Bakend.dto.demande;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

/**
 * Requête de programmation : fenêtre précise (EN_ATTENTE_GROUPAGE → GROUPEE).
 */
public record ProgrammerRequest(
        @NotNull LocalDateTime dateCollecte,
        String creneauPrecis
) {
}
