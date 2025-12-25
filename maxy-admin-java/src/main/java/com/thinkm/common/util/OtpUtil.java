package com.thinkm.common.util;

import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.exception.AuthException;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.binary.Base32;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.time.Instant;

@Slf4j
@Component
public class OtpUtil {
    public String generateSecretKey() {
        byte[] buffer = new byte[10]; // 80비트 = 10바이트
        new SecureRandom().nextBytes(buffer);

        Base32 base32 = new Base32();
        return base32.encodeToString(buffer).replace("=", "");
    }

    public String getOtpAuthURL(String issuer, String accountName, String secret) {
        return String.format("otpauth://totp/%s:%s?secret=%s&issuer=%s", issuer, accountName, secret, issuer);
    }

    public boolean verifyCode(String secret, int code) {
        long timeIndex = Instant.now().getEpochSecond() / 30;
        for (int i = -1; i <= 1; i++) { // 시간 오차 허용
            if (generateCode(secret, timeIndex + i) == code) {
                return true;
            }
        }
        return false;
    }

    private int generateCode(String base32Secret, long timeIndex) {
        Base32 base32 = new Base32();
        byte[] key = base32.decode(base32Secret);

        ByteBuffer buffer = ByteBuffer.allocate(8).putLong(timeIndex);
        byte[] data = buffer.array();

        try {
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key, "HmacSHA1"));
            byte[] hash = mac.doFinal(data);

            int offset = hash[hash.length - 1] & 0xF;
            int binary = ((hash[offset] & 0x7F) << 24) |
                         ((hash[offset + 1] & 0xFF) << 16) |
                         ((hash[offset + 2] & 0xFF) << 8) |
                         (hash[offset + 3] & 0xFF);

            return binary % 1_000_000;
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            throw new AuthException(ReturnCode.ERR_OTP_INVALID);
        }
    }
}
