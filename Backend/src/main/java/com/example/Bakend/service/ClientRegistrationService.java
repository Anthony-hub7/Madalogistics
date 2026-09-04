package com.example.Bakend.service;

import com.example.Bakend.config.RoleRedirectMapper;
import com.example.Bakend.dto.response.AuthResponse;
import com.example.Bakend.entity.PMECliente;
import com.example.Bakend.entity.Utilisateur;
import com.example.Bakend.entity.enums.Role;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.exception.ResourceNotFoundException;
import com.example.Bakend.repository.PMEClienteRepository;
import com.example.Bakend.repository.UtilisateurRepository;
import com.example.Bakend.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Service d'inscription des clients finaux.
 * Le tenant doit exister (créé par l'admin SAAS) ; l'inscription est possible
 * uniquement après validation de l'admin. Le mot de passe est hashé en BCrypt.
 */
@Service
@Transactional
public class ClientRegistrationService {

    private final UtilisateurRepository utilisateurRepository;
    private final PMEClienteRepository pmeClienteRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final RoleRedirectMapper roleRedirectMapper;

    public ClientRegistrationService(UtilisateurRepository utilisateurRepository,
                                     PMEClienteRepository pmeClienteRepository,
                                     PasswordEncoder passwordEncoder,
                                     JwtService jwtService,
                                     RefreshTokenService refreshTokenService,
                                     RoleRedirectMapper roleRedirectMapper) {
        this.utilisateurRepository = utilisateurRepository;
        this.pmeClienteRepository = pmeClienteRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.roleRedirectMapper = roleRedirectMapper;
    }

    /**
     * Inscrit un client final. Le tenantId est optionnel — un client peut
     * s'inscrire sans agence rattachée (sera affecté plus tard par l'admin).
     * Vérifie l'unicité de l'email, hash le mot de passe, crée l'utilisateur.
     * @return AuthResponse avec le JWT + les infos utilisateur
     */
    public AuthResponse inscrire(String nom, String email, String motDePasse, java.util.UUID tenantId) {
        if (utilisateurRepository.existsByEmail(email)) {
            throw new BusinessException("Un compte existe déjà avec l'email : " + email);
        }

        PMECliente tenant = null;
        if (tenantId != null) {
            tenant = pmeClienteRepository.findByTenantId(tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException("Tenant introuvable : " + tenantId));
        }

        Utilisateur utilisateur = new Utilisateur();
        utilisateur.setPmeCliente(tenant);
        utilisateur.setNom(nom);
        utilisateur.setEmail(email);
        utilisateur.setMotDePasseHash(passwordEncoder.encode(motDePasse));
        utilisateur.setRole(Role.CLIENT_FINAL);
        utilisateur.setHabiliteValeur(false);

        Utilisateur saved = utilisateurRepository.save(utilisateur);

        String accessToken = jwtService.generateToken(saved);
        UUID refreshTokenTenantId = tenant != null ? tenant.getTenantId() : null;
        String refreshToken = refreshTokenService.createRefreshToken(
                saved.getUtilisateurId(),
                refreshTokenTenantId);

        return new AuthResponse(
                accessToken,
                saved.getUtilisateurId(),
                refreshTokenTenantId,
                saved.getEmail(),
                saved.getNom(),
                roleRedirectMapper.getRedirectPath(saved.getRole())
        );
    }
}
