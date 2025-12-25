package com.thinkm.common.util;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * 날짜 형식 변환 유틸
 */
@Slf4j
@SuppressWarnings("unused")
public class DateUtil {
    public static final String DATETIME_PATTERN = "yyyyMMddHHmmss";
    public static final String DATETIMEMS_PATTERN = "yyyyMMddHHmmssSSS";
    public static final String DATE_PATTERN = "yyyyMMdd";
    public static final String MONTH_PATTERN = "yyyyMM";
    public static final String DATE_WITH_DASH_PATTERN = "yyyy-MM-dd";
    public static final String DATE_WITH_COLON_PATTERN = "yyyy:MM:dd";
    public static final String UTC_PATTERN = "yyyyMMdd'T'HHmmss'Z'";
    public static final String UTC_PATTERN_MS = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'";
    public static final String GMT_PATTERN = "yyyy-MM-dd'T'HH:mm:ss";
    public static final String DATETIME_WITH_COLON_PATTERN = "yyyy-MM-dd HH:mm:ss";
    public static final String DATETIME_WITH_DASH_PATTERN = "yyyy-MM-dd HH-mm-ss";
    public static final String DATETIME_WITH_MILLISEC_PATTERN = "yyyy-MM-dd HH:mm:ss.SSS";
    public static final String TIME_WITH_MILLISEC_PATTERN = "HH:mm:ss.SSS";
    private static final ZoneId DEFAULT_ZONE = ZoneId.systemDefault();
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern(DATE_WITH_DASH_PATTERN);

    private static final DateTimeFormatter YM_FMT = new DateTimeFormatterBuilder()
            .appendPattern("uuuuMM")
            .toFormatter()
            .withResolverStyle(ResolverStyle.STRICT);

    /**
     * 현재 날짜를 yyyyMMddHHmmss 형식의 문자열로 리턴
     *
     * @return yyyyMMddHHmmss
     */
    public static String format() {
        return format(DATETIME_PATTERN);
    }

    public static String getTodayTime2() {
        return new SimpleDateFormat(DATETIME_PATTERN).format(new Date());
    }

    public static String getIndexMonth() {
        return getIndexMonth(System.currentTimeMillis());
    }

    public static String getIndexMonth(Long timestamp) {
        return new SimpleDateFormat(MONTH_PATTERN).format(new Date(timestamp));
    }

    public static String getIndexDate() {
        return getIndexDate(System.currentTimeMillis());
    }

    public static String getIndexDate(Long timestamp) {
        return format(new Date(timestamp), DATE_PATTERN);
    }

    public static String getFirstDayOfYear(String date) {
        if (date.length() > 4) {
            return date.substring(0, 4) + "0101";
        } else {
            return "";
        }
    }

    public static String getLastDayOfYear(String date) {
        if (date.length() > 4) {
            return date.substring(0, 4) + "1231";
        } else {
            return "";
        }
    }

    /**
     * convert date format
     *
     * @param date       date 문자열
     * @param formatFrom date 에 적용된 format
     * @param formatTo   변경할 format
     * @return 변경된 formatting 된 날짜 문자열
     */
    public static String convertFormat(String date, String formatFrom, String formatTo) {
        try {
            SimpleDateFormat from = new SimpleDateFormat(formatFrom);
            SimpleDateFormat to = new SimpleDateFormat(formatTo);
            Date d = from.parse(date);

            return to.format(d);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return date;
        }
    }

    public static String getFirstWeekOfDay(String date, String pattern) {
        try {
            final SimpleDateFormat sdf = new SimpleDateFormat(pattern);
            Date d = sdf.parse(date);
            Calendar c = Calendar.getInstance();
            c.setTime(d);

            c.set(Calendar.DAY_OF_WEEK, Calendar.SUNDAY);
            return sdf.format(c.getTime());
        } catch (ParseException e) {
            log.error(e.getMessage(), e);
        }
        return "";
    }

    public static String getFirstWeekOfDay(String date) {
        return getFirstWeekOfDay(date, DATE_WITH_DASH_PATTERN);
    }

    public static String getFirstWeekOfDay(long timestamp) {
        String date = timestampToDate(timestamp, DATE_WITH_DASH_PATTERN);
        return getFirstWeekOfDay(date);
    }

    public static String getFirstMonthOfDay(String date, String pattern) {
        try {
            final SimpleDateFormat sdf = new SimpleDateFormat(pattern);
            Date d = sdf.parse(date);
            Calendar c = Calendar.getInstance();
            c.setTime(d);

            c.set(Calendar.DAY_OF_MONTH, 1);
            return sdf.format(c.getTime());
        } catch (ParseException e) {
            log.error(e.getMessage(), e);
        }
        return "";
    }

