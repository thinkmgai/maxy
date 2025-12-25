package com.thinkm.common.exception;

import com.thinkm.common.code.ReturnCode;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class FileParseException extends RuntimeException {

    public FileParseException() {
        super();
    }

    public FileParseException(String msg) {
        super(msg);
    }

    public FileParseException(String msg, int lineNum) {
        super(msg + "::" + lineNum);
    }

    public FileParseException(ReturnCode error) {
        super(error.getMsg());
        log.error(error.getMsg());
    }
}
