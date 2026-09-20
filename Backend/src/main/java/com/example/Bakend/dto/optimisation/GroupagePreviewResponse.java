package com.example.Bakend.dto.optimisation;

import com.example.Bakend.entity.enums.TypeAlgorithme;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record GroupagePreviewResponse(
    UUID runId,
    UUID hubId,
    TypeAlgorithme algo,
    List<SacPreview> sacs,
    List<ColisNonGroupe> colisNonGroupes,
    PreviewMeta meta
) {
    public record SacPreview(
        String tmpSacId,
        String cluster,
        List<UUID> colisIds,
        int nbColis,
        BigDecimal tauxPoids,
        BigDecimal tauxVolume,
        BigDecimal tauxRemplissage,
        long poidsTotalKg,
        long volumeTotalM3,
        LocalDate dateDepartPlafond,
        boolean departForce,
        String categorieDominante
    ) {}

    public record ColisNonGroupe(
        UUID colisId,
        String description,
        BigDecimal poidsKg,
        BigDecimal volumeM3,
        String motif
    ) {}

    public record PreviewMeta(
        int nbColisTotaux,
        int nbColisGroupes,
        int nbSacs,
        long capacitePoidsKg,
        long capaciteVolumeM3,
        BigDecimal seuilRemplissage,
        long dureeCalculMs,
        LocalDateTime timestamp
    ) {}
}
