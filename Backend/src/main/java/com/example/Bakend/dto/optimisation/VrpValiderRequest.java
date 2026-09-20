package com.example.Bakend.dto.optimisation;

import java.util.List;
import java.util.UUID;

public record VrpValiderRequest(
    UUID sacId,
    List<VrpEtapeEdit> etapes
) {
    public record VrpEtapeEdit(
        int ordre,
        UUID colisId
    ) {}
}
