package com.example.Bakend.optimisation.groupage;

import com.example.Bakend.dto.optimisation.GroupagePreviewResponse;
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
 * Tests du fix knapsack : seuil sur lot global au lieu de par-cluster.
 *
 * Scenarios :
 *  1. Lot fragmente (A/B/C) dont le taux global passe le seuil → 3 sacs (pas 0)
 *  2. Lot sous-seuil global, pas de depart force → 0 sacs
 *  3. Lot sous-seuil global mais depart force → sacs créés
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class GroupageSimulationServiceKnapsackTest {

    @Mock private DemandeTransportRepository demandeRepository;
    @Mock private ColisRepository colisRepository;
    @Mock private VehiculeRepository vehiculeRepository;
    @Mock private PMEClienteRepository pmeClienteRepository;
    @Mock private OptimisationRunRepository optimisationRunRepository;
    @Mock private SacRepository sacRepository;
    @Mock private BinPackingService binPackingService;
    @Mock private KnapsackSolverService knapsackSolverService;

    @InjectMocks private GroupageSimulationService service;

    private UUID tenantId = UUID.randomUUID();
    private UUID hubId = UUID.randomUUID();
    private PMECliente tenant;
    private Vehicule vehicule10t;
    private DemandeTransport demande;
    private CategorieProduit catA, catB, catC;

    @BeforeEach
    void setUp() {
        tenant = new PMECliente();
        tenant.setTenantId(tenantId);
        tenant.setSeuilRemplissageMin(new BigDecimal("10.00"));

        vehicule10t = new Vehicule();
        vehicule10t.setVehiculeId(UUID.randomUUID());
        vehicule10t.setCapacitePoidsKg(new BigDecimal("10000"));
        vehicule10t.setCapaciteVolumeM3(new BigDecimal("800"));
        vehicule10t.setStatut(VehiculeStatut.DISPONIBLE);

        demande = new DemandeTransport();
        demande.setDemandeId(UUID.randomUUID());
        demande.setPmeCliente(tenant);
        demande.setStatut(DemandeStatut.EN_ATTENTE_GROUPAGE);
        demande.setDateDepartCalculee(LocalDate.now().plusDays(8));

        catA = new CategorieProduit();
        catA.setCategorieId(UUID.randomUUID());
        catA.setClasseCode("A");

        catB = new CategorieProduit();
        catB.setCategorieId(UUID.randomUUID());
        catB.setClasseCode("B");

        catC = new CategorieProduit();
        catC.setCategorieId(UUID.randomUUID());
        catC.setClasseCode("C");

        when(optimisationRunRepository.save(any(OptimisationRun.class))).thenAnswer(inv -> {
            OptimisationRun r = inv.getArgument(0);
            r.setRunId(UUID.randomUUID());
            return r;
        });
    }

    private Colis makeColis(CategorieProduit cat, double poids, double volume) {
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
    void knapsackLotFragmenteSeuilGlobalPasse() {
        // Lot type trans : A=39kg/9m3, B=27kg/67m3, C=50kg/5m3
        // Total=116kg/81m3, taux=max(116/10000,81/800)*100=10.13% >= seuil 10%
        // Chaque cluster seul est sous le seuil (A=1.13%, B=8.38%, C=0.63%)
        List<Colis> colisList = List.of(
                makeColis(catA, 10, 3),
                makeColis(catA, 29, 6),
                makeColis(catB, 8, 22),
                makeColis(catB, 7, 20),
                makeColis(catB, 12, 25),
                makeColis(catC, 50, 5),
                makeColis(catB, 1, 3)
        );

        when(demandeRepository.rechercherParHubEtStatutOrderByDateDepart(
                tenantId, hubId, DemandeStatut.EN_ATTENTE_GROUPAGE))
                .thenReturn(List.of(demande));
        when(colisRepository.findByDemandeDemandeId(demande.getDemandeId()))
                .thenReturn(colisList);
        when(vehiculeRepository.rechercherDisponiblesParHub(
                tenantId, hubId, VehiculeStatut.DISPONIBLE))
                .thenReturn(List.of(vehicule10t));
        when(pmeClienteRepository.findByTenantId(tenantId))
                .thenReturn(Optional.of(tenant));

        // Knapsack résout séparément par cluster (retourne les indices dans le sous-ensemble)
        when(knapsackSolverService.solve(anyList(), anyList(), anyLong(), anyLong()))
                .thenAnswer(inv -> {
                    List<Long> poids = inv.getArgument(0);
                    List<Long> volumes = inv.getArgument(1);
                    // Inclure tous les items qui rentrent
                    List<Integer> all = new ArrayList<>();
                    for (int i = 0; i < poids.size(); i++) all.add(i);
                    long sumP = poids.stream().mapToLong(Long::longValue).sum();
                    long sumV = volumes.stream().mapToLong(Long::longValue).sum();
                    return new KnapsackSolverService.KnapsackResult(all, sumP, sumV);
                });

        GroupagePreviewResponse result = service.preview(tenantId, hubId, TypeAlgorithme.KNAPSACK);

        // Le fix : lot global >= seuil → les 3 clusters sont acceptés
        assertFalse(result.sacs().isEmpty(),
                "Knapsack devrait retourner des sacs quand le taux global (10.13%) dépasse le seuil (10%)");
        assertEquals(3, result.sacs().size(), "3 clusters → 3 sacs");

        Set<String> clusters = new HashSet<>();
        for (GroupagePreviewResponse.SacPreview sac : result.sacs()) {
            clusters.add(sac.cluster());
            assertTrue(sac.nbColis() > 0, "Chaque sac doit avoir au moins 1 colis");
        }
        assertEquals(Set.of("A", "B", "C"), clusters, "Tous les clusters doivent être représentés");

        int totalColis = result.sacs().stream().mapToInt(GroupagePreviewResponse.SacPreview::nbColis).sum();
        assertEquals(7, totalColis, "7 colis au total");
    }

    @Test
    void knapsackLotSousSeuilEtPasDepartForce() {
        // Lot à 5% global, seuil 10%, depart dans 8 jours → 0 sacs
        List<Colis> colisList = List.of(
                makeColis(catA, 10, 3),
                makeColis(catB, 8, 5),
                makeColis(catC, 15, 2)
        );

        when(demandeRepository.rechercherParHubEtStatutOrderByDateDepart(
                tenantId, hubId, DemandeStatut.EN_ATTENTE_GROUPAGE))
                .thenReturn(List.of(demande));
        when(colisRepository.findByDemandeDemandeId(demande.getDemandeId()))
                .thenReturn(colisList);
        when(vehiculeRepository.rechercherDisponiblesParHub(
                tenantId, hubId, VehiculeStatut.DISPONIBLE))
                .thenReturn(List.of(vehicule10t));
        when(pmeClienteRepository.findByTenantId(tenantId))
                .thenReturn(Optional.of(tenant));

        when(knapsackSolverService.solve(anyList(), anyList(), anyLong(), anyLong()))
                .thenAnswer(inv -> {
                    List<Long> poids = inv.getArgument(0);
                    List<Long> volumes = inv.getArgument(1);
                    List<Integer> all = new ArrayList<>();
                    for (int i = 0; i < poids.size(); i++) all.add(i);
                    long sumP = poids.stream().mapToLong(Long::longValue).sum();
                    long sumV = volumes.stream().mapToLong(Long::longValue).sum();
                    return new KnapsackSolverService.KnapsackResult(all, sumP, sumV);
                });

        GroupagePreviewResponse result = service.preview(tenantId, hubId, TypeAlgorithme.KNAPSACK);

        assertTrue(result.sacs().isEmpty(),
                "Pas de sac quand le taux global (5%) est sous le seuil (10%) et pas de depart force");
    }

    @Test
    void knapsackLotSousSeuilMaisDepartForce() {
        // Lot à 5% global, seuil 10%, mais date_depart = today → departForce = true
        demande.setDateDepartCalculee(LocalDate.now());

        List<Colis> colisList = List.of(
                makeColis(catA, 10, 3),
                makeColis(catB, 8, 5),
                makeColis(catC, 15, 2)
        );

        when(demandeRepository.rechercherParHubEtStatutOrderByDateDepart(
                tenantId, hubId, DemandeStatut.EN_ATTENTE_GROUPAGE))
                .thenReturn(List.of(demande));
        when(colisRepository.findByDemandeDemandeId(demande.getDemandeId()))
                .thenReturn(colisList);
        when(vehiculeRepository.rechercherDisponiblesParHub(
                tenantId, hubId, VehiculeStatut.DISPONIBLE))
                .thenReturn(List.of(vehicule10t));
        when(pmeClienteRepository.findByTenantId(tenantId))
                .thenReturn(Optional.of(tenant));

        when(knapsackSolverService.solve(anyList(), anyList(), anyLong(), anyLong()))
                .thenAnswer(inv -> {
                    List<Long> poids = inv.getArgument(0);
                    List<Long> volumes = inv.getArgument(1);
                    List<Integer> all = new ArrayList<>();
                    for (int i = 0; i < poids.size(); i++) all.add(i);
                    long sumP = poids.stream().mapToLong(Long::longValue).sum();
                    long sumV = volumes.stream().mapToLong(Long::longValue).sum();
                    return new KnapsackSolverService.KnapsackResult(all, sumP, sumV);
                });

        GroupagePreviewResponse result = service.preview(tenantId, hubId, TypeAlgorithme.KNAPSACK);

        assertFalse(result.sacs().isEmpty(),
                "Sacs créés malgré sous-seuil global quand departForce est true");
    }
}
