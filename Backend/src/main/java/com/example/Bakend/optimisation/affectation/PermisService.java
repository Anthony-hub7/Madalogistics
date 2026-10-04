package com.example.Bakend.optimisation.affectation;

import com.example.Bakend.entity.*;
import com.example.Bakend.entity.enums.TypeVehicule;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Service pur — Verification des droits de conduite (code de la route Madagascar).
 *
 * Verifie :
 *   0. Chauffeur disponible + vehicule DISPONIBLE
 *   0b. Indisponibilite a la date de depart
 *   1. Permis non expire
 *   2. Classes de permis suffisantes pour le PTAC du vehicule
 *   3. Classes de permis specifiques au type de vehicule (D pour BUS/MINIBUS, E pour SEMI_REMORQUE)
 *   4. Compatibilite chauffeur-vehicule (matrice, refus strict si ligne absente)
 *   5. Capacite vehicule vs poids/volume du sac
 */
public class PermisService {

    /**
     * Resultat de la verification.
     */
    public record Autorisation(
            boolean autorise,
            String motifRefus,
            List<String> raisons
    ) {
        public static Autorisation ok() {
            return new Autorisation(true, null, List.of());
        }
        public static Autorisation refuse(String motif) {
            return new Autorisation(false, motif, List.of(motif));
        }
        public static Autorisation refuse(List<String> raisons) {
            String premier = raisons.isEmpty() ? "Incompatible" : raisons.get(0);
            return new Autorisation(false, premier, Collections.unmodifiableList(raisons));
        }
    }

    /**
     * Verifie si un chauffeur est autorise a conduire un vehicule pour un sac donne (sans controle date).
     */
    public static Autorisation verifier(Chauffeur chauffeur,
                                         Vehicule vehicule,
                                         Map<UUID, Map<UUID, Boolean>> matriceCompatibilite,
                                         Double poidsSacKg,
                                         Double volumeSacM3) {
        return verifier(chauffeur, vehicule, matriceCompatibilite, poidsSacKg, volumeSacM3, null, null);
    }

