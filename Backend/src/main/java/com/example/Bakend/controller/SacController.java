package com.example.Bakend.controller;

import com.example.Bakend.config.TenantContext;
import com.example.Bakend.dto.freelance.AnnulerFreelanceRequest;
import com.example.Bakend.dto.optimisation.ColisLibreResponse;
import com.example.Bakend.dto.optimisation.SacColisEditRequest;
import com.example.Bakend.dto.optimisation.SacColisEditResponse;
import com.example.Bakend.dto.optimisation.SacCreerRequest;
import com.example.Bakend.dto.optimisation.SacDetailResponse;
import com.example.Bakend.dto.optimisation.SacPipelineResponse;
import com.example.Bakend.optimisation.groupage.SacPipelineService;
import com.example.Bakend.service.FreelanceService;
import com.example.Bakend.service.SacEditionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Pipeline : lister, supprimer et editer les sacs pour le dashboard optimisation.
 *
 * GET    /api/sacs                    → tous les sacs du tenant
 * POST   /api/sacs                    → creation manuelle (colis libres d'un hub)
 * GET    /api/sacs/{sacId}            → detail complet (historique gestionnaire)
 * DELETE /api/sacs/{sacId}            → suppression (CONSTITUE/AFFECTE) + liberation ressources
 * PATCH  /api/sacs/{sacId}/colis      → ajouter/retirer des colis (avant tournee)
 * POST   /api/sacs/{sacId}/annuler-freelance → mission freelance → FREELANCE ou AGENCE
 * GET    /api/sacs/colis-libres       → colis sans sac pour l'edition
 */
@RestController
@RequestMapping("/api/sacs")
public class SacController {

    private static final Logger log = LoggerFactory.getLogger(SacController.class);

    private final SacPipelineService sacPipelineService;
    private final SacEditionService sacEditionService;
    private final FreelanceService freelanceService;

    public SacController(SacPipelineService sacPipelineService,
                         SacEditionService sacEditionService,
                         FreelanceService freelanceService) {
        this.sacPipelineService = sacPipelineService;
        this.sacEditionService = sacEditionService;
        this.freelanceService = freelanceService;
    }

    @GetMapping
    public ResponseEntity<?> listerSacs() {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Contexte tenant manquant"));
        }

        log.info("Pipeline sacs tenant {}", tenantId);

        try {
            List<SacPipelineResponse> sacs = sacPipelineService.listerParTenant(tenantId);
            return ResponseEntity.ok(sacs);
        } catch (Exception e) {
            log.error("Pipeline sacs echoue tenant {}", tenantId, e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", e.getMessage() != null ? e.getMessage() : e.getClass().getName()));
        }
    }

    /**
     * Colis actuellement lies au sac (panneau d'edition).
     */
    @GetMapping("/{sacId}/colis")
    public ResponseEntity<List<ColisLibreResponse>> colisDuSac(@PathVariable UUID sacId) {
        UUID tenantId = requireTenant();
        return ResponseEntity.ok(sacEditionService.colisDuSac(tenantId, sacId));
    }

    /**
     * Detail complet d'un sac (historique) : chauffeur, clients, colis avec
     * commande d'origine, etapes avec preuves de livraison, factures liees.
     */
    @GetMapping("/{sacId}")
    @PreAuthorize("hasAnyRole('GESTIONNAIRE','DIRECTION')")
    public ResponseEntity<SacDetailResponse> detailSac(@PathVariable UUID sacId) {
        UUID tenantId = requireTenant();
        log.info("Detail sac {} tenant {}", sacId, tenantId);
        return ResponseEntity.ok(sacPipelineService.detail(tenantId, sacId));
    }

    /**
     * Colis libres du hub (sans sac) pour le panneau d'edition.
     */
    @GetMapping("/colis-libres")
    public ResponseEntity<List<ColisLibreResponse>> colisLibres(@RequestParam(required = false) UUID hubId) {
        UUID tenantId = requireTenant();
        return ResponseEntity.ok(sacEditionService.colisLibres(tenantId, hubId));
    }

    /**
     * Suppression d'un sac (CONSTITUE/AFFECTE) : colis liberes, ressources
     * (chauffeur/vehicule) liberees si non tenues par un autre sac actif.
     */
    @DeleteMapping("/{sacId}")
    public ResponseEntity<?> supprimerSac(@PathVariable UUID sacId) {
        UUID tenantId = requireTenant();
        log.info("Suppression sac {} tenant {}", sacId, tenantId);
        sacEditionService.supprimer(tenantId, sacId);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Sac supprime, colis et ressources liberes"));
    }

    /**
     * Creation manuelle d'un sac a partir de colis libres d'un hub.
     * Seuls les colis du hub annonce sont acceptes (re-verifie en backend).
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('GESTIONNAIRE','DIRECTION')")
    public ResponseEntity<SacColisEditResponse> creerSac(@RequestBody SacCreerRequest request) {
        UUID tenantId = requireTenant();
        log.info("Creation sac manuelle tenant {} hub {} ({} colis)",
                tenantId, request.hubId(), request.colisIds().size());
        return ResponseEntity.ok(sacEditionService.creer(tenantId, request));
    }

    /**
     * Edition des colis d'un sac (interdite apres planification de tournee).
     */
    @PatchMapping("/{sacId}/colis")
    public ResponseEntity<SacColisEditResponse> modifierColis(
            @PathVariable UUID sacId,
            @RequestBody SacColisEditRequest request) {
        UUID tenantId = requireTenant();
        log.info("Edition colis sac {} tenant {} (+{} / -{})",
                sacId, tenantId, request.ajouter().size(), request.retirer().size());
        return ResponseEntity.ok(sacEditionService.modifierColis(tenantId, sacId, request));
    }

    /**
     * Annulation d'une mission freelance par le gestionnaire.
     *
     * mode = FREELANCE : republication (le sac reste propose aux freelances,
     *                    tournee et ressources liberees)
     * mode = AGENCE    : retour au groupage (colis detaches, sac supprime,
     *                    demandes remises EN_ATTENTE_GROUPAGE)
     */
    @PostMapping("/{sacId}/annuler-freelance")
    @PreAuthorize("hasAnyRole('GESTIONNAIRE','DIRECTION')")
    public ResponseEntity<?> annulerFreelance(@PathVariable UUID sacId,
                                              @RequestBody AnnulerFreelanceRequest request) {
        UUID tenantId = requireTenant();
        log.info("Annulation mission freelance sac {} tenant {} -> {}", sacId, tenantId, request.mode());

        FreelanceService.AnnulationResult result = freelanceService
                .annulerAffectation(tenantId, sacId, request.mode(), request.motif());

        String message = "FREELANCE".equals(result.modeCible())
                ? "Mission retiree puis republiee aux freelances"
                : "Commande remise en groupage (mode AGENCE)";

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", message,
                "modeCible", result.modeCible(),
                "statutSac", result.statutSac() != null ? result.statutSac() : "",
                "tourneesSupprimees", result.tourneesSupprimees(),
                "demandesRetournees", result.demandesRetournees(),
                "ressourcesLiberees", result.ressourcesLiberees()));
    }

    private UUID requireTenant() {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            throw new com.example.Bakend.exception.BusinessException("Contexte tenant manquant", 400);
        }
        return tenantId;
    }
}
