package com.example.Bakend.repository;

import com.example.Bakend.entity.OptimisationRun;
import com.example.Bakend.entity.enums.TypeAlgorithme;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

/**
 * Repository des runs d'optimisation (Knapsack / Bin Packing / Affectation / VRP).
 * Couche repository : uniquement des requêtes JPA/JPQL (+ recherche sémantique pgvector en natif).
 */
public interface OptimisationRunRepository extends JpaRepository<OptimisationRun, UUID> {

    List<OptimisationRun> findByPmeClienteTenantId(UUID tenantId);

    List<OptimisationRun> findByPmeClienteTenantIdAndHubHubId(UUID tenantId, UUID hubId);

    List<OptimisationRun> findByPmeClienteTenantIdAndTypeAlgorithme(UUID tenantId, TypeAlgorithme typeAlgorithme);

    @Query("SELECT r FROM OptimisationRun r WHERE r.pmeCliente.tenantId = :tenantId ORDER BY r.createdAt DESC")
    List<OptimisationRun> rechercherParTenant(@Param("tenantId") UUID tenantId);

    /**
     * Recherche sémantique sur les justifications passées (pgvector, distance cosinus).
     * La valeur du vecteur est fournie en chaîne au format pgvector (ex. "[0.1,0.2,...]").
     */
    @Query(value = """
            SELECT run_id, justification_document, parametres, resultat, duree_calcul_ms, created_at,
                   1 - (justification_embedding <=> CAST(:embedding AS vector)) AS similarite
            FROM optimisation_run
            WHERE tenant_id = :tenantId AND justification_embedding IS NOT NULL
            ORDER BY justification_embedding <=> CAST(:embedding AS vector)
            LIMIT :limit
            """, nativeQuery = true)
    List<Object[]> rechercheSemantique(@Param("tenantId") UUID tenantId, @Param("embedding") String embedding, @Param("limit") int limit);
}
