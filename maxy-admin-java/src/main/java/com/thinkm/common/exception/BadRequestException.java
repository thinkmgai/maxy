package com.thinkm.common.exception;

import com.thinkm.common.code.ReturnCode;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class BadRequestException extends RuntimeException {

    public BadRequestException() {
        super();
    }

    public BadRequestException(String msg) {
        super(msg);
    }

    public BadRequestException(ReturnCode error) {
        super(error.getMsg());
        log.error(error.getMsg());
    }
}
