package com.example.Bakend.service.tarification;

import com.example.Bakend.dto.direction.GrilleTarifaireRequest;
import com.example.Bakend.entity.CategorieProduit;
import com.example.Bakend.entity.GrilleTarifaire;
import com.example.Bakend.entity.PMECliente;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.exception.ResourceNotFoundException;
import com.example.Bakend.repository.CategorieProduitRepository;
import com.example.Bakend.repository.GrilleTarifaireRepository;
import com.example.Bakend.repository.PMEClienteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Service CRUD pour les grilles tarifaires (V15 : prix par catégorie + repli global).
 */
@Service
@Transactional
public class GrilleTarifaireService {

    private final GrilleTarifaireRepository grilleTarifaireRepository;
    private final PMEClienteRepository pmeClienteRepository;
    private final CategorieProduitRepository categorieProduitRepository;

    public GrilleTarifaireService(GrilleTarifaireRepository grilleTarifaireRepository,
                                   PMEClienteRepository pmeClienteRepository,
                                   CategorieProduitRepository categorieProduitRepository) {
        this.grilleTarifaireRepository = grilleTarifaireRepository;
        this.pmeClienteRepository = pmeClienteRepository;
        this.categorieProduitRepository = categorieProduitRepository;
    }

    @Transactional(readOnly = true)
    public List<GrilleTarifaire> lister(UUID tenantId) {
        return grilleTarifaireRepository.rechercherParTenant(tenantId);
    }

    @Transactional(readOnly = true)
    public GrilleTarifaire obtenir(UUID tenantId, UUID grilleId) {
        return grilleTarifaireRepository.findByGrilleId(grilleId)
                .filter(g -> g.getPmeCliente().getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Grille tarifaire introuvable : " + grilleId));
    }

    public GrilleTarifaire creer(UUID tenantId, GrilleTarifaireRequest request) {
        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant introuvable : " + tenantId));

        GrilleTarifaire grille = new GrilleTarifaire();
        grille.setPmeCliente(tenant);
        grille.setLibelle(request.libelle());
        grille.setPrixParKg(request.prixParKg());
        grille.setPrixParM3(request.prixParM3());
        grille.setPrixParKm(request.prixParKm());
        grille.setPrixMinimum(request.prixMinimum());
        grille.setActif(true);

        // V15 : lien catégorie
        if (request.categorieId() != null) {
            CategorieProduit cat = categorieProduitRepository
                    .findByPmeClienteTenantIdAndCategorieId(tenantId, request.categorieId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Catégorie introuvable : " + request.categorieId()));

            // Unicité : une seule grille active par catégorie
            if (grilleTarifaireRepository.existsByPmeClienteTenantIdAndCategorieCategorieIdAndActifTrue(
                    tenantId, cat.getCategorieId())) {
                throw new BusinessException(
                        "Une grille tarifaire active existe déjà pour la catégorie : " + cat.getLibelle(),
                        409);
            }
            grille.setCategorie(cat);
        }

        return grilleTarifaireRepository.save(grille);
    }

    public GrilleTarifaire modifier(UUID tenantId, UUID grilleId, GrilleTarifaireRequest request) {
        GrilleTarifaire grille = obtenir(tenantId, grilleId);

        grille.setLibelle(request.libelle());
        grille.setPrixParKg(request.prixParKg());
        grille.setPrixParM3(request.prixParM3());
        grille.setPrixParKm(request.prixParKm());
        grille.setPrixMinimum(request.prixMinimum());

        // V15 : mettre à jour la catégorie
        if (request.categorieId() != null) {
            CategorieProduit cat = categorieProduitRepository
                    .findByPmeClienteTenantIdAndCategorieId(tenantId, request.categorieId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Catégorie introuvable : " + request.categorieId()));

            // Unicité active (sauf si c'est la même grille)
            if (grilleTarifaireRepository.existsByPmeClienteTenantIdAndCategorieCategorieIdAndActifTrueAndGrilleIdNot(
                    tenantId, cat.getCategorieId(), grilleId)) {
                throw new BusinessException(
                        "Une autre grille tarifaire active existe déjà pour la catégorie : " + cat.getLibelle(),
                        409);
            }
            grille.setCategorie(cat);
        } else {
            grille.setCategorie(null); // repli global
        }

        return grilleTarifaireRepository.save(grille);
    }

    public void supprimer(UUID tenantId, UUID grilleId) {
        GrilleTarifaire grille = obtenir(tenantId, grilleId);
        grilleTarifaireRepository.delete(grille);
    }

    public GrilleTarifaire toggleActif(UUID tenantId, UUID grilleId) {
        GrilleTarifaire grille = obtenir(tenantId, grilleId);
        grille.setActif(!grille.isActif());
        return grilleTarifaireRepository.save(grille);
    }
}
