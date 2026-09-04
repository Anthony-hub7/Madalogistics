package com.example.Bakend.entity;

import com.example.Bakend.entity.enums.VehiculeStatut;
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
 * Véhicule d'un tenant, rattaché à un hub.
 * Table : vehicule
 */
@Entity
@Table(name = "vehicule")
@Getter
@Setter
@NoArgsConstructor
public class Vehicule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "vehicule_id", nullable = false, updatable = false)
    private UUID vehiculeId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private PMECliente pmeCliente;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hub_id")
    private Hub hub;

    @Column(name = "immatriculation", nullable = false, length = 50)
    private String immatriculation;

    @Column(name = "capacite_poids_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal capacitePoidsKg;

    @Column(name = "capacite_volume_m3", nullable = false, precision = 10, scale = 2)
    private BigDecimal capaciteVolumeM3;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false, length = 30)
    private VehiculeStatut statut = VehiculeStatut.DISPONIBLE;

    // ── V6 : détail véhicule étendu ──
    @Column(name = "marque_modele", length = 255)
    private String marqueModele;

    @Column(name = "type_vehicule", length = 100)
    private String typeVehicule;

    @Column(name = "annee")
    private Integer annee;

    @Column(name = "ptac_tonnes", precision = 6, scale = 2)
    private BigDecimal ptacTonnes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "vehicule")
    private List<Chauffeur> chauffeurs = new ArrayList<>();

    @OneToMany(mappedBy = "vehicule")
    private List<CompatibiliteChauffeurVehicule> compatibilites = new ArrayList<>();

    @OneToMany(mappedBy = "vehicule")
    private List<Sac> sacs = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
