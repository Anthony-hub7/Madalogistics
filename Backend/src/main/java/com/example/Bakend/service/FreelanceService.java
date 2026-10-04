package com.example.Bakend.service;

import com.example.Bakend.entity.*;
import com.example.Bakend.entity.enums.*;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.exception.ResourceNotFoundException;
import com.example.Bakend.repository.*;
import com.example.Bakend.security.CustomUserDetails;
import com.example.Bakend.security.SecurityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

/**
 * Mode FREELANCE — 1 commande = 1 sac, sans optimisation de groupage.
 *
 * Creation (valider une commande en FREELANCE) :
 *   EN_ATTENTE_GROUPAGE puis creation immediate d'un Sac CONSTITUE unique
 *   (sans runGroupage), toutes les colis rattaches, demande passees a GROUPEE.
 *   Le sac n'entre jamais dans le pipeline FFD/Knapsack, ni dans l'affectation
 *   manuelle de l'agence : il est publie en appel d'offres aux freelances.
 *
 * Annulation par le gestionnaire (sur CONSTITUE ou AFFECTE) :
 *   - mode cible FREELANCE : republication (reste propose, tournee retiree)
 *   - mode cible AGENCE     : retour au groupage (colis detaches, sac supprime,
 *                             demande remises EN_ATTENTE_GROUPAGE)
 */
@Service
public class FreelanceService {

    private static final Logger log = LoggerFactory.getLogger(FreelanceService.class);

    private static final long SCALE = 100;
    private static final double FALLBACK_POIDS_KG = 5000;
    private static final double FALLBACK_VOLUME_M3 = 20;
    private static final String CATEGORIE_STANDARD = "STANDARD";

    private final SacRepository sacRepository;
    private final ColisRepository colisRepository;
    private final DemandeTransportRepository demandeRepository;
    private final TourneeRepository tourneeRepository;
    private final ChauffeurRepository chauffeurRepository;
    private final VehiculeRepository vehiculeRepository;
    private final HubRepository hubRepository;
    private final AuditLogRepository auditLogRepository;

    public FreelanceService(SacRepository sacRepository,
                            ColisRepository colisRepository,
                            DemandeTransportRepository demandeRepository,
                            TourneeRepository tourneeRepository,
                            ChauffeurRepository chauffeurRepository,
                            VehiculeRepository vehiculeRepository,
                            HubRepository hubRepository,
                            AuditLogRepository auditLogRepository) {
        this.sacRepository = sacRepository;
        this.colisRepository = colisRepository;
        this.demandeRepository = demandeRepository;
        this.tourneeRepository = tourneeRepository;
        this.chauffeurRepository = chauffeurRepository;
        this.vehiculeRepository = vehiculeRepository;
        this.hubRepository = hubRepository;
        this.auditLogRepository = auditLogRepository;
    }

    public record SacFreelance(
            UUID sacId,
            int nbColis,
            double poidsKg,
            double volumeM3,
            double tauxRemplissage
    ) {}

    public record AnnulationResult(
            UUID sacId,
            String modeCible,
            String statutSac,
            int tourneesSupprimees,
            int demandesRetournees,
            boolean ressourcesLiberees
    ) {}

    // ══════════════════════════════════════════════════════════════
    // CREATION : la validation d'une commande FREELANCE devient un sac
    // ══════════════════════════════════════════════════════════════

