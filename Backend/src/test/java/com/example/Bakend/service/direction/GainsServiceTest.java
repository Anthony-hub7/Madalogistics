package com.example.Bakend.service.direction;

import com.example.Bakend.dto.direction.GainsResponse;
import com.example.Bakend.entity.Colis;
import com.example.Bakend.entity.DemandeTransport;
import com.example.Bakend.entity.EtapeLivraison;
import com.example.Bakend.entity.Hub;
import com.example.Bakend.entity.Sac;
import com.example.Bakend.entity.Tournee;
import com.example.Bakend.entity.enums.TypeEtape;
import com.example.Bakend.repository.DemandeTransportRepository;
import com.example.Bakend.repository.HubRepository;
import com.example.Bakend.repository.PMEClienteRepository;
import com.example.Bakend.repository.TourneeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

/**
 * Tests GainsService — comparaison baseline (oiseau) vs optimise (stocke).
 * Jeu : hub (0,0), livraison (0,1) → distance oiseau ≈ 111,19 km ; aller-retour ≈ 222,39 km.
 */
@ExtendWith(MockitoExtension.class)
class GainsServiceTest {

    @Mock private DemandeTransportRepository demandeRepository;
    @Mock private TourneeRepository tourneeRepository;
    @Mock private PMEClienteRepository pmeClienteRepository;
    @Mock private HubRepository hubRepository;

    @InjectMocks private GainsService service;

    private UUID tenantId;
    private Hub hub;
    private DemandeTransport demande;
    private Colis colis;
    private GainsResponse.Hypotheses hypotheses;
    private static final double OISEAU_ALLER = 111.19;   // km, (0,0) → (0,1)
    private static final double ALLER_RETOUR = 2 * OISEAU_ALLER;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();

        hub = new Hub();
        hub.setHubId(UUID.randomUUID());
        hub.setLatitude(0.0);
        hub.setLongitude(0.0);

        demande = new DemandeTransport();
        demande.setDemandeId(UUID.randomUUID());
        demande.setHub(hub);
        demande.setLatitudeLivraison(0.0);
        demande.setLongitudeLivraison(1.0);

        colis = new Colis();
        colis.setColisId(UUID.randomUUID());
        colis.setDemande(demande);

        hypotheses = new GainsResponse.Hypotheses(40, 8, 5900, 2.68, 0);

