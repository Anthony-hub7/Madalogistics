package com.example.Bakend.maps;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class MapsJsonParserTest {

    @Test
    void parseValidPoints() {
        String body = "{\"points\":[[-18.914,47.541],[-18.150,49.388]],\"profile\":\"driving\"}";
        List<double[]> pts = MapsJsonParser.parsePoints(body);
        assertEquals(2, pts.size());
        assertEquals(-18.914, pts.get(0)[0], 0.001);
        assertEquals(47.541, pts.get(0)[1], 0.001);
        assertEquals(-18.150, pts.get(1)[0], 0.001);
        assertEquals(49.388, pts.get(1)[1], 0.001);
    }

    @Test
    void parseThreePoints() {
        String body = "{\"points\":[[1.0,2.0],[3.0,4.0],[5.0,6.0]]}";
        List<double[]> pts = MapsJsonParser.parsePoints(body);
        assertEquals(3, pts.size());
    }

    @Test
    void emptyBodyReturnsEmpty() {
        assertEquals(0, MapsJsonParser.parsePoints(null).size());
        assertEquals(0, MapsJsonParser.parsePoints("").size());
        assertEquals(0, MapsJsonParser.parsePoints("{}").size());
    }

    @Test
    void noPointsKeyReturnsEmpty() {
        assertEquals(0, MapsJsonParser.parsePoints("{\"other\":\"data\"}").size());
    }

    @Test
    void singlePointReturnsOne() {
        assertEquals(1, MapsJsonParser.parsePoints("{\"points\":[[-18.9,47.5]]}").size());
    }
}
