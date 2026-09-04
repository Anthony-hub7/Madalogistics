package com.example.Bakend.repository;

import com.example.Bakend.entity.PMECliente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository de la PME cliente (tenant).
 * Inscription d'une entreprise : création + contrôle d'unicité du nom.
 * Couche repository : uniquement des requêtes JPA/JPQL, pas de logique métier.
 */
public interface PMEClienteRepository extends JpaRepository<PMECliente, UUID> {

    Optional<PMECliente> findByTenantId(UUID tenantId);

    Optional<PMECliente> findByNomEntreprise(String nomEntreprise);

    boolean existsByNomEntreprise(String nomEntreprise);

    boolean existsByTenantId(UUID tenantId);

    @Query("SELECT p FROM PMECliente p WHERE LOWER(p.nomEntreprise) LIKE LOWER(CONCAT('%', :keyword, '%')) ORDER BY p.createdAt DESC")
    List<PMECliente> rechercherParNom(@Param("keyword") String keyword);

    @Query("SELECT COUNT(p) FROM PMECliente p")
    long compterTousLesTenants();

    @Query("SELECT p FROM PMECliente p ORDER BY p.createdAt DESC")
    List<PMECliente> findAllOrderByCreatedAtDesc();
}