    public static String getFirstMonthOfDay(String date) {
        return getFirstMonthOfDay(date, DATE_WITH_DASH_PATTERN);
    }

    public static String getFirstMonthOfDay(long timestamp) {
        String date = timestampToDate(timestamp, DATE_WITH_DASH_PATTERN);
        return getFirstMonthOfDay(date);
    }

    /**
     * 현재 날짜를 입력한 패턴 형식의 문자열로 리턴
     *
     * @param pattern 리턴 받을 패턴 형식
     * @return 패턴으로 입력한 형식의 날짜 문자열
     * <pre>
     * {@code}
     * String strDate = DateUtil.format("yyyyMMddHHmmss");
     * </pre>
     */
    public static String format(String pattern) {
        return format(new Date(), pattern);
    }

    /**
     * java.util.Date 형식을 yyyyMMddHHmmss 형식의 날짜 문자열로 리턴
     *
     * @param d java.util.Date 변수
     * @return yyyyMMddHHmmss 형식의 날짜 문자열
     */
    public static String format(Date d) {
        return format(d, DATETIME_PATTERN);
    }

    /**
     * java.util.Date 형식을 입력한 패턴 형식의 날짜 문자열로 리턴
     *
     * @param d       java.util.Date 변수
     * @param pattern 리턴 받을 패턴 형식
     * @return 패턴으로 입력한 형식의 날짜 문자열
     */
    public static String format(Date d, String pattern) {
        if (d == null || StringUtils.isBlank(pattern)) {
            return "";
        }

        SimpleDateFormat f = new SimpleDateFormat(pattern);
        return f.format(d);
    }

    public static String formatUtc() {
        return formatUtc(new Date());
    }

    /**
     * java.util.Date형식을 UTC 날짜 형식 문자열로 리턴
     *
     * @param d java.util.Date 변수
     * @return yyyyMMdd'T'HHmmss'Z' 형식의 날짜 문자열
     * @see #formatGMTtoGeneralDate(String gmtDate)
     */
    public static String formatUtc(Date d) {
        if (d == null) {
            return null;
        }

        SimpleDateFormat f = new SimpleDateFormat(UTC_PATTERN);
        f.setTimeZone(TimeZone.getTimeZone("UTC"));
        return f.format(d);
    }

    /**
     * yyyy-MM-dd'T'HH:mm:ss 형식을  yyyy-MM-dd HH:mm:ss로 변환
     *
     * @param gmtDate GMT 날짜 형식 문자열
     * @return yyyy-MM-dd HH:mm:ss 형식의 날짜 문자열
     * <pre>
     * {@code}
     * 2014-11-11T05:07:31.034+00:00 -> 2014-11-11 14:07:31
     * </pre>
     * @see #formatUtc(Date d)
     */
    public static String formatGMTtoGeneralDate(String gmtDate) {
        SimpleDateFormat formatter = new SimpleDateFormat(GMT_PATTERN);
        formatter.setTimeZone(TimeZone.getTimeZone("GMT"));
        String resDate = null;
        try {
            Date date = formatter.parse(gmtDate);
            SimpleDateFormat outFormatter = new SimpleDateFormat(DATETIME_WITH_COLON_PATTERN);
            resDate = outFormatter.format(date);
        } catch (ParseException e) {
            log.error(e.getMessage(), e);
        }
        return resDate;
    }

    /**
     * yyyy-MM-dd -> "yyyy-MM-dd'T'HH:mm:ss"
     *
     * @param str yyyy-MM-dd
     * @return "yyyy-MM-dd'T'HH:mm:ss"
     */
    public static String generalDateToGMT(String str, boolean start) {
        SimpleDateFormat formatter = new SimpleDateFormat(DATETIME_WITH_COLON_PATTERN);
        formatter.setTimeZone(TimeZone.getTimeZone("GMT"));
        String resDate = null;
        try {
            Calendar calendar = Calendar.getInstance();

            if (!start) {
                str = str + " 23:59:59";
            } else {
                str = str + " 00:00:00";
            }

            calendar.setTime(formatter.parse(str));
            SimpleDateFormat outFormatter = new SimpleDateFormat(GMT_PATTERN);
            resDate = outFormatter.format(calendar.getTime());
        } catch (ParseException e) {
            log.error(e.getMessage(), e);
        }
        return resDate;
    }

