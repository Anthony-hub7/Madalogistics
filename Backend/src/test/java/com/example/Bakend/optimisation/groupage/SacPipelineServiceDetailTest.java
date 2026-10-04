package com.example.Bakend.optimisation.groupage;

import com.example.Bakend.dto.optimisation.SacDetailResponse;
import com.example.Bakend.entity.*;
import com.example.Bakend.entity.enums.*;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

/**
 * Tests — detail sac (historique) :
 * - mapping chauffeur / clients / colis + commande d'origine / etapes + preuves / factures
 * - isolation tenant (sac d'un autre tenant → 404)
 * - sac sans tournee ni colis → listes vides
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SacPipelineServiceDetailTest {

    @Mock private SacRepository sacRepository;
    @Mock private TourneeRepository tourneeRepository;
    @Mock private ColisRepository colisRepository;
    @Mock private EtapeLivraisonRepository etapeLivraisonRepository;
    @Mock private FactureRepository factureRepository;

    @InjectMocks private SacPipelineService service;

    private final UUID tenantId = UUID.randomUUID();
    private final UUID sacId = UUID.randomUUID();

    private PMECliente tenant;
    private Sac sac;
    private DemandeTransport demande;
    private Colis colis;
    private Tournee tournee;

    @BeforeEach
    void setUp() {
        tenant = new PMECliente();
        tenant.setTenantId(tenantId);

        Hub hub = new Hub();
        hub.setHubId(UUID.randomUUID());
        hub.setNom("Hub Est");

        Utilisateur utilisateur = new Utilisateur();
        utilisateur.setNom("Rakoto Harijaona");
        Chauffeur chauffeur = new Chauffeur();
        chauffeur.setChauffeurId(UUID.randomUUID());
        chauffeur.setUtilisateur(utilisateur);

        Vehicule vehicule = new Vehicule();
        vehicule.setVehiculeId(UUID.randomUUID());
        vehicule.setImmatriculation("TBA-123");

        sac = new Sac();
        sac.setSacId(sacId);
        sac.setPmeCliente(tenant);
        sac.setHub(hub);
        sac.setStatut(SacStatut.LIVRE);
        sac.setCategorieDominante("FRAGILE");
        sac.setTauxRemplissage(new BigDecimal("0.85"));
        sac.setChauffeur(chauffeur);
        sac.setVehicule(vehicule);

        ClientFinal client = new ClientFinal();
        client.setNom("Jean Rakoto");

        demande = new DemandeTransport();
        demande.setDemandeId(UUID.randomUUID());
        demande.setPmeCliente(tenant);
        demande.setClientFinal(client);
        demande.setStatut(DemandeStatut.LIVREE);
        demande.setAdresseLivraison("Lot II M 12 Antananarivo");
        demande.setTarif(new BigDecimal("35000"));

        colis = new Colis();
        colis.setColisId(UUID.randomUUID());
        colis.setPmeCliente(tenant);
        colis.setDemande(demande);
        colis.setPoidsKg(new BigDecimal("12.5"));
        colis.setVolumeM3(new BigDecimal("0.8"));
        colis.setEtat(ColisEtat.LIVRE);

        tournee = new Tournee();
        tournee.setTourneeId(UUID.randomUUID());
        tournee.setStatut(TourneeStatut.TERMINEE);

        Facture facture = new Facture();
        facture.setFactureId(UUID.randomUUID());
        facture.setStatut(FactureStatut.PAYEE);
        facture.setDemande(demande);

        when(sacRepository.findById(sacId)).thenReturn(Optional.of(sac));
        when(colisRepository.findBySacSacId(sacId)).thenReturn(new ArrayList<>(List.of(colis)));
        when(tourneeRepository.findBySacSacId(sacId)).thenReturn(new ArrayList<>(List.of(tournee)));
        when(factureRepository.findByDemandeDemandeId(demande.getDemandeId()))
                .thenReturn(Optional.of(facture));
    }

    private EtapeLivraison makeEtape(int ordre, TypeEtape type, boolean avecPhoto) {
        EtapeLivraison e = new EtapeLivraison();
        e.setEtapeId(UUID.randomUUID());
        e.setOrdre(ordre);
        e.setTypeEtape(type);
        e.setColis(colis);
        if (avecPhoto) {
            e.setPhotoPreuve(new byte[]{(byte) 0xFF, (byte) 0xD8});
            e.setDateHeureReelle(java.time.LocalDateTime.of(2026, 5, 10, 14, 30));
            e.setSignatureNom("Jean Rakoto");
        }
        return e;
    }

    @Test
    void detail_mappe_chauffeur_clients_colis_etapes_et_facture() {
        EtapeLivraison livraison = makeEtape(1, TypeEtape.LIVRAISON, true);
        when(etapeLivraisonRepository.rechercherParTourneeOrdonnees(tournee.getTourneeId()))
                .thenReturn(new ArrayList<>(List.of(livraison)));

        SacDetailResponse d = service.detail(tenantId, sacId);

        assertEquals(sacId, d.sacId());
        assertEquals("LIVRE", d.statut());
        assertEquals("Hub Est", d.hubNom());
        assertEquals("Rakoto Harijaona", d.chauffeurNom());
        assertEquals("TBA-123", d.immatriculation());
        assertEquals(1, d.nbColis());
        assertEquals(12.5, d.poidsKg());
        assertTrue(d.hasTournee());
        assertEquals(TourneeStatut.TERMINEE.name(), d.tourneeStatut());

        // Clients distincts
        assertEquals(List.of("Jean Rakoto"), d.clients());

        // Colis + commande d'origine
        assertEquals(1, d.colis().size());
        SacDetailResponse.ColisDetail c = d.colis().get(0);
        assertEquals("LIVRE", c.etat());
        assertEquals(demande.getDemandeId(), c.demandeId());
        assertEquals("Jean Rakoto", c.clientNom());

        // Etape avec preuve
        assertEquals(1, d.etapes().size());
        SacDetailResponse.EtapeDetail e = d.etapes().get(0);
        assertTrue(e.photoPreuvePresente());
        assertEquals("Jean Rakoto", e.signatureNom());

        // Demande + facture
        assertEquals(1, d.demandes().size());
        SacDetailResponse.DemandeDetail dm = d.demandes().get(0);
        assertEquals(demande.getDemandeId(), dm.demandeId());
        assertEquals(35000.0, dm.tarif());
        assertEquals(FactureStatut.PAYEE.name(), dm.factureStatut());
        assertNotNull(dm.factureId());
    }

    @Test
    void detail_sac_d_un_autre_tenant_404() {
        PMECliente autre = new PMECliente();
        autre.setTenantId(UUID.randomUUID());
        sac.setPmeCliente(autre);

        assertThrows(ResourceNotFoundException.class, () -> service.detail(tenantId, sacId));
    }

    @Test
    void detail_sac_inconnu_404() {
        when(sacRepository.findById(org.mockito.ArgumentMatchers.any(UUID.class)))
                .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.detail(tenantId, UUID.randomUUID()));
    }

    @Test
    void detail_sac_sans_tournee_ni_preuve() {
        when(tourneeRepository.findBySacSacId(sacId)).thenReturn(new ArrayList<>());
        when(colisRepository.findBySacSacId(sacId)).thenReturn(new ArrayList<>());

        SacDetailResponse d = service.detail(tenantId, sacId);

        assertFalse(d.hasTournee());
        assertNull(d.tourneeId());
        assertEquals(0, d.nbColis());
        assertTrue(d.colis().isEmpty());
        assertTrue(d.etapes().isEmpty());
        assertTrue(d.clients().isEmpty());
        assertTrue(d.demandes().isEmpty());
    }
}
