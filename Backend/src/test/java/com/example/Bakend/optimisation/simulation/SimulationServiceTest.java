package com.example.Bakend.optimisation.simulation;

import com.example.Bakend.dto.simulation.SimulationGroupeRequest;
import com.example.Bakend.dto.simulation.SimulationGroupeResponse;
import com.example.Bakend.entity.enums.TypeAlgorithme;
import com.example.Bakend.optimisation.groupage.BinPackingService;
import com.example.Bakend.optimisation.groupage.KnapsackSolverService;
import com.google.ortools.Loader;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Constructor;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests SimulationService — groupage 100% hors BDD.
 *
 * Algo FFD et Knapsack reels (librairies natives OR-Tools), sans repository :
 * aucun mock de repository n'est possible car la classe n'en depend pas.
 */
class SimulationServiceTest {

    private BinPackingService binPacking;
    private KnapsackSolverService knapsack;
    private SimulationService service;

    @BeforeAll
    static void loadNativeLibraries() {
        Loader.loadNativeLibraries();
    }

    @BeforeEach
    void setUp() {
        binPacking = new BinPackingService();
        knapsack = new KnapsackSolverService();
        service = new SimulationService(binPacking, knapsack);
    }

    private static SimulationGroupeRequest.ColisSimule colis(double poidsKg, double volumeM3) {
        return new SimulationGroupeRequest.ColisSimule(poidsKg, volumeM3);
    }

    private static SimulationGroupeRequest demande(List<SimulationGroupeRequest.ColisSimule> colis,
                                                   double capPoids, double capVolume,
                                                   TypeAlgorithme algo, Integer seuil) {
        return new SimulationGroupeRequest(colis, capPoids, capVolume, algo, seuil);
    }

    // ── Bin Packing ──────────────────────────────────────────────

    @Test
    void binPackingGrouppeDeuxSacsIdentiques() {
        // 4 colis de 2 kg / 0,10 m3, sac de 4 kg / 0,50 m3 → 2 sacs de 2 colis
        SimulationGroupeResponse r = service.grouper(demande(
                List.of(colis(2, 0.10), colis(2, 0.10), colis(2, 0.10), colis(2, 0.10)),
                4, 0.50, TypeAlgorithme.BIN_PACKING, 60));

        assertEquals(2, r.sacs().size());
        assertEquals(0, r.nonGroupes().size());
        assertEquals(4, r.meta().nbColis());

        for (SimulationGroupeResponse.SacSimule sac : r.sacs()) {
            assertEquals(2, sac.nbColis());
            assertEquals(4.0, sac.poidsKg(), 0.001);
            assertEquals(0.20, sac.volumeM3(), 0.001);
            assertEquals(100, sac.tauxRemplissage());
            assertFalse(sac.sousSeuil());
        }
        assertEquals(1, r.sacs().get(0).numero());
        assertEquals(2, r.sacs().get(1).numero());
    }

    @Test
    void binPackingSignaleColisDepassantLaCapacite() {
        SimulationGroupeResponse r = service.grouper(demande(
                List.of(colis(10, 0.10), colis(2, 0.10)),
                4, 0.50, TypeAlgorithme.BIN_PACKING, 60));

        assertEquals(1, r.sacs().size());
        assertEquals(1, r.nonGroupes().size());
        SimulationGroupeResponse.ColisNonGroupe ng = r.nonGroupes().get(0);
        assertEquals(0, ng.indexColis());
        assertEquals(10.0, ng.poidsKg(), 0.001);
        assertTrue(ng.motif().contains("Depasse"));
        // le sac ne contient que le colis valide
        assertEquals(List.of(1), r.sacs().get(0).colis());
    }

    @Test
    void binPackingTousLesColisTropGrosDonneSacsVides() {
        SimulationGroupeResponse r = service.grouper(demande(
                List.of(colis(10, 0.10), colis(20, 0.10)),
                4, 0.50, TypeAlgorithme.BIN_PACKING, 60));

        assertTrue(r.sacs().isEmpty());
        assertEquals(2, r.nonGroupes().size());
        assertEquals(0, r.meta().nbSacs());
    }

    // ── Knapsack ─────────────────────────────────────────────────

    @Test
    void knapsackRetientLeSacOptimal() {
        // cap 5 kg : 4 + 3 = 7 impossible → optimal = 4 kg seul
        SimulationGroupeResponse r = service.grouper(demande(
                List.of(colis(4, 0.10), colis(3, 0.10)),
                5, 1.0, TypeAlgorithme.KNAPSACK, 60));

        assertEquals(TypeAlgorithme.KNAPSACK, r.meta().algo());
        assertEquals(1, r.sacs().size());
        assertEquals(1, r.sacs().get(0).nbColis());
        assertEquals(4.0, r.sacs().get(0).poidsKg(), 0.001);

        assertEquals(1, r.nonGroupes().size());
        assertEquals(1, r.nonGroupes().get(0).indexColis());
        assertTrue(r.nonGroupes().get(0).motif().contains("Knapsack"));
    }

    @Test
    void knapsackColisEtropGrosRetourneSacsVides() {
        SimulationGroupeResponse r = service.grouper(demande(
                List.of(colis(10, 0.10)),
                5, 1.0, TypeAlgorithme.KNAPSACK, 60));

        assertTrue(r.sacs().isEmpty());
        assertEquals(1, r.nonGroupes().size());
    }

    // ── Profil du vehicule requis ────────────────────────────────

