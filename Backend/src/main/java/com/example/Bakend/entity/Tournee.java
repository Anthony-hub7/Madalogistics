package com.example.Bakend.entity;

import com.example.Bakend.entity.enums.TourneeStatut;
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
 * Tournée — séquencement VRP d'un Sac (optionnel en V1).
 * Table : tournee
 */
@Entity
@Table(name = "tournee")
@Getter
@Setter
@NoArgsConstructor
public class Tournee {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "tournee_id", nullable = false, updatable = false)
    private UUID tourneeId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private PMECliente pmeCliente;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sac_id", nullable = false)
    private Sac sac;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "run_vrp_id")
    private OptimisationRun runVrp;

    @Column(name = "distance_totale_km", precision = 10, scale = 2)
    private BigDecimal distanceTotaleKm;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false, length = 30)
    private TourneeStatut statut = TourneeStatut.PLANIFIEE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "tournee", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<EtapeLivraison> etapes = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
