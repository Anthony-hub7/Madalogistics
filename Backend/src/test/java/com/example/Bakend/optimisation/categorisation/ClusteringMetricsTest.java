package com.example.Bakend.optimisation.categorisation;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests unitaires pour ClusteringMetrics.
 * Pas de dépendance Spring/Docker — calculs purs sur données jouet.
 */
class ClusteringMetricsTest {

    private static final double EPSILON = 0.001;

    @Test
    void silhouettePerfectSeparation() {
        // Deux clusters bien séparés
        double[][] matrix = {
            {0, 0}, {1, 0}, {2, 0},   // cluster 0
            {10, 0}, {11, 0}, {12, 0}  // cluster 1
        };
        int[] labels = {0, 0, 0, 1, 1, 1};
        double sil = ClusteringMetrics.silhouette(matrix, labels, 2);
        assertTrue(sil > 0.5, "Silhouette devrait être élevée pour clusters bien séparés, got " + sil);
        assertTrue(sil <= 1.0, "Silhouette <= 1.0");
    }

    @Test
    void silhouetteSingleCluster() {
        double[][] matrix = {{0}, {1}, {2}};
        int[] labels = {0, 0, 0};
        assertEquals(0, ClusteringMetrics.silhouette(matrix, labels, 1));
    }

    @Test
    void silhouetteEmptyOrSinglePoint() {
        assertEquals(0, ClusteringMetrics.silhouette(new double[][]{{}}, new int[]{}, 0));
        assertEquals(0, ClusteringMetrics.silhouette(new double[][]{{5}}, new int[]{0}, 1));
    }

    @Test
    void daviesBouldinGoodSeparation() {
        double[][] matrix = {
            {0, 0}, {1, 0}, {2, 0},
            {10, 0}, {11, 0}, {12, 0}
        };
        int[] labels = {0, 0, 0, 1, 1, 1};
        double[][] centroids = {{1, 0}, {11, 0}};
        double db = ClusteringMetrics.daviesBouldin(matrix, labels, 2, centroids);
        assertTrue(db >= 0, "Davies-Bouldin >= 0");
        assertTrue(db < 1.0, "DB devrait être faible pour clusters séparés, got " + db);
    }

    @Test
    void inertieBasic() {
        double[][] matrix = {{0}, {2}};
        double[][] centroids = {{1}};
        int[] labels = {0, 0};
        double inertie = ClusteringMetrics.inertie(matrix, labels, centroids);
        // (0-1)^2 + (2-1)^2 = 2.0
        assertEquals(2.0, inertie, EPSILON);
    }

    @Test
    void confusionMatrixMatchesLabels() {
        int[] labels = {0, 0, 1, 1, 2};
        String[] cats = {"A", "A", "B", "B", "C"};
        int[][] cm = ClusteringMetrics.confusionMatrix(labels, cats, 3);
        assertEquals(2, cm[0][0]); // cluster 0 -> A
        assertEquals(2, cm[1][1]); // cluster 1 -> B
        assertEquals(1, cm[2][2]); // cluster 2 -> C
        assertEquals(0, cm[0][1]); // cluster 0 pas de B
    }

    @Test
    void purityPerfect() {
        int[][] cm = {{10, 0}, {0, 5}};
        assertEquals(1.0, ClusteringMetrics.purity(cm), EPSILON);
    }

    @Test
    void purityMixed() {
        int[][] cm = {{8, 2}, {1, 9}}; // 8/10 + 9/10 = 17/20
        assertEquals(0.85, ClusteringMetrics.purity(cm), EPSILON);
    }

    @Test
    void purityEmptyMatrix() {
        assertEquals(0, ClusteringMetrics.purity(new int[][]{}));
    }
}
