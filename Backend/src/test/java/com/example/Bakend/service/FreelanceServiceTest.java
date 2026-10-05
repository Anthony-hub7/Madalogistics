package com.example.Bakend.service;

import com.example.Bakend.entity.*;
import com.example.Bakend.entity.enums.*;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
 * Tests du mode FREELANCE :
 * - creation directe d'un sac (1 commande = 1 sac, sans groupage)
 * - annulation : republication (FREELANCE) ou retour au groupage (AGENCE)
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class FreelanceServiceTest {

    @Mock private SacRepository sacRepository;
    @Mock private ColisRepository colisRepository;
    @Mock private DemandeTransportRepository demandeRepository;
    @Mock private TourneeRepository tourneeRepository;
    @Mock private ChauffeurRepository chauffeurRepository;
    @Mock private VehiculeRepository vehiculeRepository;
    @Mock private HubRepository hubRepository;
    @Mock private AuditLogRepository auditLogRepository;

    @InjectMocks private FreelanceService service;

    private final UUID tenantId = UUID.randomUUID();

    private PMECliente agence;
    private Hub hub;
    private DemandeTransport demande;
    private Colis colis1;
    private Colis colis2;
    private Sac sac;

    @BeforeEach
    void setUp() {
        agence = new PMECliente();
        agence.setTenantId(tenantId);
        agence.setNomEntreprise("TRANS MADA SARL");

        hub = new Hub();
        hub.setHubId(UUID.randomUUID());
        hub.setNom("Antsirabe Hub");
        hub.setPmeCliente(agence);
        hub.setLatitude(-19.26);
        hub.setLongitude(47.03);

        demande = new DemandeTransport();
        demande.setDemandeId(UUID.randomUUID());
        demande.setPmeCliente(agence);
        demande.setHub(hub);
        demande.setStatut(DemandeStatut.EN_ATTENTE_GROUPAGE);
        demande.setModeLivraison(ModeLivraison.FREELANCE);
        demande.setDateDepartCalculee(LocalDate.now().plusDays(5));
        demande.setAdresseLivraison("Analakely");

        colis1 = makeColis(new BigDecimal("200.0"), new BigDecimal("2.0"));
        colis2 = makeColis(new BigDecimal("120.0"), new BigDecimal("1.2"));
        colis1.setDemande(demande);
        colis2.setDemande(demande);
        demande.setColis(new ArrayList<>(List.of(colis1, colis2)));

        sac = new Sac();
        sac.setSacId(UUID.randomUUID());
        sac.setPmeCliente(agence);
        sac.setHub(hub);
        sac.setStatut(SacStatut.CONSTITUE);

        when(sacRepository.save(any(Sac.class))).thenAnswer(i -> {
            Sac s = i.getArgument(0);
            if (s.getSacId() == null) s.setSacId(UUID.randomUUID());
            return s;
        });
        when(colisRepository.saveAll(anyList())).thenAnswer(i -> i.getArgument(0));
        when(demandeRepository.save(any(DemandeTransport.class))).thenAnswer(i -> i.getArgument(0));
        when(auditLogRepository.save(any(AuditLog.class))).thenAnswer(i -> i.getArgument(0));
        when(vehiculeRepository.rechercherDisponiblesParHub(any(), any(), any()))
                .thenReturn(new ArrayList<>());
    }

    private Colis makeColis(BigDecimal poids, BigDecimal volume) {
        Colis c = new Colis();
        c.setColisId(UUID.randomUUID());
        c.setPmeCliente(agence);
        c.setPoidsKg(poids);
        c.setVolumeM3(volume);
        c.setEtat(ColisEtat.EN_ATTENTE);
        c.setCreatedAt(java.time.LocalDateTime.now());
        return c;
    }

    // ══════════ Creation : 1 commande = 1 sac ══════════

    @Test
    void creerSacDirect_cree_un_sac_unique_et_groupe_la_demande() {
        FreelanceService.SacFreelance resultat =
                service.creerSacDirect(tenantId, demande, null);

        assertNotNull(resultat.sacId());
        assertEquals(2, resultat.nbColis());
        assertEquals(320.0, resultat.poidsKg(), 0.01);
        assertEquals(3.2, resultat.volumeM3(), 0.01);

        Sac cree = capturerSac();
        assertEquals(SacStatut.CONSTITUE, cree.getStatut());
        assertNull(cree.getRunGroupage());
        assertEquals(hub, cree.getHub());
        assertEquals(agence, cree.getPmeCliente());
        assertEquals(DemandeStatut.GROUPEE, demande.getStatut());
        assertSame(cree, colis1.getSac());
        assertSame(cree, colis2.getSac());

        // La colonne audit_log.details est JSONB : la moindre date non quotee
        // fait exploser l'INSERT avec un "invalid input syntax for type json"
        // (traduit en DataIntegrityViolationException "violation d'integrite").
        AuditLog audit = capturerAudit();
        assertEquals(AuditAction.CREATION, audit.getAction());
        assertTrue(audit.getDetails().contains("freelance"));
        assertDoesNotThrow(() -> new ObjectMapper().readTree(audit.getDetails()),
                "audit.details n'est pas un JSON valide : " + audit.getDetails());
    }

    @Test
    void creerSacDirect_refuse_un_statut_autre_quen_attente_de_groupage() {
        demande.setStatut(DemandeStatut.CREEE);

        BusinessException e = assertThrows(BusinessException.class,
                () -> service.creerSacDirect(tenantId, demande, null));

        assertEquals(409, e.getStatus());
        verify(sacRepository, never()).save(any());
    }

    @Test
    void creerSacDirect_refuse_un_mode_autre_que_freelance() {
        demande.setModeLivraison(ModeLivraison.AGENCE);

        BusinessException e = assertThrows(BusinessException.class,
                () -> service.creerSacDirect(tenantId, demande, null));

        assertEquals(400, e.getStatus());
    }

    @Test
    void creerSacDirect_refuse_une_demande_sans_colis() {
        demande.setColis(new ArrayList<>());

        BusinessException e = assertThrows(BusinessException.class,
                () -> service.creerSacDirect(tenantId, demande, null));

        assertEquals(409, e.getStatus());
    }

    // ══════════ Annulation ══════════

    @Test
    void annuler_en_freelance_republie_la_mission() {
        sac.setStatut(SacStatut.AFFECTE);
        Chauffeur ch = new Chauffeur();
        ch.setChauffeurId(UUID.randomUUID());
        ch.setDisponible(false);
        Vehicule v = new Vehicule();
        v.setVehiculeId(UUID.randomUUID());
        v.setStatut(VehiculeStatut.AFFECTE);
        sac.setChauffeur(ch);
        sac.setVehicule(v);

        colis1.setSac(sac);
        colis2.setSac(sac);
        when(sacRepository.findById(sac.getSacId())).thenReturn(Optional.of(sac));
        when(colisRepository.findBySacSacId(sac.getSacId()))
                .thenReturn(new ArrayList<>(List.of(colis1, colis2)));
        Tournee tournee = new Tournee();
        tournee.setTourneeId(UUID.randomUUID());
        tournee.setSac(sac);
        when(tourneeRepository.findBySacSacId(sac.getSacId()))
                .thenReturn(new ArrayList<>(List.of(tournee)));
        when(sacRepository.findByChauffeurChauffeurId(ch.getChauffeurId()))
                .thenReturn(new ArrayList<>(List.of(sac)));
        when(sacRepository.findByVehiculeVehiculeId(v.getVehiculeId()))
                .thenReturn(new ArrayList<>(List.of(sac)));

        FreelanceService.AnnulationResult resultat =
                service.annulerAffectation(tenantId, sac.getSacId(), "FREELANCE", "plus de dispo");

        assertEquals(ModeLivraison.FREELANCE.name(), resultat.modeCible());
        assertEquals(SacStatut.CONSTITUE.name(), resultat.statutSac());
        assertEquals(1, resultat.tourneesSupprimees());
        assertTrue(resultat.ressourcesLiberees());
        assertNull(sac.getChauffeur());
        assertNull(sac.getVehicule());
        assertTrue(ch.isDisponible());
        assertEquals(VehiculeStatut.DISPONIBLE, v.getStatut());
        verify(tourneeRepository).deleteAll(anyList());
        verify(sacRepository, never()).delete(any(Sac.class));
        verify(auditLogRepository).save(argThat(a ->
                a.getDetails().contains("MISSION_REPUBLIEE")));
    }

    @Test
    void annuler_en_agence_remet_les_demandes_en_attente_de_groupage() {
        demande.setStatut(DemandeStatut.GROUPEE);
        colis1.setSac(sac);
        colis2.setSac(sac);
        when(sacRepository.findById(sac.getSacId())).thenReturn(Optional.of(sac));
        when(colisRepository.findBySacSacId(sac.getSacId()))
                .thenReturn(new ArrayList<>(List.of(colis1, colis2)));
        when(tourneeRepository.findBySacSacId(sac.getSacId())).thenReturn(new ArrayList<>());

        FreelanceService.AnnulationResult resultat =
                service.annulerAffectation(tenantId, sac.getSacId(), "AGENCE", null);

        assertEquals(ModeLivraison.AGENCE.name(), resultat.modeCible());
        assertEquals(1, resultat.demandesRetournees());
        assertNull(colis1.getSac());
        assertNull(colis2.getSac());
        assertEquals(DemandeStatut.EN_ATTENTE_GROUPAGE, demande.getStatut());
        assertEquals(ModeLivraison.AGENCE, demande.getModeLivraison());
        verify(sacRepository).delete(sac);
        verify(auditLogRepository).save(argThat(a ->
                a.getDetails().contains("MISSION_REMISE_EN_GROUPAGE")));
    }

    @Test
    void annuler_refuse_une_mission_deja_en_transit() {
        sac.setStatut(SacStatut.EN_TRANSIT);
        when(sacRepository.findById(sac.getSacId())).thenReturn(Optional.of(sac));
        when(colisRepository.findBySacSacId(sac.getSacId()))
                .thenReturn(new ArrayList<>(List.of(colis1)));

        BusinessException e = assertThrows(BusinessException.class,
                () -> service.annulerAffectation(tenantId, sac.getSacId(), "AGENCE", null));

        assertEquals(409, e.getStatus());
    }

    @Test
    void annuler_refuse_un_mode_cible_invalide() {
        when(sacRepository.findById(sac.getSacId())).thenReturn(Optional.of(sac));

        BusinessException e = assertThrows(BusinessException.class,
                () -> service.annulerAffectation(tenantId, sac.getSacId(), "MOTO", null));

        assertEquals(400, e.getStatus());
    }

    @Test
    void annuler_refuse_un_sac_non_freelance() {
        demande.setModeLivraison(ModeLivraison.AGENCE);
        when(sacRepository.findById(sac.getSacId())).thenReturn(Optional.of(sac));
        when(colisRepository.findBySacSacId(sac.getSacId()))
                .thenReturn(new ArrayList<>(List.of(colis1)));

        BusinessException e = assertThrows(BusinessException.class,
                () -> service.annulerAffectation(tenantId, sac.getSacId(), "AGENCE", null));

        assertEquals(409, e.getStatus());
    }

    private Sac capturerSac() {
        var capturer = ArgumentCaptor.forClass(Sac.class);
        verify(sacRepository).save(capturer.capture());
        return capturer.getValue();
    }

    private AuditLog capturerAudit() {
        var capturer = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(capturer.capture());
        return capturer.getValue();
    }
}
