package com.example.Bakend.service;

import com.example.Bakend.dto.freelance.AccepterMissionDTO;
import com.example.Bakend.dto.freelance.MissionProposeeDTO;
import com.example.Bakend.entity.*;
import com.example.Bakend.entity.enums.*;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.exception.ResourceNotFoundException;
import com.example.Bakend.maps.HaversineUtil;
import com.example.Bakend.optimisation.affectation.PermisService;
import com.example.Bakend.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/**
 * Appel d'offres freelance : publication des sacs ouverts et acceptation
 * en first-accept (le premier freelance qui accepte gagne).
 *
 * Publication : les sacs CONSTITUE issus d'une demande FREELANCE sont visibles
 * par tous les freelances valides (acces multi-tenants : le JWT du freelance
 * porte le tenant plateforme, les sacs appartiennent aux agences).
 *
 * Filtrage dur avant eligibilite : vehicule declare, vehicule DISPONIBLE,
 * permis, PTAC, type, habilite valeur (classe A), indisponibilite a la date
 * de depart, et surtout capacite poids/volume du vehicule vs le sac
 * (PermisService, verifications 5 et 6).
 *
 * Attribution : sac verrouille en pessimiste (un seul gagnant), affectation
 * chauffeur + vehicule, puis liberation des offres restantes. La tournee VRP
 * est calculee par l'appelant dans une transaction separee (voir
 * FreelanceMissionController) afin qu'une echec de routage n'annule pas
 * l'attribution.
 */
@Service
public class FreelanceMissionService {

    private static final Logger log = LoggerFactory.getLogger(FreelanceMissionService.class);
    private static final String TYPE_FREELANCE = "FREELANCE";
    private static final String DOSSIER_VALIDE = "VALIDEE";

    private final SacRepository sacRepository;
    private final ColisRepository colisRepository;
    private final ChauffeurRepository chauffeurRepository;
    private final VehiculeRepository vehiculeRepository;
    private final IndisponibiliteChauffeurRepository indisponibiliteChauffeurRepository;
    private final AuditLogRepository auditLogRepository;

    public FreelanceMissionService(SacRepository sacRepository,
                                   ColisRepository colisRepository,
                                   ChauffeurRepository chauffeurRepository,
                                   VehiculeRepository vehiculeRepository,
                                   IndisponibiliteChauffeurRepository indisponibiliteChauffeurRepository,
                                   AuditLogRepository auditLogRepository) {
        this.sacRepository = sacRepository;
        this.colisRepository = colisRepository;
        this.chauffeurRepository = chauffeurRepository;
        this.vehiculeRepository = vehiculeRepository;
        this.indisponibiliteChauffeurRepository = indisponibiliteChauffeurRepository;
        this.auditLogRepository = auditLogRepository;
    }

    /** Evaluation de l'aptitude du freelance a prendre ce sac. */
    private record Eligibilite(boolean eligible, List<String> motifs, Vehicule vehicule) {}

    // ══════════════════════════════════════════════════════════════
    // PUBLICATION : liste des missions ouvertes
    // ══════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<MissionProposeeDTO> listerProposees(UUID utilisateurId) {
        Chauffeur chauffeur = requireFreelance(utilisateurId);

        List<Sac> sacs = sacRepository.rechercherProposees(SacStatut.CONSTITUE, ModeLivraison.FREELANCE);
        List<MissionProposeeDTO> result = new ArrayList<>();

        for (Sac sac : sacs) {
            List<Colis> colis = colisRepository.findBySacSacId(sac.getSacId());
            if (colis.isEmpty()) continue;

            DemandeTransport demande = colis.get(0).getDemande();
            if (demande == null || demande.getModeLivraison() != ModeLivraison.FREELANCE) continue;

            double poids = 0;
            double volume = 0;
            for (Colis c : colis) {
                poids += c.getPoidsKg() != null ? c.getPoidsKg().doubleValue() : 0;
                volume += c.getVolumeM3() != null ? c.getVolumeM3().doubleValue() : 0;
            }

            Eligibilite eligibilite = evaluer(chauffeur, sac, poids, volume);
            result.add(toDTO(sac, demande, colis.size(), poids, volume, eligibilite));
        }

