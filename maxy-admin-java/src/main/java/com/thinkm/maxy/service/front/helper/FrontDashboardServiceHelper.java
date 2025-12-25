package com.thinkm.maxy.service.front.helper;

import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.Elastic;
import com.thinkm.maxy.dto.front.common.TimeSeriesChart;
import com.thinkm.maxy.dto.front.dashboard.session.SessionDetailResponseDto;
import com.thinkm.maxy.dto.front.dashboard.user.UserListResponseDto;
import lombok.extern.slf4j.Slf4j;
import org.apache.lucene.search.TotalHits;
import org.opensearch.action.search.SearchResponse;
import org.opensearch.search.SearchHit;
import org.opensearch.search.aggregations.Aggregations;
import org.opensearch.search.aggregations.bucket.filter.ParsedFilter;
import org.opensearch.search.aggregations.bucket.histogram.Histogram;
import org.opensearch.search.aggregations.bucket.histogram.ParsedDateHistogram;
import org.opensearch.search.aggregations.metrics.ParsedAvg;

import java.util.ArrayList;
import java.util.List;

/**
 * FrontDashboardService에서 사용하는 응답 파싱 로직을 모아둔 헬퍼 클래스입니다.
 * OpenSearch/SearchResponse를 가공해 화면에서 사용하는 DTO로 변환합니다.
 */
@Slf4j
public class FrontDashboardServiceHelper {

    /**
     * 시계열 차트 응답을 파싱한다.
     *
     * @param response OpenSearch 검색 결과
     * @return 시계열 차트 DTO
     */
    public static TimeSeriesChart parseTimeSeriesChartData(SearchResponse response) {
        TimeSeriesChart chartData = new TimeSeriesChart();
        if (response == null || response.getHits() == null || response.getAggregations() == null) {
            return chartData;
        }

        List<Long[]> chart = new ArrayList<>();
        ParsedDateHistogram histogram = response.getAggregations().get(Elastic.RES);
        for (Histogram.Bucket bucket : histogram.getBuckets()) {
            Long[] tmp = new Long[]{CommonUtil.toLong(bucket.getKeyAsString()), bucket.getDocCount()};
            chart.add(tmp);
        }
        chartData.setChart(chart);

        // 전체 count 파싱
        TotalHits totalHits = response.getHits().getTotalHits();
        if (totalHits != null) {
            chartData.setCount(totalHits.value);
        }

        return chartData;
    }

    /**
     * 사용자 목록 응답을 파싱한다.
     *
     * @param response      OpenSearch 검색 결과
     * @param userIdMasking 사용자 ID 마스킹 여부
     * @return 사용자 목록 DTO
     */
    public static UserListResponseDto parseUserListData(SearchResponse response, boolean userIdMasking) {
        if (response == null || response.getHits() == null || response.getHits().getTotalHits() == null) {
            return new UserListResponseDto();
        }
        UserListResponseDto result = new UserListResponseDto();

        // 검색 결과 전체
        TotalHits totalHits = response.getHits().getTotalHits();
        result.setTotalHits(totalHits.value);

        // avg loading time
        if (response.getAggregations() != null && response.getAggregations().get(Elastic.RES) != null) {
            ParsedAvg avg = response.getAggregations().get(Elastic.RES);
            result.setAvg(avg.getValue());
        }

        // 목록 항목
        List<UserListResponseDto.ListData> list = new ArrayList<>();
        for (SearchHit hit : response.getHits()) {
            list.add(UserListResponseDto.ListData.from(hit.getId(), hit.getSourceAsMap(), userIdMasking));
        }
        result.setData(list);

        return result;
    }

    /**
     * 세션 프로필 정보를 파싱한다.
     *
     * @param response      OpenSearch 검색 결과
     * @param userIdMasking 사용자 ID 마스킹 여부
     * @return 세션 프로필 DTO
     */
    public static SessionDetailResponseDto.Profile parseSessionProfileData(SearchResponse response, boolean userIdMasking) {
        if (response == null || response.getHits() == null || response.getHits().getTotalHits() == null) {
            return new SessionDetailResponseDto.Profile();
        }

        return SessionDetailResponseDto.Profile.from(response.getHits().getAt(0).getSourceAsMap(), userIdMasking);
    }

    /**
     * 세션 Vital 정보를 파싱한다.
     *
     * @param response OpenSearch 검색 결과
     * @return 세션 Vital DTO
     */
    public static SessionDetailResponseDto.Vital parseSessionVitalData(SearchResponse response) {
        if (response == null || response.getAggregations() == null) {
            return new SessionDetailResponseDto.Vital();
        }

        Aggregations aggs = response.getAggregations();

        double lcp = getAvgFromFilterAgg(aggs, "lcp_filter", Elastic.lcp, 0);
        double inp = getAvgFromFilterAgg(aggs, "inp_filter", Elastic.inp, 0);
        double cls = getAvgFromFilterAgg(aggs, "cls_filter", Elastic.cls, 4);

        return new SessionDetailResponseDto.Vital(lcp, inp, cls);
    }

    /**
     * filter → avg 구조의 집계에서 평균 값을 추출한다.
     *
     * @param aggs       최상위 Aggregations
     * @param filterName filter aggregation 이름 (예: "lcp_filter")
     * @param avgName    avg aggregation 이름 (예: Elastic.lcp)
     * @param scale      소수점 자리수
     * @return 평균 값 (집계 결과 없거나 NaN이면 0)
     */
    private static double getAvgFromFilterAgg(Aggregations aggs,
                                              String filterName,
                                              String avgName,
                                              int scale) {
        if (aggs == null) {
            return 0;
        }

        ParsedFilter filter = aggs.get(filterName);
        if (filter == null || filter.getDocCount() == 0L || filter.getAggregations() == null) {
            return 0;
        }

        ParsedAvg avg = filter.getAggregations().get(avgName);
        if (avg == null) {
            return 0;
        }

        double value = avg.getValue();
        if (Double.isNaN(value)) {
            return 0;
        }

        return CommonUtil.toDouble(value, scale);
    }

    /**
     * 세션 페이지 리스트를 파싱한다.
     *
     * @param response OpenSearch 검색 결과
     * @return 페이지 정보 리스트
     */
    public static List<SessionDetailResponseDto.PageInfo> parseSessionPageListData(SearchResponse response) {
        if (response == null || response.getHits() == null || response.getHits().getTotalHits() == null) {
            return new ArrayList<>();
        }

        List<SessionDetailResponseDto.PageInfo> result = new ArrayList<>();
        response.getHits().forEach(item -> {
            result.add(SessionDetailResponseDto.PageInfo.from(item.getSourceAsMap(), item.getId()));
        });

        return result;
    }

    /**
     * 세션 이벤트 리스트를 파싱한다.
     *
     * @param response OpenSearch 검색 결과
     * @return 이벤트 리스트
     */
    public static List<SessionDetailResponseDto.EventInfo> parseSessionEventListData(SearchResponse response) {
        if (response == null || response.getHits() == null || response.getHits().getTotalHits() == null) {
            return new ArrayList<>();
        }

        List<SessionDetailResponseDto.EventInfo> result = new ArrayList<>();
        response.getHits().forEach(item -> {
            result.add(SessionDetailResponseDto.EventInfo.from(item.getSourceAsMap()));
        });

        return result;
    }
}
