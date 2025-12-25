package com.thinkm.common.util;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.NumberFormat;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class CommonUtilTest {

    @Test
    void 기본Null처리() {
        assertEquals("", CommonUtil.emptyIfNull((String) null));
        assertEquals("value", CommonUtil.emptyIfNull("value"));
        assertEquals("", CommonUtil.emptyIfNull((Object) null));
        assertEquals("123", CommonUtil.emptyIfNull(123));
        assertNull(CommonUtil.zeroToNull(0d));
        assertEquals(3.2d, CommonUtil.zeroToNull(3.2d));
    }

    @Test
    void 메모리단위변환() {
        assertEquals("0MB", CommonUtil.convertMem("kb", null));
        assertEquals("0MB", CommonUtil.convertMem("kb", "NaN"));
        assertEquals("1.0MB", CommonUtil.convertMem("kb", "1024"));
        assertEquals("2.0GB", CommonUtil.convertMem("mb", 2048));
        assertEquals("0GB", CommonUtil.convertMem("unknown", 10));
    }

    @Test
    void 통신타입코드매핑() {
        assertEquals("WiFi", CommonUtil.convertComType(1));
        assertEquals("2G", CommonUtil.convertComType(2));
        assertEquals("5G", CommonUtil.convertComType("5"));
        assertEquals("ETC", CommonUtil.convertComType(null));
        assertEquals("ETC", CommonUtil.convertComType("abc"));
    }

    @Test
    void 숫자포맷과BigDecimal() {
        NumberFormat nf = new DecimalFormat("#,###");
        assertEquals("0", CommonUtil.formatNumber(nf, null));
        assertEquals("1,000", CommonUtil.formatNumber(nf, 1000));
        assertEquals("2,500", CommonUtil.formatNumber(nf, "2500"));

        assertEquals(new BigDecimal("1234.50"), CommonUtil.getBigDecimal("1234.50"));
        assertEquals(BigDecimal.ZERO, CommonUtil.getBigDecimal("NaN"));
    }

    @Test
    void 랜덤문자열생성규칙() {
        String generated = CommonUtil.makeRandomStr(8);
        assertEquals(8, generated.length());
        assertTrue("!@#$%^*".indexOf(generated.charAt(0)) >= 0);
        assertTrue(Character.isDigit(generated.charAt(generated.length() - 1)));
    }

    @Test
    void 문자열인덱스와HTML치환() {
        assertEquals(List.of(0, 5), CommonUtil.findIndexes("max", "maxy-max-tool"));
        assertEquals("Tom & Jerry <3>", CommonUtil.convertHTMLCode("Tom &amp; Jerry &lt;3&gt;"));
    }

    @Test
    void 느낌지수계산() {
        assertEquals(4, CommonUtil.feeldex(null, 100));
        assertEquals(0, CommonUtil.feeldex(1000L, 500));
        assertEquals(2, CommonUtil.feeldex(1000L, 1000));
        assertEquals(4, CommonUtil.feeldex(1000L, 2000));

        Map<String, Long> avgMap = Map.of("A", 1000L);
        Map<String, Object> target = new HashMap<>();
        target.put("loadTime", 800);
        CommonUtil.putFeelDex("loadTime", avgMap, target);
        assertEquals(1, target.get("feeldex"));
    }

    @Test
    void 이스케이프와마스킹() {
        assertEquals("\"hello\"\"world\"",
                CommonUtil.convertEscapeAndLine("hello\"world"));
        assertEquals("user****", CommonUtil.maskString("userabcd", 4, 8));
        assertEquals("user", CommonUtil.maskUserId("user", false, 2));
        assertEquals("us**", CommonUtil.maskUserId("user", true, 2));

        Map<String, Object> row1 = new HashMap<>();
        row1.put("userId", "tester");
        Map<String, Object> row2 = new HashMap<>();
        row2.put("userId", null);
        List<Map<String, Object>> rows = new ArrayList<>(List.of(row1, row2));
        CommonUtil.maskUserId(rows, true, 2);
        assertEquals("te****", rows.get(0).get("userId"));
        assertEquals("-", rows.get(1).get("userId"));
    }

    @Test
    void 시간단위변환() {
        assertEquals("500ms", CommonUtil.convertTime(500L, true, true, false));
        assertEquals("1s", CommonUtil.convertTime(1200L, false, false, false));
        assertEquals("1.5s", CommonUtil.convertTime(1500L, true, false, false));
        assertEquals("2m", CommonUtil.convertTime(120_000L, false, false, false));
        assertEquals("1m 5s", CommonUtil.convertTime(65_000L, false, false, true));
        assertEquals("1h", CommonUtil.convertTime(3_700_000L, false, false, false));
    }

    @Test
    void 숫자형변환모음() {
        assertEquals(10, CommonUtil.interpolate(0, 20, 0.5));
        assertEquals(5, CommonUtil.longToInt(5L));
        assertEquals(new BigDecimal("123.45"), CommonUtil.toBigDecimal("123.45"));
        assertEquals(BigDecimal.ZERO, CommonUtil.toBigDecimal("abc"));

        assertEquals(42L, CommonUtil.toLong(42L));
        assertEquals(5L, CommonUtil.toLong(5.9d));
        assertEquals(10L, CommonUtil.toLong("10"));
        assertEquals(0L, CommonUtil.toLong("NaN"));

        assertEquals(3.2d, CommonUtil.toDouble("3.2"), 0.0001);
        assertEquals(0d, CommonUtil.toDouble("abc"));
        assertEquals(3.33d, CommonUtil.toDouble("3.333", 2), 0.0001);

        assertEquals(Integer.valueOf(7), CommonUtil.toInteger("7"));
        assertNull(CommonUtil.toInteger("abc"));
        assertNull(CommonUtil.toInteger(null));
    }

    @Test
    void DTO변환과문자열처리() {
        SampleDto dto = new SampleDto("alpha", 3);
        Map<String, Object> map = CommonUtil.convertDtoToMap(dto);
        assertEquals("alpha", map.get("name"));
        assertEquals(3, map.get("value"));

        assertEquals("text", CommonUtil.trimNull(" text "));
        assertEquals("", CommonUtil.trimNull(null));
        assertTrue(CommonUtil.isBlank(" "));
        assertFalse(CommonUtil.isBlank("text"));
        assertEquals("fallback", CommonUtil.nvl("fallback"));
        assertEquals("", CommonUtil.nvl(null));
        assertEquals(0d, CommonUtil.toFinite(Double.POSITIVE_INFINITY));
        assertEquals("Copyright " + Calendar.getInstance().get(Calendar.YEAR)
                + " THINKM Inc. All right reserved.", CommonUtil.getCopyright());
    }

    @Test
    void 문자열도우미검증() {
        assertTrue(CommonUtil.isValidString("value"));
        assertFalse(CommonUtil.isValidString(" "));
        assertTrue(CommonUtil.isEmpty(""));
        assertTrue(CommonUtil.isEmpty(null));
        assertTrue(CommonUtil.isFront("front"));
        assertTrue(CommonUtil.isFront("ALL"));
        assertFalse(CommonUtil.isFront("back"));
    }

    private record SampleDto(String name, int value) {
    }
}
