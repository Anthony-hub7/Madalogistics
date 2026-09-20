package com.example.Bakend.dto.optimisation;

import java.util.List;
import java.util.UUID;

public record GroupageValiderResponse(
    UUID runId,
    List<SacCree> sacsCrees,
    int colisLies,
    int demandesGroupees,
    String justification
) {
    public record SacCree(
        UUID sacId,
        int nbColis,
        double tauxRemplissage
    ) {}
}
