package com.example.Bakend.service;

import com.example.Bakend.dto.optimisation.ColisLibreResponse;
import com.example.Bakend.dto.optimisation.SacColisEditRequest;
import com.example.Bakend.dto.optimisation.SacColisEditResponse;
import com.example.Bakend.dto.optimisation.SacCreerRequest;
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
 * Edition des sacs (V1) :
 *
 * - Suppression (V1-b) : autorisee sur CONSTITUE et AFFECTE.
 *   Les colis repassent libres, les demandes groupees sont re-evaluees,
 *   et les ressources reservees (chauffeur/vehicule) sont liberees si aucun
 *   autre sac actif ne les detient. Interdite si EN_TRANSIT/LIVRE.
 *
 * - Edition des colis (V1-c) : ajouter/retirer des colis, autorisee sur
 *   CONSTITUE et AFFECTE tant qu'aucune tournee n'est planifiee.
 *
 * - Colis libres : liste des colis sans sac pour le panneau d'edition.
 */
@Service
public class SacEditionService {

    private static final Logger log = LoggerFactory.getLogger(SacEditionService.class);

    private static final long SCALE = 100;
    private static final double FALLBACK_POIDS_KG = 5000;
    private static final double FALLBACK_VOLUME_M3 = 20;
    private static final String CATEGORIE_STANDARD = "STANDARD";

    private final SacRepository sacRepository;
    private final ColisRepository colisRepository;
    private final DemandeTransportRepository demandeRepository;
    private final ChauffeurRepository chauffeurRepository;
    private final VehiculeRepository vehiculeRepository;
    private final TourneeRepository tourneeRepository;
    private final AuditLogRepository auditLogRepository;

    public SacEditionService(SacRepository sacRepository,
                             ColisRepository colisRepository,
                             DemandeTransportRepository demandeRepository,
                             ChauffeurRepository chauffeurRepository,
                             VehiculeRepository vehiculeRepository,
                             TourneeRepository tourneeRepository,
                             AuditLogRepository auditLogRepository) {
        this.sacRepository = sacRepository;
        this.colisRepository = colisRepository;
        this.demandeRepository = demandeRepository;
        this.chauffeurRepository = chauffeurRepository;
        this.vehiculeRepository = vehiculeRepository;
        this.tourneeRepository = tourneeRepository;
        this.auditLogRepository = auditLogRepository;
    }

    // ══════════════════════════════════════════════════════════════
    // V1-b : suppression d'un sac
    // ══════════════════════════════════════════════════════════════

    @Transactional
    public void supprimer(UUID tenantId, UUID sacId) {
        Sac sac = requireSac(tenantId, sacId);

        if (sac.getStatut() == SacStatut.EN_TRANSIT || sac.getStatut() == SacStatut.LIVRE) {
            throw new BusinessException(
                    "Seuls les sacs CONSTITUE ou AFFECTE peuvent etre supprimes (statut actuel : "
                            + sac.getStatut() + ")", 409);
        }

        // 1. Detacher les colis (ON DELETE SET NULL, mais on le fait explicitement)
        List<Colis> colisDuSac = colisRepository.findBySacSacId(sacId);
        Set<UUID> demandeIds = new HashSet<>();
        for (Colis c : colisDuSac) {
            c.setSac(null);
            if (c.getDemande() != null) {
                demandeIds.add(c.getDemande().getDemandeId());
            }
        }
        colisRepository.saveAll(colisDuSac);

        // 2. Liberation des ressources reservees (1 sac = 1 chauffeur + 1 vehicule)
        boolean aLibere = false;
        if (sac.getStatut() == SacStatut.AFFECTE) {
            aLibere = libererChauffeur(sac) | libererVehicule(sac);
            sac.setChauffeur(null);
            sac.setVehicule(null);
        }

        // 3. Re-evaluation des demandes groupees
        int demandesLiberees = reevaluerDemandes(demandeIds);

        // 4. Audit + suppression (les tournees liees sont supprimees en cascade)
        int nbTournees = tourneeRepository.findBySacSacId(sacId).size();

        AuditLog audit = new AuditLog();
        audit.setPmeCliente(sac.getPmeCliente());
        audit.setUtilisateur(currentUser());
        audit.setEntite("Sac");
        audit.setEntiteId(sacId);
        audit.setAction(AuditAction.SUPPRESSION);
        audit.setDetails("{\"statut\":\"" + sac.getStatut()
                + "\",\"colisDetaches\":" + colisDuSac.size()
                + ",\"demandesLiberees\":" + demandesLiberees
                + ",\"ressourcesLiberees\":" + aLibere
                + ",\"tourneesSupprimees\":" + nbTournees + "}");
        auditLogRepository.save(audit);

        sacRepository.delete(sac);

        log.info("Sac {} supprime (tenant {}) : {} colis detaches, {} demandes liberees, ressources liberees={}",
                sacId, tenantId, colisDuSac.size(), demandesLiberees, aLibere);
    }

