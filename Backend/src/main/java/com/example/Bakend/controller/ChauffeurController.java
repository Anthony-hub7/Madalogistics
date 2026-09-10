package com.example.Bakend.controller;

import com.example.Bakend.entity.Chauffeur;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.security.SecurityUtils;
import com.example.Bakend.service.EquipeService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Contrôleur REST pour le chauffeur connecté : vérifier son propre statut de dossier.
 * Utilisé par le frontend pour le bouton "Vérifier à nouveau" sur l'écran compte non activé.
 */
@RestController
@RequestMapping("/api/chauffeurs")
@PreAuthorize("hasRole('CHAUFFEUR')")
public class ChauffeurController {

    private final EquipeService equipeService;

    public ChauffeurController(EquipeService equipeService) {
        this.equipeService = equipeService;
    }

    /**
     * Statut du dossier du chauffeur connecté.
     * Retourne statutDossier, motifRefus, typeChauffeur, agenceNom.
     */
    @GetMapping("/mon-dossier/statut")
    public ResponseEntity<Map<String, Object>> monStatutDossier() {
        UUID utilisateurId = requireUtilisateurId();
        Optional<Chauffeur> chauffeurOpt = equipeService.obtenirDossierParUtilisateur(utilisateurId);

        if (chauffeurOpt.isEmpty()) {
            throw new BusinessException("Aucun dossier chauffeur associe a ce compte");
        }

        Chauffeur chauffeur = chauffeurOpt.get();
        String agenceNom = null;
        UUID agenceId = null;
        if (chauffeur.getAgenceCible() != null) {
            agenceNom = chauffeur.getAgenceCible().getNomEntreprise();
            agenceId = chauffeur.getAgenceCible().getTenantId();
        }

        return ResponseEntity.ok(Map.of(
                "statutDossier", chauffeur.getStatutDossier(),
                "motifRefus", chauffeur.getMotifRefus() != null ? chauffeur.getMotifRefus() : "",
                "typeChauffeur", chauffeur.getTypeChauffeur() != null ? chauffeur.getTypeChauffeur() : "",
                "agenceNom", agenceNom != null ? agenceNom : "",
                "agenceId", agenceId != null ? agenceId.toString() : "",
                "chauffeurId", chauffeur.getChauffeurId().toString()
        ));
    }

    private UUID requireUtilisateurId() {
        var user = SecurityUtils.getCurrentUser();
        if (user == null) {
            throw new BusinessException("Non authentifie", 401);
        }
        return user.getUtilisateurId();
    }
}
