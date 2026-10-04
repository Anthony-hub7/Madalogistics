package com.example.Bakend.optimisation.affectation;

import com.example.Bakend.dto.optimisation.AffectationSimulateRequest;
import com.example.Bakend.dto.optimisation.AffectationSimulateResponse;
import com.example.Bakend.dto.optimisation.AffectationValiderRequest;
import com.example.Bakend.dto.optimisation.AffectationValiderResponse;
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
 * Tests V1-a — simulation/validation : 1 sac = 1 chauffeur = 1 vehicule,
 * doublons invalides, indisponibilite immediate des ressources.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AffectationSimulationServiceTest {

    @Mock private SacRepository sacRepository;
    @Mock private ChauffeurRepository chauffeurRepository;
    @Mock private VehiculeRepository vehiculeRepository;
    @Mock private CompatibiliteChauffeurVehiculeRepository compatibiliteRepository;
    @Mock private PMEClienteRepository pmeClienteRepository;
    @Mock private OptimisationRunRepository optimisationRunRepository;
    @Mock private IndisponibiliteChauffeurRepository indispoChauffeurRepository;
    @Mock private IndisponibiliteVehiculeRepository indispoVehiculeRepository;

    @InjectMocks private AffectationSimulationService service;

    private final UUID tenantId = UUID.randomUUID();
    private final UUID hubId = UUID.randomUUID();

    private PMECliente tenant;
    private Hub hub;
    private Sac sac1;
    private Sac sac2;
    private Chauffeur ch1;
    private Chauffeur ch2;
    private Vehicule v1;

    @BeforeEach
    void setUp() {
        tenant = new PMECliente();
        tenant.setTenantId(tenantId);

        hub = new Hub();
        hub.setHubId(hubId);
        hub.setPmeCliente(tenant);

        sac1 = makeSac();
        sac2 = makeSac();
        ch1 = makeChauffeur("Chauffeur Un");
        ch2 = makeChauffeur("Chauffeur Deux");
        v1 = makeVehicule("T-001");

        when(pmeClienteRepository.findByTenantId(tenantId)).thenReturn(Optional.of(tenant));
        when(indispoChauffeurRepository.findByChauffeurChauffeurId(any())).thenReturn(new ArrayList<>());
        when(optimisationRunRepository.save(any(OptimisationRun.class))).thenAnswer(inv -> {
            OptimisationRun r = inv.getArgument(0);
            r.setRunId(UUID.randomUUID());
            return r;
        });

        stubSacsEtChauffeurs();
        stubVehicules(List.of(v1));
        stubCompatibilites(List.of(v1));
    }

    // ── Helpers ──

    private Sac makeSac() {
        Sac sac = new Sac();
        sac.setSacId(UUID.randomUUID());
        sac.setPmeCliente(tenant);
        sac.setHub(hub);
        sac.setStatut(SacStatut.CONSTITUE);
        sac.setCategorieDominante("STANDARD");
        Colis c = new Colis();
        c.setColisId(UUID.randomUUID());
        c.setPoidsKg(new BigDecimal("10.0"));
        c.setVolumeM3(new BigDecimal("0.1"));
        sac.setColis(new ArrayList<>(List.of(c)));
        return sac;
    }

    private Chauffeur makeChauffeur(String nom) {
        Chauffeur ch = new Chauffeur();
        ch.setChauffeurId(UUID.randomUUID());
        ch.setPermisCategories("B");
        ch.setPermisExpiration(LocalDate.now().plusYears(2));
        ch.setDisponible(true);
        ch.setStatutDossier("VALIDEE");
        Utilisateur u = new Utilisateur();
        u.setNom(nom);
        u.setHabiliteValeur(true);
        ch.setUtilisateur(u);
        return ch;
    }

    private Vehicule makeVehicule(String immat) {
        Vehicule v = new Vehicule();
        v.setVehiculeId(UUID.randomUUID());
        v.setImmatriculation(immat);
        v.setTypeVehicule(TypeVehicule.PICKUP);
        v.setPtacTonnes(new BigDecimal("3.0"));
        v.setStatut(VehiculeStatut.DISPONIBLE);
        v.setHub(hub);
        return v;
    }

    private void stubSacsEtChauffeurs() {
        when(sacRepository.rechercherParHubEtStatutHorsMode(tenantId, hubId, SacStatut.CONSTITUE, ModeLivraison.FREELANCE))
                .thenReturn(new ArrayList<>(List.of(sac1, sac2)));
        when(chauffeurRepository.findByPmeClienteTenantIdAndDisponibleTrue(tenantId))
                .thenReturn(new ArrayList<>(List.of(ch1, ch2)));
        when(chauffeurRepository.findById(ch1.getChauffeurId())).thenReturn(Optional.of(ch1));
        when(chauffeurRepository.findById(ch2.getChauffeurId())).thenReturn(Optional.of(ch2));
    }

    private void stubVehicules(List<Vehicule> vehicules) {
        when(vehiculeRepository.rechercherDisponiblesParHub(tenantId, hubId, VehiculeStatut.DISPONIBLE))
                .thenReturn(new ArrayList<>(vehicules));
        for (Vehicule v : vehicules) {
            when(vehiculeRepository.findById(v.getVehiculeId())).thenReturn(Optional.of(v));
        }
    }

    private void stubCompatibilites(List<Vehicule> vehicules) {
        List<CompatibiliteChauffeurVehicule> list = new ArrayList<>();
        for (Chauffeur ch : List.of(ch1, ch2)) {
            for (Vehicule v : vehicules) {
                CompatibiliteChauffeurVehicule c = new CompatibiliteChauffeurVehicule();
                c.setChauffeurId(ch.getChauffeurId());
                c.setVehiculeId(v.getVehiculeId());
                c.setCompatible(true);
                c.setPmeCliente(tenant);
                list.add(c);
            }
        }
        when(compatibiliteRepository.findByPmeClienteTenantId(tenantId)).thenReturn(list);
    }

    // ── Tests ──

    @Test
    void simuler_refuse_doublon_vehicule() {
        AffectationSimulateRequest request = new AffectationSimulateRequest(hubId, List.of(
                new AffectationSimulateRequest.AffectationDecision(sac1.getSacId(), ch1.getChauffeurId(), v1.getVehiculeId()),
                new AffectationSimulateRequest.AffectationDecision(sac2.getSacId(), ch2.getChauffeurId(), v1.getVehiculeId())
        ));

        AffectationSimulateResponse response = service.simuler(tenantId, request);

        assertFalse(response.valide());
        AffectationSimulateResponse.AffectationResultat deuxieme = response.resultats().get(1);
        assertFalse(deuxieme.autorise());
        assertTrue(deuxieme.raisons().stream().anyMatch(r -> r.contains("Vehicule deja affecte")));
        assertNotNull(deuxieme.motifRefus());
    }

    @Test
    void simuler_refuse_doublon_chauffeur() {
        Vehicule v2 = makeVehicule("T-002");
        stubVehicules(List.of(v1, v2));
        stubCompatibilites(List.of(v1, v2));

        AffectationSimulateRequest request = new AffectationSimulateRequest(hubId, List.of(
                new AffectationSimulateRequest.AffectationDecision(sac1.getSacId(), ch1.getChauffeurId(), v1.getVehiculeId()),
                new AffectationSimulateRequest.AffectationDecision(sac2.getSacId(), ch1.getChauffeurId(), v2.getVehiculeId())
        ));

        AffectationSimulateResponse response = service.simuler(tenantId, request);

        assertFalse(response.valide());
        assertTrue(response.resultats().get(1).raisons().stream()
                .anyMatch(r -> r.contains("Chauffeur deja affecte")));
    }

    @Test
    void simuler_refuse_doublon_sac() {
        AffectationSimulateRequest request = new AffectationSimulateRequest(hubId, List.of(
                new AffectationSimulateRequest.AffectationDecision(sac1.getSacId(), ch1.getChauffeurId(), v1.getVehiculeId()),
                new AffectationSimulateRequest.AffectationDecision(sac1.getSacId(), ch2.getChauffeurId(), v1.getVehiculeId())
        ));

        AffectationSimulateResponse response = service.simuler(tenantId, request);

        assertFalse(response.valide());
        assertTrue(response.resultats().get(1).raisons().stream()
                .anyMatch(r -> r.contains("Sac deja affecte")));
    }

    @Test
    void simuler_valide_si_paires_uniques() {
        AffectationSimulateRequest request = new AffectationSimulateRequest(hubId, List.of(
                new AffectationSimulateRequest.AffectationDecision(sac1.getSacId(), ch1.getChauffeurId(), v1.getVehiculeId())
        ));

        AffectationSimulateResponse response = service.simuler(tenantId, request);

        assertTrue(response.valide());
        assertTrue(response.resultats().get(0).autorise());
        assertTrue(response.avertissements().isEmpty());
    }

    @Test
    void valider_refuse_doublon_vehicule_sans_persister() {
        AffectationValiderRequest request = new AffectationValiderRequest(hubId, List.of(
                new AffectationValiderRequest.AffectationDecision(sac1.getSacId(), ch1.getChauffeurId(), v1.getVehiculeId()),
                new AffectationValiderRequest.AffectationDecision(sac2.getSacId(), ch2.getChauffeurId(), v1.getVehiculeId())
        ));

        assertThrows(IllegalStateException.class, () -> service.valider(tenantId, request));

        verify(sacRepository, never()).save(any(Sac.class));
        assertEquals(SacStatut.CONSTITUE, sac1.getStatut());
        assertEquals(SacStatut.CONSTITUE, sac2.getStatut());
        assertEquals(VehiculeStatut.DISPONIBLE, v1.getStatut());
        assertTrue(ch1.isDisponible());
        assertTrue(ch2.isDisponible());
    }

    @Test
    void valider_marque_chauffeur_et_vehicule_indisponibles() {
        AffectationValiderRequest request = new AffectationValiderRequest(hubId, List.of(
                new AffectationValiderRequest.AffectationDecision(sac1.getSacId(), ch1.getChauffeurId(), v1.getVehiculeId())
        ));

        AffectationValiderResponse response = service.valider(tenantId, request);

        assertEquals(1, response.nbSacsAffectes());
        assertEquals(0, response.nbSacsNonAffectes());
        assertEquals(SacStatut.AFFECTE, sac1.getStatut());
        assertEquals(ch1, sac1.getChauffeur());
        assertEquals(v1, sac1.getVehicule());
        assertFalse(ch1.isDisponible());
        assertEquals(VehiculeStatut.AFFECTE, v1.getStatut());
        assertNotNull(sac1.getRunAffectation());
    }

    @Test
    void valider_ressources_intactes_si_invalide() {
        // Permismatch : categorie A pour un PICKUP (categorie B) → refus PermisService
        ch1.setPermisCategories("A");

        AffectationValiderRequest request = new AffectationValiderRequest(hubId, List.of(
                new AffectationValiderRequest.AffectationDecision(sac1.getSacId(), ch1.getChauffeurId(), v1.getVehiculeId())
        ));

        assertThrows(IllegalStateException.class, () -> service.valider(tenantId, request));

        verify(sacRepository, never()).save(any(Sac.class));
        assertTrue(ch1.isDisponible());
        assertEquals(VehiculeStatut.DISPONIBLE, v1.getStatut());
        assertEquals(SacStatut.CONSTITUE, sac1.getStatut());
    }
}
