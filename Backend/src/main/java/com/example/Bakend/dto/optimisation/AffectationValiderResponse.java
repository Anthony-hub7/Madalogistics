package com.example.Bakend.dto.optimisation;

import java.util.UUID;

public record AffectationValiderResponse(
    UUID runId,
    int nbSacsAffectes,
    int nbSacsNonAffectes,
    String justification
) {}
