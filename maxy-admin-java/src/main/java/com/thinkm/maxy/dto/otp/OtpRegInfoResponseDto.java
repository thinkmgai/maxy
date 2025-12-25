package com.thinkm.maxy.dto.otp;

import com.thinkm.common.code.OtpStatus;
import lombok.Getter;

@Getter
public class OtpRegInfoResponseDto {
    private final OtpStatus status;
    private final boolean otp;

    public OtpRegInfoResponseDto(OtpStatus status, boolean otp) {
        this.status = status;
        this.otp = otp;
    }
}
