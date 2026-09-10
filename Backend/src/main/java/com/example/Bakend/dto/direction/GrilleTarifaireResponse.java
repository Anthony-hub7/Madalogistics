package com.example.Bakend.dto.direction;

import com.example.Bakend.entity.GrilleTarifaire;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
public class GrilleTarifaireResponse {

    private final UUID grilleId;
    private final String libelle;
    private final BigDecimal prixParKg;
    private final BigDecimal prixParM3;
    private final BigDecimal prixMinimum;
    private final boolean actif;
    private final LocalDateTime createdAt;

    public GrilleTarifaireResponse(GrilleTarifaire entity) {
        this.grilleId = entity.getGrilleId();
        this.libelle = entity.getLibelle();
        this.prixParKg = entity.getPrixParKg();
        this.prixParM3 = entity.getPrixParM3();
        this.prixMinimum = entity.getPrixMinimum();
        this.actif = entity.isActif();
        this.createdAt = entity.getCreatedAt();
    }
}
