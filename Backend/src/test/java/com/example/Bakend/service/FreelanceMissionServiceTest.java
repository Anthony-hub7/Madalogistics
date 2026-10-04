package com.example.Bakend.service;

import com.example.Bakend.dto.freelance.AccepterMissionDTO;
import com.example.Bakend.dto.freelance.MissionProposeeDTO;
import com.example.Bakend.entity.*;
import com.example.Bakend.entity.enums.*;
import com.example.Bakend.exception.BusinessException;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Tests de l'appel d'offres freelance :
 * - filtrage dur poids/volume du vehicule avant eligibilite
 * - first-accept : attribution + mise a jour des ressources
 * - refus si la mission est deja attribuee ou n'est pas freelance
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class FreelanceMissionServiceTest {

    @Mock private SacRepository sacRepository;
    @Mock private ColisRepository colisRepository;
    @Mock private ChauffeurRepository chauffeurRepository;
    @Mock private VehiculeRepository vehiculeRepository;
    @Mock private IndisponibiliteChauffeurRepository indisponibiliteChauffeurRepository;
    @Mock private AuditLogRepository auditLogRepository;

    @InjectMocks private FreelanceMissionService service;

    private final UUID tenantAgence = UUID.randomUUID();
    private final UUID utilisateurId = UUID.randomUUID();

    private PMECliente agence;
    private Hub hub;
    private DemandeTransport demande;
    private Sac sac;
    private Colis colis;
    private Chauffeur chauffeur;
    private Utilisateur utilisateur;

    @BeforeEach
    void setUp() {
        agence = new PMECliente();
        agence.setTenantId(tenantAgence);
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
        demande.setStatut(DemandeStatut.GROUPEE);
        demande.setModeLivraison(ModeLivraison.FREELANCE);
        demande.setAdresseLivraison("Analakely, Antananarivo");
        demande.setLatitudeLivraison(-18.91);
        demande.setLongitudeLivraison(47.53);

        sac = new Sac();
        sac.setSacId(UUID.randomUUID());
        sac.setPmeCliente(agence);
        sac.setHub(hub);
        sac.setStatut(SacStatut.CONSTITUE);
        sac.setDateDepartPrevue(LocalDate.now().plusDays(3));
        sac.setCategorieDominante("B");

        colis = new Colis();
        colis.setColisId(UUID.randomUUID());
        colis.setPmeCliente(agence);
        colis.setDemande(demande);
        colis.setPoidsKg(new BigDecimal("320.0"));
        colis.setVolumeM3(new BigDecimal("3.2"));

        utilisateur = new Utilisateur();
        utilisateur.setUtilisateurId(utilisateurId);
        utilisateur.setNom("Jean Rakoto");
        utilisateur.setRole(Role.CHAUFFEUR);
        utilisateur.setHabiliteValeur(false);

        chauffeur = new Chauffeur();
        chauffeur.setChauffeurId(UUID.randomUUID());
        chauffeur.setUtilisateur(utilisateur);
        chauffeur.setTypeChauffeur("FREELANCE");
        chauffeur.setStatutDossier("VALIDEE");
        chauffeur.setDisponible(true);
        chauffeur.setPermisExpiration(LocalDate.now().plusYears(3));
        chauffeur.setPermisCategories("B");

        when(sacRepository.rechercherProposees(SacStatut.CONSTITUE, ModeLivraison.FREELANCE))
                .thenReturn(new ArrayList<>(List.of(sac)));
        when(sacRepository.findByIdForUpdate(sac.getSacId())).thenReturn(Optional.of(sac));
        when(sacRepository.findById(sac.getSacId())).thenReturn(Optional.of(sac));
        when(colisRepository.findBySacSacId(sac.getSacId()))
                .thenReturn(new ArrayList<>(List.of(colis)));
        when(chauffeurRepository.findByUtilisateurId(utilisateurId)).thenReturn(Optional.of(chauffeur));
        when(indisponibiliteChauffeurRepository.findByChauffeurChauffeurId(any()))
                .thenReturn(new ArrayList<>());
        when(auditLogRepository.save(any(AuditLog.class))).thenAnswer(i -> i.getArgument(0));
    }

    private Vehicule vehicule(double poidsKg, double volumeM3) {
        Vehicule v = new Vehicule();
        v.setVehiculeId(UUID.randomUUID());
        v.setPmeCliente(agence);
        v.setImmatriculation("T-4567");
        v.setCapacitePoidsKg(BigDecimal.valueOf(poidsKg));
        v.setCapaciteVolumeM3(BigDecimal.valueOf(volumeM3));
        v.setStatut(VehiculeStatut.DISPONIBLE);
        v.setTypeVehicule(TypeVehicule.PICKUP);
        v.setPtacTonnes(new BigDecimal("3.0"));
        return v;
    }

    // ══════════ Filtrage dur avant eligibilite ══════════

    @Test
    void listerProposees_sac_trop_lourd_pour_le_vehicule_nest_pas_eligible() {
        chauffeur.setVehicule(vehicule(250, 10));

        List<MissionProposeeDTO> missions = service.listerProposees(utilisateurId);

        assertEquals(1, missions.size());
        MissionProposeeDTO m = missions.get(0);
        assertFalse(m.eligible());
        assertTrue(m.motifsIneligibles().stream().anyMatch(r -> r.contains("Poids du sac")));
        assertEquals(320.0, m.poidsKg());
        assertEquals(sac.getSacId(), m.sacId());
        assertEquals("TRANS MADA SARL", m.agenceNom());
        assertNotNull(m.distanceKm());
    }

    @Test
    void listerProposees_vehicule_suffisant_est_eligible() {
        chauffeur.setVehicule(vehicule(500, 20));

        List<MissionProposeeDTO> missions = service.listerProposees(utilisateurId);

        assertEquals(1, missions.size());
        assertTrue(missions.get(0).eligible());
        assertTrue(missions.get(0).motifsIneligibles().isEmpty());
    }

    @Test
    void listerProposees_sans_vehicule_déclare_ineligible() {
        chauffeur.setVehicule(null);

        List<MissionProposeeDTO> missions = service.listerProposees(utilisateurId);

        assertFalse(missions.get(0).eligible());
        assertTrue(missions.get(0).motifsIneligibles().stream()
                .anyMatch(r -> r.contains("Aucun vehicule")));
    }

    @Test
    void listerProposees_refuse_les_classe_A_sans_habilitation_valeur() {
        sac.setCategorieDominante("A");
        chauffeur.setVehicule(vehicule(500, 20));

        List<MissionProposeeDTO> missions = service.listerProposees(utilisateurId);

        assertFalse(missions.get(0).eligible());
        assertTrue(missions.get(0).motifsIneligibles().stream()
                .anyMatch(r -> r.contains("Habilitation valeur")));
    }

    // ══════════ First-accept ══════════

    @Test
    void accepter_attribue_le_sac_et_reserve_les_ressources() {
        chauffeur.setVehicule(vehicule(500, 20));

        AccepterMissionDTO resultat = service.accepter(utilisateurId, sac.getSacId());

        assertEquals(sac.getSacId(), resultat.sacId());
        assertEquals(SacStatut.AFFECTE.name(), resultat.statut());
        assertEquals(chauffeur.getChauffeurId(), resultat.chauffeurId());
        assertTrue(resultat.coordonneesCompletes());

        assertSame(chauffeur, sac.getChauffeur());
        assertSame(chauffeur.getVehicule(), sac.getVehicule());
        assertFalse(chauffeur.isDisponible());
        assertEquals(VehiculeStatut.AFFECTE, chauffeur.getVehicule().getStatut());

        verify(sacRepository).save(sac);
        verify(chauffeurRepository).save(chauffeur);
        verify(auditLogRepository).save(argThat(a ->
                a.getAction() == AuditAction.MODIFICATION
                        && a.getDetails().contains("MISSION_ACCEPTEE")));
    }

    @Test
    void accepter_echoue_si_le_sac_est_deja_attribue() {
        sac.setStatut(SacStatut.AFFECTE);

        BusinessException e = assertThrows(BusinessException.class,
                () -> service.accepter(utilisateurId, sac.getSacId()));

        assertEquals(409, e.getStatus());
        verify(sacRepository, never()).save(any());
    }

    @Test
    void accepter_echoue_si_la_mission_nest_pas_freelance() {
        chauffeur.setVehicule(vehicule(500, 20));
        demande.setModeLivraison(ModeLivraison.AGENCE);

        BusinessException e = assertThrows(BusinessException.class,
                () -> service.accepter(utilisateurId, sac.getSacId()));

        assertEquals(409, e.getStatus());
    }

    @Test
    void accepter_echoue_si_le_vehicule_est_trop_lourd() {
        chauffeur.setVehicule(vehicule(250, 10));

        BusinessException e = assertThrows(BusinessException.class,
                () -> service.accepter(utilisateurId, sac.getSacId()));

        assertEquals(409, e.getStatus());
        assertEquals(SacStatut.CONSTITUE, sac.getStatut());
        assertTrue(chauffeur.isDisponible());
    }

    @Test
    void accepter_echoue_pour_un_chauffeur_rattache() {
        chauffeur.setTypeChauffeur("RATTACHE");
        chauffeur.setVehicule(vehicule(500, 20));

        BusinessException e = assertThrows(BusinessException.class,
                () -> service.accepter(utilisateurId, sac.getSacId()));

        assertEquals(403, e.getStatus());
    }

    @Test
    void tenantDuSac_retourne_le_tenant_de_l_agence() {
        assertEquals(tenantAgence, service.tenantDuSac(sac.getSacId()));
    }
}
