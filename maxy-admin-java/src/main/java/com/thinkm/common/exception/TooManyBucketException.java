package com.thinkm.common.exception;

import com.thinkm.common.code.ReturnCode;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class TooManyBucketException extends RuntimeException {

    public TooManyBucketException() {
        super();
    }

    public TooManyBucketException(String msg) {
        super(msg);
    }

    public TooManyBucketException(ReturnCode error) {
        super(error.getMsg());
        log.error(error.getMsg());
    }
}
