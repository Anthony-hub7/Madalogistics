package com.example.Bakend.optimisation.vrp;

import com.example.Bakend.entity.*;
import com.example.Bakend.entity.enums.*;
import com.example.Bakend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.*;

/**
 * Tests d'intégration VrpOrchestrationService (mock repositories + VrpService).
 * Vérifie : persistance atomique Tournee + Étapes + OptimisationRun,
 * validation colis vide, validation chauffeur/véhicule manquant.
 */
@ExtendWith(MockitoExtension.class)
class VrpOrchestrationServiceTest {

    @Mock private SacRepository sacRepository;
    @Mock private OptimisationRunRepository optimisationRunRepository;
    @Mock private TourneeRepository tourneeRepository;
    @Mock private VrpMatrixBuilder matrixBuilder;
    @Mock private OrToolsVrpService vrpService;

    @InjectMocks private VrpOrchestrationService orchestrationService;

    private UUID tenantId;
    private UUID sacId;
    private Hub hub;
    private Sac sac;
    private Colis colis;
    private Chauffeur chauffeur;
    private Vehicule vehicule;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        sacId = UUID.randomUUID();

        hub = new Hub();
        hub.setHubId(UUID.randomUUID());
        hub.setNom("Hub Tana");
        hub.setLatitude(-18.9);
        hub.setLongitude(47.5);

        PMECliente tenant = new PMECliente();
        tenant.setTenantId(tenantId);

        chauffeur = new Chauffeur();
        chauffeur.setChauffeurId(UUID.randomUUID());
        chauffeur.setPmeCliente(tenant);

        vehicule = new Vehicule();
        vehicule.setVehiculeId(UUID.randomUUID());
        vehicule.setPmeCliente(tenant);

        DemandeTransport demande = new DemandeTransport();
        demande.setDemandeId(UUID.randomUUID());
        demande.setLatitudeLivraison(-18.95);
        demande.setLongitudeLivraison(47.55);

        colis = new Colis();
        colis.setColisId(UUID.randomUUID());
        colis.setDemande(demande);
        colis.setPmeCliente(tenant);

        sac = new Sac();
        sac.setSacId(sacId);
        sac.setPmeCliente(tenant);
        sac.setHub(hub);
        sac.setChauffeur(chauffeur);
        sac.setVehicule(vehicule);
        sac.setColis(new ArrayList<>(List.of(colis)));
    }

    @Test
    void orchestrerVrpPersistsTourneeAndEtapes() {
        when(sacRepository.findById(sacId)).thenReturn(Optional.of(sac));

        long[][] matrix = {{0, 3600}, {3600, 0}};
        List<Colis> ordered = new ArrayList<>();
        ordered.add(null);
        ordered.add(colis);
        when(matrixBuilder.build(eq(hub), anyList()))
                .thenReturn(new VrpMatrixBuilder.VrpMatrixResult(matrix, ordered));

        VehicleRoute route = new VehicleRoute(0, List.of(1), List.of(3600L), 0L);
        VrpSolution solution = new VrpSolution(List.of(route), 100);
        when(vrpService.solve(any())).thenReturn(solution);

        when(tourneeRepository.save(any())).thenAnswer(inv -> {
            Tournee t = inv.getArgument(0);
            t.setTourneeId(UUID.randomUUID());
            return t;
        });

        Tournee result = orchestrationService.orchestrerVrp(tenantId, sacId);

        assertNotNull(result);
        assertNotNull(result.getTourneeId());
        assertEquals(TourneeStatut.PLANIFIEE, result.getStatut());
        assertEquals(sac, result.getSac());
        assertNotNull(result.getRunVrp());
        assertEquals(TypeAlgorithme.VRP, result.getRunVrp().getTypeAlgorithme());
        assertEquals(1, result.getEtapes().size());

        EtapeLivraison etape = result.getEtapes().get(0);
        assertEquals(1, etape.getOrdre());
        assertEquals(TypeEtape.LIVRAISON, etape.getTypeEtape());
        assertEquals(colis, etape.getColis());
        assertNotNull(etape.getDateHeurePrevue());

        verify(optimisationRunRepository).save(any());
        verify(tourneeRepository).save(any());
    }

    @Test
    void orchestrerVrpFailsWhenNoChauffeur() {
        sac.setChauffeur(null);
        when(sacRepository.findById(sacId)).thenReturn(Optional.of(sac));

        assertThrows(IllegalStateException.class,
                () -> orchestrationService.orchestrerVrp(tenantId, sacId),
                "Doit lever une exception si chauffeur manquant");
    }

    @Test
    void orchestrerVrpFailsWhenNoVehicule() {
        sac.setVehicule(null);
        when(sacRepository.findById(sacId)).thenReturn(Optional.of(sac));

        assertThrows(IllegalStateException.class,
                () -> orchestrationService.orchestrerVrp(tenantId, sacId),
                "Doit lever une exception si véhicule manquant");
    }

    @Test
    void orchestrerVrpFailsWhenColisEmpty() {
        sac.setColis(new ArrayList<>());
        when(sacRepository.findById(sacId)).thenReturn(Optional.of(sac));

        assertThrows(IllegalStateException.class,
                () -> orchestrationService.orchestrerVrp(tenantId, sacId),
                "Doit lever une exception si aucun colis");
    }

    @Test
    void orchestrerVrpFailsWhenSacNotFound() {
        when(sacRepository.findById(sacId)).thenReturn(Optional.empty());

        assertThrows(NoSuchElementException.class,
                () -> orchestrationService.orchestrerVrp(tenantId, sacId),
                "Doit lever une exception si Sac introuvable");
    }

    @Test
    void orchestrerVrpFailsWhenTenantMismatch() {
        UUID otherTenant = UUID.randomUUID();
        when(sacRepository.findById(sacId)).thenReturn(Optional.of(sac));

        assertThrows(NoSuchElementException.class,
                () -> orchestrationService.orchestrerVrp(otherTenant, sacId),
                "Doit lever une exception si tenant ne correspond pas");
    }

    @Test
    void orchestrerVrpFailsWhenSolverReturnsEmpty() {
        when(sacRepository.findById(sacId)).thenReturn(Optional.of(sac));

        long[][] matrix = {{0, 3600}, {3600, 0}};
        List<Colis> orderedEmpty = new ArrayList<>();
        orderedEmpty.add(null);
        orderedEmpty.add(colis);
        when(matrixBuilder.build(eq(hub), anyList()))
                .thenReturn(new VrpMatrixBuilder.VrpMatrixResult(matrix, orderedEmpty));

        when(vrpService.solve(any())).thenReturn(new VrpSolution(Collections.emptyList(), 50));

        assertThrows(IllegalStateException.class,
                () -> orchestrationService.orchestrerVrp(tenantId, sacId),
                "Doit lever une exception si pas de solution");
    }
}
