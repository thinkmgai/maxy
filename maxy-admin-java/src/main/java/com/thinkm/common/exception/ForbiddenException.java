package com.thinkm.common.exception;

import com.thinkm.common.code.ReturnCode;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class ForbiddenException extends RuntimeException {

    public ForbiddenException() {
        super();
    }

    public ForbiddenException(String msg) {
        super(msg);
    }

    public ForbiddenException(String msg, int lineNum) {
        super(msg + "::" + lineNum);
    }

    public ForbiddenException(ReturnCode error) {
        super(error.getMsg());
        log.error(error.getMsg());
    }
}
