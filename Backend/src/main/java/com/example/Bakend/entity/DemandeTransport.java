package com.example.Bakend.entity;

import com.example.Bakend.entity.enums.DemandeStatut;
import com.example.Bakend.entity.enums.ModeLivraison;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
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

    // Géolocalisation collecte
    @Column(name = "latitude_collecte")
    private Double latitudeCollecte;

    @Column(name = "longitude_collecte")
    private Double longitudeCollecte;

    // Géolocalisation livraison
    @Column(name = "latitude_livraison")
    private Double latitudeLivraison;

    @Column(name = "longitude_livraison")
    private Double longitudeLivraison;

    // Planning
    @Column(name = "date_souhaitee")
    private LocalDate dateSouhaitee;

    @Column(name = "creneau", length = 30)
    private String creneau;

    // Destinataire
    @Column(name = "nom_destinataire", length = 255)
    private String nomDestinataire;

    @Column(name = "tel_destinataire", length = 50)
    private String telDestinataire;

    @Column(name = "tarif", precision = 10, scale = 2)
    private BigDecimal tarif;

    // V14 : distance calculée (km)
    @Column(name = "distance_km", precision = 10, scale = 2)
    private BigDecimal distanceKm;

    // V20 : delais et date de depart
    @Column(name = "delai_transit_jours", precision = 6, scale = 2)
    private BigDecimal delaiTransitJours;

    @Column(name = "duree_trajet_heures", precision = 8, scale = 2)
    private BigDecimal dureeTrajetHeures;

    @Column(name = "source_delai", length = 20)
    private String sourceDelai;

    @Column(name = "date_depart_calculee")
    private LocalDate dateDepartCalculee;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false, length = 30)
    private DemandeStatut statut = DemandeStatut.CREEE;

    @Enumerated(EnumType.STRING)
    @Column(name = "mode_livraison", length = 20)
    private ModeLivraison modeLivraison;

    // Validation / refus
    @Column(name = "motif_refus", columnDefinition = "TEXT")
    private String motifRefus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "valide_par")
    private Utilisateur validePar;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "grille_id")
    private GrilleTarifaire grilleUtilisee;

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
