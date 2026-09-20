package com.example.Bakend.service;

import com.example.Bakend.entity.Chauffeur;
import com.example.Bakend.entity.PMECliente;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.exception.ResourceNotFoundException;
import com.example.Bakend.repository.ChauffeurRepository;
import com.example.Bakend.repository.PMEClienteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Service de gestion de l'equipe chauffeur d'une agence.
 * Miroir de AdminChauffeurController, mais scope strictement au tenantId de l'agence (DIRECTION).
 * Workflow : depot chauffeur RATTACHE → validation/refus par DIRECTION → activation.
 */
@Service
@Transactional
public class EquipeService {

    private final ChauffeurRepository chauffeurRepository;
    private final PMEClienteRepository pmeClienteRepository;
    private final CompatibiliteService compatibiliteService;

    public EquipeService(ChauffeurRepository chauffeurRepository,
                         PMEClienteRepository pmeClienteRepository,
                         CompatibiliteService compatibiliteService) {
        this.chauffeurRepository = chauffeurRepository;
        this.pmeClienteRepository = pmeClienteRepository;
        this.compatibiliteService = compatibiliteService;
    }

    /**
     * Liste les dossiers de chauffeurs rattaches a l'agence, filtres par statut.
     * Par defaut : EN_ATTENTE uniquement.
     */
    @Transactional(readOnly = true)
    public List<Chauffeur> listerDossiers(UUID tenantId, String statut) {
        verifierTenantExiste(tenantId);
        if (statut != null) {
            return chauffeurRepository.findByAgenceCibleTenantIdAndStatutDossier(tenantId, statut);
        }
        return chauffeurRepository.findByAgenceCibleTenantId(tenantId);
    }

    /**
     * Detail d'un dossier chauffeur scope agence.
     */
    @Transactional(readOnly = true)
    public Chauffeur obtenirDossier(UUID tenantId, UUID chauffeurId) {
        return chauffeurRepository.findByChauffeurIdAndAgenceCibleTenantId(chauffeurId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Chauffeur introuvable dans cette agence : " + chauffeurId));
    }

    /**
     * Valide un dossier de chauffeur rattache (DIRECTION agence).
     */
    public void validerDossier(UUID tenantId, UUID chauffeurId) {
        Chauffeur chauffeur = obtenirDossier(tenantId, chauffeurId);

        if (!"EN_ATTENTE".equals(chauffeur.getStatutDossier())) {
            throw new BusinessException("Ce dossier n'est pas en attente de validation");
        }

        chauffeur.setStatutDossier("VALIDEE");
        chauffeur.setMotifRefus(null);
        chauffeurRepository.save(chauffeur);

        // Auto-creer les lignes de compatibilite avec tous les vehicules du tenant
        compatibiliteService.initialiserPourChauffeur(tenantId, chauffeurId);
    }

    /**
     * Refuse un dossier de chauffeur rattache (DIRECTION agence).
     */
    public void refuserDossier(UUID tenantId, UUID chauffeurId, String motif) {
        Chauffeur chauffeur = obtenirDossier(tenantId, chauffeurId);

        if (!"EN_ATTENTE".equals(chauffeur.getStatutDossier())) {
            throw new BusinessException("Ce dossier n'est pas en attente de validation");
        }

        chauffeur.setStatutDossier("REFUSEE");
        chauffeur.setMotifRefus(motif);
        chauffeurRepository.save(chauffeur);
    }

    /**
     * Desactive un chauffeur actif de l'agence (DIRECTION agence).
     */
    public void desactiverDossier(UUID tenantId, UUID chauffeurId, String motif) {
        Chauffeur chauffeur = obtenirDossier(tenantId, chauffeurId);

        if (!"VALIDEE".equals(chauffeur.getStatutDossier())) {
            throw new BusinessException("Seuls les chauffeurs valides peuvent etre desactives");
        }

        chauffeur.setStatutDossier("DESACTIVEE");
        chauffeur.setMotifRefus(motif);
        chauffeurRepository.save(chauffeur);
    }

    /**
     * Reactive un chauffeur desactive de l'agence (DIRECTION agence).
     */
    public void reactiverDossier(UUID tenantId, UUID chauffeurId) {
        Chauffeur chauffeur = obtenirDossier(tenantId, chauffeurId);

        if (!"DESACTIVEE".equals(chauffeur.getStatutDossier())) {
            throw new BusinessException("Seuls les chauffeurs desactives peuvent etre reactives");
        }

        chauffeur.setStatutDossier("VALIDEE");
        chauffeur.setMotifRefus(null);
        chauffeurRepository.save(chauffeur);

        compatibiliteService.initialiserPourChauffeur(tenantId, chauffeurId);
    }

    /**
     * Statut du dossier d'un chauffeur connecte (par utilisateurId).
     * Utilise par l'endpoint /mon-dossier/statut.
     */
    @Transactional(readOnly = true)
    public Optional<Chauffeur> obtenirDossierParUtilisateur(UUID utilisateurId) {
        return chauffeurRepository.findByUtilisateurId(utilisateurId);
    }

    private void verifierTenantExiste(UUID tenantId) {
        pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Agence introuvable : " + tenantId));
    }
}
