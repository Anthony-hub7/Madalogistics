package com.example.Bakend.controller;

import com.example.Bakend.config.TenantContext;
import com.example.Bakend.entity.EtapeLivraison;
import com.example.Bakend.entity.Hub;
import com.example.Bakend.entity.Tournee;
import com.example.Bakend.entity.Colis;
import com.example.Bakend.entity.DemandeTransport;
import com.example.Bakend.entity.Hub;
import com.example.Bakend.maps.RoutingService;
import com.example.Bakend.repository.TourneeRepository;
import com.example.Bakend.repository.EtapeLivraisonRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Endpoint tournées : lecture + tracé géographique.
 */
@RestController
@RequestMapping("/api/tournees")
public class TourneeController {

    private static final Logger log = LoggerFactory.getLogger(TourneeController.class);

    private final TourneeRepository tourneeRepository;
    private final EtapeLivraisonRepository etapeLivraisonRepository;
    private final RoutingService routingService;

    public TourneeController(TourneeRepository tourneeRepository,
                             EtapeLivraisonRepository etapeLivraisonRepository,
                             RoutingService routingService) {
        this.tourneeRepository = tourneeRepository;
        this.etapeLivraisonRepository = etapeLivraisonRepository;
        this.routingService = routingService;
    }

    /**
     * Liste les tournées du tenant avec leurs étapes (lat/lon depuis colis.demande).
     *
     * GET /api/tournees
     */
    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    @Transactional(readOnly = true)
    public ResponseEntity<?> getAll() {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Contexte tenant manquant"));
        }

        List<Tournee> tournees = tourneeRepository.findByPmeClienteTenantId(tenantId);

        List<Map<String, Object>> result = tournees.stream().map(t -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("tournee_id", t.getTourneeId().toString());
            map.put("statut", t.getStatut().name());
            map.put("distance_totale_km", t.getDistanceTotaleKm());
            map.put("created_at", t.getCreatedAt() != null ? t.getCreatedAt().toString() : null);

            Hub hub = t.getSac().getHub();
            if (hub != null) {
                Map<String, Object> hm = new LinkedHashMap<>();
                hm.put("nom", hub.getNom());
                hm.put("latitude", hub.getLatitude());
                hm.put("longitude", hub.getLongitude());
                map.put("hub", hm);
            }

            List<EtapeLivraison> etapes = etapeLivraisonRepository
                    .rechercherParTourneeOrdonnees(t.getTourneeId());

            map.put("etapes", etapes.stream().map(e -> {
                Map<String, Object> em = new LinkedHashMap<>();
                em.put("ordre", e.getOrdre());
                em.put("type_etape", e.getTypeEtape().name());
                em.put("colis_id", e.getColis().getColisId().toString());

                DemandeTransport d = e.getColis().getDemande();
                em.put("latitude", d != null ? d.getLatitudeLivraison() : null);
                em.put("longitude", d != null ? d.getLongitudeLivraison() : null);

                em.put("collecte_latitude", d != null ? d.getLatitudeCollecte() : null);
                em.put("collecte_longitude", d != null ? d.getLongitudeCollecte() : null);
                em.put("adresse_collecte", d != null ? d.getAdresseCollecte() : null);

                return em;
            }).collect(Collectors.toList()));

            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /**
     * Retourne les tracés routiers segmentés d'une tournée.
     * 3 segments distincts :
     *   - collecte : Hub → points de collecte uniques → Hub (vert)
     *   - aller : Hub → livraisons dans l'ordre VRP (rouge)
     *   - retour : dernière livraison → Hub (orange)
     *
     * GET /api/tournees/{id}/trace
     */
    @GetMapping(value = "/{id}/trace", produces = MediaType.APPLICATION_JSON_VALUE)
    @Transactional(readOnly = true)
    public ResponseEntity<?> getTrace(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Contexte tenant manquant"));
        }

        Tournee tournee = tourneeRepository.findById(id)
                .orElse(null);
        if (tournee == null || !tournee.getPmeCliente().getTenantId().equals(tenantId)) {
            return ResponseEntity.notFound().build();
        }

        Hub hub = tournee.getSac().getHub();
        if (hub.getLatitude() == null || hub.getLongitude() == null) {
            log.warn("Hub {} sans coordonnées pour tournée {}", hub.getHubId(), id);
            return ResponseEntity.ok(Map.of(
                    "collecte", Map.of(),
                    "aller", Map.of(),
                    "retour", Map.of()));
        }

        List<EtapeLivraison> etapes = etapeLivraisonRepository
                .rechercherParTourneeOrdonnees(id);

        double hubLat = hub.getLatitude();
        double hubLon = hub.getLongitude();

        // --- Collecte : points uniques ordonnés, doublons consécutifs dédupliqués ---
        List<double[]> collectePoints = new ArrayList<>();
        collectePoints.add(new double[]{hubLat, hubLon});
        double[] prevCollecte = null;
        for (EtapeLivraison etape : etapes) {
            DemandeTransport d = etape.getColis().getDemande();
            if (d == null) continue;
            Double lat = d.getLatitudeCollecte();
            Double lon = d.getLongitudeCollecte();
            if (lat == null || lon == null) continue;
            if (prevCollecte != null && prevCollecte[0] == lat && prevCollecte[1] == lon) continue;
            collectePoints.add(new double[]{lat, lon});
            prevCollecte = new double[]{lat, lon};
        }
        collectePoints.add(new double[]{hubLat, hubLon});

        // --- Aller : Hub → livraisons ordonnées (sans retour final) ---
        List<double[]> allerPoints = new ArrayList<>();
        allerPoints.add(new double[]{hubLat, hubLon});
        for (EtapeLivraison etape : etapes) {
            Colis colis = etape.getColis();
            Double lat = colis.getDemande().getLatitudeLivraison();
            Double lon = colis.getDemande().getLongitudeLivraison();
            if (lat != null && lon != null) {
                allerPoints.add(new double[]{lat, lon});
            }
        }

        // --- Retour : dernière livraison → Hub ---
        List<double[]> retourPoints = new ArrayList<>();
        if (allerPoints.size() > 1) {
            double[] lastDelivery = allerPoints.get(allerPoints.size() - 1);
            retourPoints.add(lastDelivery);
        }
        retourPoints.add(new double[]{hubLat, hubLon});

        // Appels OSRM séparés pour chaque segment
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("collecte", parseRoute(collectePoints));
        result.put("aller", parseRoute(allerPoints));
        result.put("retour", parseRoute(retourPoints));

        return ResponseEntity.ok(result);
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
            log.warn("Route segment failed: {}", e.getMessage());
            return Map.of();
        }
    }
}
