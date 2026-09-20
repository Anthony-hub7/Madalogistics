package com.example.Bakend.service;

import com.example.Bakend.dto.demande.*;
import com.example.Bakend.entity.*;
import com.example.Bakend.entity.enums.AuditAction;
import com.example.Bakend.entity.enums.ColisEtat;
import com.example.Bakend.entity.enums.DemandeStatut;
import com.example.Bakend.entity.enums.ModeLivraison;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.exception.ResourceNotFoundException;
import com.example.Bakend.optimisation.categorisation.CategorisationInferenceService;
import com.example.Bakend.optimisation.categorisation.NiveauValeurMapper;
import com.example.Bakend.optimisation.delai.DelaiService;
import com.example.Bakend.maps.TrajetService;
import com.example.Bakend.repository.*;
import com.example.Bakend.security.CustomUserDetails;
import com.example.Bakend.security.SecurityUtils;
import com.example.Bakend.service.tarification.TarificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Service de gestion des demandes de transport (commandes client).
 * V15 : tarification par grille reliée à catégorie.
 */
@Service
@Transactional
public class DemandeService {

    private final DemandeTransportRepository demandeRepository;
    private final ColisRepository colisRepository;
    private final HubRepository hubRepository;
    private final ClientFinalRepository clientFinalRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final PMEClienteRepository pmeClienteRepository;
    private final CategorieProduitRepository categorieProduitRepository;
    private final TarificationService tarificationService;
    private final CategorisationInferenceService categorisationInferenceService;
    private final ColisFeatureRepository colisFeatureRepository;
    private final EtapeLivraisonRepository etapeLivraisonRepository;
    private final FactureRepository factureRepository;
    private final AuditLogRepository auditLogRepository;
    private final TrajetService trajetService;

    public DemandeService(DemandeTransportRepository demandeRepository,
                          ColisRepository colisRepository,
                          HubRepository hubRepository,
                          ClientFinalRepository clientFinalRepository,
                          UtilisateurRepository utilisateurRepository,
                          PMEClienteRepository pmeClienteRepository,
                          CategorieProduitRepository categorieProduitRepository,
                          TarificationService tarificationService,
                          CategorisationInferenceService categorisationInferenceService,
                          ColisFeatureRepository colisFeatureRepository,
                          EtapeLivraisonRepository etapeLivraisonRepository,
                          FactureRepository factureRepository,
                          AuditLogRepository auditLogRepository,
                          TrajetService trajetService) {
        this.demandeRepository = demandeRepository;
        this.colisRepository = colisRepository;
        this.hubRepository = hubRepository;
        this.clientFinalRepository = clientFinalRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.pmeClienteRepository = pmeClienteRepository;
        this.categorieProduitRepository = categorieProduitRepository;
        this.tarificationService = tarificationService;
        this.categorisationInferenceService = categorisationInferenceService;
        this.colisFeatureRepository = colisFeatureRepository;
        this.etapeLivraisonRepository = etapeLivraisonRepository;
        this.factureRepository = factureRepository;
        this.auditLogRepository = auditLogRepository;
        this.trajetService = trajetService;
    }

    // ========================================================================
    // DEVIS
    // ========================================================================

    @Transactional(readOnly = true)
    public DemandeDevisResponse calculerDevis(UUID tenantId, DemandeDevisRequest request) {
        return tarificationService.calculerDevis(tenantId, request);
    }

    // ========================================================================
    // CREATION
    // ========================================================================

