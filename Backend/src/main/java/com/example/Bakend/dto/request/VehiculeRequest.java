package com.example.Bakend.dto.request;

import com.example.Bakend.entity.enums.TypeVehicule;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class VehiculeRequest {

    @NotBlank(message = "L'immatriculation est obligatoire")
    private String immatriculation;

    @NotNull(message = "Le hub est obligatoire")
    private UUID hubId;

    @NotNull(message = "La capacite poids est obligatoire")
    @Positive(message = "La capacite poids doit etre superieure a 0")
    private BigDecimal capacitePoidsKg;

    @NotNull(message = "La capacite volume est obligatoire")
    @Positive(message = "La capacite volume doit etre superieure a 0")
    private BigDecimal capaciteVolumeM3;

    private String statut;

    private String marqueModele;

    private TypeVehicule typeVehicule;

    private Integer annee;

    @DecimalMin(value = "0.01", message = "Le PTAC doit etre superieur a 0 tonne (saisir en tonnes, ex. 10 pour 10t)")
    @DecimalMax(value = "60.00", message = "PTAC aberrant : 60t max (verifiez l'unite — saisir en tonnes, pas en kg)")
    private BigDecimal ptacTonnes;
}
