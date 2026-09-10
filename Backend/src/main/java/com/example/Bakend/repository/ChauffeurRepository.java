package com.example.Bakend.repository;

import com.example.Bakend.entity.Chauffeur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository du chauffeur (détail métier lié à un Utilisateur).
 * Couche repository : uniquement des requêtes JPA/JPQL, pas de logique métier.
 */
public interface ChauffeurRepository extends JpaRepository<Chauffeur, UUID> {

    List<Chauffeur> findByPmeClienteTenantId(UUID tenantId);

    Optional<Chauffeur> findByUtilisateurUtilisateurId(UUID utilisateurId);

    Optional<Chauffeur> findByPmeClienteTenantIdAndChauffeurId(UUID tenantId, UUID chauffeurId);

    List<Chauffeur> findByPmeClienteTenantIdAndDisponibleTrue(UUID tenantId);

    List<Chauffeur> findByVehiculeVehiculeId(UUID vehiculeId);

    @Query("SELECT c FROM Chauffeur c WHERE c.pmeCliente.tenantId = :tenantId AND c.disponible = true ORDER BY c.createdAt ASC")
    List<Chauffeur> rechercherDisponibles(@Param("tenantId") UUID tenantId);

    @Query("SELECT COUNT(c) FROM Chauffeur c WHERE c.pmeCliente.tenantId = :tenantId")
    long compterParTenant(@Param("tenantId") UUID tenantId);

    @Query("SELECT c FROM Chauffeur c WHERE c.typeChauffeur = 'FREELANCE' ORDER BY c.createdAt DESC")
    List<Chauffeur> findFreelancesPlateforme();

    @Query("SELECT c FROM Chauffeur c WHERE c.typeChauffeur = 'FREELANCE' AND c.statutDossier = :statut ORDER BY c.createdAt DESC")
    List<Chauffeur> findFreelancesPlateformeByStatut(@Param("statut") String statut);

    // ── Scope agence : chauffeurs rattachés ──

    @Query("SELECT c FROM Chauffeur c WHERE c.agenceCible.tenantId = :tenantId ORDER BY c.createdAt DESC")
    List<Chauffeur> findByAgenceCibleTenantId(@Param("tenantId") UUID tenantId);

    @Query("SELECT c FROM Chauffeur c WHERE c.agenceCible.tenantId = :tenantId AND c.statutDossier = :statut ORDER BY c.createdAt DESC")
    List<Chauffeur> findByAgenceCibleTenantIdAndStatutDossier(@Param("tenantId") UUID tenantId, @Param("statut") String statut);

    @Query("SELECT c FROM Chauffeur c WHERE c.chauffeurId = :chauffeurId AND c.agenceCible.tenantId = :tenantId")
    Optional<Chauffeur> findByChauffeurIdAndAgenceCibleTenantId(@Param("chauffeurId") UUID chauffeurId, @Param("tenantId") UUID tenantId);

    @Query("SELECT c FROM Chauffeur c WHERE c.utilisateur.utilisateurId = :utilisateurId")
    Optional<Chauffeur> findByUtilisateurId(@Param("utilisateurId") UUID utilisateurId);

    @Query("SELECT c FROM Chauffeur c WHERE c.utilisateur.utilisateurId = :utilisateurId AND c.statutDossier != :statutExclude")
    Optional<Chauffeur> findActiveByUtilisateurId(@Param("utilisateurId") UUID utilisateurId, @Param("statutExclude") String statutExclude);
}
