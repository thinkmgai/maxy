package com.thinkm.common.util;

import com.thinkm.common.code.ReturnCode;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ValidUtilTest {

    @Test
    void 아이디검증() {
        // pass
        String t1 = "abc123";
        assertTrue(ValidUtil.isValidId(t1));

        // long length (21)
        String t2 = "abcdefghijk1234567890";
        assertFalse(ValidUtil.isValidId(t2));

        // short length (2)
        String t3 = "ab";
        assertFalse(ValidUtil.isValidId(t3));

        // only number
        String t4 = "1234567890";
        assertTrue(ValidUtil.isValidId(t4));

        // only letter
        String t5 = "abcdefghijkl";
        assertTrue(ValidUtil.isValidId(t5));

        // mix number and letter (start with number)
        String t6 = "1234567890abcdefghij";
        assertTrue(ValidUtil.isValidId(t6));

        // UpperCase letter
        String t7 = "1234567890ABCDEFGHIJ";
        assertTrue(ValidUtil.isValidId(t7));
    }

    @Test
    void 유효한비밀번호() {
        // 최소 조건 충족 (8자 이상, 영문+숫자+특수)
        assertEquals(ReturnCode.SUCCESS, ValidUtil.isValidPassword("user1234", "Abceef1!"));
        // 대소문자 조합
        assertEquals(ReturnCode.SUCCESS, ValidUtil.isValidPassword("userid", "QweRty12$"));
        // 특수문자 다양성
        assertEquals(ReturnCode.SUCCESS, ValidUtil.isValidPassword("userid", "GoodPass#9"));
        // 최대 길이(20자) 내에서 정상
        assertEquals(ReturnCode.SUCCESS, ValidUtil.isValidPassword("userid", "Abghi43kl2no#$"));
    }

    @Test
    void 공백또는길이오류() {
        assertEquals(ReturnCode.ERR_EMPTY_PW, ValidUtil.isValidPassword("user", null));
        assertEquals(ReturnCode.ERR_EMPTY_PW, ValidUtil.isValidPassword("user", ""));
        // 너무 짧음
        assertEquals(ReturnCode.ERR_TYPE_PW, ValidUtil.isValidPassword("user", "A1!a"));
        // 너무 김 (21자)
        assertEquals(ReturnCode.ERR_TYPE_PW, ValidUtil.isValidPassword("user", "Abcdefghijklmnopqr12$"));
    }

    @Test
    void 조합요건누락() {
        // 숫자 없음
        assertEquals(ReturnCode.ERR_TYPE_PW, ValidUtil.isValidPassword("user", "Password!"));
        // 영문 없음
        assertEquals(ReturnCode.ERR_TYPE_PW, ValidUtil.isValidPassword("user", "1234567!"));
        // 특수문자 없음
        assertEquals(ReturnCode.ERR_TYPE_PW, ValidUtil.isValidPassword("user", "Password1"));
    }

    @Test
    void 공백포함비밀번호() {
        assertEquals(ReturnCode.ERR_BLANK_PW, ValidUtil.isValidPassword("user", "Pass word1!"));
        assertEquals(ReturnCode.ERR_BLANK_PW, ValidUtil.isValidPassword("user", " Leading1!"));
    }

    @Test
    void 동일문자4개() {
        assertEquals(ReturnCode.ERR_SAMEWORD_PW, ValidUtil.isValidPassword("user", "aaaa123!"));
        assertEquals(ReturnCode.ERR_SAMEWORD_PW, ValidUtil.isValidPassword("user", "1111Abc!"));
        assertEquals(ReturnCode.ERR_SAMEWORD_PW, ValidUtil.isValidPassword("user", "!!!!Abc1"));
    }

    @Test
    void 연속문자검증() {
        // 숫자 오름차순 4자리
        assertEquals(ReturnCode.ERR_CONTIWORD_PW, ValidUtil.isValidPassword("user", "Abc1234!"));
        // 숫자 내림차순 4자리
        assertEquals(ReturnCode.ERR_CONTIWORD_PW, ValidUtil.isValidPassword("user", "Zyx4321!"));
        // 영문 오름차순 4자리
        assertEquals(ReturnCode.ERR_CONTIWORD_PW, ValidUtil.isValidPassword("user", "abcdEF1!"));
        // 영문 내림차순 4자리
        assertEquals(ReturnCode.ERR_CONTIWORD_PW, ValidUtil.isValidPassword("user", "dcba12!Q"));
    }

    @Test
    void 아이디포함검증() {
        // userId 4자 이상이 password에 그대로 포함
        assertEquals(ReturnCode.ERR_CONTAINID_PW, ValidUtil.isValidPassword("maxy", "Goodmaxy1!"));
        assertEquals(ReturnCode.ERR_CONTAINID_PW, ValidUtil.isValidPassword("Heonny", "Testheonny$1"));
    }

    @Test
    void 경계조건검증() {
        // 딱 8자, 규칙 충족
        assertEquals(ReturnCode.SUCCESS, ValidUtil.isValidPassword("user", "Abc1!def"));
        // 딱 20자, 규칙 충족
        assertEquals(ReturnCode.SUCCESS,
                ValidUtil.isValidPassword("user", "Qa1!Wd3@Er5#Tg7$Yh9%")); // 20자
        assertEquals(ReturnCode.SUCCESS,
                ValidUtil.isValidPassword("user", "AbZ1!cdY3@efX5#ghW7$")); // 20자
        // 3자리 연속은 허용, 4자리 연속은 불허
        assertEquals(ReturnCode.SUCCESS, ValidUtil.isValidPassword("user", "Abc123!x"));   // 123까진 허용
        assertEquals(ReturnCode.ERR_CONTIWORD_PW, ValidUtil.isValidPassword("user", "Abc1234!")); // 1234 불허
        // 19자: 통과
        assertEquals(ReturnCode.SUCCESS,
                ValidUtil.isValidPassword("user", "Q1!w3@E5#t7$Y9%kmN"));
        // 21자: 길이 초과로 실패
        assertEquals(ReturnCode.ERR_TYPE_PW,
                ValidUtil.isValidPassword("user", "Q1!w3@E5#t7$Y9%kLNpq2")); // 21자
    }

    @Test
    void 샘플비밀번호검증() {
        String pw1 = "successKolon!1";
        assertEquals(ReturnCode.SUCCESS, ValidUtil.isValidPassword("maxy", pw1));

        String pw2 = "successKolon!123";
        assertEquals(ReturnCode.SUCCESS, ValidUtil.isValidPassword("maxy", pw2));

        String pw3 = "successKolon!1234";
        assertNotEquals(ReturnCode.SUCCESS, ValidUtil.isValidPassword("maxy", pw3));
    }
}
