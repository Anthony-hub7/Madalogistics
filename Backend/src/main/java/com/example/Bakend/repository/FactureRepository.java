package com.example.Bakend.repository;

import com.example.Bakend.entity.Facture;
import com.example.Bakend.entity.enums.FactureStatut;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository des factures (une facture par demande).
 * Couche repository : uniquement des requêtes JPA/JPQL, pas de logique métier.
 */
public interface FactureRepository extends JpaRepository<Facture, UUID> {

    Optional<Facture> findByDemandeDemandeId(UUID demandeId);

    List<Facture> findByPmeClienteTenantId(UUID tenantId);

    List<Facture> findByPmeClienteTenantIdAndStatut(UUID tenantId, FactureStatut statut);

    Optional<Facture> findByPmeClienteTenantIdAndFactureId(UUID tenantId, UUID factureId);

    @Query("SELECT f FROM Facture f WHERE f.pmeCliente.tenantId = :tenantId ORDER BY f.dateEmission DESC")
    List<Facture> rechercherParTenant(@Param("tenantId") UUID tenantId);

    @Query("SELECT SUM(f.montantTotal) FROM Facture f WHERE f.pmeCliente.tenantId = :tenantId AND f.statut = :statut")
    java.math.BigDecimal sommeMontantsParStatut(@Param("tenantId") UUID tenantId, @Param("statut") FactureStatut statut);
}
