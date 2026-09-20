package com.example.Bakend.optimisation.vrp;

import java.util.concurrent.CompletableFuture;

/**
 * Interface VRP pure — ne stocke pas d'état, ne touche pas les entités.
 * Facilement rendable asynchrone : CompletableFuture.supplyAsync(() -> solve(req)).
 *
 * TODO intégration future :
 *   Tournee t = new Tournee();
 *   t.setAlgorithme(TypeAlgorithme.VRP);
 *   t.setDateDepart(...);
 *   route.nodeIndices().forEach(idx -> {
 *       EtapeLivraison e = new EtapeLivraison();
 *       e.setDateHeurePrevue(Instant.ofEpochSecond(route.arrivalTimesSec().get(i)));
 *       e.setColis(colisParIndex.get(idx));
 *       t.getEtapes().add(e);
 *   });
 */
public interface VrpService {

    /**
     * Résout le VRP et retourne les tournées ordonnées.
     *
     * @param request entrée complète (matrice, véhicules, fenêtres, mode, timeLimit)
     * @return solution avec les routes par véhicule
     */
    VrpSolution solve(VrpRequest request);
}
