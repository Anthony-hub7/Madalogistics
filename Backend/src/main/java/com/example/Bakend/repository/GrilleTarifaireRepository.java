package com.example.Bakend.repository;

import com.example.Bakend.entity.GrilleTarifaire;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository de la grille tarifaire d'un tenant.
 * Couche repository : uniquement des requêtes JPA/JPQL, pas de logique métier.
 */
public interface GrilleTarifaireRepository extends JpaRepository<GrilleTarifaire, UUID> {

    List<GrilleTarifaire> findByPmeClienteTenantId(UUID tenantId);

    Optional<GrilleTarifaire> findByGrilleId(UUID grilleId);

    Optional<GrilleTarifaire> findByPmeClienteTenantIdAndActifTrue(UUID tenantId);

    List<GrilleTarifaire> findByPmeClienteTenantIdAndActifTrueOrderByLibelleAsc(UUID tenantId);

    @Query("SELECT g FROM GrilleTarifaire g WHERE g.pmeCliente.tenantId = :tenantId ORDER BY g.actif DESC, g.libelle ASC")
    List<GrilleTarifaire> rechercherParTenant(@Param("tenantId") UUID tenantId);
}
