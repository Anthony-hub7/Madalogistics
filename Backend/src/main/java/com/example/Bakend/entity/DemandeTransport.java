package com.example.Bakend.entity;

import com.example.Bakend.entity.enums.DemandeStatut;
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
 * Demande de transport (la commande du client final).
 * Table : demande_transport
 */
@Entity
@Table(name = "demande_transport")
@Getter
@Setter
@NoArgsConstructor
public class DemandeTransport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "demande_id", nullable = false, updatable = false)
    private UUID demandeId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private PMECliente pmeCliente;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "client_final_id", nullable = false)
    private ClientFinal clientFinal;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "hub_id", nullable = false)
    private Hub hub;

    @Column(name = "adresse_collecte", length = 500)
    private String adresseCollecte;

    @Column(name = "adresse_livraison", length = 500)
    private String adresseLivraison;

    @Column(name = "tarif", precision = 10, scale = 2)
    private BigDecimal tarif;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false, length = 30)
    private DemandeStatut statut = DemandeStatut.CREEE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "demande", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Colis> colis = new ArrayList<>();

    @OneToOne(mappedBy = "demande")
    private Facture facture;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
