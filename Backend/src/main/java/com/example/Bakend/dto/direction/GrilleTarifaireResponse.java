package com.example.Bakend.dto.direction;

import com.example.Bakend.entity.GrilleTarifaire;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
public class GrilleTarifaireResponse {

    private final UUID grilleId;
    private final String libelle;
    private final BigDecimal prixParKg;
    private final BigDecimal prixParM3;
    private final BigDecimal prixParKm;
    private final BigDecimal prixMinimum;
    private final boolean actif;

    // V15 : catégorie reliée
    private final UUID categorieId;
    private final String categorieLibelle;
    private final String categorieClasseCode;

    public GrilleTarifaireResponse(GrilleTarifaire entity) {
        this.grilleId = entity.getGrilleId();
        this.libelle = entity.getLibelle();
        this.prixParKg = entity.getPrixParKg();
        this.prixParM3 = entity.getPrixParM3();
        this.prixParKm = entity.getPrixParKm();
        this.prixMinimum = entity.getPrixMinimum();
        this.actif = entity.isActif();
        this.categorieId = entity.getCategorie() != null ? entity.getCategorie().getCategorieId() : null;
        this.categorieLibelle = entity.getCategorie() != null ? entity.getCategorie().getLibelle() : null;
        this.categorieClasseCode = entity.getCategorie() != null ? entity.getCategorie().getClasseCode() : null;
    }
}
