package com.example.Bakend.optimisation.groupage;

import com.google.ortools.algorithms.KnapsackSolver;
import com.google.ortools.Loader;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Solveur Knapsack exact via OR-Tools (2 contraintes : poids + volume).
 * 1 vehicule : resolution exacte par programmation dynamique.
 */
@Service
public class KnapsackSolverService {

    private static final Logger log = LoggerFactory.getLogger(KnapsackSolverService.class);

    @PostConstruct
    void init() {
        Loader.loadNativeLibraries();
    }

    public record KnapsackResult(List<Integer> indicesInclus, long poidsTotal, long volumeTotal) {}

    public KnapsackResult solve(List<Long> poids, List<Long> volumes,
                                 long capPoids, long capVolume) {
        int n = poids.size();
        if (n == 0) {
            return new KnapsackResult(List.of(), 0L, 0L);
        }

        long[] valeurs = new long[n];
        for (int i = 0; i < n; i++) {
            valeurs[i] = poids.get(i);
        }

        long[] poidsArr = poids.stream().mapToLong(Long::longValue).toArray();
        long[] volumesArr = volumes.stream().mapToLong(Long::longValue).toArray();
        long[][] contraintes = {poidsArr, volumesArr};
        long[] capacities = {capPoids, capVolume};

        KnapsackSolver solver = new KnapsackSolver(
                KnapsackSolver.SolverType.KNAPSACK_DYNAMIC_PROGRAMMING_SOLVER,
                "MadaLogistix_Knapsack");

        solver.init(valeurs, contraintes, capacities);

        long valeurOptimale = solver.solve();
        log.info("Knapsack OR-Tools : valeur optimale = {}", valeurOptimale);

        List<Integer> indices = new ArrayList<>();
        long poidsTotal = 0;
        long volumeTotal = 0;

        for (int i = 0; i < n; i++) {
            if (solver.bestSolutionContains(i)) {
                indices.add(i);
                poidsTotal += poids.get(i);
                volumeTotal += volumes.get(i);
            }
        }

        return new KnapsackResult(indices, poidsTotal, volumeTotal);
    }
}
