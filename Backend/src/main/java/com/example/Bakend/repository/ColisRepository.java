package com.example.Bakend.repository;

import com.example.Bakend.entity.Colis;
import com.example.Bakend.entity.enums.ColisEtat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

/**
 * Repository du colis (unité physique de marchandise).
 * Couche repository : uniquement des requêtes JPA/JPQL, pas de logique métier.
 */
public interface ColisRepository extends JpaRepository<Colis, UUID> {

    List<Colis> findByPmeClienteTenantId(UUID tenantId);

    List<Colis> findByDemandeDemandeId(UUID demandeId);

    List<Colis> findBySacSacId(UUID sacId);

    List<Colis> findByPmeClienteTenantIdAndSacIsNull(UUID tenantId);

    List<Colis> findByPmeClienteTenantIdAndEtat(UUID tenantId, ColisEtat etat);

    @Query("SELECT c FROM Colis c WHERE c.demande.demandeId = :demandeId ORDER BY c.createdAt ASC")
    List<Colis> rechercherParDemande(@Param("demandeId") UUID demandeId);

    @Query("SELECT c FROM Colis c WHERE c.pmeCliente.tenantId = :tenantId AND c.sac IS NULL AND c.etat = :etat ORDER BY c.createdAt ASC")
    List<Colis> rechercherNonGroupesParEtat(@Param("tenantId") UUID tenantId, @Param("etat") ColisEtat etat);
}
