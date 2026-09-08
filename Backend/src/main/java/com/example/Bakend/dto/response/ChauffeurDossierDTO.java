package com.example.Bakend.dto.response;

import com.example.Bakend.entity.Chauffeur;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO de lecture pour les dossiers de chauffeur (admin SAAS).
 * Exclut les byte[] permisScan (accessible via DocumentController).
 * Exclut les collections lazy et les relations proxy.
 */
@Getter
public class ChauffeurDossierDTO {

    private final UUID chauffeurId;
    private final String nom;
    private final String email;
    private final String telephone;
    private final String cin;
    private final String sexe;
    private final String adresse;
    private final String permisNumero;
    private final String permisCategorie;
    private final String permisCategories;
    private final LocalDate permisExpiration;
    private final boolean hasPermisScan;
    private final Integer experienceAnnees;
    private final String typeChauffeur;
    private final String statutDossier;
    private final String motifRefus;
    private final boolean disponible;

    // Véhicule info (pas lazy car ManyToOne EAGER ou accès direct)
    private final String immatriculation;
    private final String marqueModele;
    private final String typeVehicule;

    private final LocalDateTime createdAt;

    public ChauffeurDossierDTO(Chauffeur entity) {
        this.chauffeurId = entity.getChauffeurId();
        this.nom = entity.getUtilisateur() != null ? entity.getUtilisateur().getNom() : null;
        this.email = entity.getUtilisateur() != null ? entity.getUtilisateur().getEmail() : null;
        this.cin = entity.getUtilisateur() != null ? entity.getUtilisateur().getCin() : null;
        this.sexe = entity.getUtilisateur() != null ? entity.getUtilisateur().getSexe() : null;
        this.adresse = entity.getUtilisateur() != null ? entity.getUtilisateur().getAdresse() : null;
        this.telephone = entity.getTelephone();
        this.permisNumero = entity.getPermisNumero();
        this.permisCategorie = entity.getPermisCategorie();
        this.permisCategories = entity.getPermisCategories();
        this.permisExpiration = entity.getPermisExpiration();
        this.hasPermisScan = entity.getPermisScan() != null && entity.getPermisScan().length > 0;
        this.experienceAnnees = entity.getExperienceAnnees();
        this.typeChauffeur = entity.getTypeChauffeur();
        this.statutDossier = entity.getStatutDossier();
        this.motifRefus = entity.getMotifRefus();
        this.disponible = entity.isDisponible();

        if (entity.getVehicule() != null) {
            this.immatriculation = entity.getVehicule().getImmatriculation();
            this.marqueModele = entity.getVehicule().getMarqueModele();
            this.typeVehicule = entity.getVehicule().getTypeVehicule();
        } else {
            this.immatriculation = null;
            this.marqueModele = null;
            this.typeVehicule = null;
        }

        this.createdAt = entity.getCreatedAt();
    }
}
