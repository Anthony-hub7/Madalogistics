package com.example.Bakend.optimisation.vrp;

import com.example.Bakend.entity.Colis;
import com.example.Bakend.entity.DemandeTransport;
import com.example.Bakend.entity.Hub;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests unitaires de VrpMatrixBuilder.
 * Vérifie : symétrie, dimensions, conversion km→sec, gestion des coords manquantes.
 */
class VrpMatrixBuilderTest {

    private VrpMatrixBuilder builder;

    @BeforeEach
    void setUp() {
        builder = new VrpMatrixBuilder(new HaversineMatrixProvider());
    }

    private Hub createHub(Double lat, Double lon) {
        Hub hub = new Hub();
        hub.setHubId(UUID.randomUUID());
        hub.setNom("Hub Test");
        hub.setLatitude(lat);
        hub.setLongitude(lon);
        return hub;
    }

    private Colis createColis(Double livLat, Double livLon) {
        DemandeTransport demande = new DemandeTransport();
        demande.setDemandeId(UUID.randomUUID());
        demande.setLatitudeLivraison(livLat);
        demande.setLongitudeLivraison(livLon);

        Colis colis = new Colis();
        colis.setColisId(UUID.randomUUID());
        colis.setDemande(demande);
        return colis;
    }

    @Test
    void matrixIsSymmetric() {
        Hub hub = createHub(-18.9, 47.5); // Antananarivo
        List<Colis> colis = List.of(
                createColis(-18.95, 47.55),
                createColis(-18.88, 47.48)
        );

        VrpMatrixBuilder.VrpMatrixResult result = builder.build(hub, colis);
        long[][] m = result.timeMatrixSec();

        assertEquals(m.length, m[0].length, "Matrice carrée");
        for (int i = 0; i < m.length; i++) {
            for (int j = 0; j < m.length; j++) {
                assertEquals(m[i][j], m[j][i],
                        "Symétrie [" + i + "][" + j + "] ≠ [" + j + "][" + i + "]");
            }
        }
    }

    @Test
    void matrixDimensionsAreNPlusOne() {
        Hub hub = createHub(-18.9, 47.5);
        List<Colis> colis = List.of(
                createColis(-18.95, 47.55),
                createColis(-18.88, 47.48),
                createColis(-19.0, 47.6)
        );

        VrpMatrixBuilder.VrpMatrixResult result = builder.build(hub, colis);

        assertEquals(4, result.timeMatrixSec().length, "3 colis + 1 dépôt = 4");
        assertEquals(4, result.orderedColis().size());
        assertNull(result.orderedColis().get(0), "Index 0 = dépôt (null)");
        assertNotNull(result.orderedColis().get(1));
        assertNotNull(result.orderedColis().get(2));
        assertNotNull(result.orderedColis().get(3));
    }

    @Test
    void depotToSelfIsZero() {
        Hub hub = createHub(-18.9, 47.5);
        List<Colis> colis = List.of(createColis(-18.95, 47.55));

        VrpMatrixBuilder.VrpMatrixResult result = builder.build(hub, colis);

        assertEquals(0, result.timeMatrixSec()[0][0],
                "Distance dépôt→dépôt = 0");
    }

    @Test
    void conversionKmToSecIsCorrect() {
        Hub hub = createHub(0.0, 0.0);
        // Point a ~111 km au nord (1 degre latitude ≈ 111 km)
        List<Colis> colis = List.of(createColis(1.0, 0.0));

        VrpMatrixBuilder.VrpMatrixResult result = builder.build(hub, colis);
        long timeSec = result.timeMatrixSec()[0][1];

        // 111 km / 40 km/h = 2.775h = ~10007 sec
        assertTrue(timeSec > 9000 && timeSec < 11000,
                "Conversion ≈ 10007 sec (2.775h a 40km/h), got " + timeSec);
    }

    @Test
    void colisAreSortedByColisId() {
        Hub hub = createHub(-18.9, 47.5);
        Colis c1 = createColis(-18.95, 47.55);
        Colis c2 = createColis(-18.88, 47.48);

        // Inverser l'ordre d'entrée
        List<Colis> colis = List.of(c2, c1);

        VrpMatrixBuilder.VrpMatrixResult result = builder.build(hub, colis);

        // Les colis sont triés par colisId
        assertTrue(result.orderedColis().get(1).getColisId()
                        .compareTo(result.orderedColis().get(2).getColisId()) < 0,
                "Colis triés par colisId croissant");
    }

    @Test
    void emptyColisListThrows() {
        Hub hub = createHub(-18.9, 47.5);

        assertThrows(IllegalArgumentException.class,
                () -> builder.build(hub, List.of()),
                "Liste vide doit lever une exception");
    }

    @Test
    void hubWithoutCoordinatesThrows() {
        Hub hub = createHub(null, null);
        List<Colis> colis = List.of(createColis(-18.95, 47.55));

        assertThrows(IllegalArgumentException.class,
                () -> builder.build(hub, colis),
                "Hub sans coords doit lever une exception");
    }

    @Test
    void colisWithoutDeliveryCoordinatesThrows() {
        Hub hub = createHub(-18.9, 47.5);
        Colis colis = createColis(null, null);

        assertThrows(IllegalArgumentException.class,
                () -> builder.build(hub, List.of(colis)),
                "Colis sans coords livraison doit lever une exception");
    }
}
