package com.example.Bakend.exception;

/**
 * Exception métier (règle de gestion) : conflit, opération interdite, etc.
 * Transporte un statut HTTP par défaut (409 Conflict).
 */
public class BusinessException extends RuntimeException {

    private final int status;

    public BusinessException(String message) {
        this(message, 409);
    }

    public BusinessException(String message, int status) {
        super(message);
        this.status = status;
    }

    public int getStatus() {
        return status;
    }
}