package com.example.Bakend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Features ML denormalisees pour un colis (table separee, V12).
 * Table : colis_features
 *
 * Pas de modification de colis (table metier, trop de dependances FK).
 * Cle composite (colis_id, tenant_id) pour RLS + requis ML.
 * categorie_predite_id + distance_prediction denormalises (pas de parsing JSONB).
 */
@Entity
@Table(name = "colis_features")
@IdClass(ColisFeatureId.class)
@Getter
@Setter
@NoArgsConstructor
public class ColisFeature {

    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "colis_id", nullable = false)
    private Colis colis;

    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private PMECliente pmeCliente;

    @Column(name = "fragilite_0_10")
    private Short fragilite010;

    @Column(name = "valeur_estimee_ar", precision = 12, scale = 2)
    private BigDecimal valeurEstimeeAr;

    @Column(name = "delai_express", nullable = false)
    private Boolean delaiExpress = false;

    // --- Prediction ML denormalisee ---
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categorie_predite_id")
    private CategorieProduit categoriePredite;

    @Column(name = "distance_prediction", precision = 8, scale = 4)
    private BigDecimal distancePrediction;

    @Column(name = "correction_manuelle", nullable = false)
    private Boolean correctionManuelle = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

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
