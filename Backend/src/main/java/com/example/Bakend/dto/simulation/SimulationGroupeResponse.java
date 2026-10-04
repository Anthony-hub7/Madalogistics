package com.example.Bakend.dto.simulation;

import com.example.Bakend.entity.enums.TypeAlgorithme;

import java.util.List;

/**
 * Resultat d'une simulation de groupage hors BDD.
 *
 * Chaque sac retourne son profil (poids, volume, taux) et les
 * caracteristiques MINIMALES que doit avoir le vehicule qui le transportera —
 * aucun vehicule reel n'est lu en base.
 */
public record SimulationGroupeResponse(
    List<SacSimule> sacs,
    List<ColisNonGroupe> nonGroupes,
    Meta meta
) {
    public record SacSimule(
        int numero,
        int nbColis,
        List<Integer> colis,
        double poidsKg,
        double volumeM3,
        int tauxRemplissage,
        boolean sousSeuil,
        VehiculeRequis vehiculeRequis
    ) {}

    public record ColisNonGroupe(
        int indexColis,
        double poidsKg,
        double volumeM3,
        String motif
    ) {}

    /** Caracteristiques exigees du vehicule pour transporter le sac. */
    public record VehiculeRequis(
        double capacitePoidsKgMin,
        double capaciteVolumeM3Min,
        String gabaritSuggere,
        boolean horsGabarit
    ) {}

    public record Meta(
        TypeAlgorithme algo,
        int nbColis,
        int nbSacs,
        double capacitePoidsKg,
        double capaciteVolumeM3,
        int seuilRemplissage,
        long dureeCalculMs
    ) {}
}
