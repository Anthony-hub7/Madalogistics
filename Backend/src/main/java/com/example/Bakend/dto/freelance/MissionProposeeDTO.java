package com.example.Bakend.dto.freelance;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Une mission ouverte aux freelances (sac CONSTITUE issu d'une demande FREELANCE).
 * Le filtrage dur (poids/volume du vehicule du freelance, permis, habilitation)
 * est calcule par le backend : {@code eligible} + {@code motifsIneligibles}.
 */
public record MissionProposeeDTO(
        UUID sacId,
        String agenceNom,
        String hubNom,
        String adresseCollecte,
        String adresseLivraison,
        String clientNom,
        int nbColis,
        double poidsKg,
        double volumeM3,
        String categorieDominante,
        BigDecimal tauxRemplissage,
        LocalDate dateDepartPrevue,
        Double distanceKm,
        BigDecimal remunerationEstimee,
        boolean eligible,
        List<String> motifsIneligibles
) {}
