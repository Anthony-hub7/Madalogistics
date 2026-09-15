package com.example.Bakend.optimisation.categorisation;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests unitaires pour ColisFeatureExtractor.
 * Vérifie parsing CSV, feature vector et standardisation.
 */
class ColisFeatureExtractorTest {

    private final ColisFeatureExtractor extractor = new ColisFeatureExtractor();

    @Test
    void extractFromMockCsvLoadsAllLines() {
        List<ColisFeatures> features = extractor.extractFromMockCsv();
        assertNotNull(features);
        assertFalse(features.isEmpty(), "Le CSV mock doit contenir des lignes");
        assertEquals(500, features.size(), "colis_mock.csv doit contenir 500 colis");
    }

    @Test
    void extractFirstColisHasExpectedValues() {
        List<ColisFeatures> features = extractor.extractFromMockCsv();
        ColisFeatures first = features.get(0);
        assertEquals("COL-0001", first.getColisId());
        assertEquals(21.48, first.getPoidsKg(), 0.01);
        assertEquals(0.591, first.getVolumeM3(), 0.001);
        assertEquals(5, first.getFragilite010(), 0.01);
        assertEquals(235000, first.getValeurEstimeeAr(), 1);
        assertEquals(0, first.getDelaiExpress(), 0.01);
        assertEquals("Standard", first.getCategorieDeclaree());
    }

    @Test
    void toFeatureVectorAppliesLog1pToValue() {
        ColisFeatures f = ColisFeatures.builder()
                .poidsKg(10.0)
                .volumeM3(0.5)
                .valeurEstimeeAr(100000)
                .fragilite010(3.0)
                .delaiExpress(1.0)
                .build();
        double[] vec = f.toFeatureVector();
        assertEquals(10.0, vec[0], 0.001);   // poids
        assertEquals(0.5, vec[1], 0.001);    // volume
        assertEquals(Math.log1p(100000), vec[2], 0.001); // log1p(valeur)
        assertEquals(3.0, vec[3], 0.001);    // fragilité
        assertEquals(1.0, vec[4], 0.001);    // délai
    }

    @Test
    void toMatrixMatchesFeatureCount() {
        List<ColisFeatures> features = extractor.extractFromMockCsv();
        double[][] matrix = extractor.toMatrix(features);
        assertEquals(500, matrix.length);
        assertEquals(5, matrix[0].length, "5 features : poids, volume, log1p(valeur), fragilité, délai");
    }

    @Test
    void standardizeCentersToZeroMeanUnitVariance() {
        double[][] raw = {{1, 10}, {3, 20}, {5, 30}};
        ColisFeatureExtractor.StandardizationResult std = extractor.standardize(raw);
        double[][] s = std.standardized();
        // Vérifier moyenne ≈ 0 pour chaque colonne
        double mean0 = (s[0][0] + s[1][0] + s[2][0]) / 3;
        double mean1 = (s[0][1] + s[1][1] + s[2][1]) / 3;
        assertEquals(0, mean0, 0.001, "Colonne 0 centrée à 0");
        assertEquals(0, mean1, 0.001, "Colonne 1 centrée à 0");
    }

    @Test
    void standardizePreservesShape() {
        double[][] raw = {{1, 2, 3}, {4, 5, 6}};
        ColisFeatureExtractor.StandardizationResult std = extractor.standardize(raw);
        assertEquals(2, std.standardized().length);
        assertEquals(3, std.standardized()[0].length);
        assertNotNull(std.mean());
        assertNotNull(std.std());
        assertEquals(3, std.mean().length);
    }

    @Test
    void standardizeHandlesConstantColumn() {
        // Une colonne constante -> std=1 pour éviter division par zéro
        double[][] raw = {{5, 1}, {5, 2}, {5, 3}};
        ColisFeatureExtractor.StandardizationResult std = extractor.standardize(raw);
        // Colonne 0 = constante -> std[0] = 1 (pas 0)
        assertEquals(1.0, std.std()[0], 0.001);
        // Valeurs standardisées = 0 (car x = mean)
        assertEquals(0, std.standardized()[0][0], 0.001);
    }

    @Test
    void featureNamesArrayMatches() {
        assertArrayEquals(
                new String[]{"poids_kg", "volume_m3", "log1p(valeur)", "fragilite", "delai_express"},
                ColisFeatures.FEATURE_NAMES
        );
    }
}
