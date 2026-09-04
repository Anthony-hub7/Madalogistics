package com.example.Bakend.repository;

import com.example.Bakend.entity.Tournee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

/**
 * Repository des tournées (séquencement VRP d'un sac, optionnel en V1).
 * Couche repository : uniquement des requêtes JPA/JPQL, pas de logique métier.
 */
public interface TourneeRepository extends JpaRepository<Tournee, UUID> {

    List<Tournee> findByPmeClienteTenantId(UUID tenantId);

    List<Tournee> findBySacSacId(UUID sacId);

    @Query("SELECT t FROM Tournee t WHERE t.pmeCliente.tenantId = :tenantId ORDER BY t.createdAt DESC")
    List<Tournee> rechercherParTenant(@Param("tenantId") UUID tenantId);

    @Query("SELECT COUNT(t) FROM Tournee t WHERE t.sac.sacId = :sacId")
    long compterParSac(@Param("sacId") UUID sacId);
}
