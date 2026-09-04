package com.example.Bakend.repository;

import com.example.Bakend.entity.CategorieProduit;
import com.example.Bakend.entity.enums.ClasseValeur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

/**
 * Repository de la catégorie de produit (classe de valeur A/B/C).
 * Couche repository : uniquement des requêtes JPA/JPQL, pas de logique métier.
 */
public interface CategorieProduitRepository extends JpaRepository<CategorieProduit, UUID> {

    List<CategorieProduit> findByPmeClienteTenantId(UUID tenantId);

    List<CategorieProduit> findByPmeClienteTenantIdAndClasseValeur(UUID tenantId, ClasseValeur classeValeur);

    boolean existsByPmeClienteTenantIdAndLibelle(UUID tenantId, String libelle);

    @Query("SELECT c FROM CategorieProduit c WHERE c.pmeCliente.tenantId = :tenantId AND c.classeValeur = :classeValeur ORDER BY c.libelle ASC")
    List<CategorieProduit> rechercherParTenantEtClasse(@Param("tenantId") UUID tenantId, @Param("classeValeur") ClasseValeur classeValeur);
}
