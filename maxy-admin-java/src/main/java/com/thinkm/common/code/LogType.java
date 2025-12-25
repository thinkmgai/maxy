package com.thinkm.common.code;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum LogType {
    ERROR("error"),
    CRASH("crash"),
    TOTAL("total"),
    PAGE("page");

    private final String value;

    public boolean equals(String target) {
        return this.value.equalsIgnoreCase(target);
    }
}
