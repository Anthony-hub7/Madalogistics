package com.example.Bakend.dto.optimisation;

import java.util.UUID;

public record VrpValiderResponse(
    UUID tourneeId,
    UUID runId,
    double distanceTotaleKm,
    int nbEtapes,
    String justification
) {}
