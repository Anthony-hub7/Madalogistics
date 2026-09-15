package com.example.Bakend.optimisation.categorisation;

import com.example.Bakend.dto.direction.SeuilsMl;
import com.example.Bakend.entity.CategorieProduit;
import com.example.Bakend.entity.PMECliente;
import com.example.Bakend.repository.CategorieProduitRepository;
import com.example.Bakend.repository.PMEClienteRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Service de categorisation non supervisee des colis par clustering (V12 dynamique).
 *
 * Pipeline V12 :
 * 1. Lecture du referentiel categories actives + ML-activables du tenant
 * 2. Extraction features depuis colis_features (BDD tenant)
 * 3. log1p(valeur) + standardisation
 * 4. K-Means avec k = f(nb_categories_actives)
 * 5. Matching centroide vs seuils_ml (distance euclidienne normalisee)
 * 6. Resultat trace dans optimisation_run (type CLUSTERING) + referentiel_version
 *
 * Plus aucun hard-code A/B/C/D — tout est lu depuis categorie_produit.
 */
@Service
public class CategorisationService {

    private static final Logger log = LoggerFactory.getLogger(CategorisationService.class);
    private static final int K_PLAFOND = 8;

    private final ColisFeatureExtractor extractor;
    private final CategorieProduitRepository categorieProduitRepository;
    private final PMEClienteRepository pmeClienteRepository;

    public CategorisationService(ColisFeatureExtractor extractor,
                                 CategorieProduitRepository categorieProduitRepository,
                                 PMEClienteRepository pmeClienteRepository) {
        this.extractor = extractor;
        this.categorieProduitRepository = categorieProduitRepository;
        this.pmeClienteRepository = pmeClienteRepository;
    }

    @SuppressWarnings("unused")
    CategorisationService() {
        this.extractor = null;
        this.categorieProduitRepository = null;
        this.pmeClienteRepository = null;
    }

    CategorisationService(ColisFeatureExtractor extractor) {
        this.extractor = extractor;
        this.categorieProduitRepository = null;
        this.pmeClienteRepository = null;
    }

    public CategorisationResult runClustering(UUID tenantId) {
        long start = System.currentTimeMillis();

        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new RuntimeException("Tenant introuvable: " + tenantId));

        List<CategorieProduit> categoriesActives = categorieProduitRepository
                .findActivesMlActivables(tenantId);

        int n = categoriesActives.size();
        if (n < 2) {
            throw new RuntimeException(
                    "Au moins 2 categories actives ML-activables requises (actuellement: " + n + ")");
        }

        int nbColisMin = tenant.getSeuilMlMinColis() != null ? tenant.getSeuilMlMinColis() : 30;

        List<ColisFeatures> allFeatures = extractor.extractFromDb(tenantId);
        log.info("Clustering tenant {}: {} colis, {} categories", tenantId, allFeatures.size(), n);

        if (allFeatures.size() < nbColisMin) {
            throw new RuntimeException(
                    "Pas assez de colis (minimum: " + nbColisMin + ", actuellement: " + allFeatures.size() + ")");
        }

