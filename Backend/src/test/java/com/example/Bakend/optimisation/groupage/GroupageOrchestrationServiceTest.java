package com.example.Bakend.optimisation.groupage;

import com.example.Bakend.entity.*;
import com.example.Bakend.entity.enums.*;
import com.example.Bakend.repository.*;
import com.example.Bakend.optimisation.groupage.GroupageOrchestrationService.GroupageResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Tests du groupage FFD Bin Packing — scénario complet avec 6 colis répartis en 2 sacs.
 *
 * Scénario :
 *   Véhicule hub : 1000 kg / 10 m3 (seul véhicule DISPONIBLE)
 *   Seuil remplissage : 50% (pour forcer la formation de sacs même sous-seuil)
 *   today = dateDepartCalculee → departForce = true pour tous les sacs
 *
 *   Colis (tri FFD par poids décroissant) :
 *     C6 : 400 kg / 3.0 m3  (Demande D3)  → Sac 1
 *     C1 : 300 kg / 2.0 m3  (Demande D1)  → Sac 1 (400+300=700≤1000, 3+2=5≤10)
 *     C2 : 200 kg / 1.5 m3  (Demande D1)  → Sac 2 (nouveau : 700+200=900>1000)
 *     C4 : 250 kg / 2.5 m3  (Demande D2)  → Sac 2 (200+250=450≤1000, 1.5+2.5=4≤10)
 *     C3 : 150 kg / 1.0 m3  (Demande D2)  → Sac 3 (nouveau : 450+150=600≤1000, 4+1=5≤10)
 *     C5 : 100 kg / 0.5 m3  (Demande D2)  → Sac 3 (600+100=700≤1000, 5+0.5=5.5≤10)
 *
 *   Résultat FFD : 3 sacs
 *     Sac 1 : C6+C1 → 700kg/5.0m3 → taux=max(70%,50%)=70%
 *     Sac 2 : C2+C4 → 450kg/4.0m3 → taux=max(45%,40%)=45%
 *     Sac 3 : C3+C5 → 250kg/1.5m3 → taux=max(25%,15%)=25%
 *
 *   Après filtre seuil(50%) OU departForce(today>=dateDepart):
 *     Sac 1 : 70% >= 50% → CONSERVÉ
 *     Sac 2 : 45% < 50% mais departForce=true → CONSERVÉ
 *     Sac 3 : 25% < 50% mais departForce=true → CONSERVÉ
 *
 *   → 3 sacs persistés (tous en departForce car today=dateDepartCalculee)
 */
@ExtendWith(MockitoExtension.class)
class GroupageOrchestrationServiceTest {

    @Mock private DemandeTransportRepository demandeRepository;
    @Mock private ColisRepository colisRepository;
    @Mock private VehiculeRepository vehiculeRepository;
    @Mock private SacRepository sacRepository;
    @Mock private PMEClienteRepository pmeClienteRepository;
    @Mock private OptimisationRunRepository optimisationRunRepository;
    @Mock private BinPackingService binPackingService;

    @InjectMocks private GroupageOrchestrationService service;

    private UUID tenantId = UUID.randomUUID();
    private UUID hubId = UUID.randomUUID();
    private PMECliente tenant;
    private Hub hub;
    private Vehicule vehicule;

    // 3 demandes
    private DemandeTransport demande1, demande2, demande3;

    // 6 colis (poids/volume en unités réelles, service convertit en ×100)
    private Colis c1, c2, c3, c4, c5, c6;

