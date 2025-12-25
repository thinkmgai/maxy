package com.thinkm.common.exception;

import com.thinkm.common.code.ReturnCode;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class ArrayIndexOutOfBoundsException extends RuntimeException {

    public ArrayIndexOutOfBoundsException() {
        super();
    }

    public ArrayIndexOutOfBoundsException(String msg) {
        super(msg);
    }

    public ArrayIndexOutOfBoundsException(ReturnCode error) {
        super(error.getMsg());
        log.error(error.getMsg());
    }
}
