package com.example.Bakend.repository;

import com.example.Bakend.entity.Sac;
import com.example.Bakend.entity.enums.SacStatut;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

/**
 * Repository du sac (unité opérationnelle du groupage).
 * Couche repository : uniquement des requêtes JPA/JPQL, pas de logique métier.
 */
public interface SacRepository extends JpaRepository<Sac, UUID> {

    List<Sac> findByPmeClienteTenantId(UUID tenantId);

    List<Sac> findByPmeClienteTenantIdAndHubHubId(UUID tenantId, UUID hubId);

    List<Sac> findByPmeClienteTenantIdAndStatut(UUID tenantId, SacStatut statut);

    List<Sac> findByVehiculeVehiculeId(UUID vehiculeId);

    List<Sac> findByChauffeurChauffeurId(UUID chauffeurId);

    @Query("SELECT s FROM Sac s WHERE s.pmeCliente.tenantId = :tenantId AND s.hub.hubId = :hubId AND s.statut = :statut ORDER BY s.createdAt ASC")
    List<Sac> rechercherParHubEtStatut(@Param("tenantId") UUID tenantId, @Param("hubId") UUID hubId, @Param("statut") SacStatut statut);

    @Query("SELECT COUNT(s) FROM Sac s WHERE s.pmeCliente.tenantId = :tenantId AND s.statut = :statut")
    long compterParStatut(@Param("tenantId") UUID tenantId, @Param("statut") SacStatut statut);
}
