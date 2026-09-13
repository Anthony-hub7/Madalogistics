package com.example.Bakend.optimisation.categorisation;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Extrait les features de clustering depuis le CSV mock ou la base de données.
 * Applique log1p() sur valeur_estimee_ar avant standardisation.
 *
 * Feature vector : [poids, volume, log1p(valeur), fragilité, délai]
 * Exclut : categorie_declaree, designation, profil_source (validation uniquement).
 */
@Component
public class ColisFeatureExtractor {

    private static final String CSV_PATH = "ml/colis_mock.csv";

    /**
     * Charge le CSV mock et retourne les features + métadonnées.
     */
    public List<ColisFeatures> extractFromMockCsv() {
        List<ColisFeatures> features = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(
                        new ClassPathResource(CSV_PATH).getInputStream(),
                        StandardCharsets.UTF_8))) {

            String header = reader.readLine(); // skip header
            String line;
            while ((line = reader.readLine()) != null) {
                String[] parts = line.split(",", -1);
                if (parts.length < 9) continue;

                ColisFeatures f = ColisFeatures.builder()
                        .colisId(parts[0].trim())
                        .poidsKg(Double.parseDouble(parts[1].trim()))
                        .volumeM3(Double.parseDouble(parts[2].trim()))
                        .fragilite010(Double.parseDouble(parts[3].trim()))
                        .valeurEstimeeAr(Double.parseDouble(parts[4].trim()))
                        .delaiExpress(Double.parseDouble(parts[5].trim()))
                        .categorieDeclaree(parts[6].trim())
                        .designation(parts[7].trim())
                        .profilSource(parts[8].trim())
                        .build();
                features.add(f);
            }
        } catch (Exception e) {
            throw new RuntimeException("Erreur lecture CSV mock: " + CSV_PATH, e);
        }
        return features;
    }

    /**
     * Convertit la liste de ColisFeatures en matrice double[][] pour Smile K-Means.
     * Ordre : [poids, volume, log1p(valeur), fragilité, délai].
     */
    public double[][] toMatrix(List<ColisFeatures> features) {
        double[][] matrix = new double[features.size()][];
        for (int i = 0; i < features.size(); i++) {
            matrix[i] = features.get(i).toFeatureVector();
        }
        return matrix;
    }

    /**
     * Standardisation manuelle : moyenne 0, variance 1 par colonne.
     * Retourne [matrice standardisée, moyennes[], écarts-types[]].
     */
    public StandardizationResult standardize(double[][] matrix) {
        int n = matrix.length;
        int d = matrix[0].length;

        double[] mean = new double[d];
        double[] std = new double[d];

        // Calcul des moyennes
        for (int j = 0; j < d; j++) {
            double sum = 0;
            for (int i = 0; i < n; i++) {
                sum += matrix[i][j];
            }
            mean[j] = sum / n;
        }

        // Calcul des écarts-types
        for (int j = 0; j < d; j++) {
            double sumSq = 0;
            for (int i = 0; i < n; i++) {
                double diff = matrix[i][j] - mean[j];
                sumSq += diff * diff;
            }
            std[j] = Math.sqrt(sumSq / n);
            if (std[j] == 0) std[j] = 1; // éviter division par zéro
        }

        // Application de la standardisation
        double[][] standardized = new double[n][d];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < d; j++) {
                standardized[i][j] = (matrix[i][j] - mean[j]) / std[j];
            }
        }

        return new StandardizationResult(standardized, mean, std);
    }

    /**
     * Résultat de la standardisation, pour pouvoir appliquer les mêmes
     // paramètres sur de nouvelles données (inference).
     */
    public record StandardizationResult(double[][] standardized, double[] mean, double[] std) {}
}
