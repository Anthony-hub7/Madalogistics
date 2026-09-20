package com.example.Bakend.optimisation.vrp;

/**
 * Mode de résolution VRP.
 * SINGLE_DEPOT : tous les véhicules partent du même hub (chauffeurs agence).
 * MULTI_DEPOT_OPEN : chaque véhicule a un dépôt d'origine (freelance, pas de retour).
 */
public enum VrpMode {
    SINGLE_DEPOT,
    MULTI_DEPOT_OPEN
}
