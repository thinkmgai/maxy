package com.thinkm.common.util;

import com.thinkm.common.util.DateUtil.DateType;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.*;
import java.util.Date;
import java.util.Arrays;
import java.util.List;
import java.util.TimeZone;

import static org.junit.jupiter.api.Assertions.*;

class DateUtilTest {

    private TimeZone originalTimeZone;

    @BeforeEach
    void setUpTimeZone() {
        originalTimeZone = TimeZone.getDefault();
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Seoul"));
    }

    @AfterEach
    void restoreTimeZone() {
        TimeZone.setDefault(originalTimeZone);
    }

    @Test
    void 포맷과주월헬퍼검증() {
        assertEquals("20231231", DateUtil.convertFormat("2023-12-31", DateUtil.DATE_WITH_DASH_PATTERN, DateUtil.DATE_PATTERN));
        assertEquals("20230101", DateUtil.getFirstDayOfYear("2023-08-15"));
        assertEquals("20231231", DateUtil.getLastDayOfYear("2023-08-15"));

        assertEquals("2023-12-03", DateUtil.getFirstWeekOfDay("2023-12-06"));
        assertEquals("2023-12-01", DateUtil.getFirstMonthOfDay("2023-12-06"));
    }

    @Test
    void UTC와GMT변환검증() {
        ZonedDateTime utcTime = ZonedDateTime.of(2023, 12, 1, 0, 0, 0, 0, ZoneOffset.UTC);
        assertEquals("20231201T000000Z", DateUtil.formatUtc(Date.from(utcTime.toInstant())));

        String general = DateUtil.formatGMTtoGeneralDate("2023-12-01T00:00:00");
        assertEquals("2023-12-01 09:00:00", general);

        assertEquals("2023-12-01T09:00:00", DateUtil.generalDateToGMT("2023-12-01", true));
        assertEquals("2023-12-02T08:59:59", DateUtil.generalDateToGMT("2023-12-01", false));
    }

    @Test
    void 문자열과LocalDate변환() {
        LocalDate date = DateUtil.stringDateToLocalDate("20231225");
        assertEquals(LocalDate.of(2023, 12, 25), date);
        assertEquals("20231225", DateUtil.LocalDateToStringDate(date));
    }

    @Test
    void 날짜쌍생성도우미() {
        String date = "2023-12-05";
        assertArrayEquals(new String[]{date + " 00:00:00.000", date + " 23:59:59.999"}, DateUtil.getDatePairWithMillisec(date));
        assertArrayEquals(new String[]{date + " 00:00", date + " 23:59"}, DateUtil.getDatePairWithMin(date));
        assertArrayEquals(new String[]{date + "T00:00:00.000Z", date + "T23:59:59.999Z"}, DateUtil.getUTCDatePairWithMillisec(date));
    }

    @Test
    void 타임스탬프포맷검증() {
        long ts = LocalDateTime.of(2023, 12, 5, 10, 15, 30)
                .atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
        assertEquals("20231205101530", DateUtil.timestampToDate(ts, DateUtil.DATETIME_PATTERN));
        assertEquals("20231205101530000", DateUtil.timestampToDate(ts));
        assertEquals("2023-12-05", DateUtil.timestampToDateWithPattern(String.valueOf(ts), DateUtil.DATE_WITH_DASH_PATTERN));
        Object unsupported = new Object() {
            @Override
            public String toString() {
                return "foo";
            }
        };
        assertEquals("WRONG PARAM: foo", DateUtil.timestampToDateWithPattern(unsupported, DateUtil.DATE_PATTERN));
    }

    @Test
    void 날짜타임스탬프변형검증() {
        LocalDate date = LocalDate.of(2023, 12, 8);
        ZoneId zone = ZoneId.systemDefault();
        long expectedStart = date.atStartOfDay(zone).toInstant().toEpochMilli();
        long expectedEnd = date.plusDays(1).atStartOfDay(zone).minusNanos(1_000_000).toInstant().toEpochMilli();

        assertEquals(expectedStart, DateUtil.dateToTimestamp("2023-12-08", true));
        assertEquals(expectedEnd, DateUtil.dateToTimestamp("2023-12-08", false));

        long[] pair = DateUtil.dateToTimestampPair("2023-12-08");
        assertEquals(expectedStart, pair[0]);
        assertEquals(expectedEnd, pair[1]);

        long dateTimeStart = DateUtil.dateTimeToTimestamp("2023-12-08 12:30", true);
        long expectedDateTimeStart = date.atTime(12, 30).atZone(zone).toInstant().toEpochMilli();
        assertEquals(expectedDateTimeStart, dateTimeStart);
    }

