package com.example.Bakend.service;

import com.example.Bakend.config.RoleRedirectMapper;
import com.example.Bakend.dto.response.AuthResponse;
import com.example.Bakend.entity.PMECliente;
import com.example.Bakend.entity.CategorieProduit;
import com.example.Bakend.entity.Utilisateur;
import com.example.Bakend.entity.enums.ClasseValeur;
import com.example.Bakend.entity.enums.Role;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.exception.ResourceNotFoundException;
import com.example.Bakend.repository.CategorieProduitRepository;
import com.example.Bakend.repository.PMEClienteRepository;
import com.example.Bakend.repository.UtilisateurRepository;
import com.example.Bakend.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Service d'inscription des agences de transport.
 * Workflow : depot dossier (EN_ATTENTE) → validation admin → finalisation compte DIRECTION.
 * Pattern identique à ClientRegistrationService.
 */
@Service
@Transactional
public class AgenceRegistrationService {

    private final PMEClienteRepository pmeClienteRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final CategorieProduitRepository categorieProduitRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final RoleRedirectMapper roleRedirectMapper;

    public AgenceRegistrationService(PMEClienteRepository pmeClienteRepository,
                                     UtilisateurRepository utilisateurRepository,
                                     CategorieProduitRepository categorieProduitRepository,
                                     PasswordEncoder passwordEncoder,
                                     JwtService jwtService,
                                     RefreshTokenService refreshTokenService,
                                     RoleRedirectMapper roleRedirectMapper) {
        this.pmeClienteRepository = pmeClienteRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.categorieProduitRepository = categorieProduitRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.roleRedirectMapper = roleRedirectMapper;
    }

    /**
     * Depose un dossier d'inscription agence. Le tenant est cree en statut EN_ATTENTE.
     * Le document kbis et attestation sont obligatoires (verifies avant cet appel).
     * @return tenantId + reference pour affichage front
     */
    public Map<String, Object> deposerDossier(String raisonSociale, String nif, String stat,
                                               String email, String telephone, String adresse,
                                               String site, byte[] kbis, byte[] attestation,
                                               byte[] assurance) {
        // Unicite email (email de contact agence)
        if (utilisateurRepository.existsByEmail(email)) {
            throw new BusinessException("Un compte existe deja avec l'email : " + email);
        }

        // Creation du tenant
        PMECliente tenant = new PMECliente();
        tenant.setNomEntreprise(raisonSociale);
        tenant.setNif(nif);
        tenant.setStat(stat);
        tenant.setTelephone(telephone);
        tenant.setAdresse(adresse);
        tenant.setSiteWeb(site);
        tenant.setDocumentKbis(kbis);
        tenant.setDocumentAttestation(attestation);
        tenant.setDocumentAssurance(assurance);
        tenant.setStatutDossier("EN_ATTENTE");
        tenant.setSeuilRemplissageMin(new BigDecimal("80.00"));

        PMECliente saved = pmeClienteRepository.save(tenant);

        return Map.of(
                "tenantId", saved.getTenantId(),
                "reference", "#AGC-" + saved.getTenantId().toString().substring(0, 8).toUpperCase()
        );
    }

    /**
     * Liste les dossiers d'agences par statut (pour l'admin SAAS).
     */
    @Transactional(readOnly = true)
    public List<PMECliente> listerDossiers(String statut) {
        return pmeClienteRepository.findAllOrderByCreatedAtDesc().stream()
                .filter(t -> statut == null || t.getStatutDossier().equals(statut))
                .toList();
    }

    /**
     * Detail d'un dossier.
     */
    @Transactional(readOnly = true)
    public PMECliente obtenirDossier(UUID tenantId) {
        return pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant introuvable : " + tenantId));
    }

    /**
     * Valide un dossier d'agence (admin SAAS).
     * Hook : seed les 3 categories standards si le tenant n'en a aucune active.
     */
    public void validerDossier(UUID tenantId) {
        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant introuvable : " + tenantId));

        if (!"EN_ATTENTE".equals(tenant.getStatutDossier())) {
            throw new BusinessException("Ce dossier n'est pas en attente de validation");
        }

        tenant.setStatutDossier("VALIDEE");
        tenant.setMotifRefus(null);
        pmeClienteRepository.save(tenant);

        seedCategoriesDefaut(tenant);
    }

    /**
     * Refuse un dossier d'agence (admin SAAS).
     */
    public void refuserDossier(UUID tenantId, String motif) {
        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant introuvable : " + tenantId));

        if (!"EN_ATTENTE".equals(tenant.getStatutDossier())) {
            throw new BusinessException("Ce dossier n'est pas en attente de validation");
        }

        tenant.setStatutDossier("REFUSEE");
        tenant.setMotifRefus(motif);
        pmeClienteRepository.save(tenant);
    }

    /**
     * Desactive un compte d'agence (admin SAAS).
     * Le statut passe a DESACTIVEE.
     */
    public void desactiverDossier(UUID tenantId, String motif) {
        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant introuvable : " + tenantId));

        if (!"VALIDEE".equals(tenant.getStatutDossier())) {
            throw new BusinessException("Seules les agences activees peuvent etre desactivees");
        }

        tenant.setStatutDossier("DESACTIVEE");
        tenant.setMotifRefus(motif);
        pmeClienteRepository.save(tenant);
    }

