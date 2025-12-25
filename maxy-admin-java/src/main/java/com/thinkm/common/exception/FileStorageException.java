package com.thinkm.common.exception;

import com.thinkm.common.code.ReturnCode;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class FileStorageException extends RuntimeException {

    public FileStorageException() {
        super();
    }

    public FileStorageException(String msg) {
        super(msg);
    }

    public FileStorageException(ReturnCode error) {
        super(error.getMsg());
    }
}
