package com.example.Bakend.repository;

import com.example.Bakend.entity.Hub;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository du hub (point de regroupement d'un tenant).
 * Couche repository : uniquement des requêtes JPA/JPQL, pas de logique métier.
 */
public interface HubRepository extends JpaRepository<Hub, UUID> {

    List<Hub> findByPmeClienteTenantId(UUID tenantId);

    Optional<Hub> findByPmeClienteTenantIdAndHubId(UUID tenantId, UUID hubId);

    boolean existsByPmeClienteTenantIdAndNom(UUID tenantId, String nom);

    @Query("SELECT h FROM Hub h WHERE h.pmeCliente.tenantId = :tenantId ORDER BY h.nom ASC")
    List<Hub> rechercherParTenant(@Param("tenantId") UUID tenantId);

    @Query("SELECT h FROM Hub h WHERE h.pmeCliente.tenantId = :tenantId AND h.zoneSecuriseeDispo = true ORDER BY h.nom ASC")
    List<Hub> rechercherAvecZoneSecurisee(@Param("tenantId") UUID tenantId);
}
