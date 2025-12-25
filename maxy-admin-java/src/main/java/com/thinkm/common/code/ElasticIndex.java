package com.thinkm.common.code;

import com.thinkm.common.util.DateUtil;
import com.thinkm.common.util.Elastic;
import com.thinkm.maxy.domain.front.common.RangeSearchCondition;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.Set;

@Getter
@RequiredArgsConstructor
public enum ElasticIndex {

    TOTAL_LOG("maxy_app_total_log_",
            "maxy_app_total_log",
            DateUtil.DATE_PATTERN,
            Elastic.logTm,
            Elastic.intervaltime),
    TROUBLE_LOG("maxy_app_trouble_log_",
            "maxy_app_trouble_log",
            DateUtil.DATE_PATTERN,
            Elastic.logTm,
            Elastic.intervaltime),
    PERF_LOG("maxy_app_webperf_log_",
            "maxy_app_webperf_log",
            DateUtil.DATE_PATTERN,
            Elastic.logTm,
            Elastic.intervaltime),
    VITAL_LOG("maxy_web_vital_",
            "maxy_web_vital",
            DateUtil.DATE_PATTERN,
            Elastic.logTm,
            Elastic.intervaltime),
    NETWORK_LOG("maxy_app_network_log_",
            "maxy_app_network_log",
            DateUtil.DATE_PATTERN,
            Elastic.logTm,
            Elastic.intervaltime),

    ACCESS_HISTORY("maxy_device_access_history_",
            "maxy_device_access_history",
            DateUtil.DATE_PATTERN,
            Elastic.appStartTm,
            Elastic.usingTime),
    PAGE_LOG("maxy_device_page_flow_",
            "maxy_device_page_flow",
            DateUtil.DATE_PATTERN,
            Elastic.pageStartTm,
            Elastic.loadingTime),
    VISIT_LOG("maxy_visit_log_",
            "maxy_visit_log",
            DateUtil.DATE_PATTERN,
            Elastic.logTm,
            Elastic.intervaltime),
    SESSION_LOG("maxy_session_log_",
            "maxy_session_log",
            DateUtil.DATE_PATTERN,
            Elastic.logTm,
            Elastic.intervaltime),

    CCU("maxy_ccu", "maxy_ccu",
            "",
            Elastic.dateTime,
            ""),
    DEVICE_INFO("maxy_device_info",
            "",
            "",
            "",
            ""),
    ACCESS_SUMMARY("maxy_device_access_summary",
            "",
            "",
            "",
            ""),
    TROUBLE_SOLUTION("maxy_app_trouble_solution",
            "maxy_app_trouble_solution",
            "",
            "",
            ""),
    CHK("maxy_chk",
            "maxy_chk",
            "",
            Elastic.regDt,
            "");

    private final String index;
    private final String alias;
    private final String dateType;
    private final String timeColumn;
    private final String durationColumn;

    /**
     * timestamp 범위로부터 인덱스 목록을 생성하는 메서드
     */
    public static String[] getIndicesForDateRange(ElasticIndex index) {
        long timestamp = System.currentTimeMillis();
        return getIndicesForDateRange(index, timestamp, timestamp);
    }

    /**
     * timestamp 범위로부터 인덱스 목록을 생성하는 메서드
     */
    public static String[] getIndicesForDateRange(ElasticIndex index, long timestamp) {
        return getIndicesForDateRange(index, timestamp, timestamp);
    }

    /**
     * RangeSearchCondition의 timestamp 범위로부터 인덱스 목록을 생성하는 메서드
     */
    public static String[] getIndicesForDateRange(ElasticIndex index, RangeSearchCondition rangeSearchCondition) {
        return getIndicesForDateRange(index, rangeSearchCondition.from(), rangeSearchCondition.to());
    }

    /**
     * timestamp 범위로부터 인덱스 목록을 생성하는 메서드
     */
    public static String[] getIndicesForDateRange(ElasticIndex index, long from, long to) {
        // 빈칸이면 index 만 반환한다.
        if ("".equalsIgnoreCase(index.getDateType())) {
            return new String[]{index.getIndex()};
        }

        // index.getDateType(): yyyyMM or yyyyMMdd
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern(index.getDateType());

        // Unix timestamp를 LocalDate로 변환
        LocalDate startDate = Instant.ofEpochMilli(from).atZone(ZoneId.systemDefault()).toLocalDate();
        LocalDate endDate = Instant.ofEpochMilli(to).atZone(ZoneId.systemDefault()).toLocalDate();

        // dateType에 따라 이동 단위 결정
        boolean isMonthly = DateUtil.MONTH_PATTERN.equals(index.getDateType());

        Set<String> indices = new HashSet<>();
        // startDate부터 endDate까지 인덱스 이름을 생성
        while (!startDate.isAfter(endDate)) {
            String dateString = index.getIndex() + startDate.format(formatter); // 인덱스 이름 패턴
            indices.add(dateString);

            // dateType에 따라 다음 날짜 또는 다음 달로 이동
            if (isMonthly) {
                startDate = startDate.plusMonths(1).withDayOfMonth(1); // 다음 달 첫째 날로 이동
            } else {
                startDate = startDate.plusDays(1); // 다음 날로 이동
            }
        }
        return indices.toArray(new String[0]);
    }
}
