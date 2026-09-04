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
 * Client final d'une PME cliente (demandeur de transport).
 * Table : client_final
 */
@Entity
@Table(name = "client_final")
@Getter
@Setter
@NoArgsConstructor
public class ClientFinal {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "client_final_id", nullable = false, updatable = false)
    private UUID clientFinalId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private PMECliente pmeCliente;

    @Column(name = "nom", nullable = false, length = 255)
    private String nom;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "clientFinal")
    private List<DemandeTransport> demandes = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
