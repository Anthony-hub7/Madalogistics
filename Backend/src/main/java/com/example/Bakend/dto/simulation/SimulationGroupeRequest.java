package com.example.Bakend.dto.simulation;

import com.example.Bakend.entity.enums.TypeAlgorithme;

import java.util.List;

/**
 * Requete de simulation de groupage 100% hors BDD.
 *
 * Aucun identifiant (pas de hub, de tenant, de demande, de sac reels) :
 * l'utilisateur saisit uniquement les colis a simuler et la capacite
 * envisagee. Rien n'est lu ni ecrit en base.
 */
public record SimulationGroupeRequest(
    List<ColisSimule> colis,
    Double capacitePoidsKg,
    Double capaciteVolumeM3,
    TypeAlgorithme algo,
    Integer seuilRemplissage
) {
    public record ColisSimule(Double poidsKg, Double volumeM3) {}
}
