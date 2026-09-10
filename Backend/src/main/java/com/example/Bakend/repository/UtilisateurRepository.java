package com.example.Bakend.repository;

import com.example.Bakend.entity.Utilisateur;
import com.example.Bakend.entity.enums.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository de l'utilisateur (tous rôles).
 * Gestion des comptes : inscription (unicité email) et authentification (recherche par identifiant).
 * Couche repository : uniquement des requêtes JPA/JPQL, pas de logique métier.
 */
public interface UtilisateurRepository extends JpaRepository<Utilisateur, UUID> {

    /* ---------- Authentification / inscription ---------- */

    Optional<Utilisateur> findByEmail(String email);

    @Query("SELECT u FROM Utilisateur u LEFT JOIN FETCH u.pmeCliente WHERE u.email = :email")
    Optional<Utilisateur> findByEmailWithPmeCliente(@Param("email") String email);

    boolean existsByEmail(String email);

    boolean existsByCin(String cin);

    @Query("SELECT u FROM Utilisateur u WHERE u.email = :email")
    Optional<Utilisateur> rechercherParEmailPourConnexion(@Param("email") String email);

    /* ---------- Scope tenant ---------- */

    List<Utilisateur> findByPmeClienteTenantId(UUID tenantId);

    Page<Utilisateur> findByPmeClienteTenantId(UUID tenantId, Pageable pageable);

    Optional<Utilisateur> findByPmeClienteTenantIdAndUtilisateurId(UUID tenantId, UUID utilisateurId);

    List<Utilisateur> findByPmeClienteTenantIdAndRole(UUID tenantId, Role role);

    boolean existsByPmeClienteTenantIdAndEmail(UUID tenantId, String email);

    @Query("SELECT COUNT(u) FROM Utilisateur u WHERE u.pmeCliente.tenantId = :tenantId")
    long compterParTenant(@Param("tenantId") UUID tenantId);

    @Query("SELECT COUNT(u) FROM Utilisateur u WHERE u.pmeCliente.tenantId = :tenantId AND u.role = :role")
    long compterParTenantEtRole(@Param("tenantId") UUID tenantId, @Param("role") Role role);

    @Query("SELECT u FROM Utilisateur u WHERE u.pmeCliente.tenantId = :tenantId ORDER BY u.createdAt DESC")
    List<Utilisateur> rechercherTousParTenant(@Param("tenantId") UUID tenantId);

    @Query("SELECT u FROM Utilisateur u WHERE u.pmeCliente.tenantId = :tenantId ORDER BY u.createdAt DESC")
    org.springframework.data.domain.Page<Utilisateur> rechercherParTenantPagine(@Param("tenantId") UUID tenantId,
                                                                                org.springframework.data.domain.Pageable pageable);
}
