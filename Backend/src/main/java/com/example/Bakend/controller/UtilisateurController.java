package com.example.Bakend.controller;

import com.example.Bakend.dto.common.PageResponse;
import com.example.Bakend.dto.request.CreateUserRequest;
import com.example.Bakend.dto.request.UpdateUserRequest;
import com.example.Bakend.dto.response.UserResponse;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.security.SecurityUtils;
import com.example.Bakend.service.UtilisateurService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Contrôleur REST de gestion des utilisateurs (CRUD), scopé par tenant.
 * L'isolation multi-tenant est garantie par la résolution du tenant depuis le token JWT.
 */
@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasAnyRole('ADMIN_SAAS', 'GESTIONNAIRE', 'DIRECTION')")
public class UtilisateurController {

    private final UtilisateurService utilisateurService;

    public UtilisateurController(UtilisateurService utilisateurService) {
        this.utilisateurService = utilisateurService;
    }

    @PostMapping
    public ResponseEntity<UserResponse> creer(@Valid @RequestBody CreateUserRequest request) {
        var caller = SecurityUtils.getCurrentUser();
        UserResponse response = utilisateurService.createUtilisateur(requireTenantId(), request,
                caller.getUtilisateur().getRole());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public PageResponse<UserResponse> lister(@RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "20") int size) {
        return utilisateurService.lister(requireTenantId(), page, size);
    }

    @GetMapping("/{id}")
    public UserResponse obtenir(@PathVariable UUID id) {
        return utilisateurService.obtenir(requireTenantId(), id);
    }

    @PutMapping("/{id}")
    public UserResponse mettreAJour(@PathVariable UUID id,
                                    @Valid @RequestBody UpdateUserRequest request) {
        var caller = SecurityUtils.getCurrentUser();
        UUID currentUserId = caller.getUtilisateurId();
        if (id.equals(currentUserId) && Boolean.FALSE.equals(request.habiliteValeur())) {
            throw new BusinessException("Vous ne pouvez pas désactiver votre propre compte.", 403);
        }
        return utilisateurService.mettreAJour(requireTenantId(), id, request,
                caller.getUtilisateur().getRole(), currentUserId);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> supprimer(@PathVariable UUID id) {
        var caller = SecurityUtils.getCurrentUser();
        UUID currentUserId = caller.getUtilisateurId();
        if (id.equals(currentUserId)) {
            throw new BusinessException("Vous ne pouvez pas supprimer votre propre compte.", 403);
        }
        utilisateurService.supprimer(requireTenantId(), id, caller.getUtilisateur().getRole());
        return ResponseEntity.noContent().build();
    }

    /**
     * Résout le tenant de l'utilisateur courant ; requis pour toute opération scopée.
     */
    private UUID requireTenantId() {
        UUID tenantId = SecurityUtils.getTenantId();
        if (tenantId == null) {
            throw new BusinessException(
                    "Contexte tenant manquant : l'opération requiert un utilisateur rattaché à une PME",
                    403);
        }
        return tenantId;
    }
}