package com.example.Bakend.service.direction;

import com.example.Bakend.dto.direction.GainsResponse;
import com.example.Bakend.entity.DemandeTransport;
import com.example.Bakend.entity.EtapeLivraison;
import com.example.Bakend.entity.Hub;
import com.example.Bakend.entity.Tournee;
import com.example.Bakend.entity.enums.TypeEtape;
import com.example.Bakend.exception.ResourceNotFoundException;
import com.example.Bakend.maps.HaversineUtil;
import com.example.Bakend.repository.DemandeTransportRepository;
import com.example.Bakend.repository.HubRepository;
import com.example.Bakend.repository.PMEClienteRepository;
import com.example.Bakend.repository.TourneeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Dashboard « Gains de l'optimisation » (Direction) — comparaison baseline vs optimise.
 *
 * Baseline (README §3)  : aller-retour individuel hub → livraison → hub, distance vol d'oiseau.
 * Optimise  (README §4) : somme des distances des tournees planifiees (stockees en base),
 *                         fallback vol d'oiseau si distanceTotaleKm absente.
 * Gains     (README §5) : G = base - opt ; G(%) = G / base × 100.
 * Derives   (README §6-14) : temps, carburant, CO2, cout — deduits de la distance.
 *
 * Meme perimetre de donnees pour les deux scenarios (protocole README §21).
 */
@Service
@Transactional(readOnly = true)
public class GainsService {

    private final DemandeTransportRepository demandeRepository;
    private final TourneeRepository tourneeRepository;
    private final PMEClienteRepository pmeClienteRepository;
    private final HubRepository hubRepository;

    public GainsService(DemandeTransportRepository demandeRepository,
                        TourneeRepository tourneeRepository,
                        PMEClienteRepository pmeClienteRepository,
                        HubRepository hubRepository) {
        this.demandeRepository = demandeRepository;
        this.tourneeRepository = tourneeRepository;
        this.pmeClienteRepository = pmeClienteRepository;
        this.hubRepository = hubRepository;
    }

    public GainsResponse calculer(UUID tenantId, UUID hubId, GainsResponse.Hypotheses hypotheses) {
        verifierTenant(tenantId);

        List<DemandeTransport> demandes = hubId != null
                ? demandeRepository.findByPmeClienteTenantIdAndHubHubId(tenantId, hubId)
                : demandeRepository.findByPmeClienteTenantId(tenantId);

        List<Tournee> tournees = tourneeRepository.findByPmeClienteTenantId(tenantId).stream()
                .filter(t -> hubId == null
                        || (t.getSac() != null && t.getSac().getHub() != null
                        && hubId.equals(t.getSac().getHub().getHubId())))
                .toList();

        String hubNom = hubId != null ? hubRepository.findById(hubId).map(Hub::getNom).orElse(null) : null;

        // ── Protocole : meme perimetre des deux cotes ──
        // Si des tournees existent, la baseline ne compte que les demandes qu'elles couvrent.
        Set<UUID> demandesCouvertes = demandesCouvertes(tournees);
        List<DemandeTransport> perimetreDemandes = tournees.isEmpty()
                ? demandes
                : demandes.stream().filter(d -> demandesCouvertes.contains(d.getDemandeId())).toList();

        // ── Baseline : 2 × distance oiseau(hub, livraison) par demande (README §3) ──
        double distanceBase = 0;
        int demandesIgnorees = 0;
        for (DemandeTransport d : perimetreDemandes) {
            double[] base = coordHub(d);
            double[] cible = coordLivraison(d) != null ? coordLivraison(d) : coordCollecte(d);
            if (base == null || cible == null) {
                demandesIgnorees++;
                continue;
            }
            distanceBase += 2 * HaversineUtil.distance(base[0], base[1], cible[0], cible[1]);
        }
        int demandesComptees = perimetreDemandes.size() - demandesIgnorees;

        // ── Optimise : somme des tournees (README §4) ──
        double distanceOpt = 0;
        int tourneesIgnorees = 0;
        int tourneesFallback = 0;
        for (Tournee t : tournees) {
            if (t.getDistanceTotaleKm() != null) {
                distanceOpt += t.getDistanceTotaleKm().doubleValue();
                continue;
            }
            Double recalculee = distanceTourneeOiseau(t);
            if (recalculee == null) {
                tourneesIgnorees++;
            } else {
                distanceOpt += recalculee;
                tourneesFallback++;
            }
        }
        int tourneesComptees = tournees.size() - tourneesIgnorees;

        // ── Derives (README §6-14) + gains (§5) ──
        GainsResponse.Metrique baseline = metrique(distanceBase, demandesComptees, hypotheses);
        GainsResponse.Metrique optimise = metrique(distanceOpt, tourneesComptees, hypotheses);
        GainsResponse.Gains gains = gains(baseline, optimise);

        String avertissement = avertissement(tournees.isEmpty(), tourneesFallback,
                demandesIgnorees, tourneesIgnorees);

        return new GainsResponse(
                new GainsResponse.Perimetre(hubId, hubNom, perimetreDemandes.size(), demandesIgnorees,
                        tournees.size(), tourneesIgnorees, tourneesFallback),
                baseline, optimise, gains, hypotheses, avertissement);
    }

