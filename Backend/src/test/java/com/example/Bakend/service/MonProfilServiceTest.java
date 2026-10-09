package com.example.Bakend.service;

import com.example.Bakend.dto.request.ChangerMotDePasseRequest;
import com.example.Bakend.dto.response.MonProfilResponse;
import com.example.Bakend.entity.AuditLog;
import com.example.Bakend.entity.Chauffeur;
import com.example.Bakend.entity.ClientFinal;
import com.example.Bakend.entity.PMECliente;
import com.example.Bakend.entity.Utilisateur;
import com.example.Bakend.entity.Vehicule;
import com.example.Bakend.entity.enums.Role;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.exception.ResourceNotFoundException;
import com.example.Bakend.repository.AuditLogRepository;
import com.example.Bakend.repository.UtilisateurRepository;
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

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Profil de l'utilisateur connecte + changement de mot de passe.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class MonProfilServiceTest {

    @Mock private UtilisateurRepository utilisateurRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuditLogRepository auditLogRepository;

    @InjectMocks private MonProfilService service;

    private UUID utilisateurId;
    private Utilisateur utilisateur;
    private PMECliente agence;

    @BeforeEach
    void setUp() {
        utilisateurId = UUID.randomUUID();
        agence = new PMECliente();
        agence.setTenantId(UUID.randomUUID());
        agence.setNomEntreprise("TRANS MADA SARL");

        utilisateur = new Utilisateur();
        utilisateur.setUtilisateurId(utilisateurId);
        utilisateur.setNom("Jean Andry");
        utilisateur.setEmail("jean@trans.mg");
        utilisateur.setMotDePasseHash("$2a$10$ancien");
        utilisateur.setRole(Role.GESTIONNAIRE);
        utilisateur.setPmeCliente(agence);
        utilisateur.setCin("101010101012");
        utilisateur.setDateNaissance(LocalDate.of(1990, 5, 12));
        utilisateur.setSexe("M");
        utilisateur.setAdresse("Antananarivo");

        when(utilisateurRepository.findById(utilisateurId)).thenReturn(Optional.of(utilisateur));
        when(utilisateurRepository.save(any(Utilisateur.class))).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    void monProfil_retourneIdentiteEtBlocMetier() {
        Vehicule vehicule = new Vehicule();
        vehicule.setImmatriculation("1234 ABP");

        Chauffeur chauffeur = new Chauffeur();
        chauffeur.setTelephone("034 00 000 00");
        chauffeur.setTypeChauffeur("FREELANCE");
        chauffeur.setStatutDossier("VALIDEE");
        chauffeur.setVehicule(vehicule);
        utilisateur.setChauffeur(chauffeur);
        utilisateur.setRole(Role.CHAUFFEUR);

        MonProfilResponse res = service.monProfil(utilisateurId);

        assertEquals(utilisateurId, res.utilisateurId());
        assertEquals("Jean Andry", res.nom());
        assertEquals("jean@trans.mg", res.email());
        assertEquals("CHAUFFEUR", res.role());
        assertEquals(agence.getTenantId(), res.tenantId());
        assertEquals("TRANS MADA SARL", res.tenantNom());
        assertEquals("101010101012", res.cin());
        assertEquals(LocalDate.of(1990, 5, 12), res.dateNaissance());
        assertEquals("Antananarivo", res.adresse());
        assertEquals("034 00 000 00", res.telephone());
        assertEquals("FREELANCE", res.typeChauffeur());
        assertEquals("VALIDEE", res.statutDossier());
        assertEquals("1234 ABP", res.immatriculation());
        assertNull(res.clientNom());
    }

    @Test
    void monProfil_sansBlocMetier_champsNull() {
        MonProfilResponse res = service.monProfil(utilisateurId);

        assertEquals("GESTIONNAIRE", res.role());
        assertNull(res.telephone());
        assertNull(res.typeChauffeur());
        assertNull(res.immatriculation());
        assertNull(res.clientNom());
    }

    @Test
    void monProfil_clientFinal_exposeLeNomClient() {
        ClientFinal client = new ClientFinal();
        client.setNom("Ets Rakoto");
        utilisateur.setClientFinal(client);
        utilisateur.setRole(Role.CLIENT_FINAL);

        assertEquals("Ets Rakoto", service.monProfil(utilisateurId).clientNom());
    }

    @Test
    void monProfil_utilisateurIntrouvable_404() {
        UUID inconnu = UUID.randomUUID();
        when(utilisateurRepository.findById(inconnu)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.monProfil(inconnu));
    }

    @Test
    void changerMotDePasse_ancienValide_hashEtAudit() {
        when(passwordEncoder.matches("Ancien123", "$2a$10$ancien")).thenReturn(true);
        when(passwordEncoder.encode("Nouveau123")).thenReturn("$2a$10$nouveau");

        service.changerMotDePasse(utilisateurId, new ChangerMotDePasseRequest("Ancien123", "Nouveau123"));

        assertEquals("$2a$10$nouveau", utilisateur.getMotDePasseHash());
        verify(utilisateurRepository).save(utilisateur);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertTrue(captor.getValue().getDetails().contains("MOT_DE_PASSE_CHANGE"));
        assertEquals("Utilisateur", captor.getValue().getEntite());
    }

    @Test
    void changerMotDePasse_ancienIncorrect_400() {
        when(passwordEncoder.matches("Faux12345", "$2a$10$ancien")).thenReturn(false);

        BusinessException e = assertThrows(BusinessException.class,
                () -> service.changerMotDePasse(utilisateurId, new ChangerMotDePasseRequest("Faux12345", "Nouveau123")));

        assertEquals(400, e.getStatus());
        verify(utilisateurRepository, never()).save(any());
        verify(auditLogRepository, never()).save(any());
    }

    @Test
    void changerMotDePasse_memeMotDePasse_400() {
        when(passwordEncoder.matches("Ancien123", "$2a$10$ancien")).thenReturn(true);

        BusinessException e = assertThrows(BusinessException.class,
                () -> service.changerMotDePasse(utilisateurId, new ChangerMotDePasseRequest("Ancien123", "Ancien123")));

        assertEquals(400, e.getStatus());
        verify(utilisateurRepository, never()).save(any());
    }

    @Test
    void changerMotDePasse_nonAuthentifie_401() {
        BusinessException e = assertThrows(BusinessException.class,
                () -> service.changerMotDePasse(null, new ChangerMotDePasseRequest("a", "b")));

        assertEquals(401, e.getStatus());
        verify(utilisateurRepository, never()).save(any());
    }
}