    @Test
    void 오늘타임스탬프범위() {
        long[] result = DateUtil.todayToTimestamp();
        assertEquals(2, result.length);
        assertTrue(result[0] > 0);
        assertTrue(result[1] >= result[0]);
    }

    @Test
    void 잘못된날짜파싱실패() {
        assertArrayEquals(new long[]{-1, -1}, DateUtil.dateToTimestamps("invalid-date"));
    }

    @Test
    void 날짜비교로직검증() {
        String pattern = "yyyy-MM-dd HH:mm";
        String earlier = "2023-12-08 10:00";
        String later = "2023-12-08 11:00";
        assertFalse(DateUtil.isDateAfter(pattern, earlier, later, 30, DateType.MIN));
        assertTrue(DateUtil.isDateAfter(pattern, earlier, later, 90, DateType.MIN));
    }

    @Test
    void 전일계산도우미() {
        assertEquals("2023-12-04", DateUtil.getBeforeday("2023-12-05"));
        assertEquals("20231204", DateUtil.getBeforedayNoDash("20231205"));
    }

    @Test
    void 동일일자판단과변환() {
        ZonedDateTime first = ZonedDateTime.of(2023, 12, 1, 10, 0, 0, 0, ZoneId.of("Asia/Seoul"));
        ZonedDateTime second = first.plusHours(5);
        assertTrue(DateUtil.isSameDate(first.toInstant().toEpochMilli(), second.toInstant().toEpochMilli()));

        ZonedDateTime third = first.plusDays(1);
        assertFalse(DateUtil.isSameDate(first.toInstant().toEpochMilli(), third.toInstant().toEpochMilli()));

        LocalDateTime converted = DateUtil.convert(first.toInstant().toEpochMilli());
        assertEquals(first.toLocalDateTime(), converted);
    }

    @Test
    void 날짜범위생성과보간() {
        long from = LocalDate.of(2023, 12, 1).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli();
        long to = LocalDate.of(2023, 12, 3).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli();
        List<String> range = DateUtil.generateDateRange(from, to, "-idx");
        assertEquals(List.of("20231201-idx", "20231202-idx", "20231203-idx"), range);

        List<String> interpolation = DateUtil.interpolation(DateUtil.DATE_WITH_DASH_PATTERN, "2023-12-01", "2023-12-03");
        assertEquals(List.of("2023-12-01", "2023-12-02", "2023-12-03"), interpolation);
    }

    @Test
    void 월보간검증() {
        assertEquals(List.of("202301", "202302", "202303"), DateUtil.interpolateMonths("202301", "202303"));
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> DateUtil.interpolateMonths("202304", "202303"));
        assertTrue(ex.getMessage().contains("from > to"));
    }

    @Test
    void 기준일월추출() {
        long from = LocalDate.of(2023, 12, 1).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli();
        long to = LocalDate.of(2024, 1, 5).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli();
        assertArrayEquals(new String[]{"20231201", "20240105"}, DateUtil.getBaseDates(from, to));
        assertArrayEquals(new String[]{"202312", "202401"}, DateUtil.getBaseMonths(from, to));
    }

    @Test
    void 주기계산검증() {
        LocalDate d1 = LocalDate.of(2023, 1, 1);
        LocalDate d2 = LocalDate.of(2023, 1, 8);
        assertTrue(DateUtil.isWeeklyInterval(d1, d2));
        assertFalse(DateUtil.isWeeklyInterval(d1, d2.plusDays(1)));

        LocalDate m1 = LocalDate.of(2023, 1, 1);
        LocalDate m2 = LocalDate.of(2023, 7, 1);
        assertTrue(DateUtil.isMonthlyInterval(m1, m2, 6));
        assertFalse(DateUtil.isMonthlyInterval(m1, m2.plusMonths(1), 6));
    }
}
