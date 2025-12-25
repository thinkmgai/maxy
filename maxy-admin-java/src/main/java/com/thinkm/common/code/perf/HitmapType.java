package com.thinkm.common.code.perf;

public enum HitmapType {
    API,
    PAGE;

    public static HitmapType of(String type) {
        if (type == null) {
            throw new IllegalArgumentException("type must not be null");
        }
        return HitmapType.valueOf(type.toUpperCase());
    }
}
