package com.example.Bakend.optimisation.vrp;

import com.example.Bakend.dto.optimisation.*;
import com.example.Bakend.dto.optimisation.VrpPreviewResponse.*;
import com.example.Bakend.entity.*;
import com.example.Bakend.entity.enums.TypeAlgorithme;
import com.example.Bakend.entity.enums.TypeEtape;
import com.example.Bakend.entity.enums.TourneeStatut;
import com.example.Bakend.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

/**
 * Service de simulation VRP : preview sans persister, validation avec edition d'ordre.
 */
@Service
public class VrpSimulationService {

    private static final Logger log = LoggerFactory.getLogger(VrpSimulationService.class);
    private static final int VEHICLE_COUNT = 1;

    private final SacRepository sacRepository;
    private final OptimisationRunRepository optimisationRunRepository;
    private final TourneeRepository tourneeRepository;
    private final VrpMatrixBuilder matrixBuilder;
    private final OrToolsVrpService vrpService;

    public VrpSimulationService(SacRepository sacRepository,
                                 OptimisationRunRepository optimisationRunRepository,
                                 TourneeRepository tourneeRepository,
                                 VrpMatrixBuilder matrixBuilder,
                                 OrToolsVrpService vrpService) {
        this.sacRepository = sacRepository;
        this.optimisationRunRepository = optimisationRunRepository;
        this.tourneeRepository = tourneeRepository;
        this.matrixBuilder = matrixBuilder;
        this.vrpService = vrpService;
    }

    /**
     * Preview : execute le VRP SANS persister la Tournee.
     * Retourne les etapes avec lat/lon + ordre + distance.
     */
    @Transactional(readOnly = true)
    public VrpPreviewResponse preview(UUID tenantId, UUID sacId) {
        Sac sac = sacRepository.findById(sacId)
                .orElseThrow(() -> new NoSuchElementException("Sac introuvable : " + sacId));

        if (!sac.getPmeCliente().getTenantId().equals(tenantId)) {
            throw new NoSuchElementException("Sac introuvable : " + sacId);
        }

        if (sac.getColis() == null || sac.getColis().isEmpty()) {
            throw new IllegalStateException("Le Sac " + sacId + " ne contient aucun colis.");
        }

        Hub hub = sac.getHub();
        List<Colis> colisList = sac.getColis();

        // Construire la matrice
        VrpMatrixBuilder.VrpMatrixResult matrixResult = matrixBuilder.build(hub, colisList);
        long[][] timeMatrixSec = matrixResult.timeMatrixSec();
        List<Colis> orderedColis = matrixResult.orderedColis();
        int n = timeMatrixSec.length;

        // Fenetres [0, 86400]
        long[][] windows = new long[n][2];
        for (int i = 0; i < n; i++) {
            windows[i][0] = 0;
            windows[i][1] = 86400;
        }

        VrpRequest request = new VrpRequest(
                timeMatrixSec, VEHICLE_COUNT, 0, windows, VrpMode.SINGLE_DEPOT, null);

        VrpSolution solution = vrpService.solve(request);

        if (solution.isEmpty()) {
            return new VrpPreviewResponse(
                    sacId, null, List.of(), 0, 0,
                    new VrpMeta(0, solution.solveTimeMs(), false));
        }

        // Convertir en etapes preview
        VehicleRoute route = solution.routes().get(0);
        List<EtapePreview> etapes = new ArrayList<>();
        double distanceTotale = 0;
        double prevLat = hub.getLatitude();
        double prevLon = hub.getLongitude();

        for (int i = 0; i < route.nodeIndices().size(); i++) {
            int nodeIndex = route.nodeIndices().get(i);
            Colis colis = orderedColis.get(nodeIndex);
            double lat = colis.getDemande().getLatitudeLivraison();
            double lon = colis.getDemande().getLongitudeLivraison();

            distanceTotale += com.example.Bakend.maps.HaversineUtil.distance(prevLat, prevLon, lat, lon);
            prevLat = lat;
            prevLon = lon;

            etapes.add(new EtapePreview(
                    i + 1,
                    colis.getColisId(),
                    "LIVRAISON",
                    lat,
                    lon,
                    route.arrivalTimesSec().get(i)));
        }

        // Retour au depot
        distanceTotale += com.example.Bakend.maps.HaversineUtil.distance(prevLat, prevLon, hub.getLatitude(), hub.getLongitude());

        return new VrpPreviewResponse(
                sacId,
                null,
                etapes,
                Math.round(distanceTotale * 100.0) / 100.0,
                route.arrivalTimesSec().isEmpty() ? 0 : route.arrivalTimesSec().get(route.arrivalTimesSec().size() - 1),
                new VrpMeta(etapes.size(), solution.solveTimeMs(), true));
    }

