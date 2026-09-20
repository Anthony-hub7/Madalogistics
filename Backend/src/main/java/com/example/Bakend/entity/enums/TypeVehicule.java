package com.example.Bakend.entity.enums;

/**
 * Types de vehicules figes (code de la route Madagascar, base francaise).
 *
 * PTAC requis par type :
 *   FOURGON        → B (≤ 3.5t)
 *   CAMION         → C (> 3.5t)
 *   SEMI_REMORQUE  → C + E (remorque)
 *   PICKUP         → B (≤ 3.5t)
 *   MINIBUS        → B ou C + D (transport personnes)
 *   BUS            → C + D (transport personnes)
 *   CITERNE        → C (fret specialise)
 *   PLATEAU        → C (fret plat)
 *
 * Code de la route Madagascar (base francaise) :
 *   B : vehicules ≤ 3.5t
 *   C : vehicules > 3.5t (poids lourds)
 *   D : transport en commun de personnes
 *   E : ensembles de vehicules (remorque)
 */
public enum TypeVehicule {

    FOURGON,
    CAMION,
    SEMI_REMORQUE,
    PICKUP,
    MINIBUS,
    BUS,
    CITERNE,
    PLATEAU;

    /**
     * Retourne la classe de permis minimale requise pour conduire ce type de vehicule.
     * Ne tient pas compte du PTAC (a verifier separemment).
     */
    public String permisRequis() {
        return switch (this) {
            case FOURGON, PICKUP -> "B";
            case CAMION, CITERNE, PLATEAU -> "C";
            case MINIBUS -> "B";
            case BUS -> "C";
            case SEMI_REMORQUE -> "C";
        };
    }

    /**
     * Retourne vrai si ce type necessite la classe D (transport de personnes).
     */
    public boolean necessitePermisD() {
        return this == BUS || this == MINIBUS;
    }

    /**
     * Retourne vrai si ce type necessite la classe E (remorque).
     */
    public boolean necessitePermisE() {
        return this == SEMI_REMORQUE;
    }
}
