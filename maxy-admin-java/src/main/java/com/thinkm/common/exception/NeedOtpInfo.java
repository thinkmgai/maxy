package com.thinkm.common.exception;

import com.thinkm.common.code.OtpStatus;
import com.thinkm.common.code.ReturnCode;
import com.thinkm.maxy.dto.otp.OtpResponseDto;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

@Getter
@Slf4j
public class NeedOtpInfo extends RuntimeException {
    private final OtpResponseDto dto;
    private final OtpStatus status;

    public NeedOtpInfo(ReturnCode message, OtpResponseDto dto) {
        super(message.getMsg());
        this.dto = dto;
        this.status = OtpStatus.NEED_VERIFY;
    }
}