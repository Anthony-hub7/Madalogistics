package com.example.Bakend.dto.demande;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Requête de création d'une demande de transport (commande client).
 */
public record DemandeCreateRequest(
        @NotNull(message = "Le hub de départ est obligatoire")
        UUID hubId,

        @Size(max = 500, message = "L'adresse de collecte ne doit pas dépasser 500 caractères")
        String adresseCollecte,

        @Size(max = 500, message = "L'adresse de livraison ne doit pas dépasser 500 caractères")
        String adresseLivraison,

        Double latitudeCollecte,
        Double longitudeCollecte,

        Double latitudeLivraison,
        Double longitudeLivraison,

        LocalDate dateSouhaitee,

        @Size(max = 30, message = "Le créneau ne doit pas dépasser 30 caractères")
        String creneau,

        @Size(max = 255, message = "Le nom du destinataire ne doit pas dépasser 255 caractères")
        String nomDestinataire,

        @Size(max = 50, message = "Le téléphone du destinataire ne doit pas dépasser 50 caractères")
        String telDestinataire,

        boolean assurance,
        boolean express,

        @NotEmpty(message = "La commande doit contenir au moins un colis")
        @Valid
        List<DemandeColisRequest> colis
) {
}