    public DemandeTransport creer(UUID tenantId, UUID clientFinalId, DemandeCreateRequest request) {
        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant introuvable : " + tenantId));

        ClientFinal clientFinal = clientFinalRepository
                .findByPmeClienteTenantIdAndClientFinalId(tenantId, clientFinalId)
                .orElseThrow(() -> new ResourceNotFoundException("Client final introuvable : " + clientFinalId));

        Hub hub = hubRepository.findByPmeClienteTenantIdAndHubId(tenantId, request.hubId())
                .orElseThrow(() -> new ResourceNotFoundException("Hub introuvable : " + request.hubId()));

        // Phase 3 : validation complétude des colis
        for (DemandeColisRequest c : request.colis()) {
            if (c.poidsKg() == null || c.poidsKg().doubleValue() <= 0) {
                throw new BusinessException("Le poids de chaque colis doit être supérieur à 0", 400);
            }
            if (c.volumeM3() == null || c.volumeM3().doubleValue() <= 0) {
                throw new BusinessException("Le volume de chaque colis doit être supérieur à 0", 400);
            }
        }

        // Calculer le tarif via TarificationService (V16)
        TarificationService.ResultatTarification resultat = tarificationService
                .calculerPourCreation(
                        tenantId, request.hubId(), request.colis(),
                        request.assurance(), request.express(),
                        request.latitudeCollecte(), request.longitudeCollecte(),
                        request.latitudeLivraison(), request.longitudeLivraison());

        DemandeTransport demande = new DemandeTransport();
        demande.setPmeCliente(tenant);
        demande.setClientFinal(clientFinal);
        demande.setHub(hub);
        demande.setAdresseCollecte(request.adresseCollecte());
        demande.setAdresseLivraison(request.adresseLivraison());
        demande.setLatitudeCollecte(request.latitudeCollecte());
        demande.setLongitudeCollecte(request.longitudeCollecte());
        demande.setLatitudeLivraison(request.latitudeLivraison());
        demande.setLongitudeLivraison(request.longitudeLivraison());
        demande.setDateSouhaitee(request.dateSouhaitee());
        demande.setCreneau(request.creneau());
        demande.setNomDestinataire(request.nomDestinataire());
        demande.setTelDestinataire(request.telDestinataire());
        demande.setTarif(resultat.tarif());
        demande.setDistanceKm(resultat.distanceKm());
        demande.setStatut(DemandeStatut.CREEE);

        // V20 : calcul delai + date depart via TrajetService (OSRM ou Haversine fallback)
        if (hub.getLatitude() != null && hub.getLongitude() != null
                && request.latitudeCollecte() != null && request.longitudeCollecte() != null
                && request.latitudeLivraison() != null && request.longitudeLivraison() != null) {
            try {
                TrajetService.TrajetResult trajet = trajetService.calculerTrajet(
                        hub.getLatitude(), hub.getLongitude(),
                        request.latitudeCollecte(), request.longitudeCollecte(),
                        request.latitudeLivraison(), request.longitudeLivraison());
                demande.setDureeTrajetHeures(trajet.distanceKm()); // distance deja set plus haut
                // Utiliser la duree reelle du trajet
                demande.setDureeTrajetHeures(java.math.BigDecimal.valueOf(trajet.dureeHeures())
                        .setScale(2, java.math.RoundingMode.HALF_UP));
                demande.setSourceDelai(trajet.source());
                demande.setDelaiTransitJours(DelaiService.calculerDelai(
                        java.math.BigDecimal.valueOf(trajet.dureeHeures())));
                demande.setDateDepartCalculee(DelaiService.calculerDateDepart(
                        request.dateSouhaitee(),
                        demande.getDelaiTransitJours(),
                        tenant.getMargeSecuritePct()));
            } catch (Exception e) {
                // Fallback : delai = 1 jour minimum
                demande.setDelaiTransitJours(java.math.BigDecimal.ONE);
                demande.setSourceDelai("HAVERSINE_FALLBACK");
                if (request.dateSouhaitee() != null) {
                    demande.setDateDepartCalculee(request.dateSouhaitee().minusDays(2));
                }
            }
        }

        demande = demandeRepository.save(demande);

        List<Colis> colisList = new ArrayList<>();
        for (DemandeColisRequest c : request.colis()) {
            Colis colis = new Colis();
            colis.setPmeCliente(tenant);
            colis.setDemande(demande);
            colis.setPoidsKg(c.poidsKg());
            colis.setVolumeM3(c.volumeM3());
            CategorieProduit categorie = null;
            if (c.categorieId() != null) {
                categorie = categorieProduitRepository
                        .findByPmeClienteTenantIdAndCategorieId(tenantId, c.categorieId())
                        .orElse(null);
            }
            int fragilite = c.fragilite() != null ? c.fragilite() : 0;
            double valeur = NiveauValeurMapper.toMontant(c.niveauValeur()).doubleValue();
            if (categorie == null) {
                categorie = categorisationInferenceService.predire(
                        tenantId,
                        c.poidsKg().doubleValue(),
                        c.volumeM3().doubleValue(),
                        fragilite,
                        valeur,
                        request.express());
            }
            colis.setCategorie(categorie);
            colis.setEtat(ColisEtat.EN_ATTENTE);
            colisList.add(colis);
        }
        colisRepository.saveAll(colisList);

        for (Colis colis : colisList) {
            DemandeColisRequest c = request.colis().get(colisList.indexOf(colis));
            ColisFeature cf = new ColisFeature();
            cf.setColis(colis);
            cf.setPmeCliente(tenant);
            cf.setFragilite010(c.fragilite() != null ? c.fragilite().shortValue() : 0);
            cf.setValeurEstimeeAr(NiveauValeurMapper.toMontant(c.niveauValeur()));
            cf.setDelaiExpress(request.express());
            colisFeatureRepository.save(cf);
        }

        // Phase 3 : traçabilité audit_log CREATION
        CustomUserDetails currentUser = SecurityUtils.getCurrentUser();
        AuditLog audit = new AuditLog();
        audit.setPmeCliente(tenant);
        audit.setUtilisateur(currentUser != null ? currentUser.getUtilisateur() : null);
        audit.setEntite("DemandeTransport");
        audit.setEntiteId(demande.getDemandeId());
        audit.setAction(AuditAction.CREATION);
        double poidsTotal = colisList.stream().mapToDouble(c -> c.getPoidsKg().doubleValue()).sum();
        double volumeTotal = colisList.stream().mapToDouble(c -> c.getVolumeM3().doubleValue()).sum();
        audit.setDetails("{\"nbColis\":" + colisList.size()
                + ",\"poidsTotalKg\":" + poidsTotal
                + ",\"volumeTotalM3\":" + volumeTotal
                + ",\"tarif\":" + (demande.getTarif() != null ? demande.getTarif() : 0)
                + ",\"hubId\":\"" + hub.getHubId() + "\"}");
        auditLogRepository.save(audit);

        return demande;
    }

