package com.example.Bakend.mapper;

import com.example.Bakend.dto.response.UserResponse;
import com.example.Bakend.entity.Utilisateur;

/**
 * Mapper entre l'entité Utilisateur et ses DTO.
 * Couche dédiée à la conversion, sans logique métier.
 */
public final class UtilisateurMapper {

    private UtilisateurMapper() {
    }

    public static UserResponse toResponse(Utilisateur utilisateur) {
        return new UserResponse(
                utilisateur.getUtilisateurId(),
                utilisateur.getPmeCliente() != null ? utilisateur.getPmeCliente().getTenantId() : null,
                utilisateur.getNom(),
                utilisateur.getEmail(),
                utilisateur.getRole(),
                utilisateur.isHabiliteValeur(),
                utilisateur.getCreatedAt()
        );
    }
}