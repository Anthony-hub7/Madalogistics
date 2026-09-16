package com.example.Bakend.optimisation.categorisation;

import java.math.BigDecimal;

/**
 * Convertit un niveau de valeur (FAIBLE/MOYENNE/ELEVEE) en montant interne Ariary.
 * Utilisé pour alimenter la prédiction ML (seuils_ml + clustering) sans exposer le client à des montants.
 *
 * Paliers alignés sur les seuils Fragile-Valeur (>=200k Ar) et les données mock.
 */
public final class NiveauValeurMapper {

    private NiveauValeurMapper() {}

    public static final BigDecimal FAIBLE = new BigDecimal("50000");
    public static final BigDecimal MOYENNE = new BigDecimal("300000");
    public static final BigDecimal ELEVEE = new BigDecimal("1500000");

    private static final BigDecimal DEFAULT = MOYENNE;

    /**
     * Convertit le niveau de valeur en montant interne (Ariary).
     * Retourne la valeur moyenne par défaut si le niveau est null ou inconnu.
     */
    public static BigDecimal toMontant(String niveauValeur) {
        if (niveauValeur == null) return DEFAULT;
        return switch (niveauValeur.trim().toUpperCase()) {
            case "FAIBLE" -> FAIBLE;
            case "ELEVEE" -> ELEVEE;
            default -> MOYENNE;
        };
    }

    /**
     * Convertit le niveau de valeur en entier 0-10 pour le clustering.
     * FAIBLE=2, MOYENNE=5, ELEVEE=9.
     */
    public static int toScore(String niveauValeur) {
        if (niveauValeur == null) return 5;
        return switch (niveauValeur.trim().toUpperCase()) {
            case "FAIBLE" -> 2;
            case "ELEVEE" -> 9;
            default -> 5;
        };
    }
}
