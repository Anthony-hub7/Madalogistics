package com.example.Bakend.optimisation.categorisation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Résultat complet d'un run de clustering non supervisé.
 * Stocké dans optimisation_run.resultat (JSONB) pour traçabilité et audit.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategorisationResult {

    /** Nombre de colis analysés */
    private int nbColis;

    /** k testés (ex. [3, 4, 5]) */
    private List<Integer> kTestes;

    /** Inertie (WCSS) par k testé — pour elbow */
    private List<Double> inertie;

    /** Score silhouette moyen par k testé */
    private List<Double> silhouette;

    /** Indice Davies-Bouldin par k testé */
    private List<Double> daviesBouldin;

    /** k retenu comme meilleur */
    private int meilleurK;

    /** Labels cluster assignés (taille = nbColis) */
    private int[] labels;

    /** Centroïdes dénormalisés [k][features] (en unités métier : kg, m³, Ar, fragilité, délai) */
    private double[][] centroides;

    /** Noms des features pour interprétabilité */
    private String[] featureNames;

    /** Mapping cluster → nom interprétable (ex. 0 → "Fragile-Valeur", 1 → "Standard robuste") */
    private Map<Integer, String> clusterLabels;

    /** Matrice confusion [k][nbCategories] : cluster × catégorie déclarée (validation) */
    private int[][] confusionMatrix;

    /** Catégories uniques utilisées dans la confusion */
    private String[] categoriesUniques;

    /** Pureté globale (proportion du label majoritaire par cluster) */
    private double purete;

    /** Mapping colisId → cluster label (pour l'application métier) */
    private Map<String, Integer> affectations;

    /** Durée totale du calcul en ms */
    private long dureeCalculMs;
}
