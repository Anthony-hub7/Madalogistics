package com.example.Bakend.optimisation.affectation;

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
 * Tests Phase 5 — Affectation bipartite chauffeur × vehicule.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AffectationServiceTest {

    @Mock private SacRepository sacRepository;
    @Mock private ChauffeurRepository chauffeurRepository;
    @Mock private VehiculeRepository vehiculeRepository;
    @Mock private CompatibiliteChauffeurVehiculeRepository compatibiliteRepository;
    @Mock private OptimisationRunRepository optimisationRunRepository;
    @Mock private PMEClienteRepository pmeClienteRepository;

    @InjectMocks private AffectationService service;

    private UUID tenantId = UUID.randomUUID();
    private UUID hubId = UUID.randomUUID();
    private PMECliente tenant;
    private Hub hub;

    @BeforeEach
    void setUp() {
        tenant = new PMECliente();
        tenant.setTenantId(tenantId);

        hub = new Hub();
        hub.setHubId(hubId);
        hub.setPmeCliente(tenant);

        when(pmeClienteRepository.findByTenantId(tenantId))
                .thenReturn(Optional.of(tenant));
        when(optimisationRunRepository.save(any(OptimisationRun.class))).thenAnswer(inv -> {
            OptimisationRun r = inv.getArgument(0);
            r.setRunId(UUID.randomUUID());
            return r;
        });
    }

    private Sac makeSac(int nbColis) {
        Sac sac = new Sac();
        sac.setSacId(UUID.randomUUID());
        sac.setPmeCliente(tenant);
        sac.setHub(hub);
        sac.setStatut(SacStatut.CONSTITUE);
        sac.setCategorieDominante("STANDARD");
        // Creer des colis fictifs
        List<Colis> colisList = new ArrayList<>();
        for (int i = 0; i < nbColis; i++) {
            Colis c = new Colis();
            c.setColisId(UUID.randomUUID());
            colisList.add(c);
        }
        sac.setColis(colisList);
        return sac;
    }

    private Chauffeur makeChauffeur(String permis, boolean habilite, boolean disponible) {
        Chauffeur ch = new Chauffeur();
        ch.setChauffeurId(UUID.randomUUID());
        ch.setPermisCategories(permis);
        ch.setPermisExpiration(LocalDate.now().plusYears(2));
        ch.setDisponible(disponible);
        ch.setStatutDossier("VALIDE");
        Utilisateur u = new Utilisateur();
        u.setHabiliteValeur(habilite);
        u.setNom("Test Chauffeur");
        ch.setUtilisateur(u);
        return ch;
    }

    private Vehicule makeVehicule(TypeVehicule type, BigDecimal ptac) {
        Vehicule v = new Vehicule();
        v.setVehiculeId(UUID.randomUUID());
        v.setTypeVehicule(type);
        v.setPtacTonnes(ptac);
        v.setStatut(VehiculeStatut.DISPONIBLE);
        v.setImmatriculation("T-TEST");
        v.setHub(hub);
        return v;
    }

    @Test
    void affecte_sac_a_chauffeur_compatible() {
        Sac sac = makeSac(5);
        Chauffeur ch = makeChauffeur("B", true, true);
        Vehicule v = makeVehicule(TypeVehicule.PICKUP, new BigDecimal("3.0"));

        when(sacRepository.rechercherParHubEtStatut(tenantId, hubId, SacStatut.CONSTITUE))
                .thenReturn(new ArrayList<>(List.of(sac)));
        when(chauffeurRepository.findByPmeClienteTenantIdAndDisponibleTrue(tenantId))
                .thenReturn(new ArrayList<>(List.of(ch)));
        when(vehiculeRepository.rechercherDisponiblesParHub(tenantId, hubId, VehiculeStatut.DISPONIBLE))
                .thenReturn(new ArrayList<>(List.of(v)));
        when(compatibiliteRepository.findByPmeClienteTenantId(tenantId))
                .thenReturn(new ArrayList<>());
        // Pas de matrice → refus strict

        AffectationService.AffectationResult result = service.affecter(tenantId, hubId);

        // Sans matrice, pas d'affectation possible
        assertEquals(0, result.nbSacsAffectes());
        assertEquals(1, result.nbSacsNonAffectes());
    }

    @Test
    void affecte_sac_avec_matrice() {
        Sac sac = makeSac(5);
        Chauffeur ch = makeChauffeur("B", true, true);
        Vehicule v = makeVehicule(TypeVehicule.PICKUP, new BigDecimal("3.0"));

        when(sacRepository.rechercherParHubEtStatut(tenantId, hubId, SacStatut.CONSTITUE))
                .thenReturn(new ArrayList<>(List.of(sac)));
        when(chauffeurRepository.findByPmeClienteTenantIdAndDisponibleTrue(tenantId))
                .thenReturn(new ArrayList<>(List.of(ch)));
        when(vehiculeRepository.rechercherDisponiblesParHub(tenantId, hubId, VehiculeStatut.DISPONIBLE))
                .thenReturn(new ArrayList<>(List.of(v)));
        when(chauffeurRepository.findById(ch.getChauffeurId()))
                .thenReturn(Optional.of(ch));
        when(vehiculeRepository.findById(v.getVehiculeId()))
                .thenReturn(Optional.of(v));

        CompatibiliteChauffeurVehicule compat = new CompatibiliteChauffeurVehicule();
        compat.setChauffeurId(ch.getChauffeurId());
        compat.setVehiculeId(v.getVehiculeId());
        compat.setCompatible(true);
        compat.setPmeCliente(tenant);
        when(compatibiliteRepository.findByPmeClienteTenantId(tenantId))
                .thenReturn(new ArrayList<>(List.of(compat)));

        AffectationService.AffectationResult result = service.affecter(tenantId, hubId);

        assertEquals(1, result.nbSacsAffectes());
        assertEquals(0, result.nbSacsNonAffectes());
        assertEquals(SacStatut.AFFECTE, sac.getStatut());
        assertEquals(ch, sac.getChauffeur());
        assertEquals(v, sac.getVehicule());
    }

    @Test
    void refuse_sans_chauffeur() {
        Sac sac = makeSac(3);

        when(sacRepository.rechercherParHubEtStatut(tenantId, hubId, SacStatut.CONSTITUE))
                .thenReturn(new ArrayList<>(List.of(sac)));
        when(chauffeurRepository.findByPmeClienteTenantIdAndDisponibleTrue(tenantId))
                .thenReturn(new ArrayList<>());
        when(vehiculeRepository.rechercherDisponiblesParHub(tenantId, hubId, VehiculeStatut.DISPONIBLE))
                .thenReturn(new ArrayList<>(List.of(makeVehicule(TypeVehicule.PICKUP, new BigDecimal("3.0")))));
        when(compatibiliteRepository.findByPmeClienteTenantId(tenantId))
                .thenReturn(new ArrayList<>());

        AffectationService.AffectationResult result = service.affecter(tenantId, hubId);

        assertEquals(0, result.nbSacsAffectes());
        assertEquals(1, result.nbSacsNonAffectes());
    }

    @Test
    void permis_expire_empeche_affectation() {
        Sac sac = makeSac(3);
        Chauffeur ch = makeChauffeur("B", true, true);
        ch.setPermisExpiration(LocalDate.of(2024, 1, 1)); // expire
        Vehicule v = makeVehicule(TypeVehicule.PICKUP, new BigDecimal("3.0"));

        when(sacRepository.rechercherParHubEtStatut(tenantId, hubId, SacStatut.CONSTITUE))
                .thenReturn(new ArrayList<>(List.of(sac)));
        when(chauffeurRepository.findByPmeClienteTenantIdAndDisponibleTrue(tenantId))
                .thenReturn(new ArrayList<>(List.of(ch)));
        when(vehiculeRepository.rechercherDisponiblesParHub(tenantId, hubId, VehiculeStatut.DISPONIBLE))
                .thenReturn(new ArrayList<>(List.of(v)));
        when(compatibiliteRepository.findByPmeClienteTenantId(tenantId))
                .thenReturn(new ArrayList<>());

        AffectationService.AffectationResult result = service.affecter(tenantId, hubId);

        assertEquals(0, result.nbSacsAffectes());
    }

    @Test
    void habilite_valeur_manquant_pour_categorie_A() {
        Sac sac = makeSac(3);
        sac.setCategorieDominante("A");
        Chauffeur ch = makeChauffeur("B", false, true); // non habilite
        Vehicule v = makeVehicule(TypeVehicule.PICKUP, new BigDecimal("3.0"));

        when(sacRepository.rechercherParHubEtStatut(tenantId, hubId, SacStatut.CONSTITUE))
                .thenReturn(new ArrayList<>(List.of(sac)));
        when(chauffeurRepository.findByPmeClienteTenantIdAndDisponibleTrue(tenantId))
                .thenReturn(new ArrayList<>(List.of(ch)));
        when(vehiculeRepository.rechercherDisponiblesParHub(tenantId, hubId, VehiculeStatut.DISPONIBLE))
                .thenReturn(new ArrayList<>(List.of(v)));
        when(chauffeurRepository.findById(ch.getChauffeurId()))
                .thenReturn(Optional.of(ch));
        when(vehiculeRepository.findById(v.getVehiculeId()))
                .thenReturn(Optional.of(v));

        CompatibiliteChauffeurVehicule compat = new CompatibiliteChauffeurVehicule();
        compat.setChauffeurId(ch.getChauffeurId());
        compat.setVehiculeId(v.getVehiculeId());
        compat.setCompatible(true);
        compat.setPmeCliente(tenant);
        when(compatibiliteRepository.findByPmeClienteTenantId(tenantId))
                .thenReturn(new ArrayList<>(List.of(compat)));

        AffectationService.AffectationResult result = service.affecter(tenantId, hubId);

        assertEquals(0, result.nbSacsAffectes());
        assertNotNull(result.affectations().get(0).motifRefus());
        assertFalse(result.affectations().get(0).affecte());
    }

    @Test
    void persiste_run_affectation() {
        Sac sac = makeSac(3);
        Chauffeur ch = makeChauffeur("B", true, true);
        Vehicule v = makeVehicule(TypeVehicule.PICKUP, new BigDecimal("3.0"));

        when(sacRepository.rechercherParHubEtStatut(tenantId, hubId, SacStatut.CONSTITUE))
                .thenReturn(new ArrayList<>(List.of(sac)));
        when(chauffeurRepository.findByPmeClienteTenantIdAndDisponibleTrue(tenantId))
                .thenReturn(new ArrayList<>(List.of(ch)));
        when(vehiculeRepository.rechercherDisponiblesParHub(tenantId, hubId, VehiculeStatut.DISPONIBLE))
                .thenReturn(new ArrayList<>(List.of(v)));
        when(chauffeurRepository.findById(ch.getChauffeurId()))
                .thenReturn(Optional.of(ch));
        when(vehiculeRepository.findById(v.getVehiculeId()))
                .thenReturn(Optional.of(v));

        CompatibiliteChauffeurVehicule compat = new CompatibiliteChauffeurVehicule();
        compat.setChauffeurId(ch.getChauffeurId());
        compat.setVehiculeId(v.getVehiculeId());
        compat.setCompatible(true);
        compat.setPmeCliente(tenant);
        when(compatibiliteRepository.findByPmeClienteTenantId(tenantId))
                .thenReturn(new ArrayList<>(List.of(compat)));

        AffectationService.AffectationResult result = service.affecter(tenantId, hubId);

        verify(optimisationRunRepository).save(argThat(run -> {
            assertEquals(TypeAlgorithme.AFFECTATION, run.getTypeAlgorithme());
            assertNotNull(run.getResultat());
            return true;
        }));
        assertNotNull(sac.getRunAffectation());
        assertEquals(result.runId(), sac.getRunAffectation().getRunId());
    }

    @Test
    void ran_retourne_si_aucun_sac() {
        when(sacRepository.rechercherParHubEtStatut(tenantId, hubId, SacStatut.CONSTITUE))
                .thenReturn(new ArrayList<>());

        AffectationService.AffectationResult result = service.affecter(tenantId, hubId);

        assertEquals(0, result.nbSacsAffectes());
        assertNull(result.runId());
    }
}
