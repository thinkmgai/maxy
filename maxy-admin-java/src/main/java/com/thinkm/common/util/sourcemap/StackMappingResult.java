package com.thinkm.common.util.sourcemap;

public record StackMappingResult(String raw, String value) {
    public static StackMappingResult single(String raw) {
        return new StackMappingResult(raw, "");
    }
}