package com.thinkm.maxy.repository;

import com.fasterxml.jackson.core.type.TypeReference;
import com.thinkm.common.util.JsonUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class WebPerfRegistry {
    private final static TypeReference<Map<String, String>> TYPE_REFERENCE = new TypeReference<>() {
    };

    private final Map<String, String> WEB_PERF_MAP = new ConcurrentHashMap<>();

    @PostConstruct
    private void init() {
        try {
            ClassPathResource resource = new ClassPathResource("templates/web-perf-map.json");
            try (InputStream is = resource.getInputStream()) {
                Map<String, String> loadedMap = JsonUtil.readValue(is, TYPE_REFERENCE);
                loadedMap.forEach((k, v) -> WEB_PERF_MAP.put(v, k));
                log.info("Loaded web perf reverse key map");
            }
            ClassPathResource resourcev0 = new ClassPathResource("templates/web-perf-map-v0.json");
            try (InputStream is = resourcev0.getInputStream()) {
                Map<String, String> loadedMap = JsonUtil.readValue(is, TYPE_REFERENCE);
                WEB_PERF_MAP.putAll(loadedMap);
                log.info("Loaded web perf v0 key map");
            }
        } catch (Exception e) {
            log.error("Failed to load web perf map", e);
        }
    }

    public Map<String, Object> translateKeys(Map<String, Object> inputMap) {
        Map<String, Object> translated = new HashMap<>();
        for (Map.Entry<String, Object> entry : inputMap.entrySet()) {
            String originalKey = WEB_PERF_MAP.getOrDefault(entry.getKey(), entry.getKey());
            translated.put(originalKey, entry.getValue());
        }

        return translated;
    }
}
