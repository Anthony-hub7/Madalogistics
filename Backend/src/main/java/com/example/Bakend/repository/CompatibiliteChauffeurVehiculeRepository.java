package com.example.Bakend.repository;

import com.example.Bakend.entity.CompatibiliteChauffeurVehicule;
import com.example.Bakend.entity.id.CompatibiliteId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

/**
 * Repository de la matrice de compatibilité chauffeur &lt;-&gt; véhicule (a_ij).
 * PK composite (chauffeurId, vehiculeId).
 * Couche repository : uniquement des requêtes JPA/JPQL, pas de logique métier.
 */
public interface CompatibiliteChauffeurVehiculeRepository extends JpaRepository<CompatibiliteChauffeurVehicule, CompatibiliteId> {

    List<CompatibiliteChauffeurVehicule> findByChauffeurId(UUID chauffeurId);

    List<CompatibiliteChauffeurVehicule> findByVehiculeId(UUID vehiculeId);

    List<CompatibiliteChauffeurVehicule> findByPmeClienteTenantId(UUID tenantId);

    @Query("SELECT c FROM CompatibiliteChauffeurVehicule c WHERE c.pmeCliente.tenantId = :tenantId AND c.compatible = true")
    List<CompatibiliteChauffeurVehicule> rechercherCompatibles(@Param("tenantId") UUID tenantId);

    @Query("SELECT c.vehiculeId FROM CompatibiliteChauffeurVehicule c WHERE c.chauffeurId = :chauffeurId AND c.compatible = true")
    List<UUID> rechercherVehiculeIdsCompatibles(@Param("chauffeurId") UUID chauffeurId);
}
