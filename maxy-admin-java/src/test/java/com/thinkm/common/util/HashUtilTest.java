package com.thinkm.common.util;

import com.google.common.hash.Hashing;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

class HashUtilTest {

    @Test
    void 공백해시는null반환() {
        assertNull(HashUtil.hash(null));
        assertNull(HashUtil.hash(""));
        assertNull(HashUtil.hash("   "));
    }

    @Test
    void Murmur해시일치검증() {
        String input = "maxy-admin-hash";
        long expected = Hashing.murmur3_128()
                .hashString(input, StandardCharsets.UTF_8)
                .asLong();

        assertEquals(expected, HashUtil.hash(input));
    }
}
