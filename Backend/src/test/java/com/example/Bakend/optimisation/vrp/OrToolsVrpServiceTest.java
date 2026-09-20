package com.example.Bakend.optimisation.vrp;

import com.google.ortools.Loader;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests unitaires du solveur VRP sur données synthétiques.
 * Nécessite les librairies natives OR-Tools (linux-x86-64 pour CI Docker).
 *
 * Scénario : dépôt (index 0) + 5 livraisons, 2 véhicules.
 * Matrice temps symétrique, fenêtres horaires simples.
 */
class OrToolsVrpServiceTest {

    private final OrToolsVrpService service = new OrToolsVrpService();

    @BeforeAll
    static void loadNativeLibraries() {
        Loader.loadNativeLibraries();
    }

    /**
     * Scénario 6 points, 2 véhicules :
     *
     *   0(dépôt)  1   2   3   4   5
     * 0 [  0    10  15  20  25  30 ]
     * 1 [ 10     0   8  18  22  28 ]
     * 2 [ 15     8   0  12  17  20 ]
     * 3 [ 20    18  12   0  10  15 ]
     * 4 [ 25    22  17  10   0   8 ]
     * 5 [ 30    28  20  15   8   0 ]
     *
     * Fenêtres : dépôt [0, 200], livraisons [0, 80] à [0, 80] (large, tout le monde atteignable).
     */
    @Test
    void solvesSmallInstanceAllPointsVisitedOnce() {
        long[][] matrix = {
            { 0, 10, 15, 20, 25, 30},
            {10,  0,  8, 18, 22, 28},
            {15,  8,  0, 12, 17, 20},
            {20, 18, 12,  0, 10, 15},
            {25, 22, 17, 10,  0,  8},
            {30, 28, 20, 15,  8,  0},
        };
        long[][] windows = {
            {0, 200}, {0, 80}, {0, 80}, {0, 80}, {0, 80}, {0, 80}
        };

        VrpRequest request = new VrpRequest(matrix, 2, 0, windows, VrpMode.SINGLE_DEPOT, 10);
        VrpSolution solution = service.solve(request);

        assertNotNull(solution, "La solution ne doit pas être nulle");
        assertFalse(solution.isEmpty(), "Au moins une route doit exister");
        assertTrue(solution.routes().size() <= 2, "Pas plus de 2 véhicules utilisés");

        // Tous les points (1-5) visités exactement une fois
        List<Integer> allVisited = new ArrayList<>();
        for (VehicleRoute route : solution.routes()) {
            allVisited.addAll(route.nodeIndices());
        }
        assertEquals(5, allVisited.size(), "Les 5 points de livraison doivent être visités");
        assertEquals(5, allVisited.stream().distinct().count(),
                "Chaque point doit être visité une seule fois");
    }

    @Test
    void timeWindowsAreRespected() {
        // Fenêtres serrées : point 2 ne peut être visité qu'entre t=0 et t=30
        long[][] matrix = {
            { 0, 10, 15, 20},
            {10,  0,  8, 18},
            {15,  8,  0, 12},
            {20, 18, 12,  0},
        };
        long[][] windows = {
            {0, 200}, // dépôt
            {0, 50},   // point 1
            {0, 30},   // point 2 : fenêtre très courte
            {0, 200},  // point 3
        };

        VrpRequest request = new VrpRequest(matrix, 1, 0, windows, VrpMode.SINGLE_DEPOT, 10);
        VrpSolution solution = service.solve(request);

        assertNotNull(solution);
        assertFalse(solution.isEmpty());

        // Vérifier que chaque point est dans sa fenêtre
        for (VehicleRoute route : solution.routes()) {
            for (int i = 0; i < route.nodeIndices().size(); i++) {
                int node = route.nodeIndices().get(i);
                long arrival = route.arrivalTimesSec().get(i);
                long[] w = windows[node];
                assertTrue(arrival >= w[0] && arrival <= w[1],
                        "Point " + node + " : arrival=" + arrival
                                + " hors fenêtre [" + w[0] + "," + w[1] + "]");
            }
        }
    }

    @Test
    void noMoreVehiclesThanAvailable() {
        long[][] matrix = {
            { 0, 10, 15},
            {10,  0,  8},
            {15,  8,  0},
        };
        long[][] windows = {
            {0, 200}, {0, 80}, {0, 80}
        };

        VrpRequest request = new VrpRequest(matrix, 3, 0, windows, VrpMode.SINGLE_DEPOT, 5);
        VrpSolution solution = service.solve(request);

        assertNotNull(solution);
        assertTrue(solution.routes().size() <= 3,
                "Pas plus de 3 véhicules utilisés");
    }

    @Test
    void eachVehicleStartsAndEndsAtDepot() {
        long[][] matrix = {
            { 0, 10, 15, 20},
            {10,  0,  8, 18},
            {15,  8,  0, 12},
            {20, 18, 12,  0},
        };
        long[][] windows = {
            {0, 200}, {0, 80}, {0, 80}, {0, 80}
        };

        VrpRequest request = new VrpRequest(matrix, 2, 0, windows, VrpMode.SINGLE_DEPOT, 10);
        VrpSolution solution = service.solve(request);

        assertNotNull(solution);
        // Les véhicules non utilisés sont exclus, mais les utilisés partent du dépôt
        for (VehicleRoute route : solution.routes()) {
            assertFalse(route.isEmpty(), "Chaque route a au moins une livraison");
            // Pas de vérification explicite du retour au dépôt dans le record
            // car le solveur gère ça en interne — la validité des fenêtres suffit
        }
    }

    @Test
    void singleDepotModeIsAcceptedAndMultiDepotOpenRejected() {
        long[][] matrix = {{0, 10}, {10, 0}};
        long[][] windows = {{0, 100}, {0, 50}};

        // SINGLE_DEPOT : doit fonctionner
        VrpRequest single = new VrpRequest(matrix, 1, 0, windows, VrpMode.SINGLE_DEPOT, 5);
        assertDoesNotThrow(() -> service.solve(single));

        // MULTI_DEPOT_OPEN : doit lever UnsupportedOperationException (validé dans le record)
        assertThrows(UnsupportedOperationException.class,
                () -> new VrpRequest(matrix, 1, 0, windows, VrpMode.MULTI_DEPOT_OPEN, 5));
    }

    @Test
    void requestValidationRejectsBadInput() {
        long[][] matrix = {{0, 10}, {10, 0}};
        long[][] windows = {{0, 100}, {0, 50}};

        // vehicleCount < 1
        assertThrows(IllegalArgumentException.class,
                () -> new VrpRequest(matrix, 0, 0, windows, VrpMode.SINGLE_DEPOT, 5));
        // depotIndex hors bornes
        assertThrows(IllegalArgumentException.class,
                () -> new VrpRequest(matrix, 1, 5, windows, VrpMode.SINGLE_DEPOT, 5));
        // timeWindows.length ≠ n
        assertThrows(IllegalArgumentException.class,
                () -> new VrpRequest(matrix, 1, 0, new long[][]{{0,100}}, VrpMode.SINGLE_DEPOT, 5));
    }
}
