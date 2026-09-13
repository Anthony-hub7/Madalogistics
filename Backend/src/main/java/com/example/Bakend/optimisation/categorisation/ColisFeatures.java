package com.example.Bakend.optimisation.categorisation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Données enrichies d'un colis pour le clustering non supervisé.
 * Les features numériques (poids, volume, fragilité, valeur, délai) sont lues
 * depuis la table colis + colonnes mock (fragilité, valeur, délai).
 * La catégorie déclarée est conservée pour la validation uniquement (jamais en input clustering).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ColisFeatures {

    private String colisId;

    // --- Features numériques (input clustering) ---
    private double poidsKg;
    private double volumeM3;
    private double fragilite010;
    private double valeurEstimeeAr;
    private double delaiExpress; // 0 ou 1

    // --- Métadonnées (hors clustering, validation uniquement) ---
    private String categorieDeclaree;
    private String designation;
    private String profilSource;

    /**
     * Retourne le vecteur de features brut (avant standardisation).
     * Ordre : [poids, volume, log1p(valeur), fragilité, délai].
     */
    public double[] toFeatureVector() {
        return new double[]{
            poidsKg,
            volumeM3,
            Math.log1p(valeurEstimeeAr),
            fragilite010,
            delaiExpress
        };
    }

    public static final String[] FEATURE_NAMES = {
        "poids_kg", "volume_m3", "log1p(valeur)", "fragilite", "delai_express"
    };
}
