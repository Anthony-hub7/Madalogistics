package com.example.Bakend.service;

import com.example.Bakend.dto.demande.DemandeDevisRequest;
import com.example.Bakend.dto.demande.DemandeDevisResponse;
import com.example.Bakend.dto.demande.HubRecommandationResponse;
import com.example.Bakend.entity.Hub;
import com.example.Bakend.entity.enums.DemandeStatut;
import com.example.Bakend.entity.enums.TypeEtape;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.maps.HaversineUtil;
import com.example.Bakend.repository.DemandeTransportRepository;
import com.example.Bakend.repository.EtapeLivraisonRepository;
import com.example.Bakend.repository.HubRepository;
import com.example.Bakend.service.tarification.TarificationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Recommandation de hubs intra-tenant (Phase 1).
 *
 * Formule : score = w1·proximite + w2·tarif + w3·fiabilite + w4·delai
 *   w1=0.40, w2=0.25, w3=0.20, w4=0.15
 *
 * - proximite : Haversine hub→collecte, normalisée (0..1), exclusion > RAYON_KM
 * - tarif     : 1/tarif normalisé (tarif constant entre hubs, mais nécessaire pour breakdown)
 * - fiabilite : LIVREE / (LIVREE + INCIDENT) par hub, neutre 0.5 si pas d'historique
 * - delai     : 1/(1 + delay_heures_moyen) sur étapes LIVRAISON, neutre 0.5 si pas d'historique
 */
@Slf4j
@Service
@Transactional(readOnly = true)
public class RecommandationService {

    private static final double W_PROXIMITE = 0.40;
    private static final double W_TARIF     = 0.25;
    private static final double W_FIABILITE = 0.20;
    private static final double W_DELAI     = 0.15;
    private static final double RAYON_KM    = 50.0;

    private final HubRepository hubRepository;
    private final DemandeTransportRepository demandeTransportRepository;
    private final EtapeLivraisonRepository etapeLivraisonRepository;
    private final TarificationService tarificationService;

    public RecommandationService(HubRepository hubRepository,
                                 DemandeTransportRepository demandeTransportRepository,
                                 EtapeLivraisonRepository etapeLivraisonRepository,
                                 TarificationService tarificationService) {
        this.hubRepository = hubRepository;
        this.demandeTransportRepository = demandeTransportRepository;
        this.etapeLivraisonRepository = etapeLivraisonRepository;
        this.tarificationService = tarificationService;
    }

