package com.example.Bakend.maps;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
@ConfigurationProperties(prefix = "app.maps")
@Getter
@Setter
public class MapsProperties {

    private String userAgent = "MadaLogistix/1.0 (contact: admin@madalogistix.mg)";

    private String geocodeUrl = "https://nominatim.openstreetmap.org";
    private Duration geocodeTimeout = Duration.ofSeconds(5);

    private String routingUrl = "https://router.project-osrm.org";
    private Duration routingTimeout = Duration.ofSeconds(10);

    private Duration cacheTtlGeo = Duration.ofDays(30);
    private Duration cacheTtlRoute = Duration.ofDays(7);

    private int cacheMaxSizeGeo = 5000;
    private int cacheMaxSizeRoute = 1000;

    private int rateLimitGeoPerTenant = 30;
    private int rateLimitRoutePerTenant = 30;
    private int rateLimitWindowSeconds = 60;
}