    // ══════════════════════════════════════════════════════════════
    // V1-c : edition des colis d'un sac
    // ══════════════════════════════════════════════════════════════

    @Transactional
    public SacColisEditResponse modifierColis(UUID tenantId, UUID sacId, SacColisEditRequest request) {
        Sac sac = requireSac(tenantId, sacId);

        if (sac.getStatut() != SacStatut.CONSTITUE && sac.getStatut() != SacStatut.AFFECTE) {
            throw new BusinessException(
                    "Edition impossible : sac en cours de mission (statut : " + sac.getStatut() + ")", 409);
        }
        if (!tourneeRepository.findBySacSacId(sacId).isEmpty()) {
            throw new BusinessException(
                    "Edition interdite apres planification de tournee : supprimez la tournee d'abord", 409);
        }

        Set<UUID> ajouter = new LinkedHashSet<>(request.ajouter());
        Set<UUID> retirer = new LinkedHashSet<>(request.retirer());
        for (UUID id : ajouter) {
            if (retirer.contains(id)) {
                throw new BusinessException("Colis " + id + " a la fois a ajouter et a retirer", 400);
            }
        }

        List<Colis> colisDuSac = colisRepository.findBySacSacId(sacId);
        Map<UUID, Colis> parId = new HashMap<>();
        for (Colis c : colisDuSac) {
            parId.put(c.getColisId(), c);
        }

        Set<UUID> demandeIds = new HashSet<>();
        List<Colis> modifies = new ArrayList<>();

        // ── Retirer ──
        for (UUID id : retirer) {
            Colis c = parId.get(id);
            if (c == null) {
                throw new BusinessException("Colis " + id + " n'appartient pas a ce sac", 409);
            }
            c.setSac(null);
            modifies.add(c);
            if (c.getDemande() != null) {
                demandeIds.add(c.getDemande().getDemandeId());
            }
        }

        // ── Ajouter ──
        for (UUID id : ajouter) {
            Colis c = colisRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Colis introuvable : " + id));

            if (c.getPmeCliente() == null || !c.getPmeCliente().getTenantId().equals(tenantId)) {
                throw new BusinessException("Colis " + id + " n'appartient pas a cette agence", 403);
            }
            if (c.getSac() != null) {
                throw new BusinessException("Colis " + id + " est deja dans un sac", 409);
            }
            if (c.getEtat() != ColisEtat.EN_ATTENTE) {
                throw new BusinessException(
                        "Colis " + id + " non modifiable (etat : " + c.getEtat() + ")", 409);
            }
            if (c.getDemande() == null || c.getDemande().getHub() == null
                    || sac.getHub() == null
                    || !c.getDemande().getHub().getHubId().equals(sac.getHub().getHubId())) {
                throw new BusinessException("Colis " + id + " n'appartient pas au meme hub que le sac", 409);
            }

            c.setSac(sac);
            modifies.add(c);
            demandeIds.add(c.getDemande().getDemandeId());
        }

        int nbApres = colisDuSac.size() - retirer.size() + ajouter.size();
        if (nbApres <= 0) {
            throw new BusinessException(
                    "Le sac deviendrait vide : supprimez le sac au lieu de retirer tous ses colis", 409);
        }

        colisRepository.saveAll(modifies);

        // ── Re-evaluation des demandes ──
        int demandesModifiees = reevaluerDemandes(demandeIds);

        // ── Recalcul poids/volume/taux/categorie ──
        List<Colis> nouveauxColis = colisRepository.findBySacSacId(sacId);
        double poids = 0;
        double volume = 0;
        Map<String, Integer> frequences = new HashMap<>();
        for (Colis c : nouveauxColis) {
            poids += c.getPoidsKg() != null ? c.getPoidsKg().doubleValue() : 0;
            volume += c.getVolumeM3() != null ? c.getVolumeM3().doubleValue() : 0;
            if (c.getCategorie() != null && c.getCategorie().getClasseCode() != null) {
                frequences.merge(c.getCategorie().getClasseCode(), 1, Integer::sum);
            }
        }

        // Capacite de reference : le vehicule affecte, sinon la flotte DISPONIBLE du hub
        double capPoids;
        double capVolume;
        if (sac.getStatut() == SacStatut.AFFECTE && sac.getVehicule() != null) {
            capPoids = sac.getVehicule().getCapacitePoidsKg() != null
                    ? sac.getVehicule().getCapacitePoidsKg().doubleValue() : FALLBACK_POIDS_KG;
            capVolume = sac.getVehicule().getCapaciteVolumeM3() != null
                    ? sac.getVehicule().getCapaciteVolumeM3().doubleValue() : FALLBACK_VOLUME_M3;

            // Le sac doit rester transportable par son vehicule
            if (poids > capPoids + 1e-6 || volume > capVolume + 1e-6) {
                throw new BusinessException(
                        "Le sac depasse la capacite du vehicule " + sac.getVehicule().getImmatriculation()
                                + " (" + round2(poids) + "/" + round2(capPoids) + " kg, "
                                + round2(volume) + "/" + round2(capVolume) + " m3)", 409);
            }
        } else {
            double[] caps = capaciteHub(tenantId, sac.getHub() != null ? sac.getHub().getHubId() : null);
            capPoids = caps[0];
            capVolume = caps[1];
        }

        double taux = 0;
        if (capPoids > 0 || capVolume > 0) {
            double tauxPoids = capPoids > 0 ? (poids / capPoids) * 100 : 0;
            double tauxVolume = capVolume > 0 ? (volume / capVolume) * 100 : 0;
            taux = Math.max(tauxPoids, tauxVolume);
        }

        sac.setTauxRemplissage(BigDecimal.valueOf(round2(taux)));
        sac.setCategorieDominante(categorieDominante(frequences));

        // ── Audit ──
        AuditLog audit = new AuditLog();
        audit.setPmeCliente(sac.getPmeCliente());
        audit.setUtilisateur(currentUser());
        audit.setEntite("Sac");
        audit.setEntiteId(sacId);
        audit.setAction(AuditAction.MODIFICATION);
        audit.setDetails("{\"ajoutes\":" + ajouter.size() + ",\"retires\":" + retirer.size()
                + ",\"nbColis\":" + nbApres + ",\"demandesModifiees\":" + demandesModifiees + "}");
        auditLogRepository.save(audit);

        sacRepository.save(sac);

        log.info("Sac {} edite (tenant {}) : +{}/-{} colis → {} colis, taux {}%",
                sacId, tenantId, ajouter.size(), retirer.size(), nbApres, round2(taux));

        return new SacColisEditResponse(
                sac.getSacId(),
                sac.getStatut() != null ? sac.getStatut().name() : null,
                nbApres,
                round2(poids),
                round2(volume),
                round2(taux),
                sac.getCategorieDominante(),
                demandesModifiees);
    }