    // ── Metriques et gains ──

    private GainsResponse.Metrique metrique(double distanceKm, int vehicules, GainsResponse.Hypotheses h) {
        double tempsH = h.vitesseKmh() > 0 ? distanceKm / h.vitesseKmh() : 0;
        double carburantL = distanceKm * h.consoL100km() / 100.0;
        double co2Kg = carburantL * h.facteurCo2KgParL();
        double coutAr = carburantL * h.prixFuelArParL() + tempsH * h.coutHoraireAr();
        return new GainsResponse.Metrique(distanceKm, tempsH, carburantL, co2Kg, coutAr, vehicules);
    }

    private GainsResponse.Gains gains(GainsResponse.Metrique b, GainsResponse.Metrique o) {
        return new GainsResponse.Gains(
                b.distanceKm() - o.distanceKm(),
                pct(b.distanceKm(), o.distanceKm()),
                b.tempsH() - o.tempsH(),
                pct(b.tempsH(), o.tempsH()),
                b.carburantL() - o.carburantL(),
                b.co2Kg() - o.co2Kg(),
                b.coutAr() - o.coutAr(),
                pct(b.coutAr(), o.coutAr()),
                b.vehicules() - o.vehicules());
    }

    private Double pct(double base, double opt) {
        return base > 0 ? (base - opt) / base * 100.0 : null;
    }

    // ── Fallback : distance vol d'oiseau d'une tournee (hub → etapes ordonnees → hub) ──

    private Double distanceTourneeOiseau(Tournee t) {
        Hub hub = t.getSac() != null ? t.getSac().getHub() : null;
        if (hub == null || hub.getLatitude() == null || hub.getLongitude() == null || t.getEtapes().isEmpty()) {
            return null;
        }
        List<EtapeLivraison> etapes = t.getEtapes().stream()
                .filter(e -> e.getOrdre() != null)
                .sorted(Comparator.comparing(EtapeLivraison::getOrdre))
                .toList();
        if (etapes.isEmpty()) {
            return null;
        }
        double total = 0;
        double prevLat = hub.getLatitude();
        double prevLon = hub.getLongitude();
        for (EtapeLivraison e : etapes) {
            double[] point = coordEtape(e);
            if (point == null) {
                return null;
            }
            total += HaversineUtil.distance(prevLat, prevLon, point[0], point[1]);
            prevLat = point[0];
            prevLon = point[1];
        }
        total += HaversineUtil.distance(prevLat, prevLon, hub.getLatitude(), hub.getLongitude());
        return total;
    }

    private double[] coordEtape(EtapeLivraison e) {
        if (e.getColis() == null || e.getColis().getDemande() == null) {
            return null;
        }
        DemandeTransport d = e.getColis().getDemande();
        double[] premier = e.getTypeEtape() == TypeEtape.LIVRAISON ? coordLivraison(d) : coordCollecte(d);
        double[] second = e.getTypeEtape() == TypeEtape.LIVRAISON ? coordCollecte(d) : coordLivraison(d);
        return premier != null ? premier : second;
    }

    // ── Utilitaires coordonnees ──

    private Set<UUID> demandesCouvertes(List<Tournee> tournees) {
        Set<UUID> ids = new HashSet<>();
        for (Tournee t : tournees) {
            for (EtapeLivraison e : t.getEtapes()) {
                if (e.getColis() != null && e.getColis().getDemande() != null) {
                    ids.add(e.getColis().getDemande().getDemandeId());
                }
            }
        }
        return ids;
    }

    private double[] coordHub(DemandeTransport d) {
        Hub hub = d.getHub();
        return hub != null && hub.getLatitude() != null && hub.getLongitude() != null
                ? new double[]{hub.getLatitude(), hub.getLongitude()} : null;
    }

    private double[] coordLivraison(DemandeTransport d) {
        return d.getLatitudeLivraison() != null && d.getLongitudeLivraison() != null
                ? new double[]{d.getLatitudeLivraison(), d.getLongitudeLivraison()} : null;
    }

    private double[] coordCollecte(DemandeTransport d) {
        return d.getLatitudeCollecte() != null && d.getLongitudeCollecte() != null
                ? new double[]{d.getLatitudeCollecte(), d.getLongitudeCollecte()} : null;
    }

    private String avertissement(boolean aucuneTournee, int fallback, int demandesIgnorees, int tourneesIgnorees) {
        if (aucuneTournee) {
            return "Aucune tournee planifiee : le scenario optimise n'est pas mesurable (0 km).";
        }
        String msg = "";
        if (fallback > 0) {
            msg += fallback + " tournee(s) sans distance stockee : distance recalculee en vol d'oiseau.";
        }
        if (demandesIgnorees > 0 || tourneesIgnorees > 0) {
            if (!msg.isEmpty()) {
                msg += " ";
            }
            msg += (demandesIgnorees + tourneesIgnorees) + " element(s) ignore(s) (coordonnees manquantes).";
        }
        return msg.isEmpty() ? null : msg;
    }

    private void verifierTenant(UUID tenantId) {
        if (!pmeClienteRepository.existsByTenantId(tenantId)) {
            throw new ResourceNotFoundException("Tenant introuvable : " + tenantId);
        }
    }
}
