package com.example.Bakend.service;

import com.example.Bakend.dto.incident.AnnulerSacIncidentResponse;
import com.example.Bakend.dto.response.VehiculeHorsServiceResponse;
import com.example.Bakend.entity.AuditLog;
import com.example.Bakend.entity.PMECliente;
import com.example.Bakend.entity.Sac;
import com.example.Bakend.entity.Tournee;
import com.example.Bakend.entity.Vehicule;
import com.example.Bakend.entity.enums.SacStatut;
import com.example.Bakend.entity.enums.TourneeStatut;
import com.example.Bakend.entity.enums.VehiculeStatut;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.exception.ResourceNotFoundException;
import com.example.Bakend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Mise hors service d'un vehicule sur incident (panne) :
 * - annulation en douceur des sacs actifs rattaches (colis liberes,
 *   demandes en attente de groupage, tournees terminees)
 * - bascule du vehicule en HORS_SERVICE + trace d'audit
 * - garde-fous : deja hors service (409), tenant inconnu (404)
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class VehiculeServiceTest {

    @Mock private VehiculeRepository vehiculeRepository;
    @Mock private HubRepository hubRepository;
    @Mock private PMEClienteRepository pmeClienteRepository;
    @Mock private SacRepository sacRepository;
    @Mock private CompatibiliteService compatibiliteService;
    @Mock private SacEditionService sacEditionService;
    @Mock private TourneeRepository tourneeRepository;
    @Mock private AuditLogRepository auditLogRepository;

    @InjectMocks private VehiculeService service;

    private final UUID tenantId = UUID.randomUUID();
    private final UUID vehiculeId = UUID.randomUUID();

    private PMECliente agence;
    private Vehicule vehicule;

    @BeforeEach
    void setUp() {
        agence = new PMECliente();
        agence.setTenantId(tenantId);
        agence.setNomEntreprise("TRANS MADA SARL");

        vehicule = new Vehicule();
        vehicule.setVehiculeId(vehiculeId);
        vehicule.setPmeCliente(agence);
        vehicule.setImmatriculation("1234 ABP");
        vehicule.setStatut(VehiculeStatut.EN_TOURNEE);

        when(vehiculeRepository.findByPmeClienteTenantIdAndVehiculeId(tenantId, vehiculeId))
                .thenReturn(Optional.of(vehicule));
        when(pmeClienteRepository.findByTenantId(tenantId)).thenReturn(Optional.of(agence));
        when(vehiculeRepository.save(any(Vehicule.class))).thenAnswer(i -> i.getArgument(0));
    }

    private Sac sac(UUID sacId, SacStatut statut) {
        Sac s = new Sac();
        s.setSacId(sacId);
        s.setPmeCliente(agence);
        s.setStatut(statut);
        return s;
    }

    private Tournee tournee(TourneeStatut statut) {
        Tournee t = new Tournee();
        t.setStatut(statut);
        return t;
    }

    @Test
    void mettreHorsService_annuleLesSacsActifsPuisBasculeLeVehicule() {
        UUID idA = UUID.randomUUID();
        UUID idB = UUID.randomUUID();
        UUID idConstitue = UUID.randomUUID();

        Sac affecte = sac(idA, SacStatut.AFFECTE);
        Sac enTransit = sac(idB, SacStatut.EN_TRANSIT);
        Sac constitue = sac(idConstitue, SacStatut.CONSTITUE);

        when(sacRepository.findByVehiculeVehiculeId(vehiculeId))
                .thenReturn(List.of(affecte, enTransit, constitue));
        when(tourneeRepository.findBySacSacId(idA)).thenReturn(List.of(tournee(TourneeStatut.PLANIFIEE)));
        when(tourneeRepository.findBySacSacId(idB)).thenReturn(List.of());
        when(sacEditionService.annulerIncident(tenantId, idA, "Panne moteur"))
                .thenReturn(new AnnulerSacIncidentResponse(idA, "ANNULE", 3, 1, true));
        when(sacEditionService.annulerIncident(tenantId, idB, "Panne moteur"))
                .thenReturn(new AnnulerSacIncidentResponse(idB, "ANNULE", 2, 1, false));

        VehiculeHorsServiceResponse res = service.mettreHorsService(tenantId, vehiculeId, "Panne moteur");

        assertEquals(VehiculeStatut.HORS_SERVICE, vehicule.getStatut());
        assertEquals(2, res.sacsAnnules());
        assertEquals(5, res.colisLiberes());
        assertEquals(2, res.demandesRetournees());
        assertEquals(1, res.tourneesTerminees());
        assertEquals("1234 ABP", res.immatriculation());
        assertEquals("HORS_SERVICE", res.statutVehicule());

        // Le sac CONSTITUE n'est pas touche
        verify(sacEditionService, never()).annulerIncident(eq(tenantId), eq(idConstitue), anyString());

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        AuditLog audit = captor.getValue();
        assertEquals("Vehicule", audit.getEntite());
        assertEquals(vehiculeId, audit.getEntiteId());
        assertTrue(audit.getDetails().contains("VEHICULE_HORS_SERVICE"));
        assertTrue(audit.getDetails().contains("Panne moteur"));
        assertTrue(audit.getDetails().contains("\"sacsAnnules\":2"));
    }

    @Test
    void mettreHorsService_sansSacActif_basculeDirectement() {
        when(sacRepository.findByVehiculeVehiculeId(vehiculeId))
                .thenReturn(List.of(sac(UUID.randomUUID(), SacStatut.CONSTITUE)));

        VehiculeHorsServiceResponse res = service.mettreHorsService(tenantId, vehiculeId, null);

        assertEquals(VehiculeStatut.HORS_SERVICE, vehicule.getStatut());
        assertEquals(0, res.sacsAnnules());
        assertEquals(0, res.colisLiberes());
        assertEquals(0, res.tourneesTerminees());
        verify(sacEditionService, never()).annulerIncident(any(), any(), any());

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        // Motif par defaut trace dans l'audit
        assertTrue(captor.getValue().getDetails().contains("Panne signal"));
    }

    @Test
    void mettreHorsService_dejaHorsService_refuse() {
        vehicule.setStatut(VehiculeStatut.HORS_SERVICE);

        BusinessException e = assertThrows(BusinessException.class,
                () -> service.mettreHorsService(tenantId, vehiculeId, "Panne"));

        assertEquals(409, e.getStatus());
        verify(sacEditionService, never()).annulerIncident(any(), any(), any());
        verify(auditLogRepository, never()).save(any());
    }

    @Test
    void mettreHorsService_vehiculeDunAutreTenant_introuvable() {
        when(vehiculeRepository.findByPmeClienteTenantIdAndVehiculeId(tenantId, vehiculeId))
                .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> service.mettreHorsService(tenantId, vehiculeId, "Panne"));
        verify(sacEditionService, never()).annulerIncident(any(), any(), any());
    }

    @Test
    void mettreHorsService_vehiculeLibre_neToucheAucunSac() {
        vehicule.setStatut(VehiculeStatut.DISPONIBLE);
        when(sacRepository.findByVehiculeVehiculeId(vehiculeId)).thenReturn(List.of());

        VehiculeHorsServiceResponse res = service.mettreHorsService(tenantId, vehiculeId, "Panne");

        assertEquals(VehiculeStatut.HORS_SERVICE, vehicule.getStatut());
        assertEquals(0, res.sacsAnnules());
        verify(tourneeRepository, never()).findBySacSacId(any());
        verify(sacEditionService, never()).annulerIncident(any(), any(), any());
    }
}
