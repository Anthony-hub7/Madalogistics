package com.example.Bakend.repository;

import com.example.Bakend.entity.ClientFinal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository du client final (demandeur de transport d'une PME cliente).
 * Couche repository : uniquement des requêtes JPA/JPQL, pas de logique métier.
 */
public interface ClientFinalRepository extends JpaRepository<ClientFinal, UUID> {

    Optional<ClientFinal> findByClientFinalId(UUID clientFinalId);

    List<ClientFinal> findByPmeClienteTenantId(UUID tenantId);

    Optional<ClientFinal> findByPmeClienteTenantIdAndClientFinalId(UUID tenantId, UUID clientFinalId);

    boolean existsByPmeClienteTenantIdAndNom(UUID tenantId, String nom);

    Optional<ClientFinal> findByPmeClienteTenantIdAndNom(UUID tenantId, String nom);

    @Query("SELECT c FROM ClientFinal c WHERE c.pmeCliente.tenantId = :tenantId ORDER BY c.nom ASC")
    List<ClientFinal> rechercherParTenant(@Param("tenantId") UUID tenantId);

    @Query("SELECT COUNT(c) FROM ClientFinal c WHERE c.pmeCliente.tenantId = :tenantId")
    long compterParTenant(@Param("tenantId") UUID tenantId);
}
