package com.example.Bakend.maps;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Wrapper JDK HttpClient (JDK 17 natif) — remplace WebClient.
 * Zero dependance externe.
 */
@Slf4j
@Component
public class MapsHttpClient {

    private final HttpClient client;

    public MapsHttpClient(MapsProperties props) {
        this.client = HttpClient.newBuilder()
                .connectTimeout(props.getGeocodeTimeout())
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    public byte[] fetchBytes(String url, String userAgent) throws IOException, InterruptedException {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(5))
                .header("User-Agent", userAgent)
                .GET()
                .build();
        HttpResponse<byte[]> resp = client.send(req, HttpResponse.BodyHandlers.ofByteArray());
        if (resp.statusCode() != 200) {
            throw new IOException("Upstream returned HTTP " + resp.statusCode());
        }
        return resp.body();
    }

    public String fetchString(String url, String userAgent) throws IOException, InterruptedException {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(5))
                .header("User-Agent", userAgent)
                .header("Accept", "application/json")
                .GET()
                .build();
        HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() != 200) {
            throw new IOException("Upstream returned HTTP " + resp.statusCode());
        }
        return resp.body();
    }
}