    @BeforeEach
    void setUp() {
        tenant = new PMECliente();
        tenant.setTenantId(tenantId);
        tenant.setNomEntreprise("MadTrans Test");
        tenant.setSeuilRemplissageMin(new BigDecimal("50.00"));

        hub = new Hub();
        hub.setHubId(hubId);
        hub.setPmeCliente(tenant);
        hub.setNom("Hub Antananarivo");

        vehicule = new Vehicule();
        vehicule.setVehiculeId(UUID.randomUUID());
        vehicule.setPmeCliente(tenant);
        vehicule.setHub(hub);
        vehicule.setCapacitePoidsKg(new BigDecimal("1000"));
        vehicule.setCapaciteVolumeM3(new BigDecimal("10"));
        vehicule.setStatut(VehiculeStatut.DISPONIBLE);

        // Demande 1 — 2 colis
        demande1 = new DemandeTransport();
        demande1.setDemandeId(UUID.randomUUID());
        demande1.setPmeCliente(tenant);
        demande1.setHub(hub);
        demande1.setStatut(DemandeStatut.EN_ATTENTE_GROUPAGE);
        demande1.setDateDepartCalculee(LocalDate.now()); // departForce = true

        // Demande 2 — 3 colis
        demande2 = new DemandeTransport();
        demande2.setDemandeId(UUID.randomUUID());
        demande2.setPmeCliente(tenant);
        demande2.setHub(hub);
        demande2.setStatut(DemandeStatut.EN_ATTENTE_GROUPAGE);
        demande2.setDateDepartCalculee(LocalDate.now());

        // Demande 3 — 1 colis
        demande3 = new DemandeTransport();
        demande3.setDemandeId(UUID.randomUUID());
        demande3.setPmeCliente(tenant);
        demande3.setHub(hub);
        demande3.setStatut(DemandeStatut.EN_ATTENTE_GROUPAGE);
        demande3.setDateDepartCalculee(LocalDate.now());

        // Colis C1 : 300kg / 2.0m3 (Demande 1)
        c1 = makeColis(demande1, 300, 2.0);

        // Colis C2 : 200kg / 1.5m3 (Demande 1)
        c2 = makeColis(demande1, 200, 1.5);

        // Colis C3 : 150kg / 1.0m3 (Demande 2)
        c3 = makeColis(demande2, 150, 1.0);

        // Colis C4 : 250kg / 2.5m3 (Demande 2)
        c4 = makeColis(demande2, 250, 2.5);

        // Colis C5 : 100kg / 0.5m3 (Demande 2)
        c5 = makeColis(demande2, 100, 0.5);

        // Colis C6 : 400kg / 3.0m3 (Demande 3)
        c6 = makeColis(demande3, 400, 3.0);
    }

    private Colis makeColis(DemandeTransport demande, double poidsKg, double volumeM3) {
        Colis c = new Colis();
        c.setColisId(UUID.randomUUID());
        c.setPmeCliente(tenant);
        c.setDemande(demande);
        c.setPoidsKg(BigDecimal.valueOf(poidsKg));
        c.setVolumeM3(BigDecimal.valueOf(volumeM3));
        c.setEtat(ColisEtat.EN_ATTENTE);
        return c;
    }

    // ──────────────────────────────────────────────
    // SCÉNARIO NOMINAL : 3 sacs formés
    // ──────────────────────────────────────────────

