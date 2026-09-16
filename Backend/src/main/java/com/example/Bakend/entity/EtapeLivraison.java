package com.example.Bakend.entity;

import com.example.Bakend.entity.enums.TypeEtape;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Étape de livraison d'une tournée (collecte ou livraison d'un colis).
 * Table : etape_livraison
 */
@Entity
@Table(name = "etape_livraison")
@Getter
@Setter
@NoArgsConstructor
public class EtapeLivraison {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "etape_id", nullable = false, updatable = false)
    private UUID etapeId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private PMECliente pmeCliente;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tournee_id", nullable = false)
    private Tournee tournee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "colis_id", nullable = false)
    private Colis colis;

    @Column(name = "ordre", nullable = false)
    private Integer ordre;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_etape", nullable = false, length = 20)
    private TypeEtape typeEtape;

    @Column(name = "date_heure_prevue")
    private LocalDateTime dateHeurePrevue;

    @Column(name = "date_heure_reelle")
    private LocalDateTime dateHeureReelle;

    // POD (preuve de livraison)
    @Column(name = "photo_url", columnDefinition = "TEXT")
    private String photoUrl;

    @Column(name = "signature_nom", length = 255)
    private String signatureNom;

    @Column(name = "date_signature")
    private LocalDateTime dateSignature;
}
