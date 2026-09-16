package com.example.Bakend.dto.direction;

import jakarta.validation.constraints.AssertTrue;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Schema strict pour seuils_ml (JSONB dans categorie_produit).
 * Serialisation/deserialisation MANUELLE (pas Jackson).
 *
 * Toutes les cles sont presentes systematiquement. null = pas de contrainte sur cette borne.
 * Validation a la creation/modification cote API Direction.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeuilsMl {

    private Double poidsMin;
    private Double poidsMax;
    private Double volumeMin;
    private Double volumeMax;
    private Integer fragiliteMin;
    private Integer fragiliteMax;
    private Double valeurMin;
    private Double valeurMax;
    private Integer delaiMaxH;

    @AssertTrue(message = "poids_min doit etre inferieur a poids_max")
    private boolean isPoidsValid() {
        return poidsMin == null || poidsMax == null || poidsMin < poidsMax;
    }

    @AssertTrue(message = "volume_min doit etre inferieur a volume_max")
    private boolean isVolumeValid() {
        return volumeMin == null || volumeMax == null || volumeMin < volumeMax;
    }

    @AssertTrue(message = "fragilite_min doit etre inferieur a fragilite_max")
    private boolean isFragiliteValid() {
        return fragiliteMin == null || fragiliteMax == null || fragiliteMin <= fragiliteMax;
    }

    @AssertTrue(message = "valeur_min doit etre inferieur a valeur_max")
    private boolean isValeurValid() {
        return valeurMin == null || valeurMax == null || valeurMin < valeurMax;
    }

    @AssertTrue(message = "delai_max_h doit etre positif")
    private boolean isDelaiValid() {
        return delaiMaxH == null || delaiMaxH > 0;
    }

    /**
     * Serialise en JSON string (manuel, sans Jackson).
     */
    public String toJson() {
        StringBuilder sb = new StringBuilder("{");
        sb.append("\"poids_min\":").append(jsonVal(poidsMin));
        sb.append(",\"poids_max\":").append(jsonVal(poidsMax));
        sb.append(",\"volume_min\":").append(jsonVal(volumeMin));
        sb.append(",\"volume_max\":").append(jsonVal(volumeMax));
        sb.append(",\"fragilite_min\":").append(jsonVal(fragiliteMin));
        sb.append(",\"fragilite_max\":").append(jsonVal(fragiliteMax));
        sb.append(",\"valeur_min\":").append(jsonVal(valeurMin));
        sb.append(",\"valeur_max\":").append(jsonVal(valeurMax));
        sb.append(",\"delai_max_h\":").append(jsonVal(delaiMaxH));
        sb.append("}");
        return sb.toString();
    }

    /**
     * Deserialise depuis un JSON string (manuel, sans Jackson).
     * Parse basique : chaque cle "key":value separez par virgules.
     */
    public static SeuilsMl fromJson(String json) {
        if (json == null || json.isBlank()) return null;

        SeuilsMl s = new SeuilsMl();
        String clean = json.trim();
        if (clean.startsWith("{")) clean = clean.substring(1);
        if (clean.endsWith("}")) clean = clean.substring(0, clean.length() - 1);

        String[] pairs = clean.split(",");
        for (String pair : pairs) {
            String[] kv = pair.split(":", 2);
            if (kv.length != 2) continue;
            String key = kv[0].trim().replace("\"", "");
            String val = kv[1].trim();

            switch (key) {
                case "poids_min" -> s.poidsMin = parseDouble(val);
                case "poids_max" -> s.poidsMax = parseDouble(val);
                case "volume_min" -> s.volumeMin = parseDouble(val);
                case "volume_max" -> s.volumeMax = parseDouble(val);
                case "fragilite_min" -> s.fragiliteMin = parseInt(val);
                case "fragilite_max" -> s.fragiliteMax = parseInt(val);
                case "valeur_min" -> s.valeurMin = parseDouble(val);
                case "valeur_max" -> s.valeurMax = parseDouble(val);
                case "delai_max_h" -> s.delaiMaxH = parseInt(val);
            }
        }
        return s;
    }

    /**
     * Teste si un colis respecte les bornes de cette categorie.
     */
    public boolean matches(double poidsKg, double volumeM3, int fragilite, double valeurAr, boolean express) {
        if (poidsMin != null && poidsKg < poidsMin) return false;
        if (poidsMax != null && poidsKg > poidsMax) return false;
        if (volumeMin != null && volumeM3 < volumeMin) return false;
        if (volumeMax != null && volumeM3 > volumeMax) return false;
        if (fragiliteMin != null && fragilite < fragiliteMin) return false;
        if (fragiliteMax != null && fragilite > fragiliteMax) return false;
        if (valeurMin != null && valeurAr < valeurMin) return false;
        if (valeurMax != null && valeurAr > valeurMax) return false;
        if (delaiMaxH != null && express) return false;
        return true;
    }

    private static String jsonVal(Double v) {
        return v == null ? "null" : String.valueOf(v);
    }

    private static String jsonVal(Integer v) {
        return v == null ? "null" : String.valueOf(v);
    }

    private static Double parseDouble(String s) {
        if (s.equals("null")) return null;
        try {
            return Double.parseDouble(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static Integer parseInt(String s) {
        if (s.equals("null")) return null;
        try {
            return (int) Double.parseDouble(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
