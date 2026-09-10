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

import com.example.Bakend.entity.enums.Role;

import java.util.List;
import java.util.UUID;

/**
 * Couche service de gestion des utilisateurs (CRUD), isolée par tenant.
 * Transactions gérées par Spring via @Transactional.
 *
 * Règles d'habilitation (appelées depuis les contrôleurs) :
 *  - DIRECTION peut créer uniquement des GESTIONNAIRE.
 *  - GESTIONNAIRE ne peut pas créer d'utilisateur.
 *  - DIRECTION et ADMIN_SAAS ne sont ni désactivables ni supprimables par un DIRECTION.
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
     * @param callerRole rôle de l'utilisateur qui effectue l'appel
     */
    public UserResponse createUtilisateur(UUID tenantId, CreateUserRequest request, Role callerRole) {
        // Seul DIRECTION peut créer des comptes dans l'équipe
        if (callerRole != Role.DIRECTION) {
            throw new BusinessException("Vous n'avez pas les droits pour créer un utilisateur", 403);
        }

        // DIRECTION ne peut créer que des GESTIONNAIRE
        if (request.role() != Role.GESTIONNAIRE) {
            throw new BusinessException(
                    "La direction ne peut créer que des responsables logistiques (GESTIONNAIRE)", 403);
        }

        if (utilisateurRepository.existsByEmail(request.email())) {
            throw new BusinessException("Un compte existe déjà avec l'email : " + request.email());
        }
        PMECliente tenant = trouverTenant(tenantId);

        Utilisateur utilisateur = new Utilisateur();
        utilisateur.setPmeCliente(tenant);
        utilisateur.setNom(request.nom());
        utilisateur.setEmail(request.email());
        utilisateur.setMotDePasseHash(passwordEncoder.encode(request.password()));
        utilisateur.setRole(Role.GESTIONNAIRE);
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
     * @param callerRole rôle de l'utilisateur qui effectue l'appel
     * @param callerUserId ID de l'utilisateur qui effectue l'appel
     */
    public UserResponse mettreAJour(UUID tenantId, UUID utilisateurId, UpdateUserRequest request,
                                     Role callerRole, UUID callerUserId) {
        Utilisateur utilisateur = trouverUtilisateur(tenantId, utilisateurId);

        // DIRECTION ne peut pas modifier un compte DIRECTION ou ADMIN_SAAS (sauf soi-même déjà géré en controller)
        if (callerRole == Role.DIRECTION
                && (utilisateur.getRole() == Role.DIRECTION || utilisateur.getRole() == Role.ADMIN_SAAS)
                && !utilisateurId.equals(callerUserId)) {
            throw new BusinessException("Vous ne pouvez pas modifier ce compte", 403);
        }

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
            // Empêcher le changement de rôle vers/depuis DIRECTION/ADMIN_SAAS
            if (request.role() == Role.DIRECTION || request.role() == Role.ADMIN_SAAS) {
                throw new BusinessException("Vous ne pouvez pas attribuer ce rôle", 403);
            }
            if (utilisateur.getRole() == Role.DIRECTION || utilisateur.getRole() == Role.ADMIN_SAAS) {
                throw new BusinessException("Vous ne pouvez pas modifier le rôle de ce compte", 403);
            }
            utilisateur.setRole(request.role());
        }
        if (request.habiliteValeur() != null) {
            utilisateur.setHabiliteValeur(request.habiliteValeur());
        }

        return UtilisateurMapper.toResponse(utilisateurRepository.save(utilisateur));
    }

    /**
     * Supprime un utilisateur du tenant courant, après vérification du scope (transaction écriture).
     * @param callerRole rôle de l'utilisateur qui effectue l'appel
     */
    public void supprimer(UUID tenantId, UUID utilisateurId, Role callerRole) {
        Utilisateur utilisateur = trouverUtilisateur(tenantId, utilisateurId);

        // DIRECTION ne peut pas supprimer un compte DIRECTION ou ADMIN_SAAS
        if (callerRole == Role.DIRECTION
                && (utilisateur.getRole() == Role.DIRECTION || utilisateur.getRole() == Role.ADMIN_SAAS)) {
            throw new BusinessException("Vous ne pouvez pas supprimer ce compte", 403);
        }

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