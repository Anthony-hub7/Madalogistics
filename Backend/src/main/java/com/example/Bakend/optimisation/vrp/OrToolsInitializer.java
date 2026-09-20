package com.example.Bakend.optimisation.vrp;

import com.google.ortools.Loader;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Charge les librairies natives OR-Tools une seule fois au démarrage de l'application.
 * Les binaires linux-x86-64 (glibc) sont embarqués dans le JAR et extraits au runtime.
 * Nécessite un OS linux/x86_64 avec glibc (pas Alpine musl).
 */
@Component
public class OrToolsInitializer {

    private static final Logger log = LoggerFactory.getLogger(OrToolsInitializer.class);

    @PostConstruct
    void init() {
        log.info("Chargement des librairies natives OR-Tools...");
        Loader.loadNativeLibraries();
        log.info("OR-Tools chargé — arch: {}, os: {}",
                System.getProperty("os.arch"),
                System.getProperty("os.name"));
    }
}
