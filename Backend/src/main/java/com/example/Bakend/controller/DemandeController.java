package com.example.Bakend.controller;

import com.example.Bakend.dto.demande.*;
import com.example.Bakend.entity.*;
import com.example.Bakend.entity.enums.DemandeStatut;
import com.example.Bakend.entity.enums.Role;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.optimisation.categorisation.CategorisationInferenceService;
import com.example.Bakend.optimisation.categorisation.NiveauValeurMapper;
import com.example.Bakend.repository.HubRepository;
import com.example.Bakend.security.CustomUserDetails;
import com.example.Bakend.security.SecurityUtils;
import com.example.Bakend.service.DemandeService;
import com.example.Bakend.service.RecommandationService;
import com.example.Bakend.repository.CategorieProduitRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Contrôleur REST pour les demandes de transport (commandes client).
 *
 * CLIENT_FINAL : créer, consulter ses commandes, annuler, demander un devis.
 * GESTIONNAIRE  : consulter toutes les commandes du tenant, valider/refuser.
 */
@RestController
@RequestMapping("/api/demandes")
public class DemandeController {

    private final DemandeService demandeService;
    private final CategorieProduitRepository categorieProduitRepository;
    private final RecommandationService recommandationService;
    private final CategorisationInferenceService categorisationInferenceService;
    private final HubRepository hubRepository;

    public DemandeController(DemandeService demandeService,
                             CategorieProduitRepository categorieProduitRepository,
                             RecommandationService recommandationService,
                             CategorisationInferenceService categorisationInferenceService,
                             HubRepository hubRepository) {
        this.demandeService = demandeService;
        this.categorieProduitRepository = categorieProduitRepository;
        this.recommandationService = recommandationService;
        this.categorisationInferenceService = categorisationInferenceService;
        this.hubRepository = hubRepository;
    }

    // ========================================================================
    // DEVIS (tout utilisateur authentifié du tenant)
    // ========================================================================

    /**
     * Calcule un devis estimé sans créer de commande.
     * POST /api/demandes/devis
     */
    @PostMapping("/devis")
    @PreAuthorize("hasAnyRole('CLIENT_FINAL','GESTIONNAIRE','DIRECTION')")
    @Transactional(readOnly = true)
    public DemandeDevisResponse calculerDevis(@Valid @RequestBody DemandeDevisRequest request) {
        UUID tenantId = requireTenantId();
        return demandeService.calculerDevis(tenantId, request);
    }

    // ========================================================================
    // CRÉATION (CLIENT_FINAL)
    // ========================================================================

    /**
     * Crée une demande de transport.
     * POST /api/demandes
     */
    @PostMapping
    @PreAuthorize("hasRole('CLIENT_FINAL')")
    public ResponseEntity<Map<String, Object>> creer(@Valid @RequestBody DemandeCreateRequest request) {
        UUID tenantId = requireTenantId();
        UUID clientFinalId = resolveClientFinalId();

        DemandeTransport demande = demandeService.creer(tenantId, clientFinalId, request);

        return ResponseEntity.ok(Map.of(
                "message", "Demande créée avec succès",
                "demandeId", demande.getDemandeId(),
                "tarif", demande.getTarif(),
                "statut", demande.getStatut().name()
        ));
    }

    // ========================================================================
    // LISTE
    // ========================================================================

