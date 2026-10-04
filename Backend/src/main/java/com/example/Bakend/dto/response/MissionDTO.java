package com.example.Bakend.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * DTO de réponse pour les missions du chauffeur.
 * Agrège Sac + Tournee + EtapeLivraison + Vehicule + Hub.
 */
public record MissionDTO(
    UUID sacId,
    String statut,
    // Sac
    String categorieDominante,
    BigDecimal tauxRemplissage,
    BigDecimal poidsTotalKg,
    BigDecimal volumeTotalM3,
    int nbColis,
    // Chauffeur
    UUID chauffeurId,
    String chauffeurNom,
    boolean disponible,
    // Vehicule
    UUID vehiculeId,
    String immatriculation,
    String marqueModele,
    BigDecimal capacitePoidsKg,
    BigDecimal capaciteVolumeM3,
    String typeVehicule,
    // Hub
    UUID hubId,
    String hubNom,
    Double hubLatitude,
    Double hubLongitude,
    // Tournee
    UUID tourneeId,
    String tourneeStatut,
    BigDecimal distanceTotaleKm,
    LocalDateTime dateDepartPrevue,
    // Etapes
    List<EtapeDTO> etapes,
    // Demandes liees
    List<DemandeResumeDTO> demandes,
    // Timestamps
    LocalDateTime createdAt
) {
    public record EtapeDTO(
        UUID etapeId,
        int ordre,
        String typeEtape,
        LocalDateTime dateHeurePrevue,
        LocalDateTime dateHeureReelle,
        String signatureNom,
        boolean photoPreuvePresente,
        // Colis
        UUID colisId,
        String descriptionColis,
        BigDecimal poidsKg,
        BigDecimal volumeM3,
        // Adresse depuis la demande
        String adresseCollecte,
        String adresseLivraison,
        String clientNom,
        // Coordonnees geographiques
        Double latitudeCollecte,
        Double longitudeCollecte,
        Double latitudeLivraison,
        Double longitudeLivraison
    ) {}

    public record DemandeResumeDTO(
        UUID demandeId,
        String statut,
        BigDecimal tarif,
        String adresseCollecte,
        String adresseLivraison,
        String clientNom
    ) {}
}
