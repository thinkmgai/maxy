package com.thinkm.common.exception;

import com.thinkm.common.code.ReturnCode;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class NoMailInfoException extends RuntimeException {

    public NoMailInfoException() {
        super();
    }

    public NoMailInfoException(String msg) {
        super(msg);
    }

    public NoMailInfoException(ReturnCode error) {
        super(error.getMsg());
        log.error(error.getMsg());
    }
}
