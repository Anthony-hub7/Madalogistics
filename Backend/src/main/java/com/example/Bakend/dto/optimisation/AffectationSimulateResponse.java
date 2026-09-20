package com.example.Bakend.dto.optimisation;

import java.util.List;
import java.util.UUID;

public record AffectationSimulateResponse(
    List<AffectationResultat> resultats,
    List<String> avertissements,
    boolean valide
) {
    public record AffectationResultat(
        UUID sacId,
        UUID chauffeurId,
        String chauffeurNom,
        UUID vehiculeId,
        String immatriculation,
        boolean autorise,
        String motifRefus,
        double score
    ) {}
}