    // ══════════════════════════════════════════════════════════════
    // Creation manuelle d'un sac (colis libres d'un hub)
    // ══════════════════════════════════════════════════════════════

    /**
     * Cree un sac CONSTITUE a partir de colis libres choisis par le gestionnaire.
     *
     * Meme garde-fous que l'ajout dans modifierColis : colis du tenant,
     * sans sac, etat EN_ATTENTE, et MEME HUB que celui annonce.
     * Le depassement de capacite n'est pas bloque : le taux depasse 100 %.
     */
    @Transactional
    public SacColisEditResponse creer(UUID tenantId, SacCreerRequest request) {
        if (request.hubId() == null) {
            throw new BusinessException("Hub requis pour creer un sac", 400);
        }
        if (request.colisIds().isEmpty()) {
            throw new BusinessException("Au moins un colis est requis", 400);
        }

        // ── Chargement + validations (sans doublon) ──
        List<Colis> colisChoisis = new ArrayList<>();
        for (UUID id : new LinkedHashSet<>(request.colisIds())) {
            Colis c = colisRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Colis introuvable : " + id));

            if (c.getPmeCliente() == null || !c.getPmeCliente().getTenantId().equals(tenantId)) {
                throw new BusinessException("Colis " + id + " n'appartient pas a cette agence", 403);
            }
            if (c.getSac() != null) {
                throw new BusinessException("Colis " + id + " est deja dans un sac", 409);
            }
            if (c.getEtat() != ColisEtat.EN_ATTENTE) {
                throw new BusinessException(
                        "Colis " + id + " non modifiable (etat : " + c.getEtat() + ")", 409);
            }
            if (c.getDemande() == null || c.getDemande().getHub() == null
                    || !c.getDemande().getHub().getHubId().equals(request.hubId())) {
                throw new BusinessException(
                        "Colis " + id + " n'appartient pas au meme hub que le sac", 409);
            }
            colisChoisis.add(c);
        }

        // ── Totaux, categorie dominante, date de depart, demandes impactees ──
        double poids = 0;
        double volume = 0;
        Map<String, Integer> frequences = new HashMap<>();
        Set<UUID> demandeIds = new HashSet<>();
        LocalDate dateDepart = null;
        for (Colis c : colisChoisis) {
            poids += c.getPoidsKg() != null ? c.getPoidsKg().doubleValue() : 0;
            volume += c.getVolumeM3() != null ? c.getVolumeM3().doubleValue() : 0;
            if (c.getCategorie() != null && c.getCategorie().getClasseCode() != null) {
                frequences.merge(c.getCategorie().getClasseCode(), 1, Integer::sum);
            }
            if (c.getDemande() != null) {
                demandeIds.add(c.getDemande().getDemandeId());
                LocalDate d = c.getDemande().getDateDepartCalculee() != null
                        ? c.getDemande().getDateDepartCalculee()
                        : LocalDate.now().plusDays(7);
                if (dateDepart == null || d.isBefore(dateDepart)) {
                    dateDepart = d;
                }
            }
        }
        if (dateDepart == null) {
            dateDepart = LocalDate.now().plusDays(7);
        }

        // Taux sur la capacite de reference du hub — un depassement n'empeche
        // pas la creation : le taux depasse simplement 100 %.
        double[] caps = capaciteHub(tenantId, request.hubId());
        double taux = Math.max((poids / caps[0]) * 100, (volume / caps[1]) * 100);

        // ── Creation du sac (sans OptimisationRun : creation manuelle) ──
        Sac sac = new Sac();
        sac.setPmeCliente(colisChoisis.get(0).getPmeCliente());
        Hub hub = new Hub();
        hub.setHubId(request.hubId());
        sac.setHub(hub);
        sac.setStatut(SacStatut.CONSTITUE);
        sac.setDateDepartPlafond(dateDepart);
        sac.setDateDepartPrevue(dateDepart);
        sac.setCategorieDominante(categorieDominante(frequences));
        sac.setTauxRemplissage(BigDecimal.valueOf(round2(taux)));
        sac = sacRepository.save(sac);

        for (Colis c : colisChoisis) {
            c.setSac(sac);
        }
        colisRepository.saveAll(colisChoisis);

        int demandesModifiees = reevaluerDemandes(demandeIds);

        // ── Audit ──
        AuditLog audit = new AuditLog();
        audit.setPmeCliente(sac.getPmeCliente());
        audit.setUtilisateur(currentUser());
        audit.setEntite("Sac");
        audit.setEntiteId(sac.getSacId());
        audit.setAction(AuditAction.CREATION);
        audit.setDetails("{\"manuelle\":true,\"hub\":\"" + request.hubId()
                + "\",\"nbColis\":" + colisChoisis.size()
                + ",\"poidsKg\":" + round2(poids)
                + ",\"tauxRemplissage\":" + round2(taux)
                + ",\"demandesModifiees\":" + demandesModifiees + "}");
        auditLogRepository.save(audit);

        log.info("Sac cree manuellement (tenant {}) hub {} : {} colis, {} kg, taux {}%",
                tenantId, request.hubId(), colisChoisis.size(), round2(poids), round2(taux));

        return new SacColisEditResponse(
                sac.getSacId(),
                sac.getStatut() != null ? sac.getStatut().name() : null,
                colisChoisis.size(),
                round2(poids),
                round2(volume),
                round2(taux),
                sac.getCategorieDominante(),
                demandesModifiees);
    }