    /**
     * Liste les demandes.
     * CLIENT_FINAL ne voit que les siennes ; GESTIONNAIRE/DIRECTION voient tout le tenant.
     * GET /api/demandes?statut=EN_ATTENTE_GROUPAGE
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('CLIENT_FINAL','GESTIONNAIRE','DIRECTION')")
    @Transactional(readOnly = true)
    public List<DemandeDetailResponse> lister(@RequestParam(required = false) String statut) {
        UUID tenantId = requireTenantId();
        CustomUserDetails user = SecurityUtils.getCurrentUser();

        DemandeStatut filtreStatut = null;
        if (statut != null && !statut.isBlank()) {
            try {
                filtreStatut = DemandeStatut.valueOf(statut.toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new BusinessException("Statut invalide : " + statut, 400);
            }
        }
        final DemandeStatut statutFiltre = filtreStatut;

        List<DemandeTransport> demandes;
        if (user.getUtilisateur().getRole() == Role.CLIENT_FINAL) {
            UUID clientFinalId = resolveClientFinalId();
            demandes = demandeService.lister(tenantId, clientFinalId);
        } else {
            demandes = demandeService.lister(tenantId, null);
        }

        if (statutFiltre != null) {
            demandes = demandes.stream()
                    .filter(d -> d.getStatut() == statutFiltre)
                    .toList();
        }

        return demandes.stream()
                .map(DemandeDetailResponse::from)
                .toList();
    }

    // ========================================================================
    // DÉTAIL
    // ========================================================================

    /**
     * Détail d'une demande.
     * CLIENT_FINAL ne peut voir que les siennes.
     * GET /api/demandes/{id}
     */
    @GetMapping("/{demandeId}")
    @PreAuthorize("hasAnyRole('CLIENT_FINAL','GESTIONNAIRE','DIRECTION')")
    @Transactional(readOnly = true)
    public DemandeDetailResponse obtenir(@PathVariable UUID demandeId) {
        UUID tenantId = requireTenantId();
        CustomUserDetails user = SecurityUtils.getCurrentUser();
        DemandeTransport demande = demandeService.obtenirDemande(tenantId, demandeId);

        if (user.getUtilisateur().getRole() == Role.CLIENT_FINAL) {
            UUID clientFinalId = resolveClientFinalId();
            if (!demande.getClientFinal().getClientFinalId().equals(clientFinalId)) {
                throw new BusinessException("Accès interdit à cette demande", 403);
            }
        }

        return DemandeDetailResponse.from(demande);
    }

    // ========================================================================
    // VALIDATION / REFUS (GESTIONNAIRE / DIRECTION)
    // ========================================================================

    /**
     * Valide une commande : CREEE → EN_ATTENTE_GROUPAGE.
     * POST /api/demandes/{id}/valider
     */
    @PostMapping("/{demandeId}/valider")
    @PreAuthorize("hasAnyRole('GESTIONNAIRE','DIRECTION')")
    public ResponseEntity<Map<String, String>> valider(@PathVariable UUID demandeId) {
        UUID tenantId = requireTenantId();
        demandeService.valider(tenantId, demandeId);
        return ResponseEntity.ok(Map.of("message", "Commande validée et mise en attente de groupage"));
    }

    /**
     * Refuse une commande : CREEE → REFUSEE.
     * POST /api/demandes/{id}/refuser
     */
    @PostMapping("/{demandeId}/refuser")
    @PreAuthorize("hasAnyRole('GESTIONNAIRE','DIRECTION')")
    public ResponseEntity<Map<String, String>> refuser(@PathVariable UUID demandeId,
                                                       @RequestBody Map<String, String> body) {
        UUID tenantId = requireTenantId();
        String motif = body.getOrDefault("motif", "Commande refusée par le gestionnaire");
        demandeService.refuser(tenantId, demandeId, motif);
        return ResponseEntity.ok(Map.of("message", "Commande refusée"));
    }

    // ========================================================================
    // ANNULATION (CLIENT_FINAL)
    // ========================================================================

    /**
     * Annule une commande : CREEE ou VALIDEE → ANNULEE.
     * POST /api/demandes/{id}/annuler
     */
    @PostMapping("/{demandeId}/annuler")
    @PreAuthorize("hasRole('CLIENT_FINAL')")
    public ResponseEntity<Map<String, String>> annuler(@PathVariable UUID demandeId) {
        UUID tenantId = requireTenantId();
        demandeService.annuler(tenantId, demandeId);
        return ResponseEntity.ok(Map.of("message", "Commande annulée"));
    }

