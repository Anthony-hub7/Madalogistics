package com.example.Bakend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Grille tarifaire d'un tenant, liée à une catégorie.
 * Table : grille_tarifaire
 *
 * V15 : prix par catégorie + prix/km. categorie_id NULL = tarif de repli global.
 */
@Entity
@Table(name = "grille_tarifaire")
@Getter
@Setter
@NoArgsConstructor
public class GrilleTarifaire {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "grille_id", nullable = false, updatable = false)
    private UUID grilleId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private PMECliente pmeCliente;

    @Column(name = "libelle", nullable = false, length = 255)
    private String libelle;

    @Column(name = "prix_par_kg", precision = 10, scale = 2)
    private BigDecimal prixParKg;

    @Column(name = "prix_par_m3", precision = 10, scale = 2)
    private BigDecimal prixParM3;

    @Column(name = "prix_par_km", precision = 10, scale = 2)
    private BigDecimal prixParKm;

    @Column(name = "prix_minimum", precision = 10, scale = 2)
    private BigDecimal prixMinimum;

    // V15 : lien vers catégorie (NULL = tarif de repli global)
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "categorie_id")
    private CategorieProduit categorie;

    @Column(name = "actif", nullable = false)
    private boolean actif = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
