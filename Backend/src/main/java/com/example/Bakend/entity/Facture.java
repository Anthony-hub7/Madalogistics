package com.example.Bakend.entity;

import com.example.Bakend.entity.enums.FactureStatut;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Facture générée à la livraison.
 * Table : facture — demande_id UNIQUE (une facture par demande)
 */
@Entity
@Table(name = "facture")
@Getter
@Setter
@NoArgsConstructor
public class Facture {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "facture_id", nullable = false, updatable = false)
    private UUID factureId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private PMECliente pmeCliente;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "demande_id", nullable = false, unique = true)
    private DemandeTransport demande;

    @Column(name = "montant_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal montantTotal;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false, length = 30)
    private FactureStatut statut = FactureStatut.EMISE;

    @Column(name = "date_emission", nullable = false, updatable = false)
    private LocalDateTime dateEmission;

    @PrePersist
    protected void onCreate() {
        dateEmission = LocalDateTime.now();
    }
}
