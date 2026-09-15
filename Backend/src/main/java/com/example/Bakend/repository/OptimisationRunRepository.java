package com.example.Bakend.repository;

import com.example.Bakend.entity.OptimisationRun;
import com.example.Bakend.entity.enums.TypeAlgorithme;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

/**
 * Repository des runs d'optimisation (Knapsack / Bin Packing / Affectation / VRP / Clustering).
 * Couche repository : uniquement des requêtes JPA/JPQL.
 */
public interface OptimisationRunRepository extends JpaRepository<OptimisationRun, UUID> {

    List<OptimisationRun> findByPmeClienteTenantId(UUID tenantId);

    List<OptimisationRun> findByPmeClienteTenantIdAndHubHubId(UUID tenantId, UUID hubId);

    List<OptimisationRun> findByPmeClienteTenantIdAndTypeAlgorithme(UUID tenantId, TypeAlgorithme typeAlgorithme);

    @Query("SELECT r FROM OptimisationRun r WHERE r.pmeCliente.tenantId = :tenantId ORDER BY r.createdAt DESC")
    List<OptimisationRun> rechercherParTenant(@Param("tenantId") UUID tenantId);
}
