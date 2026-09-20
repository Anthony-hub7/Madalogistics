package com.example.Bakend.dto.optimisation;

import java.util.List;
import java.util.UUID;

public record AffectationValiderRequest(
    UUID hubId,
    List<AffectationDecision> decisions
) {
    public record AffectationDecision(
        UUID sacId,
        UUID chauffeurId,
        UUID vehiculeId
    ) {}
}
