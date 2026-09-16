package com.example.Bakend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Hub de regroupement d'un tenant.
 * Table : hub
 */
@Entity
@Table(name = "hub")
@Getter
@Setter
@NoArgsConstructor
public class Hub {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "hub_id", nullable = false, updatable = false)
    private UUID hubId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private PMECliente pmeCliente;

    @Column(name = "nom", nullable = false, length = 255)
    private String nom;

    @Column(name = "zone_securisee_dispo", nullable = false)
    private boolean zoneSecuriseeDispo = false;

    @Column(name = "adresse", length = 500)
    private String adresse;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "actif", nullable = false)
    private boolean actif = true;

    @Column(name = "horaires", length = 100)
    private String horaires;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "hub")
    private List<Vehicule> vehicules = new ArrayList<>();

    @OneToMany(mappedBy = "hub")
    private List<DemandeTransport> demandes = new ArrayList<>();

    @OneToMany(mappedBy = "hub")
    private List<OptimisationRun> optimisationRuns = new ArrayList<>();

    @OneToMany(mappedBy = "hub")
    private List<Sac> sacs = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
