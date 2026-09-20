package com.example.Bakend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * PME cliente (tenant) — racine du modèle multi-tenant.
 * Table : pme_cliente
 */
@Entity
@Table(name = "pme_cliente")
@Getter
@Setter
@NoArgsConstructor
public class PMECliente {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "tenant_id", nullable = false, updatable = false)
    private UUID tenantId;

    @Column(name = "nom_entreprise", nullable = false, length = 255)
    private String nomEntreprise;

    @Column(name = "seuil_remplissage_min", nullable = false, precision = 5, scale = 2)
    private BigDecimal seuilRemplissageMin;

    // V21 : marge de securite
    @Column(name = "marge_securite_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal margeSecuritePct = new BigDecimal("15.00");

    // ── V4 : inscription agence ──
    @Column(name = "nif", length = 50)
    private String nif;

    @Column(name = "stat", length = 50)
    private String stat;

    @Column(name = "telephone", length = 30)
    private String telephone;

    @Column(name = "adresse", length = 500)
    private String adresse;

    @Column(name = "site_web", length = 255)
    private String siteWeb;

    @Column(name = "document_kbis")
    private byte[] documentKbis;

    @Column(name = "document_attestation")
    private byte[] documentAttestation;

    @Column(name = "document_assurance")
    private byte[] documentAssurance;

    // ── V5 : workflow dossier ──
    @Column(name = "statut_dossier", nullable = false, length = 30)
    private String statutDossier = "EN_ATTENTE";

    @Column(name = "motif_refus", columnDefinition = "TEXT")
    private String motifRefus;

    // ── V12 : referentiel dynamique ML ──
    @Column(name = "seuil_ml_min_colis", nullable = false)
    private Integer seuilMlMinColis = 30;

    @Column(name = "clustering_dirty", nullable = false)
    private Boolean clusteringDirty = false;

    @Column(name = "referentiel_version", nullable = false)
    private Integer referentielVersion = 1;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "pmeCliente", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Hub> hubs = new ArrayList<>();

    @OneToMany(mappedBy = "pmeCliente", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ClientFinal> clientFinals = new ArrayList<>();

    @OneToMany(mappedBy = "pmeCliente", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CategorieProduit> categories = new ArrayList<>();

    @OneToMany(mappedBy = "pmeCliente", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Utilisateur> utilisateurs = new ArrayList<>();

    @OneToMany(mappedBy = "pmeCliente", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Vehicule> vehicules = new ArrayList<>();

    @OneToMany(mappedBy = "pmeCliente", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Chauffeur> chauffeurs = new ArrayList<>();

    @OneToMany(mappedBy = "pmeCliente", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<GrilleTarifaire> grillesTarifaires = new ArrayList<>();

    @OneToMany(mappedBy = "pmeCliente", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DemandeTransport> demandes = new ArrayList<>();

    @OneToMany(mappedBy = "pmeCliente", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OptimisationRun> optimisationRuns = new ArrayList<>();

    @OneToMany(mappedBy = "pmeCliente", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Sac> sacs = new ArrayList<>();

    @OneToMany(mappedBy = "pmeCliente", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Colis> colis = new ArrayList<>();

    @OneToMany(mappedBy = "pmeCliente", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Incident> incidents = new ArrayList<>();

    @OneToMany(mappedBy = "pmeCliente", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Facture> factures = new ArrayList<>();

    @OneToMany(mappedBy = "pmeCliente", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Tournee> tournees = new ArrayList<>();

    @OneToMany(mappedBy = "pmeCliente", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<EtapeLivraison> etapes = new ArrayList<>();

    @OneToMany(mappedBy = "pmeCliente", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AuditLog> auditLogs = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