    /**
     * UTC/GMT Time (yyyy-MM-dd'T'HH:mm:ss.SSS'Z')-> LocalTime
     */
    public static String formatStrUTCToDateStr(String utcTime) {
        SimpleDateFormat sf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS");
        TimeZone utcZone = TimeZone.getTimeZone("UTC");
        sf.setTimeZone(utcZone);
        String dateTime = "";
        try {
            Date date = sf.parse(utcTime);
            dateTime = sdf.format(date);
        } catch (ParseException e) {
            log.error(e.getMessage(), e);
        }
        return dateTime;
    }


    /**
     * yyyyMMdd 형식의 String 을 LocalDateTime 으로 변환
     *
     * @param date yyyyMMdd
     * @return LocalDateTime
     */
    public static LocalDateTime stringDateToLocalDateTime(String date) {
        return LocalDateTime.of(stringDateToLocalDate(date), LocalDateTime.now().toLocalTime());
    }

    /**
     * yyyyMMdd 형식의 String 을 LocalDate 로 변환
     *
     * @param date yyyyMMdd
     * @return LocalDate
     */
    public static LocalDate stringDateToLocalDate(String date) {
        date = date.substring(0, 8);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern(DATE_PATTERN);
        return LocalDate.parse(date, formatter);
    }

