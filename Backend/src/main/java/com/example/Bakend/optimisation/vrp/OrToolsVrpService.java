package com.example.Bakend.optimisation.vrp;

import com.google.ortools.constraintsolver.FirstSolutionStrategy;
import com.google.ortools.constraintsolver.LocalSearchMetaheuristic;
import com.google.ortools.constraintsolver.RoutingDimension;
import com.google.ortools.constraintsolver.RoutingIndexManager;
import com.google.ortools.constraintsolver.RoutingModel;
import com.google.ortools.constraintsolver.RoutingSearchParameters;
import com.google.ortools.constraintsolver.main;
import com.google.protobuf.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Solveur VRP avec OR-Tools (constraintsolver).
 * Reçoit une matrice temps en secondes, ne calcule pas les distances.
 *
 * TODO intégration entités (Phase 4+):
 *   - Tournee : dateDepartPlafond → le solveur retourne departureTimesSec[0] pour chaque véhicule
 *   - EtapeLivraison : dateHeurePrevue ← arrivalTimesSec[i], typeEtape = COLLECTE/LIVRAISON
 *   - OptimisationRun : type VRP, durationMs
 */
@Service
public class OrToolsVrpService implements VrpService {

    private static final Logger log = LoggerFactory.getLogger(OrToolsVrpService.class);

    private static final int DEFAULT_SLACK = 30;      // waiting time allowed at nodes
    private static final int MAX_HORIZON = 86400;     // 24h in seconds

    @Value("${app.vrp.time-limit-seconds:10}")
    private int defaultTimeLimitSeconds;

    @Override
    public VrpSolution solve(VrpRequest request) {
        long start = System.currentTimeMillis();
        int n = request.timeMatrixSec().length;
        int vehicleCount = request.vehicleCount();
        int depotIndex = request.depotIndex();
        long[][] windows = request.effectiveTimeWindows();
        int timeLimit = request.timeLimitSeconds() != null
                ? request.timeLimitSeconds()
                : defaultTimeLimitSeconds;
        timeLimit = Math.max(1, Math.min(timeLimit, 120));

        RoutingIndexManager manager = new RoutingIndexManager(n, vehicleCount, depotIndex);
        RoutingModel routing = new RoutingModel(manager);

        // Transit callback : matrice temps déjà en secondes
        int transitIndex = routing.registerTransitCallback(
                (fromIndex, toIndex) -> {
                    int fromNode = manager.indexToNode(fromIndex);
                    int toNode = manager.indexToNode(toIndex);
                    return request.timeMatrixSec()[fromNode][toNode];
                });

        // Coût d'arc = temps de trajet (minimiser durée totale)
        routing.setArcCostEvaluatorOfAllVehicles(transitIndex);

        // Dimension "Time" : accumule le temps cumulatif par véhicule
        routing.addDimension(transitIndex, DEFAULT_SLACK, MAX_HORIZON, false, "Time");
        RoutingDimension timeDim = routing.getMutableDimension("Time");

        // Fenêtres horaires pour chaque point de livraison (dépôt géré séparément)
        for (int i = 0; i < n; i++) {
            if (i == depotIndex) continue;
            long index = manager.nodeToIndex(i);
            timeDim.cumulVar(index).setRange(windows[i][0], windows[i][1]);
        }

        // Fenêtre du dépôt sur chaque véhicule
        for (int v = 0; v < vehicleCount; v++) {
            long startIdx = routing.start(v);
            timeDim.cumulVar(startIdx).setRange(windows[depotIndex][0], windows[depotIndex][1]);
        }

        // Minimiser les temps de départ/arrivée → favorise les solutions compactes
        for (int v = 0; v < vehicleCount; v++) {
            routing.addVariableMinimizedByFinalizer(timeDim.cumulVar(routing.start(v)));
            routing.addVariableMinimizedByFinalizer(timeDim.cumulVar(routing.end(v)));
        }

        // Paramètres de recherche — partir des defaults C++ valides, ne modifier que l'utile
        RoutingSearchParameters searchParams = main.defaultRoutingSearchParameters()
                .toBuilder()
                .setFirstSolutionStrategy(FirstSolutionStrategy.Value.PATH_CHEAPEST_ARC)
                .setLocalSearchMetaheuristic(LocalSearchMetaheuristic.Value.GUIDED_LOCAL_SEARCH)
                .setTimeLimit(Duration.newBuilder().setSeconds(timeLimit).build())
                .setLogSearch(false)
                .build();

        // Résolution
        com.google.ortools.constraintsolver.Assignment solution =
                routing.solveWithParameters(searchParams);

        if (solution == null) {
            log.warn("Aucune solution VRP trouvée ({} ms)", System.currentTimeMillis() - start);
            return new VrpSolution(Collections.emptyList(), System.currentTimeMillis() - start);
        }

        // Extraction des routes par véhicule
        List<VehicleRoute> routes = new ArrayList<>();
        for (int v = 0; v < vehicleCount; v++) {
            List<Integer> nodes = new ArrayList<>();
            List<Long> arrivals = new ArrayList<>();

            long idx = routing.start(v);
            long departTime = solution.min(timeDim.cumulVar(idx));

            while (!routing.isEnd(idx)) {
                int node = manager.indexToNode(idx);
                long arrival = solution.min(timeDim.cumulVar(idx));
                if (node != depotIndex) {
                    nodes.add(node);
                    arrivals.add(arrival);
                }
                idx = solution.value(routing.nextVar(idx));
            }
            // Ne garder que les véhicules ayant au moins une livraison
            if (!nodes.isEmpty()) {
                routes.add(new VehicleRoute(v, nodes, arrivals, departTime));
            }
        }

        long elapsed = System.currentTimeMillis() - start;
        log.info("VRP résolu : {} routes, {} points visités en {} ms",
                routes.size(),
                routes.stream().mapToInt(VehicleRoute::nodeCount).sum(),
                elapsed);

        return new VrpSolution(routes, elapsed);
    }
}
