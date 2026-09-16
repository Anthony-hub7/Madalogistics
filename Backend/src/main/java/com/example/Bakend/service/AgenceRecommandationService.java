package com.example.Bakend.service;

import com.example.Bakend.dto.auth.AgenceRecommandeeResponse;
import com.example.Bakend.entity.Hub;
import com.example.Bakend.entity.PMECliente;
import com.example.Bakend.entity.enums.DemandeStatut;
import com.example.Bakend.entity.enums.TypeEtape;
import com.example.Bakend.maps.HaversineUtil;
import com.example.Bakend.repository.DemandeTransportRepository;
import com.example.Bakend.repository.EtapeLivraisonRepository;
import com.example.Bakend.repository.HubRepository;
import com.example.Bakend.repository.PMEClienteRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Recommandation d'agences (tenants VALIDEE) pour un client.
 * Score = 0.40·proximite + 0.30·fiabilite + 0.20·dispo + 0.10·delai.
 */
@Slf4j
@Service
@Transactional(readOnly = true)
public class AgenceRecommandationService {

    private static final double W_PROXIMITE     = 0.40;
    private static final double W_FIABILITE     = 0.30;
    private static final double W_DISPO         = 0.20;
    private static final double W_DELAI         = 0.10;

    private final PMEClienteRepository pmeClienteRepository;
    private final HubRepository hubRepository;
    private final DemandeTransportRepository demandeTransportRepository;
    private final EtapeLivraisonRepository etapeLivraisonRepository;

    public AgenceRecommandationService(PMEClienteRepository pmeClienteRepository,
                                       HubRepository hubRepository,
                                       DemandeTransportRepository demandeTransportRepository,
                                       EtapeLivraisonRepository etapeLivraisonRepository) {
        this.pmeClienteRepository = pmeClienteRepository;
        this.hubRepository = hubRepository;
        this.demandeTransportRepository = demandeTransportRepository;
        this.etapeLivraisonRepository = etapeLivraisonRepository;
    }

