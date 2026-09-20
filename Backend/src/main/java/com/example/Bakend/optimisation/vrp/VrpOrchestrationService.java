package com.example.Bakend.optimisation.vrp;

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
import java.util.List;
import java.util.UUID;

/**
 * Orchestrateur VRP : construit la matrice, appelle le solveur, persiste le résultat.
 *
 * V1 : TSP 1 véhicule par Sac (un chauffeur/véhicule affecté = 1 route).
 * vehicleCount = 1 en dur — cohérent avec le flux métier où
 * l'affectation chauffeur/véhicule est faite AVANT le VRP (Phase 5).
 *
 * TODO Phase 4+ temporelle :
 *   - Fenêtres horaires réelles (dateSouhaitee − delay) au lieu de [0, 86400]
 *   - dateDepart = dateSouhaitee − delaiTransit − marge (migration V20-V22)
 */
@Service
public class VrpOrchestrationService {

    private static final Logger log = LoggerFactory.getLogger(VrpOrchestrationService.class);

    private static final int VEHICLE_COUNT = 1; // TSP : 1 sac = 1 vehicule

    private final SacRepository sacRepository;
    private final OptimisationRunRepository optimisationRunRepository;
    private final TourneeRepository tourneeRepository;
    private final VrpMatrixBuilder matrixBuilder;
    private final OrToolsVrpService vrpService;

