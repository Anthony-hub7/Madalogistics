package com.example.Bakend.dto.optimisation;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record AffectationPreviewResponse(
    UUID hubId,
    List<SacAffectation> sacs,
    List<ChauffeurCandidate> chauffeursDisponibles,
    List<VehiculeCandidate> vehiculesDisponibles,
    AffectationMeta meta
) {
    public record SacAffectation(
        UUID sacId,
        String categorieDominante,
        int nbColis,
        double tauxRemplissage,
        UUID chauffeurIdAffecte,
        UUID vehiculeIdAffecte,
        double poidsKg,
        double volumeM3,
        LocalDate dateLivraison,
        LocalDate dateDepartPrevue,
        int delaiJours,
        String sourceDelai
    ) {}

    public record ChauffeurCandidate(
        UUID chauffeurId,
        String nom,
        String prenom,
        List<String> permis,
        boolean disponible
    ) {}

    public record VehiculeCandidate(
        UUID vehiculeId,
        String immatriculation,
        String type,
        double capacitePoidsKg,
        double capaciteVolumeM3,
        double ptac,
        boolean vehiculePerso,
        UUID chauffeurProprietaireId
    ) {}

    public record AffectationMeta(
        int nbSacs,
        int nbChauffeurs,
        int nbVehicules,
        int nbPairesCompatibles
    ) {}
}