    /**
     * Valide : persiste la Tournee avec l'ordre d'etapes potentially edite.
     */
    @Transactional
    public VrpValiderResponse valider(UUID tenantId, VrpValiderRequest request) {
        Sac sac = sacRepository.findById(request.sacId())
                .orElseThrow(() -> new NoSuchElementException("Sac introuvable : " + request.sacId()));

        if (!sac.getPmeCliente().getTenantId().equals(tenantId)) {
            throw new NoSuchElementException("Sac introuvable : " + request.sacId());
        }

        if (sac.getChauffeur() == null || sac.getVehicule() == null) {
            throw new IllegalStateException("Le Sac " + request.sacId() + " n'a pas de chauffeur/vehicule affecte.");
        }

        Hub hub = sac.getHub();

        // D'abord preview pour avoir les donnees
        VrpPreviewResponse preview = preview(tenantId, request.sacId());

        if (!preview.meta().hasSolution()) {
            throw new IllegalStateException("Aucune solution VRP trouvee pour le Sac " + request.sacId());
        }

        // Mapper colisId → lat/lon
        java.util.Map<UUID, double[]> coordsMap = new java.util.HashMap<>();
        for (EtapePreview e : preview.etapes()) {
            coordsMap.put(e.colisId(), new double[]{e.latitude(), e.longitude()});
        }

        // Construire l'ordre final (potentiellement edite)
        List<UUID> ordreFinal;
        if (request.etapes() != null && !request.etapes().isEmpty()) {
            ordreFinal = request.etapes().stream()
                    .map(VrpValiderRequest.VrpEtapeEdit::colisId)
                    .toList();
        } else {
            ordreFinal = preview.etapes().stream()
                    .map(EtapePreview::colisId)
                    .toList();
        }

        // Calculer la distance totale avec l'ordre final
        double distanceTotale = 0;
        double prevLat = hub.getLatitude();
        double prevLon = hub.getLongitude();
        for (UUID colisId : ordreFinal) {
            double[] coords = coordsMap.get(colisId);
            if (coords != null) {
                distanceTotale += com.example.Bakend.maps.HaversineUtil.distance(prevLat, prevLon, coords[0], coords[1]);
                prevLat = coords[0];
                prevLon = coords[1];
            }
        }
        distanceTotale += com.example.Bakend.maps.HaversineUtil.distance(prevLat, prevLon, hub.getLatitude(), hub.getLongitude());

        // Persistere OptimisationRun
        OptimisationRun run = new OptimisationRun();
        run.setPmeCliente(sac.getPmeCliente());
        run.setHub(hub);
        run.setTypeAlgorithme(TypeAlgorithme.VRP);
        run.setParametres("{\"sac_id\":\"" + request.sacId() + "\",\"nb_points\":" + ordreFinal.size() + "}");
        run.setResultat("{\"distance_km\":" + Math.round(distanceTotale * 100.0) / 100.0 + "}");
        run.setDureeCalculMs((int) preview.meta().solveTimeMs());
        run.setJustificationDocument("VRP preview validé : " + ordreFinal.size() + " points, " +
                Math.round(distanceTotale * 100.0) / 100.0 + " km.");
        optimisationRunRepository.save(run);

        // Creer Tournee
        Tournee tournee = new Tournee();
        tournee.setPmeCliente(sac.getPmeCliente());
        tournee.setSac(sac);
        tournee.setRunVrp(run);
        tournee.setStatut(TourneeStatut.PLANIFIEE);
        tournee.setDistanceTotaleKm(java.math.BigDecimal.valueOf(Math.round(distanceTotale * 100.0) / 100.0));
        tourneeRepository.save(tournee);

        // Creer EtapeLivraison dans l'ordre final
        LocalDateTime dateDepart = LocalDateTime.now();
        for (int i = 0; i < ordreFinal.size(); i++) {
            UUID colisId = ordreFinal.get(i);
            double[] coords = coordsMap.get(colisId);

            // Trouver le colis dans le sac
            Colis colis = sac.getColis().stream()
                    .filter(c -> c.getColisId().equals(colisId))
                    .findFirst().orElse(null);

            if (colis != null) {
                EtapeLivraison etape = new EtapeLivraison();
                etape.setPmeCliente(sac.getPmeCliente());
                etape.setTournee(tournee);
                etape.setColis(colis);
                etape.setOrdre(i + 1);
                etape.setTypeEtape(TypeEtape.LIVRAISON);

                // Arrival time preview
                EtapePreview ep = preview.etapes().stream()
                        .filter(e -> e.colisId().equals(colisId))
                        .findFirst().orElse(null);
                if (ep != null) {
                    etape.setDateHeurePrevue(dateDepart.plusSeconds(ep.arrivalSec()));
                }

                tournee.getEtapes().add(etape);
            }
        }

        log.info("VRP validé pour Sac {} : Tournee {} avec {} étapes, {} km",
                request.sacId(), tournee.getTourneeId(), tournee.getEtapes().size(), distanceTotale);

        return new VrpValiderResponse(
                tournee.getTourneeId(),
                run.getRunId(),
                Math.round(distanceTotale * 100.0) / 100.0,
                tournee.getEtapes().size(),
                "VRP valide : " + tournee.getEtapes().size() + " étapes, " +
                        Math.round(distanceTotale * 100.0) / 100.0 + " km.");
    }
}
