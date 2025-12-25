package com.thinkm.common.util;

import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.exception.BadRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.security.NoSuchAlgorithmException;

import static org.junit.jupiter.api.Assertions.*;

class SecurityUtilTest {

    private SecurityUtil securityUtil;

    @BeforeEach
    void setUp() throws Exception {
        securityUtil = new SecurityUtil();
        Field keyField = SecurityUtil.class.getDeclaredField("KEY");
        keyField.setAccessible(true);
        keyField.set(securityUtil, "0123456789abcdef");
    }

    @Test
    void SHA256은안정적인해시를생성() throws NoSuchAlgorithmException {
        assertEquals("19748b5328ee4d960ff62db9c15e0e0b9d100e1ead1e9edc38386ba75f3910f4",
                SecurityUtil.SHA256Encrypt("maxy"));
    }

    @Test
    void 초기비밀번호생성과검증() {
        assertEquals("abc1215!@", SecurityUtil.makeResetPw("abcd1234", "20231215"));
        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> SecurityUtil.makeResetPw("ab", "2023"));
        assertEquals(ReturnCode.ERR_WRONG_PARAMS.getMsg(), ex.getMessage());
    }

    @Test
    void AES암복호화왕복() throws Exception {
        String secret = "maxy-secret";
        String encrypted = securityUtil.AES128Encrypt(secret);
        assertNotEquals(secret, encrypted);
        assertEquals(secret, securityUtil.AES128Decrypt(encrypted));
    }

    @Test
    void AES빈문자열처리() throws Exception {
        assertEquals("", securityUtil.AES128Encrypt(""));
        assertEquals("", securityUtil.AES128Decrypt(""));
    }
}
