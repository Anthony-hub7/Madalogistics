package com.example.Bakend.dto.response;

import com.example.Bakend.entity.Vehicule;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
public class VehiculeDTO {

    private final UUID vehiculeId;
    private final String immatriculation;
    private final UUID hubId;
    private final String hubNom;
    private final BigDecimal capacitePoidsKg;
    private final BigDecimal capaciteVolumeM3;
    private final String statut;
    private final String marqueModele;
    private final String typeVehicule;
    private final Integer annee;
    private final BigDecimal ptacTonnes;
    private final LocalDateTime createdAt;

    public VehiculeDTO(Vehicule entity) {
        this.vehiculeId = entity.getVehiculeId();
        this.immatriculation = entity.getImmatriculation();
        this.hubId = entity.getHub() != null ? entity.getHub().getHubId() : null;
        this.hubNom = entity.getHub() != null ? entity.getHub().getNom() : null;
        this.capacitePoidsKg = entity.getCapacitePoidsKg();
        this.capaciteVolumeM3 = entity.getCapaciteVolumeM3();
        this.statut = entity.getStatut() != null ? entity.getStatut().name() : null;
        this.marqueModele = entity.getMarqueModele();
        this.typeVehicule = entity.getTypeVehicule() != null ? entity.getTypeVehicule().name() : null;
        this.annee = entity.getAnnee();
        this.ptacTonnes = entity.getPtacTonnes();
        this.createdAt = entity.getCreatedAt();
    }
}
