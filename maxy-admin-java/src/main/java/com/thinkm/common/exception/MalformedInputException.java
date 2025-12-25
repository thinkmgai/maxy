package com.thinkm.common.exception;

import com.thinkm.common.code.ReturnCode;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class MalformedInputException extends RuntimeException {

    public MalformedInputException() {
        super();
    }

    public MalformedInputException(String msg) {
        super(msg);
    }

    public MalformedInputException(ReturnCode error) {
        super(error.getMsg());
        log.error(error.getMsg());
    }
}
