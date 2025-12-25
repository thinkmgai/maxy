package com.thinkm.common.exception;

import com.thinkm.common.code.ReturnCode;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class ReadFileException extends RuntimeException {

    public ReadFileException() {
        super();
    }

    public ReadFileException(String msg) {
        super(msg);
    }

    public ReadFileException(ReturnCode error) {
        super(error.getMsg());
        log.error(error.getMsg());
    }
}
