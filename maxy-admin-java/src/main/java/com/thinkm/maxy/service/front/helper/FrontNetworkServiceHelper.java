package com.thinkm.maxy.service.front.helper;

import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.Elastic;
import com.thinkm.maxy.dto.front.dashboard.network.NetworkDetailResponseDto;
import com.thinkm.maxy.dto.front.dashboard.network.NetworkListResponseDto;
import lombok.extern.slf4j.Slf4j;
import org.apache.lucene.search.TotalHits;
import org.opensearch.action.search.SearchResponse;
import org.opensearch.search.SearchHit;
import org.opensearch.search.aggregations.bucket.histogram.Histogram;
import org.opensearch.search.aggregations.bucket.histogram.ParsedDateHistogram;
import org.opensearch.search.aggregations.metrics.ParsedAvg;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * FrontNetworkService에서 사용하는 응답 파싱 로직을 모아둔 헬퍼 클래스입니다.
 * OpenSearch/SearchResponse를 가공해 화면에서 사용하는 DTO로 변환합니다.
 */
@Slf4j
public class FrontNetworkServiceHelper {

    /**
     * 네트워크 목록 응답을 파싱한다.
     *
     * @param response OpenSearch 검색 결과
     * @return 네트워크 목록 DTO
     */
    public static NetworkListResponseDto parseNetworkListData(SearchResponse response, boolean userIdMasking) {
        if (response == null || response.getHits() == null || response.getHits().getTotalHits() == null) {
            return new NetworkListResponseDto();
        }
        NetworkListResponseDto result = new NetworkListResponseDto();
        TotalHits totalHits = response.getHits().getTotalHits();
        result.setTotalHits(totalHits.value);

        // avg response time
        if (response.getAggregations() != null && response.getAggregations().get(Elastic.RES) != null) {
            ParsedAvg avg = response.getAggregations().get(Elastic.RES);
            result.setAvg(CommonUtil.toDouble(avg.getValue(), 2));
        }

        List<NetworkListResponseDto.NetworkListData> list = new ArrayList<>();
        for (SearchHit hit : response.getHits()) {
            NetworkListResponseDto.NetworkListData item = NetworkListResponseDto.NetworkListData.from(hit.getId(), hit.getSourceAsMap());
            item.setUserId(CommonUtil.maskUserId(item.getUserId(), userIdMasking, 2));
            list.add(item);
        }
        result.setData(list);

        return result;
    }

    /**
     * 네트워크 상세 응답을 파싱한다.
     *
     * @param source        상세 데이터 소스 맵
     * @param userIdMasking 사용자 ID 마스킹 여부
     * @return 네트워크 상세 DTO
     */
    public static NetworkDetailResponseDto.DetailData parseNetworkDetailData(Map<String, Object> source, boolean userIdMasking) {
        return NetworkDetailResponseDto.DetailData.from(source, userIdMasking);
    }

    /**
     * 네트워크 차트 응답을 파싱한다.
     *
     * @param response OpenSearch 검색 결과
     * @return 네트워크 차트 DTO
     */
    public static NetworkDetailResponseDto.ChartData parseNetworkChartData(SearchResponse response) {
        NetworkDetailResponseDto.ChartData chartData = new NetworkDetailResponseDto.ChartData();
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
