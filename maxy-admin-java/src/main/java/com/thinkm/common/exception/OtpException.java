package com.thinkm.common.exception;

import com.thinkm.common.code.ReturnCode;
import com.thinkm.maxy.dto.otp.OtpResponseDto;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Getter
public class OtpException extends RuntimeException {
    private final OtpResponseDto dto;

    public OtpException(ReturnCode error) {
        super(error.getMsg());
        log.error(error.getMsg());
        this.dto = null;
    }

    public OtpException(ReturnCode message, OtpResponseDto dto) {
        super(message.getMsg());
        this.dto = dto;
    }
}