    /**
     * Supprime (desactive definitivement) un dossier d'agence (admin SAAS).
     * Soft delete : statut passe a DESACTIVEE avec motif.
     */
    public void supprimerDossier(UUID tenantId, String motif) {
        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant introuvable : " + tenantId));

        tenant.setStatutDossier("DESACTIVEE");
        tenant.setMotifRefus(motif != null ? motif : "Supprime par l'administrateur");
        pmeClienteRepository.save(tenant);
    }

    /**
     * Reactiver un compte d'agence desactivee (admin SAAS).
     * Le statut repasse a VALIDEE.
     * Hook : seed les 3 categories standards si le tenant n'en a aucune active.
     */
    public void reactiverDossier(UUID tenantId) {
        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant introuvable : " + tenantId));

        if (!"DESACTIVEE".equals(tenant.getStatutDossier())) {
            throw new BusinessException("Seules les agences desactivees peuvent etre reactivees");
        }

        tenant.setStatutDossier("VALIDEE");
        tenant.setMotifRefus(null);
        pmeClienteRepository.save(tenant);

        seedCategoriesDefaut(tenant);
    }

    /**
     * Finalise le compte administrateur apres validation du dossier.
     * Le tenant doit etre en statut VALIDEE.
     * @return AuthResponse avec JWT + infos utilisateur (role DIRECTION)
     */
    public AuthResponse finaliserCompte(UUID tenantId, String prenom, String nom,
                                         String emailAdmin, String password) {
        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant introuvable : " + tenantId));

        if (!"VALIDEE".equals(tenant.getStatutDossier())) {
            throw new BusinessException("Le dossier agence doit etre valide par l'administrateur avant la finalisation du compte");
        }

        if (utilisateurRepository.existsByEmail(emailAdmin)) {
            throw new BusinessException("Un compte existe deja avec l'email : " + emailAdmin);
        }

        // Creation de l'utilisateur DIRECTION (admin de l'agence)
        Utilisateur utilisateur = new Utilisateur();
        utilisateur.setPmeCliente(tenant);
        utilisateur.setNom(prenom + " " + nom);
        utilisateur.setEmail(emailAdmin);
        utilisateur.setMotDePasseHash(passwordEncoder.encode(password));
        utilisateur.setRole(Role.DIRECTION);
        utilisateur.setHabiliteValeur(false);

        Utilisateur saved = utilisateurRepository.save(utilisateur);

        // Generation JWT + refresh token
        String accessToken = jwtService.generateToken(saved);
        String refreshToken = refreshTokenService.createRefreshToken(
                saved.getUtilisateurId(),
                tenant.getTenantId());

        return new AuthResponse(
                accessToken,
                saved.getUtilisateurId(),
                tenant.getTenantId(),
                saved.getEmail(),
                saved.getNom(),
                roleRedirectMapper.getRedirectPath(saved.getRole())
        );
    }

    /**
     * Seed les 3 categories standards si le tenant n'en a aucune active.
     * Idempotent : verifie l'etat reel (count actif), pas un flag.
     * Snapshot one-shot : ne modifie jamais les categories existantes.
     * Appele depuis validerDossier() et reactiverDossier().
     */
    private void seedCategoriesDefaut(PMECliente tenant) {
        long actives = categorieProduitRepository.countByPmeClienteTenantIdAndActif(
                tenant.getTenantId(), true);
        if (actives > 0) {
            return;
        }

        String[][] templates = {
            {"Fragile / Haute valeur", "A",
             "Colis contenant des marchandises fragiles ou de grande valeur (bijoux, electronique, art). " +
             "Obligation de manipulation precautionneuse, emballage renforce, pas de superposition. " +
             "Affectation reservee aux chauffeurs habilites (habilite_valeur=true).",
             "{\"poids_min\":null,\"poids_max\":null,\"volume_min\":null,\"volume_max\":null,\"fragilite_min\":7,\"fragilite_max\":10,\"valeur_min\":200000,\"valeur_max\":null,\"delai_max_h\":null}",
             "true"},
            {"Standard", "B",
             "Colis de poids et volume moyens, pas de contrainte de manipulation particuliere. " +
             "Correspond a la majorite des envois (vetiments, petit commerce, documents). " +
             "Groupage standard avec n'importe quel type.",
             "{\"poids_min\":null,\"poids_max\":null,\"volume_min\":null,\"volume_max\":null,\"fragilite_min\":null,\"fragilite_max\":null,\"valeur_min\":null,\"valeur_max\":null,\"delai_max_h\":null}",
             "false"},
            {"Robuste / Lourd", "C",
             "Colis lourds ou encombrants, resistant a la manipulation (sacs de riz, briques, ferraille, engrais). " +
             "Aucune contrainte de fragilite, mais necessite un vehicule a forte capacite ponderale.",
             "{\"poids_min\":40,\"poids_max\":null,\"volume_min\":null,\"volume_max\":null,\"fragilite_min\":null,\"fragilite_max\":null,\"valeur_min\":null,\"valeur_max\":null,\"delai_max_h\":null}",
             "false"}
        };

        for (String[] t : templates) {
            CategorieProduit cat = new CategorieProduit();
            cat.setPmeCliente(tenant);
            cat.setLibelle(t[0]);
            cat.setClasseValeur(ClasseValeur.valueOf(t[1]));
            cat.setClasseCode(t[1]);          // V12 : double-ecriture
            cat.setJustification(t[2]);
            cat.setSeuilsMl(t[3]);            // V12 : seuils pre-calculés
            cat.setHabiliteRequis(Boolean.parseBoolean(t[4])); // V12
            cat.setActif(true);
            cat.setMlActivable(true);          // V12
            categorieProduitRepository.save(cat);
        }
    }
}
