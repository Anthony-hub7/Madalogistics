package com.example.Bakend.service;

import com.example.Bakend.dto.optimisation.ColisLibreResponse;
import com.example.Bakend.dto.optimisation.SacColisEditRequest;
import com.example.Bakend.dto.optimisation.SacColisEditResponse;
import com.example.Bakend.entity.*;
import com.example.Bakend.entity.enums.*;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.exception.ResourceNotFoundException;
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
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Tests V1-b/V1-c — edition des sacs :
 * - suppression : colis liberes, demandes re-evaluees, ressources liberees
 * - edition des colis : ajouter/retirer, interdite apres tournee, jamais vide
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SacEditionServiceTest {

    @Mock private SacRepository sacRepository;
    @Mock private ColisRepository colisRepository;
    @Mock private DemandeTransportRepository demandeRepository;
    @Mock private ChauffeurRepository chauffeurRepository;
    @Mock private VehiculeRepository vehiculeRepository;
    @Mock private TourneeRepository tourneeRepository;
    @Mock private AuditLogRepository auditLogRepository;

    @InjectMocks private SacEditionService service;

    private final UUID tenantId = UUID.randomUUID();
    private final UUID hubId = UUID.randomUUID();

    private PMECliente tenant;
    private Hub hub;
    private Sac sac;
    private DemandeTransport demande;
    private Colis colis1;

    @BeforeEach
    void setUp() {
        tenant = new PMECliente();
        tenant.setTenantId(tenantId);

        hub = new Hub();
        hub.setHubId(hubId);
        hub.setPmeCliente(tenant);

        sac = new Sac();
        sac.setSacId(UUID.randomUUID());
        sac.setPmeCliente(tenant);
        sac.setHub(hub);
        sac.setStatut(SacStatut.CONSTITUE);
        sac.setCategorieDominante("STANDARD");

        demande = new DemandeTransport();
        demande.setDemandeId(UUID.randomUUID());
        demande.setPmeCliente(tenant);
        demande.setHub(hub);
        demande.setStatut(DemandeStatut.GROUPEE);

        colis1 = makeColis(demande, new BigDecimal("10.0"), new BigDecimal("1.0"));
        colis1.setSac(sac);

        when(sacRepository.findById(sac.getSacId())).thenReturn(Optional.of(sac));
        when(tourneeRepository.findBySacSacId(sac.getSacId())).thenReturn(new ArrayList<>());
        when(colisRepository.findBySacSacId(sac.getSacId())).thenReturn(new ArrayList<>(List.of(colis1)));
        when(colisRepository.findByDemandeDemandeId(demande.getDemandeId()))
                .thenReturn(new ArrayList<>(List.of(colis1)));
        when(demandeRepository.findById(demande.getDemandeId())).thenReturn(Optional.of(demande));
        when(auditLogRepository.save(any(AuditLog.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private Colis makeColis(DemandeTransport d, BigDecimal poids, BigDecimal volume) {
        Colis c = new Colis();
        c.setColisId(UUID.randomUUID());
        c.setPmeCliente(tenant);
        c.setDemande(d);
        c.setPoidsKg(poids);
        c.setVolumeM3(volume);
        c.setEtat(ColisEtat.EN_ATTENTE);
        c.setCreatedAt(java.time.LocalDateTime.now());
        return c;
    }

    // ══════════ V1-b : suppression ══════════

    @Test
    void supprime_sac_constitue_libere_colis_et_demande() {
        service.supprimer(tenantId, sac.getSacId());

        assertNull(colis1.getSac());
        assertEquals(DemandeStatut.EN_ATTENTE_GROUPAGE, demande.getStatut());
        verify(colisRepository).saveAll(argThat(l -> {
            Colis c = ((List<Colis>) l).get(0);
            return c.getSac() == null;
        }));
        verify(sacRepository).delete(sac);
        verify(auditLogRepository).save(argThat(a ->
                a.getAction() == AuditAction.SUPPRESSION && a.getEntiteId().equals(sac.getSacId())));
    }

    @Test
    void supprime_sac_affecte_libere_chauffeur_et_vehicule() {
        sac.setStatut(SacStatut.AFFECTE);
        sac.setColis(new ArrayList<>());
        when(colisRepository.findBySacSacId(sac.getSacId())).thenReturn(new ArrayList<>());

        Chauffeur ch = new Chauffeur();
        ch.setChauffeurId(UUID.randomUUID());
        ch.setDisponible(false);
        Vehicule v = new Vehicule();
        v.setVehiculeId(UUID.randomUUID());
        v.setStatut(VehiculeStatut.AFFECTE);
        v.setImmatriculation("T-TEST");
        sac.setChauffeur(ch);
        sac.setVehicule(v);

        when(sacRepository.findByChauffeurChauffeurId(ch.getChauffeurId()))
                .thenReturn(new ArrayList<>(List.of(sac)));
        when(sacRepository.findByVehiculeVehiculeId(v.getVehiculeId()))
                .thenReturn(new ArrayList<>(List.of(sac)));

        service.supprimer(tenantId, sac.getSacId());

        assertTrue(ch.isDisponible());
        assertEquals(VehiculeStatut.DISPONIBLE, v.getStatut());
        verify(chauffeurRepository).save(ch);
        verify(vehiculeRepository).save(v);
        assertNull(sac.getChauffeur());
        assertNull(sac.getVehicule());
        verify(sacRepository).delete(sac);
    }

    @Test
    void supprime_ne_libere_pas_la_ressource_detenue_par_un_autre_sac() {
        sac.setStatut(SacStatut.AFFECTE);
        sac.setColis(new ArrayList<>());
        when(colisRepository.findBySacSacId(sac.getSacId())).thenReturn(new ArrayList<>());

        Chauffeur ch = new Chauffeur();
        ch.setChauffeurId(UUID.randomUUID());
        ch.setDisponible(false);
        sac.setChauffeur(ch);

        Sac autre = new Sac();
        autre.setSacId(UUID.randomUUID());
        autre.setStatut(SacStatut.EN_TRANSIT);
        when(sacRepository.findByChauffeurChauffeurId(ch.getChauffeurId()))
                .thenReturn(new ArrayList<>(List.of(sac, autre)));

        service.supprimer(tenantId, sac.getSacId());

        assertFalse(ch.isDisponible());
        verify(chauffeurRepository, never()).save(any(Chauffeur.class));
    }

    @Test
    void supprime_refuse_si_en_transit() {
        sac.setStatut(SacStatut.EN_TRANSIT);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.supprimer(tenantId, sac.getSacId()));

        assertEquals(409, ex.getStatus());
        verify(sacRepository, never()).delete(any(Sac.class));
        verify(auditLogRepository, never()).save(any(AuditLog.class));
    }

    @Test
    void supprime_refuse_si_sac_d_un_autre_tenant() {
        PMECliente autreTenant = new PMECliente();
        autreTenant.setTenantId(UUID.randomUUID());
        sac.setPmeCliente(autreTenant);

        assertThrows(ResourceNotFoundException.class, () -> service.supprimer(tenantId, sac.getSacId()));
        verify(sacRepository, never()).delete(any(Sac.class));
    }

    // ══════════ V1-c : edition des colis ══════════

    @Test
    void edition_refusee_apres_planification_tournee() {
        when(tourneeRepository.findBySacSacId(sac.getSacId()))
                .thenReturn(new ArrayList<>(List.of(new Tournee())));

        BusinessException ex = assertThrows(BusinessException.class, () ->
                service.modifierColis(tenantId, sac.getSacId(), new SacColisEditRequest(List.of(), List.of())));

        assertEquals(409, ex.getStatus());
        assertTrue(ex.getMessage().contains("tournee"));
        verify(colisRepository, never()).saveAll(any());
    }

    @Test
    void edition_ajoute_colis_libre_et_reEvalue_la_demande() {
        // Colis libre du meme hub, demande EN_ATTENTE_GROUPAGE
        DemandeTransport demande2 = new DemandeTransport();
        demande2.setDemandeId(UUID.randomUUID());
        demande2.setPmeCliente(tenant);
        demande2.setHub(hub);
        demande2.setStatut(DemandeStatut.EN_ATTENTE_GROUPAGE);
        Colis colis2 = makeColis(demande2, new BigDecimal("5.0"), new BigDecimal("0.5"));
        when(colisRepository.findById(colis2.getColisId())).thenReturn(Optional.of(colis2));
        when(demandeRepository.findById(demande2.getDemandeId())).thenReturn(Optional.of(demande2));
        when(colisRepository.findByDemandeDemandeId(demande2.getDemandeId()))
                .thenReturn(new ArrayList<>(List.of(colis2)));
        // 1er appel : [c1] ; apres ajout : [c1, c2]
        when(colisRepository.findBySacSacId(sac.getSacId()))
                .thenReturn(new ArrayList<>(List.of(colis1)))
                .thenReturn(new ArrayList<>(List.of(colis1, colis2)));
        // Capacite hub : un pick-up 800 kg / 8 m3
        Vehicule v = new Vehicule();
        v.setVehiculeId(UUID.randomUUID());
        v.setCapacitePoidsKg(new BigDecimal("800"));
        v.setCapaciteVolumeM3(new BigDecimal("8.0"));
        v.setStatut(VehiculeStatut.DISPONIBLE);
        when(vehiculeRepository.rechercherDisponiblesParHub(tenantId, hubId, VehiculeStatut.DISPONIBLE))
                .thenReturn(new ArrayList<>(List.of(v)));

        SacColisEditResponse resp = service.modifierColis(tenantId, sac.getSacId(),
                new SacColisEditRequest(List.of(colis2.getColisId()), List.of()));

        assertEquals(sac.getSacId(), resp.sacId());
        assertEquals(2, resp.nbColis());
        assertEquals(15.0, resp.poidsKg());
        assertEquals(DemandeStatut.GROUPEE, demande2.getStatut());
        assertSame(sac, colis2.getSac());
        assertEquals(DemandeStatut.GROUPEE, demande.getStatut()); // inchangee
        verify(colisRepository).saveAll(argThat(l -> ((List<?>) l).size() == 1));
        assertNotNull(sac.getTauxRemplissage());
        verify(auditLogRepository).save(argThat(a -> a.getAction() == AuditAction.MODIFICATION));
    }

    @Test
    void edition_retire_colis_et_libere_sa_demande() {
        // Sac avec 2 colis de 2 demandes : on retire celui de la demande 1
        DemandeTransport demande2 = new DemandeTransport();
        demande2.setDemandeId(UUID.randomUUID());
        demande2.setPmeCliente(tenant);
        demande2.setHub(hub);
        demande2.setStatut(DemandeStatut.GROUPEE);
        Colis colis2 = makeColis(demande2, new BigDecimal("5.0"), new BigDecimal("0.5"));
        colis2.setSac(sac);

        when(colisRepository.findBySacSacId(sac.getSacId()))
                .thenReturn(new ArrayList<>(List.of(colis1, colis2)))
                .thenReturn(new ArrayList<>(List.of(colis2)));
        when(colisRepository.findByDemandeDemandeId(demande2.getDemandeId()))
                .thenReturn(new ArrayList<>(List.of(colis2)));
        Vehicule v = new Vehicule();
        v.setCapacitePoidsKg(new BigDecimal("800"));
        v.setCapaciteVolumeM3(new BigDecimal("8.0"));
        when(vehiculeRepository.rechercherDisponiblesParHub(tenantId, hubId, VehiculeStatut.DISPONIBLE))
                .thenReturn(new ArrayList<>(List.of(v)));

        SacColisEditResponse resp = service.modifierColis(tenantId, sac.getSacId(),
                new SacColisEditRequest(List.of(), List.of(colis1.getColisId())));

        assertEquals(1, resp.nbColis());
        assertNull(colis1.getSac());
        // Plus aucun colis groupe de la demande 1 → retour attente groupage
        assertEquals(DemandeStatut.EN_ATTENTE_GROUPAGE, demande.getStatut());
        // La demande 2 garde son colis dans le sac → GROUPEE inchangee
        assertEquals(DemandeStatut.GROUPEE, demande2.getStatut());
        assertEquals(1, resp.demandesModifiees());
    }

    @Test
    void edition_refuse_si_le_sac_deviendrait_vide() {
        colis1.setSac(sac);

        BusinessException ex = assertThrows(BusinessException.class, () ->
                service.modifierColis(tenantId, sac.getSacId(),
                        new SacColisEditRequest(List.of(), List.of(colis1.getColisId()))));

        assertEquals(409, ex.getStatus());
        assertTrue(ex.getMessage().contains("vide"));
        verify(colisRepository, never()).saveAll(any());
    }

    @Test
    void edition_refuse_colis_deja_dans_un_autre_sac() {
        Sac autreSac = new Sac();
        autreSac.setSacId(UUID.randomUUID());
        Colis c2 = makeColis(demande, new BigDecimal("5.0"), new BigDecimal("0.5"));
        c2.setSac(autreSac);
        when(colisRepository.findById(c2.getColisId())).thenReturn(Optional.of(c2));

        BusinessException ex = assertThrows(BusinessException.class, () ->
                service.modifierColis(tenantId, sac.getSacId(),
                        new SacColisEditRequest(List.of(c2.getColisId()), List.of())));

        assertEquals(409, ex.getStatus());
        verify(colisRepository, never()).saveAll(any());
    }

    @Test
    void edition_refuse_colis_d_un_autre_hub() {
        Hub autreHub = new Hub();
        autreHub.setHubId(UUID.randomUUID());
        demande.setHub(autreHub);
        Colis c2 = makeColis(demande, new BigDecimal("5.0"), new BigDecimal("0.5"));
        when(colisRepository.findById(c2.getColisId())).thenReturn(Optional.of(c2));

        BusinessException ex = assertThrows(BusinessException.class, () ->
                service.modifierColis(tenantId, sac.getSacId(),
                        new SacColisEditRequest(List.of(c2.getColisId()), List.of())));

        assertEquals(409, ex.getStatus());
        assertTrue(ex.getMessage().contains("hub"));
    }

    @Test
    void edition_refuse_colis_deja_dans_ce_sac() {
        // colis1 est deja dans le sac → "deja dans un sac"
        when(colisRepository.findById(colis1.getColisId())).thenReturn(Optional.of(colis1));
        colis1.setSac(sac);

        BusinessException ex = assertThrows(BusinessException.class, () ->
                service.modifierColis(tenantId, sac.getSacId(),
                        new SacColisEditRequest(List.of(colis1.getColisId()), List.of())));

        assertEquals(409, ex.getStatus());
    }

    // ══════════ Colis libres ══════════

    @Test
    void colis_libres_filtre_par_hub_et_etat() {
        Colis libre = makeColis(demande, new BigDecimal("3.0"), new BigDecimal("0.3"));
        libre.setSac(null);

        DemandeTransport autreHubD = new DemandeTransport();
        autreHubD.setDemandeId(UUID.randomUUID());
        autreHubD.setHub(new Hub());
        autreHubD.getHub().setHubId(UUID.randomUUID());
        Colis autreHub = makeColis(autreHubD, new BigDecimal("2.0"), new BigDecimal("0.2"));

        Colis enTransit = makeColis(demande, new BigDecimal("1.0"), new BigDecimal("0.1"));
        enTransit.setEtat(ColisEtat.EN_TRANSIT);

        when(colisRepository.findByPmeClienteTenantIdAndSacIsNull(tenantId))
                .thenReturn(new ArrayList<>(List.of(libre, autreHub, enTransit)));

        List<ColisLibreResponse> result = service.colisLibres(tenantId, hubId);

        assertEquals(1, result.size());
        assertEquals(libre.getColisId(), result.get(0).colisId());
    }

    @Test
    void colis_du_sac_exige_un_sac_du_tenant() {
        assertThrows(ResourceNotFoundException.class, () -> service.colisDuSac(tenantId, UUID.randomUUID()));
    }
}
