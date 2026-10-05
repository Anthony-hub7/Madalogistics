package com.example.Bakend.service;

import com.example.Bakend.entity.*;
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
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Charge utile maximale (kg) a l'inscription chauffeur.
 *
 * Regle : capacite_poids_kg doit etre renseignee, sinon le vehicule est cree
 * avec 0 kg et PermisService refuse tous les sacs (freelance ineligible a
 * l'appel d'offres). Priorite au kg saisi, fallback PTAC x 1000.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ChauffeurRegistrationServiceTest {

    @Mock private UtilisateurRepository utilisateurRepository;
    @Mock private ChauffeurRepository chauffeurRepository;
    @Mock private VehiculeRepository vehiculeRepository;
    @Mock private PMEClienteRepository pmeClienteRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private CompatibiliteService compatibiliteService;

    @InjectMocks private ChauffeurRegistrationService service;

    private PMECliente plateforme;
    private PMECliente agence;

    @BeforeEach
    void setUp() {
        plateforme = new PMECliente();
        plateforme.setTenantId(UUID.randomUUID());
        plateforme.setNomEntreprise("PLATEFORME MADALOGISTIX");

        agence = new PMECliente();
        agence.setTenantId(UUID.randomUUID());
        agence.setNomEntreprise("TRANS MADA SARL");

        when(utilisateurRepository.existsByEmail(anyString())).thenReturn(false);
        when(utilisateurRepository.existsByCin(anyString())).thenReturn(false);
        when(utilisateurRepository.save(any(Utilisateur.class))).thenAnswer(i -> i.getArgument(0));
        when(chauffeurRepository.save(any(Chauffeur.class))).thenAnswer(i -> {
            Chauffeur c = i.getArgument(0);
            if (c.getChauffeurId() == null) c.setChauffeurId(UUID.randomUUID());
            return c;
        });
        when(vehiculeRepository.save(any(Vehicule.class))).thenAnswer(i -> i.getArgument(0));
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$hash");
        when(pmeClienteRepository.findByNomEntreprise("PLATEFORME MADALOGISTIX"))
                .thenReturn(Optional.of(plateforme));
        when(pmeClienteRepository.findByTenantId(agence.getTenantId()))
                .thenReturn(Optional.of(agence));
    }

    /** Depot de dossier avec vehicule, parametres poids/PTAC variables. */
    private void deposer(String typeChauffeur, UUID agenceId, String ptacTonnes, String capacitePoidsKg) {
        service.deposerDossier(
                "Jean", "Rakoto", "101010101010", "1990-05-12", "M",
                "0341234567", "jean.freelance" + UUID.randomUUID().toString().substring(0, 8) + "@mail.mg",
                "Analakely", "MotDePasse1",
                "B1234567", "B", "B",
                LocalDate.now().plusYears(2).toString(), 3,
                typeChauffeur, agenceId,
                true, "1234 TAA", "PICKUP", "Toyota Hilux", 2019, ptacTonnes, "8",
                capacitePoidsKg,
                null);
    }

    private BigDecimal capacitePoidsVehiculeEnregistre() {
        ArgumentCaptor<Vehicule> capturer = ArgumentCaptor.forClass(Vehicule.class);
        verify(vehiculeRepository).save(capturer.capture());
        return capturer.getValue().getCapacitePoidsKg();
    }

    // ══════════ Charge utile explicite ══════════

    @Test
    void freelance_avec_charge_utile_sans_ptac_enregistre_le_kg() {
        deposer("FREELANCE", null, null, "1500");

        assertEquals(0, new BigDecimal("1500").compareTo(capacitePoidsVehiculeEnregistre()));
    }

    @Test
    void la_charge_utile_saisie_prime_sur_le_ptac() {
        deposer("FREELANCE", null, "2", "800");

        assertEquals(0, new BigDecimal("800").compareTo(capacitePoidsVehiculeEnregistre()));
    }

    @Test
    void la_charge_utile_accepte_la_virgule_decimale() {
        deposer("FREELANCE", null, null, "1,5");

        assertEquals(0, new BigDecimal("1.5").compareTo(capacitePoidsVehiculeEnregistre()));
    }

    // ══════════ Fallback PTAC (rattaches historiques) ══════════

    @Test
    void sans_kg_saisi_le_ptac_converti_en_kg_sert_de_repli() {
        deposer("RATTACHE", agence.getTenantId(), "2.5", null);

        assertEquals(0, new BigDecimal("2500").compareTo(capacitePoidsVehiculeEnregistre()));
    }

    @Test
    void rattaché_sans_poids_ni_ptac_conserve_une_capacite_nulle() {
        deposer("RATTACHE", agence.getTenantId(), null, null);

        assertEquals(0, BigDecimal.ZERO.compareTo(capacitePoidsVehiculeEnregistre()));
    }

    // ══════════ Garde-fous ══════════

    @Test
    void freelance_sans_poids_ni_ptac_est_rejete() {
        BusinessException e = assertThrows(BusinessException.class,
                () -> deposer("FREELANCE", null, null, null));

        assertEquals(409, e.getStatus());
        assertTrue(e.getMessage().toLowerCase().contains("charge utile"),
                "message attendu : " + e.getMessage());
        verify(vehiculeRepository, never()).save(any());
    }

    @Test
    void charge_utile_nulle_est_rejetee() {
        BusinessException e = assertThrows(BusinessException.class,
                () -> deposer("FREELANCE", null, null, "0"));

        assertEquals(409, e.getStatus());
        assertTrue(e.getMessage().contains("capacitePoidsKg"), "message attendu : " + e.getMessage());
    }

    @Test
    void charge_utile_non_numerique_est_rejetee() {
        BusinessException e = assertThrows(BusinessException.class,
                () -> deposer("FREELANCE", null, null, "beaucoup"));

        assertEquals(409, e.getStatus());
        assertTrue(e.getMessage().contains("capacitePoidsKg"), "message attendu : " + e.getMessage());
    }

    // ══════════ Rattachement au tenant plateforme ══════════

    @Test
    void le_freelance_est_rattache_au_tenant_plateforme_avec_son_vehicule() {
        deposer("FREELANCE", null, null, "1500");

        ArgumentCaptor<Chauffeur> capturer = ArgumentCaptor.forClass(Chauffeur.class);
        verify(chauffeurRepository).save(capturer.capture());
        Chauffeur chauffeur = capturer.getValue();
        assertEquals(plateforme, chauffeur.getPmeCliente());
        assertEquals("FREELANCE", chauffeur.getTypeChauffeur());
        assertEquals("EN_ATTENTE", chauffeur.getStatutDossier());
        assertNotNull(chauffeur.getVehicule());
        verify(compatibiliteService).initialiserPourVehicule(eq(plateforme.getTenantId()), any());
    }
}