    public List<AgenceRecommandeeResponse> classer(Double latCollecte, Double lonCollecte) {
        List<PMECliente> agences = pmeClienteRepository.findByStatutDossierAndNotPlateforme("VALIDEE");
        if (agences.isEmpty()) return List.of();

        List<Hub> allHubs = hubRepository.findByPmeClienteTenantId(null);
        Map<UUID, List<Hub>> hubsByTenant = new LinkedHashMap<>();
        for (PMECliente a : agences) {
            hubsByTenant.computeIfAbsent(a.getTenantId(), k -> new ArrayList<>());
        }
        for (Hub h : allHubs) {
            UUID tid = h.getPmeCliente().getTenantId();
            if (hubsByTenant.containsKey(tid) && h.isActif()) {
                hubsByTenant.get(tid).add(h);
            }
        }

        Map<UUID, Double> distancesByTenant = new LinkedHashMap<>();
        Map<UUID, Hub> closestHubByTenant = new LinkedHashMap<>();
        for (PMECliente a : agences) {
            List<Hub> hubs = hubsByTenant.getOrDefault(a.getTenantId(), List.of());
            double bestDist = Double.MAX_VALUE;
            Hub bestHub = null;
            for (Hub h : hubs) {
                if (h.getLatitude() != null && h.getLongitude() != null
                        && latCollecte != null && lonCollecte != null) {
                    double d = HaversineUtil.distance(h.getLatitude(), h.getLongitude(), latCollecte, lonCollecte);
                    if (d < bestDist) { bestDist = d; bestHub = h; }
                }
            }
            distancesByTenant.put(a.getTenantId(), bestDist == Double.MAX_VALUE ? null : bestDist);
            closestHubByTenant.put(a.getTenantId(), bestHub);
        }

        Map<UUID, double[]> fiabiliteByTenant = new LinkedHashMap<>();
        for (PMECliente a : agences) {
            long livrees = demandeTransportRepository.compterParStatut(a.getTenantId(), DemandeStatut.LIVREE);
            long incidents = demandeTransportRepository.compterParStatut(a.getTenantId(), DemandeStatut.INCIDENT);
            fiabiliteByTenant.put(a.getTenantId(), new double[]{livrees, incidents});
        }

        Map<UUID, double[]> delaiByTenant = new LinkedHashMap<>();
        for (PMECliente a : agences) {
            Hub closest = closestHubByTenant.get(a.getTenantId());
            if (closest != null) {
                List<Object[]> dates = etapeLivraisonRepository
                        .findDatesDelaiParHub(a.getTenantId(), closest.getHubId(), TypeEtape.LIVRAISON);
                if (dates != null && !dates.isEmpty()) {
                    double totalHeures = 0;
                    for (Object[] row : dates) {
                        LocalDateTime prevue = (LocalDateTime) row[0];
                        LocalDateTime reelle = (LocalDateTime) row[1];
                        totalHeures += Duration.between(prevue, reelle).toSeconds() / 3600.0;
                    }
                    delaiByTenant.put(a.getTenantId(), new double[]{dates.size(), totalHeures / dates.size()});
                } else {
                    delaiByTenant.put(a.getTenantId(), new double[]{0, 24});
                }
            } else {
                delaiByTenant.put(a.getTenantId(), new double[]{0, 24});
            }
        }

        long maxHubs = agences.stream()
                .mapToLong(a -> hubsByTenant.getOrDefault(a.getTenantId(), List.of()).size())
                .max().orElse(1);
        if (maxHubs == 0) maxHubs = 1;

        double maxDelai = delaiByTenant.values().stream()
                .mapToDouble(d -> d[1]).max().orElse(1.0);
        if (maxDelai == 0) maxDelai = 1.0;

        List<AgenceRecommandeeResponse> resultats = new ArrayList<>();
        for (PMECliente a : agences) {
            UUID tid = a.getTenantId();
            Double dist = distancesByTenant.get(tid);
            Hub closest = closestHubByTenant.get(tid);

            double proxBrute;
            if (dist == null) {
                proxBrute = 0.1;
            } else {
                proxBrute = Math.max(0, 1.0 - dist / 200.0);
            }
            double proxNorm = proxBrute;

            double[] fiab = fiabiliteByTenant.getOrDefault(tid, new double[]{0, 0});
            double fiabBrute = (fiab[0] + fiab[1] > 0) ? fiab[0] / (fiab[0] + fiab[1]) : 0.5;
            double fiabNorm = fiabBrute;

            long nbHubs = hubsByTenant.getOrDefault(tid, List.of()).size();
            double dispoBrute = (double) nbHubs / maxHubs;
            double dispoNorm = dispoBrute;

            double[] dl = delaiByTenant.getOrDefault(tid, new double[]{0, 24});
            double delaiBrute = 1.0 / (1.0 + dl[1] / maxDelai);
            double delaiNorm = delaiBrute;

            double score = W_PROXIMITE * proxNorm
                    + W_FIABILITE * fiabNorm
                    + W_DISPO * dispoNorm
                    + W_DELAI * delaiNorm;

            String message = null;
            if (dist == null) message = "Aucun hub actif avec coordonnées";

            resultats.add(new AgenceRecommandeeResponse(
                    tid, a.getNomEntreprise(), a.getTelephone(), a.getAdresse(),
                    BigDecimal.valueOf(score).setScale(4, RoundingMode.HALF_UP),
                    false,
                    BigDecimal.valueOf(proxNorm).setScale(4, RoundingMode.HALF_UP),
                    BigDecimal.valueOf(fiabNorm).setScale(4, RoundingMode.HALF_UP),
                    BigDecimal.valueOf(dispoNorm).setScale(4, RoundingMode.HALF_UP),
                    BigDecimal.valueOf(dl[1]).setScale(1, RoundingMode.HALF_UP),
                    closest != null ? closest.getHubId() : null,
                    closest != null ? closest.getNom() : null,
                    message
            ));
        }

        resultats.sort((a, b) -> b.score().compareTo(a.score()));
        if (!resultats.isEmpty()) {
            AgenceRecommandeeResponse best = resultats.get(0);
            resultats.set(0, new AgenceRecommandeeResponse(
                    best.tenantId(), best.nom(), best.telephone(), best.adresse(),
                    best.score(), true,
                    best.proximite(), best.fiabilite(), best.disponibilite(), best.delaiEstimeHeures(),
                    best.hubId(), best.hubNom(), best.messageInfo()));
        }

        return resultats;
    }
}
