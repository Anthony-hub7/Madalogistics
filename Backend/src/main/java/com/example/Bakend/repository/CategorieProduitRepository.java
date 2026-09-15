package com.example.Bakend.repository;

import com.example.Bakend.entity.CategorieProduit;
import com.example.Bakend.entity.enums.ClasseValeur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository de la categorie de produit — referentiel dynamique versionne (V12).
 * Couche repository : uniquement des requetes JPA/JPQL, pas de logique metier.
 */
public interface CategorieProduitRepository extends JpaRepository<CategorieProduit, UUID> {

    List<CategorieProduit> findByPmeClienteTenantId(UUID tenantId);

    List<CategorieProduit> findByPmeClienteTenantIdAndActif(UUID tenantId, Boolean actif);

    List<CategorieProduit> findByPmeClienteTenantIdAndClasseValeur(UUID tenantId, ClasseValeur classeValeur);

    long countByPmeClienteTenantIdAndActif(UUID tenantId, Boolean actif);

    boolean existsByPmeClienteTenantIdAndLibelle(UUID tenantId, String libelle);

    boolean existsByPmeClienteTenantIdAndClasseCodeAndActif(UUID tenantId, String classeCode, Boolean actif);

    Optional<CategorieProduit> findByPmeClienteTenantIdAndCategorieId(UUID tenantId, UUID categorieId);

    @Query("SELECT c FROM CategorieProduit c WHERE c.pmeCliente.tenantId = :tenantId AND c.classeValeur = :classeValeur ORDER BY c.libelle ASC")
    List<CategorieProduit> rechercherParTenantEtClasse(@Param("tenantId") UUID tenantId, @Param("classeValeur") ClasseValeur classeValeur);

    // V12 : categories actives et ML-activables pour le clustering
    @Query("SELECT c FROM CategorieProduit c WHERE c.pmeCliente.tenantId = :tenantId AND c.actif = true AND c.mlActivable = true ORDER BY c.classeCode ASC")
    List<CategorieProduit> findActivesMlActivables(@Param("tenantId") UUID tenantId);
}
