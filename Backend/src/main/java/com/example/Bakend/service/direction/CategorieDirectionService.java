package com.example.Bakend.service.direction;

import com.example.Bakend.dto.direction.CategorieCreateRequest;
import com.example.Bakend.dto.direction.CategorieDirectionRequest;
import com.example.Bakend.dto.direction.SeuilsMl;
import com.example.Bakend.entity.CategorieProduit;
import com.example.Bakend.entity.PMECliente;
import com.example.Bakend.entity.enums.AuditAction;
import com.example.Bakend.entity.enums.ClasseValeur;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.exception.ResourceNotFoundException;
import com.example.Bakend.repository.CategorieProduitRepository;
import com.example.Bakend.repository.PMEClienteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Service CRUD DIRECTION pour les catégories de produit (V12 + V15).
 * V15 : les prix sont déplacés vers grille_tarifaire.
 */
@Service
@Transactional
public class CategorieDirectionService {

    private final CategorieProduitRepository categorieProduitRepository;
    private final PMEClienteRepository pmeClienteRepository;

    public CategorieDirectionService(CategorieProduitRepository categorieProduitRepository,
                                     PMEClienteRepository pmeClienteRepository) {
        this.categorieProduitRepository = categorieProduitRepository;
        this.pmeClienteRepository = pmeClienteRepository;
    }

    @Transactional(readOnly = true)
    public List<CategorieProduit> lister(UUID tenantId) {
        return categorieProduitRepository.findByPmeClienteTenantId(tenantId);
    }

    @Transactional(readOnly = true)
    public CategorieProduit obtenir(UUID tenantId, UUID categorieId) {
        return categorieProduitRepository.findByPmeClienteTenantIdAndCategorieId(tenantId, categorieId)
                .orElseThrow(() -> new ResourceNotFoundException("Catégorie introuvable : " + categorieId));
    }

    public CategorieProduit creer(UUID tenantId, CategorieCreateRequest request) {
        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant introuvable : " + tenantId));

        if (!"VALIDEE".equals(tenant.getStatutDossier())) {
            throw new BusinessException("Le dossier agence doit être validé");
        }

        if (categorieProduitRepository.existsByPmeClienteTenantIdAndLibelle(tenantId, request.libelle())) {
            throw new BusinessException("Une catégorie avec ce libellé existe déjà : " + request.libelle());
        }

        if (categorieProduitRepository.existsByPmeClienteTenantIdAndClasseCodeAndActif(
                tenantId, request.classeCode(), true)) {
            throw new BusinessException(
                    "Une catégorie active avec ce code de classe existe déjà : " + request.classeCode());
        }

        validateSeuilsMl(request.seuilsMl());

        CategorieProduit cat = new CategorieProduit();
        cat.setPmeCliente(tenant);
        cat.setLibelle(request.libelle());
        cat.setClasseCode(request.classeCode());
        cat.setClasseValeur(mapClasseCodeToLegacy(request.classeCode()));
        cat.setJustification(request.justification());
        cat.setSeuilsMl(request.seuilsMl().toJson());
        cat.setHabiliteRequis(request.habiliteRequis() != null ? request.habiliteRequis() : false);
        cat.setActif(true);
        cat.setMlActivable(true);

        CategorieProduit saved = categorieProduitRepository.save(cat);

        logAudit(tenantId, saved.getCategorieId(), AuditAction.CREATION,
                Map.of("classeCode", request.classeCode(), "libelle", request.libelle()));
        bumpReferentielVersion(tenant);

        return saved;
    }

    public CategorieProduit modifier(UUID tenantId, UUID categorieId,
                                     CategorieDirectionRequest request) {
        CategorieProduit cat = obtenir(tenantId, categorieId);

        Map<String, Object> avant = Map.of(
                "libelle", cat.getLibelle(),
                "justification", cat.getJustification() != null ? cat.getJustification() : "",
                "habiliteRequis", cat.getHabiliteRequis()
        );

        cat.setLibelle(request.libelle());
        cat.setJustification(request.justification());
        cat.setHabiliteRequis(request.habiliteRequis() != null ? request.habiliteRequis() : cat.getHabiliteRequis());

        if (request.seuilsMl() != null) {
            validateSeuilsMl(request.seuilsMl());
            cat.setSeuilsMl(request.seuilsMl().toJson());
        }

        CategorieProduit saved = categorieProduitRepository.save(cat);

        Map<String, Object> apres = Map.of(
                "libelle", saved.getLibelle(),
                "justification", saved.getJustification() != null ? saved.getJustification() : "",
                "habiliteRequis", saved.getHabiliteRequis()
        );

        logAudit(tenantId, categorieId, AuditAction.MODIFICATION,
                Map.of("avant", avant, "apres", apres));
        bumpReferentielVersion(pmeClienteRepository.findByTenantId(tenantId).orElse(null));

        return saved;
    }

    public CategorieProduit toggleActif(UUID tenantId, UUID categorieId) {
        CategorieProduit cat = obtenir(tenantId, categorieId);
        cat.setActif(!cat.getActif());
        CategorieProduit saved = categorieProduitRepository.save(cat);
        logAudit(tenantId, categorieId, AuditAction.MODIFICATION, Map.of("actif", saved.getActif()));
        bumpReferentielVersion(pmeClienteRepository.findByTenantId(tenantId).orElse(null));
        return saved;
    }

    private void validateSeuilsMl(SeuilsMl seuils) {
        if (seuils == null) {
            throw new BusinessException("Les seuils ML sont obligatoires");
        }
    }

    private ClasseValeur mapClasseCodeToLegacy(String code) {
        if (code == null) return ClasseValeur.B;
        return switch (code.toUpperCase()) {
            case "A" -> ClasseValeur.A;
            case "B" -> ClasseValeur.B;
            case "C" -> ClasseValeur.C;
            default -> ClasseValeur.B;
        };
    }

    private void bumpReferentielVersion(PMECliente tenant) {
        if (tenant == null) return;
        tenant.setReferentielVersion(tenant.getReferentielVersion() + 1);
        tenant.setClusteringDirty(true);
        pmeClienteRepository.save(tenant);
    }

    private void logAudit(UUID tenantId, UUID categorieId, AuditAction action,
                          Map<String, Object> details) {
        // TODO: injecter AuditLogRepository + UtilisateurRepository pour persister
    }
}