        // lenient : certains tests re-stubent ou n'atteignent pas ces appels (strict stubs)
        org.mockito.Mockito.lenient().when(pmeClienteRepository.existsByTenantId(tenantId)).thenReturn(true);
        org.mockito.Mockito.lenient().when(demandeRepository.findByPmeClienteTenantId(tenantId))
                .thenReturn(List.of(demande));
        org.mockito.Mockito.lenient().when(hubRepository.findById(hub.getHubId()))
                .thenReturn(java.util.Optional.of(hub));
    }

    private Tournee tourneeAvecDistance(BigDecimal distance) {
        Tournee t = new Tournee();
        t.setTourneeId(UUID.randomUUID());
        Sac sac = new Sac();
        sac.setSacId(UUID.randomUUID());
        sac.setHub(hub);
        t.setSac(sac);
        t.setDistanceTotaleKm(distance);

        EtapeLivraison e = new EtapeLivraison();
        e.setOrdre(1);
        e.setTypeEtape(TypeEtape.LIVRAISON);
        e.setColis(colis);
        t.getEtapes().add(e);
        return t;
    }

    @Test
    void baseline_oiseau_vs_optimise_stocke() {
        Tournee t = tourneeAvecDistance(new BigDecimal("150.00"));
        when(tourneeRepository.findByPmeClienteTenantId(tenantId)).thenReturn(List.of(t));

        GainsResponse r = service.calculer(tenantId, null, hypotheses);

        // Baseline : 2 × haversine(hub, livraison)
        assertEquals(ALLER_RETOUR, r.baseline().distanceKm(), 0.5);
        assertEquals(1, r.baseline().vehicules());
        // Optimise : distance stockee
        assertEquals(150.0, r.optimise().distanceKm(), 0.01);
        assertEquals(1, r.optimise().vehicules());

        // Gains
        assertEquals(ALLER_RETOUR - 150.0, r.gains().distanceKm(), 0.5);
        assertNotNull(r.gains().distancePct());
        assertEquals((ALLER_RETOUR - 150.0) / ALLER_RETOUR * 100, r.gains().distancePct(), 0.5);

        // Derives coherents (README §6-11)
        assertEquals(ALLER_RETOUR / 40, r.baseline().tempsH(), 0.1);
        assertEquals(ALLER_RETOUR * 8 / 100, r.baseline().carburantL(), 0.1);
        assertEquals(r.baseline().carburantL() * 2.68, r.baseline().co2Kg(), 0.01);
        assertEquals(r.baseline().carburantL() * 5900, r.baseline().coutAr(), 1);

        // Perimetre : tournee couvre la demande
        assertEquals(1, r.perimetre().nbDemandes());
        assertEquals(1, r.perimetre().nbTournees());
        assertEquals(0, r.perimetre().nbTourneesFallback());
        assertNull(r.avertissement());
    }

    @Test
    void fallback_oiseau_si_distance_stockee_absente() {
        Tournee t = tourneeAvecDistance(null); // pas de distance → recalculee
        when(tourneeRepository.findByPmeClienteTenantId(tenantId)).thenReturn(List.of(t));

        GainsResponse r = service.calculer(tenantId, null, hypotheses);

        assertEquals(ALLER_RETOUR, r.optimise().distanceKm(), 0.5);
        assertEquals(1, r.perimetre().nbTourneesFallback());
        // baseline == optimise en oiseau → gain ~0
        assertEquals(0.0, r.gains().distanceKm(), 1.0);
        assertNotNull(r.avertissement());
        assertTrue(r.avertissement().contains("vol d'oiseau"));
    }

    @Test
    void avertissement_aucune_tournee() {
        when(tourneeRepository.findByPmeClienteTenantId(tenantId)).thenReturn(List.of());

        GainsResponse r = service.calculer(tenantId, null, hypotheses);

        // Scenarios : baseline sur toutes les demandes, optimise a 0
        assertEquals(ALLER_RETOUR, r.baseline().distanceKm(), 0.5);
        assertEquals(0.0, r.optimise().distanceKm(), 0.01);
        assertEquals(0, r.perimetre().nbTournees());
        assertNotNull(r.avertissement());
        assertTrue(r.avertissement().contains("Aucune tournee"));
        // Gain relatif = 100 % (baseline > 0)
        assertEquals(100.0, r.gains().distancePct(), 0.5);
    }

    @Test
    void demande_sans_coordonnees_ignoree() {
        DemandeTransport sansGeo = new DemandeTransport();
        sansGeo.setDemandeId(UUID.randomUUID());
        sansGeo.setHub(hub); // hub avec coords, mais aucune coord livraison/collecte
        when(demandeRepository.findByPmeClienteTenantId(tenantId)).thenReturn(List.of(demande, sansGeo));
        when(tourneeRepository.findByPmeClienteTenantId(tenantId)).thenReturn(List.of());

        GainsResponse r = service.calculer(tenantId, null, hypotheses);

        assertEquals(2, r.perimetre().nbDemandes());
        assertEquals(1, r.perimetre().nbDemandesIgnorees());
        assertEquals(1, r.baseline().vehicules());
        assertEquals(ALLER_RETOUR, r.baseline().distanceKm(), 0.5);
    }

    @Test
    void tenant_inconnu_leve_erreur() {
        when(pmeClienteRepository.existsByTenantId(tenantId)).thenReturn(false);
        assertThrows(com.example.Bakend.exception.ResourceNotFoundException.class,
                () -> service.calculer(tenantId, null, hypotheses));
    }
}
