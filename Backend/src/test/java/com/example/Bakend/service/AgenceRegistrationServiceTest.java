package com.example.Bakend.service;

import com.example.Bakend.entity.CategorieProduit;
import com.example.Bakend.entity.PMECliente;
import com.example.Bakend.entity.enums.ClasseValeur;
import com.example.Bakend.repository.CategorieProduitRepository;
import com.example.Bakend.repository.PMEClienteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AgenceRegistrationServiceTest {

    @Mock private PMEClienteRepository pmeClienteRepository;
    @Mock private CategorieProduitRepository categorieProduitRepository;
    @Mock private com.example.Bakend.repository.UtilisateurRepository utilisateurRepository;
    @Mock private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    @Mock private com.example.Bakend.security.JwtService jwtService;
    @Mock private com.example.Bakend.service.RefreshTokenService refreshTokenService;
    @Mock private com.example.Bakend.config.RoleRedirectMapper roleRedirectMapper;

    @InjectMocks
    private AgenceRegistrationService service;

    private UUID tenantId;
    private PMECliente tenant;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        tenant = new PMECliente();
        tenant.setTenantId(tenantId);
        tenant.setStatutDossier("EN_ATTENTE");
    }

    @Test
    void validerDossier_seedCategories_whenZeroActives() {
        when(pmeClienteRepository.findByTenantId(tenantId)).thenReturn(Optional.of(tenant));
        when(categorieProduitRepository.countByPmeClienteTenantIdAndActif(tenantId, true))
                .thenReturn(0L);

        service.validerDossier(tenantId);

        ArgumentCaptor<CategorieProduit> captor = ArgumentCaptor.forClass(CategorieProduit.class);
        verify(categorieProduitRepository, times(3)).save(captor.capture());

        var saved = captor.getAllValues();
        assertEquals(3, saved.size());
        assertEquals(ClasseValeur.A, saved.get(0).getClasseValeur());
        assertEquals(ClasseValeur.B, saved.get(1).getClasseValeur());
        assertEquals(ClasseValeur.C, saved.get(2).getClasseValeur());
        assertTrue(saved.get(0).getActif());
    }

    @Test
    void validerDossier_noSeed_whenAlreadyHasActiveCategories() {
        when(pmeClienteRepository.findByTenantId(tenantId)).thenReturn(Optional.of(tenant));
        when(categorieProduitRepository.countByPmeClienteTenantIdAndActif(tenantId, true))
                .thenReturn(3L);

        service.validerDossier(tenantId);

        verify(categorieProduitRepository, never()).save(any(CategorieProduit.class));
    }

    @Test
    void reactiverDossier_reSeed_whenAllSoftDeleted() {
        // Cas limite : les 3 categories ont ete soft-deletees par DIRECTION
        // Puis l'agence est desactivee puis re-activee
        // Le hook devrait re-seeder
        tenant.setStatutDossier("DESACTIVEE");
        when(pmeClienteRepository.findByTenantId(tenantId)).thenReturn(Optional.of(tenant));
        when(categorieProduitRepository.countByPmeClienteTenantIdAndActif(tenantId, true))
                .thenReturn(0L);

        service.reactiverDossier(tenantId);

        // 3 categories recreees
        verify(categorieProduitRepository, times(3)).save(any(CategorieProduit.class));
    }

    @Test
    void reactiverDossier_noResurrect_whenSoftDeletedThenReactivatedWithActive() {
        // Scenario : agence a 3 categories, toutes soft-deletees,
        // puis re-activee → re-seed
        tenant.setStatutDossier("DESACTIVEE");
        when(pmeClienteRepository.findByTenantId(tenantId)).thenReturn(Optional.of(tenant));
        // 0 actifs → le hook doit re-seeder
        when(categorieProduitRepository.countByPmeClienteTenantIdAndActif(tenantId, true))
                .thenReturn(0L);

        service.reactiverDossier(tenantId);

        verify(categorieProduitRepository, times(3)).save(any(CategorieProduit.class));
    }

    @Test
    void reactiverDossier_seedCategories_whenZeroActives() {
        tenant.setStatutDossier("DESACTIVEE");
        when(pmeClienteRepository.findByTenantId(tenantId)).thenReturn(Optional.of(tenant));
        when(categorieProduitRepository.countByPmeClienteTenantIdAndActif(tenantId, true))
                .thenReturn(0L);

        service.reactiverDossier(tenantId);

        verify(categorieProduitRepository, times(3)).save(any(CategorieProduit.class));
    }

    @Test
    void reactiverDossier_noSeed_whenHasActiveCategories() {
        tenant.setStatutDossier("DESACTIVEE");
        when(pmeClienteRepository.findByTenantId(tenantId)).thenReturn(Optional.of(tenant));
        when(categorieProduitRepository.countByPmeClienteTenantIdAndActif(tenantId, true))
                .thenReturn(3L);

        service.reactiverDossier(tenantId);

        verify(categorieProduitRepository, never()).save(any(CategorieProduit.class));
    }
}
