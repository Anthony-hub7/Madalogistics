package com.example.Bakend.dto.response;

import com.example.Bakend.entity.PMECliente;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO de lecture pour les dossiers d'agence (admin SAAS).
 * Exclut les byte[] documents (accessibles via DocumentController).
 * Exclut les collections lazy (hubs, chauffeurs, etc.)
 */
@Getter
public class AgenceDossierDTO {

    private final UUID tenantId;
    private final String nomEntreprise;
    private final String nif;
    private final String stat;
    private final String telephone;
    private final String adresse;
    private final String siteWeb;
    private final String statutDossier;
    private final String motifRefus;
    private final boolean hasKbis;
    private final boolean hasAttestation;
    private final boolean hasAssurance;
    private final LocalDateTime createdAt;

    public AgenceDossierDTO(PMECliente entity) {
        this.tenantId = entity.getTenantId();
        this.nomEntreprise = entity.getNomEntreprise();
        this.nif = entity.getNif();
        this.stat = entity.getStat();
        this.telephone = entity.getTelephone();
        this.adresse = entity.getAdresse();
        this.siteWeb = entity.getSiteWeb();
        this.statutDossier = entity.getStatutDossier();
        this.motifRefus = entity.getMotifRefus();
        this.hasKbis = entity.getDocumentKbis() != null && entity.getDocumentKbis().length > 0;
        this.hasAttestation = entity.getDocumentAttestation() != null && entity.getDocumentAttestation().length > 0;
        this.hasAssurance = entity.getDocumentAssurance() != null && entity.getDocumentAssurance().length > 0;
        this.createdAt = entity.getCreatedAt();
    }
}
