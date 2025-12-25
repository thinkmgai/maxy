package com.thinkm.common.exception;

import com.thinkm.common.code.ReturnCode;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class ConflictException extends RuntimeException {

    public ConflictException() {
        super();
    }

    public ConflictException(String msg) {
        super(msg);
    }

    public ConflictException(ReturnCode error) {
        super(error.getMsg());
        log.error(error.getMsg());
    }
}
