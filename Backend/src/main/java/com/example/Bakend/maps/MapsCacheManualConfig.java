package com.example.Bakend.maps;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MapsCacheManualConfig {

    @Bean("geoCache")
    public MapsManualCache<String, String> geoCache(MapsProperties props) {
        return new MapsManualCache<>(
                props.getCacheMaxSizeGeo(),
                props.getCacheTtlGeo().toMillis());
    }

    @Bean("routeCache")
    public MapsManualCache<String, String> routeCache(MapsProperties props) {
        return new MapsManualCache<>(
                props.getCacheMaxSizeRoute(),
                props.getCacheTtlRoute().toMillis());
    }
}