    @Test
    void lancerGroupageFormeTroisSacs() {
        // --- Mock : demandeRepository retourne les 3 demandes triées ---
        when(demandeRepository.rechercherParHubEtStatutOrderByDateDepart(
                tenantId, hubId, DemandeStatut.EN_ATTENTE_GROUPAGE))
                .thenReturn(List.of(demande1, demande2, demande3));

        // --- Mock : colisRepository retourne les colis par demande ---
        when(colisRepository.findByDemandeDemandeId(demande1.getDemandeId()))
                .thenReturn(List.of(c1, c2));
        when(colisRepository.findByDemandeDemandeId(demande2.getDemandeId()))
                .thenReturn(List.of(c3, c4, c5));
        when(colisRepository.findByDemandeDemandeId(demande3.getDemandeId()))
                .thenReturn(List.of(c6));

        // --- Mock : véhicule disponible = 1000kg / 10m3 ---
        when(vehiculeRepository.rechercherDisponiblesParHub(
                tenantId, hubId, VehiculeStatut.DISPONIBLE))
                .thenReturn(List.of(vehicule));

        // --- Mock : tenant ---
        when(pmeClienteRepository.findByTenantId(tenantId))
                .thenReturn(Optional.of(tenant));

        // --- Mock : findById pour la mise à jour GROUPEE ---
        when(demandeRepository.findById(demande1.getDemandeId()))
                .thenReturn(Optional.of(demande1));
        when(demandeRepository.findById(demande2.getDemandeId()))
                .thenReturn(Optional.of(demande2));
        when(demandeRepository.findById(demande3.getDemandeId()))
                .thenReturn(Optional.of(demande3));

        // --- Mock : BinPackingService résout le FFD ---
        // Colis triés par poids décroissant : C6(400), C1(300), C2(200), C4(250), C3(150), C5(100)
        // Indices dans la liste entrée au solver :
        //   [0]=C1(300/2.0), [1]=C2(200/1.5), [2]=C3(150/1.0), [3]=C4(250/2.5), [4]=C5(100/0.5), [5]=C6(400/3.0)
        // FFD après tri poids décroissant → indices: 5(C6), 0(C1), 3(C4), 1(C2), 2(C3), 4(C5)
        //
        // Sac 1: C6(400,3) + C1(300,2) = 700kg, 5.0m3  [indices 5,0]
        // Sac 2: C4(250,2.5) + C2(200,1.5) = 450kg, 4.0m3 [indices 3,1]
        // Sac 3: C3(150,1) + C5(100,0.5) = 250kg, 1.5m3 [indices 2,4]
        BinPackingService.SacFfd sacFfd1 = new BinPackingService.SacFfd(
                List.of(5, 0), 70000L, 500L);  // 700*100, 5*100
        BinPackingService.SacFfd sacFfd2 = new BinPackingService.SacFfd(
                List.of(3, 1), 45000L, 400L);  // 450*100, 4*100
        BinPackingService.SacFfd sacFfd3 = new BinPackingService.SacFfd(
                List.of(2, 4), 25000L, 150L);  // 250*100, 1.5*100

        BinPackingService.BinPackingResult bpResult =
                new BinPackingService.BinPackingResult(List.of(sacFfd1, sacFfd2, sacFfd3), 0);

        when(binPackingService.solve(anyList(), anyList(), eq(100000L), eq(1000L)))
                .thenReturn(bpResult);

        // --- Mock : sacRepository retourne l'entité passée ---
        when(sacRepository.save(any(Sac.class))).thenAnswer(inv -> {
            Sac s = inv.getArgument(0);
            s.setSacId(UUID.randomUUID());
            return s;
        });

        when(optimisationRunRepository.save(any(OptimisationRun.class))).thenAnswer(inv -> {
            OptimisationRun r = inv.getArgument(0);
            r.setRunId(UUID.randomUUID());
            return r;
        });

        // --- EXÉCUTION ---
        GroupageResult result = service.lancerGroupage(tenantId, hubId);

        // --- ASSERTIONS ---
        assertNotNull(result);
        assertNotNull(result.runId(), "Run ID doit être renvoyé");
        assertEquals(0, result.nbNonGroupes(), "Aucun colis non groupé");
        assertNotNull(result.justification(), "Justification générée");

        // 3 sacs formés
        assertEquals(3, result.sacs().size(), "3 sacs doivent être formés");

        // --- Sac 1 : C6 + C1 ---
        GroupageOrchestrationService.SacInfo sac1 = result.sacs().get(0);
        assertNotNull(sac1.sacId());
        assertEquals(2, sac1.nbColis());
        // taux = max(700/1000, 5/10) = max(70%, 50%) = 70%
        assertEquals(70.0, sac1.tauxRemplissage(), 0.5,
                "Sac 1 taux = max(poids 70%, volume 50%) = 70%");
        assertEquals(LocalDate.now(), sac1.dateDepartPlafond());
        assertTrue(sac1.departForce(), "departForce=true car today=dateDepartCalculee");

        // --- Sac 2 : C4 + C2 ---
        GroupageOrchestrationService.SacInfo sac2 = result.sacs().get(1);
        assertNotNull(sac2.sacId());
        assertEquals(2, sac2.nbColis());
        // taux = max(450/1000, 4/10) = max(45%, 40%) = 45%
        assertEquals(45.0, sac2.tauxRemplissage(), 0.5,
                "Sac 2 taux = max(poids 45%, volume 40%) = 45%");
        assertEquals(LocalDate.now(), sac2.dateDepartPlafond());
        assertTrue(sac2.departForce());

        // --- Sac 3 : C3 + C5 ---
        GroupageOrchestrationService.SacInfo sac3 = result.sacs().get(2);
        assertNotNull(sac3.sacId());
        assertEquals(2, sac3.nbColis());
        // taux = max(250/1000, 1.5/10) = max(25%, 15%) = 25%
        assertEquals(25.0, sac3.tauxRemplissage(), 0.5,
                "Sac 3 taux = max(poids 25%, volume 15%) = 25%");
        assertEquals(LocalDate.now(), sac3.dateDepartPlafond());
        assertTrue(sac3.departForce(), "Sac sous-seuil mais departForce → conservé");

        // --- Vérification sauvegarde ---
        verify(sacRepository, times(6)).save(any(Sac.class));
        verify(optimisationRunRepository, times(1)).save(any(OptimisationRun.class));

        // --- Vérification lien colis → sac ---
        verify(colisRepository, times(6)).save(any(Colis.class));
        for (Colis colis : List.of(c1, c2, c3, c4, c5, c6)) {
            assertNotNull(colis.getSac(), "Chaque colis doit être lié à un sac");
        }

        // --- Vérification statut demandes → GROUPEE ---
        assertEquals(DemandeStatut.GROUPEE, demande1.getStatut());
        assertEquals(DemandeStatut.GROUPEE, demande2.getStatut());
        assertEquals(DemandeStatut.GROUPEE, demande3.getStatut());
    }