    // ══════════════════════════════════════════════════════════════
    // Colis libres (pour le panneau d'edition)
    // ══════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<ColisLibreResponse> colisDuSac(UUID tenantId, UUID sacId) {
        requireSac(tenantId, sacId);
        return colisRepository.findBySacSacId(sacId).stream()
                .sorted(Comparator.comparing(Colis::getCreatedAt,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .map(this::toColisLibre)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ColisLibreResponse> colisLibres(UUID tenantId, UUID hubId) {
        return colisRepository.findByPmeClienteTenantIdAndSacIsNull(tenantId).stream()
                .filter(c -> c.getEtat() == ColisEtat.EN_ATTENTE)
                .filter(c -> c.getDemande() != null && c.getDemande().getHub() != null
                        && (hubId == null || c.getDemande().getHub().getHubId().equals(hubId)))
                .sorted(Comparator.comparing(Colis::getCreatedAt,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .map(this::toColisLibre)
                .toList();
    }

    private ColisLibreResponse toColisLibre(Colis c) {
        return new ColisLibreResponse(
                c.getColisId(),
                c.getPoidsKg() != null ? c.getPoidsKg().doubleValue() : 0,
                c.getVolumeM3() != null ? c.getVolumeM3().doubleValue() : 0,
                c.getEtat() != null ? c.getEtat().name() : null,
                c.getDemande() != null ? c.getDemande().getDemandeId() : null,
                c.getCategorie() != null ? c.getCategorie().getLibelle() : null,
                c.getDemande() != null ? c.getDemande().getDateSouhaitee() : null,
                c.getDemande() != null && c.getDemande().getClientFinal() != null
                        ? c.getDemande().getClientFinal().getNom() : null);
    }

    // ══════════════════════════════════════════════════════════════
    // Helpers
    // ══════════════════════════════════════════════════════════════

    private Sac requireSac(UUID tenantId, UUID sacId) {
        return sacRepository.findById(sacId)
                .filter(s -> s.getPmeCliente() != null && s.getPmeCliente().getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Sac introuvable : " + sacId));
    }

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

    /**
     * Re-evalue les statuts GROUPEE / EN_ATTENTE_GROUPAGE des demandes impactees.
     * Une demande reste GROUPEE tant qu'au moins un de ses colis reste dans un sac.
     *
     * @return le nombre de demandes dont le statut a change
     */
    private int reevaluerDemandes(Collection<UUID> demandeIds) {
        int changed = 0;
        for (UUID id : demandeIds) {
            DemandeTransport d = demandeRepository.findById(id).orElse(null);
            if (d == null) continue;

            boolean aUnColisGroupe = colisRepository.findByDemandeDemandeId(id).stream()
                    .anyMatch(c -> c.getSac() != null);

            if (d.getStatut() == DemandeStatut.GROUPEE && !aUnColisGroupe) {
                d.setStatut(DemandeStatut.EN_ATTENTE_GROUPAGE);
                demandeRepository.save(d);
                changed++;
            } else if (d.getStatut() == DemandeStatut.EN_ATTENTE_GROUPAGE && aUnColisGroupe) {
                d.setStatut(DemandeStatut.GROUPEE);
                demandeRepository.save(d);
                changed++;
            }
        }
        return changed;
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

    /** Classe la plus frequente parmi les colis du sac (fallback STANDARD). */
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

    private double round2(double v) {
        return BigDecimal.valueOf(v).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }
}
