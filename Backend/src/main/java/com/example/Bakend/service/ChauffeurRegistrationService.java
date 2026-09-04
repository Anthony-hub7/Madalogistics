package com.example.Bakend.service;

import com.example.Bakend.entity.Chauffeur;
import com.example.Bakend.entity.PMECliente;
import com.example.Bakend.entity.Utilisateur;
import com.example.Bakend.entity.Vehicule;
import com.example.Bakend.entity.enums.Role;
import com.example.Bakend.entity.enums.VehiculeStatut;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.exception.ResourceNotFoundException;
import com.example.Bakend.repository.ChauffeurRepository;
import com.example.Bakend.repository.PMEClienteRepository;
import com.example.Bakend.repository.UtilisateurRepository;
import com.example.Bakend.repository.VehiculeRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

/**
 * Service d'inscription des chauffeurs.
 * Workflow : depot dossier (EN_ATTENTE) → validation agence/plateforme → compte actif.
 * Pattern identique à AgenceRegistrationService.
 */
@Service
@Transactional
public class ChauffeurRegistrationService {

    private final UtilisateurRepository utilisateurRepository;
    private final ChauffeurRepository chauffeurRepository;
    private final VehiculeRepository vehiculeRepository;
    private final PMEClienteRepository pmeClienteRepository;
    private final PasswordEncoder passwordEncoder;

    public ChauffeurRegistrationService(UtilisateurRepository utilisateurRepository,
                                         ChauffeurRepository chauffeurRepository,
                                         VehiculeRepository vehiculeRepository,
                                         PMEClienteRepository pmeClienteRepository,
                                         PasswordEncoder passwordEncoder) {
        this.utilisateurRepository = utilisateurRepository;
        this.chauffeurRepository = chauffeurRepository;
        this.vehiculeRepository = vehiculeRepository;
        this.pmeClienteRepository = pmeClienteRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Depose un dossier d'inscription chauffeur.
     * @return chauffeurId + reference pour affichage front
     */
    public Map<String, Object> deposerDossier(
            String prenom, String nom, String cin, String dateNaissance, String sexe,
            String telephone, String email, String adresse, String motDePasse,
            String permisNumero, String permisCategorie, String permisCategories,
            String permisExpiration, Integer experienceAnnees,
            String typeChauffeur, UUID agenceId,
            Boolean aVehiculeAssigne, String immatriculation, String typeVehicule,
            String marqueModele, Integer annee, String ptacTonnes, String capaciteVolumeM3,
            byte[] permisScan) {

        // Unicite email
        if (utilisateurRepository.existsByEmail(email)) {
            throw new BusinessException("Un compte existe deja avec l'email : " + email);
        }

        // Unicite CIN
        if (utilisateurRepository.existsByCin(cin)) {
            throw new BusinessException("Un compte existe deja avec le CIN : " + cin);
        }

        // Determiner le tenant : agence cible si rattaché, plateforme si freelance
        PMECliente tenant = null;
        if ("RATTACHE".equals(typeChauffeur) && agenceId != null) {
            tenant = pmeClienteRepository.findByTenantId(agenceId)
                    .orElseThrow(() -> new ResourceNotFoundException("Agence introuvable : " + agenceId));
        } else {
            // Freelance → tenant plateforme
            tenant = pmeClienteRepository.findAllOrderByCreatedAtDesc().stream()
                    .filter(t -> "PLATEFORME MADALOGISTIX".equals(t.getNomEntreprise()))
                    .findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("Tenant plateforme introuvable"));
        }

        // Creation de l'utilisateur
        Utilisateur utilisateur = new Utilisateur();
        utilisateur.setPmeCliente(tenant);
        utilisateur.setNom(prenom + " " + nom);
        utilisateur.setEmail(email);
        utilisateur.setMotDePasseHash(passwordEncoder.encode(motDePasse));
        utilisateur.setRole(Role.CHAUFFEUR);
        utilisateur.setHabiliteValeur(false);
        utilisateur.setCin(cin);
        if (dateNaissance != null && !dateNaissance.isBlank()) {
            utilisateur.setDateNaissance(LocalDate.parse(dateNaissance));
        }
        utilisateur.setSexe(sexe);
        utilisateur.setAdresse(adresse);

        Utilisateur savedUser = utilisateurRepository.save(utilisateur);

        // Creation de l'entite chauffeur
        Chauffeur chauffeur = new Chauffeur();
        chauffeur.setPmeCliente(tenant);
        chauffeur.setUtilisateur(savedUser);
        chauffeur.setTelephone(telephone);
        chauffeur.setDisponible(true);
        chauffeur.setPermisNumero(permisNumero);
        chauffeur.setPermisCategorie(permisCategorie);
        chauffeur.setPermisCategories(permisCategories);
        if (permisExpiration != null && !permisExpiration.isBlank()) {
            chauffeur.setPermisExpiration(LocalDate.parse(permisExpiration));
        }
        chauffeur.setPermisScan(permisScan);
        chauffeur.setExperienceAnnees(experienceAnnees);
        chauffeur.setTypeChauffeur(typeChauffeur);
        chauffeur.setStatutDossier("EN_ATTENTE");

        if ("RATTACHE".equals(typeChauffeur) && agenceId != null) {
            chauffeur.setAgenceCible(tenant);
        }

        // Creation du vehicule si declare
        if (Boolean.TRUE.equals(aVehiculeAssigne) && immatriculation != null && !immatriculation.isBlank()) {
            Vehicule vehicule = new Vehicule();
            vehicule.setPmeCliente(tenant);
            // Freelance sans hub → hub null (V6允许)
            if ("RATTACHE".equals(typeChauffeur)) {
                // Pour un chauffeur rattache, on lie le premier hub de l'agence si disponible
                if (!tenant.getHubs().isEmpty()) {
                    vehicule.setHub(tenant.getHubs().get(0));
                }
            }
            vehicule.setImmatriculation(immatriculation);
            vehicule.setCapaciteVolumeM3(capaciteVolumeM3 != null ? new BigDecimal(capaciteVolumeM3) : BigDecimal.ZERO);
            vehicule.setCapacitePoidsKg(BigDecimal.ZERO);
            vehicule.setStatut(VehiculeStatut.DISPONIBLE);
            vehicule.setMarqueModele(marqueModele);
            vehicule.setTypeVehicule(typeVehicule);
            vehicule.setAnnee(annee);
            vehicule.setPtacTonnes(ptacTonnes != null ? new BigDecimal(ptacTonnes) : null);

            Vehicule savedVehicule = vehiculeRepository.save(vehicule);
            chauffeur.setVehicule(savedVehicule);
        }

        Chauffeur savedChauffeur = chauffeurRepository.save(chauffeur);

        return Map.of(
                "chauffeurId", savedChauffeur.getChauffeurId(),
                "reference", "#CHF-" + savedChauffeur.getChauffeurId().toString().substring(0, 8).toUpperCase()
        );
    }