    // ──────────────────────────────────────────────
    // SCÉNARIO SANS VÉHICULE : fallback 5000kg/20m3
    // ──────────────────────────────────────────────

    @Test
    void lancerGroupageAvecFallbackCapacite() {
        when(demandeRepository.rechercherParHubEtStatutOrderByDateDepart(
                tenantId, hubId, DemandeStatut.EN_ATTENTE_GROUPAGE))
                .thenReturn(List.of(demande1));

        when(colisRepository.findByDemandeDemandeId(demande1.getDemandeId()))
                .thenReturn(List.of(c1, c2));

        // Aucun véhicule disponible → fallback 5000kg/20m3
        when(vehiculeRepository.rechercherDisponiblesParHub(
                tenantId, hubId, VehiculeStatut.DISPONIBLE))
                .thenReturn(List.of());

        when(pmeClienteRepository.findByTenantId(tenantId))
                .thenReturn(Optional.of(tenant));

        // Avec 5000kg/20m3, C1(300/2)+C2(200/1.5) = 500kg/3.5m3 dans 1 sac
        BinPackingService.SacFfd sacFfd = new BinPackingService.SacFfd(
                List.of(0, 1), 50000L, 350L);
        BinPackingService.BinPackingResult bpResult =
                new BinPackingService.BinPackingResult(List.of(sacFfd), 0);

        when(binPackingService.solve(anyList(), anyList(), eq(500000L), eq(2000L)))
                .thenReturn(bpResult);

        when(sacRepository.save(any(Sac.class))).thenAnswer(inv -> {
            Sac s = inv.getArgument(0);
            s.setSacId(UUID.randomUUID());
            return s;
        });
        when(optimisationRunRepository.save(any(OptimisationRun.class))).thenAnswer(inv -> {
            OptimisationRun r = inv.getArgument(0);
            r.setRunId(UUID.randomUUID());
            return r;
        });

        GroupageResult result = service.lancerGroupage(tenantId, hubId);

        assertEquals(1, result.sacs().size());
        GroupageOrchestrationService.SacInfo sac = result.sacs().get(0);
        // taux = max(500/5000, 3.5/20) = max(10%, 17.5%) = 17.5%
        assertEquals(17.5, sac.tauxRemplissage(), 0.5,
                "Fallback : taux = max(poids 10%, volume 17.5%) = 17.5%");
    }

    // ──────────────────────────────────────────────
    // SCÉNARIO AUCUNE DEMANDE : retour vide
    // ──────────────────────────────────────────────

    @Test
    void lancerGroupageRetourneVideSiAucuneDemande() {
        when(demandeRepository.rechercherParHubEtStatutOrderByDateDepart(
                tenantId, hubId, DemandeStatut.EN_ATTENTE_GROUPAGE))
                .thenReturn(List.of());
        when(pmeClienteRepository.findByTenantId(tenantId))
                .thenReturn(Optional.of(tenant));

        GroupageResult result = service.lancerGroupage(tenantId, hubId);

        assertEquals(0, result.sacs().size());
        assertNull(result.runId());
        assertTrue(result.justification().contains("Aucune demande"));
    }