    public VrpOrchestrationService(SacRepository sacRepository,
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
     * Lance le VRP sur un Sac et persiste la Tournee + étapes + run.
     *
     * @param tenantId ID du tenant (isolation multi-tenant)
     * @param sacId    ID du Sac à optimiser
     * @return Tournee persistée avec ses EtapeLivraison
     * @throws java.util.NoSuchElementException si le Sac est introuvable
     * @throws IllegalStateException si le Sac n'a pas de chauffeur/véhicule affecté
     * @throws IllegalStateException si le Sac est vide (aucun colis)
     */
    @Transactional
    public Tournee orchestrerVrp(UUID tenantId, UUID sacId) {
        // 1. Charger le Sac (isolation tenant)
        Sac sac = sacRepository.findById(sacId)
                .orElseThrow(() -> new java.util.NoSuchElementException(
                        "Sac introuvable : " + sacId));

        if (!sac.getPmeCliente().getTenantId().equals(tenantId)) {
            throw new java.util.NoSuchElementException(
                    "Sac introuvable : " + sacId);
        }

        // 2. Vérifier affectation chauffeur + véhicule
        if (sac.getChauffeur() == null || sac.getVehicule() == null) {
            throw new IllegalStateException(
                    "Le Sac " + sacId + " n'a pas de chauffeur/véhicule affecté. " +
                    "Lancer l'affectation avant le VRP.");
        }

        // 3. Vérifier colis non vide
        List<Colis> colisList = sac.getColis();
        if (colisList == null || colisList.isEmpty()) {
            throw new IllegalStateException(
                    "Le Sac " + sacId + " ne contient aucun colis.");
        }

        // 4. Construire la matrice temps
        Hub hub = sac.getHub();
        VrpMatrixBuilder.VrpMatrixResult matrixResult =
                matrixBuilder.build(hub, colisList);

        long[][] timeMatrixSec = matrixResult.timeMatrixSec();
        List<Colis> orderedColis = matrixResult.orderedColis();
        int n = timeMatrixSec.length; // dépôt + colis

        // 5. Construire la requête VRP (fenêtres [0, 86400] pour la V1)
        long[][] windows = new long[n][2];
        for (int i = 0; i < n; i++) {
            windows[i][0] = 0;
            windows[i][1] = 86400; // 24h en secondes
        }

        VrpRequest request = new VrpRequest(
                timeMatrixSec,
                VEHICLE_COUNT,
                0, // dépôt = index 0
                windows,
                VrpMode.SINGLE_DEPOT,
                null // timeLimit par défaut (10s depuis config)
        );

        // 6. Résoudre
        VrpSolution solution = vrpService.solve(request);

        if (solution.isEmpty()) {
            throw new IllegalStateException(
                    "Le solveur VRP n'a trouvé aucune solution pour le Sac " + sacId);
        }

        // 7. Persister (transaction unique)
        LocalDateTime dateDepart = LocalDateTime.now(); // V1 : maintenant

        // 7a. OptimisationRun
        OptimisationRun run = new OptimisationRun();
        run.setPmeCliente(sac.getPmeCliente());
        run.setHub(hub);
        run.setTypeAlgorithme(TypeAlgorithme.VRP);
        run.setParametres(buildParametresJson(sacId, n));
        run.setResultat(buildResultatJson(solution));
        run.setDureeCalculMs((int) solution.solveTimeMs());
        run.setJustificationDocument(
                "VRP TSP 1 véhicule sur Sac " + sacId +
                " — " + solution.totalPointsServed() + " points visités, " +
                solution.routes().size() + " route(s), " +
                solution.solveTimeMs() + " ms.");
        optimisationRunRepository.save(run);

        // 7b. Tournee
        Tournee tournee = new Tournee();
        tournee.setPmeCliente(sac.getPmeCliente());
        tournee.setSac(sac);
        tournee.setRunVrp(run);
        tournee.setStatut(TourneeStatut.PLANIFIEE);
        tournee.setDistanceTotaleKm(java.math.BigDecimal.valueOf(
                calculateTotalDistanceKm(solution, orderedColis, hub)));
        tourneeRepository.save(tournee);

        // 7c. EtapeLivraison pour chaque point visité
        VehicleRoute route = solution.routes().get(0); // V1 : 1 seule route
        for (int i = 0; i < route.nodeIndices().size(); i++) {
            int nodeIndex = route.nodeIndices().get(i);
            Colis colis = orderedColis.get(nodeIndex);

            EtapeLivraison etape = new EtapeLivraison();
            etape.setPmeCliente(sac.getPmeCliente());
            etape.setTournee(tournee);
            etape.setColis(colis);
            etape.setOrdre(i + 1);
            etape.setTypeEtape(TypeEtape.LIVRAISON);
            etape.setDateHeurePrevue(dateDepart.plusSeconds(route.arrivalTimesSec().get(i)));
            tournee.getEtapes().add(etape);
        }

        log.info("VRP orchestré pour Sac {} : Tournee {} avec {} étapes",
                sacId, tournee.getTourneeId(), tournee.getEtapes().size());

        return tournee;
    }

    private double calculateTotalDistanceKm(VrpSolution solution,
                                             List<Colis> orderedColis,
                                             Hub hub) {
        if (solution.isEmpty()) return 0;

        double totalKm = 0;
        VehicleRoute route = solution.routes().get(0);
        double depotLat = hub.getLatitude();
        double depotLon = hub.getLongitude();

        double prevLat = depotLat;
        double prevLon = depotLon;

        for (int i = 0; i < route.nodeIndices().size(); i++) {
            int nodeIndex = route.nodeIndices().get(i);
            Colis colis = orderedColis.get(nodeIndex);

            double lat = colis.getDemande().getLatitudeLivraison();
            double lon = colis.getDemande().getLongitudeLivraison();

            totalKm += com.example.Bakend.maps.HaversineUtil.distance(prevLat, prevLon, lat, lon);
            prevLat = lat;
            prevLon = lon;
        }

        // Retour au dépôt
        totalKm += com.example.Bakend.maps.HaversineUtil.distance(prevLat, prevLon, depotLat, depotLon);

        return Math.round(totalKm * 100.0) / 100.0;
    }

    private String buildParametresJson(UUID sacId, int matrixSize) {
        StringBuilder sb = new StringBuilder("{");
        sb.append("\"sac_id\":\"").append(sacId).append("\"");
        sb.append(",\"vehicle_count\":").append(VEHICLE_COUNT);
        sb.append(",\"matrix_size\":").append(matrixSize);
        sb.append(",\"time_windows\":\"full_day\"");
        sb.append("}");
        return sb.toString();
    }

    private String buildResultatJson(VrpSolution solution) {
        StringBuilder sb = new StringBuilder("{");
        sb.append("\"routes_count\":").append(solution.routes().size());
        sb.append(",\"total_points_served\":").append(solution.totalPointsServed());
        sb.append(",\"solve_time_ms\":").append(solution.solveTimeMs());

        if (!solution.isEmpty()) {
            VehicleRoute route = solution.routes().get(0);
            sb.append(",\"route_0_points\":").append(route.nodeCount());
            sb.append(",\"route_0_departure_sec\":").append(route.departureTimeSec());
            sb.append(",\"route_0_arrivals_sec\":[");
            for (int i = 0; i < route.arrivalTimesSec().size(); i++) {
                if (i > 0) sb.append(",");
                sb.append(route.arrivalTimesSec().get(i));
            }
            sb.append("]");
        }

        sb.append("}");
        return sb.toString();
    }
}
