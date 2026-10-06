package com.example.Bakend.service;

import com.example.Bakend.dto.response.MissionDTO;
import com.example.Bakend.entity.*;
import com.example.Bakend.entity.enums.*;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.exception.ResourceNotFoundException;
import com.example.Bakend.maps.RoutingService;
import com.example.Bakend.repository.*;
import com.example.Bakend.security.CustomUserDetails;
import com.example.Bakend.security.SecurityUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service des missions chauffeur.
 * Mission = vue agrégée de Sac + Tournee + EtapeLivraison + Vehicule + Hub.
 * Pas de table Mission dédiée — le concept est un DTO sur les entités existantes.
 *
 * Cycle : AFFECTE → (prendre-en-charge) → EN_TRANSIT → (cloturer avec photo) → LIVRE
 */
@Service
@Transactional
public class MissionService {

    private final SacRepository sacRepository;
    private final TourneeRepository tourneeRepository;
    private final EtapeLivraisonRepository etapeLivraisonRepository;
    private final ChauffeurRepository chauffeurRepository;
    private final ColisRepository colisRepository;
    private final DemandeTransportRepository demandeRepository;
    private final VehiculeRepository vehiculeRepository;
    private final AuditLogRepository auditLogRepository;
    private final FactureRepository factureRepository;
    private final RoutingService routingService;
    private final NotificationService notificationService;

    public MissionService(SacRepository sacRepository,
                          TourneeRepository tourneeRepository,
                          EtapeLivraisonRepository etapeLivraisonRepository,
                          ChauffeurRepository chauffeurRepository,
                          ColisRepository colisRepository,
                          DemandeTransportRepository demandeRepository,
                          VehiculeRepository vehiculeRepository,
                          AuditLogRepository auditLogRepository,
                          FactureRepository factureRepository,
                          RoutingService routingService,
                          NotificationService notificationService) {
        this.sacRepository = sacRepository;
        this.tourneeRepository = tourneeRepository;
        this.etapeLivraisonRepository = etapeLivraisonRepository;
        this.chauffeurRepository = chauffeurRepository;
        this.colisRepository = colisRepository;
        this.demandeRepository = demandeRepository;
        this.vehiculeRepository = vehiculeRepository;
        this.auditLogRepository = auditLogRepository;
        this.factureRepository = factureRepository;
        this.routingService = routingService;
        this.notificationService = notificationService;
    }

    // ========================================================================
    // LISTE DES MISSIONS DU CHAUFFEUR
    // ========================================================================

