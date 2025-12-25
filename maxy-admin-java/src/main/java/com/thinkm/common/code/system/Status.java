package com.thinkm.common.code.system;

import lombok.Getter;

@Getter
public enum Status {
    ALIVE,
    DEAD;

    public static Status from(boolean alive) {
        return alive ? ALIVE : DEAD;
    }
}
