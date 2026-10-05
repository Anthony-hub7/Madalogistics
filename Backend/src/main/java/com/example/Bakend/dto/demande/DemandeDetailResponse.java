package com.example.Bakend.dto.demande;

import com.example.Bakend.entity.Colis;
import com.example.Bakend.entity.DemandeTransport;
import com.example.Bakend.entity.enums.DemandeStatut;
import com.example.Bakend.entity.enums.ModeLivraison;

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
        ModeLivraison modeLivraison,
        List<ColisItem> colis,
        UUID sacId,
        String sacStatut,
        String missionChauffeur,
        LocalDateTime createdAt
) {
    public record ColisItem(
            UUID colisId,
            BigDecimal poidsKg,
            BigDecimal volumeM3,
            UUID categorieId,
            String categorieLibelle,
            String categorieClasseValeur,
            String etat,
            UUID sacId,
            String sacStatut
    ) {
        public static ColisItem from(Colis c) {
            return new ColisItem(
                    c.getColisId(),
                    c.getPoidsKg(),
                    c.getVolumeM3(),
                    c.getCategorie() != null ? c.getCategorie().getCategorieId() : null,
                    c.getCategorie() != null ? c.getCategorie().getLibelle() : null,
                    c.getCategorie() != null ? c.getCategorie().getClasseValeur().name() : null,
                    c.getEtat() != null ? c.getEtat().name() : null,
                    c.getSac() != null ? c.getSac().getSacId() : null,
                    c.getSac() != null && c.getSac().getStatut() != null ? c.getSac().getStatut().name() : null
            );
        }
    }

    public static DemandeDetailResponse from(DemandeTransport d) {
        List<ColisItem> colisItems = d.getColis() != null
                ? d.getColis().stream().map(ColisItem::from).toList()
                : List.of();

        // Mission : sac porte par le premier colis rattache (1 commande
        // freelance = 1 sac). Sert la liste et la page detail sans 2e appel.
        UUID sacId = null;
        String sacStatut = null;
        String missionChauffeur = null;
        if (d.getColis() != null) {
            for (Colis c : d.getColis()) {
                if (c.getSac() == null) continue;
                sacId = c.getSac().getSacId();
                sacStatut = c.getSac().getStatut() != null ? c.getSac().getStatut().name() : null;
                missionChauffeur = c.getSac().getChauffeur() != null
                        && c.getSac().getChauffeur().getUtilisateur() != null
                        ? c.getSac().getChauffeur().getUtilisateur().getNom() : null;
                break;
            }
        }

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
                d.getModeLivraison(),
                colisItems,
                sacId,
                sacStatut,
                missionChauffeur,
                d.getCreatedAt()
        );
    }
}
