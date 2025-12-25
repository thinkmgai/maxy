package com.thinkm.common.util;

import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.exception.BadRequestException;
import lombok.extern.slf4j.Slf4j;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@SuppressWarnings("unused")
public class ValidUtil {

    public static void isValidParams(ReturnCode type, Object... params) {
        for (Object param : params) {
            try {
                if (param == null) {
                    throw new BadRequestException(type);
                }
                String s = param.toString();
                if (s.isEmpty() || "null".equalsIgnoreCase(s) || "undefined".equalsIgnoreCase(s)) {
                    throw new BadRequestException(type);
                }
            } catch (Exception e) {
                log.error(e.getMessage(), e);
                throw new BadRequestException(type);
            }
        }
    }

    /**
     * 비밀번호 검증로직
     *
     * @param pPw 비밀번호 문자열
     * @return ReturnCode
     */
    public static ReturnCode isValidPassword(String pPw) {
        final String regex = "^((?=.*\\d)(?=.*[a-zA-Z])(?=.*\\W).{8,20})$";
        final String samePt = "(\\w)\\1\\1\\1";
        final String blankPt = "(\\s)";
        Matcher matcher;

        // 비밀번호 빈값 검사
        if (pPw == null || pPw.isEmpty()) {
            return ReturnCode.ERR_EMPTY_PW;
        }

        pPw = pPw.toUpperCase();

        // 비밀번호에 공백 문자 검축
        matcher = Pattern.compile(blankPt).matcher(pPw);
        if (matcher.find()) {
            return ReturnCode.ERR_BLANK_PW;
        }
        // 비밀번호 정규식 검사
        matcher = Pattern.compile(regex).matcher(pPw);
        if (!matcher.find()) {
            return ReturnCode.ERR_TYPE_PW;
        }
        // strict == true 이면 비밀번호 4개의 같은, 연속된 문자 검증도 포함
        // 비밀번호 같은 문자 4개 검사
        matcher = Pattern.compile(samePt).matcher(pPw);
        if (matcher.find()) {
            return ReturnCode.ERR_SAMEWORD_PW;
        }
        // 비밀번호 연속된 문자 4개 검사
        if (isContinuous(pPw)) {
            return ReturnCode.ERR_CONTIWORD_PW;
        }

        // 검사 통과
        return ReturnCode.SUCCESS;
    }

    /**
     * 비밀번호 검증로직
     *
     * @param pPw 비밀번호 문자열
     * @return ReturnCode
     */
    public static ReturnCode isValidPassword(String userId, String pPw) {
        final String regex = "^((?=.*\\d)(?=.*[a-zA-Z])(?=.*\\W).{8,20})$";
        final String samePt = "(.)\\1{3}"; // 모든 문자 포함
        final String blankPt = "(\\s)";
        Matcher matcher;

        // 비밀번호 빈값 검사
        if (pPw == null || pPw.isEmpty()) {
            return ReturnCode.ERR_EMPTY_PW;
        }

        pPw = pPw.toUpperCase();

        // 비밀번호에 공백 문자 검축
        matcher = Pattern.compile(blankPt).matcher(pPw);
        if (matcher.find()) {
            return ReturnCode.ERR_BLANK_PW;
        }
        // 비밀번호 정규식 검사
        matcher = Pattern.compile(regex).matcher(pPw);
        if (!matcher.find()) {
            return ReturnCode.ERR_TYPE_PW;
        }
        // strict == true 이면 비밀번호 4개의 같은, 연속된 문자 검증도 포함
        // 비밀번호 같은 문자 4개 검사
        matcher = Pattern.compile(samePt).matcher(pPw);
        if (matcher.find()) {
            return ReturnCode.ERR_SAMEWORD_PW;
        }
        // 비밀번호 연속된 문자 4개 검사
        if (isContinuous(pPw)) {
            return ReturnCode.ERR_CONTIWORD_PW;
        }

        //ID(4자리 이상)이 포함되지 않아야 함
        if (userId != null) {
            String id = userId.trim();
            if (id.length() >= 4) {
                String pwLower = pPw.toLowerCase(Locale.ROOT);
                String idLower = id.toLowerCase(Locale.ROOT);

                // 1) ID 전체 포함 금지
                if (pwLower.contains(idLower)) {
                    return ReturnCode.ERR_CONTAINID_PW;
                }

                // 2) ID의 임의 4+자 부분 문자열 포함 금지 (선택)
                for (int len = 4; len <= idLower.length(); len++) {
                    for (int i = 0; i + len <= idLower.length(); i++) {
                        if (pwLower.contains(idLower.substring(i, i + len))) {
                            return ReturnCode.ERR_CONTAINID_PW;
                        }
                    }
                }
            }
        }

        // 검사 통과
        return ReturnCode.SUCCESS;
    }

    /**
     * 3개의 연속된 문자열(123, 321, abc, cba) 체크 메소드
     *
     * @param word String word
     * @return 결과 String
     */
    public static boolean isContinuous(String word) {
        /*
         * 영문/숫자에 대해 오름/내림 연속 run이 minRun 이상 존재하면 true.
         * 특수문자나 다른 문자군을 만나면 run을 끊는다.
         */
        return hasSequentialRun(word, 4); // 4로 정책 일치
    }

    private static boolean hasSequentialRun(String s, int minRun) {
        if (s == null || s.length() < minRun) return false;

        int up = 1;   // 오름 연속 길이
        int down = 1; // 내림 연속 길이
        char prev = 0;
        byte prevType = 0; // 1: digit, 2: alpha

        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            // 영문은 소문자로 정규화
            if (c >= 'A' && c <= 'Z') c = (char) (c - 'A' + 'a');

            byte type;
            if (c >= '0' && c <= '9') type = 1;
            else if (c >= 'a' && c <= 'z') type = 2;
            else {
                // 특수문자 등 만나면 run 끊기
                up = down = 1;
                prev = 0;
                prevType = 0;
                continue;
            }

            if (prev != 0 && type == prevType) {
                if (c == prev + 1) {
                    up++;
                } else {
                    up = 1;
                }
                if (c == prev - 1) {
                    down++;
                } else {
                    down = 1;
                }
                if (up >= minRun || down >= minRun) {
                    return true;
                }
            } else {
                // 문자군이 바뀌면 run 초기화
                up = down = 1;
            }

            prev = c;
            prevType = type;
        }
        return false;
    }

    /**
     * 아이디 빈칸 및 정규식 검사
     *
     * @param pId 아이디
     * @return boolean
     */
    public static boolean isValidId(String pId) {
        final String regex = "^[A-Za-z\\d]{3,20}$";
        final String blankPt = "(\\s)";
        Matcher matcher;

        matcher = Pattern.compile(blankPt).matcher(pId);
        if (!matcher.find()) {
            matcher = Pattern.compile(regex).matcher(pId);
            return matcher.find();
        }
        return false;
    }

    /**
     * 유효한 이메일인지 검증하는 메서드
     *
     * @param pEmail 이메일 문자열
     * @return boolean
     */
    public static boolean isValidEmail(String pEmail) {
        final String regex = "[a-z\\d!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z\\d!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z\\d](?:[a-z\\d-]*[a-z\\d])?\\.)+[a-z\\d](?:[a-z\\d-]*[a-z\\d])?";
        final String blankPt = "(\\s)";
        Matcher matcher;

        boolean resStr = false;

        matcher = Pattern.compile(blankPt).matcher(pEmail);
        if (!matcher.find()) {
            matcher = Pattern.compile(regex).matcher(pEmail);
            if (matcher.find()) {
                resStr = true;
            }
        }
        return resStr;
    }
}
