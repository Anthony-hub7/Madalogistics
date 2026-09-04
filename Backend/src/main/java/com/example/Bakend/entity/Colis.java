package com.example.Bakend.entity;

import com.example.Bakend.entity.enums.ColisEtat;
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
 * Colis — unité physique de marchandise composant une DemandeTransport.
 * Table : colis
 */
@Entity
@Table(name = "colis")
@Getter
@Setter
@NoArgsConstructor
public class Colis {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "colis_id", nullable = false, updatable = false)
    private UUID colisId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private PMECliente pmeCliente;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "demande_id", nullable = false)
    private DemandeTransport demande;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categorie_id")
    private CategorieProduit categorie;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sac_id")
    private Sac sac;

    @Column(name = "poids_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal poidsKg;

    @Column(name = "volume_m3", nullable = false, precision = 10, scale = 2)
    private BigDecimal volumeM3;

    @Enumerated(EnumType.STRING)
    @Column(name = "etat", nullable = false, length = 30)
    private ColisEtat etat = ColisEtat.EN_ATTENTE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "colis", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Incident> incidents = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
