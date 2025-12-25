package com.thinkm.common.util;

import com.fasterxml.jackson.core.type.TypeReference;
import lombok.extern.slf4j.Slf4j;

import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.text.DecimalFormat;
import java.text.NumberFormat;
import java.util.*;
import java.util.Map.Entry;

@SuppressWarnings("unused")
@Slf4j
public class CommonUtil {
    private static final TypeReference<Map<String, Object>> MAP_TYPE_REFERENCE = new TypeReference<>() {
    };

    public static String emptyIfNull(String s) {
        return (s == null ? "" : s);
    }

    public static String emptyIfNull(Object obj) {
        return (obj == null ? "" : obj.toString());
    }

    public static Object zeroToNull(Double value) {
        return value == 0 ? null : value;
    }

    public static String convertMem(String type, Object val) {
        try {
            double result;
            if (CommonUtil.isEmpty(val) || val.equals(0)) {
                return "0MB";
            }
            double numericVal = Double.parseDouble(val.toString());

            if (Double.isNaN(numericVal)) {
                return "0MB";
            }
            return switch (type.toLowerCase()) {
                case "kb" -> {
                    result = numericVal / 1024;
                    yield String.format("%.1fMB", result);
                }
                case "mb" -> {
                    result = numericVal / 1024;
                    yield String.format("%.1fGB", result);
                }
                default -> "0GB";
            };
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return "0GB";
        }
    }

    /**
     * 네트워크 타입 코드를 문자열로 변환하는 함수
     * util.js의 convertComType 함수를 Java로 구현
     *
     * @param val 네트워크 타입 코드 (숫자)
     * @return 네트워크 타입 문자열 (WiFi, 2G, 3G, LTE, 5G, ETC)
     */
    public static String convertComType(Object val) {
        try {
            if (CommonUtil.isEmpty(val)) {
                return "ETC";
            }

            int numVal = Integer.parseInt(val.toString());

            return switch (numVal) {
                case 1 -> "WiFi";
                case 2 -> "2G";
                case 3 -> "3G";
                case 4 -> "LTE";
                case 5 -> "5G";
                case 9, 0, -1 -> "ETC";
                default -> "ETC";
            };
        } catch (NumberFormatException e) {
            log.error("convertComType 변환 오류: {}", e.getMessage());
            return "ETC";
        }
    }

    public static String formatNumber(NumberFormat numberFormat, Object value) {
        if (value == null) {
            return "0"; // 기본값 설정 (예: "0" 또는 "" 원하는 값으로 변경 가능)
        }

        if (value instanceof Number) {
            return numberFormat.format(value);
        }

        try {
            return numberFormat.format(Double.parseDouble(value.toString()));
        } catch (Exception e) {
            return "0"; // 변환 실패 시 기본값 반환
        }
    }

