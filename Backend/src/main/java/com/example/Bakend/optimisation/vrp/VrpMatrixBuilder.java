package com.example.Bakend.optimisation.vrp;

import com.example.Bakend.entity.Colis;
import com.example.Bakend.entity.Hub;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Construit la matrice temps NxN (en secondes) pour le VRP.
 * Index 0 = Hub (dépôt), index 1..N = colis triés par colisId (déterministe).
 * Délègue le calcul à VrpMatrixProvider (Haversine ou OSRM).
 */
@Component
public class VrpMatrixBuilder {

    private final VrpMatrixProvider matrixProvider;

    public VrpMatrixBuilder(VrpMatrixProvider matrixProvider) {
        this.matrixProvider = matrixProvider;
    }

    /**
     * Résultat du build : matrice temps + mapping index → Colis.
     *
     * @param timeMatrixSec matrice carrée N×N en secondes
     * @param orderedColis  liste ordonnée (index 0 = null pour dépôt, 1..N = colis)
     */
    public record VrpMatrixResult(long[][] timeMatrixSec, List<Colis> orderedColis) {}

    /**
     * Construit la matrice temps a partir du hub (depot) et des colis a livrer.
     *
     * @param hub   hub de depart (depot, index 0)
     * @param colis colis a livrer (index 1..N)
     * @return matrice temps + mapping index->Colis
     * @throws IllegalArgumentException si hub ou colis a des coords manquantes
     */
    public VrpMatrixResult build(Hub hub, List<Colis> colis) {
        if (hub.getLatitude() == null || hub.getLongitude() == null) {
            throw new IllegalArgumentException(
                    "Hub '" + hub.getNom() + "' n'a pas de coordonnées GPS");
        }
        if (colis.isEmpty()) {
            throw new IllegalArgumentException("Aucun colis à insérer dans la matrice VRP");
        }

        // Tri déterministe par colisId pour stabilité
        List<Colis> sorted = new ArrayList<>(colis);
        sorted.sort((a, b) -> a.getColisId().compareTo(b.getColisId()));

        // Construire la liste ordonnée (index 0 = null = dépôt)
        List<Colis> ordered = new ArrayList<>();
        ordered.add(null); // index 0 = dépôt
        ordered.addAll(sorted);

        // Construire les GeoPoint
        List<GeoPoint> points = new ArrayList<>();
        points.add(new GeoPoint(hub.getLatitude(), hub.getLongitude()));
        for (Colis c : sorted) {
            points.add(new GeoPoint(getLatLivraison(c), getLonLivraison(c)));
        }

        // Déléguer le calcul au provider
        long[][] matrix = matrixProvider.matriceTemps(points);

        return new VrpMatrixResult(matrix, ordered);
    }

    private double getLatLivraison(Colis colis) {
        Double lat = colis.getDemande().getLatitudeLivraison();
        if (lat == null) {
            throw new IllegalArgumentException(
                    "Colis " + colis.getColisId() + " : latitude livraison manquante");
        }
        return lat;
    }

    private double getLonLivraison(Colis colis) {
        Double lon = colis.getDemande().getLongitudeLivraison();
        if (lon == null) {
            throw new IllegalArgumentException(
                    "Colis " + colis.getColisId() + " : longitude livraison manquante");
        }
        return lon;
    }
}
