package com.example.Bakend.optimisation.categorisation;

import java.util.List;

/**
 * Métriques d'évaluation pour le clustering non supervisé.
 * Calculées sur données standardisées.
 *
 * - Silhouette moyenne : [-1, 1], plus haut = mieux (cohesion intra > séparation inter)
 * - Davies-Bouldin : [0, +inf), plus bas = mieux (clusters bien séparés)
 * - Inertie (WCSS) : somme des distances² aux centroïdes, sert pour le elbow
 */
public final class ClusteringMetrics {

    private ClusteringMetrics() {}

    /**
     * Score de silhouette moyen sur l'ensemble des points.
     * Pour chaque point i :
     *   a(i) = distance moyenne de i aux autres points du même cluster
     *   b(i) = distance minimale des distances moyennes de i aux clusters voisins
     *   s(i) = (b(i) - a(i)) / max(a(i), b(i))
     * Silhouette = moyenne de s(i) sur tous les points.
     *
     * @param matrix   matrice standardisée [n][d]
     * @param labels   labels de cluster pour chaque point
     * @param k        nombre de clusters
     * @return score moyen [-1, 1]
     */
    public static double silhouette(double[][] matrix, int[] labels, int k) {
        int n = matrix.length;
        if (n <= 1 || k <= 1) return 0;

        double totalSilhouette = 0;

        for (int i = 0; i < n; i++) {
            int ci = labels[i];

            // a(i) : distance moyenne aux autres points du même cluster
            double ai = 0;
            int countSame = 0;
            for (int j = 0; j < n; j++) {
                if (j != i && labels[j] == ci) {
                    ai += euclidean(matrix[i], matrix[j]);
                    countSame++;
                }
            }
            if (countSame > 0) ai /= countSame;

            // b(i) : distance moyenne minimale aux clusters voisins
            double bi = Double.MAX_VALUE;
            for (int c = 0; c < k; c++) {
                if (c == ci) continue;
                double distSum = 0;
                int countOther = 0;
                for (int j = 0; j < n; j++) {
                    if (labels[j] == c) {
                        distSum += euclidean(matrix[i], matrix[j]);
                        countOther++;
                    }
                }
                if (countOther > 0) {
                    double distMean = distSum / countOther;
                    if (distMean < bi) bi = distMean;
                }
            }

            double si = (bi > ai) ? (bi - ai) / Math.max(bi, ai) : 0;
            totalSilhouette += si;
        }

        return totalSilhouette / n;
    }

    /**
     * Indice de Davies-Bouldin : ratio moyen de la dispersion intra-cluster
     * sur la séparation inter-clusters. Plus bas = mieux.
     *
     * @param matrix    matrice standardisée
     * @param labels    labels de cluster
     * @param k         nombre de clusters
     * @param centroids centroïdes [k][d] (après standardisation)
     * @return indice DB (>= 0)
     */
    public static double daviesBouldin(double[][] matrix, int[] labels, int k, double[][] centroids) {
        int n = matrix.length;

        // Dispersion moyenne intra-cluster (distance moyenne au centroïde)
        double[] S = new double[k];
        int[] count = new int[k];
        for (int i = 0; i < n; i++) {
            int c = labels[i];
            S[c] += euclidean(matrix[i], centroids[c]);
            count[c]++;
        }
        for (int c = 0; c < k; c++) {
            if (count[c] > 0) S[c] /= count[c];
        }

        // Distance inter-centroïdes
        double db = 0;
        for (int i = 0; i < k; i++) {
            double maxR = 0;
            for (int j = 0; j < k; j++) {
                if (i == j) continue;
                double Mij = (S[i] + S[j]) / euclidean(centroids[i], centroids[j]);
                if (Mij > maxR) maxR = Mij;
            }
            db += maxR;
        }

        return db / k;
    }

    /**
     * Inertie (WCSS) : somme des distances euclidiennes au carré aux centroïdes.
     * Utilisée pour le elbow plot.
     */
    public static double inertie(double[][] matrix, int[] labels, double[][] centroids) {
        double sum = 0;
        for (int i = 0; i < matrix.length; i++) {
            double d = euclidean(matrix[i], centroids[labels[i]]);
            sum += d * d;
        }
        return sum;
    }

    /**
     * Matrice de confusion cluster × catégorie déclarée.
     * Pour valider la correspondance sémantique des clusters.
     */
    public static int[][] confusionMatrix(int[] labels, String[] categoriesDeclarees, int k) {
        // Découvrir les catégories uniques
        java.util.Map<String, Integer> catIndex = new java.util.LinkedHashMap<>();
        for (String c : categoriesDeclarees) {
            catIndex.putIfAbsent(c, catIndex.size());
        }
        int nbCat = catIndex.size();
        int[][] matrix = new int[k][nbCat];
        for (int i = 0; i < labels.length; i++) {
            int col = catIndex.getOrDefault(categoriesDeclarees[i], -1);
            if (col >= 0) {
                matrix[labels[i]][col]++;
            }
        }
        return matrix;
    }

    /**
     * Pureté d'un cluster : proportion du label majoritaire dans le cluster.
     * Moyenne pondérée sur tous les clusters = pureté globale.
     */
    public static double purity(int[][] confusionMatrix) {
        int total = 0;
        int maxSum = 0;
        for (int[] row : confusionMatrix) {
            int rowMax = 0;
            int rowSum = 0;
            for (int val : row) {
                rowMax = Math.max(rowMax, val);
                rowSum += val;
            }
            maxSum += rowMax;
            total += rowSum;
        }
        return total > 0 ? (double) maxSum / total : 0;
    }

    private static double euclidean(double[] a, double[] b) {
        double sum = 0;
        for (int i = 0; i < a.length; i++) {
            double d = a[i] - b[i];
            sum += d * d;
        }
        return Math.sqrt(sum);
    }
}
