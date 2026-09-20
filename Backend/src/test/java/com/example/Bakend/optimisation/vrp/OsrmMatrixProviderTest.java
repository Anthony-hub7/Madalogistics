package com.example.Bakend.optimisation.vrp;

import com.example.Bakend.maps.MapsHttpClient;
import com.example.Bakend.maps.MapsProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * Tests unitaires de OsrmMatrixProvider.
 * Mock MapsHttpClient — pas d'appel OSRM réel.
 */
@ExtendWith(MockitoExtension.class)
class OsrmMatrixProviderTest {

    @Mock private MapsHttpClient httpClient;
    @Mock private MapsProperties props;

    private HaversineMatrixProvider fallback;
    private OsrmMatrixProvider provider;

    @BeforeEach
    void setUp() {
        fallback = new HaversineMatrixProvider();
        provider = new OsrmMatrixProvider(httpClient, props, fallback);
    }

    @Test
    void parseDurationsValidJson() {
        String json = "{\"code\":\"Ok\",\"durations\":[[0.0,123.4],[456.7,0.0]]}";
        long[][] m = OsrmMatrixProvider.parseDurations(json, 2);

        assertEquals(2, m.length);
        assertEquals(0, m[0][0]);
        assertEquals(123, m[0][1]);
        assertEquals(457, m[1][0]);
        assertEquals(0, m[1][1]);
    }

    @Test
    void parseDurations3x3() {
        String json = "{\"code\":\"Ok\",\"durations\":[[0.0,10.5,20.3],[10.5,0.0,15.8],[20.3,15.8,0.0]]}";
        long[][] m = OsrmMatrixProvider.parseDurations(json, 3);

        assertEquals(3, m.length);
        assertEquals(0, m[0][0]);
        assertEquals(11, m[0][1]);
        assertEquals(20, m[0][2]);
        assertEquals(11, m[1][0]);
        assertEquals(0, m[1][1]);
        assertEquals(16, m[1][2]);
    }

    @Test
    void parseDurationsMissingKeyThrows() {
        String json = "{\"code\":\"Ok\"}";
        assertThrows(RuntimeException.class,
                () -> OsrmMatrixProvider.parseDurations(json, 2));
    }

    @Test
    void parseDurationsSizeMismatchThrows() {
        String json = "{\"code\":\"Ok\",\"durations\":[[0.0,1.0]]}";
        assertThrows(RuntimeException.class,
                () -> OsrmMatrixProvider.parseDurations(json, 3));
    }

    @Test
    void fallbackToHaversineOnException() throws Exception {
        when(props.getRoutingUrl()).thenReturn("https://router.project-osrm.org");
        when(props.getUserAgent()).thenReturn("Test/1.0");
        when(httpClient.fetchString(anyString(), anyString()))
                .thenThrow(new RuntimeException("OSRM down"));

        List<GeoPoint> points = List.of(
                new GeoPoint(-18.9, 47.5),
                new GeoPoint(-18.95, 47.55)
        );

        long[][] m = provider.matriceTemps(points);

        // Vérifier que le fallback Haversine est utilisé (symétrique, non nul)
        assertEquals(2, m.length);
        assertEquals(0, m[0][0]);
        assertTrue(m[0][1] > 0, "Fallback Haversine doit produire une valeur positive");
        assertEquals(m[0][1], m[1][0], "Fallback doit être symétrique");
    }

    @Test
    void osrmCalledWhenAvailable() throws Exception {
        when(props.getRoutingUrl()).thenReturn("https://router.project-osrm.org");
        when(props.getUserAgent()).thenReturn("Test/1.0");
        String osrmResponse = "{\"code\":\"Ok\",\"durations\":[[0.0,999.0],[999.0,0.0]]}";
        when(httpClient.fetchString(anyString(), anyString())).thenReturn(osrmResponse);

        List<GeoPoint> points = List.of(
                new GeoPoint(-18.9, 47.5),
                new GeoPoint(-18.95, 47.55)
        );

        long[][] m = provider.matriceTemps(points);

        assertEquals(999, m[0][1], "Doit utiliser la valeur OSRM");
        assertEquals(999, m[1][0]);
    }
}
