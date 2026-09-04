package com.example.Bakend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Détail métier du chauffeur, lié à un Utilisateur.
 * Table : chauffeur
 */
@Entity
@Table(name = "chauffeur")
@Getter
@Setter
@NoArgsConstructor
public class Chauffeur {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "chauffeur_id", nullable = false, updatable = false)
    private UUID chauffeurId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private PMECliente pmeCliente;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "utilisateur_id", nullable = false, unique = true)
    private Utilisateur utilisateur;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicule_id")
    private Vehicule vehicule;

    @Column(name = "telephone", length = 30)
    private String telephone;

    @Column(name = "disponible", nullable = false)
    private boolean disponible = true;

    // ── V6 : dossier chauffeur ──
    @Column(name = "permis_numero", length = 50)
    private String permisNumero;

    @Column(name = "permis_categorie", length = 10)
    private String permisCategorie;

    @Column(name = "permis_categories", length = 50)
    private String permisCategories;

    @Column(name = "permis_expiration")
    private LocalDate permisExpiration;

    @Column(name = "permis_scan")
    private byte[] permisScan;

    @Column(name = "experience_annees")
    private Integer experienceAnnees;

    @Column(name = "type_chauffeur", length = 20)
    private String typeChauffeur;

    @Column(name = "statut_dossier", nullable = false, length = 30)
    private String statutDossier = "EN_ATTENTE";

    @Column(name = "motif_refus", columnDefinition = "TEXT")
    private String motifRefus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agence_cible_id")
    private PMECliente agenceCible;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "chauffeur")
    private List<CompatibiliteChauffeurVehicule> compatibilites = new ArrayList<>();

    @OneToMany(mappedBy = "chauffeur")
    private List<Sac> sacs = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
