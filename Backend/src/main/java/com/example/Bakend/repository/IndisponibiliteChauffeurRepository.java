package com.example.Bakend.repository;

import com.example.Bakend.entity.IndisponibiliteChauffeur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface IndisponibiliteChauffeurRepository extends JpaRepository<IndisponibiliteChauffeur, UUID> {

    List<IndisponibiliteChauffeur> findByPmeClienteTenantId(UUID tenantId);

    List<IndisponibiliteChauffeur> findByChauffeurChauffeurId(UUID chauffeurId);

    @Query("SELECT i FROM IndisponibiliteChauffeur i WHERE i.pmeCliente.tenantId = :tenantId AND i.chauffeur.chauffeurId = :chauffeurId AND i.fin > :from AND i.debut < :to")
    List<IndisponibiliteChauffeur> findChevauchement(
            @Param("tenantId") UUID tenantId,
            @Param("chauffeurId") UUID chauffeurId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    @Query("SELECT i FROM IndisponibiliteChauffeur i WHERE i.pmeCliente.tenantId = :tenantId AND i.debut < :to AND i.fin > :from")
    List<IndisponibiliteChauffeur> findToutesChevauchantes(
            @Param("tenantId") UUID tenantId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    void deleteByPmeClienteTenantIdAndChauffeurChauffeurIdAndIndispoId(UUID tenantId, UUID chauffeurId, UUID indispoId);
}
