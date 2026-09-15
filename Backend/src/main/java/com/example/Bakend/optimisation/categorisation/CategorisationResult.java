package com.example.Bakend.optimisation.categorisation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Resultat complet d'un run de clustering non supervise (V12 dynamique).
 * Stocke dans optimisation_run.resultat (JSONB) pour tracabilite et audit.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategorisationResult {

    /** Nombre de colis analyses */
    private int nbColis;

    /** k testes (ex. [3, 4, 5]) */
    private List<Integer> kTestes;

    /** Inertie (WCSS) par k teste — pour elbow */
    private List<Double> inertie;

    /** Score silhouette moyen par k teste */
    private List<Double> silhouette;

    /** Indice Davies-Bouldin par k teste */
    private List<Double> daviesBouldin;

    /** k retenu comme meilleur */
    private int meilleurK;

    /** Labels cluster assigns (taille = nbColis) */
    private int[] labels;

    /** Centroides denormalises [k][features] (en unites metier : kg, m3, Ar, fragilite, delai) */
    private double[][] centroides;

    /** Noms des features pour interpretabilite */
    private String[] featureNames;

    /** V12 : Mapping cluster → categorie via distance euclidienne vs seuils_ml */
    private Map<Integer, CategorisationService.ClusterMatch> clusterMapping;

    /** Matrice confusion [k][nbCategories] : cluster x categorie declaree (validation CSV mock) */
    private int[][] confusionMatrix;

    /** Categories uniques utilisees dans la confusion */
    private String[] categoriesUniques;

    /** Purete globale (proportion du label majoritaire par cluster) */
    private double purete;

    /** Mapping colisId → cluster label (pour l'application metier) */
    private Map<String, Integer> affectations;

    /** Duree totale du calcul en ms */
    private long dureeCalculMs;

    /** V12 : Version du referentiel utilise pour ce run */
    private int referentielVersion;

    /** V12 : Nombre de categories actives ML-activables */
    private int nbCategoriesRef;
}