    /**
     * Cree directement le sac de la commande freelance (1 commande = 1 sac).
     * A appeler depuis la meme transaction que la validation de la demande.
     *
     * @param tenantId tenant de l'agence (isolation multi-tenant)
     * @param demande  demande deja validee en mode FREELANCE, statut EN_ATTENTE_GROUPAGE
     * @param auteur   utilisateur gestionnaire (audit)
     */
    @Transactional
    public SacFreelance creerSacDirect(UUID tenantId, DemandeTransport demande, Utilisateur auteur) {
        if (demande.getModeLivraison() != ModeLivraison.FREELANCE) {
            throw new BusinessException("Le sac direct n'est reserve qu'au mode FREELANCE", 400);
        }
        if (demande.getStatut() != DemandeStatut.EN_ATTENTE_GROUPAGE) {
            throw new BusinessException(
                    "Creation du sac freelance impossible (statut actuel : " + demande.getStatut() + ")", 409);
        }
        if (demande.getPmeCliente() == null || !demande.getPmeCliente().getTenantId().equals(tenantId)) {
            throw new BusinessException("Demande non appartenance a cette agence", 403);
        }

        List<Colis> colisList = demande.getColis() != null
                ? new ArrayList<>(demande.getColis()) : new ArrayList<>();
        if (colisList.isEmpty()) {
            throw new BusinessException(
                    "Une commande freelance doit contenir au moins un colis pour etre proposee", 409);
        }

        // ── Totaux, categorie dominante, date de depart ──
        double poids = 0;
        double volume = 0;
        Map<String, Integer> frequences = new HashMap<>();
        for (Colis c : colisList) {
            poids += c.getPoidsKg() != null ? c.getPoidsKg().doubleValue() : 0;
            volume += c.getVolumeM3() != null ? c.getVolumeM3().doubleValue() : 0;
            if (c.getCategorie() != null && c.getCategorie().getClasseCode() != null) {
                frequences.merge(c.getCategorie().getClasseCode(), 1, Integer::sum);
            }
        }
        LocalDate dateDepart = demande.getDateDepartCalculee() != null
                ? demande.getDateDepartCalculee()
                : LocalDate.now().plusDays(7);

        // Taux vs flotte DISPONIBLE du hub (indication pour le gestionnaire ;
        // le filtrage dur poids/volume est fait a l'acceptation, sur le vehicule
        // reel du freelance).
        UUID hubId = demande.getHub() != null ? demande.getHub().getHubId() : null;
        double[] caps = capaciteHub(tenantId, hubId);
        double taux = Math.max((poids / caps[0]) * 100, (volume / caps[1]) * 100);

        // ── Sac unique, CONSTITUE, sans run de groupage ──
        Sac sac = new Sac();
        sac.setPmeCliente(demande.getPmeCliente());
        sac.setHub(demande.getHub());
        sac.setStatut(SacStatut.CONSTITUE);
        sac.setDateDepartPlafond(dateDepart);
        sac.setDateDepartPrevue(dateDepart);
        sac.setCategorieDominante(categorieDominante(frequences));
        sac.setTauxRemplissage(BigDecimal.valueOf(round2(taux)));
        sac = sacRepository.save(sac);

        for (Colis c : colisList) {
            c.setSac(sac);
        }
        colisRepository.saveAll(colisList);

        demande.setStatut(DemandeStatut.GROUPEE);
        demandeRepository.save(demande);

        // ── Audit ──
        AuditLog audit = new AuditLog();
        audit.setPmeCliente(sac.getPmeCliente());
        audit.setUtilisateur(auteur);
        audit.setEntite("Sac");
        audit.setEntiteId(sac.getSacId());
        audit.setAction(AuditAction.CREATION);
        audit.setDetails("{\"freelance\":true,\"demandeId\":\"" + demande.getDemandeId()
                + "\",\"hub\":\"" + (hubId != null ? hubId : "null")
                + "\",\"nbColis\":" + colisList.size()
                + ",\"poidsKg\":" + round2(poids)
                + ",\"volumeM3\":" + round2(volume)
                + ",\"tauxRemplissage\":" + round2(taux)
                + ",\"dateDepart\":" + dateDepart + "}");
        auditLogRepository.save(audit);

        log.info("Sac freelance cree (tenant {}) : sac {} pour la demande {} ({} colis, {} kg)",
                tenantId, sac.getSacId(), demande.getDemandeId(), colisList.size(), round2(poids));

        return new SacFreelance(sac.getSacId(), colisList.size(), round2(poids), round2(volume), round2(taux));
    }

    // ══════════════════════════════════════════════════════════════
    // ANNULATION : retourner en FREELANCE (republication) ou en AGENCE
    // ══════════════════════════════════════════════════════════════

