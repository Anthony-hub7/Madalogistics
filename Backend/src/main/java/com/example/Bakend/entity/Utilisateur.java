package com.example.Bakend.entity;

import com.example.Bakend.entity.enums.Role;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Utilisateur (gestionnaire, chauffeur, direction, admin_saas).
 * Table : utilisateur — tenant_id NULL si ADMIN_SAAS (transverse).
 */
@Entity
@Table(name = "utilisateur")
@Getter
@Setter
@NoArgsConstructor
public class Utilisateur {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "utilisateur_id", nullable = false, updatable = false)
    private UUID utilisateurId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id")
    private PMECliente pmeCliente;

    @Column(name = "nom", nullable = false, length = 255)
    private String nom;

    @Column(name = "email", nullable = false, length = 255, unique = true)
    private String email;

    @Column(name = "mot_de_passe_hash", nullable = false, length = 255)
    private String motDePasseHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 30)
    private Role role;

    @Column(name = "habilite_valeur", columnDefinition = "BOOLEAN DEFAULT false")
    private boolean habiliteValeur;

    // ── V6 : identité étendue (inscription chauffeur) ──
    @Column(name = "cin", length = 20, unique = true)
    private String cin;

    @Column(name = "date_naissance")
    private LocalDate dateNaissance;

    @Column(name = "sexe", length = 1)
    private String sexe;

    @Column(name = "adresse", length = 500)
    private String adresse;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_final_id")
    private ClientFinal clientFinal;

    @OneToOne(mappedBy = "utilisateur")
    private Chauffeur chauffeur;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
