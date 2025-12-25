package com.thinkm.common.code;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum AuthCode {
    ADMIN_SUPER("0011", "system.menu.superManager"),
    ADMIN_GROUP("0012", "system.menu.groupManager"),
    GENERAL("0013", "system.menu.generalUser");

    private final String value;
    private final String name;

    public static String getNameByValue(String value) {
        for (AuthCode authCode : AuthCode.values()) {
            if (authCode.getValue().equals(value)) {
                return authCode.getName();
            }
        }
        return null;
    }

    public boolean equals(String target) {
        return this.value.equalsIgnoreCase(target);
    }
}
