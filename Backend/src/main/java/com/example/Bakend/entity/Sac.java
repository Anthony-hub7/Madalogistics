package com.example.Bakend.entity;

import com.example.Bakend.entity.enums.SacStatut;
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
 * Sac — unite operationnelle du groupage (chargement d'un vehicule).
 * Table : sac
 *
 * V12 : categorie_dominante etendue de CHAR(1) a VARCHAR(20) (classe_code dynamique).
 */
@Entity
@Table(name = "sac")
@Getter
@Setter
@NoArgsConstructor
public class Sac {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "sac_id", nullable = false, updatable = false)
    private UUID sacId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private PMECliente pmeCliente;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "hub_id", nullable = false)
    private Hub hub;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicule_id")
    private Vehicule vehicule;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chauffeur_id")
    private Chauffeur chauffeur;

    // V12 : VARCHAR(20) dynamique (classe_code), pas plus ClasseValeur enum
    @Column(name = "categorie_dominante", length = 20)
    private String categorieDominante;

    @Column(name = "taux_remplissage", precision = 5, scale = 2)
    private BigDecimal tauxRemplissage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "run_groupage_id")
    private OptimisationRun runGroupage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "run_affectation_id")
    private OptimisationRun runAffectation;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false, length = 30)
    private SacStatut statut = SacStatut.CONSTITUE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "sac")
    private List<Colis> colis = new ArrayList<>();

    @OneToMany(mappedBy = "sac")
    private List<Tournee> tournees = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
