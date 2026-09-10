package com.example.Bakend.dto.direction;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record SeuilRequest(
        @Min(value = 0, message = "Le seuil doit être supérieur ou égal à 0")
        @Max(value = 100, message = "Le seuil doit être inférieur ou égal à 100")
        double seuil
) {
}
