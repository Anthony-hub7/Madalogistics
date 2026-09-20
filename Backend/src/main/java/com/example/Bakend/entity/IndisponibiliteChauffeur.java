package com.example.Bakend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Indisponibilite d'un chauffeur sur une periode donnee.
 * Table : indisponibilite_chauffeur
 */
@Entity
@Table(name = "indisponibilite_chauffeur")
@Getter
@Setter
@NoArgsConstructor
public class IndisponibiliteChauffeur {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "indispo_id", nullable = false, updatable = false)
    private UUID indispoId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private PMECliente pmeCliente;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "chauffeur_id", nullable = false)
    private Chauffeur chauffeur;

    @Column(name = "debut", nullable = false)
    private LocalDateTime debut;

    @Column(name = "fin", nullable = false)
    private LocalDateTime fin;

    @Column(name = "motif", columnDefinition = "TEXT")
    private String motif;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
