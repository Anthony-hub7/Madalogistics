package com.example.Bakend.dto.demande;

import com.example.Bakend.entity.Colis;
import com.example.Bakend.entity.DemandeTransport;
import com.example.Bakend.entity.enums.DemandeStatut;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Réponse détaillée d'une demande de transport (avec colis).
 */
public record DemandeDetailResponse(
        UUID demandeId,
        UUID hubId,
        String hubNom,
        String clientNom,
        UUID clientFinalId,
        String adresseCollecte,
        String adresseLivraison,
        Double latitudeCollecte,
        Double longitudeCollecte,
        Double latitudeLivraison,
        Double longitudeLivraison,
        BigDecimal tarif,
        DemandeStatut statut,
        LocalDate dateSouhaitee,
        String creneau,
        String nomDestinataire,
        String telDestinataire,
        String motifRefus,
        UUID valideParId,
        UUID grilleId,
        List<ColisItem> colis,
        LocalDateTime createdAt
) {
    public record ColisItem(
            UUID colisId,
            BigDecimal poidsKg,
            BigDecimal volumeM3,
            UUID categorieId,
            String categorieLibelle,
            String categorieClasseValeur,
            String etat
    ) {
        public static ColisItem from(Colis c) {
            return new ColisItem(
                    c.getColisId(),
                    c.getPoidsKg(),
                    c.getVolumeM3(),
                    c.getCategorie() != null ? c.getCategorie().getCategorieId() : null,
                    c.getCategorie() != null ? c.getCategorie().getLibelle() : null,
                    c.getCategorie() != null ? c.getCategorie().getClasseValeur().name() : null,
                    c.getEtat() != null ? c.getEtat().name() : null
            );
        }
    }

    public static DemandeDetailResponse from(DemandeTransport d) {
        List<ColisItem> colisItems = d.getColis() != null
                ? d.getColis().stream().map(ColisItem::from).toList()
                : List.of();

        return new DemandeDetailResponse(
                d.getDemandeId(),
                d.getHub() != null ? d.getHub().getHubId() : null,
                d.getHub() != null ? d.getHub().getNom() : null,
                d.getClientFinal() != null ? d.getClientFinal().getNom() : null,
                d.getClientFinal() != null ? d.getClientFinal().getClientFinalId() : null,
                d.getAdresseCollecte(),
                d.getAdresseLivraison(),
                d.getLatitudeCollecte(),
                d.getLongitudeCollecte(),
                d.getLatitudeLivraison(),
                d.getLongitudeLivraison(),
                d.getTarif(),
                d.getStatut(),
                d.getDateSouhaitee(),
                d.getCreneau(),
                d.getNomDestinataire(),
                d.getTelDestinataire(),
                d.getMotifRefus(),
                d.getValidePar() != null ? d.getValidePar().getUtilisateurId() : null,
                d.getGrilleUtilisee() != null ? d.getGrilleUtilisee().getGrilleId() : null,
                colisItems,
                d.getCreatedAt()
        );
    }
}
