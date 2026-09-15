package com.example.Bakend.repository;

import com.example.Bakend.entity.ColisFeature;
import com.example.Bakend.entity.ColisFeatureId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

/**
 * Repository pour colis_features (V12) — features ML denormalisees.
 */
public interface ColisFeatureRepository extends JpaRepository<ColisFeature, ColisFeatureId> {

    List<ColisFeature> findByPmeClienteTenantId(UUID tenantId);

    // Features pour le clustering : toutes les features du tenant avec fragilite/valeur/delai remplis
    @Query("SELECT cf FROM ColisFeature cf WHERE cf.pmeCliente.tenantId = :tenantId " +
           "AND cf.fragilite010 IS NOT NULL AND cf.valeurEstimeeAr IS NOT NULL")
    List<ColisFeature> findFeaturesForClustering(@Param("tenantId") UUID tenantId);

    // Features pour l'infrence : un colis specifique
    ColisFeature findByColisColisIdAndPmeClienteTenantId(UUID colisId, UUID tenantId);

    // Colis sans features (a enrichir)
    @Query("SELECT c.colisId FROM Colis c WHERE c.pmeCliente.tenantId = :tenantId " +
           "AND NOT EXISTS (SELECT 1 FROM ColisFeature cf WHERE cf.colis.colisId = c.colisId)")
    List<UUID> findColisSansFeatures(@Param("tenantId") UUID tenantId);

    long countByPmeClienteTenantId(UUID tenantId);
}
