package com.example.Bakend.repository;

import com.example.Bakend.entity.Incident;
import com.example.Bakend.entity.enums.IncidentStatut;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

/**
 * Repository des incidents (casse, retard, perte) sur un colis.
 * Couche repository : uniquement des requêtes JPA/JPQL, pas de logique métier.
 */
public interface IncidentRepository extends JpaRepository<Incident, UUID> {

    List<Incident> findByPmeClienteTenantId(UUID tenantId);

    List<Incident> findByColisColisId(UUID colisId);

    List<Incident> findByPmeClienteTenantIdAndStatut(UUID tenantId, IncidentStatut statut);

    @Query("SELECT i FROM Incident i WHERE i.pmeCliente.tenantId = :tenantId ORDER BY i.createdAt DESC")
    List<Incident> rechercherParTenant(@Param("tenantId") UUID tenantId);

    @Query("SELECT COUNT(i) FROM Incident i WHERE i.pmeCliente.tenantId = :tenantId AND i.statut = :statut")
    long compterParStatut(@Param("tenantId") UUID tenantId, @Param("statut") IncidentStatut statut);
}
