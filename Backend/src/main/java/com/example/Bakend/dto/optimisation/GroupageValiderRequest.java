package com.example.Bakend.dto.optimisation;

import java.util.List;
import java.util.UUID;

public record GroupageValiderRequest(
    UUID runId,
    List<SacEdit> sacs
) {
    public record SacEdit(
        String tmpSacId,
        List<UUID> colisIds,
        boolean supprime
    ) {}
}
