package com.example.Bakend.dto.optimisation;

import java.util.List;
import java.util.UUID;

/**
 * Detail complet d'un sac pour l'historique (gestionnaire / direction).
 * Agrège Sac + chauffeur + vehicule + colis + demandes d'origine + etapes (preuves).
 */
public record SacDetailResponse(
        UUID sacId,
        UUID hubId,
        String hubNom,
        String statut,
        String categorieDominante,
        int nbColis,
        double poidsKg,
        double volumeM3,
        double tauxRemplissage,
        UUID chauffeurId,
        String chauffeurNom,
        UUID vehiculeId,
        String immatriculation,
        boolean hasTournee,
        UUID tourneeId,
        String tourneeStatut,
        String dateDepartPlafond,
        List<String> clients,
        List<ColisDetail> colis,
        List<EtapeDetail> etapes,
        List<DemandeDetail> demandes
) {

    public record ColisDetail(
            UUID colisId,
            double poidsKg,
            double volumeM3,
            String etat,
            String categorie,
            UUID demandeId,
            String clientNom,
            String adresseLivraison
    ) {}

    public record EtapeDetail(
            UUID etapeId,
            int ordre,
            String typeEtape,
            String dateReelle,
            String signatureNom,
            boolean photoPreuvePresente,
            UUID colisId,
            String clientNom
    ) {}

    public record DemandeDetail(
            UUID demandeId,
            String statut,
            double tarif,
            String clientNom,
            String adresseLivraison,
            UUID factureId,
            String factureStatut
    ) {}
}
