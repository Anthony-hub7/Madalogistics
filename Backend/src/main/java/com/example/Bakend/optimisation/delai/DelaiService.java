package com.example.Bakend.optimisation.delai;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.function.Function;

/**
 * Service pur de calcul des delais et de tri par urgence.
 * Aucune dependance Spring - testable en unitaire.
 *
 * Constantes code (pas de colonne BDD) :
 *   HEURES_CONDUITE_JOUR = 8 (securite chauffeur)
 */
public final class DelaiService {

    public static final double HEURES_CONDUITE_JOUR = 8.0;

    private DelaiService() {}

    public static BigDecimal calculerDelai(BigDecimal dureeTrajetHeures) {
        if (dureeTrajetHeures == null || dureeTrajetHeures.doubleValue() <= 0) {
            return BigDecimal.ONE;
        }
        double jours = dureeTrajetHeures.doubleValue() / HEURES_CONDUITE_JOUR;
        long delai = Math.max(1, (long) Math.ceil(jours));
        return BigDecimal.valueOf(delai);
    }

    public static LocalDate calculerDateDepart(LocalDate dateLimite,
                                                BigDecimal delaiJours,
                                                BigDecimal margePct) {
        if (dateLimite == null || delaiJours == null) {
            return null;
        }
        double marge = margePct != null ? margePct.doubleValue() / 100.0 : 0.15;
        double joursAvecMarge = delaiJours.doubleValue() * (1.0 + marge);
        long joursArrondis = (long) Math.ceil(joursAvecMarge);
        return dateLimite.minusDays(joursArrondis);
    }

    public static <T> List<T> trierParUrgence(List<T> elements,
                                                Function<T, LocalDate> dateDepartExtractor) {
        return elements.stream()
                .sorted(Comparator.comparing(
                        dateDepartExtractor,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }
}