    /**
     * LocalDate 를 yyyyMMdd 형식의 String 으로 변환
     *
     * @param ld LocalDate
     * @return yyyyMMdd
     */
    public static String LocalDateToStringDate(LocalDate ld) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern(DATE_PATTERN);
        return ld.format(formatter);
    }

    /**
     * yyyy-MM-dd HH:mm:ss 형식의 현재 일시 리턴
     *
     * @return yyyy-MM-dd HH:mm:ss
     */
    public static String getTodayTime() {
        return new SimpleDateFormat(DATETIME_WITH_COLON_PATTERN).format(new Date());
    }

    /**
     * 오늘 일자 String 가져오기
     *
     * @return yyyyMMdd
     */
    public static String getToday() {
        return new SimpleDateFormat(DATE_PATTERN).format(new Date());
    }

    public static String getTodayWithDash() {
        return new SimpleDateFormat(DATE_WITH_DASH_PATTERN).format(new Date());
    }

    public static String today() {
        return DATE_FORMATTER.format(LocalDate.now());
    }

    /**
     * 오늘 일자의 년도
     *
     * @return yyyy
     */
    public static String getTodayYear() {
        return getTodayWithDash().split("-")[0];
    }

    /**
     * 오늘 일자의 달
     *
     * @return MM
     */
    public static String getTodayMonth() {
        return getTodayWithDash().split("-")[1];
    }

    /**
     * 오늘 일자의 yyyyMM
     *
     * @return yyyyMM
     */
    public static String getTodayYearMonth() {
        String[] today = getTodayWithDash().split("-");
        return today[0] + today[1];
    }

    /**
     * 오늘 일자의 일
     *
     * @return dd
     */
    public static String getTodayDay() {
        return getTodayWithDash().split("-")[2];
    }

    /**
     * timestamp 를 가져와 [yyyy, mm, dd] 문자 배열을 리턴
     *
     * @param timestamp unix timestamp
     * @return [yyyy, mm, dd]
     */
    public static String[] getTimestampToDateArray(Long timestamp) {
        Date date = new Date(timestamp);
        String strDate = format(date, DATE_WITH_DASH_PATTERN);
        return strDate.split("-");
    }

    /**
     * 어제 일자 String 가져오기
     *
     * @return yyyyMMdd
     */
    public static String getYesterday() {
        Calendar cal = new GregorianCalendar();
        cal.add(Calendar.DATE, -1);
        return new SimpleDateFormat(DATE_PATTERN).format(cal.getTime());
    }

    /**
     * 어제 일자 String 가져오기
     *
     * @return yyyy-MM-dd
     */
    public static String getYesterdayWithDash() {
        Calendar cal = new GregorianCalendar();
        cal.add(Calendar.DATE, -1);
        return new SimpleDateFormat(DATE_WITH_DASH_PATTERN).format(cal.getTime());
    }

    /**
     * 어제 일자의 yyyyMM
     *
     * @return yyyyMM
     */
    public static String getYesterdayYearMonth() {
        String[] yesterday = getYesterdayWithDash().split("-");
        return yesterday[0] + yesterday[1];
    }

    /**
     * i 일 전/후의 일자 가져오기
     *
     * @param i 양수 / 정수
     * @return yyyyMMdd
     */
    public static String getDayByParam(int i) {
        Calendar cal = new GregorianCalendar();
        cal.add(Calendar.DATE, i);
        return new SimpleDateFormat(DATE_PATTERN).format(cal.getTime());
    }

    /**
     * 현재 시간 기준으로 i 일 전/후의 timestamp 가져오기
     *
     * @param i 양수 / 정수
     * @return unix timestamp
     */
    public static long getTimestampByParam(int i) {
        return ZonedDateTime.now(ZoneId.systemDefault())
                .plusDays(i)
                .toInstant()
                .toEpochMilli();
    }

    /**
     * timestamp 기준으로 i 일 전/후의 일자 가져오기
     *
     * @param i         양수 / 정수
     * @param timestamp unix
     * @return yyyyMMdd
     */
    public static String getDayByParam(int i, long timestamp) {
        Calendar cal = new GregorianCalendar();
        cal.setTimeInMillis(timestamp);  // timestamp 기준으로 설정
        cal.add(Calendar.DATE, i);
        return new SimpleDateFormat(DATE_PATTERN).format(cal.getTime());
    }

    /**
     * i 일 전/후의 일자 가져오기
     *
     * @param i 양수 / 정수
     * @return yyyy-MM-dd
     */
    public static String getDayByParamWithDash(int i) {
        Calendar cal = new GregorianCalendar();
        cal.add(Calendar.DATE, i);
        return new SimpleDateFormat(DATE_WITH_DASH_PATTERN).format(cal.getTime());
    }

    /**
     * i 일 전/후의 일자 가져오기
     *
     * @param i 양수 / 정수
     * @return yyyy-MM-dd
     */
    public static String getDayByParam(String date, int i, String pattern) {
        Calendar cal = Calendar.getInstance();
        try {
            cal.setTime(new SimpleDateFormat(pattern).parse(date));
        } catch (ParseException ignore) {
        }
        cal.add(Calendar.DATE, i);
        return new SimpleDateFormat(DATE_WITH_DASH_PATTERN).format(cal.getTime());
    }

    /**
     * yyyy-MM-dd 일자의 시작일시 / 끝 일시를 배열로 리턴
     *
     * @param date yyyy-MM-dd
     * @return {"yyyy-MM-dd 00:00:00.000", "yyyy-MM-dd 23:59:59.999"}
     */
    public static String[] getDatePairWithMillisec(String date) {
        return new String[]{date + " 00:00:00.000", date + " 23:59:59.999"};
    }

    /**
     * yyyy-MM-dd 일자의 시작일시 / 끝 일시를 배열로 리턴
     *
     * @param date yyyy-MM-dd
     * @return {"yyyy-MM-dd 00:00", "yyyy-MM-dd 23:59"}
     */
    public static String[] getDatePairWithMin(String date) {
        return new String[]{date + " 00:00", date + " 23:59"};
    }

    /**
     * yyyy-MM-dd 일자의 시작일시 / 끝 일시를 UTC 포맷의 배열로 리턴
     *
     * @param date yyyy-MM-dd
     * @return {"yyyy-MM-ddT00:00:00.000Z", "yyyy-MM-ddT23:59:59.999Z"}
     */
    public static String[] getUTCDatePairWithMillisec(String date) {
        return new String[]{date + "T00:00:00.000Z", date + "T23:59:59.999Z"};
    }

    /**
     * Long 타입의 Timestamp(unix time)를 pattern 형식으로 리턴
     *
     * @param timestamp unix time
     * @param pattern   date pattern
     * @return yyyyMMddHHmmss
     */
    public static String timestampToDate(Long timestamp, String pattern) {
        if (pattern == null) {
            pattern = DATE_PATTERN;
        }
        return format(new Date(timestamp), pattern);
    }

    /**
     * Long 타입의 Timestamp(unix time)를 yyyyMMddHHmmssSSS 형식으로 리턴
     *
     * @param timestamp unix time
     * @return yyyyMMddHHmmss
     */
    public static String timestampToDate(Long timestamp) {
        return format(new Date(timestamp), DATETIMEMS_PATTERN);
    }

    /**
     * Long 타입의 Timestamp 를 pattern 형식으로 리턴
     *
     * @param timestamp unix time
     * @param pattern   date pattern
     * @return pattern 에 따른 date string
     */
    public static String timestampToDateWithPattern(Object timestamp, String pattern) {
        long ts;
        if (timestamp instanceof Long l) {
            ts = l;
        } else if (timestamp instanceof String str) {
            ts = Long.parseLong(str);
        } else {
            return "WRONG PARAM: " + timestamp;
        }
        return format(new Date(ts), pattern);
    }

    public static long[] todayToTimestamp() {
        long[] result = new long[2];
        result[0] = dateToTimestamp(getToday(), true);
        result[1] = System.currentTimeMillis();
        return result;
    }

    public static long todayToTimestamp(boolean start) {
        return dateToTimestamp(getToday(), start);
    }

    /**
     * yyyy-mm-dd 형식의 일자를 Timestamp 로 반환
     *
     * @param date  yyyy-mm-dd
     * @param start 시작 여부
     * @return timestamp
     */
    public static long dateToTimestamp(String date, Boolean start) {
        date = date.replaceAll("-", "");
        if (start) {
            date = date + " 00:00:00.000";
        } else {
            date = date + " 23:59:59.999";
        }
        try {
            return new SimpleDateFormat("yyyyMMdd HH:mm:ss.SSS")
                    .parse(date)
                    .getTime();
        } catch (ParseException e) {
            return 0L;
        }
    }

    /**
     * from/to 가 속한 날짜의 전체 범위(00:00~23:59:59.999)를 반환한다.
     * - from/to 가 오늘 날짜라면 오늘의 00~23:59:59.999 반환
     * - 오늘이 아니라면 해당 날짜의 00~23:59:59.999 반환
     *
     * @return long[]{startOfDayMillis, endOfDayMillis}
     */
    public static long[] normalizeDayRange(long from, long to) {
        ZoneId zone = ZoneId.systemDefault();

        // epoch milli → LocalDate
        LocalDate fromDate = Instant.ofEpochMilli(from).atZone(zone).toLocalDate();
        LocalDate today = LocalDate.now(zone);

        // 오늘인지 판단
        LocalDate target = fromDate.equals(today) ? today : fromDate;

        // 00:00
        ZonedDateTime start = target.atStartOfDay(zone);

        // 23:59:59.999
        ZonedDateTime end = target.plusDays(1)
                .atStartOfDay(zone)
                .minusNanos(1);

        return new long[]{
                start.toInstant().toEpochMilli(),
                end.toInstant().toEpochMilli()
        };
    }

    /**
     * 오늘 하루(00:00:00.000 ~ 23:59:59.999)의 epoch milli 범위를 반환한다.
     *
     * @return long[]{startOfDayMillis, endOfDayMillis}
     */
    public static long[] todayRangeMillis() {
        ZoneId zoneId = ZoneId.systemDefault();

        // 오늘 날짜
        LocalDate today = LocalDate.now(zoneId);

        // 오늘 00:00:00
        ZonedDateTime startOfDay = today.atStartOfDay(zoneId);

        // 오늘 23:59:59.999
        ZonedDateTime endOfDay = today.plusDays(1)
                .atStartOfDay(zoneId)
                .minusNanos(1);

        return new long[]{
                startOfDay.toInstant().toEpochMilli(),
                endOfDay.toInstant().toEpochMilli()
        };
    }

    public static boolean isTodayRange(long from, long to) {
        long[] today = todayRangeMillis();
        return today[0] == from && today[1] == to;
    }

    public static long[] rangeOrToday(long from, long to) {
        long[] today = todayRangeMillis();
        if (today[0] == from && today[1] == to) {
            return today;
        }
        return new long[]{from, to};
    }

    public static long[] dateToTimestamps() {
        String today = today();
        return dateToTimestamps(today);
    }

    public static long[] dateToTimestamps(String date) {
        try {
            // 입력 파싱
            LocalDate inputDate = LocalDate.parse(date, DATE_FORMATTER);
            LocalDate today = LocalDate.now();

            if (inputDate.isEqual(today)) {
                // 오늘이면 00시 ~ 현재 시각
                LocalDateTime startOfDay = inputDate.atStartOfDay();
                LocalDateTime now = LocalDateTime.now();

                return new long[]{
                        startOfDay.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli(),
                        now.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
                };
            } else {
                // 오늘이 아니면 00시 ~ 23:59:59.999
                LocalDateTime startOfDay = inputDate.atStartOfDay();
                LocalDateTime endOfDay = inputDate.atTime(LocalTime.MAX); // 23:59:59.999999999

                return new long[]{
                        startOfDay.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli(),
                        endOfDay.withNano(999_000_000) // 23:59:59.999
                                .atZone(ZoneId.systemDefault())
                                .toInstant()
                                .toEpochMilli()
                };
            }
        } catch (DateTimeParseException e) {
            // 파싱 실패시
            return new long[]{-1, -1};
        }
    }

    public static long[] dateToTimestampPair() {
        String date = getTodayWithDash();
        return dateToTimestampPair(date);
    }

    /**
     * yyyy-mm-dd 형식의 일자를 Timestamp 로 반환
     *
     * @param date yyyy-mm-dd
     * @return timestamp array
     */
    public static long[] dateToTimestampPair(String date) {
        long[] result = new long[2];
        result[0] = dateToTimestamp(date, true);
        result[1] = dateToTimestamp(date, false);
        return result;
    }

    /**
     * yyyy-MM-dd HH:mm -> timestamp
     *
     * @param datetime yyyy-MM-dd HH:mm -> timestamp
     * @param start    start 유무
     * @return timestamp
     */
    public static long dateTimeToTimestamp(String datetime, Boolean start) {
        datetime = datetime.replaceAll("-", "");
        if (start) {
            datetime = datetime + ":00.000";
        } else {
            datetime = datetime + ":59.999";
        }
        try {
            return new SimpleDateFormat("yyyyMMdd HH:mm:ss.SSS")
                    .parse(datetime)
                    .getTime();
        } catch (ParseException e) {
            return 0L;
        }
    }


    /**
     * date1 이 date2 와 value 만큼 차이나는지 확인
     *
     * @param pattern  비교할 날짜의 포맷
     * @param date1    비교할 날짜
     * @param date2    비교당할 날짜
     * @param value    비교할 시간 값
     * @param dateType 시간 단위
     * @return 차이 여부
     */
    public static boolean isDateAfter(String pattern,
                                      String date1,
                                      String date2,
                                      int value,
                                      DateType dateType
    ) {
        try {
            Calendar cal1 = Calendar.getInstance();
            cal1.setTime(new SimpleDateFormat(pattern).parse(date1));
            Calendar cal2 = Calendar.getInstance();
            cal2.setTime(new SimpleDateFormat(pattern).parse(date2));

            int t;
            switch (dateType) {
                case MS:
                    t = Calendar.MILLISECOND;
                    break;
                case SEC:
                    t = Calendar.SECOND;
                    break;
                case MIN:
                    t = Calendar.MINUTE;
                    break;
                case HOUR:
                    t = Calendar.HOUR;
                    break;
                default:
                    return false;
            }

            cal1.add(t, value);

            return cal1.after(cal2);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * 전일 날짜 가져오기 (yyyy-MM-dd)
     */
    public static String getBeforeday(String baseDate) {

        // 24시간 전의 날짜, 시간, 시간대를

        SimpleDateFormat dtFormat = new SimpleDateFormat("yyyy-MM-dd");

        Calendar cal = Calendar.getInstance();

        try {
            Date dt = dtFormat.parse(baseDate);
            cal.setTime(dt);
            cal.add(Calendar.DATE, -1);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        return dtFormat.format(cal.getTime());
    }

    /**
     * 전일 날짜 가져오기 (yyyyMMdd)
     */
    public static String getBeforedayNoDash(String baseDate) {
        // 24시간 전의 날짜, 시간, 시간대를
        SimpleDateFormat dtFormat = new SimpleDateFormat("yyyyMMdd");

        Calendar cal = Calendar.getInstance();

        try {
            Date dt = dtFormat.parse(baseDate);
            cal.setTime(dt);
            cal.add(Calendar.DATE, -1);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        return dtFormat.format(cal.getTime());
    }

    /**
     * 오늘 여부 판단하여 일시를 now까지 할 것인지, 23시59분999 까지 할 것인지 판단하여 반환
     *
     * @param timestamp timestamp
     * @return 금일 00시00분 ~ now/23시59분 배열
     */
    public static long[] calculateTimestamps(long timestamp) {
        long dayTimestampFrom;
        long dayTimestampTo;

        // 한국 시간대 설정
        ZoneId koreaZoneId = ZoneId.of("Asia/Seoul");

        // 현재 시간
        ZonedDateTime now = ZonedDateTime.now(koreaZoneId);
        LocalDate today = now.toLocalDate();

        // fromDt를 LocalDateTime으로 변환
        ZonedDateTime fromDateTime = ZonedDateTime.ofInstant(Instant.ofEpochMilli(timestamp), koreaZoneId);
        LocalDate fromDate = fromDateTime.toLocalDate();

        if (fromDate.isEqual(today)) {
            // 1. fromDt가 오늘이라면
            // 1.1 dayTimestampFrom: 오늘 일자의 00:00:00.000의 timestamp
            dayTimestampFrom = ZonedDateTime.of(today, LocalTime.MIDNIGHT, koreaZoneId).toInstant().toEpochMilli();
            // 1.2 dayTimestampTo: now timestamp
            dayTimestampTo = now.toInstant().toEpochMilli();
        } else {
            // 2. fromDt가 오늘이 아니라면
            // 2.1 dayTimestampFrom: fromDt 일자의 00:00:00.000의 timestamp
            dayTimestampFrom = ZonedDateTime.of(fromDate, LocalTime.MIDNIGHT, koreaZoneId).toInstant().toEpochMilli();
            // 2.2 dayTimestampTo: fromDt 일자의 23:59:59.999의 timestamp
            dayTimestampTo = ZonedDateTime.of(fromDate, LocalTime.MAX, koreaZoneId).toInstant().toEpochMilli();
        }

        return new long[]{dayTimestampFrom, dayTimestampTo};
    }

    public static long getStartOfDay(Object timestamp) {
        return ZonedDateTime.ofInstant(Instant.ofEpochSecond((long) timestamp), ZoneOffset.UTC)
                .withHour(0).withMinute(0).withSecond(0).toEpochSecond();
    }

    public static long getCurrentHour() {
        return ZonedDateTime.now(ZoneOffset.UTC)
                .withMinute(0).withSecond(0).toEpochSecond();
    }

    public static long findPreviousTime(List<Long> timestamps, long time) {
        return timestamps.stream().filter(t -> t < time).max(Long::compareTo).orElse(-1L);
    }

    public static long findNextTime(List<Long> timestamps, long time) {
        return timestamps.stream().filter(t -> t > time).min(Long::compareTo).orElse(-1L);
    }

    /**
     * 두 timestamp 의 일자가 같은지 여부
     *
     * @param timestamp1 long
     * @param timestamp2 long
     * @return yyyyMMdd 까지 같으면 true
     */
    public static boolean isSameDate(long timestamp1, long timestamp2) {
        // 한국 시간대 설정
        ZoneId koreaZoneId = ZoneId.of("Asia/Seoul");
        // 타임스탬프를 ZonedDateTime으로 변환
        ZonedDateTime dateTime1 = ZonedDateTime.ofInstant(Instant.ofEpochMilli(timestamp1), koreaZoneId);
        ZonedDateTime dateTime2 = ZonedDateTime.ofInstant(Instant.ofEpochMilli(timestamp2), koreaZoneId);

        // ZonedDateTime을 LocalDate로 변환하여 날짜 비교
        LocalDate date1 = dateTime1.toLocalDate();
        LocalDate date2 = dateTime2.toLocalDate();

        return date1.isEqual(date2);
    }

    public static LocalDateTime convert(long timestamp) {
        return LocalDateTime.ofInstant(Instant.ofEpochMilli(timestamp), ZoneId.of("Asia/Seoul"));
    }

    public static List<String> generateDateRange(Long from, Long to, String postfix) {
        // 시간대 지정
        ZoneId zoneId = ZoneId.of(ZoneId.systemDefault().getId());
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMdd");

        // 시작일과 종료일 계산
        LocalDate startDate = Instant.ofEpochMilli(from).atZone(zoneId).toLocalDate();
        LocalDate endDate = Instant.ofEpochMilli(to).atZone(zoneId).toLocalDate();

        // 날짜 범위 리스트 생성
        List<String> dateRange = new ArrayList<>();
        while (!startDate.isAfter(endDate)) {
            dateRange.add(startDate.format(formatter) + postfix);
            startDate = startDate.plusDays(1); // 하루씩 증가
        }

        return dateRange;
    }

    public static List<String> generateTimeArray() {
        // 오늘 날짜의 00:00
        LocalDateTime startTime = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);

        // 현재 시간
        LocalDateTime currentTime = LocalDateTime.now();

        // 결과 배열
        List<String> timeArray = new ArrayList<>();

        // 시간 형식
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMddHHmm");

        // 반복하면서 배열 생성
        while (!startTime.isAfter(currentTime)) {
            timeArray.add(startTime.format(formatter));
            startTime = startTime.plusMinutes(1); // 1분 증가
        }
        return timeArray;
    }

    public static List<String> interpolation(String pattern, String from, String to) {
        LocalDate startDate = LocalDate.parse(from, DateTimeFormatter.ofPattern(pattern));
        LocalDate endDate = LocalDate.parse(to, DateTimeFormatter.ofPattern(pattern));

        List<String> fullDates = new ArrayList<>();
        for (LocalDate d = startDate; !d.isAfter(endDate); d = d.plusDays(1)) {
            fullDates.add(d.format(DateTimeFormatter.ofPattern(pattern)));
        }
        return fullDates;
    }

    /**
     * yyyyMM 구간 보간
     */
    public static List<String> interpolateMonths(String fromYm, String toYm) {
        YearMonth start = YearMonth.parse(fromYm, YM_FMT);
        YearMonth end = YearMonth.parse(toYm, YM_FMT);

        if (start.isAfter(end)) {
            throw new IllegalArgumentException("from > to for months: " + fromYm + " > " + toYm);
        }

        List<String> out = new ArrayList<>();
        YearMonth cur = start;
        while (!cur.isAfter(end)) {
            out.add(cur.format(YM_FMT));
            cur = cur.plusMonths(1);
        }
        return out;
    }

    /**
     * timestamp from ~ to 의 yyyyMMdd 배열을 반환
     *
     * @param from timestamp 첫 날짜
     * @param to   timestamp  마지막 날짜
     * @return [from의 yyyyMMdd, to의 yyyyMMdd]
     */
    public static String[] getBaseDates(Long from, Long to) {
        if (from == null || to == null) {
            throw new IllegalArgumentException("Both 'from' and 'to' timestamps must be provided.");
        }

        if (from > to) {
            throw new IllegalArgumentException("'from' timestamp cannot be after 'to' timestamp.");
        }

        LocalDate fromDate = Instant.ofEpochMilli(from).atZone(ZoneId.systemDefault()).toLocalDate();
        LocalDate toDate = Instant.ofEpochMilli(to).atZone(ZoneId.systemDefault()).toLocalDate();

        return new String[]{
                fromDate.format(DateTimeFormatter.ofPattern(DATE_PATTERN)),
                toDate.format(DateTimeFormatter.ofPattern(DATE_PATTERN))
        };
    }

    /**
     * timestamp from ~ to 의 yyyyMM 배열을 반환
     *
     * @param from timestamp 첫 날짜
     * @param to   timestamp  마지막 날짜
     * @return [from의 yyyyMM, to의 yyyyMM]
     */
    public static String[] getBaseMonths(Long from, Long to) {
        if (from == null || to == null) {
            throw new IllegalArgumentException("Both 'from' and 'to' timestamps must be provided.");
        }

        if (from > to) {
            throw new IllegalArgumentException("'from' timestamp cannot be after 'to' timestamp.");
        }

        LocalDate fromDate = Instant.ofEpochMilli(from).atZone(ZoneId.systemDefault()).toLocalDate();
        LocalDate toDate = Instant.ofEpochMilli(to).atZone(ZoneId.systemDefault()).toLocalDate();

        return new String[]{
                fromDate.format(DateTimeFormatter.ofPattern(MONTH_PATTERN)),
                toDate.format(DateTimeFormatter.ofPattern(MONTH_PATTERN))
        };
    }

    /**
     * 현재 시간 기준으로 N일 00:00:00 ~ 현재 시간의 타임스탬프 범위를 반환
     *
     * @return long[0]: 시작 타임스탬프, long[1]: 종료 타임스탬프
     */
    public static long[] getLastNDaysRange(int days) {
        // 현재 시간
        LocalDateTime now = LocalDateTime.now();

        // N일 후 날짜의 00:00:00
        LocalDateTime from = LocalDate.now().plusDays(days).atStartOfDay();

        long fromTs = from.atZone(DEFAULT_ZONE).toInstant().toEpochMilli();
        long toTs = now.atZone(DEFAULT_ZONE).toInstant().toEpochMilli();

        return new long[]{fromTs, toTs};
    }

    /**
     * 2개의 날짜가 일주일 주기인지 확인
     *
     * @return boolean
     */
    public static boolean isWeeklyInterval(LocalDate date1, LocalDate date2) {
        long daysBetween = Math.abs(ChronoUnit.DAYS.between(date1, date2));
        return daysBetween % 7 == 0;
    }

    /**
     * 2개의 날짜가 [monthInterval]개월 주기인지 확인
     *
     * @param monthInterval
     * @return boolean
     */
    public static boolean isMonthlyInterval(LocalDate date1, LocalDate date2, int monthInterval) {
        if (monthInterval <= 0) throw new IllegalArgumentException("monthInterval은 1 이상이어야 합니다.");

        LocalDate earlier = date1.isBefore(date2) ? date1 : date2;
        LocalDate later = date1.isBefore(date2) ? date2 : date1;

        LocalDate expected = earlier.plusMonths(monthInterval);
        // 주기적으로 반복되는 개념이므로 expected가 계속 later에 도달할 때까지 반복
        while (expected.isBefore(later)) {
            expected = expected.plusMonths(monthInterval);
        }
        return expected.equals(later);
    }

    @Getter
    @RequiredArgsConstructor
    public enum DateType {
        MS("S"),
        SEC("s"),
        MIN("m"),
        HOUR("h");
        private final String value;
    }
}