    /**
     * Classe les hubs du tenant par score décroissant.
     * Le premier hub est le plus recommandé.
     */
    public List<HubRecommandationResponse> classer(UUID tenantId,
                                                   Double latCollecte, Double lonCollecte,
                                                   Double latLivraison, Double lonLivraison,
                                                   boolean assurance, boolean express) {

        List<Hub> candidats = hubRepository.findByPmeClienteTenantId(tenantId)
                .stream().filter(Hub::isActif).toList();

        if (candidats.isEmpty()) {
            return List.of();
        }

        // --- Étape 1 : récupérer les données brutes par hub ---
        // distance hub→collecte
        Map<UUID, Double> distances = new LinkedHashMap<>();
        for (Hub h : candidats) {
            if (h.getLatitude() != null && h.getLongitude() != null
                    && latCollecte != null && lonCollecte != null) {
                distances.put(h.getHubId(),
                        HaversineUtil.distance(h.getLatitude(), h.getLongitude(), latCollecte, lonCollecte));
            } else {
                distances.put(h.getHubId(), null); // pas de coords
            }
        }

        // fiabilite : livrees / (livrees + incidents) par hub
        Map<UUID, double[]> fiabiliteData = new LinkedHashMap<>(); // [livrees, incidents]
        for (Hub h : candidats) {
            long livrees = demandeTransportRepository
                    .rechercherParHubEtStatut(tenantId, h.getHubId(), DemandeStatut.LIVREE).size();
            long incidents = demandeTransportRepository
                    .rechercherParHubEtStatut(tenantId, h.getHubId(), DemandeStatut.INCIDENT).size();
            fiabiliteData.put(h.getHubId(), new double[]{livrees, incidents});
        }

        // delai moyen : avg(reelle - prevue) en heures sur étapes LIVRAISON
        Map<UUID, double[]> delaiData = new LinkedHashMap<>(); // [nbEtapes, avgHeures]
        for (Hub h : candidats) {
            List<Object[]> dates = etapeLivraisonRepository
                    .findDatesDelaiParHub(tenantId, h.getHubId(), TypeEtape.LIVRAISON);
            if (dates != null && !dates.isEmpty()) {
                double totalHeures = 0;
                for (Object[] row : dates) {
                    LocalDateTime prevue = (LocalDateTime) row[0];
                    LocalDateTime reelle = (LocalDateTime) row[1];
                    totalHeures += Duration.between(prevue, reelle).toSeconds() / 3600.0;
                }
                double avgHeures = totalHeures / dates.size();
                delaiData.put(h.getHubId(), new double[]{dates.size(), avgHeures});
            } else {
                delaiData.put(h.getHubId(), new double[]{0, 0});
            }
        }

        // tarif estimé par hub (distance tournée 3 segments varie selon le hub)
        Map<UUID, BigDecimal> tarifsParHub = new LinkedHashMap<>();
        for (Hub h : candidats) {
            try {
                DemandeDevisRequest synthese = new DemandeDevisRequest(
                        h.getHubId(),
                        BigDecimal.valueOf(1), BigDecimal.valueOf(1),
                        assurance, express,
                        List.of(new DemandeDevisRequest.DevisColisRequest(
                                BigDecimal.valueOf(1), BigDecimal.valueOf(1), null)),
                        latCollecte, lonCollecte, latLivraison, lonLivraison);
                DemandeDevisResponse devis = tarificationService.calculerDevis(tenantId, synthese);
                tarifsParHub.put(h.getHubId(), devis.montantEstime());
            } catch (Exception e) {
                log.debug("Devis synthétique impossible pour hub {} : {}", h.getHubId(), e.getMessage());
            }
        }

        // --- Étape 2 : normalisation ---
        double maxDist = distances.values().stream()
                .filter(Objects::nonNull).mapToDouble(d -> d).max().orElse(1.0);
        if (maxDist == 0) maxDist = 1.0;

        double maxDelai = delaiData.values().stream()
                .mapToDouble(d -> d[1]).max().orElse(1.0);
        if (maxDelai == 0) maxDelai = 1.0;

        // --- Étape 3 : calcul des scores ---
        List<HubRecommandationResponse> resultats = new ArrayList<>();

        for (Hub h : candidats) {
            UUID hubId = h.getHubId();
            Double dist = distances.get(hubId);

            // Proximité
            boolean horsRayon = dist != null && dist > RAYON_KM;
            double proxBrute = (dist != null) ? (1.0 - dist / maxDist) : 0.5;
            if (horsRayon) proxBrute = 0.0;
            double proxNorm = proxBrute;

            // Fiabilité
            double[] fiab = fiabiliteData.getOrDefault(hubId, new double[]{0, 0});
            double fiabBrute;
            boolean donneesInsuffisantes;
            if (fiab[0] + fiab[1] > 0) {
                fiabBrute = fiab[0] / (fiab[0] + fiab[1]);
                donneesInsuffisantes = false;
            } else {
                fiabBrute = 0.5; // neutre
                donneesInsuffisantes = true;
            }
            double fiabNorm = fiabBrute;

            // Délai
            double[] dl = delaiData.getOrDefault(hubId, new double[]{0, 0});
            double delaiBrute;
            if (dl[0] > 0) {
                delaiBrute = 1.0 / (1.0 + dl[1] / maxDelai);
                donneesInsuffisantes = false;
            } else {
                delaiBrute = 0.5; // neutre
            }
            double delaiNorm = delaiBrute;

            // Tarif (variable entre hubs via distance tournée 3 segments)
            BigDecimal tarifHub = tarifsParHub.get(hubId);
            double tarifBrute;
            if (tarifHub != null && tarifHub.compareTo(BigDecimal.ZERO) > 0) {
                // Plus le tarif est bas, meilleur est le hub → score inversement proportionnel
                tarifBrute = 1.0 / (1.0 + tarifHub.doubleValue() / 100000.0);
            } else {
                tarifBrute = 0.5;
            }
            double tarifNorm = tarifBrute;

            // Score final
            double score = W_PROXIMITE * proxNorm
                    + W_TARIF * tarifNorm
                    + W_FIABILITE * fiabNorm
                    + W_DELAI * delaiNorm;

            // Message info
            String message = null;
            if (horsRayon) {
                message = "Hors rayon (" + String.format("%.0f", dist) + " km > " + String.format("%.0f", RAYON_KM) + " km)";
            } else if (donneesInsuffisantes) {
                message = "Pas d'historique de livraisons";
            }

            resultats.add(new HubRecommandationResponse(
                    hubId, h.getNom(), h.getAdresse(), h.getLatitude(), h.getLongitude(),
                    BigDecimal.valueOf(score).setScale(4, RoundingMode.HALF_UP),
                    false, // sera ajusté après tri
                    BigDecimal.valueOf(proxNorm).setScale(4, RoundingMode.HALF_UP),
                    tarifHub,
                    BigDecimal.valueOf(fiabNorm).setScale(4, RoundingMode.HALF_UP),
                    dl[0] > 0 ? BigDecimal.valueOf(dl[1]).setScale(1, RoundingMode.HALF_UP) : null,
                    (long) fiab[0] + (long) fiab[1],
                    donneesInsuffisantes,
                    message
            ));
        }

        // Tri décroissant par score
        resultats.sort((a, b) -> b.score().compareTo(a.score()));

        // Marquer le meilleur
        if (!resultats.isEmpty()) {
            HubRecommandationResponse best = resultats.get(0);
            resultats.set(0, new HubRecommandationResponse(
                    best.hubId(), best.nom(), best.adresse(), best.latitude(), best.longitude(),
                    best.score(), true,
                    best.proximiteZone(), best.tarifEstime(), best.fiabilite(), best.delaiMoyenHeures(),
                    best.nbLivraisons(), best.donneesInsuffisantes(), best.messageInfo()));
        }

        return resultats;
    }
}
