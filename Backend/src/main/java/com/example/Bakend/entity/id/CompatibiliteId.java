package com.example.Bakend.entity.id;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.UUID;

/**
 * Clé composite de la table compatibilite_chauffeur_vehicule.
 */
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode
public class CompatibiliteId implements Serializable {

    private UUID chauffeurId;
    private UUID vehiculeId;

    public CompatibiliteId(UUID chauffeurId, UUID vehiculeId) {
        this.chauffeurId = chauffeurId;
        this.vehiculeId = vehiculeId;
    }
}
