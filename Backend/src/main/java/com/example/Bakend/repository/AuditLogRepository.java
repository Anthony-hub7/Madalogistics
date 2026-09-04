package com.example.Bakend.repository;

import com.example.Bakend.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

/**
 * Repository du journal d'audit (traçabilité BNF-08).
 * Couche repository : uniquement des requêtes JPA/JPQL, pas de logique métier.
 */
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    List<AuditLog> findByPmeClienteTenantId(UUID tenantId);

    List<AuditLog> findByEntiteAndEntiteId(String entite, UUID entiteId);

    List<AuditLog> findByUtilisateurUtilisateurId(UUID utilisateurId);

    @Query("SELECT a FROM AuditLog a WHERE a.pmeCliente.tenantId = :tenantId ORDER BY a.createdAt DESC")
    List<AuditLog> rechercherParTenant(@Param("tenantId") UUID tenantId);

    @Query("SELECT a FROM AuditLog a WHERE a.pmeCliente.tenantId = :tenantId AND a.entite = :entite AND a.entiteId = :entiteId ORDER BY a.createdAt DESC")
    List<AuditLog> rechercherHistoriqueEntite(@Param("tenantId") UUID tenantId, @Param("entite") String entite, @Param("entiteId") UUID entiteId);

    @Query("SELECT a FROM AuditLog a WHERE a.pmeCliente.tenantId = :tenantId AND a.utilisateur.utilisateurId = :utilisateurId ORDER BY a.createdAt DESC")
    List<AuditLog> rechercherParUtilisateur(@Param("tenantId") UUID tenantId, @Param("utilisateurId") UUID utilisateurId);
}
