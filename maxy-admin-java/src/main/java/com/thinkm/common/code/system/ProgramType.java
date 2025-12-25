package com.thinkm.common.code.system;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.*;

@Getter
@RequiredArgsConstructor
public enum ProgramType {

    DB("db"),
    KAFKA("kafka"),
    ELASTIC("elastic"),
    REDIS("redis"),

    ADMIN("admin"),
    BATCH("batch"),
    CONSUMER("consumer"),
    PRODUCER("producer"),
    WEBSOCKET("websocket");

    private final String value;

    public static ProgramType from(String value) {
        return Arrays.stream(ProgramType.values())
                .filter(v -> v.value.equalsIgnoreCase(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Not allow for " + value));
    }

    public static Map<String, Boolean> toMap(List<ContainerStatus> list) {
        Map<String, Boolean> result = new HashMap<>();
        if (list == null) {
            return Collections.emptyMap();
        }
        list.forEach(status -> {
            result.put(status.getName(), status.getStatus().equals(Status.ALIVE));
        });
        return result;
    }
}
