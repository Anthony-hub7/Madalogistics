package com.example.Bakend.dto.freelance;

/**
 * Annulation d'une mission freelance par le gestionnaire.
 *
 * @param mode "FREELANCE" → republication (le sac reste propose aux freelances)
 *             "AGENCE"    → retour au groupage (colis detaches, sac supprime)
 * @param motif motif facultatif trace dans l'audit
 */
public record AnnulerFreelanceRequest(String mode, String motif) {}
