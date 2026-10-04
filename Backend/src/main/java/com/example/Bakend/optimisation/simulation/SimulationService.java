package com.example.Bakend.optimisation.simulation;

import com.example.Bakend.dto.simulation.SimulationGroupeRequest;
import com.example.Bakend.dto.simulation.SimulationGroupeResponse;
import com.example.Bakend.dto.simulation.SimulationGroupeResponse.ColisNonGroupe;
import com.example.Bakend.dto.simulation.SimulationGroupeResponse.SacSimule;
import com.example.Bakend.dto.simulation.SimulationGroupeResponse.VehiculeRequis;
import com.example.Bakend.entity.enums.TypeAlgorithme;
import com.example.Bakend.optimisation.groupage.BinPackingService;
import com.example.Bakend.optimisation.groupage.BinPackingService.SacFfd;
import com.example.Bakend.optimisation.groupage.KnapsackSolverService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * Simulation de groupage 100% hors BDD.
 *
 * Contrairement a GroupageSimulationService (qui lit les demandes, les hubs
 * et les vehicules reels puis ecrit un OptimisationRun), ce service ne
 * depend d'AUCUN repository :
 *   - entrees : colis saisis manuellement + capacite envisagee
 *   - calcul  : BinPackingService (FFD) ou KnapsackSolverService (OR-Tools)
 *   - sorties : profil des sacs (poids/volume/taux) + caracteristiques
 *               minimales du vehicule requis (aucun vehicule reel lu)
 * Aucune donnee n'entre ni ne sort de la base de donnees.
 */
@Service
public class SimulationService {

    private static final Logger log = LoggerFactory.getLogger(SimulationService.class);

    private static final long SCALE = 100;
    private static final int SEUIL_DEFAUT = 60;

    /**
     * Gabarits vehicule indicatifs (constantes en dur, pas de table BDD).
     * Le plus petit gabarit couvrant le sac est suggere.
     */
    private record Gabarit(String nom, double poidsKg, double volumeM3) {}

    private static final List<Gabarit> GABARITS = List.of(
            new Gabarit("Pickup", 800, 8),
            new Gabarit("Fourgon leger", 1500, 12),
            new Gabarit("Fourgon", 3500, 18),
            new Gabarit("Camion leger", 5000, 20),
            new Gabarit("Camion", 10000, 35),
            new Gabarit("Semi-remorque", 20000, 60)
    );

    private final BinPackingService binPackingService;
    private final KnapsackSolverService knapsackSolverService;

    public SimulationService(BinPackingService binPackingService,
                             KnapsackSolverService knapsackSolverService) {
        this.binPackingService = binPackingService;
        this.knapsackSolverService = knapsackSolverService;
    }

    /**
     * Execute une simulation de groupage sur les colis saisis.
     *
     * @throws IllegalStateException si la requete est invalide (400)
     */
    public SimulationGroupeResponse grouper(SimulationGroupeRequest request) {
        long debut = System.currentTimeMillis();

        valider(request);

        TypeAlgorithme algo = request.algo() != null ? request.algo() : TypeAlgorithme.BIN_PACKING;
        int seuil = request.seuilRemplissage() != null ? request.seuilRemplissage() : SEUIL_DEFAUT;
        double capPoids = request.capacitePoidsKg();
        double capVolume = request.capaciteVolumeM3();
        long capP = Math.round(capPoids * SCALE);
        long capV = Math.round(capVolume * SCALE);

        List<Double> poidsKg = new ArrayList<>();
        List<Double> volumeM3 = new ArrayList<>();
        for (SimulationGroupeRequest.ColisSimule c : request.colis()) {
            poidsKg.add(c.poidsKg());
            volumeM3.add(c.volumeM3());
        }

        // 1. Ecarter les colis trop gros pour tenir dans un sac
        List<ColisNonGroupe> nonGroupes = new ArrayList<>();
        List<Integer> indicesValides = new ArrayList<>();
        List<Long> poids = new ArrayList<>();
        List<Long> volumes = new ArrayList<>();
        for (int i = 0; i < poidsKg.size(); i++) {
            long p = Math.round(poidsKg.get(i) * SCALE);
            long v = Math.round(volumeM3.get(i) * SCALE);
            if (p > capP || v > capV) {
                nonGroupes.add(new ColisNonGroupe(i, poidsKg.get(i), volumeM3.get(i),
                        "Depasse la capacite du sac"));
            } else {
                indicesValides.add(i);
                poids.add(p);
                volumes.add(v);
            }
        }

        // 2. Resolution selon l'algorithme choisi
        List<SacSimule> sacs = new ArrayList<>();
        if (algo == TypeAlgorithme.KNAPSACK) {
            resolutionKnapsack(poids, volumes, capP, capV, seuil, capPoids, capVolume,
                    indicesValides, nonGroupes, sacs);
        } else {
            resolutionBinPacking(poids, volumes, capP, capV, seuil, capPoids, capVolume,
                    indicesValides, sacs);
        }

        long duree = System.currentTimeMillis() - debut;
        log.info("Simulation groupage {} : {} colis -> {} sacs, {} non groupes ({} ms)",
                algo, request.colis().size(), sacs.size(), nonGroupes.size(), duree);

        return new SimulationGroupeResponse(
                sacs,
                nonGroupes,
                new SimulationGroupeResponse.Meta(algo, request.colis().size(), sacs.size(),
                        capPoids, capVolume, seuil, duree));
    }

