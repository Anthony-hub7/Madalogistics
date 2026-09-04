package com.example.Bakend.repository;

import com.example.Bakend.entity.Vehicule;
import com.example.Bakend.entity.enums.VehiculeStatut;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository du véhicule (rattaché à un hub d'un tenant).
 * Couche repository : uniquement des requêtes JPA/JPQL, pas de logique métier.
 */
public interface VehiculeRepository extends JpaRepository<Vehicule, UUID> {

    List<Vehicule> findByPmeClienteTenantId(UUID tenantId);

    Optional<Vehicule> findByPmeClienteTenantIdAndVehiculeId(UUID tenantId, UUID vehiculeId);

    List<Vehicule> findByPmeClienteTenantIdAndStatut(UUID tenantId, VehiculeStatut statut);

    List<Vehicule> findByHubHubId(UUID hubId);

    Optional<Vehicule> findByImmatriculation(String immatriculation);

    @Query("SELECT v FROM Vehicule v WHERE v.pmeCliente.tenantId = :tenantId AND v.hub.hubId = :hubId AND v.statut = :statut ORDER BY v.immatriculation ASC")
    List<Vehicule> rechercherDisponiblesParHub(@Param("tenantId") UUID tenantId, @Param("hubId") UUID hubId, @Param("statut") VehiculeStatut statut);
}
