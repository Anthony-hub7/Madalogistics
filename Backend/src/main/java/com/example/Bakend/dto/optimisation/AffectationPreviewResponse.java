package com.example.Bakend.dto.optimisation;

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
        double volumeM3
    ) {}

    public record ChauffeurCandidate(
        UUID chauffeurId,
        String nom,
        String prenom,
        List<String> permis
    ) {}

    public record VehiculeCandidate(
        UUID vehiculeId,
        String immatriculation,
        String type,
        double capacitePoidsKg,
        double capaciteVolumeM3,
        double ptac
    ) {}

    public record AffectationMeta(
        int nbSacs,
        int nbChauffeurs,
        int nbVehicules,
        int nbPairesCompatibles
    ) {}
}
