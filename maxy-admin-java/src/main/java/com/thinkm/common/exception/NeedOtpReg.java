package com.thinkm.common.exception;

import com.thinkm.common.code.OtpStatus;
import com.thinkm.common.code.ReturnCode;
import com.thinkm.maxy.dto.otp.OtpRegInfoResponseDto;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

@Getter
@Slf4j
public class NeedOtpReg extends RuntimeException {
    private final OtpRegInfoResponseDto dto;
    private final OtpStatus status;

    public NeedOtpReg(ReturnCode message, OtpRegInfoResponseDto dto) {
        super(message.getMsg());
        this.dto = dto;
        this.status = OtpStatus.NEED_REGISTER;
    }
}