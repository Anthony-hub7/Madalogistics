package com.example.Bakend.optimisation.affectation;

import com.example.Bakend.entity.*;
import com.example.Bakend.entity.enums.TypeVehicule;
import com.example.Bakend.entity.enums.VehiculeStatut;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests PermisService — verification des droits de conduite.
 */
class PermisServiceTest {

    // ── Helpers ──

    private Chauffeur makeChauffeur(String permisCategories, LocalDate expiration,
                                      boolean habilite, boolean disponible) {
        Chauffeur ch = new Chauffeur();
        ch.setChauffeurId(UUID.randomUUID());
        ch.setPermisCategories(permisCategories);
        ch.setPermisExpiration(expiration);
        ch.setDisponible(disponible);
        Utilisateur u = new Utilisateur();
        u.setHabiliteValeur(habilite);
        ch.setUtilisateur(u);
        return ch;
    }

    private Vehicule makeVehicule(TypeVehicule type, BigDecimal ptacTonnes) {
        Vehicule v = new Vehicule();
        v.setVehiculeId(UUID.randomUUID());
        v.setTypeVehicule(type);
        v.setPtacTonnes(ptacTonnes);
        v.setStatut(VehiculeStatut.DISPONIBLE);
        return v;
    }

    private Map<UUID, Map<UUID, Boolean>> matriceVide() {
        return new HashMap<>();
    }

    private Map<UUID, Map<UUID, Boolean>> matrice(Chauffeur ch, Vehicule v, boolean compatible) {
        Map<UUID, Map<UUID, Boolean>> m = new HashMap<>();
        m.computeIfAbsent(ch.getChauffeurId(), k -> new HashMap<>())
                .put(v.getVehiculeId(), compatible);
        return m;
    }

    // ── Tests ──

    @Test
    void autorise_B_sur_pickup_3t5() {
        Chauffeur ch = makeChauffeur("B", LocalDate.now().plusYears(2), true, true);
        Vehicule v = makeVehicule(TypeVehicule.PICKUP, new BigDecimal("3.0"));
        PermisService.Autorisation auth = PermisService.verifier(ch, v, matrice(ch, v, true), null, null);
        assertTrue(auth.autorise());
    }

    @Test
    void refuse_B_sur_camion_5t() {
        Chauffeur ch = makeChauffeur("B", LocalDate.now().plusYears(2), true, true);
        Vehicule v = makeVehicule(TypeVehicule.CAMION, new BigDecimal("5.0"));
        PermisService.Autorisation auth = PermisService.verifier(ch, v, matrice(ch, v, true), null, null);
        assertFalse(auth.autorise());
        assertTrue(auth.motifRefus().contains("C"));
    }

    @Test
    void autorise_BC_sur_camion_5t() {
        Chauffeur ch = makeChauffeur("B,C", LocalDate.now().plusYears(1), true, true);
        Vehicule v = makeVehicule(TypeVehicule.CAMION, new BigDecimal("5.0"));
        PermisService.Autorisation auth = PermisService.verifier(ch, v, matrice(ch, v, true), null, null);
        assertTrue(auth.autorise());
    }

    @Test
    void refuse_BCD_sur_semi_remorque_sans_E() {
        Chauffeur ch = makeChauffeur("B,C,D", LocalDate.now().plusYears(1), true, true);
        Vehicule v = makeVehicule(TypeVehicule.SEMI_REMORQUE, new BigDecimal("10.0"));
        PermisService.Autorisation auth = PermisService.verifier(ch, v, matrice(ch, v, true), null, null);
        assertFalse(auth.autorise());
        assertTrue(auth.motifRefus().contains("E"));
    }

    @Test
    void autorise_BCE_sur_semi_remorque() {
        Chauffeur ch = makeChauffeur("B,C,E", LocalDate.now().plusYears(1), true, true);
        Vehicule v = makeVehicule(TypeVehicule.SEMI_REMORQUE, new BigDecimal("10.0"));
        PermisService.Autorisation auth = PermisService.verifier(ch, v, matrice(ch, v, true), null, null);
        assertTrue(auth.autorise());
    }

    @Test
    void refuse_permis_expire() {
        Chauffeur ch = makeChauffeur("B,C", LocalDate.of(2024, 1, 1), true, true);
        Vehicule v = makeVehicule(TypeVehicule.PICKUP, new BigDecimal("2.0"));
        PermisService.Autorisation auth = PermisService.verifier(ch, v, matrice(ch, v, true), null, null);
        assertFalse(auth.autorise());
        assertTrue(auth.motifRefus().contains("expire"));
    }

