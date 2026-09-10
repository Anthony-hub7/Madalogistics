package com.example.Bakend.dto.direction;

import com.example.Bakend.entity.OptimisationRun;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
public class DecisionResponse {

    private final UUID runId;
    private final String typeAlgorithme;
    private final String hubNom;
    private final String justificationDocument;
    private final Integer dureeCalculMs;
    private final LocalDateTime createdAt;

    public DecisionResponse(OptimisationRun entity) {
        this.runId = entity.getRunId();
        this.typeAlgorithme = entity.getTypeAlgorithme() != null ? entity.getTypeAlgorithme().name() : null;
        this.hubNom = entity.getHub() != null ? entity.getHub().getNom() : null;
        this.justificationDocument = entity.getJustificationDocument();
        this.dureeCalculMs = entity.getDureeCalculMs();
        this.createdAt = entity.getCreatedAt();
    }
}
