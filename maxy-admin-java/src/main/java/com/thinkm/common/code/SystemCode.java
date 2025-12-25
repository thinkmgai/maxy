package com.thinkm.common.code;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SystemCode {
    CMM(0),
    ERR(1),

    WS_ADMIN(0),
    WS_LOGMETER(1),

    LOG_TOTAL(0),
    LOG_TROUBLE(1),
    LOG_PERF(2),
    LOG_ACCESS(3),
    LOG_PAGE(4);
    private final int code;
}