    // ========================================================================
    // CATÉGORIES (pour le formulaire client)
    // ========================================================================

    /**
     * Liste les catégories actives du tenant pour le formulaire de création.
     * GET /api/demandes/categories
     */
    @GetMapping("/categories")
    @PreAuthorize("hasAnyRole('CLIENT_FINAL','GESTIONNAIRE','DIRECTION')")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listerCategories() {
        UUID tenantId = requireTenantId();
        return categorieProduitRepository.findByPmeClienteTenantIdAndActif(tenantId, true)
                .stream()
                .map(c -> {
                    var map = new java.util.HashMap<String, Object>();
                    map.put("categorieId", c.getCategorieId());
                    map.put("libelle", c.getLibelle());
                    map.put("classeValeur", c.getClasseValeur() != null ? c.getClasseValeur().name() : null);
                    map.put("classeCode", c.getClasseCode());
                    return (Map<String, Object>) map;
                })
                .toList();
    }

    // ========================================================================
    // RECOMMANDATION HUBS (Phase 1 — score pondéré)
    // ========================================================================

    /**
     * Classe les hubs du tenant par score décroissant (proximité + tarif + fiabilité + délai).
     * GET /api/demandes/recommandation-hubs?latCollecte=...&lonCollecte=...&latLivraison=...&lonLivraison=...&assurance=false&express=false
     */
    @GetMapping("/recommandation-hubs")
    @PreAuthorize("hasAnyRole('CLIENT_FINAL','GESTIONNAIRE','DIRECTION')")
    @Transactional(readOnly = true)
    public List<HubRecommandationResponse> recommanderHubs(
            @RequestParam Double latCollecte,
            @RequestParam Double lonCollecte,
            @RequestParam Double latLivraison,
            @RequestParam Double lonLivraison,
            @RequestParam(defaultValue = "false") boolean assurance,
            @RequestParam(defaultValue = "false") boolean express) {
        UUID tenantId = requireTenantId();
        return recommandationService.classer(
                tenantId, latCollecte, lonCollecte, latLivraison, lonLivraison,
                assurance, express);
    }

    // ========================================================================
    // PRÉDICTION CLASSE (Module C)
    // ========================================================================

    /**
     * Prédit la classe d'un colis via les règles ML du tenant.
     * POST /api/demandes/predire-classe
     */
    @PostMapping("/predire-classe")
    @PreAuthorize("hasAnyRole('CLIENT_FINAL','GESTIONNAIRE','DIRECTION')")
    @Transactional(readOnly = true)
    public PredireClasseResponse predireClasse(@Valid @RequestBody PredireClasseRequest request) {
        UUID tenantId = requireTenantId();
        if (request.poidsKg() == null || request.volumeM3() == null
                || request.poidsKg().doubleValue() <= 0 || request.volumeM3().doubleValue() <= 0) {
            throw new BusinessException("Le poids et le volume doivent être supérieurs à 0", 400);
        }
        int fragilite = request.fragilite() != null ? request.fragilite() : 0;
        double valeur = NiveauValeurMapper.toMontant(request.niveauValeur()).doubleValue();
        CategorieProduit predite = categorisationInferenceService.predire(
                tenantId,
                request.poidsKg().doubleValue(),
                request.volumeM3().doubleValue(),
                fragilite,
                valeur,
                request.express());
        if (predite == null) {
            return new PredireClasseResponse(null, null, null, "Aucune catégorie disponible");
        }
        return new PredireClasseResponse(
                predite.getCategorieId(),
                predite.getClasseCode(),
                predite.getLibelle(),
                "regles_ml");
    }

    // ========================================================================
    // HUBS ACCESSIBLES (Module D)
    // ========================================================================

