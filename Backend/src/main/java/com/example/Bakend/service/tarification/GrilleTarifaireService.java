package com.example.Bakend.service.tarification;

import com.example.Bakend.dto.direction.GrilleTarifaireRequest;
import com.example.Bakend.entity.GrilleTarifaire;
import com.example.Bakend.entity.PMECliente;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.exception.ResourceNotFoundException;
import com.example.Bakend.repository.GrilleTarifaireRepository;
import com.example.Bakend.repository.PMEClienteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class GrilleTarifaireService {

    private final GrilleTarifaireRepository grilleTarifaireRepository;
    private final PMEClienteRepository pmeClienteRepository;

    public GrilleTarifaireService(GrilleTarifaireRepository grilleTarifaireRepository,
                                   PMEClienteRepository pmeClienteRepository) {
        this.grilleTarifaireRepository = grilleTarifaireRepository;
        this.pmeClienteRepository = pmeClienteRepository;
    }

    @Transactional(readOnly = true)
    public List<GrilleTarifaire> lister(UUID tenantId) {
        verifierTenant(tenantId);
        return grilleTarifaireRepository.rechercherParTenant(tenantId);
    }

    public GrilleTarifaire creer(UUID tenantId, GrilleTarifaireRequest request) {
        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant introuvable : " + tenantId));

        GrilleTarifaire grille = new GrilleTarifaire();
        grille.setPmeCliente(tenant);
        grille.setLibelle(request.libelle());
        grille.setPrixParKg(request.prixParKg());
        grille.setPrixParM3(request.prixParM3());
        grille.setPrixMinimum(request.prixMinimum());
        grille.setActif(true);
        return grilleTarifaireRepository.save(grille);
    }

    public GrilleTarifaire modifier(UUID tenantId, UUID grilleId, GrilleTarifaireRequest request) {
        GrilleTarifaire grille = obtenir(tenantId, grilleId);
        grille.setLibelle(request.libelle());
        grille.setPrixParKg(request.prixParKg());
        grille.setPrixParM3(request.prixParM3());
        grille.setPrixMinimum(request.prixMinimum());
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

    @Transactional(readOnly = true)
    public GrilleTarifaire obtenir(UUID tenantId, UUID grilleId) {
        return grilleTarifaireRepository.findByGrilleId(grilleId)
                .filter(g -> g.getPmeCliente().getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Grille tarifaire introuvable : " + grilleId));
    }

    private void verifierTenant(UUID tenantId) {
        if (!pmeClienteRepository.existsByTenantId(tenantId)) {
            throw new ResourceNotFoundException("Tenant introuvable : " + tenantId);
        }
    }
}
