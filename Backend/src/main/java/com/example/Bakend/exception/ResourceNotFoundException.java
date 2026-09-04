package com.example.Bakend.exception;

/**
 * Exception levée lorsqu'une ressource est introuvable dans le scope courant.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}