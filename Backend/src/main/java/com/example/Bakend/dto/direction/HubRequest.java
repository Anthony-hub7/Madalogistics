package com.example.Bakend.dto.direction;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record HubRequest(
        @NotBlank(message = "Le nom du hub est obligatoire")
        @Size(max = 255, message = "Le nom ne doit pas dépasser 255 caractères")
        String nom,

        @Size(max = 500, message = "L'adresse ne doit pas dépasser 500 caractères")
        String adresse,

        Double latitude,

        Double longitude,

        boolean zoneSecuriseeDispo
) {
}
