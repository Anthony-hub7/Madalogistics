package com.example.Bakend.service;

import com.example.Bakend.dto.demande.*;
import com.example.Bakend.entity.*;
import com.example.Bakend.entity.enums.ColisEtat;
import com.example.Bakend.entity.enums.DemandeStatut;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.exception.ResourceNotFoundException;
import com.example.Bakend.repository.*;
import com.example.Bakend.security.CustomUserDetails;
import com.example.Bakend.security.SecurityUtils;
import com.example.Bakend.service.tarification.TarificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
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

    public DemandeService(DemandeTransportRepository demandeRepository,
                          ColisRepository colisRepository,
                          HubRepository hubRepository,
                          ClientFinalRepository clientFinalRepository,
                          UtilisateurRepository utilisateurRepository,
                          PMEClienteRepository pmeClienteRepository,
                          CategorieProduitRepository categorieProduitRepository,
                          TarificationService tarificationService) {
        this.demandeRepository = demandeRepository;
        this.colisRepository = colisRepository;
        this.hubRepository = hubRepository;
        this.clientFinalRepository = clientFinalRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.pmeClienteRepository = pmeClienteRepository;
        this.categorieProduitRepository = categorieProduitRepository;
        this.tarificationService = tarificationService;
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

        // Calculer le tarif via TarificationService (V15)
        TarificationService.ResultatTarification resultat = tarificationService
                .calculerPourCreation(
                        tenantId, request.colis(),
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

        demande = demandeRepository.save(demande);

        List<Colis> colisList = new ArrayList<>();
        for (DemandeColisRequest c : request.colis()) {
            Colis colis = new Colis();
            colis.setPmeCliente(tenant);
            colis.setDemande(demande);
            colis.setPoidsKg(c.poidsKg());
            colis.setVolumeM3(c.volumeM3());
            if (c.categorieId() != null) {
                CategorieProduit categorie = categorieProduitRepository
                        .findByPmeClienteTenantIdAndCategorieId(tenantId, c.categorieId())
                        .orElse(null);
                colis.setCategorie(categorie);
            }
            colis.setEtat(ColisEtat.EN_ATTENTE);
            colisList.add(colis);
        }
        colisRepository.saveAll(colisList);

        return demande;
    }

    // ========================================================================
    // VALIDATION / REFUS
    // ========================================================================

    public DemandeTransport valider(UUID tenantId, UUID demandeId) {
        CustomUserDetails user = SecurityUtils.getCurrentUser();
        if (user == null) throw new BusinessException("Utilisateur non authentifié", 401);

        DemandeTransport demande = obtenirDemande(tenantId, demandeId);
        if (demande.getStatut() != DemandeStatut.CREEE) {
            throw new BusinessException(
                    "Seules les commandes au statut CREEE peuvent être validées (statut actuel : " + demande.getStatut() + ")", 409);
        }
        demande.setStatut(DemandeStatut.VALIDEE);
        demande.setValidePar(user.getUtilisateur());
        demande.setStatut(DemandeStatut.EN_ATTENTE_GROUPAGE);
        return demandeRepository.save(demande);
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
        if (demande.getStatut() != DemandeStatut.CREEE && demande.getStatut() != DemandeStatut.VALIDEE) {
            throw new BusinessException(
                    "Seules les commandes CREEE ou VALIDEE peuvent être annulées (statut actuel : " + demande.getStatut() + ")", 409);
        }
        demande.setStatut(DemandeStatut.ANNULEE);
        return demandeRepository.save(demande);
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
}
