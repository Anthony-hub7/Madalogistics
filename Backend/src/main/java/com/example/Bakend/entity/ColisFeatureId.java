package com.example.Bakend.entity;

import lombok.EqualsAndHashCode;

import java.io.Serializable;
import java.util.UUID;

/**
 * Cle composite pour ColisFeature (colis_id, tenant_id).
 * Les noms des champs doivent matcher les @Id de ColisFeature.
 */
@EqualsAndHashCode
public class ColisFeatureId implements Serializable {

    private UUID colis;
    private UUID pmeCliente;

    public ColisFeatureId() {}

    public ColisFeatureId(UUID colis, UUID pmeCliente) {
        this.colis = colis;
        this.pmeCliente = pmeCliente;
    }
}
