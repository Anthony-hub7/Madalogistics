package com.example.Bakend.service;

import com.example.Bakend.dto.optimisation.SacColisEditResponse;
import com.example.Bakend.dto.optimisation.SacCreerRequest;
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
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Tests creation manuelle d'un sac (POST /api/sacs) :
 * - reunion de colis libres d'un hub en un sac CONSTITUE
 * - demande groupee + audit CREATION
 * - garde-fous : hub manquant, colis vides, deja dans un sac, autre hub/tenant, etat
 * - depassement de capacite autorise (taux > 100 %)
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SacCreerServiceTest {

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
    private DemandeTransport demande;
    private Colis colis1;
    private Colis colis2;

    @BeforeEach
    void setUp() {
        tenant = new PMECliente();
        tenant.setTenantId(tenantId);

        hub = new Hub();
        hub.setHubId(hubId);
        hub.setPmeCliente(tenant);

        demande = new DemandeTransport();
        demande.setDemandeId(UUID.randomUUID());
        demande.setPmeCliente(tenant);
        demande.setHub(hub);
        demande.setStatut(DemandeStatut.EN_ATTENTE_GROUPAGE);
        demande.setDateDepartCalculee(LocalDate.now().plusDays(3));

        colis1 = makeColis(demande, new BigDecimal("10.0"), new BigDecimal("1.0"));
        colis2 = makeColis(demande, new BigDecimal("20.0"), new BigDecimal("1.2"));

        when(colisRepository.findById(colis1.getColisId())).thenReturn(Optional.of(colis1));
        when(colisRepository.findById(colis2.getColisId())).thenReturn(Optional.of(colis2));
        when(colisRepository.findByDemandeDemandeId(demande.getDemandeId()))
                .thenReturn(new ArrayList<>(List.of(colis1, colis2)));
        when(demandeRepository.findById(demande.getDemandeId())).thenReturn(Optional.of(demande));
        when(sacRepository.save(any(Sac.class))).thenAnswer(inv -> {
            Sac s = inv.getArgument(0);
            if (s.getSacId() == null) s.setSacId(UUID.randomUUID());
            return s;
        });
        when(auditLogRepository.save(any(AuditLog.class))).thenAnswer(inv -> inv.getArgument(0));
        // Aucun vehicule DISPONIBLE → capacite de repli 5000 kg / 20 m3
        when(vehiculeRepository.rechercherDisponiblesParHub(any(), any(), any()))
                .thenReturn(new ArrayList<>());
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

    private SacCreerRequest demande(List<UUID> colisIds) {
        return new SacCreerRequest(hubId, colisIds);
    }

    // ══════════ Creation ══════════

    @Test
    void cree_sac_reunit_les_colis_et_groupe_la_demande() {
        SacColisEditResponse resp = service.creer(tenantId,
                demande(List.of(colis1.getColisId(), colis2.getColisId())));

        assertNotNull(resp.sacId());
        assertEquals("CONSTITUE", resp.statut());
        assertEquals(2, resp.nbColis());
        assertEquals(30.0, resp.poidsKg());
        assertEquals(2.2, resp.volumeM3());
        // max(30/5000, 2.2/20) → 11 %
        assertEquals(11.0, resp.tauxRemplissage());
        assertEquals(1, resp.demandesModifiees());

        assertNotNull(colis1.getSac());
        assertNotNull(colis2.getSac());
        assertEquals(resp.sacId(), colis1.getSac().getSacId());
        assertEquals(DemandeStatut.GROUPEE, demande.getStatut());

        verify(auditLogRepository).save(argThat(a ->
                a.getAction() == AuditAction.CREATION
                        && a.getEntite().equals("Sac")
                        && a.getEntiteId().equals(resp.sacId())));
    }

    @Test
    void date_depart_est_le_min_des_demandes() {
        service.creer(tenantId, demande(List.of(colis1.getColisId())));

        LocalDate attendu = LocalDate.now().plusDays(3);
        verify(sacRepository).save(argThat(s ->
                s.getDateDepartPlafond() != null
                        && s.getDateDepartPlafond().equals(attendu)
                        && s.getDateDepartPrevue().equals(attendu)
                        && s.getHub() != null
                        && s.getHub().getHubId().equals(hubId)
                        && s.getStatut() == SacStatut.CONSTITUE));
    }

    @Test
    void depassement_de_capacite_autorise_taux_superieur_100() {
        Colis lourd = makeColis(demande, new BigDecimal("6000.0"), new BigDecimal("1.0"));
        when(colisRepository.findById(lourd.getColisId())).thenReturn(Optional.of(lourd));

        SacColisEditResponse resp = service.creer(tenantId, demande(List.of(lourd.getColisId())));

        assertEquals(120.0, resp.tauxRemplissage());
        assertNotNull(lourd.getSac());
    }

    @Test
    void colis_en_doublon_est_compte_une_fois() {
        SacColisEditResponse resp = service.creer(tenantId,
                demande(List.of(colis1.getColisId(), colis1.getColisId())));

        assertEquals(1, resp.nbColis());
    }

    // ══════════ Rejets ══════════

    @Test
    void refuse_hub_manquant() {
        BusinessException e = assertThrows(BusinessException.class, () ->
                service.creer(tenantId, new SacCreerRequest(null, List.of(colis1.getColisId()))));
        assertEquals(400, e.getStatus());
    }

    @Test
    void refuse_colis_vide() {
        BusinessException e = assertThrows(BusinessException.class, () ->
                service.creer(tenantId, demande(List.of())));
        assertEquals(400, e.getStatus());
        assertThrows(BusinessException.class, () ->
                service.creer(tenantId, new SacCreerRequest(hubId, null)));
    }

    @Test
    void refuse_colis_inconnu() {
        UUID inconnu = UUID.randomUUID();
        when(colisRepository.findById(inconnu)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () ->
                service.creer(tenantId, demande(List.of(inconnu))));
    }

    @Test
    void refuse_colis_deja_dans_un_sac() {
        Sac autre = new Sac();
        autre.setSacId(UUID.randomUUID());
        colis1.setSac(autre);

        BusinessException e = assertThrows(BusinessException.class, () ->
                service.creer(tenantId, demande(List.of(colis1.getColisId()))));
        assertEquals(409, e.getStatus());
        assertNull(colis2.getSac());
    }

    @Test
    void refuse_colis_d_un_autre_hub() {
        UUID autreHub = UUID.randomUUID();

        BusinessException e = assertThrows(BusinessException.class, () ->
                service.creer(tenantId, new SacCreerRequest(autreHub, List.of(colis1.getColisId()))));
        assertEquals(409, e.getStatus());
        assertNull(colis1.getSac());
    }

    @Test
    void refuse_colis_d_un_autre_tenant() {
        colis1.getPmeCliente().setTenantId(UUID.randomUUID());

        BusinessException e = assertThrows(BusinessException.class, () ->
                service.creer(tenantId, demande(List.of(colis1.getColisId()))));
        assertEquals(403, e.getStatus());
    }

    @Test
    void refuse_colis_etat_non_attente() {
        colis1.setEtat(ColisEtat.GROUPEE);

        BusinessException e = assertThrows(BusinessException.class, () ->
                service.creer(tenantId, demande(List.of(colis1.getColisId()))));
        assertEquals(409, e.getStatus());
        assertNull(colis1.getSac());
    }

    @Test
    void aucune_creation_si_un_seul_colis_est_invalide() {
        colis2.setEtat(ColisEtat.LIVRE);

        assertThrows(BusinessException.class, () -> service.creer(tenantId,
                demande(List.of(colis1.getColisId(), colis2.getColisId()))));

        assertNull(colis1.getSac());
        assertNull(colis2.getSac());
        verify(sacRepository, never()).save(any(Sac.class));
        assertEquals(DemandeStatut.EN_ATTENTE_GROUPAGE, demande.getStatut());
    }
}