    @Test
    void refuse_chauffeur_non_disponible() {
        Chauffeur ch = makeChauffeur("B", LocalDate.now().plusYears(2), true, false);
        Vehicule v = makeVehicule(TypeVehicule.PICKUP, new BigDecimal("2.0"));
        PermisService.Autorisation auth = PermisService.verifier(ch, v, matrice(ch, v, true), null, null);
        assertFalse(auth.autorise());
        assertTrue(auth.motifRefus().contains("non disponible"));
    }

    @Test
    void refuse_matrice_absente() {
        Chauffeur ch = makeChauffeur("B", LocalDate.now().plusYears(2), true, true);
        Vehicule v = makeVehicule(TypeVehicule.PICKUP, new BigDecimal("2.0"));
        PermisService.Autorisation auth = PermisService.verifier(ch, v, matriceVide(), null, null);
        assertFalse(auth.autorise());
        assertTrue(auth.motifRefus().contains("compatibilite"));
    }

    @Test
    void refuse_vehicule_non_disponible() {
        Chauffeur ch = makeChauffeur("B", LocalDate.now().plusYears(2), true, true);
        Vehicule v = makeVehicule(TypeVehicule.PICKUP, new BigDecimal("2.0"));
        v.setStatut(VehiculeStatut.MAINTENANCE);
        PermisService.Autorisation auth = PermisService.verifier(ch, v, matrice(ch, v, true), null, null);
        assertFalse(auth.autorise());
        assertTrue(auth.motifRefus().contains("non disponible"));
    }

    @Test
    void parsePermisCategories_csv() {
        Set<String> cats = PermisService.parsePermisCategories("B,C,D");
        assertEquals(3, cats.size());
        assertTrue(cats.contains("B"));
        assertTrue(cats.contains("C"));
        assertTrue(cats.contains("D"));
    }

    @Test
    void parsePermisCategories_vide() {
        assertTrue(PermisService.parsePermisCategories(null).isEmpty());
        assertTrue(PermisService.parsePermisCategories("").isEmpty());
        assertTrue(PermisService.parsePermisCategories("  ").isEmpty());
    }

    @Test
    void parsePermisCategories_majuscules() {
        Set<String> cats = PermisService.parsePermisCategories("b, c");
        assertTrue(cats.contains("B"));
        assertTrue(cats.contains("C"));
    }

    @Test
    void parsePermisCategories_composite_plus() {
        Set<String> cats = PermisService.parsePermisCategories("C+E");
        assertTrue(cats.contains("C"));
        assertTrue(cats.contains("E"));
        assertEquals(2, cats.size());
    }

    @Test
    void parsePermisCategories_BE_seul() {
        Set<String> cats = PermisService.parsePermisCategories("BE");
        assertTrue(cats.contains("B"));
        assertTrue(cats.contains("E"));
    }

    @Test
    void parsePermisCategories_mixte() {
        Set<String> cats = PermisService.parsePermisCategories("B, C+E, D");
        assertTrue(cats.contains("B"));
        assertTrue(cats.contains("C"));
        assertTrue(cats.contains("D"));
        assertTrue(cats.contains("E"));
    }

    @Test
    void autorise_CplusE_sur_camion_10t_regression_1000t() {
        // Regression : chauffeur "C+E" refuse a tort sur PTAC > 3.5t
        Chauffeur ch = makeChauffeur("C+E", LocalDate.now().plusYears(1), true, true);
        Vehicule v = makeVehicule(TypeVehicule.CAMION, new BigDecimal("10.0"));
        PermisService.Autorisation auth = PermisService.verifier(ch, v, matrice(ch, v, true), null, null);
        assertTrue(auth.autorise(), "C+E doit couvrir le requis C, refus: " + auth.motifRefus());
    }

    @Test
    void autorise_CplusE_sur_semi_remorque() {
        Chauffeur ch = makeChauffeur("C+E", LocalDate.now().plusYears(1), true, true);
        Vehicule v = makeVehicule(TypeVehicule.SEMI_REMORQUE, new BigDecimal("10.0"));
        PermisService.Autorisation auth = PermisService.verifier(ch, v, matrice(ch, v, true), null, null);
        assertTrue(auth.autorise(), "C+E doit couvrir C+E, refus: " + auth.motifRefus());
    }
}
