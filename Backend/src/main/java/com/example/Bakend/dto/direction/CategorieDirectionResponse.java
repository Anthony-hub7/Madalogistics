package com.example.Bakend.dto.direction;

import com.example.Bakend.entity.CategorieProduit;
import com.example.Bakend.entity.enums.ClasseValeur;
import lombok.Getter;

import java.util.UUID;

@Getter
public class CategorieDirectionResponse {

    private final UUID categorieId;
    private final String libelle;
    private final ClasseValeur classeValeur;     // legacy A/B/C
    private final String classeCode;              // V12 dynamique
    private final String justification;
    private final boolean actif;
    private final SeuilsMl seuilsMl;             // V12
    private final Integer version;                // V12
    private final Boolean habiliteRequis;         // V12
    private final Boolean mlActivable;            // V12

    public CategorieDirectionResponse(CategorieProduit entity) {
        this.categorieId = entity.getCategorieId();
        this.libelle = entity.getLibelle();
        this.classeValeur = entity.getClasseValeur();
        this.classeCode = entity.getClasseCode();
        this.justification = entity.getJustification();
        this.actif = entity.getActif();
        this.seuilsMl = SeuilsMl.fromJson(entity.getSeuilsMl());
        this.version = entity.getVersion();
        this.habiliteRequis = entity.getHabiliteRequis();
        this.mlActivable = entity.getMlActivable();
    }
}
