package com.example.Bakend.entity;

import com.example.Bakend.entity.id.CompatibiliteId;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * Compatibilité chauffeur &lt;-&gt; véhicule (a_ij dans le modèle mathématique).
 * Table : compatibilite_chauffeur_vehicule — PK composite (chauffeur_id, vehicule_id)
 */
@Entity
@Table(name = "compatibilite_chauffeur_vehicule")
@IdClass(CompatibiliteId.class)
@Getter
@Setter
@NoArgsConstructor
public class CompatibiliteChauffeurVehicule {

    @Id
    @Column(name = "chauffeur_id", nullable = false)
    private UUID chauffeurId;

    @Id
    @Column(name = "vehicule_id", nullable = false)
    private UUID vehiculeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chauffeur_id", insertable = false, updatable = false)
    private Chauffeur chauffeur;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicule_id", insertable = false, updatable = false)
    private Vehicule vehicule;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private PMECliente pmeCliente;

    @Column(name = "compatible", nullable = false)
    private boolean compatible = true;
}