    /**
     * Annule la mission freelance d'un sac.
     *
     * @param modeCible "FREELANCE" → republication (sac reste propose, tournee retiree)
     *                  "AGENCE"    → retour au groupage (colis detaches, sac supprime,
     *                                demandes remises EN_ATTENTE_GROUPAGE)
     */
    @Transactional
    public AnnulationResult annulerAffectation(UUID tenantId, UUID sacId, String modeCible, String motif) {
        ModeLivraison cible;
        try {
            cible = ModeLivraison.valueOf(modeCible == null ? "" : modeCible.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException(
                    "Mode cible invalide : " + modeCible + " (valeurs attendues : FREELANCE, AGENCE)", 400);
        }
        if (cible != ModeLivraison.FREELANCE && cible != ModeLivraison.AGENCE) {
            throw new BusinessException("Mode cible invalide : " + modeCible, 400);
        }

        Sac sac = sacRepository.findById(sacId)
                .filter(s -> s.getPmeCliente() != null && s.getPmeCliente().getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Sac introuvable : " + sacId));

        if (sac.getStatut() == SacStatut.EN_TRANSIT || sac.getStatut() == SacStatut.LIVRE) {
            throw new BusinessException(
                    "Annulation impossible : mission en cours (statut : " + sac.getStatut() + ")", 409);
        }
        if (sac.getStatut() != SacStatut.CONSTITUE && sac.getStatut() != SacStatut.AFFECTE) {
            throw new BusinessException(
                    "Annulation impossible pour un sac au statut " + sac.getStatut(), 409);
        }

        List<Colis> colisDuSac = colisRepository.findBySacSacId(sacId);
        if (colisDuSac.isEmpty()) {
            throw new BusinessException("Ce sac ne contient aucun colis", 409);
        }

        // Origine freelance verifiee sur les demandes liees
        Map<UUID, DemandeTransport> demandes = new LinkedHashMap<>();
        for (Colis c : colisDuSac) {
            if (c.getDemande() != null) {
                demandes.put(c.getDemande().getDemandeId(), c.getDemande());
            }
        }
        boolean origineFreelance = demandes.values().stream()
                .anyMatch(d -> d.getModeLivraison() == ModeLivraison.FREELANCE);
        if (!origineFreelance) {
            throw new BusinessException(
                    "Ce sac n'est pas une mission freelance (mode de livraison AGENCE)", 409);
        }

        // ── 1. Tournées retirees ──
        List<Tournee> tournees = tourneeRepository.findBySacSacId(sacId);
        int nbTournees = tournees.size();
        if (!tournees.isEmpty()) {
            tourneeRepository.deleteAll(tournees);
        }

        // ── 2. Ressources liberees (chauffeur + vehicule du freelance) ──
        boolean aLibere = false;
        if (sac.getStatut() == SacStatut.AFFECTE) {
            aLibere = libererChauffeur(sac) | libererVehicule(sac);
            sac.setChauffeur(null);
            sac.setVehicule(null);
            sac.setRunAffectation(null);
        }

        int demandesRetournees = 0;

        if (cible == ModeLivraison.FREELANCE) {
            // ── Republication : le sac reste propose aux freelances ──
            sac.setStatut(SacStatut.CONSTITUE);
            sacRepository.save(sac);

            AuditLog audit = new AuditLog();
            audit.setPmeCliente(sac.getPmeCliente());
            audit.setUtilisateur(currentUser());
            audit.setEntite("Sac");
            audit.setEntiteId(sacId);
            audit.setAction(AuditAction.MODIFICATION);
            audit.setDetails("{\"action\":\"MISSION_REPUBLIEE\",\"modeCible\":\"FREELANCE\""
                    + ",\"tourneesSupprimees\":" + nbTournees
                    + ",\"ressourcesLiberees\":" + aLibere
                    + ",\"nbColis\":" + colisDuSac.size()
                    + (motif != null && !motif.isBlank() ? ",\"motif\":\"" + jsonEscape(motif) + "\"" : "")
                    + "}");
            auditLogRepository.save(audit);

            log.info("Mission freelance republiee : sac {} (tenant {}), {} tournee(s) retiree(s)",
                    sacId, tenantId, nbTournees);

            return new AnnulationResult(sacId, ModeLivraison.FREELANCE.name(),
                    sac.getStatut().name(), nbTournees, 0, aLibere);
        }

        // ── Retour AGENCE : detacher les colis, supprimer le sac ──
        for (Colis c : colisDuSac) {
            c.setSac(null);
        }
        colisRepository.saveAll(colisDuSac);

        for (DemandeTransport d : demandes.values()) {
            d.setModeLivraison(ModeLivraison.AGENCE);
            if (d.getStatut() == DemandeStatut.GROUPEE) {
                d.setStatut(DemandeStatut.EN_ATTENTE_GROUPAGE);
                demandesRetournees++;
            }
            demandeRepository.save(d);
        }

        AuditLog audit = new AuditLog();
        audit.setPmeCliente(sac.getPmeCliente());
        audit.setUtilisateur(currentUser());
        audit.setEntite("Sac");
        audit.setEntiteId(sacId);
        audit.setAction(AuditAction.SUPPRESSION);
        audit.setDetails("{\"action\":\"MISSION_REMISE_EN_GROUPAGE\",\"modeCible\":\"AGENCE\""
                + ",\"colisDetaches\":" + colisDuSac.size()
                + ",\"demandesRetournees\":" + demandesRetournees
                + ",\"tourneesSupprimees\":" + nbTournees
                + ",\"ressourcesLiberees\":" + aLibere
                + (motif != null && !motif.isBlank() ? ",\"motif\":\"" + jsonEscape(motif) + "\"" : "")
                + "}");
        auditLogRepository.save(audit);

        sacRepository.delete(sac);

        log.info("Mission freelance remise en groupage : sac {} supprime (tenant {}), "
                        + "{} colis detaches, {} demande(s) retournees",
                sacId, tenantId, colisDuSac.size(), demandesRetournees);

        return new AnnulationResult(sacId, ModeLivraison.AGENCE.name(), null,
                nbTournees, demandesRetournees, aLibere);
    }

    // ══════════════════════════════════════════════════════════════
    // Helpers
    // ══════════════════════════════════════════════════════════════

    /** Libere le chauffeur du sac si aucun autre sac actif ne le detient. */
    private boolean libererChauffeur(Sac sac) {
        Chauffeur ch = sac.getChauffeur();
        if (ch == null) return false;

        boolean tenuAilleurs = sacRepository.findByChauffeurChauffeurId(ch.getChauffeurId()).stream()
                .anyMatch(s -> !s.getSacId().equals(sac.getSacId())
                        && (s.getStatut() == SacStatut.AFFECTE || s.getStatut() == SacStatut.EN_TRANSIT));
        if (tenuAilleurs) return false;

        ch.setDisponible(true);
        chauffeurRepository.save(ch);
        return true;
    }

    /** Libere le vehicule du sac si aucun autre sac actif ne le detient. */
    private boolean libererVehicule(Sac sac) {
        Vehicule v = sac.getVehicule();
        if (v == null) return false;

        boolean tenuAilleurs = sacRepository.findByVehiculeVehiculeId(v.getVehiculeId()).stream()
                .anyMatch(s -> !s.getSacId().equals(sac.getSacId())
                        && (s.getStatut() == SacStatut.AFFECTE || s.getStatut() == SacStatut.EN_TRANSIT));
        if (tenuAilleurs) return false;

        v.setStatut(VehiculeStatut.DISPONIBLE);
        vehiculeRepository.save(v);
        return true;
    }

    /** Capacite max (kg, m3) des vehicules DISPONIBLES du hub, avec repli 5000 kg / 20 m3. */
    private double[] capaciteHub(UUID tenantId, UUID hubId) {
        double capPoids = 0;
        double capVolume = 0;
        if (hubId != null) {
            List<Vehicule> vehicules = vehiculeRepository.rechercherDisponiblesParHub(
                    tenantId, hubId, VehiculeStatut.DISPONIBLE);
            for (Vehicule v : vehicules) {
                double p = v.getCapacitePoidsKg() != null ? v.getCapacitePoidsKg().doubleValue() : 0;
                double vol = v.getCapaciteVolumeM3() != null ? v.getCapaciteVolumeM3().doubleValue() : 0;
                if (p > capPoids) capPoids = p;
                if (vol > capVolume) capVolume = vol;
            }
        }
        if (capPoids == 0) capPoids = FALLBACK_POIDS_KG;
        if (capVolume == 0) capVolume = FALLBACK_VOLUME_M3;
        return new double[]{capPoids, capVolume};
    }

    /** Classe la plus frequente parmi les colis (fallback STANDARD). */
    private String categorieDominante(Map<String, Integer> frequences) {
        if (frequences.isEmpty()) return CATEGORIE_STANDARD;
        return frequences.entrySet().stream()
                .max(Map.Entry.<String, Integer>comparingByValue()
                        .thenComparing(Map.Entry.comparingByKey()))
                .map(Map.Entry::getKey)
                .orElse(CATEGORIE_STANDARD);
    }

    private Utilisateur currentUser() {
        CustomUserDetails user = SecurityUtils.getCurrentUser();
        return user != null ? user.getUtilisateur() : null;
    }

    private String jsonEscape(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private double round2(double v) {
        return BigDecimal.valueOf(v).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }
}
