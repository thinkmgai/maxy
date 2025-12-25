package com.thinkm.maxy.dto.otp;

import com.thinkm.common.code.OtpStatus;
import lombok.Getter;

@Getter
public class OtpResponseDto {
    private final OtpStatus status;
    private final Long issuedAt;
    private final Integer attempts;
    private final Integer maxAttempts;
    private final boolean otp;

    public OtpResponseDto(OtpStatus status, Long issuedAt, Integer attempts, Integer maxAttempts, boolean otp) {
        this.status = status;
        this.issuedAt = issuedAt;
        this.attempts = attempts;
        this.maxAttempts = maxAttempts;
        this.otp = otp;
    }
}
