package com.thinkm.common.code;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum MailCode {

    RESET_PW("REPW"),
    SERVER_WATCHER("SW");

    private final String value;
}