    @Test
    void vehiculeRequisSuggereLePlusPetitGabaritCouvrant() {
        // 12 kg / 10 m3 → couvert par "Fourgon leger" (1500 kg / 12 m3)
        SimulationGroupeResponse r = service.grouper(demande(
                List.of(colis(12, 10)),
                100, 50, TypeAlgorithme.BIN_PACKING, 60));

        SimulationGroupeResponse.VehiculeRequis v = r.sacs().get(0).vehiculeRequis();
        assertEquals(12.0, v.capacitePoidsKgMin(), 0.001);
        assertEquals(10.0, v.capaciteVolumeM3Min(), 0.001);
        assertEquals("Fourgon leger", v.gabaritSuggere());
        assertFalse(v.horsGabarit());
    }

    @Test
    void vehiculeRequisSignaleHorsGabarit() {
        // 30 000 kg > 20 000 kg (max Semi-remorque)
        SimulationGroupeResponse r = service.grouper(demande(
                List.of(colis(30000, 10)),
                40000, 50, TypeAlgorithme.BIN_PACKING, 60));

        SimulationGroupeResponse.VehiculeRequis v = r.sacs().get(0).vehiculeRequis();
        assertTrue(v.horsGabarit());
        assertTrue(v.gabaritSuggere().contains("fractionner"));
    }

    @Test
    void tauxRemplissageEtSeuil() {
        // 3 kg / 0,40 m3 sur cap 4 kg / 1,00 m3 → taux = max(75, 40) = 75
        SimulationGroupeResponse r = service.grouper(demande(
                List.of(colis(3, 0.40)),
                4, 1.0, TypeAlgorithme.BIN_PACKING, 60));

        SimulationGroupeResponse.SacSimule sac = r.sacs().get(0);
        assertEquals(75, sac.tauxRemplissage());
        assertFalse(sac.sousSeuil());

        // meme sac avec seuil 80 → sous seuil
        SimulationGroupeResponse r2 = service.grouper(demande(
                List.of(colis(3, 0.40)),
                4, 1.0, TypeAlgorithme.BIN_PACKING, 80));
        assertTrue(r2.sacs().get(0).sousSeuil());
    }

    // ── Validation ───────────────────────────────────────────────

    @Test
    void listeColisVideRejouee() {
        assertThrows(IllegalStateException.class, () -> service.grouper(
                demande(List.of(), 4, 1, TypeAlgorithme.BIN_PACKING, 60)));
        assertThrows(IllegalStateException.class, () -> service.grouper(
                demande(null, 4, 1, TypeAlgorithme.BIN_PACKING, 60)));
    }

    @Test
    void capacitesInvalidesRejouees() {
        assertThrows(IllegalStateException.class, () -> service.grouper(
                demande(List.of(colis(1, 0.1)), 0, 1, TypeAlgorithme.BIN_PACKING, 60)));
        assertThrows(IllegalStateException.class, () -> service.grouper(
                demande(List.of(colis(1, 0.1)), -4, 1, TypeAlgorithme.BIN_PACKING, 60)));
        assertThrows(IllegalStateException.class, () -> service.grouper(
                new SimulationGroupeRequest(List.of(colis(1, 0.1)), 4.0, null,
                        TypeAlgorithme.BIN_PACKING, 60)));
    }

    @Test
    void colisInvalidesRejoues() {
        assertThrows(IllegalStateException.class, () -> service.grouper(
                demande(List.of(colis(0, 0.1)), 4, 1, TypeAlgorithme.BIN_PACKING, 60)));
        assertThrows(IllegalStateException.class, () -> service.grouper(
                demande(List.of(colis(1, 0)), 4, 1, TypeAlgorithme.BIN_PACKING, 60)));
        assertThrows(IllegalStateException.class, () -> service.grouper(
                demande(List.of(colis(-1, 0.1)), 4, 1, TypeAlgorithme.BIN_PACKING, 60)));
        assertThrows(IllegalStateException.class, () -> service.grouper(
                demande(Collections.singletonList(null), 4, 1, TypeAlgorithme.BIN_PACKING, 60)));
    }

    @Test
    void algoNonSupporteRejete() {
        assertThrows(IllegalStateException.class, () -> service.grouper(
                demande(List.of(colis(1, 0.1)), 4, 1, TypeAlgorithme.VRP, 60)));
        assertThrows(IllegalStateException.class, () -> service.grouper(
                demande(List.of(colis(1, 0.1)), 4, 1, TypeAlgorithme.AFFECTATION, 60)));
    }

    @Test
    void seuilHorsBornesRejete() {
        assertThrows(IllegalStateException.class, () -> service.grouper(
                demande(List.of(colis(1, 0.1)), 4, 1, TypeAlgorithme.BIN_PACKING, 101)));
        assertThrows(IllegalStateException.class, () -> service.grouper(
                demande(List.of(colis(1, 0.1)), 4, 1, TypeAlgorithme.BIN_PACKING, -1)));
    }

    @Test
    void algoNullRetombeSurBinPacking() {
        SimulationGroupeResponse r = service.grouper(demande(
                List.of(colis(1, 0.1)), 4, 1, null, null));
        assertEquals(TypeAlgorithme.BIN_PACKING, r.meta().algo());
        assertEquals(60, r.meta().seuilRemplissage());
    }

    // ── Garantie hors BDD ────────────────────────────────────────

    @Test
    void aucuneDependanceRepository() {
        Constructor<?>[] ctors = SimulationService.class.getDeclaredConstructors();
        assertTrue(ctors.length >= 1);
        for (Constructor<?> ctor : ctors) {
            for (Class<?> param : ctor.getParameterTypes()) {
                assertFalse(param.getName().toLowerCase().contains("repository"),
                        "SimulationService ne doit dependre d'aucun repository : " + param.getName());
            }
        }
        assertTrue(Arrays.stream(SimulationService.class.getDeclaredFields())
                .noneMatch(f -> f.getType().getName().toLowerCase().contains("repository")),
                "SimulationService ne doit contenir aucun champ repository");
    }
}