    // ========================================================================
    // VALIDATION / REFUS
    // ========================================================================

    /**
     * Phase 3bis : validation avec mode de livraison (défaut AGENCE).
     * Garde-fou : colis sans catégorie → 409 (incohérence détectée, contacter support).
     */
    public DemandeTransport valider(UUID tenantId, UUID demandeId, String mode) {
        CustomUserDetails user = SecurityUtils.getCurrentUser();
        if (user == null) throw new BusinessException("Utilisateur non authentifié", 401);

        DemandeTransport demande = obtenirDemande(tenantId, demandeId);
        if (demande.getStatut() != DemandeStatut.CREEE) {
            throw new BusinessException(
                    "Seules les commandes au statut CREEE peuvent être validées (statut actuel : " + demande.getStatut() + ")", 409);
        }

        // Garde-fou : vérifier que tous les colis ont une catégorie (Phase 3 inférence auto)
        List<Colis> colisList = demande.getColis();
        if (colisList != null) {
            for (Colis c : colisList) {
                if (c.getCategorie() == null) {
                    throw new BusinessException(
                            "Incohérence détectée : colis " + c.getColisId() + " sans catégorie. " +
                            "Vérifier la configuration du tenant, contacter support.", 409);
                }
            }
        }

        // Appliquer le mode (défaut AGENCE si null/illégal)
        ModeLivraison modeLivraison = ModeLivraison.AGENCE;
        if (mode != null) {
            try {
                modeLivraison = ModeLivraison.valueOf(mode.toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new BusinessException("Mode de livraison invalide : " + mode + " (valeurs attendues : AGENCE, FREELANCE)", 400);
            }
        }

        demande.setModeLivraison(modeLivraison);
        demande.setStatut(DemandeStatut.EN_ATTENTE_GROUPAGE);
        demande.setValidePar(user.getUtilisateur());
        DemandeTransport saved = demandeRepository.save(demande);

        // Audit VALIDATION (même transaction @Transactional → atomicité)
        int nbColis = colisList != null ? colisList.size() : 0;
        AuditLog audit = new AuditLog();
        audit.setPmeCliente(demande.getPmeCliente());
        audit.setUtilisateur(user.getUtilisateur());
        audit.setEntite("DemandeTransport");
        audit.setEntiteId(demande.getDemandeId());
        audit.setAction(AuditAction.VALIDATION);
        audit.setDetails("{\"modeLivraison\":\"" + modeLivraison.name()
                + "\",\"nbColis\":" + nbColis
                + ",\"validePar\":\"" + user.getUtilisateur().getUtilisateurId() + "\"}");
        auditLogRepository.save(audit);

        return saved;
    }

    public DemandeTransport refuser(UUID tenantId, UUID demandeId, String motif) {
        CustomUserDetails user = SecurityUtils.getCurrentUser();
        if (user == null) throw new BusinessException("Utilisateur non authentifié", 401);

        DemandeTransport demande = obtenirDemande(tenantId, demandeId);
        if (demande.getStatut() != DemandeStatut.CREEE) {
            throw new BusinessException(
                    "Seules les commandes au statut CREEE peuvent être refusées (statut actuel : " + demande.getStatut() + ")", 409);
        }
        demande.setStatut(DemandeStatut.REFUSEE);
        demande.setValidePar(user.getUtilisateur());
        demande.setMotifRefus(motif);
        return demandeRepository.save(demande);
    }

    public DemandeTransport annuler(UUID tenantId, UUID demandeId) {
        DemandeTransport demande = obtenirDemande(tenantId, demandeId);
        if (demande.getStatut() != DemandeStatut.CREEE
                && demande.getStatut() != DemandeStatut.VALIDEE
                && demande.getStatut() != DemandeStatut.EN_ATTENTE_GROUPAGE) {
            throw new BusinessException(
                    "Seules les commandes CREEE, VALIDEE ou EN_ATTENTE_GROUPAGE peuvent être annulées (statut actuel : " + demande.getStatut() + ")", 409);
        }
        demande.setStatut(DemandeStatut.ANNULEE);
        return demandeRepository.save(demande);
    }

    // ========================================================================
    // PROGRAMMATION (EN_ATTENTE_GROUPAGE → GROUPEE)
    // ========================================================================

    public DemandeTransport programmer(UUID tenantId, UUID demandeId, LocalDateTime dateCollecte, String creneauPrecis) {
        DemandeTransport demande = obtenirDemande(tenantId, demandeId);
        if (demande.getStatut() != DemandeStatut.EN_ATTENTE_GROUPAGE) {
            throw new BusinessException(
                    "Seules les commandes EN_ATTENTE_GROUPAGE peuvent être programmées (statut actuel : " + demande.getStatut() + ")", 409);
        }
        demande.setStatut(DemandeStatut.GROUPEE);
        return demandeRepository.save(demande);
    }

    // ========================================================================
    // MARQUER LIVRÉ (EN_TRANSIT → LIVREE + facture auto)
    // ========================================================================

    public DemandeTransport marquerLivree(UUID tenantId, UUID demandeId, String photoUrl, String signatureNom) {
        DemandeTransport demande = obtenirDemande(tenantId, demandeId);
        if (demande.getStatut() != DemandeStatut.EN_TRANSIT) {
            throw new BusinessException(
                    "Seules les commandes EN_TRANSIT peuvent être marquées livrées (statut actuel : " + demande.getStatut() + ")", 409);
        }
        demande.setStatut(DemandeStatut.LIVREE);
        DemandeTransport saved = demandeRepository.save(demande);

        // Génération automatique de la facture
        if (factureRepository.findByDemandeDemandeId(demandeId).isEmpty()) {
            Facture facture = new Facture();
            facture.setPmeCliente(demande.getPmeCliente());
            facture.setDemande(demande);
            facture.setMontantTotal(demande.getTarif() != null ? demande.getTarif() : BigDecimal.ZERO);
            facture.setStatut(com.example.Bakend.entity.enums.FactureStatut.EMISE);
            factureRepository.save(facture);
        }

        return saved;
    }

    // ========================================================================
    // LECTURE
    // ========================================================================

    @Transactional(readOnly = true)
    public List<DemandeTransport> lister(UUID tenantId, UUID clientFinalId) {
        if (clientFinalId != null) {
            return demandeRepository.findByPmeClienteTenantIdAndClientFinalClientFinalId(tenantId, clientFinalId);
        }
        return demandeRepository.findByPmeClienteTenantId(tenantId);
    }

    @Transactional(readOnly = true)
    public List<DemandeTransport> listerParStatut(UUID tenantId, DemandeStatut statut) {
        return demandeRepository.findByPmeClienteTenantIdAndStatut(tenantId, statut);
    }

    @Transactional(readOnly = true)
    public DemandeTransport obtenirDemande(UUID tenantId, UUID demandeId) {
        return demandeRepository.findByPmeClienteTenantIdAndDemandeId(tenantId, demandeId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande introuvable : " + demandeId));
    }

    // ========================================================================
    // FACTURE
    // ========================================================================

    @Transactional(readOnly = true)
    public java.util.Map<String, Object> obtenirFacture(UUID tenantId, UUID demandeId) {
        DemandeTransport demande = obtenirDemande(tenantId, demandeId);
        var factureOpt = factureRepository.findByDemandeDemandeId(demandeId);
        if (factureOpt.isEmpty()) {
            return java.util.Map.of("existe", false, "demandeId", demandeId);
        }
        Facture f = factureOpt.get();
        return java.util.Map.of(
                "existe", true,
                "factureId", f.getFactureId(),
                "montantTotal", f.getMontantTotal(),
                "statut", f.getStatut().name(),
                "dateEmission", f.getDateEmission(),
                "demandeId", demandeId,
                "distanceKm", demande.getDistanceKm() != null ? demande.getDistanceKm() : BigDecimal.ZERO,
                "tarif", demande.getTarif() != null ? demande.getTarif() : BigDecimal.ZERO
        );
    }
}
