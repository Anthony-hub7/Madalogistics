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

        // Freelance DOIT declarer son vehicule
        if ("FREELANCE".equals(typeChauffeur)) {
            if (!Boolean.TRUE.equals(aVehiculeAssigne)
                    || immatriculation == null || immatriculation.isBlank()
                    || typeVehicule == null || typeVehicule.isBlank()) {
                throw new BusinessException(
                        "Un chauffeur freelance doit declarer son vehicule : immatriculation et type sont obligatoires");
            }
        }

        // Determiner le tenant : agence cible si rattaché, plateforme si freelance
        PMECliente tenant = null;
        if ("RATTACHE".equals(typeChauffeur) && agenceId != null) {
            tenant = pmeClienteRepository.findByTenantId(agenceId)
                    .orElseThrow(() -> new ResourceNotFoundException("Agence introuvable : " + agenceId));
        } else {
            // Freelance → tenant plateforme
            tenant = pmeClienteRepository.findByNomEntreprise("PLATEFORME MADALOGISTIX")
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
        utilisateur.setCin(cin != null ? cin.trim().replaceAll("\\s+", "") : cin);
        if (dateNaissance != null && !dateNaissance.isBlank()) {
            try {
                utilisateur.setDateNaissance(LocalDate.parse(dateNaissance));
            } catch (java.time.format.DateTimeParseException e) {
                throw new BusinessException("Format de date de naissance invalide (attendu YYYY-MM-DD) : " + dateNaissance);
            }
        }
        utilisateur.setSexe(sexe != null ? sexe.trim().toUpperCase() : sexe);
        utilisateur.setAdresse(adresse);

        Utilisateur savedUser = utilisateurRepository.save(utilisateur);

        // Creation de l'entite chauffeur
        Chauffeur chauffeur = new Chauffeur();
        chauffeur.setPmeCliente(tenant);
        chauffeur.setUtilisateur(savedUser);
        chauffeur.setTelephone(telephone);
        chauffeur.setDisponible(true);
        chauffeur.setPermisNumero(permisNumero != null ? permisNumero.trim() : permisNumero);
        chauffeur.setPermisCategorie(permisCategorie != null ? permisCategorie.trim().toUpperCase() : permisCategorie);
        chauffeur.setPermisCategories(permisCategories);
        if (permisExpiration != null && !permisExpiration.isBlank()) {
            try {
                chauffeur.setPermisExpiration(LocalDate.parse(permisExpiration));
            } catch (java.time.format.DateTimeParseException e) {
                throw new BusinessException("Format de date d'expiration du permis invalide (attendu YYYY-MM-DD) : " + permisExpiration);
            }
        }
        chauffeur.setPermisScan(permisScan);
        chauffeur.setExperienceAnnees(experienceAnnees);
        chauffeur.setTypeChauffeur(typeChauffeur != null ? typeChauffeur.trim().toUpperCase() : typeChauffeur);
        chauffeur.setStatutDossier("EN_ATTENTE");

        if ("RATTACHE".equals(typeChauffeur) && agenceId != null) {
            chauffeur.setAgenceCible(tenant);
        }

        // Creation du vehicule si declare
        if (Boolean.TRUE.equals(aVehiculeAssigne) && immatriculation != null && !immatriculation.isBlank()) {
            Vehicule vehicule = new Vehicule();
            vehicule.setPmeCliente(tenant);
            if ("RATTACHE".equals(typeChauffeur)) {
                if (!tenant.getHubs().isEmpty()) {
                    vehicule.setHub(tenant.getHubs().get(0));
                }
            }
            vehicule.setImmatriculation(immatriculation.trim().toUpperCase());
            try {
                vehicule.setCapaciteVolumeM3(capaciteVolumeM3 != null ? new BigDecimal(capaciteVolumeM3.trim().replace(',', '.')) : BigDecimal.ZERO);
            } catch (NumberFormatException e) {
                throw new BusinessException("Capacite volume invalide : " + capaciteVolumeM3);
            }
            vehicule.setCapacitePoidsKg(BigDecimal.ZERO);
            vehicule.setStatut(VehiculeStatut.DISPONIBLE);
            vehicule.setMarqueModele(marqueModele);
            vehicule.setTypeVehicule(typeVehicule);
            vehicule.setAnnee(annee);
            if (ptacTonnes != null && !ptacTonnes.isBlank()) {
                try {
                    vehicule.setPtacTonnes(new BigDecimal(ptacTonnes.trim().replace(',', '.')));
                } catch (NumberFormatException e) {
                    throw new BusinessException("PTAC invalide : " + ptacTonnes);
                }
            }

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
     * Liste les dossiers de chauffeurs freelance de la plateforme (admin SAAS).
     */
    @Transactional(readOnly = true)
    public java.util.List<Chauffeur> listerDossiersPlateforme(String statut) {
        if (statut == null) {
            return chauffeurRepository.findFreelancesPlateforme();
        }
        return chauffeurRepository.findFreelancesPlateformeByStatut(statut);
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

    /**
     * Desactive un chauffeur freelance (admin SAAS).
     * Le statut passe a DESACTIVEE.
     */
    public void desactiverDossier(UUID chauffeurId, String motif) {
        Chauffeur chauffeur = chauffeurRepository.findById(chauffeurId)
                .orElseThrow(() -> new ResourceNotFoundException("Chauffeur introuvable : " + chauffeurId));

        if (!"VALIDEE".equals(chauffeur.getStatutDossier())) {
            throw new BusinessException("Seuls les chauffeurs valides peuvent etre desactives");
        }

        chauffeur.setStatutDossier("DESACTIVEE");
        chauffeur.setMotifRefus(motif);
        chauffeurRepository.save(chauffeur);
    }

    /**
     * Supprime (desactive definitivement) un chauffeur freelance (admin SAAS).
     * Soft delete : statut passe a DESACTIVEE avec motif.
     */
    public void supprimerDossier(UUID chauffeurId, String motif) {
        Chauffeur chauffeur = chauffeurRepository.findById(chauffeurId)
                .orElseThrow(() -> new ResourceNotFoundException("Chauffeur introuvable : " + chauffeurId));

        chauffeur.setStatutDossier("DESACTIVEE");
        chauffeur.setMotifRefus(motif != null ? motif : "Supprime par l'administrateur");
        chauffeurRepository.save(chauffeur);
    }

    /**
     * Reactiver un chauffeur freelance desactive (admin SAAS).
     * Le statut repasse a VALIDEE.
     */
    public void reactiverDossier(UUID chauffeurId) {
        Chauffeur chauffeur = chauffeurRepository.findById(chauffeurId)
                .orElseThrow(() -> new ResourceNotFoundException("Chauffeur introuvable : " + chauffeurId));

        if (!"DESACTIVEE".equals(chauffeur.getStatutDossier())) {
            throw new BusinessException("Seuls les chauffeurs desactives peuvent etre reactives");
        }

        chauffeur.setStatutDossier("VALIDEE");
        chauffeur.setMotifRefus(null);
        chauffeurRepository.save(chauffeur);
    }
}
