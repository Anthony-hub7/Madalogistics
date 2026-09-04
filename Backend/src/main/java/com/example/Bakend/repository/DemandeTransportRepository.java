package com.example.Bakend.repository;

import com.example.Bakend.entity.DemandeTransport;
import com.example.Bakend.entity.enums.DemandeStatut;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository de la demande de transport (la commande du client final).
 * Couche repository : uniquement des requêtes JPA/JPQL, pas de logique métier.
 */
public interface DemandeTransportRepository extends JpaRepository<DemandeTransport, UUID> {

    List<DemandeTransport> findByPmeClienteTenantId(UUID tenantId);

    Optional<DemandeTransport> findByPmeClienteTenantIdAndDemandeId(UUID tenantId, UUID demandeId);

    List<DemandeTransport> findByPmeClienteTenantIdAndHubHubId(UUID tenantId, UUID hubId);

    List<DemandeTransport> findByPmeClienteTenantIdAndStatut(UUID tenantId, DemandeStatut statut);

    List<DemandeTransport> findByPmeClienteTenantIdAndClientFinalClientFinalId(UUID tenantId, UUID clientFinalId);

    @Query("SELECT d FROM DemandeTransport d WHERE d.pmeCliente.tenantId = :tenantId AND d.hub.hubId = :hubId AND d.statut = :statut ORDER BY d.createdAt ASC")
    List<DemandeTransport> rechercherParHubEtStatut(@Param("tenantId") UUID tenantId, @Param("hubId") UUID hubId, @Param("statut") DemandeStatut statut);

    @Query("SELECT COUNT(d) FROM DemandeTransport d WHERE d.pmeCliente.tenantId = :tenantId AND d.statut = :statut")
    long compterParStatut(@Param("tenantId") UUID tenantId, @Param("statut") DemandeStatut statut);
}
