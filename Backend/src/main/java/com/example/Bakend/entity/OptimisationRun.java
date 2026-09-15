package com.example.Bakend.entity;

import com.example.Bakend.entity.enums.TypeAlgorithme;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Run d'optimisation (Knapsack / Bin Packing / Affectation / VRP).
 * Table : optimisation_run
 */
@Entity
@Table(name = "optimisation_run")
@Getter
@Setter
@NoArgsConstructor
public class OptimisationRun {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "run_id", nullable = false, updatable = false)
    private UUID runId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private PMECliente pmeCliente;

    // V12 : hub_id nullable pour CLUSTERING tenant-scoped
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hub_id")
    private Hub hub;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_algorithme", nullable = false, length = 30)
    private TypeAlgorithme typeAlgorithme;

    @Column(name = "parametres", columnDefinition = "jsonb")
    private String parametres;

    @Column(name = "resultat", columnDefinition = "jsonb")
    private String resultat;

    @Column(name = "justification_document", columnDefinition = "TEXT")
    private String justificationDocument;

    @Column(name = "duree_calcul_ms")
    private Integer dureeCalculMs;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "runGroupage")
    private List<Sac> sacsGroupage = new ArrayList<>();

    @OneToMany(mappedBy = "runAffectation")
    private List<Sac> sacsAffectation = new ArrayList<>();

    @OneToMany(mappedBy = "runVrp")
    private List<Tournee> tournees = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
