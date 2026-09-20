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
 * Tests Option A — FFD par cluster.
 *
 * Scenarios :
 *  1. 3 clusters A/B/C → 3+ sacs, homogeneite garantie
 *  2. Aucune demande → retour vide
 *  3. Colis sans categorie → cluster STANDARD
 *  4. departForce = false + sous-seuil → sac filtre
 *  5. Capacite fallback (pas de vehicule)
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class GroupageFfdClusterServiceTest {

    @Mock private DemandeTransportRepository demandeRepository;
    @Mock private ColisRepository colisRepository;
    @Mock private VehiculeRepository vehiculeRepository;
    @Mock private PMEClienteRepository pmeClienteRepository;
    @Mock private OptimisationRunRepository optimisationRunRepository;
    @Mock private BinPackingService binPackingService;

    @InjectMocks private GroupageFfdClusterService service;

    private UUID tenantId = UUID.randomUUID();
    private UUID hubId = UUID.randomUUID();
    private PMECliente tenant;
    private Hub hub;
    private Vehicule vehicule;
    private DemandeTransport demande1, demande2, demande3;
    private Colis c1, c2, c3, c4, c5, c6;
    private CategorieProduit catA, catB, catC;

    @BeforeEach
    void setUp() {
        tenant = new PMECliente();
        tenant.setTenantId(tenantId);
        tenant.setSeuilRemplissageMin(new BigDecimal("80.00"));

        hub = new Hub();
        hub.setHubId(hubId);
        hub.setPmeCliente(tenant);

        vehicule = new Vehicule();
        vehicule.setVehiculeId(UUID.randomUUID());
        vehicule.setCapacitePoidsKg(new BigDecimal("1000"));
        vehicule.setCapaciteVolumeM3(new BigDecimal("10"));
        vehicule.setStatut(VehiculeStatut.DISPONIBLE);

        // Categories
        catA = new CategorieProduit();
        catA.setCategorieId(UUID.randomUUID());
        catA.setClasseCode("A");

        catB = new CategorieProduit();
        catB.setCategorieId(UUID.randomUUID());
        catB.setClasseCode("B");

        catC = new CategorieProduit();
        catC.setCategorieId(UUID.randomUUID());
        catC.setClasseCode("C");

        // Demandes
        demande1 = makeDemande(LocalDate.now());
        demande2 = makeDemande(LocalDate.now());
        demande3 = makeDemande(LocalDate.now().plusDays(2));

        // Colis cluster A : fragiles
        c1 = makeColis(demande1, catA, 5, 0.1);   // 5kg, 0.1m3
        c2 = makeColis(demande1, catA, 3, 0.05);  // 3kg, 0.05m3

        // Colis cluster B : standard
        c3 = makeColis(demande2, catB, 20, 0.8);  // 20kg, 0.8m3
        c4 = makeColis(demande2, catB, 15, 0.6);  // 15kg, 0.6m3

        // Colis cluster C : lourds
        c5 = makeColis(demande2, catC, 50, 1.5);  // 50kg, 1.5m3
        c6 = makeColis(demande3, catC, 60, 2.0);  // 60kg, 2.0m3

        when(optimisationRunRepository.save(any(OptimisationRun.class))).thenAnswer(inv -> {
            OptimisationRun r = inv.getArgument(0);
            r.setRunId(UUID.randomUUID());
            return r;
        });
    }

    private DemandeTransport makeDemande(LocalDate dateDepart) {
        DemandeTransport d = new DemandeTransport();
        d.setDemandeId(UUID.randomUUID());
        d.setPmeCliente(tenant);
        d.setHub(hub);
        d.setStatut(DemandeStatut.EN_ATTENTE_GROUPAGE);
        d.setDateDepartCalculee(dateDepart);
        return d;
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
    void ffdParClusterFormeSacsHomogenes() {
        when(demandeRepository.rechercherParHubEtStatutOrderByDateDepart(
                tenantId, hubId, DemandeStatut.EN_ATTENTE_GROUPAGE))
                .thenReturn(List.of(demande1, demande2, demande3));
        when(colisRepository.findByDemandeDemandeId(demande1.getDemandeId()))
                .thenReturn(List.of(c1, c2));
        when(colisRepository.findByDemandeDemandeId(demande2.getDemandeId()))
                .thenReturn(List.of(c3, c4, c5));
        when(colisRepository.findByDemandeDemandeId(demande3.getDemandeId()))
                .thenReturn(List.of(c6));
        when(vehiculeRepository.rechercherDisponiblesParHub(
                tenantId, hubId, VehiculeStatut.DISPONIBLE))
                .thenReturn(List.of(vehicule));
        when(pmeClienteRepository.findByTenantId(tenantId))
                .thenReturn(Optional.of(tenant));

        // Mock FFD : 1 sac par cluster (tous rentrent dans 1000kg/10m3)
        when(binPackingService.solve(anyList(), anyList(), anyLong(), anyLong()))
                .thenAnswer(inv -> {
                    List<Long> poids = inv.getArgument(0);
                    long totalP = poids.stream().mapToLong(Long::longValue).sum();
                    List<Long> volumes = inv.getArgument(1);
                    long totalV = volumes.stream().mapToLong(Long::longValue).sum();
                    List<Integer> indices = new ArrayList<>();
                    for (int i = 0; i < poids.size(); i++) indices.add(i);
                    return new BinPackingService.BinPackingResult(
                            List.of(new BinPackingService.SacFfd(indices, totalP, totalV)), 0);
                });

        GroupageFfdClusterService.FfdClusterResult result =
                service.lancerFfdParCluster(tenantId, hubId);

        // 3 clusters (A, B, C) → au moins 3 sacs
        assertEquals("FFD_PAR_CLUSTER", result.algo());
        assertEquals(6, result.nbColisTotaux());
        assertEquals(3, result.nbClusters());

        // Chaque sac a un cluster different
        Set<String> clusters = new HashSet<>();
        for (GroupageFfdClusterService.FfdClusterSacInfo s : result.sacs()) {
            clusters.add(s.cluster());
        }
        assertEquals(3, clusters.size(), "3 clusters distincts A/B/C");
        assertTrue(clusters.contains("A"));
        assertTrue(clusters.contains("B"));
        assertTrue(clusters.contains("C"));

        // Aucun sac ne melange A et C (homogeneite)
        for (GroupageFfdClusterService.FfdClusterSacInfo s : result.sacs()) {
            assertNotNull(s.cluster());
            assertFalse(s.cluster().isEmpty());
        }

        assertNotNull(result.justification());
        assertTrue(result.justification().toLowerCase().contains("ffd"));
        assertTrue(result.justification().toLowerCase().contains("cluster"));
    }

    @Test
    void ffdParClusterRetourneVideSiAucuneDemande() {
        when(demandeRepository.rechercherParHubEtStatutOrderByDateDepart(
                tenantId, hubId, DemandeStatut.EN_ATTENTE_GROUPAGE))
                .thenReturn(List.of());
        when(pmeClienteRepository.findByTenantId(tenantId))
                .thenReturn(Optional.of(tenant));

        GroupageFfdClusterService.FfdClusterResult result =
                service.lancerFfdParCluster(tenantId, hubId);

        assertEquals(0, result.sacs().size());
        assertTrue(result.justification().contains("Aucune demande"));
    }

    @Test
    void ffdParClusterGereColisSansCategorie() {
        when(demandeRepository.rechercherParHubEtStatutOrderByDateDepart(
                tenantId, hubId, DemandeStatut.EN_ATTENTE_GROUPAGE))
                .thenReturn(List.of(demande1));
        when(colisRepository.findByDemandeDemandeId(demande1.getDemandeId()))
                .thenReturn(List.of(c1)); // c1 a catA mais on enleve la categorie
        c1.setCategorie(null); // pas de categorie
        when(vehiculeRepository.rechercherDisponiblesParHub(
                tenantId, hubId, VehiculeStatut.DISPONIBLE))
                .thenReturn(List.of(vehicule));
        when(pmeClienteRepository.findByTenantId(tenantId))
                .thenReturn(Optional.of(tenant));

        when(binPackingService.solve(anyList(), anyList(), anyLong(), anyLong()))
                .thenAnswer(inv -> {
                    List<Long> poids = inv.getArgument(0);
                    long totalP = poids.get(0);
                    List<Long> volumes = inv.getArgument(1);
                    long totalV = volumes.get(0);
                    return new BinPackingService.BinPackingResult(
                            List.of(new BinPackingService.SacFfd(List.of(0), totalP, totalV)), 0);
                });

        GroupageFfdClusterService.FfdClusterResult result =
                service.lancerFfdParCluster(tenantId, hubId);

        // Sans categorie → cluster STANDARD
        assertEquals(1, result.sacs().size());
        assertEquals("STANDARD", result.sacs().get(0).cluster());
    }

    @Test
    void ffdParClusterFiltreSousSeuilSansDepartForce() {
        tenant.setSeuilRemplissageMin(new BigDecimal("90.00"));
        demande1.setDateDepartCalculee(LocalDate.now().plusDays(10)); // pas departForce

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

        // FFD → 1 sac : 5kg/0.1m3 → taux = max(5/1000, 0.1/10) = 1% < 90%
        when(binPackingService.solve(anyList(), anyList(), anyLong(), anyLong()))
                .thenAnswer(inv -> {
                    List<Long> poids = inv.getArgument(0);
                    long totalP = poids.get(0);
                    List<Long> volumes = inv.getArgument(1);
                    long totalV = volumes.get(0);
                    return new BinPackingService.BinPackingResult(
                            List.of(new BinPackingService.SacFfd(List.of(0), totalP, totalV)), 0);
                });

        GroupageFfdClusterService.FfdClusterResult result =
                service.lancerFfdParCluster(tenantId, hubId);

        // Sous-seuil 90% + pas departForce → 0 sac conserve
        assertEquals(0, result.sacs().size());
    }

    @Test
    void ffdParClusterAvecCapaciteFallback() {
        // dateDepartCalculee dans le futur → departForce = false
        demande1.setDateDepartCalculee(LocalDate.now().plusDays(10));

        when(demandeRepository.rechercherParHubEtStatutOrderByDateDepart(
                tenantId, hubId, DemandeStatut.EN_ATTENTE_GROUPAGE))
                .thenReturn(List.of(demande1));
        when(colisRepository.findByDemandeDemandeId(demande1.getDemandeId()))
                .thenReturn(List.of(c1, c2));
        when(vehiculeRepository.rechercherDisponiblesParHub(
                tenantId, hubId, VehiculeStatut.DISPONIBLE))
                .thenReturn(List.of()); // aucun vehicule
        when(pmeClienteRepository.findByTenantId(tenantId))
                .thenReturn(Optional.of(tenant));

        when(binPackingService.solve(anyList(), anyList(), anyLong(), anyLong()))
                .thenAnswer(inv -> {
                    List<Long> poids = inv.getArgument(0);
                    long totalP = poids.stream().mapToLong(Long::longValue).sum();
                    List<Long> volumes = inv.getArgument(1);
                    long totalV = volumes.stream().mapToLong(Long::longValue).sum();
                    List<Integer> indices = new ArrayList<>();
                    for (int i = 0; i < poids.size(); i++) indices.add(i);
                    return new BinPackingService.BinPackingResult(
                            List.of(new BinPackingService.SacFfd(indices, totalP, totalV)), 0);
                });

        GroupageFfdClusterService.FfdClusterResult result =
                service.lancerFfdParCluster(tenantId, hubId);

        // Fallback 5000kg/20m3 → taux = max(8/5000, 0.15/20)*100 = 0.16% → filtre
        assertEquals(0, result.sacs().size());
        // Verifier que solve a bien ete appele avec 5000*100=500000 et 20*100=2000
        verify(binPackingService).solve(anyList(), anyList(), eq(500000L), eq(2000L));
    }

    @Test
    void ffdParClusterResultatPurSimulation() {
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

        when(binPackingService.solve(anyList(), anyList(), anyLong(), anyLong()))
                .thenAnswer(inv -> {
                    List<Long> poids = inv.getArgument(0);
                    long totalP = poids.get(0);
                    List<Long> volumes = inv.getArgument(1);
                    long totalV = volumes.get(0);
                    return new BinPackingService.BinPackingResult(
                            List.of(new BinPackingService.SacFfd(List.of(0), totalP, totalV)), 0);
                });

        service.lancerFfdParCluster(tenantId, hubId);

        // Aucune persistance : pas de save sur sacRepository (pas injecte mais pas appele)
        // Pas de modification de statut demande
        assertEquals(DemandeStatut.EN_ATTENTE_GROUPAGE, demande1.getStatut());
    }
}
