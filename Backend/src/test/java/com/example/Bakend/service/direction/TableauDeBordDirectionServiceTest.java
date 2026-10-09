package com.example.Bakend.service.direction;

import com.example.Bakend.dto.direction.TableauDeBordDirectionResponse;
import com.example.Bakend.entity.Chauffeur;
import com.example.Bakend.entity.ClientFinal;
import com.example.Bakend.entity.Colis;
import com.example.Bakend.entity.DemandeTransport;
import com.example.Bakend.entity.Facture;
import com.example.Bakend.entity.GrilleTarifaire;
import com.example.Bakend.entity.Notification;
import com.example.Bakend.entity.Sac;
import com.example.Bakend.entity.Tournee;
import com.example.Bakend.entity.Vehicule;
import com.example.Bakend.entity.enums.DemandeStatut;
import com.example.Bakend.entity.enums.FactureStatut;
import com.example.Bakend.entity.enums.SacStatut;
import com.example.Bakend.entity.enums.TourneeStatut;
import com.example.Bakend.entity.enums.VehiculeStatut;
import com.example.Bakend.exception.ResourceNotFoundException;
import com.example.Bakend.service.NotificationService;
import com.example.Bakend.repository.ChauffeurRepository;
import com.example.Bakend.repository.DemandeTransportRepository;
import com.example.Bakend.repository.FactureRepository;
import com.example.Bakend.repository.GrilleTarifaireRepository;
import com.example.Bakend.repository.NotificationRepository;
import com.example.Bakend.repository.PMEClienteRepository;
import com.example.Bakend.repository.SacRepository;
import com.example.Bakend.repository.TourneeRepository;
import com.example.Bakend.repository.VehiculeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

