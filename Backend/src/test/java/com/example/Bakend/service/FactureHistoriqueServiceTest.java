package com.example.Bakend.service;

import com.example.Bakend.dto.facture.FactureListResponse;
import com.example.Bakend.entity.*;
import com.example.Bakend.entity.enums.*;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.repository.EtapeLivraisonRepository;
import com.example.Bakend.repository.FactureRepository;
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
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * Tests — historique facturation :
 * - mapping facture → commande + preuves
 * - filtres statut / periode
 * - rejet de statut invalide
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class FactureHistoriqueServiceTest {

    @Mock private FactureRepository factureRepository;
    @Mock private EtapeLivraisonRepository etapeLivraisonRepository;

    @InjectMocks private FactureHistoriqueService service;

    private final UUID tenantId = UUID.randomUUID();

    private Facture facturePayee;
    private Facture factureEmise;

    @BeforeEach
    void setUp() {
        facturePayee = makeFacture(FactureStatut.PAYEE,
                LocalDateTime.of(2026, 3, 15, 10, 0), "25000", "Client A");
        factureEmise = makeFacture(FactureStatut.EMISE,
                LocalDateTime.of(2026, 5, 2, 9, 0), "18000", "Client B");

        when(factureRepository.rechercherParTenant(tenantId))
                .thenReturn(new ArrayList<>(List.of(factureEmise, facturePayee)));
        // 2 preuves sur la demande de la facture payee, 0 sur l'autre
        when(etapeLivraisonRepository.compterPreuvesParDemande(tenantId))
                .thenReturn(List.<Object[]>of(new Object[]{facturePayee.getDemande().getDemandeId(), 2L}));
    }

    private Facture makeFacture(FactureStatut statut, LocalDateTime date, String montant, String clientNom) {
        PMECliente tenant = new PMECliente();
        tenant.setTenantId(tenantId);

        ClientFinal client = new ClientFinal();
        client.setNom(clientNom);

        DemandeTransport demande = new DemandeTransport();
        demande.setDemandeId(UUID.randomUUID());
        demande.setPmeCliente(tenant);
        demande.setClientFinal(client);
        demande.setStatut(DemandeStatut.LIVREE);
        demande.setAdresseLivraison("Antananarivo");
        demande.setTarif(new BigDecimal(montant));

        Facture f = new Facture();
        f.setFactureId(UUID.randomUUID());
        f.setPmeCliente(tenant);
        f.setDemande(demande);
        f.setStatut(statut);
        f.setMontantTotal(new BigDecimal(montant));
        f.setDateEmission(date);
        return f;
    }

    @Test
    void liste_mappe_facture_commande_et_preuves() {
        List<FactureListResponse> result = service.lister(tenantId, null, null, null);

        assertEquals(2, result.size());
        FactureListResponse payee = result.stream()
                .filter(r -> r.statut().equals("PAYEE"))
                .findFirst().orElseThrow();
        assertEquals("Client A", payee.clientNom());
        assertEquals("Antananarivo", payee.adresseLivraison());
        assertEquals("LIVREE", payee.demandeStatut());
        assertEquals(2, payee.nbPreuves());
        assertTrue(payee.hasPreuves());

        FactureListResponse emise = result.stream()
                .filter(r -> r.statut().equals("EMISE"))
                .findFirst().orElseThrow();
        assertEquals("Client B", emise.clientNom());
        assertEquals(0, emise.nbPreuves());
        assertFalse(emise.hasPreuves());
    }

    @Test
    void filtre_par_statut() {
        List<FactureListResponse> result = service.lister(tenantId, "PAYEE", null, null);

        assertEquals(1, result.size());
        assertEquals("PAYEE", result.get(0).statut());
        assertEquals(new BigDecimal("25000"), result.get(0).montantTotal());
    }

    @Test
    void filtre_par_periode() {
        List<FactureListResponse> result = service.lister(tenantId, null,
                LocalDate.of(2026, 4, 1), LocalDate.of(2026, 6, 30));

        assertEquals(1, result.size());
        assertEquals("EMISE", result.get(0).statut());
    }

    @Test
    void statut_invalide_rejette_400() {
        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.lister(tenantId, "BIDON", null, null));
        assertEquals(400, ex.getStatus());
    }

    @Test
    void liste_vide_quand_aucune_facture() {
        when(factureRepository.rechercherParTenant(tenantId)).thenReturn(new ArrayList<>());

        assertTrue(service.lister(tenantId, null, null, null).isEmpty());
    }
}