    // ──────────────────────────────────────────────
    // SCÉNARIO DEMANDE SANS COLIS
    // ──────────────────────────────────────────────

    @Test
    void lancerGroupageRetourneVideSiAucunColis() {
        when(demandeRepository.rechercherParHubEtStatutOrderByDateDepart(
                tenantId, hubId, DemandeStatut.EN_ATTENTE_GROUPAGE))
                .thenReturn(List.of(demande1));
        when(colisRepository.findByDemandeDemandeId(demande1.getDemandeId()))
                .thenReturn(List.of());
        when(pmeClienteRepository.findByTenantId(tenantId))
                .thenReturn(Optional.of(tenant));

        GroupageResult result = service.lancerGroupage(tenantId, hubId);

        assertEquals(0, result.sacs().size());
        assertTrue(result.justification().contains("aucun colis"));
    }

    // ──────────────────────────────────────────────
    // SCÉNARIO SEUIL ÉLEVÉ (80%) + PAS DE DEPART FORCE
    // → les sacs sous-seuil et non urgents ne sont PAS persistés
    // ──────────────────────────────────────────────

    @Test
    void lancerGroupageFiltreSacsSousSeuilSansDepartForce() {
        // Seuil = 80%, dateDepartCalculee = demain (pas de departForce)
        tenant.setSeuilRemplissageMin(new BigDecimal("80.00"));
        demande1.setDateDepartCalculee(LocalDate.now().plusDays(1));

        when(demandeRepository.rechercherParHubEtStatutOrderByDateDepart(
                tenantId, hubId, DemandeStatut.EN_ATTENTE_GROUPAGE))
                .thenReturn(List.of(demande1));

        when(colisRepository.findByDemandeDemandeId(demande1.getDemandeId()))
                .thenReturn(List.of(c1, c2));

        when(vehiculeRepository.rechercherDisponiblesParHub(
                tenantId, hubId, VehiculeStatut.DISPONIBLE))
                .thenReturn(List.of(vehicule));

        when(pmeClienteRepository.findByTenantId(tenantId))
                .thenReturn(Optional.of(tenant));

        // FFD → 1 sac : C1+C2 = 500kg/3.5m3 → taux 50% < 80% → filtre
        BinPackingService.SacFfd sacFfd = new BinPackingService.SacFfd(
                List.of(0, 1), 50000L, 350L);
        BinPackingService.BinPackingResult bpResult =
                new BinPackingService.BinPackingResult(List.of(sacFfd), 0);

        when(binPackingService.solve(anyList(), anyList(), anyLong(), anyLong()))
                .thenReturn(bpResult);

        GroupageResult result = service.lancerGroupage(tenantId, hubId);

        // Sac à 50% < seuil 80% et dateDepart=demain → PAS conservé
        assertEquals(0, result.sacs().size(),
                "Sac sous-seuil sans departForce ne doit pas être persisté");
        verify(sacRepository, never()).save(any(Sac.class));
    }

    // ──────────────────────────────────────────────
    // VÉRIFICATION : contenu du JSON du run optimisation
    // ──────────────────────────────────────────────

