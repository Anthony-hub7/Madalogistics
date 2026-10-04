package com.example.Bakend.repository;

import com.example.Bakend.entity.IndisponibiliteVehicule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface IndisponibiliteVehiculeRepository extends JpaRepository<IndisponibiliteVehicule, UUID> {

    List<IndisponibiliteVehicule> findByPmeClienteTenantId(UUID tenantId);

    List<IndisponibiliteVehicule> findByVehiculeVehiculeId(UUID vehiculeId);

    @Query("SELECT i FROM IndisponibiliteVehicule i WHERE i.pmeCliente.tenantId = :tenantId AND i.vehicule.vehiculeId = :vehiculeId AND i.fin > :from AND i.debut < :to")
    List<IndisponibiliteVehicule> findChevauchement(
            @Param("tenantId") UUID tenantId,
            @Param("vehiculeId") UUID vehiculeId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    void deleteByPmeClienteTenantIdAndVehiculeVehiculeIdAndIndispoId(UUID tenantId, UUID vehiculeId, UUID indispoId);
}
