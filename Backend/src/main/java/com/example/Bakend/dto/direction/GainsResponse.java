package com.example.Bakend.dto.direction;

import java.util.UUID;

/**
 * Reponse du dashboard « Gains de l'optimisation » (Direction).
 * Compare le scenario baseline (non optimise) au scenario MadaLogistiX (optimise),
 * selon les formules du README (cf. « Note technique — Calcul des gains »).
 *
 * @param perimetre   perimetre du calcul (hub, volumes de donnees, ignores)
 * @param baseline    scenario de reference : aller-retour individuel, distance vol d'oiseau
 * @param optimise     scenario optimise : somme des tournees planifiees (distance stockee)
 * @param gains       ecarts absolus (base - opt) + relatifs en %
 * @param hypotheses  parametres de calcul (vitesse, carburant, CO2, main d'oeuvre)
 * @param avertissement message d'alerte d'affichage (ex. aucune tournee), sinon null
 */
public record GainsResponse(
        Perimetre perimetre,
        Metrique baseline,
        Metrique optimise,
        Gains gains,
        Hypotheses hypotheses,
        String avertissement) {

    /**
     * Volumes de donnees entrees dans la comparaison.
     *
     * @param hubId                  hub filtre (null = tenant global)
     * @param hubNom                 nom du hub filtre (null si global)
     * @param nbDemandes             demandes prises en compte dans la baseline
     * @param nbDemandesIgnorees     demandes ignorees (coordonnees manquantes)
     * @param nbTournees             tournees prises en compte dans l'optimise
     * @param nbTourneesIgnorees     tournees ignorees (distance absente + fallback impossible)
     * @param nbTourneesFallback     tournees dont la distance a ete recalculee (vol d'oiseau) faute de distance stockee
     */
    public record Perimetre(
            UUID hubId,
            String hubNom,
            int nbDemandes,
            int nbDemandesIgnorees,
            int nbTournees,
            int nbTourneesIgnorees,
            int nbTourneesFallback) {}

    /**
     * Metriques d'un scenario (formules README §6-§14).
     *
     * @param distanceKm  distance totale parcourue
     * @param tempsH      temps de conduite = distance / vitesse
     * @param carburantL  consommation = distance x conso / 100
     * @param co2Kg       emissions = carburant x facteur CO2
     * @param coutAr      cout transport = carburant x prix + temps x cout horaire
     * @param vehicules   nombre de vehicules necessaires
     */
    public record Metrique(
            double distanceKm,
            double tempsH,
            double carburantL,
            double co2Kg,
            double coutAr,
            int vehicules) {}

    /**
     * Gains de l'optimisation (formules README §5).
     * Les pourcentages sont null quand la baseline vaut 0 (evite division par zero).
     */
    public record Gains(
            double distanceKm,
            Double distancePct,
            double tempsH,
            Double tempsPct,
            double carburantL,
            double co2Kg,
            double coutAr,
            Double coutPct,
            int vehicules) {}

    /**
     * Parametres de calcul (constantes configurables via query params).
     *
     * @param vitesseKmh        vitesse moyenne pour le temps de trajet (defaut 40)
     * @param consoL100km       consommation en L/100 km (defaut 8)
     * @param prixFuelArParL    prix du carburant en Ar/L (defaut 5900)
     * @param facteurCo2KgParL  facteur d'emission en kg CO2/L (defaut 2.68)
     * @param coutHoraireAr     cout main-d'oeuvre en Ar/h (defaut 0 = ignore)
     */
    public record Hypotheses(
            double vitesseKmh,
            double consoL100km,
            double prixFuelArParL,
            double facteurCo2KgParL,
            double coutHoraireAr) {}
}
