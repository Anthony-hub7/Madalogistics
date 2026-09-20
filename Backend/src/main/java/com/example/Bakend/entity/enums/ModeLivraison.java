package com.example.Bakend.entity.enums;

/**
 * Mode de livraison choisi par le gestionnaire lors de la validation (Phase 3bis).
 * AGENCE   = chauffeur rattaché à l'agence (matrice compatibilité pré-configurée).
 * FREELANCE = chauffeur indépendant (scoring dynamique, Phase 5bis).
 */
public enum ModeLivraison {
    AGENCE,
    FREELANCE
}
