package com.example.Bakend.optimisation.groupage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Bin Packing V1 : heuristique FFD (First Fit Decreasing).
 * Colis tries par poids decroissant, inseres dans le premier sac qui tient.
 * Contrainte double : poids + volume.
 */
@Service
public class BinPackingService {

    private static final Logger log = LoggerFactory.getLogger(BinPackingService.class);

    /**
     * Un sac FFD avec ses colis assigns.
     */
    public record SacFfd(List<Integer> indicesColis, long poidsTotal, long volumeTotal) {}

    /**
     * Resultat du Bin Packing FFD.
     */
    public record BinPackingResult(List<SacFfd> sacs, int nbNonGroupes) {}

    /**
     * Resout le Bin Packing FFD.
     *
     * @param poids     poids de chaque colis (kg × 100)
     * @param volumes   volume de chaque colis (m3 × 100)
     * @param capPoids  capacite poids par sac (kg × 100)
     * @param capVolume capacite volume par sac (m3 × 100)
     * @return sacs constitues + nombre de colis non groupes
     */
    public BinPackingResult solve(List<Long> poids, List<Long> volumes,
                                   long capPoids, long capVolume) {
        int n = poids.size();
        if (n == 0) {
            return new BinPackingResult(List.of(), 0);
        }

        // Trier par poids decroissant (FFD)
        List<Integer> indicesTries = new ArrayList<>();
        for (int i = 0; i < n; i++) indicesTries.add(i);
        indicesTries.sort(Comparator.comparingInt((Integer i) -> (int) (long) poids.get(i)).reversed());

        List<SacFfd> sacs = new ArrayList<>();

        for (int idx : indicesTries) {
            long p = poids.get(idx);
            long v = volumes.get(idx);

            boolean placed = false;
            for (SacFfd sac : sacs) {
                if (sac.poidsTotal() + p <= capPoids && sac.volumeTotal() + v <= capVolume) {
                    // Ajouter au sac existant (recréer le record car immutable)
                    List<Integer> nouveauxIndices = new ArrayList<>(sac.indicesColis());
                    nouveauxIndices.add(idx);
                    sacs.set(sacs.indexOf(sac),
                            new SacFfd(nouveauxIndices,
                                    sac.poidsTotal() + p,
                                    sac.volumeTotal() + v));
                    placed = true;
                    break;
                }
            }

            if (!placed) {
                sacs.add(new SacFfd(new ArrayList<>(List.of(idx)), p, v));
            }
        }

        log.info("Bin Packing FFD : {} sacs, {}/{} colis groupes",
                sacs.size(), n - 0, n);

        return new BinPackingResult(sacs, 0);
    }
}
