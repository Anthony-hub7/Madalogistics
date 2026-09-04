package com.example.Bakend.service;

import com.example.Bakend.dto.common.PageResponse;
import com.example.Bakend.dto.request.CreateUserRequest;
import com.example.Bakend.dto.request.UpdateUserRequest;
import com.example.Bakend.dto.response.UserResponse;
import com.example.Bakend.entity.PMECliente;
import com.example.Bakend.entity.Utilisateur;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.exception.ResourceNotFoundException;
import com.example.Bakend.mapper.UtilisateurMapper;
import com.example.Bakend.repository.PMEClienteRepository;
import com.example.Bakend.repository.UtilisateurRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Couche service de gestion des utilisateurs (CRUD), isolée par tenant.
 * Transactions gérées par Spring via @Transactional.
 */
@Service
@Transactional
public class UtilisateurService {

    private static final int MAX_PAGE_SIZE = 100;

    private final UtilisateurRepository utilisateurRepository;
    private final PMEClienteRepository pmeClienteRepository;
    private final PasswordEncoder passwordEncoder;

    public UtilisateurService(UtilisateurRepository utilisateurRepository,
                              PMEClienteRepository pmeClienteRepository,
                              PasswordEncoder passwordEncoder) {
        this.utilisateurRepository = utilisateurRepository;
        this.pmeClienteRepository = pmeClienteRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Crée un utilisateur dans le tenant courant (transaction écriture).
     */
    public UserResponse createUtilisateur(UUID tenantId, CreateUserRequest request) {
        if (utilisateurRepository.existsByEmail(request.email())) {
            throw new BusinessException("Un compte existe déjà avec l'email : " + request.email());
        }
        PMECliente tenant = trouverTenant(tenantId);

        Utilisateur utilisateur = new Utilisateur();
        utilisateur.setPmeCliente(tenant);
        utilisateur.setNom(request.nom());
        utilisateur.setEmail(request.email());
        utilisateur.setMotDePasseHash(passwordEncoder.encode(request.password()));
        utilisateur.setRole(request.role());
        utilisateur.setHabiliteValeur(true);

        return UtilisateurMapper.toResponse(utilisateurRepository.save(utilisateur));
    }

    /**
     * Retourne un utilisateur du tenant courant (transaction lecture seule).
     */
    @Transactional(readOnly = true)
    public UserResponse obtenir(UUID tenantId, UUID utilisateurId) {
        return UtilisateurMapper.toResponse(trouverUtilisateur(tenantId, utilisateurId));
    }

    /**
     * Liste paginée des utilisateurs du tenant courant (transaction lecture seule).
     */
    @Transactional(readOnly = true)
    public PageResponse<UserResponse> lister(UUID tenantId, int page, int size) {
        int taille = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(Math.max(page, 0), taille);
        Page<Utilisateur> utilisateurs = utilisateurRepository.findByPmeClienteTenantId(tenantId, pageable);
        List<UserResponse> content = utilisateurs.getContent().stream()
                .map(UtilisateurMapper::toResponse)
                .toList();
        return new PageResponse<>(
                content,
                utilisateurs.getNumber(),
                utilisateurs.getSize(),
                utilisateurs.getTotalElements(),
                utilisateurs.getTotalPages()
        );
    }

    /**
     * Mise à jour partielle d'un utilisateur du tenant courant (transaction écriture).
     */
    public UserResponse mettreAJour(UUID tenantId, UUID utilisateurId, UpdateUserRequest request) {
        Utilisateur utilisateur = trouverUtilisateur(tenantId, utilisateurId);

        if (request.nom() != null) {
            utilisateur.setNom(request.nom());
        }
        if (request.email() != null && !request.email().equals(utilisateur.getEmail())) {
            if (utilisateurRepository.existsByEmail(request.email())) {
                throw new BusinessException("Un compte existe déjà avec l'email : " + request.email());
            }
            utilisateur.setEmail(request.email());
        }
        if (request.password() != null && !request.password().isBlank()) {
            utilisateur.setMotDePasseHash(passwordEncoder.encode(request.password()));
        }
        if (request.role() != null) {
            utilisateur.setRole(request.role());
        }
        if (request.habiliteValeur() != null) {
            utilisateur.setHabiliteValeur(request.habiliteValeur());
        }

        return UtilisateurMapper.toResponse(utilisateurRepository.save(utilisateur));
    }

    /**
     * Supprime un utilisateur du tenant courant, après vérification du scope (transaction écriture).
     */
    public void supprimer(UUID tenantId, UUID utilisateurId) {
        Utilisateur utilisateur = trouverUtilisateur(tenantId, utilisateurId);
        utilisateurRepository.delete(utilisateur);
    }

    private PMECliente trouverTenant(UUID tenantId) {
        return pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant introuvable : " + tenantId));
    }

    private Utilisateur trouverUtilisateur(UUID tenantId, UUID utilisateurId) {
        return utilisateurRepository.findByPmeClienteTenantIdAndUtilisateurId(tenantId, utilisateurId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Utilisateur introuvable dans ce tenant : " + utilisateurId));
    }
}