package com.example.Bakend.dto.demande;

import com.example.Bakend.entity.DemandeTransport;
import com.example.Bakend.entity.enums.DemandeStatut;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Réponse liste pour une demande de transport.
 */
public record DemandeResponse(
        UUID demandeId,
        String hubNom,
        String clientNom,
        String adresseCollecte,
        String adresseLivraison,
        BigDecimal tarif,
        DemandeStatut statut,
        int nbColis,
        BigDecimal poidsTotalKg,
        BigDecimal volumeTotalM3,
        LocalDate dateSouhaitee,
        String creneau,
        LocalDateTime createdAt
) {
    public DemandeResponse(DemandeTransport d, List<?> colis) {
        this(
                d.getDemandeId(),
                d.getHub() != null ? d.getHub().getNom() : null,
                d.getClientFinal() != null ? d.getClientFinal().getNom() : null,
                d.getAdresseCollecte(),
                d.getAdresseLivraison(),
                d.getTarif(),
                d.getStatut(),
                colis != null ? colis.size() : 0,
                null,
                null,
                d.getDateSouhaitee(),
                d.getCreneau(),
                d.getCreatedAt()
        );
    }
}
