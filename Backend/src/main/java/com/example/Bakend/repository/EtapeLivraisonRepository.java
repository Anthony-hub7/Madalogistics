package com.example.Bakend.repository;

import com.example.Bakend.entity.EtapeLivraison;
import com.example.Bakend.entity.enums.TypeEtape;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

/**
 * Repository des étapes de livraison d'une tournée.
 * Couche repository : uniquement des requêtes JPA/JPQL, pas de logique métier.
 */
public interface EtapeLivraisonRepository extends JpaRepository<EtapeLivraison, UUID> {

    List<EtapeLivraison> findByPmeClienteTenantId(UUID tenantId);

    List<EtapeLivraison> findByTourneeTourneeId(UUID tourneeId);

    List<EtapeLivraison> findByColisColisId(UUID colisId);

    @Query("SELECT e FROM EtapeLivraison e WHERE e.tournee.tourneeId = :tourneeId ORDER BY e.ordre ASC")
    List<EtapeLivraison> rechercherParTourneeOrdonnees(@Param("tourneeId") UUID tourneeId);

    /**
     * Étapes LIVRAISON avec dates pour calcul délai en Java.
     */
    @Query("SELECT e.dateHeurePrevue, e.dateHeureReelle FROM EtapeLivraison e " +
           "WHERE e.colis.demande.pmeCliente.tenantId = :tenantId " +
           "AND e.colis.demande.hub.hubId = :hubId " +
           "AND e.typeEtape = :typeEtape " +
           "AND e.dateHeureReelle IS NOT NULL " +
           "AND e.dateHeurePrevue IS NOT NULL")
    List<Object[]> findDatesDelaiParHub(@Param("tenantId") UUID tenantId,
                                        @Param("hubId") UUID hubId,
                                        @Param("typeEtape") TypeEtape typeEtape);
}
