package com.example.Bakend.optimisation.categorisation;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service de catégorisation non supervisée des colis par clustering.
 *
 * Pipeline :
 * 1. Extraction des features depuis le CSV mock (ou la BDD future)
 * 2. log1p(valeur) + standardisation (moyenne=0, variance=1)
 * 3. K-Means avec k=3..5 (elbow + silhouette + Davies-Bouldin)
 * 4. Validation : matrice confusion cluster × catégorie déclarée
 * 5. Résultat tracé dans optimisation_run (type CLUSTERING)
 *
 * Modèle : K-Means V1, DBSCAN V2 (outlier detection)
 */
@Service
public class CategorisationService {

    private static final Logger log = LoggerFactory.getLogger(CategorisationService.class);

    private final ColisFeatureExtractor extractor;

    public CategorisationService(ColisFeatureExtractor extractor) {
        this.extractor = extractor;
    }

    /**
     * Exécute le clustering sur le dataset mock et retourne le résultat complet.
     * Boucle k=3..5, calcule les métriques pour chaque k, retourne le meilleur.
     */
    public CategorisationResult runClustering() {
        long start = System.currentTimeMillis();

        // 1. Extraction features
        List<ColisFeatures> allFeatures = extractor.extractFromMockCsv();
        log.info("Clustering : {} colis chargés depuis CSV mock", allFeatures.size());

        double[][] rawMatrix = extractor.toMatrix(allFeatures);

        // 2. Standardisation
        ColisFeatureExtractor.StandardizationResult std = extractor.standardize(rawMatrix);
        double[][] matrix = std.standardized();

        // 3. K-Means pour k = 3..5
        int kMin = 3, kMax = 5;
        List<Integer> kTestes = new ArrayList<>();
        List<Double> inertieList = new ArrayList<>();
        List<Double> silhouetteList = new ArrayList<>();
        List<Double> daviesBouldinList = new ArrayList<>();

        int bestK = kMin;
        double bestSilhouette = -1;

        Map<Integer, int[]> labelsByK = new HashMap<>();
        Map<Integer, double[][]> centroidsByK = new HashMap<>();

        for (int k = kMin; k <= kMax; k++) {
            log.info("Clustering : test K-Means k={}", k);

            // Smile K-Means : fit retourne un modèle avec .y (labels) et .centroids
            smile.clustering.KMeans model = smile.clustering.KMeans.fit(matrix, k);
            int[] labels = model.y;
            double[][] centroids = model.centroids;

            // Métriques
            double inertie = ClusteringMetrics.inertie(matrix, labels, centroids);
            double sil = ClusteringMetrics.silhouette(matrix, labels, k);
            double db = ClusteringMetrics.daviesBouldin(matrix, labels, k, centroids);

            kTestes.add(k);
            inertieList.add(Math.round(inertie * 100.0) / 100.0);
            silhouetteList.add(Math.round(sil * 10000.0) / 10000.0);
            daviesBouldinList.add(Math.round(db * 100.0) / 100.0);

            labelsByK.put(k, labels);
            centroidsByK.put(k, centroids);

            log.info("  k={} → inertie={}, silhouette={}, Davies-Bouldin={}",
                    k, inertieList.get(inertieList.size()-1),
                    silhouetteList.get(silhouetteList.size()-1),
                    daviesBouldinList.get(daviesBouldinList.size()-1));

            if (sil > bestSilhouette) {
                bestSilhouette = sil;
                bestK = k;
            }
        }

        // 4. Résultat pour le meilleur k
        int[] bestLabels = labelsByK.get(bestK);
        double[][] bestCentroids = centroidsByK.get(bestK);

        // Centroïdes dénormalisés (retour aux unités métier)
        double[][] centroidesDenorm = denormalizeCentroids(bestCentroids, std.mean(), std.std());

        // Matrice confusion
        String[] categoriesDeclarees = allFeatures.stream()
                .map(ColisFeatures::getCategorieDeclaree)
                .toArray(String[]::new);
        int[][] confusion = ClusteringMetrics.confusionMatrix(bestLabels, categoriesDeclarees, bestK);
        double purete = ClusteringMetrics.purity(confusion);

        // Catégories uniques
        LinkedHashSet<String> cats = new LinkedHashSet<>(Arrays.asList(categoriesDeclarees));
        String[] categoriesUniques = cats.toArray(new String[0]);

        // Mapping colisId → cluster
        Map<String, Integer> affectations = new LinkedHashMap<>();
        for (int i = 0; i < allFeatures.size(); i++) {
            affectations.put(allFeatures.get(i).getColisId(), bestLabels[i]);
        }

        // Labels interprétables (basés sur les centroïdes)
        Map<Integer, String> clusterLabels = interpreteClusters(bestCentroids, categoriesUniques);

        long dureeMs = System.currentTimeMillis() - start;

        log.info("Clustering terminé : k={}, silhouette={}, purete={}, durée={}ms",
                bestK, bestSilhouette, purete, dureeMs);

        return CategorisationResult.builder()
                .nbColis(allFeatures.size())
                .kTestes(kTestes)
                .inertie(inertieList)
                .silhouette(silhouetteList)
                .daviesBouldin(daviesBouldinList)
                .meilleurK(bestK)
                .labels(bestLabels)
                .centroides(centroidesDenorm)
                .featureNames(ColisFeatures.FEATURE_NAMES)
                .clusterLabels(clusterLabels)
                .confusionMatrix(confusion)
                .categoriesUniques(categoriesUniques)
                .purete(purete)
                .affectations(affectations)
                .dureeCalculMs(dureeMs)
                .build();
    }

    /**
     * Dénormalise les centroïdes : (valeur_centroide × std[j]) + mean[j].
     */
    private double[][] denormalizeCentroids(double[][] normalizedCentroids, double[] mean, double[] std) {
        double[][] denorm = new double[normalizedCentroids.length][];
        for (int i = 0; i < normalizedCentroids.length; i++) {
            denorm[i] = new double[normalizedCentroids[i].length];
            for (int j = 0; j < normalizedCentroids[i].length; j++) {
                denorm[i][j] = normalizedCentroids[i][j] * std[j] + mean[j];
            }
        }
        return denorm;
    }

    /**
     * Interprète les centroïdes pour donner un nom lisible à chaque cluster.
     * Basé sur fragilité (>5 → fragile) et poids (>30 → lourd) et valeur.
     */
    private Map<Integer, String> interpreteClusters(double[][] centroids, String[] categories) {
        Map<Integer, String> labels = new LinkedHashMap<>();
        for (int i = 0; i < centroids.length; i++) {
            double[] c = centroids[i]; // [poids, volume, log1p(valeur), fragilité, délai]
            double fragilite = c[3];
            double poids = c[0];
            double logValeur = c[2];
            double valeur = Math.expm1(logValeur); // inverse de log1p

            String label;
            if (fragilite > 7 && valeur > 200000) {
                label = "Fragile-Valeur (classe A)";
            } else if (poids > 40) {
                label = "Standard robuste (classe C)";
            } else if (c[1] > 0.5) {
                label = "Volumineux moyen (classe B)";
            } else {
                label = "Polyvalent";
            }
            labels.put(i, label);
        }
        return labels;
    }
}
