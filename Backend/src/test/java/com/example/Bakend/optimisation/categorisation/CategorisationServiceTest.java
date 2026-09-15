package com.example.Bakend.optimisation.categorisation;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests unitaires pour CategorisationService.
 * Vérifie le pipeline complet : extraction -> standardisation -> K-Means -> interprétation.
 */
class CategorisationServiceTest {

    private final CategorisationService service = new CategorisationService(new ColisFeatureExtractor());

    @Test
    void runClusteringReturnsValidResult() {
        CategorisationResult result = service.runClustering();

        assertNotNull(result);
        assertEquals(500, result.getNbColis(), "500 colis depuis CSV mock");
        assertTrue(result.getKTestes().size() >= 2, "Au moins 2 k testés");
        assertEquals(result.getKTestes().size(), result.getInertie().size());
        assertEquals(result.getKTestes().size(), result.getSilhouette().size());
        assertEquals(result.getKTestes().size(), result.getDaviesBouldin().size());
    }

    @Test
    void meilleurKBetween3And5() {
        CategorisationResult result = service.runClustering();
        int k = result.getMeilleurK();
        assertTrue(k >= 3 && k <= 5, "meilleurK doit être entre 3 et 5, got " + k);
    }

    @Test
    void labelsLengthMatchesNbColis() {
        CategorisationResult result = service.runClustering();
        assertEquals(result.getNbColis(), result.getLabels().length,
                "Un label par colis");
    }

    @Test
    void labelsAreValidClusterIndices() {
        CategorisationResult result = service.runClustering();
        for (int label : result.getLabels()) {
            assertTrue(label >= 0 && label < result.getMeilleurK(),
                    "Label " + label + " hors range [0, k=" + result.getMeilleurK() + "]");
        }
    }

    @Test
    void centroidesHaveCorrectDimensions() {
        CategorisationResult result = service.runClustering();
        assertEquals(result.getMeilleurK(), result.getCentroides().length,
                "Un centroïde par cluster");
        assertEquals(5, result.getCentroides()[0].length,
                "5 features par centroïde");
    }

    @Test
    void centroidesDenormalizedArePlausible() {
        CategorisationResult result = service.runClustering();
        for (double[] c : result.getCentroides()) {
            assertTrue(c[0] >= 0, "poids >= 0 (kg)");
            assertTrue(c[1] >= 0, "volume >= 0 (m3)");
            assertTrue(c[3] >= 0 && c[3] <= 10, "fragilité ∈ [0,10]");
            assertTrue(c[4] >= 0 && c[4] <= 1, "délai ∈ [0,1]");
        }
    }

    @Test
    void confusionMatrixDimensions() {
        CategorisationResult result = service.runClustering();
        int[][] cm = result.getConfusionMatrix();
        assertNotNull(cm);
        assertEquals(result.getMeilleurK(), cm.length, "k lignes");
        assertTrue(cm[0].length >= 1, "Au moins 1 catégorie déclarée");
    }

    @Test
    void purityBetween0And1() {
        CategorisationResult result = service.runClustering();
        assertTrue(result.getPurete() >= 0 && result.getPurete() <= 1,
                "pureté ∈ [0,1], got " + result.getPurete());
    }

    @Test
    void affectationsMapComplete() {
        CategorisationResult result = service.runClustering();
        Map<String, Integer> aff = result.getAffectations();
        assertNotNull(aff);
        assertEquals(500, aff.size(), "500 colis affectés");
        // Vérifier quelques IDs connus
        assertTrue(aff.containsKey("COL-0001"));
        assertTrue(aff.containsKey("COL-0500"));
        for (Integer cluster : aff.values()) {
            assertTrue(cluster >= 0 && cluster < result.getMeilleurK());
        }
    }

    @Test
    void interpreteClustersProducesLabels() {
        CategorisationResult result = service.runClustering();
        Map<Integer, CategorisationService.ClusterMatch> mapping = result.getClusterMapping();
        assertNotNull(mapping);
        assertTrue(result.getMeilleurK() >= 3 && result.getMeilleurK() <= 5,
                "meilleurK entre 3 et 5, got " + result.getMeilleurK());
    }

    @Test
    void dureeCalculMsPositive() {
        CategorisationResult result = service.runClustering();
        assertTrue(result.getDureeCalculMs() > 0, "Calcul takes some time");
    }

    @Test
    void silhouetteScoresInRange() {
        CategorisationResult result = service.runClustering();
        for (Double sil : result.getSilhouette()) {
            assertTrue(sil >= -1 && sil <= 1,
                    "Silhouette ∈ [-1,1], got " + sil);
        }
    }
}
