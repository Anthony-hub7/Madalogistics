package com.example.Bakend.optimisation.categorisation;

import com.example.Bakend.entity.ColisFeature;
import com.example.Bakend.repository.ColisFeatureRepository;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Extraction des features de clustering depuis la BDD (V12) ou le CSV mock (dev/test).
 *
 * V12 : extractFromDb(tenantId) lit colis_features (table dediee).
 * Le CSV mock est garde pour les tests unitaires uniquement.
 *
 * Feature vector : [poids, volume, log1p(valeur), fragilite, delai]
 */
@Component
public class ColisFeatureExtractor {

    private static final String CSV_PATH = "ml/colis_mock.csv";

    private final ColisFeatureRepository colisFeatureRepository;

    public ColisFeatureExtractor(ColisFeatureRepository colisFeatureRepository) {
        this.colisFeatureRepository = colisFeatureRepository;
    }

    /**
     * Constructeur pour tests unitaires (pas d'acces BDD).
     */
    ColisFeatureExtractor() {
        this.colisFeatureRepository = null;
    }

    /**
     * V12 : extraction depuis colis_features (BDD).
     * Jointure colis + colis_features pour recuperer poids/volume + fragilite/valeur/delai.
     */
    public List<ColisFeatures> extractFromDb(UUID tenantId) {
        List<ColisFeature> dbFeatures = colisFeatureRepository.findFeaturesForClustering(tenantId);
        List<ColisFeatures> features = new ArrayList<>();

        for (ColisFeature cf : dbFeatures) {
            features.add(ColisFeatures.builder()
                    .colisId(cf.getColis().getColisId().toString())
                    .poidsKg(cf.getColis().getPoidsKg().doubleValue())
                    .volumeM3(cf.getColis().getVolumeM3().doubleValue())
                    .fragilite010(cf.getFragilite010() != null ? cf.getFragilite010() : 0)
                    .valeurEstimeeAr(cf.getValeurEstimeeAr() != null
                            ? cf.getValeurEstimeeAr().doubleValue() : 0.0)
                    .delaiExpress(cf.getDelaiExpress() ? 1.0 : 0.0)
                    .categorieDeclaree(cf.getCategoriePredite() != null
                            ? cf.getCategoriePredite().getClasseCode() : "")
                    .build());
        }
        return features;
    }

    /**
     * Extraction depuis le CSV mock (dev/test uniquement).
     * Garde pour retrocompatibilite des tests existants.
     */
    public List<ColisFeatures> extractFromMockCsv() {
        List<ColisFeatures> features = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(
                        new ClassPathResource(CSV_PATH).getInputStream(),
                        StandardCharsets.UTF_8))) {

            String header = reader.readLine();
            String line;
            while ((line = reader.readLine()) != null) {
                String[] parts = line.split(",", -1);
                if (parts.length < 9) continue;

                features.add(ColisFeatures.builder()
                        .colisId(parts[0].trim())
                        .poidsKg(Double.parseDouble(parts[1].trim()))
                        .volumeM3(Double.parseDouble(parts[2].trim()))
                        .fragilite010(Double.parseDouble(parts[3].trim()))
                        .valeurEstimeeAr(Double.parseDouble(parts[4].trim()))
                        .delaiExpress(Double.parseDouble(parts[5].trim()))
                        .categorieDeclaree(parts[6].trim())
                        .designation(parts[7].trim())
                        .profilSource(parts[8].trim())
                        .build());
            }
        } catch (Exception e) {
            throw new RuntimeException("Erreur lecture CSV mock: " + CSV_PATH, e);
        }
        return features;
    }

    /**
     * Convertit la liste de ColisFeatures en matrice double[][] pour Smile K-Means.
     * Ordre : [poids, volume, log1p(valeur), fragilite, delai].
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
     */
    public StandardizationResult standardize(double[][] matrix) {
        int n = matrix.length;
        int d = matrix[0].length;

        double[] mean = new double[d];
        double[] std = new double[d];

        for (int j = 0; j < d; j++) {
            double sum = 0;
            for (int i = 0; i < n; i++) sum += matrix[i][j];
            mean[j] = sum / n;
        }

        for (int j = 0; j < d; j++) {
            double sumSq = 0;
            for (int i = 0; i < n; i++) {
                double diff = matrix[i][j] - mean[j];
                sumSq += diff * diff;
            }
            std[j] = Math.sqrt(sumSq / n);
            if (std[j] == 0) std[j] = 1;
        }

        double[][] standardized = new double[n][d];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < d; j++) {
                standardized[i][j] = (matrix[i][j] - mean[j]) / std[j];
            }
        }

        return new StandardizationResult(standardized, mean, std);
    }

    public record StandardizationResult(double[][] standardized, double[] mean, double[] std) {}
}