        return result;
    }

    // ══════════════════════════════════════════════════════════════
    // ACCEPTATION : first-accept, le premier freelance qui accepte gagne
    // ══════════════════════════════════════════════════════════════

    @Transactional
    public AccepterMissionDTO accepter(UUID utilisateurId, UUID sacId) {
        Chauffeur chauffeur = requireFreelance(utilisateurId);

        // Verrou pessimiste : le perdant recoit un 409 "deja attribuee"
        Sac sac = sacRepository.findByIdForUpdate(sacId)
                .orElseThrow(() -> new ResourceNotFoundException("Mission introuvable : " + sacId));

        if (sac.getStatut() == SacStatut.AFFECTE || sac.getStatut() == SacStatut.EN_TRANSIT) {
            throw new BusinessException("Cette mission a deja ete attribuee a un autre chauffeur", 409);
        }
        if (sac.getStatut() != SacStatut.CONSTITUE) {
            throw new BusinessException(
                    "Cette mission n'est plus ouverte (statut : " + sac.getStatut() + ")", 409);
        }
        if (sac.getChauffeur() != null && !chauffeur.getChauffeurId().equals(sac.getChauffeur().getChauffeurId())) {
            throw new BusinessException("Cette mission a deja ete attribuee a un autre chauffeur", 409);
        }

        List<Colis> colis = colisRepository.findBySacSacId(sacId);
        if (colis.isEmpty()) {
            throw new BusinessException("Cette mission ne contient aucun colis", 409);
        }
        DemandeTransport demande = colis.get(0).getDemande();
        if (demande == null || demande.getModeLivraison() != ModeLivraison.FREELANCE) {
            throw new BusinessException("Cette mission n'est pas ouverte aux freelances", 409);
        }

        double poids = 0;
        double volume = 0;
        for (Colis c : colis) {
            poids += c.getPoidsKg() != null ? c.getPoidsKg().doubleValue() : 0;
            volume += c.getVolumeM3() != null ? c.getVolumeM3().doubleValue() : 0;
        }

        // ── Filtrage dur : meme regles que l'eligibilite affichee ──
        Eligibilite eligibilite = evaluer(chauffeur, sac, poids, volume);
        if (!eligibilite.eligible()) {
            throw new BusinessException(
                    "Mission non attribuable : " + String.join(" ", eligibilite.motifs()), 409);
        }
        Vehicule vehicule = eligibilite.vehicule();

        // ── Attribution ──
        sac.setChauffeur(chauffeur);
        sac.setVehicule(vehicule);
        sac.setStatut(SacStatut.AFFECTE);
        sacRepository.save(sac);

        chauffeur.setDisponible(false);
        chauffeurRepository.save(chauffeur);

        vehicule.setStatut(VehiculeStatut.AFFECTE);
        vehiculeRepository.save(vehicule);

        // ── Audit ──
        AuditLog audit = new AuditLog();
        audit.setPmeCliente(sac.getPmeCliente());
        audit.setUtilisateur(chauffeur.getUtilisateur());
        audit.setEntite("Sac");
        audit.setEntiteId(sacId);
        audit.setAction(AuditAction.MODIFICATION);
        audit.setDetails("{\"action\":\"MISSION_ACCEPTEE\",\"firstAccept\":true"
                + ",\"chauffeurId\":\"" + chauffeur.getChauffeurId()
                + "\",\"vehiculeId\":\"" + vehicule.getVehiculeId()
                + "\",\"poidsKg\":" + round2(poids)
                + ",\"volumeM3\":" + round2(volume) + "}");
        auditLogRepository.save(audit);

        log.info("Mission freelance {} acceptee par le chauffeur {} (vehicule {}, {} kg / {} m3)",
                sacId, chauffeur.getChauffeurId(), vehicule.getImmatriculation(), round2(poids), round2(volume));

        return new AccepterMissionDTO(sacId, chauffeur.getChauffeurId(),
                vehicule.getVehiculeId(), sac.getStatut().name(), coordonneesCompletes(sac, colis));
    }

    // ══════════════════════════════════════════════════════════════
    // Helpers
    // ══════════════════════════════════════════════════════════════

    /**
     * Verification de la capacite et des droits du freelance pour ce sac.
     * Matrice de compatibilite "maison" : le vehicule personnel du freelance
     * est automatiquement compatible avec lui-meme (pas de matrice agence).
     */
    private Eligibilite evaluer(Chauffeur chauffeur, Sac sac, double poids, double volume) {
        List<String> motifs = new ArrayList<>();

        Vehicule vehicule = chauffeur.getVehicule();
        if (vehicule == null) {
            motifs.add("Aucun vehicule declare sur votre dossier.");
        } else {
            Map<UUID, Map<UUID, Boolean>> matrice = Map.of(
                    chauffeur.getChauffeurId(), Map.of(vehicule.getVehiculeId(), true));
            List<IndisponibiliteChauffeur> indispos =
                    indisponibiliteChauffeurRepository.findByChauffeurChauffeurId(chauffeur.getChauffeurId());

            PermisService.Autorisation autorisation = PermisService.verifier(
                    chauffeur, vehicule, matrice, poids, volume,
                    sac.getDateDepartPrevue(), indispos);
            motifs.addAll(autorisation.raisons());
        }

        // Habilitation valeur : classe dominante A requise
        if ("A".equals(sac.getCategorieDominante())
                && (chauffeur.getUtilisateur() == null || !chauffeur.getUtilisateur().isHabiliteValeur())) {
            motifs.add("Habilitation valeur requise pour les colis de classe A.");
        }

        return new Eligibilite(motifs.isEmpty(), motifs, vehicule);
    }

    private MissionProposeeDTO toDTO(Sac sac, DemandeTransport demande, int nbColis,
                                     double poids, double volume, Eligibilite eligibilite) {
        Hub hub = sac.getHub();
        Double distance = null;
        if (hub != null && hub.getLatitude() != null && hub.getLongitude() != null
                && demande.getLatitudeLivraison() != null && demande.getLongitudeLivraison() != null) {
            distance = round2(HaversineUtil.distance(
                    hub.getLatitude(), hub.getLongitude(),
                    demande.getLatitudeLivraison(), demande.getLongitudeLivraison()));
        }

        return new MissionProposeeDTO(
                sac.getSacId(),
                sac.getPmeCliente() != null ? sac.getPmeCliente().getNomEntreprise() : null,
                hub != null ? hub.getNom() : null,
                demande.getAdresseCollecte(),
                demande.getAdresseLivraison(),
                demande.getClientFinal() != null ? demande.getClientFinal().getNom() : null,
                nbColis,
                round2(poids),
                round2(volume),
                sac.getCategorieDominante(),
                sac.getTauxRemplissage(),
                sac.getDateDepartPrevue(),
                distance,
                demande.getTarif(),
                eligibilite.eligible(),
                eligibilite.motifs());
    }

    /** Les donnees GPS permettent-elles de calculer la tournee VRP ? */
    private boolean coordonneesCompletes(Sac sac, List<Colis> colis) {
        Hub hub = sac.getHub();
        if (hub == null || hub.getLatitude() == null || hub.getLongitude() == null) {
            return false;
        }
        for (Colis c : colis) {
            DemandeTransport d = c.getDemande();
            if (d == null || d.getLatitudeLivraison() == null || d.getLongitudeLivraison() == null) {
                return false;
            }
        }
        return true;
    }

    /**
     * Tenant de l'agence proprietaire d'un sac : requis pour appeler la
     * validation VRP (isolation tenant stricte de VrpSimulationService).
     */
    @Transactional(readOnly = true)
    public UUID tenantDuSac(UUID sacId) {
        Sac sac = sacRepository.findById(sacId)
                .orElseThrow(() -> new ResourceNotFoundException("Mission introuvable : " + sacId));
        return sac.getPmeCliente().getTenantId();
    }

    /** Freelance : dossier chauffeur valide, rattache au tenant plateforme. */
    private Chauffeur requireFreelance(UUID utilisateurId) {
        Chauffeur chauffeur = chauffeurRepository.findByUtilisateurId(utilisateurId)
                .orElseThrow(() -> new ResourceNotFoundException("Dossier chauffeur introuvable"));

        if (!TYPE_FREELANCE.equals(chauffeur.getTypeChauffeur())) {
            throw new BusinessException(
                    "Les missions proposees sont reservees aux chauffeurs freelance", 403);
        }
        if (!DOSSIER_VALIDE.equals(chauffeur.getStatutDossier())) {
            throw new BusinessException(
                    "Dossier chauffeur non valide (statut : " + chauffeur.getStatutDossier() + ")", 403);
        }
        return chauffeur;
    }

    private double round2(double v) {
        return BigDecimal.valueOf(v).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }
}
