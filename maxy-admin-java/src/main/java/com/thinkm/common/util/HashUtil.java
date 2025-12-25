package com.thinkm.common.util;

import com.google.common.hash.Hashing;
import lombok.experimental.UtilityClass;

import java.nio.charset.StandardCharsets;

@UtilityClass
public class HashUtil {
    /**
     * 문자열을 long 해시로 변환한다.
     * null 또는 공백 문자열일 경우 null 반환.
     *
     * @param str 입력 문자열
     * @return 해시값 또는 null
     */
    public static Long hash(String str) {
        if (str == null || str.isBlank()) return null;
        return Hashing.murmur3_128()
                .hashString(str, StandardCharsets.UTF_8)
                .asLong();
    }
}
