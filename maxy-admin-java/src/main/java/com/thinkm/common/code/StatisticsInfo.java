package com.thinkm.common.code;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * MAXY 시스템에서 전체적으로 사용할 평균 및 중위값 모음
 */
@Getter
@RequiredArgsConstructor
public enum StatisticsInfo {

    // feeldex 에서 사용할 평균값
    AVG_RESPONSE_TIME("avgResponseTime", "avg-response-time", ElasticIndex.PAGE_LOG.getIndex()),
    AVG_LOADING_TIME("avgLoadingTime", "avg-loading-time", ElasticIndex.PAGE_LOG.getIndex()),

    MED_RESPONSE_TIME("medResponseTime", "med-response-time", ElasticIndex.PAGE_LOG.getIndex()),
    MED_LOADING_TIME("medLoadingTime", "med-loading-time", ElasticIndex.PAGE_LOG.getIndex()),

    AVG_ERROR_COUNT("avgErrorCount", "avg-error-count", ElasticIndex.TROUBLE_LOG.getIndex()),
    AVG_CRASH_COUNT("avgCrashCount", "avg-crash-count", ElasticIndex.TROUBLE_LOG.getIndex()),

    YDA_ERROR_COUNT("ydaErrorCount", "yda-error-count", ElasticIndex.TROUBLE_LOG.getIndex()),
    YDA_CRASH_COUNT("ydaCrashCount", "yda-crash-count", ElasticIndex.TROUBLE_LOG.getIndex()),
    YDA_PV_COUNT("ydaPvCount", "yda-pv-count", ElasticIndex.PAGE_LOG.getIndex()),

    WEEK_ERROR_COUNT("weekErrorCount", "week-error-count", ElasticIndex.TROUBLE_LOG.getIndex()),
    WEEK_CRASH_COUNT("weekCrashCount", "week-crash-count", ElasticIndex.TROUBLE_LOG.getIndex()),
    WEEK_PV_COUNT("weekPvCount", "week-pv-count", ElasticIndex.PAGE_LOG.getIndex()),
    ;

    public static final String redisKey = "statistics";

    private final String key;
    private final String fileName;
    private final String index;

    public static StatisticsInfo fromKey(String key) {
        for (StatisticsInfo value : StatisticsInfo.values()) {
            if (value.key.equals(key)) {
                return value;
            }
        }
        return null;
    }
}
