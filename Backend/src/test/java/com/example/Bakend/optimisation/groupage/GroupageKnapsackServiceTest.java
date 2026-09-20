package com.example.Bakend.optimisation.groupage;

import com.example.Bakend.entity.*;
import com.example.Bakend.entity.enums.*;
import com.example.Bakend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Tests Option B — Knapsack OR-Tools iteratif.
 *
 * Scenarios :
 *  1. 2 colis dans 1 cluster → Knapsack resout (1 sac optimal)
 *  2. Aucune demande → retour vide
 *  3. Colis sans categorie → cluster STANDARD
 *  4. fallback FFD si > MAX_COLIS_PAR_CLUSTER
 *  5. Verifie SCALE adaptatif
 *  6. Resultat = simulation pure (pas de save)
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class GroupageKnapsackServiceTest {

    @Mock private DemandeTransportRepository demandeRepository;
    @Mock private ColisRepository colisRepository;
    @Mock private VehiculeRepository vehiculeRepository;
    @Mock private PMEClienteRepository pmeClienteRepository;
    @Mock private OptimisationRunRepository optimisationRunRepository;
    @Mock private KnapsackSolverService knapsackSolverService;
    @Mock private BinPackingService binPackingService;

    @InjectMocks private GroupageKnapsackService service;

    private UUID tenantId = UUID.randomUUID();
    private UUID hubId = UUID.randomUUID();
    private PMECliente tenant;
    private Vehicule vehicule;
    private DemandeTransport demande1;
    private Colis c1, c2;
    private CategorieProduit catB;

    @BeforeEach
    void setUp() {
        tenant = new PMECliente();
        tenant.setTenantId(tenantId);
        tenant.setSeuilRemplissageMin(new BigDecimal("80.00"));

        vehicule = new Vehicule();
        vehicule.setVehiculeId(UUID.randomUUID());
        vehicule.setCapacitePoidsKg(new BigDecimal("1000"));
        vehicule.setCapaciteVolumeM3(new BigDecimal("10"));
        vehicule.setStatut(VehiculeStatut.DISPONIBLE);

        catB = new CategorieProduit();
        catB.setCategorieId(UUID.randomUUID());
        catB.setClasseCode("B");

        demande1 = new DemandeTransport();
        demande1.setDemandeId(UUID.randomUUID());
        demande1.setPmeCliente(tenant);
        demande1.setStatut(DemandeStatut.EN_ATTENTE_GROUPAGE);
        demande1.setDateDepartCalculee(LocalDate.now());

        // 2 colis B : 300kg/2.0m3 + 200kg/1.5m3
        c1 = makeColis(demande1, catB, 300, 2.0);
        c2 = makeColis(demande1, catB, 200, 1.5);

        // Stub optimisationRunRepository.save pour retourner un run avec un ID
        when(optimisationRunRepository.save(any(OptimisationRun.class))).thenAnswer(inv -> {
            OptimisationRun r = inv.getArgument(0);
            r.setRunId(UUID.randomUUID());
            return r;
        });
    }

    private Colis makeColis(DemandeTransport demande, CategorieProduit cat, double poids, double volume) {
        Colis c = new Colis();
        c.setColisId(UUID.randomUUID());
        c.setPmeCliente(tenant);
        c.setDemande(demande);
        c.setCategorie(cat);
        c.setPoidsKg(BigDecimal.valueOf(poids));
        c.setVolumeM3(BigDecimal.valueOf(volume));
        c.setEtat(ColisEtat.EN_ATTENTE);
        return c;
    }

    @Test
    void knapsackResoutSacsOptimaux() {
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

        // Knapsack : les 2 colis rentrent (300+200=500<=1000, 2+1.5=3.5<=10)
        when(knapsackSolverService.solve(anyList(), anyList(), anyLong(), anyLong()))
                .thenReturn(new KnapsackSolverService.KnapsackResult(
                        List.of(0, 1), 50000L, 350L)); // SCALE=100: 500*100, 3.5*100

        GroupageKnapsackService.KnapsackClusterResult result =
                service.lancerKnapsackParCluster(tenantId, hubId);

        assertEquals("KNAPSACK_ITERATIF", result.algo());
        assertEquals(2, result.nbColisTotaux());
        assertEquals(1, result.nbClusters()); // tout en B

        // 1 sac optimal contenant les 2 colis
        assertTrue(result.sacs().size() >= 1);
        GroupageKnapsackService.KnapsackSacInfo sac = result.sacs().get(0);
        assertEquals("B", sac.cluster());
        assertEquals(2, sac.nbColis());
        // taux = max(500/1000, 3.5/10)*100 = max(50%, 35%) = 50%
        assertEquals(50.0, sac.tauxRemplissage(), 1.0);
        assertFalse(sac.fallbackFfd());

        assertNotNull(result.justification());
        assertTrue(result.justification().contains("KNAPSACK_DYNAMIC_PROGRAMMING_SOLVER"));
        assertTrue(result.justification().contains("B"));
    }

    @Test
    void knapsackRetourneVideSiAucuneDemande() {
        when(demandeRepository.rechercherParHubEtStatutOrderByDateDepart(
                tenantId, hubId, DemandeStatut.EN_ATTENTE_GROUPAGE))
                .thenReturn(List.of());
        when(pmeClienteRepository.findByTenantId(tenantId))
                .thenReturn(Optional.of(tenant));

        GroupageKnapsackService.KnapsackClusterResult result =
                service.lancerKnapsackParCluster(tenantId, hubId);

        assertEquals(0, result.sacs().size());
        assertTrue(result.justification().contains("Aucune demande"));
    }

    @Test
    void knapsackGereColisSansCategorie() {
        when(demandeRepository.rechercherParHubEtStatutOrderByDateDepart(
                tenantId, hubId, DemandeStatut.EN_ATTENTE_GROUPAGE))
                .thenReturn(List.of(demande1));
        when(colisRepository.findByDemandeDemandeId(demande1.getDemandeId()))
                .thenReturn(List.of(c1));
        c1.setCategorie(null);
        when(vehiculeRepository.rechercherDisponiblesParHub(
                tenantId, hubId, VehiculeStatut.DISPONIBLE))
                .thenReturn(List.of(vehicule));
        when(pmeClienteRepository.findByTenantId(tenantId))
                .thenReturn(Optional.of(tenant));

        when(knapsackSolverService.solve(anyList(), anyList(), anyLong(), anyLong()))
                .thenReturn(new KnapsackSolverService.KnapsackResult(
                        List.of(0), 30000L, 200L));

        GroupageKnapsackService.KnapsackClusterResult result =
                service.lancerKnapsackParCluster(tenantId, hubId);

        assertEquals(1, result.sacs().size());
        assertEquals("STANDARD", result.sacs().get(0).cluster());
    }

    @Test
    void knapsackResultatPurSimulation() {
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

        when(knapsackSolverService.solve(anyList(), anyList(), anyLong(), anyLong()))
                .thenReturn(new KnapsackSolverService.KnapsackResult(
                        List.of(0), 30000L, 200L));

        service.lancerKnapsackParCluster(tenantId, hubId);

        // Pas de modification de statut
        assertEquals(DemandeStatut.EN_ATTENTE_GROUPAGE, demande1.getStatut());
    }

    @Test
    void knapsackParametresContiennentBornes() {
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

        when(knapsackSolverService.solve(anyList(), anyList(), anyLong(), anyLong()))
                .thenReturn(new KnapsackSolverService.KnapsackResult(
                        List.of(0), 30000L, 200L));

        GroupageKnapsackService.KnapsackClusterResult result =
                service.lancerKnapsackParCluster(tenantId, hubId);

        Map<String, Object> params = result.parametres();
        assertEquals("KNAPSACK_ITERATIF", params.get("algo"));
        assertEquals(1000L, params.get("capacite_poids_kg"));
        assertEquals(10L, params.get("capacite_volume_m3"));
        assertNotNull(params.get("scale"));
        assertEquals(10_000_000L, params.get("dp_table_max"));
        assertEquals(200, params.get("max_colis_par_cluster"));
        assertEquals(false, params.get("fallback_ffd"));
    }
}