    // ── Algorithmes ──────────────────────────────────────────────

    private void resolutionBinPacking(List<Long> poids, List<Long> volumes,
                                      long capP, long capV, int seuil,
                                      double capPoids, double capVolume,
                                      List<Integer> indicesValides, List<SacSimule> sacs) {
        BinPackingService.BinPackingResult resultat = binPackingService.solve(poids, volumes, capP, capV);
        int numero = 1;
        for (SacFfd sac : resultat.sacs()) {
            sacs.add(construireSac(numero++, sac.indicesColis(), sac.poidsTotal(), sac.volumeTotal(),
                    capP, capV, capPoids, capVolume, seuil, indicesValides));
        }
    }

    private void resolutionKnapsack(List<Long> poids, List<Long> volumes,
                                    long capP, long capV, int seuil,
                                    double capPoids, double capVolume,
                                    List<Integer> indicesValides, List<ColisNonGroupe> nonGroupes,
                                    List<SacSimule> sacs) {
        KnapsackSolverService.KnapsackResult resultat =
                knapsackSolverService.solve(poids, volumes, capP, capV);
        if (!resultat.indicesInclus().isEmpty()) {
            sacs.add(construireSac(1, resultat.indicesInclus(), resultat.poidsTotal(), resultat.volumeTotal(),
                    capP, capV, capPoids, capVolume, seuil, indicesValides));
        }
        // Les colis valides non retenus par le sac optimal
        for (int j = 0; j < poids.size(); j++) {
            if (!resultat.indicesInclus().contains(j)) {
                int indexInitial = indicesValides.get(j);
                nonGroupes.add(new ColisNonGroupe(indexInitial,
                        poids.get(j) / (double) SCALE, volumes.get(j) / (double) SCALE,
                        "Non retenu par le Knapsack (capacite optimale atteinte)"));
            }
        }
    }

    private SacSimule construireSac(int numero, List<Integer> indices, long poidsSc, long volumeSc,
                                    long capP, long capV, double capPoids, double capVolume,
                                    int seuil, List<Integer> indicesValides) {
        double poidsKg = poidsSc / (double) SCALE;
        double volumeM3 = volumeSc / (double) SCALE;
        int tauxPoids = pct(poidsSc, capP);
        int tauxVolume = pct(volumeSc, capV);
        int taux = Math.max(tauxPoids, tauxVolume);

        List<Integer> colis = new ArrayList<>();
        for (int idx : indices) {
            colis.add(indicesValides.get(idx));
        }

        return new SacSimule(numero, indices.size(), colis, poidsKg, volumeM3, taux,
                taux < seuil, vehiculeRequis(poidsKg, volumeM3));
    }

    private static int pct(long valeur, long capacite) {
        if (capacite <= 0) return 0;
        return BigDecimal.valueOf(valeur * 100.0 / capacite)
                .setScale(0, RoundingMode.HALF_UP).intValue();
    }

    private VehiculeRequis vehiculeRequis(double poidsKg, double volumeM3) {
        for (Gabarit g : GABARITS) {
            if (g.poidsKg() >= poidsKg && g.volumeM3() >= volumeM3) {
                return new VehiculeRequis(poidsKg, volumeM3, g.nom(), false);
            }
        }
        return new VehiculeRequis(poidsKg, volumeM3, "Hors gabarit : fractionner le sac", true);
    }

    // ── Validation ───────────────────────────────────────────────

    private void valider(SimulationGroupeRequest request) {
        if (request == null || request.colis() == null || request.colis().isEmpty()) {
            throw new IllegalStateException("Au moins un colis est requis");
        }
        if (request.capacitePoidsKg() == null || request.capacitePoidsKg() <= 0) {
            throw new IllegalStateException("Capacite poids invalide (doit etre > 0)");
        }
        if (request.capaciteVolumeM3() == null || request.capaciteVolumeM3() <= 0) {
            throw new IllegalStateException("Capacite volume invalide (doit etre > 0)");
        }
        if (request.algo() != null
                && request.algo() != TypeAlgorithme.BIN_PACKING
                && request.algo() != TypeAlgorithme.KNAPSACK) {
            throw new IllegalStateException("Algorithme non supporte : " + request.algo());
        }
        if (request.seuilRemplissage() != null
                && (request.seuilRemplissage() < 0 || request.seuilRemplissage() > 100)) {
            throw new IllegalStateException("Seuil de remplissage invalide (0 a 100)");
        }
        for (int i = 0; i < request.colis().size(); i++) {
            SimulationGroupeRequest.ColisSimule c = request.colis().get(i);
            if (c == null || c.poidsKg() == null || c.poidsKg() <= 0
                    || c.volumeM3() == null || c.volumeM3() <= 0) {
                throw new IllegalStateException(
                        "Colis " + (i + 1) + " invalide : poids et volume doivent etre > 0");
            }
        }
    }
}
