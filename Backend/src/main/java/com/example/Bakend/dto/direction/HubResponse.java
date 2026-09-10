package com.example.Bakend.dto.direction;

import com.example.Bakend.entity.Hub;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
public class HubResponse {

    private final UUID hubId;
    private final String nom;
    private final String adresse;
    private final Double latitude;
    private final Double longitude;
    private final boolean zoneSecuriseeDispo;
    private final boolean actif;
    private final LocalDateTime createdAt;

    public HubResponse(Hub entity) {
        this.hubId = entity.getHubId();
        this.nom = entity.getNom();
        this.adresse = entity.getAdresse();
        this.latitude = entity.getLatitude();
        this.longitude = entity.getLongitude();
        this.zoneSecuriseeDispo = entity.isZoneSecuriseeDispo();
        this.actif = entity.isActif();
        this.createdAt = entity.getCreatedAt();
    }
}
