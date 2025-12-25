package com.thinkm.common.exception;

import com.thinkm.common.code.ReturnCode;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class AuthException extends RuntimeException {

    public AuthException() {
        super();
    }

    public AuthException(String msg) {
        super(msg);
    }

    public AuthException(ReturnCode error) {
        super(error.getMsg());
        log.error(error.getMsg());
    }
}