    @Test
    void lancerGroupagePersisteOptimisationRunAvecJustification() {
        when(demandeRepository.rechercherParHubEtStatutOrderByDateDepart(
                tenantId, hubId, DemandeStatut.EN_ATTENTE_GROUPAGE))
                .thenReturn(List.of(demande1));

        when(colisRepository.findByDemandeDemandeId(demande1.getDemandeId()))
                .thenReturn(List.of(c1, c2));

        when(vehiculeRepository.rechercherDisponiblesParHub(
                tenantId, hubId, VehiculeStatut.DISPONIBLE))
                .thenReturn(List.of(vehicule));

        when(pmeClienteRepository.findByTenantId(tenantId))
                .thenReturn(Optional.of(tenant));

        BinPackingService.SacFfd sacFfd = new BinPackingService.SacFfd(
                List.of(0, 1), 50000L, 350L);
        BinPackingService.BinPackingResult bpResult =
                new BinPackingService.BinPackingResult(List.of(sacFfd), 0);
        when(binPackingService.solve(anyList(), anyList(), anyLong(), anyLong()))
                .thenReturn(bpResult);

        when(sacRepository.save(any(Sac.class))).thenAnswer(inv -> {
            Sac s = inv.getArgument(0);
            s.setSacId(UUID.randomUUID());
            return s;
        });
        when(optimisationRunRepository.save(any(OptimisationRun.class))).thenAnswer(inv -> {
            OptimisationRun r = inv.getArgument(0);
            r.setRunId(UUID.randomUUID());
            return r;
        });

        service.lancerGroupage(tenantId, hubId);

        // Vérifier le run persisté
        verify(optimisationRunRepository).save(argThat(run -> {
            assertEquals(TypeAlgorithme.BIN_PACKING, run.getTypeAlgorithme());
            assertEquals(tenant, run.getPmeCliente());
            assertNotNull(run.getHub());
            assertEquals(hubId, run.getHub().getHubId());
            assertNotNull(run.getParametres());
            assertTrue(run.getParametres().contains("1000"), "parametres contient capPoids");
            assertTrue(run.getParametres().contains("10"), "parametres contient capVolume");
            assertTrue(run.getParametres().contains("FFD_BIN_PACKING"));
            assertNotNull(run.getResultat());
            assertTrue(run.getResultat().contains("sacs"));
            assertNotNull(run.getJustificationDocument());
            assertTrue(run.getJustificationDocument().contains("FFD"));
            assertTrue(run.getJustificationDocument().contains("First Fit Decreasing"));
            return true;
        }));
    }

    // ──────────────────────────────────────────────
    // VÉRIFICATION : colonnes sac après persistance
    // ──────────────────────────────────────────────

    @Test
    void lancerGroupageSacsOntBonnesColonnes() {
        when(demandeRepository.rechercherParHubEtStatutOrderByDateDepart(
                tenantId, hubId, DemandeStatut.EN_ATTENTE_GROUPAGE))
                .thenReturn(List.of(demande1));
        when(colisRepository.findByDemandeDemandeId(demande1.getDemandeId()))
                .thenReturn(List.of(c1));
        when(vehiculeRepository.rechercherDisponiblesParHub(
                tenantId, hubId, VehiculeStatut.DISPONIBLE))
                .thenReturn(List.of(vehicule));
        when(pmeClienteRepository.findByTenantId(tenantId))
                .thenReturn(Optional.of(tenant));

        BinPackingService.SacFfd sacFfd = new BinPackingService.SacFfd(
                List.of(0), 30000L, 200L);
        BinPackingService.BinPackingResult bpResult =
                new BinPackingService.BinPackingResult(List.of(sacFfd), 0);
        when(binPackingService.solve(anyList(), anyList(), anyLong(), anyLong()))
                .thenReturn(bpResult);

        when(sacRepository.save(any(Sac.class))).thenAnswer(inv -> {
            Sac s = inv.getArgument(0);
            s.setSacId(UUID.randomUUID());
            return s;
        });
        when(optimisationRunRepository.save(any(OptimisationRun.class))).thenAnswer(inv -> {
            OptimisationRun r = inv.getArgument(0);
            r.setRunId(UUID.randomUUID());
            return r;
        });

        service.lancerGroupage(tenantId, hubId);

        verify(sacRepository, atLeastOnce()).save(argThat(sac -> {
            assertEquals(tenant, sac.getPmeCliente());
            assertEquals(hubId, sac.getHub().getHubId());
            assertEquals(SacStatut.CONSTITUE, sac.getStatut());
            assertEquals(LocalDate.now(), sac.getDateDepartPlafond());
            assertEquals(LocalDate.now(), sac.getDateDepartPrevue());
            assertNotNull(sac.getTauxRemplissage());
            // taux = max(300/1000, 2/10) = max(30%, 20%) = 30%
            assertEquals(30.0, sac.getTauxRemplissage().doubleValue(), 0.5);
            assertNotNull(sac.getCategorieDominante());
            assertNull(sac.getVehicule(), "Pas encore affecté");
            assertNull(sac.getChauffeur(), "Pas encore affecté");
            return true;
        }));
    }
}