    /**
     * Liste les hubs actifs du tenant (pour CLIENT_FINAL).
     * GET /api/demandes/hubs
     */
    @GetMapping("/hubs")
    @PreAuthorize("hasAnyRole('CLIENT_FINAL','GESTIONNAIRE','DIRECTION')")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listerHubs() {
        UUID tenantId = requireTenantId();
        return hubRepository.findByPmeClienteTenantId(tenantId)
                .stream()
                .filter(Hub::isActif)
                .map(h -> {
                    var map = new java.util.HashMap<String, Object>();
                    map.put("hubId", h.getHubId());
                    map.put("nom", h.getNom());
                    map.put("adresse", h.getAdresse());
                    map.put("latitude", h.getLatitude());
                    map.put("longitude", h.getLongitude());
                    return (Map<String, Object>) map;
                })
                .toList();
    }

    // ========================================================================
    // LIVRAISON (Module F — marque par le chauffeur)
    // ========================================================================

    /**
     * Marque une commande livrée : EN_TRANSIT → LIVREE + facture auto + POD.
     * POST /api/demandes/{id}/livrer
     */
    @PostMapping("/{demandeId}/livrer")
    @PreAuthorize("hasAnyRole('CHAUFFEUR','GESTIONNAIRE','DIRECTION')")
    public ResponseEntity<Map<String, String>> marquerLivree(
            @PathVariable UUID demandeId,
            @RequestBody(required = false) LivraisonChauffeurRequest body) {
        UUID tenantId = requireTenantId();
        String photoUrl = body != null ? body.photoUrl() : null;
        String signatureNom = body != null ? body.signatureNom() : null;
        demandeService.marquerLivree(tenantId, demandeId, photoUrl, signatureNom);
        return ResponseEntity.ok(Map.of("message", "Commande marquée livrée"));
    }

    // ========================================================================
    // FACTURE (Module G)
    // ========================================================================

    /**
     * Récupère la facture liée à une commande.
     * GET /api/demandes/{id}/facture
     */
    @GetMapping("/{demandeId}/facture")
    @PreAuthorize("hasAnyRole('CLIENT_FINAL','GESTIONNAIRE','DIRECTION')")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> obtenirFacture(@PathVariable UUID demandeId) {
        UUID tenantId = requireTenantId();
        return ResponseEntity.ok(demandeService.obtenirFacture(tenantId, demandeId));
    }

    // ========================================================================
    // PROGRAMMATION (Module E)
    // ========================================================================

    /**
     * Programme une commande : EN_ATTENTE_GROUPAGE → GROUPEE avec fenêtre précise.
     * POST /api/demandes/{id}/programmer
     */
    @PostMapping("/{demandeId}/programmer")
    @PreAuthorize("hasAnyRole('GESTIONNAIRE','DIRECTION')")
    public ResponseEntity<Map<String, String>> programmer(@PathVariable UUID demandeId,
                                                          @Valid @RequestBody ProgrammerRequest request) {
        UUID tenantId = requireTenantId();
        demandeService.programmer(tenantId, demandeId, request.dateCollecte(), request.creneauPrecis());
        return ResponseEntity.ok(Map.of("message", "Collecte programmée"));
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    private UUID requireTenantId() {
        UUID tenantId = SecurityUtils.getTenantId();
        if (tenantId == null) {
            throw new BusinessException("Contexte tenant manquant", 403);
        }
        return tenantId;
    }

    /**
     * Résout le client_final_id depuis l'utilisateur courant.
     * Pour un CLIENT_FINAL, le lien est dans utilisateur.client_final_id.
     */
    private UUID resolveClientFinalId() {
        CustomUserDetails user = SecurityUtils.getCurrentUser();
        if (user == null) {
            throw new BusinessException("Utilisateur non authentifié", 401);
        }
        if (user.getUtilisateur().getClientFinal() == null) {
            throw new BusinessException(
                    "Aucun client final associé à cet utilisateur. Contactez l'administration.",
                    400);
        }
        return user.getUtilisateur().getClientFinal().getClientFinalId();
    }
}
