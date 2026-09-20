package com.example.Bakend.optimisation.affectation;

import com.example.Bakend.entity.*;
import com.example.Bakend.entity.enums.TypeVehicule;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

/**
 * Service pur — Verification des droits de conduite (code de la route Madagascar).
 *
 * Verifie :
 *   1. Permis non expire
 *   2. Classes de permis suffisantes pour le PTAC du vehicule
 *   3. Classes de permis specifiques au type de vehicule (D pour BUS/MINIBUS, E pour SEMI_REMORQUE)
 *   4. Compatibilite chauffeur-vehicule (matrice, refus strict si ligne absente)
 *   5. habiliteValeur si le sac contient des colis de categorie A
 *   6. Chauffeur disponible + vehicule DISPONIBLE
 *
 * Code de la route (base francaise, applicable a Madagascar) :
 *   B : vehicules <= 3.5t
 *   C : vehicules > 3.5t
 *   D : transport en commun de personnes
 *   E : ensembles de vehicules (remorque)
 */
public class PermisService {

    /**
     * Resultat de la verification.
     */
    public record Autorisation(
            boolean autorise,
            String motifRefus
    ) {
        public static Autorisation ok() {
            return new Autorisation(true, null);
        }
        public static Autorisation refuse(String motif) {
            return new Autorisation(false, motif);
        }
    }

    /**
     * Verifie si un chauffeur est autorise a conduire un vehicule pour un sac donne.
     *
     * @param chauffeur         le chauffeur a verifier
     * @param vehicule          le vehicule cible
     * @param matriceCompatibilite  map (chauffeurId, vehiculeId) → compatible (null = refus)
     * @param categorieDominante categorie dominante du sac (ex. "A", "B", "C", "STANDARD")
     * @param poidsSacKg        poids total du sac en kg (null = skip)
     * @param volumeSacM3       volume total du sac en m3 (null = skip)
     * @return Autorisation avec motif de refus si non autorise
     */
    public static Autorisation verifier(Chauffeur chauffeur,
                                         Vehicule vehicule,
                                         Map<UUID, Map<UUID, Boolean>> matriceCompatibilite,
                                         String categorieDominante,
                                         Double poidsSacKg,
                                         Double volumeSacM3) {
        // 0. Chauffeur disponible
        if (!chauffeur.isDisponible()) {
            return Autorisation.refuse("Chauffeur non disponible.");
        }

        // 0b. Vehicule DISPONIBLE
        if (vehicule.getStatut() != com.example.Bakend.entity.enums.VehiculeStatut.DISPONIBLE) {
            return Autorisation.refuse("Vehicule non disponible (statut: " + vehicule.getStatut() + ").");
        }

        // 1. Permis non expire
        if (chauffeur.getPermisExpiration() == null) {
            return Autorisation.refuse("Date d'expiration du permis non renseignee.");
        }
        if (chauffeur.getPermisExpiration().isBefore(LocalDate.now())) {
            return Autorisation.refuse("Permis expire le " + chauffeur.getPermisExpiration() + ".");
        }

        // 2. Permis categories presentes
        Set<String> classesPermis = parsePermisCategories(chauffeur.getPermisCategories());
        if (classesPermis.isEmpty()) {
            return Autorisation.refuse("Aucune classe de permis renseignee.");
        }

        // 3. Verifier PTAC → classe requise
        TypeVehicule typeVehicule = vehicule.getTypeVehicule();
        BigDecimal ptac = vehicule.getPtacTonnes();

        if (ptac == null) {
            return Autorisation.refuse("PTAC du vehicule non renseigne.");
        }

        // PTAC > 3.5t → C requis
        if (ptac.compareTo(new BigDecimal("3.5")) > 0) {
            if (!classesPermis.contains("C")) {
                return Autorisation.refuse(
                        "PTAC " + ptac + "t > 3.5t : permis classe C requis.");
            }
        } else {
            // PTAC <= 3.5t → B requis
            if (!classesPermis.contains("B")) {
                return Autorisation.refuse(
                        "PTAC " + ptac + "t ≤ 3.5t : permis classe B requis.");
            }
        }

        // 4. Verifier type vehicule → classes specifiques
        if (typeVehicule != null) {
            if (typeVehicule.necessitePermisD() && !classesPermis.contains("D")) {
                return Autorisation.refuse(
                        "Vehicule type " + typeVehicule + " : permis classe D requis (transport personnes).");
            }
            if (typeVehicule.necessitePermisE() && !classesPermis.contains("E")) {
                return Autorisation.refuse(
                        "Vehicule type " + typeVehicule + " : permis classe E requis (remorque).");
            }
        }

        // 5. Matrice compatibilite (refus strict si ligne absente)
        Map<UUID, Boolean> lignesChauffeur = matriceCompatibilite.get(chauffeur.getChauffeurId());
        if (lignesChauffeur == null) {
            return Autorisation.refuse("Aucune ligne de compatibilite pour ce chauffeur.");
        }
        Boolean compatible = lignesChauffeur.get(vehicule.getVehiculeId());
        if (compatible == null || !compatible) {
            return Autorisation.refuse("Compatibilite chauffeur-vehicule refusee ou absente.");
        }

        // 6. habiliteValeur si categorie A
        if ("A".equalsIgnoreCase(categorieDominante)) {
            if (chauffeur.getUtilisateur() == null || !chauffeur.getUtilisateur().isHabiliteValeur()) {
                return Autorisation.refuse(
                        "Categorie dominante A (valeur) : chauffeur non habilite.");
            }
        }

        // 7. Capacite vehicule vs poids/volume du sac
        if (poidsSacKg != null && vehicule.getCapacitePoidsKg() != null) {
            if (poidsSacKg > vehicule.getCapacitePoidsKg().doubleValue()) {
                return Autorisation.refuse(
                    "Aucun vehicule compatible : sac " + String.format("%.1f", poidsSacKg)
                    + " kg > capacite " + vehicule.getCapacitePoidsKg() + " kg ("
                    + vehicule.getImmatriculation() + ").");
            }
        }
        if (volumeSacM3 != null && vehicule.getCapaciteVolumeM3() != null) {
            if (volumeSacM3 > vehicule.getCapaciteVolumeM3().doubleValue()) {
                return Autorisation.refuse(
                    "Aucun vehicule compatible : sac " + String.format("%.2f", volumeSacM3)
                    + " m3 > capacite " + vehicule.getCapaciteVolumeM3() + " m3 ("
                    + vehicule.getImmatriculation() + ").");
            }
        }

        return Autorisation.ok();
    }

    /**
     * Parse les categories de permis depuis une chaîne CSV (ex. "B,C" → {B, C}).
     * Normalise en uppercase.
     */
    public static Set<String> parsePermisCategories(String permisCategories) {
        Set<String> result = new HashSet<>();
        if (permisCategories == null || permisCategories.isBlank()) {
            return result;
        }
        for (String cat : permisCategories.split(",")) {
            String trimmed = cat.trim().toUpperCase();
            if (!trimmed.isEmpty()) {
                result.add(trimmed);
            }
        }
        return result;
    }
}