    // 안전한 `BigDecimal` 변환 메서드
    public static BigDecimal getBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO; // 기본값 설정
        }

        if (value instanceof BigDecimal) {
            return (BigDecimal) value;
        }

        try {
            return new BigDecimal(value.toString());
        } catch (Exception e) {
            return BigDecimal.ZERO; // 변환 실패 시 기본값 반환
        }
    }

    /**
     * 랜덤 문자열 생성 (특수문자 포함)
     *
     * @param length 문자열 길이
     * @return 랜덤 문자열
     */
    public static String makeRandomStr(int length) {
        char[] pwCollectionSpCha = new char[]{
                '!', '@', '#', '$', '%', '^', '*'
        };
        char[] pwCollectionNum = new char[]{
                '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'
        };
        char[] pwCollectionAll = new char[]{
                '1', '2', '3', '4', '5',
                '6', '7', '8', '9', '0',
                'A', 'B', 'C', 'D', 'E',
                'F', 'G', 'H', 'I', 'J',
                'K', 'L', 'M', 'N', 'O',
                'P', 'Q', 'R', 'S', 'T',
                'U', 'V', 'W', 'X', 'Y', 'Z',
//        'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v',
//        'w', 'x', 'y', 'z',
                '!', '@', '#', '$', '%', '^', '*'
        };
        return getRandPw(1, pwCollectionSpCha)
               + getRandPw(length - 2, pwCollectionAll)
               + getRandPw(1, pwCollectionNum);
    }

    // makeRandomStr Helper
    private static String getRandPw(int size, char[] pwCollection) {
        StringBuilder ranPw = new StringBuilder();
        for (int i = 0; i < size; i++) {
            int selectRandomPw = (int) (Math.random() * (pwCollection.length));
            ranPw.append(pwCollection[selectRandomPw]);
        }
        return ranPw.toString();
    }

    // 오늘로부터 7일 전 까지 day 목록 구하기
    public static Map<String, Long> validDay(Map<String, Long> param) {
        List<String> days = new ArrayList<>();
        for (int i = -6; i <= 0; i++) {
            days.add(DateUtil.getDayByParam(i));
        }

        // 빈값 있으면 채워넣음
        for (String day : days) {
            param.putIfAbsent(day, 0L);
        }

        // 차집합 제거
        List<String> keys = new ArrayList<>(param.keySet());
        keys.removeAll(days);
        for (String diff : keys) {
            param.remove(diff);
        }

        // sort
        return sortMapByKey(param);
    }

    private static LinkedHashMap<String, Long> sortMapByKey(Map<String, Long> map) {
        List<Map.Entry<String, Long>> entries = new LinkedList<>(map.entrySet());
        entries.sort(Entry.comparingByKey());

        LinkedHashMap<String, Long> result = new LinkedHashMap<>();
        for (Map.Entry<String, Long> entry : entries) {
            result.put(entry.getKey(), entry.getValue());
        }
        return result;
    }

    public static List<Integer> findIndexes(String word, String document) {
        List<Integer> indexList = new ArrayList<>();
        int index = document.indexOf(word);

        while (index != -1) {
            indexList.add(index);
            index = document.indexOf(word, index + word.length());
        }

        return indexList;
    }

    /**
     * replace
     * `&amp; &apos; &quot; &lt; &gt;` => `& ' " < >`
     *
     * @param str 특수문자가 포함된 문자열
     * @return HTML 코드가 특수문자로 치환된 문자열
     */
    public static String convertHTMLCode(String str) {
        str = str.replaceAll("&amp;", "&");
        str = str.replaceAll("&apos;", "'");
        str = str.replaceAll("&quot;", "\"");
        str = str.replaceAll("&lt;", "<");
        str = str.replaceAll("&gt;", ">");

        return str;
    }

    public static int feeldex(Long standard, long time) {
        if (standard == null) {
            return 4;
        }
        if (time <= standard * 0.6) {
            return 0;
        } else if (time <= standard * 0.8) {
            return 1;
        } else if (time <= standard * 1.0) {
            return 2;
        } else if (time <= standard * 1.2) {
            return 3;
        } else {
            return 4;
        }
    }

    /**
     * 로딩 시간과 비교 기준을 이용해 Feeldex를 계산하여 맵에 추가한다.
     */
    public static void putFeelDex(String type, Map<String, Long> avgMap, Map<String, Object> map) {
        if (map == null || map.isEmpty()) {
            return;
        }
        if (avgMap == null || avgMap.isEmpty()) {
            map.put("feeldex", 4);
            return;
        }
        int loadingTime = toInteger(map.get(type));
        long standard = avgMap.getOrDefault("A", 0L);
        int feeldex = feeldex(standard, loadingTime);
        map.put("feeldex", feeldex);
    }

    public static String convertEscapeAndLine(String str) {
        if (str == null || str.isEmpty()) {
            return "";
        }

        str = str.replaceAll("\"", "\"\"");
        str = str.replaceAll("\n", "").replaceAll("\r", "");

        return "\"" + str + "\"";
    }

    /**
     * 현재 날짜 기반으로 한 Copyright 문자열 반환
     *
     * @return Copyright 문자열 반환
     */
    public static String getCopyright() {
        return "Copyright " + Calendar.getInstance().get(Calendar.YEAR) + " THINKM Inc. All right reserved.";
    }

    // 특정 텍스트 마스킹 처리 (예: 이름 중간 글자를 '*'로 마스킹)
    public static String maskString(String text, int start, int end) {
        if (text == null || text.length() < end || start >= end) {
            return text;
        }

        // 마스킹 전 앞부분
        // 마스킹 처리
        // 마스킹 후 뒷부분
        return text.substring(0, start) +  // 마스킹 전 앞부분
               "*".repeat(Math.max(0, end - start)) +  // 마스킹 처리
               text.substring(end);
    }

    public static String maskUserId(String userId, boolean userIdMasking, int start) {
        if (userIdMasking) {
            if (userId != null && !userId.isBlank()) {
                if (userId.length() > start) {
                    return CommonUtil.maskString(userId, start, userId.length());
                }
            } else {
                return "-";
            }
        }
        return userId;
    }

    public static void maskUserId(List<Map<String, Object>> sourceList, boolean userIdMasking, int start) {
        if (userIdMasking) {
            for (Map<String, Object> map : sourceList) {
                String userId = (String) map.get("userId");
                if (userId != null)
                    map.put("userId", CommonUtil.maskString(userId, start, userId.length()));
                else map.put("userId", "-");
            }
        }
    }

    public static boolean isValidString(String v) {
        return null != v && !v.trim().isEmpty();
    }


    public static void writeCsvFile(HttpServletResponse response,
                                    StringBuilder sb,
                                    OutputStream outputStream,
                                    String fileName,
                                    String userAgent) throws IOException {
        response.setContentType("text/csv");
        response.setHeader("Content-type", "text/csv; charset=UTF-8");
        response.setHeader("Content-Disposition", "attachment; filename=" + fileName);

        if (userAgent.contains("Macintosh")) {
            outputStream.write(sb.toString().getBytes(StandardCharsets.UTF_8));
        } else {
            outputStream.write(sb.toString().getBytes("euc-kr"));
        }
        outputStream.flush();
        sb.setLength(0);
    }

    /**
     * 밀리초(ms)를 사람이 읽을 수 있는 형식으로 변환합니다.
     *
     * @param ms               변환할 시간 (밀리초)
     *                         - null이거나 음수이면 "0ms" 반환
     * @param decimalPrecision 초 단위 변환 시 소수점 포함 여부
     *                         - true: 초 단위를 소수점 둘째 자리까지 표시 (예: "0.75s")
     *                         - false: 초 단위를 반올림하여 정수로 표시 (예: "1s")
     * @param isPopup          최대 단위를 초까지만 표시할지 여부
     *                         - true: 초까지만 표시 (예: "750ms", "3s")
     *                         - false: 분(m) 및 시간(h)까지 변환 가능
     * @param isDetail         분 단위에서 초까지 상세 표시할지 여부
     *                         - true: 분과 초를 함께 표시 (예: "1m 5s")
     *                         - false: 분 단위만 표시 (예: "2m")
     * @return 변환된 시간 문자열
     */
    public static String convertTime(Long ms, boolean decimalPrecision, boolean isPopup, boolean isDetail) {
        if (ms == null || ms < 0) return "0ms";

        final long SEC = 1000, MIN = 60 * SEC, HOUR = 60 * MIN;
        DecimalFormat df = new DecimalFormat("#.##");
        NumberFormat nf = NumberFormat.getInstance();

        if (ms < SEC) return ms + "ms";
        if (isPopup) return ms < MIN ? nf.format(ms) + "ms" : format(ms, SEC, "s", decimalPrecision, nf, df);
        if (ms < MIN) return format(ms, SEC, "s", decimalPrecision, nf, df);
        if (ms < HOUR) return isDetail ? (ms / MIN) + "m " + ((ms % MIN) / SEC) + "s" : (ms / MIN) + "m";
        return (ms / HOUR) + "h";
    }

    /**
     * 주어진 시간을 특정 단위로 변환하여 문자열로 반환합니다.
     *
     * @param ms               변환할 시간 (밀리초)
     * @param unit             변환할 단위 (예: 초(SEC), 분(MIN))
     * @param suffix           변환된 시간의 접미사 (예: "s", "m")
     * @param decimalPrecision 소수점 포함 여부
     * @param nf               정수 포맷을 위한 NumberFormat 객체
     * @param df               소수점 포맷을 위한 DecimalFormat 객체
     * @return 변환된 시간 문자열
     */
    private static String format(long ms, long unit, String suffix, boolean decimalPrecision, NumberFormat nf, DecimalFormat df) {
        return decimalPrecision ? df.format(ms / (double) unit) + suffix : nf.format(ms / unit) + suffix;
    }

    public static int interpolate(int v1, int v2, double ratio) {
        return (int) Math.round(v1 + (v2 - v1) * ratio);
    }

    public static int longToInt(long val) {
        return Long.valueOf(val).intValue();
    }

    public static BigDecimal toBigDecimal(Object newValObj) {
        // null → 0
        if (newValObj == null) {
            return BigDecimal.ZERO;
        }

        // 이미 BigDecimal이면 그대로 반환
        if (newValObj instanceof BigDecimal bd) {
            return bd;
        }

        // Number 계열(Integer, Long, Double 등)
        if (newValObj instanceof Number n) {
            try {
                return new BigDecimal(n.toString());
            } catch (NumberFormatException e) {
                return BigDecimal.ZERO;
            }
        }

        // Boolean 처리: true = 1, false = 0
        if (newValObj instanceof Boolean b) {
            return b ? BigDecimal.ONE : BigDecimal.ZERO;
        }

        // 문자 기반 처리
        String s = newValObj.toString().trim();

        // 빈 문자열 → 0
        if (s.isEmpty()) {
            return BigDecimal.ZERO;
        }

        // 콤마 제거 "1,234.56" → "1234.56"
        s = s.replace(",", "");

        // 숫자 패턴 확인
        // 정수 또는 소수 (앞뒤 공백 제거됨)
        if (!s.matches("^-?\\d+(\\.\\d+)?$")) {
            return BigDecimal.ZERO;
        }

        try {
            return new BigDecimal(s);
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }

    public static long toLong(Object newValObj) {
        long newVal = 0;
        try {
            if (newValObj == null) {
                return 0;
            }

            if (newValObj instanceof Long l) {
                newVal = l;
            } else if (newValObj instanceof Integer i) {
                newVal = i.longValue();
            } else if (newValObj instanceof Double d) {
                if (!Double.isNaN(d) && !Double.isInfinite(d)) {
                    newVal = d.longValue();
                }
            } else if (newValObj instanceof String s) {
                newVal = Long.parseLong(s);
            } else {
                log.error("Unsupported type: {}, value: {}", newValObj.getClass(), newValObj);
            }
        } catch (Exception e) {
            log.error("Parse Error: {}", newValObj);
        }
        return newVal;
    }

    /**
     * Double 으로 변환
     *
     * @param o Object
     * @return double (if exception: 0d)
     */
    public static double toDouble(Object o) {
        try {
            if (o == null) return 0d;

            double d;
            if (o instanceof Number) {
                d = ((Number) o).doubleValue();
            } else {
                String str = o.toString().trim();
                if (str.isEmpty()) return 0d;
                d = Double.parseDouble(str);
            }

            return (Double.isNaN(d) || Double.isInfinite(d)) ? 0d : d;

        } catch (Exception e) {
            return 0d;
        }
    }

    /**
     * Double 으로 변환 (지정된 소수점 자리수까지 반올림)
     *
     * @param o     Object
     * @param scale 소수점 자리수 (0 이상)
     * @return double (if exception: 0d)
     */
    public static double toDouble(Object o, int scale) {
        double value = toDouble(o);
        if (value == 0d || scale < 0) return value;

        try {
            BigDecimal bd = BigDecimal.valueOf(value);
            bd = bd.setScale(scale, RoundingMode.HALF_UP);
            return bd.doubleValue();
        } catch (Exception e) {
            return value;
        }
    }


    /**
     * Object를 Integer로 변환한다.
     * - null이면 null 반환
     * - Number 타입이면 intValue 반환
     * - 문자열이면 parseInt 시도 (실패 시 null 반환)
     */
    public static Integer toInteger(Object obj) {
        if (obj == null) {
            return null;
        }

        if (obj instanceof Integer i) {
            return i;
        }

        if (obj instanceof Number n) {
            return n.intValue();
        }

        if (obj instanceof CharSequence cs) {
            String s = cs.toString().trim();
            if (s.isEmpty()) {
                return null;
            }
            try {
                return Integer.parseInt(s);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }

        // 그 외 타입은 toString 후 파싱
        try {
            return Integer.parseInt(obj.toString().trim());
        } catch (Exception e) {
            return null;
        }
    }

    // record 또는 DTO를 Map으로 변환하는 유틸
    public static Map<String, Object> convertDtoToMap(Object dto) {
        return JsonUtil.convertValue(dto, MAP_TYPE_REFERENCE);
    }

    public static String trimNull(String s) {
        return s == null ? "" : s.trim();
    }

    public static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    public static String nvl(String s) {
        return s == null ? "" : s;
    }

    /**
     * NaN/Infinity 방지용 보정.
     */
    public static double toFinite(double v) {
        if (Double.isNaN(v) || Double.isInfinite(v)) {
            return 0d;
        }
        return v;
    }

    public static boolean isEmpty(Object val) {
        return val == null || val.toString().trim().isEmpty();
    }

    /**
     * mode가 front/all 이면 front: true
     */
    public static boolean isFront(String mode) {
        return "front".equalsIgnoreCase(mode) || "all".equalsIgnoreCase(mode);
    }
}