        return runClusteringInternal(allFeatures, categoriesActives, start,
                tenant.getReferentielVersion(), tenantId);
    }

    CategorisationResult runClustering() {
        long start = System.currentTimeMillis();
        List<ColisFeatures> allFeatures = extractor.extractFromMockCsv();
        return runClusteringInternal(allFeatures, null, start, 1, null);
    }

    private CategorisationResult runClusteringInternal(
            List<ColisFeatures> allFeatures,
            List<CategorieProduit> categoriesActives,
            long start,
            int referentielVersion,
            UUID tenantId) {

        double[][] rawMatrix = extractor.toMatrix(allFeatures);
        if (rawMatrix.length == 0 || rawMatrix[0].length == 0) {
            throw new RuntimeException("Aucune feature extraite pour le clustering");
        }

        ColisFeatureExtractor.StandardizationResult std = extractor.standardize(rawMatrix);
        double[][] matrix = std.standardized();

        int n = categoriesActives != null ? categoriesActives.size() : 3;
        int kMin = n;
        int kMax = Math.min(n + 2, K_PLAFOND);

        List<Integer> kTestes = new ArrayList<>();
        List<Double> inertieList = new ArrayList<>();
        List<Double> silhouetteList = new ArrayList<>();
        List<Double> daviesBouldinList = new ArrayList<>();

        int bestK = kMin;
        double bestSilhouette = -1;

        Map<Integer, int[]> labelsByK = new HashMap<>();
        Map<Integer, double[][]> centroidsByK = new HashMap<>();

        for (int k = kMin; k <= kMax; k++) {
            smile.clustering.KMeans model = smile.clustering.KMeans.fit(matrix, k);
            int[] labels = model.y;
            double[][] centroids = model.centroids;

            double inertie = ClusteringMetrics.inertie(matrix, labels, centroids);
            double sil = ClusteringMetrics.silhouette(matrix, labels, k);
            double db = ClusteringMetrics.daviesBouldin(matrix, labels, k, centroids);

            kTestes.add(k);
            inertieList.add(Math.round(inertie * 100.0) / 100.0);
            silhouetteList.add(Math.round(sil * 10000.0) / 10000.0);
            daviesBouldinList.add(Math.round(db * 100.0) / 100.0);

            labelsByK.put(k, labels);
            centroidsByK.put(k, centroids);

            if (sil > bestSilhouette) {
                bestSilhouette = sil;
                bestK = k;
            }
        }

        int[] bestLabels = labelsByK.get(bestK);
        double[][] bestCentroids = centroidsByK.get(bestK);
        double[][] centroidesDenorm = denormalizeCentroids(bestCentroids, std.mean(), std.std());

        Map<Integer, ClusterMatch> clusterMapping = new LinkedHashMap<>();
        if (categoriesActives != null) {
            clusterMapping = matchCentroidesVsSeuilsMl(centroidesDenorm, categoriesActives, std);
        }

        String[] categoriesDeclarees = allFeatures.stream()
                .map(ColisFeatures::getCategorieDeclaree)
                .toArray(String[]::new);
        int[][] confusion = ClusteringMetrics.confusionMatrix(bestLabels, categoriesDeclarees, bestK);
        double purete = ClusteringMetrics.purity(confusion);

        LinkedHashSet<String> cats = new LinkedHashSet<>(Arrays.asList(categoriesDeclarees));
        String[] categoriesUniques = cats.toArray(new String[0]);

        Map<String, Integer> affectations = new LinkedHashMap<>();
        for (int i = 0; i < allFeatures.size(); i++) {
            affectations.put(allFeatures.get(i).getColisId(), bestLabels[i]);
        }

        long dureeMs = System.currentTimeMillis() - start;

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
                .clusterMapping(clusterMapping)
                .confusionMatrix(confusion)
                .categoriesUniques(categoriesUniques)
                .purete(purete)
                .affectations(affectations)
                .dureeCalculMs(dureeMs)
                .referentielVersion(referentielVersion)
                .nbCategoriesRef(n)
                .build();
    }

    private Map<Integer, ClusterMatch> matchCentroidesVsSeuilsMl(
            double[][] centroides, List<CategorieProduit> categories,
            ColisFeatureExtractor.StandardizationResult std) {

        Map<Integer, ClusterMatch> mapping = new LinkedHashMap<>();
        double[] mean = std.mean();
        double[] stdDev = std.std();

        for (int i = 0; i < centroides.length; i++) {
            double[] c = centroides[i];

            CategorieProduit bestCat = null;
            double bestDist = Double.MAX_VALUE;
            Map<String, Double> distances = new LinkedHashMap<>();

            for (CategorieProduit cat : categories) {
                SeuilsMl seuils = SeuilsMl.fromJson(cat.getSeuilsMl());
                if (seuils == null) continue;

                double[] center = new double[5];
                center[0] = midpoint(seuils.getPoidsMin(), seuils.getPoidsMax());
                center[1] = midpoint(seuils.getVolumeMin(), seuils.getVolumeMax());
                center[2] = midpointLog(seuils.getValeurMin(), seuils.getValeurMax());
                center[3] = midpoint(seuils.getFragiliteMin() != null ? (double) seuils.getFragiliteMin() : null,
                                     seuils.getFragiliteMax() != null ? (double) seuils.getFragiliteMax() : null);
                center[4] = midpoint(seuils.getDelaiMaxH() != null ? 0.0 : null,
                                     seuils.getDelaiMaxH() != null ? 1.0 : null);

                double dist = euclideanDistNormalized(c, center, mean, stdDev);
                distances.put(cat.getClasseCode(), Math.round(dist * 10000.0) / 10000.0);

                if (dist < bestDist) {
                    bestDist = dist;
                    bestCat = cat;
                }
            }

            mapping.put(i, new ClusterMatch(
                    bestCat != null ? bestCat.getCategorieId() : null,
                    bestCat != null ? bestCat.getClasseCode() : "UNKNOWN",
                    bestCat != null ? bestCat.getLibelle() : "Inconnu",
                    Math.round(bestDist * 10000.0) / 10000.0,
                    distances
            ));
        }

        return mapping;
    }

    private double midpoint(Double min, Double max) {
        if (min != null && max != null) return (min + max) / 2.0;
        if (min != null) return min + 10;
        if (max != null) return max - 10;
        return 0;
    }

    private double midpointLog(Double min, Double max) {
        if (min != null && max != null) return Math.log1p((min + max) / 2.0);
        if (min != null) return Math.log1p(min);
        if (max != null) return Math.log1p(max);
        return 0;
    }

    private double euclideanDistNormalized(double[] a, double[] b, double[] mean, double[] std) {
        double sum = 0;
        for (int j = 0; j < a.length; j++) {
            double na = (a[j] - mean[j]) / std[j];
            double nb = (b[j] - mean[j]) / std[j];
            sum += (na - nb) * (na - nb);
        }
        return Math.sqrt(sum);
    }

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

    public record ClusterMatch(
            UUID categorieId,
            String classeCode,
            String libelle,
            double distance,
            Map<String, Double> distancesToutes
    ) {}
}
