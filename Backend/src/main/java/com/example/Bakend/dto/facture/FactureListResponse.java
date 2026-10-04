package com.example.Bakend.dto.facture;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Ligne de facture pour l'historique (onglet Factures du gestionnaire).
 * Inclut le lien vers la commande et la presence de preuves de livraison.
 */
public record FactureListResponse(
        UUID factureId,
        BigDecimal montantTotal,
        String statut,
        LocalDateTime dateEmission,
        UUID demandeId,
        String clientNom,
        String adresseLivraison,
        String demandeStatut,
        int nbPreuves
) {
    public boolean hasPreuves() {
        return nbPreuves > 0;
    }
}