    /**
     * Liste les dossiers de chauffeurs par statut (pour gestionnaire/plateforme).
     */
    @Transactional(readOnly = true)
    public java.util.List<Chauffeur> listerDossiers(String statut, UUID tenantId) {
        return chauffeurRepository.findByPmeClienteTenantId(tenantId).stream()
                .filter(c -> statut == null || c.getStatutDossier().equals(statut))
                .toList();
    }

    /**
     * Detail d'un dossier chauffeur.
     */
    @Transactional(readOnly = true)
    public Chauffeur obtenirDossier(UUID chauffeurId) {
        return chauffeurRepository.findById(chauffeurId)
                .orElseThrow(() -> new ResourceNotFoundException("Chauffeur introuvable : " + chauffeurId));
    }

    /**
     * Valide un dossier de chauffeur (gestionnaire ou admin plateforme).
     */
    public void validerDossier(UUID chauffeurId) {
        Chauffeur chauffeur = chauffeurRepository.findById(chauffeurId)
                .orElseThrow(() -> new ResourceNotFoundException("Chauffeur introuvable : " + chauffeurId));

        if (!"EN_ATTENTE".equals(chauffeur.getStatutDossier())) {
            throw new BusinessException("Ce dossier n'est pas en attente de validation");
        }

        chauffeur.setStatutDossier("VALIDEE");
        chauffeur.setMotifRefus(null);
        chauffeurRepository.save(chauffeur);
    }

    /**
     * Refuse un dossier de chauffeur (gestionnaire ou admin plateforme).
     */
    public void refuserDossier(UUID chauffeurId, String motif) {
        Chauffeur chauffeur = chauffeurRepository.findById(chauffeurId)
                .orElseThrow(() -> new ResourceNotFoundException("Chauffeur introuvable : " + chauffeurId));

        if (!"EN_ATTENTE".equals(chauffeur.getStatutDossier())) {
            throw new BusinessException("Ce dossier n'est pas en attente de validation");
        }

        chauffeur.setStatutDossier("REFUSEE");
        chauffeur.setMotifRefus(motif);
        chauffeurRepository.save(chauffeur);
    }
}