    /**
     * Verifie si un chauffeur est autorise a conduire un vehicule pour un sac donne, avec controle date.
     *
     * @param dateDepart          date de depart souhaitee (null = skip controle indisponibilite)
     * @param indispoChauffeur    liste des indisponibilites du chauffeur chevauchant dateDepart (null = skip)
     */
    public static Autorisation verifier(Chauffeur chauffeur,
                                         Vehicule vehicule,
                                         Map<UUID, Map<UUID, Boolean>> matriceCompatibilite,
                                         Double poidsSacKg,
                                         Double volumeSacM3,
                                         LocalDate dateDepart,
                                         List<IndisponibiliteChauffeur> indispoChauffeur) {
        List<String> raisons = new ArrayList<>();

        // 0. Chauffeur disponible
        if (!chauffeur.isDisponible()) {
            raisons.add("Chauffeur non disponible (statut interne).");
        }

        // 0b. Vehicule DISPONIBLE
        if (vehicule.getStatut() != com.example.Bakend.entity.enums.VehiculeStatut.DISPONIBLE) {
            raisons.add("Vehicule non disponible (statut: " + vehicule.getStatut() + ").");
        }

        // 0c. Indisponibilite du chauffeur a la date de depart
        if (dateDepart != null && indispoChauffeur != null && !indispoChauffeur.isEmpty()) {
            for (IndisponibiliteChauffeur ind : indispoChauffeur) {
                LocalDate indDebut = ind.getDebut() != null ? ind.getDebut().toLocalDate() : null;
                LocalDate indFin = ind.getFin() != null ? ind.getFin().toLocalDate() : null;
                if (indDebut != null && indFin != null && !dateDepart.isBefore(indDebut) && !dateDepart.isAfter(indFin)) {
                    String motif = ind.getMotif() != null && !ind.getMotif().isBlank()
                            ? ind.getMotif() : "pas de motif renseigne";
                    raisons.add("Chauffeur indisponible le " + dateDepart + " (motif: " + motif + ").");
                }
            }
        }

        // 1. Permis non expire
        if (chauffeur.getPermisExpiration() == null) {
            raisons.add("Date d'expiration du permis non renseignee.");
        } else if (chauffeur.getPermisExpiration().isBefore(LocalDate.now())) {
            raisons.add("Permis expire le " + chauffeur.getPermisExpiration() + ".");
        }

        // 2. Permis categories presentes
        Set<String> classesPermis = parsePermisCategories(chauffeur.getPermisCategories());
        if (classesPermis.isEmpty()) {
            raisons.add("Aucune classe de permis renseignee.");
        }

        // 3. Verifier PTAC -> classe requise
        TypeVehicule typeVehicule = vehicule.getTypeVehicule();
        BigDecimal ptac = vehicule.getPtacTonnes();

        if (ptac == null) {
            raisons.add("PTAC du vehicule non renseigne.");
        } else {
            if (ptac.compareTo(new BigDecimal("3.5")) > 0) {
                if (!classesPermis.contains("C")) {
                    raisons.add("PTAC " + ptac + "t > 3.5t : permis classe C requis (chauffeur possede: "
                            + (classesPermis.isEmpty() ? "aucun" : String.join(", ", classesPermis)) + ").");
                }
            } else {
                if (!classesPermis.contains("B")) {
                    raisons.add("PTAC " + ptac + "t ≤ 3.5t : permis classe B requis.");
                }
            }
        }

        // 4. Verifier type vehicule -> classes specifiques
        if (typeVehicule != null) {
            if (typeVehicule.necessitePermisD() && !classesPermis.contains("D")) {
                raisons.add("Vehicule type " + typeVehicule + " : permis classe D requis (transport personnes).");
            }
            if (typeVehicule.necessitePermisE() && !classesPermis.contains("E")) {
                raisons.add("Vehicule type " + typeVehicule + " : permis classe E requis (remorque).");
            }
        }

        // 5. Matrice compatibilite
        Map<UUID, Boolean> lignesChauffeur = matriceCompatibilite.get(chauffeur.getChauffeurId());
        if (lignesChauffeur == null) {
            raisons.add("Aucune ligne de compatibilite declaree pour ce chauffeur — a valider par le gestionnaire.");
        } else {
            Boolean compatible = lignesChauffeur.get(vehicule.getVehiculeId());
            if (compatible == null) {
                raisons.add("Aucune compatibilite declaree entre ce chauffeur et ce vehicule — a valider par le gestionnaire.");
            } else if (!compatible) {
                raisons.add("Compatibilite chauffeur-vehicule explicitement refusee.");
            }
        }

        // 6. Capacite vehicule vs poids/volume du sac
        if (poidsSacKg != null && vehicule.getCapacitePoidsKg() != null) {
            if (poidsSacKg > vehicule.getCapacitePoidsKg().doubleValue()) {
                raisons.add("Poids du sac (" + String.format("%.1f", poidsSacKg)
                        + " kg) depasse la capacite du vehicule " + vehicule.getImmatriculation()
                        + " (" + vehicule.getCapacitePoidsKg() + " kg).");
            }
        }
        if (volumeSacM3 != null && vehicule.getCapaciteVolumeM3() != null) {
            if (volumeSacM3 > vehicule.getCapaciteVolumeM3().doubleValue()) {
                raisons.add("Volume du sac (" + String.format("%.2f", volumeSacM3)
                        + " m3) depasse la capacite du vehicule " + vehicule.getImmatriculation()
                        + " (" + vehicule.getCapaciteVolumeM3() + " m3).");
            }
        }

        if (!raisons.isEmpty()) {
            return Autorisation.refuse(raisons);
        }
        return Autorisation.ok();
    }

    /**
     * Parse les categories de permis depuis une chaine (ex. "B,C+E" -> {B, C, E}).
     * Accepte les separateurs ',', ';', '/', espaces et les composites '+'.
     * Cas particuliers : "BE" -> {B, E} (notation code de la route), "CE"/"DE" -> {C,E}/{D,E}.
     * Normalise en uppercase.
     */
    public static Set<String> parsePermisCategories(String permisCategories) {
        Set<String> result = new HashSet<>();
        if (permisCategories == null || permisCategories.isBlank()) {
            return result;
        }
        for (String token : permisCategories.split("[,;/\\s]+")) {
            String t = token.trim().toUpperCase();
            if (t.isEmpty()) {
                continue;
            }
            for (String part : t.split("\\+")) {
                String p = part.trim().toUpperCase();
                if (p.isEmpty()) {
                    continue;
                }
                if (p.equals("BE")) {
                    result.add("B");
                    result.add("E");
                } else if (p.matches("^[BCDE]{2}$")) {
                    for (char c : p.toCharArray()) {
                        result.add(String.valueOf(c));
                    }
                } else {
                    result.add(p);
                }
            }
        }
        return result;
    }
}
