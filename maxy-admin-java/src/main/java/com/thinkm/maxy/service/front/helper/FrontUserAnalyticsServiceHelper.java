package com.thinkm.maxy.service.front.helper;

import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.Elastic;
import com.thinkm.maxy.dto.front.user.PageFlowDetailResponseDto;
import com.thinkm.maxy.dto.front.user.PageFlowResponseDto;
import com.thinkm.maxy.dto.front.user.UserDetailResponseDto;
import com.thinkm.maxy.dto.front.user.UserListResponseDto;
import kotlinx.metadata.Flag;
import org.apache.lucene.search.TotalHits;
import org.opensearch.action.search.SearchResponse;
import org.opensearch.search.SearchHit;
import org.opensearch.search.aggregations.bucket.histogram.Histogram;
import org.opensearch.search.aggregations.bucket.histogram.ParsedDateHistogram;
import org.opensearch.search.aggregations.bucket.terms.ParsedTerms;
import org.opensearch.search.aggregations.metrics.ParsedAvg;
import org.opensearch.search.aggregations.metrics.ParsedTopHits;

import java.time.ZonedDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * FrontUserAnalyticsService에서 사용하는 응답 파싱 및 가공 로직을 제공하는 헬퍼 클래스입니다.
 */
public class FrontUserAnalyticsServiceHelper {
    /**
     * 사용자 흐름 페이지 목록을 파싱한다.
     *
     * @param response OpenSearch 검색 결과
     * @param userIdMasking 사용자 ID 마스킹 여부
     * @return parentLogDate 기준으로 그룹핑된 페이지 리스트
     */
    public static List<List<PageFlowResponseDto.PageInfo>> parsePageList(SearchResponse response,
                                                                         boolean userIdMasking) {
        if (response == null || response.getHits() == null) {
            return Collections.emptyList();
        }
        List<PageFlowResponseDto.PageInfo> pageInfoList = new ArrayList<>();
        // Hits -> list map 변환
        for (SearchHit hit : response.getHits()) {
            PageFlowResponseDto.PageInfo pageInfo = PageFlowResponseDto.PageInfo.from(hit.getSourceAsMap());
            pageInfo.setDocId(hit.getId());
            pageInfo.setUserId(CommonUtil.maskUserId(pageInfo.getUserId(), userIdMasking, 2));
            pageInfoList.add(pageInfo);
        }
        // parentLogDate 로 grouping
        Map<String, List<PageFlowResponseDto.PageInfo>> unsortedResult = pageInfoList
                .stream()
                .collect(Collectors.groupingBy(PageFlowResponseDto.PageInfo::getParentLogDate));

        List<List<PageFlowResponseDto.PageInfo>> resultList = new ArrayList<>();
        // user id masking
        unsortedResult.forEach((key, value) -> {
            resultList.add(value);
        });

        // parentLogDate 로 desc sorting
        resultList.sort(Comparator.comparing((List<PageFlowResponseDto.PageInfo> cp)
                -> cp.get(0).getParentLogDate()).reversed());
        return resultList;
    }

    /**
     * 이벤트 목록을 파싱한다.
     *
     * @param response OpenSearch 검색 결과
     * @return 이벤트 정보 리스트
     */
    public static List<PageFlowDetailResponseDto.EventInfo> parseEventList(SearchResponse response) {
        if (response == null || response.getHits() == null) {
            return Collections.emptyList();
        }
        List<PageFlowDetailResponseDto.EventInfo> result = new ArrayList<>();
        response.getHits().forEach(hit -> {
            PageFlowDetailResponseDto.EventInfo eventInfo = PageFlowDetailResponseDto.EventInfo.from(hit.getSourceAsMap());
            eventInfo.setDocId(hit.getId());
            result.add(eventInfo);
        });
        return result;
    }

    /**
     * 페이지 로그 응답을 사용자 상세 DTO에 병합한다.
     *
     * @param response OpenSearch 검색 결과
     * @param result 결과 DTO
     * @param userIdMasking 사용자 ID 마스킹 여부
     */
    public static void parseUserDetailFromPageLog(SearchResponse response, UserDetailResponseDto result, boolean userIdMasking) {
        Map<String, Object> source = Elastic.convertResponse(response);
        result.ofPageLog(source, userIdMasking);
    }

    /**
     * 접근 로그 응답을 사용자 상세 DTO에 병합한다.
     *
     * @param response OpenSearch 검색 결과
     * @param result 결과 DTO
     */
    public static void parseUserDetailFromAccessLog(SearchResponse response, UserDetailResponseDto result) {
        Map<String, Object> source = Elastic.convertResponse(response);
        long totalHit = Elastic.convertTotalHits(response);
        result.ofAccessLog(source, totalHit);
    }

    /**
     * 디바이스 정보 응답을 사용자 상세 DTO에 병합한다.
     *
     * @param response OpenSearch 검색 결과
     * @param result 결과 DTO
     */
    public static void parseUserDetailFromDeviceInfo(SearchResponse response, UserDetailResponseDto result) {
        Map<String, Object> source = Elastic.convertResponse(response);
        result.ofDeviceInfo(source);
    }

    /**
     * 사용자 목록 응답을 파싱한다.
     *
     * @param response OpenSearch 검색 결과
     * @return 사용자 목록 DTO
     */
    public static UserListResponseDto parseUserList(SearchResponse response) {
        if (response == null || response.getAggregations() == null) {
            return new UserListResponseDto();
        }

        ParsedTerms terms = response.getAggregations().get(Elastic.RES);
        if (terms == null) {
            return new UserListResponseDto();
        }

        List<UserListResponseDto.UserInfo> result = new ArrayList<>();

        terms.getBuckets().forEach(bucket -> {
            ParsedTopHits topHits = bucket.getAggregations().get(Elastic.SUB_AGGS_1);
            Map<String, Object> map = topHits.getHits().getAt(0).getSourceAsMap();
            result.add(UserListResponseDto.UserInfo.from(map));
        });

        return new UserListResponseDto(result);
    }

    /**
     * 로딩 시간 차트 데이터를 파싱한다.
     *
     * @param response OpenSearch 검색 결과
     * @return 차트 데이터 DTO
     */
    public static PageFlowDetailResponseDto.ChartData parseLoadingTimeChartData(SearchResponse response) {
        PageFlowDetailResponseDto.ChartData chartData = new PageFlowDetailResponseDto.ChartData();
        if (response == null || response.getHits() == null || response.getAggregations() == null) {
            return chartData;
        }

        // avg 파싱
        ParsedAvg avg = response.getAggregations().get(Elastic.RES);
        if (avg != null) {
            chartData.setAvg(avg.getValue());
        }

        // 차트 파싱
        List<Object[]> chart = new ArrayList<>();
        ParsedDateHistogram histogram = response.getAggregations().get(Elastic.SUB_AGGS_1);
        for (Histogram.Bucket bucket : histogram.getBuckets()) {
            ZonedDateTime keyTime = (ZonedDateTime) bucket.getKey();
            long time = keyTime.toInstant().toEpochMilli();

            ParsedAvg loadingTime = bucket.getAggregations().get(Elastic.SUB_AGGS_2);

            Object[] tmp = new Object[]{time, CommonUtil.toLong(loadingTime.getValue())};
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
}
