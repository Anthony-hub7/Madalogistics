package com.example.Bakend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Notification simple par tenant (version minimale) : alerte incident
 * vehicule et annulation de sac, lue via polling frontend.
 * Table : notification
 */
@Entity
@Table(name = "notification")
@Getter
@Setter
@NoArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "notification_id", nullable = false, updatable = false)
    private UUID notificationId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private PMECliente pmeCliente;

    /** Role destinataire du broadcast : GESTIONNAIRE, CLIENT_FINAL, ... */
    @Column(name = "destinataire_role", nullable = false, length = 30)
    private String destinataireRole;

    /** Type : INCIDENT_DECLARE, SAC_ANNULE */
    @Column(name = "type", nullable = false, length = 50)
    private String type;

    @Column(name = "titre", nullable = false, length = 255)
    private String titre;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sac_id")
    private Sac sac;

    @Column(name = "lu", nullable = false)
    private boolean lu = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
