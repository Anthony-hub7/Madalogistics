package com.example.Bakend.dto.optimisation;

import java.util.List;
import java.util.UUID;

public record VrpPreviewResponse(
    UUID sacId,
    UUID tourneeId,
    List<EtapePreview> etapes,
    double distanceTotaleKm,
    long dureeEstimeeSec,
    VrpMeta meta
) {
    public record EtapePreview(
        int ordre,
        UUID colisId,
        String type,
        double latitude,
        double longitude,
        long arrivalSec
    ) {}

    public record VrpMeta(
        int nbPoints,
        long solveTimeMs,
        boolean hasSolution
    ) {}
}