    @Transactional(readOnly = true)
    public List<MissionDTO> listerMissions(UUID tenantId, UUID utilisateurId) {
        Chauffeur chauffeur = requireChauffeur(tenantId, utilisateurId);

        List<Sac> sacs = sacRepository.findByChauffeurChauffeurId(chauffeur.getChauffeurId());

        return sacs.stream()
                .filter(s -> s.getStatut() == SacStatut.AFFECTE || s.getStatut() == SacStatut.EN_TRANSIT)
                .map(this::toMissionDTO)
                .sorted(Comparator.comparing(MissionDTO::createdAt).reversed())
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public MissionDTO detailMission(UUID tenantId, UUID utilisateurId, UUID sacId) {
        Chauffeur chauffeur = requireChauffeur(tenantId, utilisateurId);
        Sac sac = requireSac(tenantId, sacId);

        if (sac.getChauffeur() == null || !sac.getChauffeur().getChauffeurId().equals(chauffeur.getChauffeurId())) {
            throw new BusinessException("Ce sac n'est pas affecte a ce chauffeur", 403);
        }

        return toMissionDTO(sac);
    }

    // ========================================================================
    // PRISE EN CHARGE → EN_TRANSIT (directement)
    // ========================================================================

    @Transactional
    public MissionDTO prendreEnCharge(UUID tenantId, UUID utilisateurId, UUID sacId) {
        Chauffeur chauffeur = requireChauffeur(tenantId, utilisateurId);
        Sac sac = requireSac(tenantId, sacId);

        // Verifier que le sac est bien affecte a ce chauffeur
        if (sac.getChauffeur() == null || !sac.getChauffeur().getChauffeurId().equals(chauffeur.getChauffeurId())) {
            throw new BusinessException("Ce sac n'est pas affecte a ce chauffeur", 403);
        }

        // Verifier que le sac est en statut AFFECTE (pret a partir)
        if (sac.getStatut() != SacStatut.AFFECTE) {
            throw new BusinessException(
                "Seuls les sacs AFFECTE peuvent etre pris en charge (statut actuel : " + sac.getStatut() + ")", 409);
        }

        // Pas de controle de "chauffeur.isDisponible()" ici : le chauffeur est
        // deja marque indisponible depuis l'affectation du sac (invariant
        // 1 chauffeur = 1 sac), et l'appartenance au sac est verifiee ci-dessus.

        // Transition AFFECTE → EN_TRANSIT
        sac.setStatut(SacStatut.EN_TRANSIT);
        sacRepository.save(sac);

        // Mettre a jour les colis du sac → EN_TRANSIT
        List<Colis> colisList = colisRepository.findBySacSacId(sacId);
        for (Colis colis : colisList) {
            if (colis.getEtat() != ColisEtat.EN_TRANSIT) {
                colis.setEtat(ColisEtat.EN_TRANSIT);
            }
        }
        colisRepository.saveAll(colisList);

        // Mettre a jour les demandes liees → EN_TRANSIT
        Set<UUID> demandeIds = colisList.stream()
                .map(c -> c.getDemande().getDemandeId())
                .collect(Collectors.toSet());
        for (UUID demandeId : demandeIds) {
            DemandeTransport demande = demandeRepository.findById(demandeId).orElse(null);
            if (demande != null && demande.getStatut() != DemandeStatut.EN_TRANSIT) {
                demande.setStatut(DemandeStatut.EN_TRANSIT);
                demandeRepository.save(demande);
            }
        }

        // Mettre a jour la tournee → EN_COURS si elle existe
        List<Tournee> tournees = tourneeRepository.findBySacSacId(sacId);
        for (Tournee tournee : tournees) {
            if (tournee.getStatut() == TourneeStatut.PLANIFIEE) {
                tournee.setStatut(TourneeStatut.EN_COURS);
                tourneeRepository.save(tournee);
            }
        }

        // Mettre le vehicule → EN_TOURNEE
        if (sac.getVehicule() != null && sac.getVehicule().getStatut() != VehiculeStatut.EN_TOURNEE) {
            sac.getVehicule().setStatut(VehiculeStatut.EN_TOURNEE);
            vehiculeRepository.save(sac.getVehicule());
        }

        // Marquer le chauffeur comme indisponible
        chauffeur.setDisponible(false);
        chauffeurRepository.save(chauffeur);

        // Audit log
        AuditLog audit = new AuditLog();
        audit.setPmeCliente(sac.getPmeCliente());
        audit.setUtilisateur(chauffeur.getUtilisateur());
        audit.setEntite("Sac");
        audit.setEntiteId(sacId);
        audit.setAction(AuditAction.VALIDATION);
        audit.setDetails("{\"action\":\"PRISE_EN_CHARGE\",\"nouveauStatut\":\"EN_TRANSIT\"}");
        auditLogRepository.save(audit);

        return toMissionDTO(sac);
    }

    // ========================================================================
    // SIGNALEMENT D'INCIDENT VEHICULE (panne, route coupee...) — version minimale
    // Ne change aucun statut : alerte le gestionnaire via notification + audit.
    // ========================================================================

    @Transactional
    public void signalerIncident(UUID tenantId, UUID utilisateurId, UUID sacId,
                                 String type, String message) {
        Chauffeur chauffeur = requireChauffeur(tenantId, utilisateurId);
        Sac sac = requireSac(tenantId, sacId);

        // Seul le chauffeur assigne peut signaler
        if (sac.getChauffeur() == null || !sac.getChauffeur().getChauffeurId().equals(chauffeur.getChauffeurId())) {
            throw new BusinessException("Ce sac n'est pas affecte a ce chauffeur", 403);
        }
        if (sac.getStatut() != SacStatut.AFFECTE && sac.getStatut() != SacStatut.EN_TRANSIT) {
            throw new BusinessException(
                    "Incident impossible : sac non en mission (statut : " + sac.getStatut() + ")", 409);
        }

        String typeNorm = (type == null || type.isBlank()) ? "AUTRE" : type.trim().toUpperCase();
        if (!typeNorm.equals("PANNE") && !typeNorm.equals("ROUTE_COUPEE") && !typeNorm.equals("AUTRE")) {
            throw new BusinessException("Type d'incident invalide (PANNE, ROUTE_COUPEE, AUTRE)", 400);
        }

        // Idempotence : une seule alerte par sac toutes les 5 minutes
        long recentes = notificationService.compterRecentes(
                tenantId, sacId, NotificationService.TYPE_INCIDENT_DECLARE,
                LocalDateTime.now().minusMinutes(5));
        if (recentes > 0) {
            throw new BusinessException("Un incident a deja ete signale pour ce sac", 409);
        }

        String titre = "Incident " + typeNorm.replace('_', ' ') + " — sac "
                + sacId.toString().substring(0, 8);
        String texte = (message == null || message.isBlank())
                ? "Incident signale par " + chauffeur.getUtilisateur().getNom()
                : message.trim();
        notificationService.diffuser(sac.getPmeCliente(),
                NotificationService.ROLE_GESTIONNAIRE,
                NotificationService.TYPE_INCIDENT_DECLARE, titre, texte, sac);

        AuditLog audit = new AuditLog();
        audit.setPmeCliente(sac.getPmeCliente());
        audit.setUtilisateur(chauffeur.getUtilisateur());
        audit.setEntite("Sac");
        audit.setEntiteId(sacId);
        audit.setAction(AuditAction.MODIFICATION);
        audit.setDetails("{\"action\":\"INCIDENT_DECLARE\",\"type\":\"" + typeNorm + "\"}");
        auditLogRepository.save(audit);
    }

    // ========================================================================
    // CLOTURE AVEC PHOTO (obligatoire par etape)
    // ========================================================================

    @Transactional
    public MissionDTO cloturer(UUID tenantId, UUID utilisateurId, UUID sacId,
                                Map<UUID, byte[]> photosParEtape,
                                String signatureNom, String notes) {
        Chauffeur chauffeur = requireChauffeur(tenantId, utilisateurId);
        Sac sac = requireSac(tenantId, sacId);

        // Verifier que le sac est bien affecte a ce chauffeur
        if (sac.getChauffeur() == null || !sac.getChauffeur().getChauffeurId().equals(chauffeur.getChauffeurId())) {
            throw new BusinessException("Ce sac n'est pas affecte a ce chauffeur", 403);
        }

        // Verifier que le sac est EN_TRANSIT
        if (sac.getStatut() != SacStatut.EN_TRANSIT) {
            throw new BusinessException(
                "Seuls les sacs EN_TRANSIT peuvent etre clotures (statut actuel : " + sac.getStatut() + ")", 409);
        }

        // Recuperer les etapes de livraison
        List<Tournee> tournees = tourneeRepository.findBySacSacId(sacId);
        List<EtapeLivraison> toutesLesEtapes = new ArrayList<>();
        for (Tournee tournee : tournees) {
            toutesLesEtapes.addAll(etapeLivraisonRepository.rechercherParTourneeOrdonnees(tournee.getTourneeId()));
        }

        // Verifier que toutes les etapes LIVRAISON ont une photo
        List<EtapeLivraison> etapesLivraison = toutesLesEtapes.stream()
                .filter(e -> e.getTypeEtape() == TypeEtape.LIVRAISON)
                .toList();

        for (EtapeLivraison etape : etapesLivraison) {
            byte[] photo = photosParEtape != null ? photosParEtape.get(etape.getEtapeId()) : null;
            if (photo == null || photo.length == 0) {
                throw new BusinessException(
                    "Photo de preuve obligatoire pour l'etape " + etape.getOrdre()
                    + " (colis " + etape.getColis().getColisId() + ")", 400);
            }
        }

        // Appliquer les photos et signatures aux etapes
        LocalDateTime now = LocalDateTime.now();
        for (EtapeLivraison etape : toutesLesEtapes) {
            byte[] photo = photosParEtape != null ? photosParEtape.get(etape.getEtapeId()) : null;
            if (photo != null && photo.length > 0) {
                etape.setPhotoPreuve(photo);
                etape.setDateHeureReelle(now);
                if (signatureNom != null && !signatureNom.isBlank()) {
                    etape.setSignatureNom(signatureNom);
                    etape.setDateSignature(now);
                }
            }
        }
        etapeLivraisonRepository.saveAll(toutesLesEtapes);

        // Transition EN_TRANSIT → LIVRE pour le sac
        sac.setStatut(SacStatut.LIVRE);
        sacRepository.save(sac);

        // Mettre a jour les colis → LIVRE
        List<Colis> colisList = colisRepository.findBySacSacId(sacId);
        Set<UUID> demandeIds = new HashSet<>();
        for (Colis colis : colisList) {
            colis.setEtat(ColisEtat.LIVRE);
            demandeIds.add(colis.getDemande().getDemandeId());
        }
        colisRepository.saveAll(colisList);

        // Mettre a jour les demandes → LIVREE + generer facture
        for (UUID demandeId : demandeIds) {
            DemandeTransport demande = demandeRepository.findById(demandeId).orElse(null);
            if (demande != null && demande.getStatut() == DemandeStatut.EN_TRANSIT) {
                demande.setStatut(DemandeStatut.LIVREE);
                demandeRepository.save(demande);

                // Generer la facture si elle n'existe pas encore
                if (factureRepository.findByDemandeDemandeId(demandeId).isEmpty()) {
                    Facture facture = new Facture();
                    facture.setPmeCliente(demande.getPmeCliente());
                    facture.setDemande(demande);
                    facture.setMontantTotal(demande.getTarif() != null ? demande.getTarif() : BigDecimal.ZERO);
                    facture.setStatut(FactureStatut.EMISE);
                    factureRepository.save(facture);
                }
            }
        }

        // Mettre les tournées → TERMINEE
        for (Tournee tournee : tournees) {
            if (tournee.getStatut() != TourneeStatut.TERMINEE) {
                tournee.setStatut(TourneeStatut.TERMINEE);
                tourneeRepository.save(tournee);
            }
        }

        // Remettre le vehicule → DISPONIBLE
        if (sac.getVehicule() != null) {
            sac.getVehicule().setStatut(VehiculeStatut.DISPONIBLE);
            vehiculeRepository.save(sac.getVehicule());
        }

        // Remettre le chauffeur → disponible
        chauffeur.setDisponible(true);
        chauffeurRepository.save(chauffeur);

        // Audit log
        AuditLog audit = new AuditLog();
        audit.setPmeCliente(sac.getPmeCliente());
        audit.setUtilisateur(chauffeur.getUtilisateur());
        audit.setEntite("Sac");
        audit.setEntiteId(sacId);
        audit.setAction(AuditAction.VALIDATION);
        audit.setDetails("{\"action\":\"CLOTURE\",\"nouveauStatut\":\"LIVRE\",\"etapesCloturees\":" + toutesLesEtapes.size() + "}");
        auditLogRepository.save(audit);

        return toMissionDTO(sac);
    }

    // ========================================================================
    // PHOTO PREUVE — endpoint de telechargement
    // ========================================================================

    @Transactional(readOnly = true)
    public byte[] getPhotoPreuve(UUID tenantId, UUID etapeId) {
        EtapeLivraison etape = etapeLivraisonRepository.findById(etapeId)
                .orElseThrow(() -> new ResourceNotFoundException("Etape introuvable : " + etapeId));

        if (!etape.getPmeCliente().getTenantId().equals(tenantId)
                && !estChauffeurDeLetape(etape)) {
            throw new BusinessException("Acces non autorise", 403);
        }

        byte[] data = etape.getPhotoPreuve();
        if (data == null || data.length == 0) {
            throw new ResourceNotFoundException("Aucune photo de preuve pour cette etape");
        }
        return data;
    }

    // ========================================================================
    // TRACE OSRM — aller-retour pour la carte (meme format que TourneeController).
    // Segments GeoJSON bruts : aller (Hub → livraisons, rouge),
    // retour (derniere livraison → Hub, orange pointille).
    // ========================================================================

    @Transactional(readOnly = true)
    public Map<String, Object> getTrace(UUID tenantId, UUID utilisateurId, UUID sacId) {
        MissionDTO mission = detailMission(tenantId, utilisateurId, sacId);

        Double hubLat = mission.hubLatitude();
        Double hubLng = mission.hubLongitude();

        List<MissionDTO.EtapeDTO> livraisons = mission.etapes().stream()
                .filter(e -> "LIVRAISON".equals(e.typeEtape()))
                .sorted(Comparator.comparingInt(MissionDTO.EtapeDTO::ordre))
                .toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("hub", hubLat != null && hubLng != null
                ? Map.of("lat", hubLat, "lng", hubLng) : Map.of());

        if (hubLat == null || hubLng == null) {
            result.put("aller", Map.of());
            result.put("retour", Map.of());
        } else {
            // Aller : Hub → livraisons ordonnees (sans retour final)
            List<double[]> allerPoints = new ArrayList<>();
            allerPoints.add(new double[]{hubLat, hubLng});
            for (MissionDTO.EtapeDTO etape : livraisons) {
                if (etape.latitudeLivraison() != null && etape.longitudeLivraison() != null) {
                    allerPoints.add(new double[]{etape.latitudeLivraison(), etape.longitudeLivraison()});
                }
            }

            // Retour : derniere livraison → Hub
            List<double[]> retourPoints = new ArrayList<>();
            if (allerPoints.size() > 1) {
                retourPoints.add(allerPoints.get(allerPoints.size() - 1));
            }
            retourPoints.add(new double[]{hubLat, hubLng});

            // Appels OSRM separes par segment (fallback Haversine integre)
            result.put("aller", parseRoute(allerPoints));
            result.put("retour", parseRoute(retourPoints));
        }

        result.put("etapes", livraisons.stream().map(e -> {
            Map<String, Object> m = new HashMap<>();
            m.put("etapeId", e.etapeId());
            m.put("ordre", e.ordre());
            m.put("clientNom", e.clientNom());
            m.put("adresse", e.adresseLivraison());
            m.put("lat", e.latitudeLivraison());
            m.put("lng", e.longitudeLivraison());
            m.put("terminee", e.dateHeureReelle() != null);
            m.put("photoPreuvePresente", e.photoPreuvePresente());
            return m;
        }).toList());
        result.put("distanceKm", mission.distanceTotaleKm());
        result.put("nbStops", livraisons.size());
        result.put("nbColis", mission.nbColis());
        result.put("statut", mission.statut());

        return result;
    }

    // ========================================================================
    // VALIDER UNE ETAPE DE LIVRAISON (par colis)
    // ========================================================================

    @Transactional
    public Map<String, Object> validerEtape(UUID tenantId, UUID utilisateurId, UUID sacId,
                                             UUID etapeId, byte[] photo,
                                             String signatureNom, String notes) {
        Chauffeur chauffeur = requireChauffeur(tenantId, utilisateurId);
        Sac sac = requireSac(tenantId, sacId);

        if (sac.getChauffeur() == null || !sac.getChauffeur().getChauffeurId().equals(chauffeur.getChauffeurId())) {
            throw new BusinessException("Ce sac n'est pas affecte a ce chauffeur", 403);
        }
        if (sac.getStatut() != SacStatut.EN_TRANSIT) {
            throw new BusinessException(
                "Seuls les sacs EN_TRANSIT permettent la validation d'etapes (statut actuel : " + sac.getStatut() + ")", 409);
        }
        if (photo == null || photo.length == 0) {
            throw new BusinessException("Photo de preuve obligatoire", 400);
        }

        // Trouver l'etape et verifier qu'elle appartient a ce sac
        EtapeLivraison etape = etapeLivraisonRepository.findById(etapeId)
                .orElseThrow(() -> new ResourceNotFoundException("Etape introuvable : " + etapeId));

        List<Tournee> tournees = tourneeRepository.findBySacSacId(sacId);
        List<EtapeLivraison> toutesLesEtapes = new ArrayList<>();
        for (Tournee t : tournees) {
            toutesLesEtapes.addAll(etapeLivraisonRepository.rechercherParTourneeOrdonnees(t.getTourneeId()));
        }
        boolean etapeInMission = toutesLesEtapes.stream()
                .anyMatch(e -> e.getEtapeId().equals(etapeId));
        if (!etapeInMission) {
            throw new BusinessException("Cette etape n'appartient pas a cette mission", 403);
        }
        if (etape.getTypeEtape() != TypeEtape.LIVRAISON) {
            throw new BusinessException("Seules les etapes de LIVRAISON peuvent etre validees", 400);
        }
        if (etape.getPhotoPreuve() != null && etape.getPhotoPreuve().length > 0) {
            throw new BusinessException("Cette etape est deja validee", 409);
        }

        // Appliquer la photo + signature a l'etape
        LocalDateTime now = LocalDateTime.now();
        etape.setPhotoPreuve(photo);
        etape.setDateHeureReelle(now);
        if (signatureNom != null && !signatureNom.isBlank()) {
            etape.setSignatureNom(signatureNom);
            etape.setDateSignature(now);
        }
        etapeLivraisonRepository.save(etape);

        // Marquer le colis lie comme LIVRE
        Colis colis = etape.getColis();
        if (colis != null) {
            colis.setEtat(ColisEtat.LIVRE);
            colisRepository.save(colis);

            // Verifier si tous les colis de la meme demande sont livres
            DemandeTransport demande = colis.getDemande();
            if (demande != null && demande.getStatut() == DemandeStatut.EN_TRANSIT) {
                List<Colis> tousColisDemande = colisRepository.findByDemandeDemandeId(demande.getDemandeId());
                boolean tousLivre = tousColisDemande.stream()
                        .allMatch(c -> c.getEtat() == ColisEtat.LIVRE);

                if (tousLivre) {
                    // Demande → LIVREE + facture
                    demande.setStatut(DemandeStatut.LIVREE);
                    demandeRepository.save(demande);

                    if (factureRepository.findByDemandeDemandeId(demande.getDemandeId()).isEmpty()) {
                        Facture facture = new Facture();
                        facture.setPmeCliente(demande.getPmeCliente());
                        facture.setDemande(demande);
                        facture.setMontantTotal(demande.getTarif() != null ? demande.getTarif() : BigDecimal.ZERO);
                        facture.setStatut(FactureStatut.EMISE);
                        factureRepository.save(facture);
                    }
                }
            }
        }

        // Verifier si toutes les etapes LIVRAISON du sac sont validees → cloture auto
        List<EtapeLivraison> etapesLivraison = toutesLesEtapes.stream()
                .filter(e -> e.getTypeEtape() == TypeEtape.LIVRAISON)
                .toList();
        boolean toutesValidees = etapesLivraison.stream()
                .allMatch(e -> e.getPhotoPreuve() != null && e.getPhotoPreuve().length > 0);
        boolean missionCloturee = false;

        if (toutesValidees) {
            cloturerMission(sac, chauffeur, toutesLesEtapes, tournees);
            missionCloturee = true;
        }

        // Audit log
        AuditLog audit = new AuditLog();
        audit.setPmeCliente(sac.getPmeCliente());
        audit.setUtilisateur(chauffeur.getUtilisateur());
        audit.setEntite("EtapeLivraison");
        audit.setEntiteId(etapeId);
        audit.setAction(AuditAction.VALIDATION);
        audit.setDetails("{\"action\":\"VALIDER_ETAPE\",\"etapeId\":\"" + etapeId
                + "\",\"ordre\":" + etape.getOrdre()
                + ",\"missionCloturee\":" + missionCloturee + "}");
        auditLogRepository.save(audit);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("mission", toMissionDTO(sac));
        result.put("missionCloturee", missionCloturee);
        return result;
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    /**
     * Cloture complete d'une mission (extraite de cloturer pour reutilisation).
     */
    private void cloturerMission(Sac sac, Chauffeur chauffeur,
                                  List<EtapeLivraison> toutesLesEtapes, List<Tournee> tournees) {
        UUID sacId = sac.getSacId();

        sac.setStatut(SacStatut.LIVRE);
        sacRepository.save(sac);

        List<Colis> colisList = colisRepository.findBySacSacId(sacId);
        Set<UUID> demandeIds = new HashSet<>();
        for (Colis colis : colisList) {
            colis.setEtat(ColisEtat.LIVRE);
            demandeIds.add(colis.getDemande().getDemandeId());
        }
        colisRepository.saveAll(colisList);

        for (UUID demandeId : demandeIds) {
            DemandeTransport demande = demandeRepository.findById(demandeId).orElse(null);
            if (demande != null && demande.getStatut() == DemandeStatut.EN_TRANSIT) {
                demande.setStatut(DemandeStatut.LIVREE);
                demandeRepository.save(demande);

                if (factureRepository.findByDemandeDemandeId(demandeId).isEmpty()) {
                    Facture facture = new Facture();
                    facture.setPmeCliente(demande.getPmeCliente());
                    facture.setDemande(demande);
                    facture.setMontantTotal(demande.getTarif() != null ? demande.getTarif() : BigDecimal.ZERO);
                    facture.setStatut(FactureStatut.EMISE);
                    factureRepository.save(facture);
                }
            }
        }

        for (Tournee tournee : tournees) {
            if (tournee.getStatut() != TourneeStatut.TERMINEE) {
                tournee.setStatut(TourneeStatut.TERMINEE);
                tourneeRepository.save(tournee);
            }
        }

        if (sac.getVehicule() != null) {
            sac.getVehicule().setStatut(VehiculeStatut.DISPONIBLE);
            vehiculeRepository.save(sac.getVehicule());
        }

        chauffeur.setDisponible(true);
        chauffeurRepository.save(chauffeur);
    }

    /**
     * Appelle OSRM pour une liste de points et retourne le GeoJSON brut.
     * Retourne une map vide si pas assez de points ou en cas d'erreur.
     */
    private Map<String, Object> parseRoute(List<double[]> points) {
        if (points.size() < 2) return Map.of();
        try {
            String geoJson = routingService.getRoute(points, "driving");
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("raw", geoJson);
            return map;
        } catch (Exception e) {
            return Map.of();
        }
    }

    private Chauffeur requireChauffeur(UUID tenantId, UUID utilisateurId) {
        return chauffeurRepository.findByUtilisateurId(utilisateurId)
                .filter(c -> c.getPmeCliente().getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Chauffeur introuvable pour cet utilisateur"));
    }

    private Sac requireSac(UUID tenantId, UUID sacId) {
        Sac sac = sacRepository.findById(sacId)
                .orElseThrow(() -> new ResourceNotFoundException("Sac introuvable : " + sacId));

        if (sac.getPmeCliente() != null && sac.getPmeCliente().getTenantId().equals(tenantId)) {
            return sac;
        }
        // Missions freelance multi-agences : le JWT du freelance porte le tenant
        // plateforme alors que le sac appartient a l'agence. L'acces est ouvert
        // au chauffeur assigne au sac (chaque methode appellee verifie ensuite
        // que le sac appartient bien a ce chauffeur).
        if (estChauffeurDuSac(sac)) {
            return sac;
        }
        throw new ResourceNotFoundException("Sac introuvable : " + sacId);
    }

    /** L'utilisateur courant est-il le chauffeur assigne a ce sac ? */
    private boolean estChauffeurDuSac(Sac sac) {
        CustomUserDetails user = SecurityUtils.getCurrentUser();
        if (user == null) return false;
        Chauffeur ch = sac.getChauffeur();
        return ch != null && ch.getUtilisateur() != null
                && user.getUtilisateurId().equals(ch.getUtilisateur().getUtilisateurId());
    }

    /** L'utilisateur courant est-il le chauffeur assigne a la tournee de cette etape ? */
    private boolean estChauffeurDeLetape(EtapeLivraison etape) {
        Tournee tournee = etape.getTournee();
        Sac sac = tournee != null ? tournee.getSac() : null;
        return sac != null && estChauffeurDuSac(sac);
    }

    /**
     * Vue mission d'un sac deja charge (utilise apres acceptation freelance,
     * pour construire la reponse sans recharger manuellement tournee/etapes).
     */
    @Transactional(readOnly = true)
    public MissionDTO missionPourSac(UUID sacId) {
        Sac sac = sacRepository.findById(sacId)
                .orElseThrow(() -> new ResourceNotFoundException("Sac introuvable : " + sacId));
        return toMissionDTO(sac);
    }

    private MissionDTO toMissionDTO(Sac sac) {
        UUID tenantId = sac.getPmeCliente().getTenantId();

        // Tournees
        List<Tournee> tournees = tourneeRepository.findBySacSacId(sac.getSacId());
        Tournee tournee = tournees.isEmpty() ? null : tournees.get(0);

        // Etapes
        List<MissionDTO.EtapeDTO> etapeDTOs = new ArrayList<>();
        if (tournee != null) {
            List<EtapeLivraison> etapes = etapeLivraisonRepository.rechercherParTourneeOrdonnees(tournee.getTourneeId());
            etapeDTOs = etapes.stream().map(this::toEtapeDTO).toList();
        }

        // Colis
        List<Colis> colisList = colisRepository.findBySacSacId(sac.getSacId());
        BigDecimal poidsTotal = colisList.stream()
                .map(Colis::getPoidsKg)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal volumeTotal = colisList.stream()
                .map(Colis::getVolumeM3)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Demandes uniques
        Map<UUID, DemandeTransport> demandeMap = colisList.stream()
                .map(Colis::getDemande)
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(DemandeTransport::getDemandeId, d -> d, (a, b) -> a));
        List<MissionDTO.DemandeResumeDTO> demandeDTOs = demandeMap.values().stream()
                .map(d -> new MissionDTO.DemandeResumeDTO(
                        d.getDemandeId(),
                        d.getStatut().name(),
                        d.getTarif(),
                        d.getAdresseCollecte(),
                        d.getAdresseLivraison(),
                        d.getClientFinal() != null ? d.getClientFinal().getNom() : null
                ))
                .toList();

        // Chauffeur
        Chauffeur ch = sac.getChauffeur();

        // Vehicule
        Vehicule v = sac.getVehicule();

        return new MissionDTO(
                sac.getSacId(),
                sac.getStatut().name(),
                sac.getCategorieDominante(),
                sac.getTauxRemplissage(),
                poidsTotal,
                volumeTotal,
                colisList.size(),
                ch != null ? ch.getChauffeurId() : null,
                ch != null && ch.getUtilisateur() != null ? ch.getUtilisateur().getNom() : null,
                ch != null && ch.isDisponible(),
                v != null ? v.getVehiculeId() : null,
                v != null ? v.getImmatriculation() : null,
                v != null ? v.getMarqueModele() : null,
                v != null ? v.getCapacitePoidsKg() : null,
                v != null ? v.getCapaciteVolumeM3() : null,
                v != null && v.getTypeVehicule() != null ? v.getTypeVehicule().name() : null,
                sac.getHub() != null ? sac.getHub().getHubId() : null,
                sac.getHub() != null ? sac.getHub().getNom() : null,
                sac.getHub() != null ? sac.getHub().getLatitude() : null,
                sac.getHub() != null ? sac.getHub().getLongitude() : null,
                tournee != null ? tournee.getTourneeId() : null,
                tournee != null ? tournee.getStatut().name() : null,
                tournee != null ? tournee.getDistanceTotaleKm() : null,
                tournee != null ? tournee.getDateDepartPrevue() : null,
                etapeDTOs,
                demandeDTOs,
                sac.getCreatedAt()
        );
    }

    private MissionDTO.EtapeDTO toEtapeDTO(EtapeLivraison etape) {
        Colis colis = etape.getColis();
        DemandeTransport demande = colis != null ? colis.getDemande() : null;

        return new MissionDTO.EtapeDTO(
                etape.getEtapeId(),
                etape.getOrdre(),
                etape.getTypeEtape().name(),
                etape.getDateHeurePrevue(),
                etape.getDateHeureReelle(),
                etape.getSignatureNom(),
                etape.getPhotoPreuve() != null && etape.getPhotoPreuve().length > 0,
                colis != null ? colis.getColisId() : null,
                colis != null ? colis.getCategorie() != null ? colis.getCategorie().getLibelle() : "Colis" : null,
                colis != null ? colis.getPoidsKg() : null,
                colis != null ? colis.getVolumeM3() : null,
                demande != null ? demande.getAdresseCollecte() : null,
                demande != null ? demande.getAdresseLivraison() : null,
                demande != null && demande.getClientFinal() != null ? demande.getClientFinal().getNom() : null,
                demande != null ? demande.getLatitudeCollecte() : null,
                demande != null ? demande.getLongitudeCollecte() : null,
                demande != null ? demande.getLatitudeLivraison() : null,
                demande != null ? demande.getLongitudeLivraison() : null
        );
    }
}