/**
 * Tests TableauDeBordDirectionService — agregation en lecture seule de
 * l'activite geree par le responsable logistique (commandes, sacs, tournees,
 * flotte, tarifs, factures, equipe).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TableauDeBordDirectionServiceTest {

    @Mock private PMEClienteRepository pmeClienteRepository;
    @Mock private DemandeTransportRepository demandeRepository;
    @Mock private SacRepository sacRepository;
    @Mock private TourneeRepository tourneeRepository;
    @Mock private VehiculeRepository vehiculeRepository;
    @Mock private NotificationRepository notificationRepository;
    @Mock private GrilleTarifaireRepository grilleTarifaireRepository;
    @Mock private FactureRepository factureRepository;
    @Mock private ChauffeurRepository chauffeurRepository;

    @InjectMocks private TableauDeBordDirectionService service;

    private UUID tenantId;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        when(pmeClienteRepository.existsByTenantId(tenantId)).thenReturn(true);

        when(demandeRepository.findByPmeClienteTenantId(tenantId)).thenReturn(List.of());
        when(sacRepository.findByPmeClienteTenantId(tenantId)).thenReturn(List.of());
        when(tourneeRepository.findByPmeClienteTenantId(tenantId)).thenReturn(List.of());
        when(vehiculeRepository.findByPmeClienteTenantId(tenantId)).thenReturn(List.of());
        when(notificationRepository.rechercherParType(tenantId, NotificationService.TYPE_INCIDENT_DECLARE))
                .thenReturn(List.of());
        when(grilleTarifaireRepository.findByPmeClienteTenantIdAndActifTrueOrderByLibelleAsc(tenantId))
                .thenReturn(List.of());
        when(factureRepository.findByPmeClienteTenantId(tenantId)).thenReturn(List.of());
        when(chauffeurRepository.findByPmeClienteTenantId(tenantId)).thenReturn(List.of());
    }

    private DemandeTransport demande(DemandeStatut statut, String destination) {
        DemandeTransport d = new DemandeTransport();
        d.setDemandeId(UUID.randomUUID());
        d.setStatut(statut);
        d.setAdresseLivraison(destination);
        d.setCreatedAt(LocalDateTime.now());
        return d;
    }

    private Sac sac(SacStatut statut, Double taux, int nbColis) {
        Sac s = new Sac();
        s.setSacId(UUID.randomUUID());
        s.setStatut(statut);
        s.setTauxRemplissage(taux != null ? BigDecimal.valueOf(taux) : null);
        List<Colis> colis = new java.util.ArrayList<>();
        for (int i = 0; i < nbColis; i++) {
            Colis c = new Colis();
            c.setColisId(UUID.randomUUID());
            colis.add(c);
        }
        s.setColis(colis);
        return s;
    }

    private Tournee tournee(TourneeStatut statut, String km) {
        Tournee t = new Tournee();
        t.setTourneeId(UUID.randomUUID());
        t.setStatut(statut);
        t.setDistanceTotaleKm(km != null ? new BigDecimal(km) : null);
        return t;
    }

    private Vehicule vehicule(VehiculeStatut statut) {
        Vehicule v = new Vehicule();
        v.setVehiculeId(UUID.randomUUID());
        v.setStatut(statut);
        return v;
    }

    private Notification incident(boolean lu) {
        Notification n = new Notification();
        n.setNotificationId(UUID.randomUUID());
        n.setType(NotificationService.TYPE_INCIDENT_DECLARE);
        n.setTitre("Panne vehicule");
        n.setMessage("Vehicule en panne sur la route");
        n.setLu(lu);
        n.setCreatedAt(LocalDateTime.now());
        return n;
    }

    private GrilleTarifaire grille(String kg, String m3, String km, String minimum) {
        GrilleTarifaire g = new GrilleTarifaire();
        g.setGrilleId(UUID.randomUUID());
        g.setLibelle("Grille standard");
        g.setActif(true);
        g.setPrixParKg(kg != null ? new BigDecimal(kg) : null);
        g.setPrixParM3(m3 != null ? new BigDecimal(m3) : null);
        g.setPrixParKm(km != null ? new BigDecimal(km) : null);
        g.setPrixMinimum(minimum != null ? new BigDecimal(minimum) : null);
        return g;
    }

    private Facture facture(FactureStatut statut, String montant) {
        Facture f = new Facture();
        f.setFactureId(UUID.randomUUID());
        f.setStatut(statut);
        f.setMontantTotal(new BigDecimal(montant));
        f.setDateEmission(LocalDateTime.now());
        DemandeTransport d = new DemandeTransport();
        d.setDemandeId(UUID.randomUUID());
        d.setAdresseLivraison("Antananarivo");
        ClientFinal client = new ClientFinal();
        client.setNom("Ets Rakoto");
        d.setClientFinal(client);
        f.setDemande(d);
        return f;
    }

    private Chauffeur chauffeur(String statutDossier, String type, boolean disponible) {
        Chauffeur c = new Chauffeur();
        c.setChauffeurId(UUID.randomUUID());
        c.setStatutDossier(statutDossier);
        c.setTypeChauffeur(type);
        c.setDisponible(disponible);
        return c;
    }

    @Test
    void agregeTousLesBlocsDeLActiviteDuResponsableLogistique() {
        var d1 = demande(DemandeStatut.LIVREE, "Antananarivo");
        var d2 = demande(DemandeStatut.LIVREE, "Toamasina");
        var d3 = demande(DemandeStatut.CREEE, "Antsirabe");
        when(demandeRepository.findByPmeClienteTenantId(tenantId)).thenReturn(List.of(d1, d2, d3));

        when(sacRepository.findByPmeClienteTenantId(tenantId)).thenReturn(
                List.of(sac(SacStatut.LIVRE, 80.0, 4), sac(SacStatut.AFFECTE, 60.0, 6)));

        when(tourneeRepository.findByPmeClienteTenantId(tenantId)).thenReturn(
                List.of(tournee(TourneeStatut.TERMINEE, "120.5"), tournee(TourneeStatut.PLANIFIEE, "79.5")));

        when(vehiculeRepository.findByPmeClienteTenantId(tenantId)).thenReturn(
                List.of(vehicule(VehiculeStatut.DISPONIBLE), vehicule(VehiculeStatut.EN_TOURNEE),
                        vehicule(VehiculeStatut.HORS_SERVICE)));

        when(notificationRepository.rechercherParType(tenantId, NotificationService.TYPE_INCIDENT_DECLARE))
                .thenReturn(List.of(incident(false), incident(true)));

        when(grilleTarifaireRepository.findByPmeClienteTenantIdAndActifTrueOrderByLibelleAsc(tenantId))
                .thenReturn(List.of(grille("1000", "50000", "500", "20000"),
                        grille("2000", null, null, null)));

        when(factureRepository.findByPmeClienteTenantId(tenantId)).thenReturn(
                List.of(facture(FactureStatut.PAYEE, "50000"),
                        facture(FactureStatut.EMISE, "30000"),
                        facture(FactureStatut.EMISE, "20000"),
                        facture(FactureStatut.ANNULEE, "10000")));

        when(chauffeurRepository.findByPmeClienteTenantId(tenantId)).thenReturn(
                List.of(chauffeur("VALIDEE", "INTERNE", true),
                        chauffeur("EN_ATTENTE", "FREELANCE", false),
                        chauffeur("VALIDEE", "INTERNE", true)));

        TableauDeBordDirectionResponse r = service.construire(tenantId);

        // Activite
        assertEquals(3, r.activite().nbCommandes());
        assertEquals(2L, r.activite().commandesParStatut().get("LIVREE"));
        assertEquals(1L, r.activite().commandesParStatut().get("CREEE"));
        assertEquals(2, r.activite().nbSacs());
        assertEquals(70.0, r.activite().tauxRemplissageMoyen());
        assertEquals(10, r.activite().nbColis());
        assertEquals(2, r.activite().nbTournees());
        assertEquals(200.0, r.activite().kmTotal());
        assertEquals(3, r.activite().dernieresCommandes().size());
        assertTrue(r.activite().dernieresCommandes().stream()
                .allMatch(c -> c.destination() != null && c.statut() != null));

        // Flotte
        assertEquals(3, r.flotte().nbVehicules());
        assertEquals(1L, r.flotte().vehiculesParStatut().get("DISPONIBLE"));
        assertEquals(1, r.flotte().nbDisponibles());
        assertEquals(1, r.flotte().incidentsNonLus());
        assertEquals(2, r.flotte().derniersIncidents().size());
        assertTrue(r.flotte().derniersIncidents().stream().allMatch(i -> i.sacId() == null));

        // Tarification
        assertEquals(2, r.tarification().nbGrillesActives());
        assertEquals(1500.0, r.tarification().prixMoyenKg());
        assertEquals(50000.0, r.tarification().prixMoyenM3());
        assertEquals(500.0, r.tarification().prixMoyenKm());
        assertEquals(20000.0, r.tarification().prixMinimumMoyen());
        assertEquals(new BigDecimal("50000"), r.tarification().caPaye());
        assertEquals(new BigDecimal("50000"), r.tarification().caEnAttente());
        assertEquals(new BigDecimal("10000"), r.tarification().caAnnule());
        assertEquals(1, r.tarification().nbFacturesPayees());
        assertEquals(2, r.tarification().nbFacturesEmises());
        assertEquals(1, r.tarification().nbFacturesAnnulees());
        assertEquals(2, r.tarification().facturesEnAttente().size());
        assertEquals("Ets Rakoto", r.tarification().facturesEnAttente().get(0).clientNom());

        // Equipe
        assertEquals(3, r.equipe().nbChauffeurs());
        assertEquals(2L, r.equipe().parStatutDossier().get("VALIDEE"));
        assertEquals(1L, r.equipe().parStatutDossier().get("EN_ATTENTE"));
        assertEquals(2L, r.equipe().parType().get("INTERNE"));
        assertEquals(2, r.equipe().nbDisponibles());
        assertEquals(1, r.equipe().nbDossiersEnAttente());
    }

    @Test
    void tenantInconnuLeveResourceNotFound() {
        UUID inconnu = UUID.randomUUID();
        when(pmeClienteRepository.existsByTenantId(inconnu)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> service.construire(inconnu));
    }

    @Test
    void jeuVideRetourneZerosEtNullsSansDivisionParZero() {
        TableauDeBordDirectionResponse r = service.construire(tenantId);

        assertEquals(0, r.activite().nbCommandes());
        assertTrue(r.activite().commandesParStatut().isEmpty());
        assertNull(r.activite().tauxRemplissageMoyen());
        assertEquals(0.0, r.activite().kmTotal());
        assertTrue(r.activite().dernieresCommandes().isEmpty());
        assertEquals(0, r.flotte().nbVehicules());
        assertEquals(0, r.flotte().incidentsNonLus());
        assertEquals(0, r.tarification().nbGrillesActives());
        assertNull(r.tarification().prixMoyenKg());
        assertEquals(BigDecimal.ZERO, r.tarification().caPaye());
        assertTrue(r.tarification().facturesEnAttente().isEmpty());
        assertEquals(0, r.equipe().nbChauffeurs());
        assertEquals(0, r.equipe().nbDossiersEnAttente());
    }
}
