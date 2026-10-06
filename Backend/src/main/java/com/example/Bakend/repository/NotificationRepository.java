package com.example.Bakend.repository;

import com.example.Bakend.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Repository des notifications (broadcast par role, par tenant).
 */
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    @Query("SELECT n FROM Notification n WHERE n.pmeCliente.tenantId = :tenantId"
            + " AND (:role IS NULL OR n.destinataireRole = :role)"
            + " AND (:nonLues = false OR n.lu = false)"
            + " ORDER BY n.createdAt DESC")
    List<Notification> rechercher(@Param("tenantId") UUID tenantId,
                                 @Param("role") String role,
                                 @Param("nonLues") boolean nonLues);

    /** Idempotence du signalement : une alerte recente pour le meme sac et type. */
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.pmeCliente.tenantId = :tenantId"
            + " AND n.sac.sacId = :sacId AND n.type = :type AND n.createdAt >= :depuis")
    long compterRecentes(@Param("tenantId") UUID tenantId,
                         @Param("sacId") UUID sacId,
                         @Param("type") String type,
                         @Param("depuis") LocalDateTime depuis);

    @Query("SELECT COUNT(n) FROM Notification n WHERE n.pmeCliente.tenantId = :tenantId"
            + " AND n.destinataireRole = :role AND n.lu = false")
    long compterNonLues(@Param("tenantId") UUID tenantId, @Param("role") String role);
}
