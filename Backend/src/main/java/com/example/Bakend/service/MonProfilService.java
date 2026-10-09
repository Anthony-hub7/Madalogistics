package com.example.Bakend.service;

import com.example.Bakend.dto.request.ChangerMotDePasseRequest;
import com.example.Bakend.dto.response.MonProfilResponse;
import com.example.Bakend.entity.AuditLog;
import com.example.Bakend.entity.Chauffeur;
import com.example.Bakend.entity.PMECliente;
import com.example.Bakend.entity.Utilisateur;
import com.example.Bakend.entity.enums.AuditAction;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.exception.ResourceNotFoundException;
import com.example.Bakend.repository.AuditLogRepository;
import com.example.Bakend.repository.UtilisateurRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Profil de l'utilisateur connecte (lecture seule) + changement de mot de passe.
 * Aucune donnee sensible (hash, CIN partiellement) n'est exposee hors de ce flux.
 */
@Service
public class MonProfilService {

    private final UtilisateurRepository utilisateurRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogRepository auditLogRepository;

    public MonProfilService(UtilisateurRepository utilisateurRepository,
                            PasswordEncoder passwordEncoder,
                            AuditLogRepository auditLogRepository) {
        this.utilisateurRepository = utilisateurRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional(readOnly = true)
    public MonProfilResponse monProfil(UUID utilisateurId) {
        Utilisateur u = require(utilisateurId);
        PMECliente tenant = u.getPmeCliente();
        Chauffeur chauffeur = u.getChauffeur();

        return new MonProfilResponse(
                u.getUtilisateurId(),
                u.getNom(),
                u.getEmail(),
                u.getRole() != null ? u.getRole().name() : null,
                tenant != null ? tenant.getTenantId() : null,
                tenant != null ? tenant.getNomEntreprise() : null,
                u.getCin(),
                u.getDateNaissance(),
                u.getSexe(),
                u.getAdresse(),
                chauffeur != null ? chauffeur.getTelephone() : null,
                chauffeur != null ? chauffeur.getTypeChauffeur() : null,
                chauffeur != null ? chauffeur.getStatutDossier() : null,
                (chauffeur != null && chauffeur.getVehicule() != null)
                        ? chauffeur.getVehicule().getImmatriculation() : null,
                u.getClientFinal() != null ? u.getClientFinal().getNom() : null);
    }

    @Transactional
    public void changerMotDePasse(UUID utilisateurId, ChangerMotDePasseRequest request) {
        if (utilisateurId == null) {
            throw new BusinessException("Non authentifie", 401);
        }
        Utilisateur u = require(utilisateurId);

        String hash = u.getMotDePasseHash();
        boolean ancienValide = hash != null && !hash.isBlank()
                && passwordEncoder.matches(request.ancienMotDePasse(), hash);
        if (!ancienValide) {
            throw new BusinessException("Ancien mot de passe incorrect", 400);
        }

        if (request.nouveauMotDePasse().equals(request.ancienMotDePasse())) {
            throw new BusinessException("Le nouveau mot de passe doit different de l'ancien", 400);
        }

        u.setMotDePasseHash(passwordEncoder.encode(request.nouveauMotDePasse()));
        utilisateurRepository.save(u);

        AuditLog audit = new AuditLog();
        audit.setPmeCliente(u.getPmeCliente());
        audit.setUtilisateur(u);
        audit.setEntite("Utilisateur");
        audit.setEntiteId(u.getUtilisateurId());
        audit.setAction(AuditAction.MODIFICATION);
        audit.setDetails("{\"action\":\"MOT_DE_PASSE_CHANGE\"}");
        auditLogRepository.save(audit);
    }

    private Utilisateur require(UUID utilisateurId) {
        return utilisateurRepository.findById(utilisateurId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable : " + utilisateurId));
    }
}
