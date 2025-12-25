package com.thinkm.maxy.service.front.factory;

import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.util.DateUtil;
import com.thinkm.common.util.Elastic;
import com.thinkm.maxy.domain.front.network.NetworkListSearchCondition;
import com.thinkm.maxy.dto.front.dashboard.network.NetworkDetailRequestDto;
import com.thinkm.maxy.dto.front.dashboard.network.NetworkDetailResponseDto;
import com.thinkm.maxy.dto.front.dashboard.network.NetworkListResponseDto;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;
import org.opensearch.search.aggregations.bucket.histogram.DateHistogramAggregationBuilder;
import org.opensearch.search.aggregations.bucket.histogram.DateHistogramInterval;
import org.opensearch.search.aggregations.bucket.histogram.LongBounds;
import org.opensearch.search.aggregations.metrics.AvgAggregationBuilder;
import org.opensearch.search.builder.SearchSourceBuilder;
import org.opensearch.search.sort.SortOrder;

import java.time.ZoneId;

/**
 * FrontNetworkService에서 사용하는 OpenSearch 쿼리를 생성하는 팩토리입니다.
 * 네트워크 관련 검색 조건을 캡슐화합니다.
 */
@Slf4j
public class FrontNetworkFactory {
    /**
     * 네트워크 목록 조회 쿼리를 생성한다.
     *
     * @param sc 네트워크 목록 요청 DTO
     * @return SearchRequest 객체
     */
    public static SearchRequest createNetworkListQuery(NetworkListSearchCondition sc) {
        BoolQueryBuilder boolQuery = sc.appInfo().makeBoolQueryForFront();
        sc.range().addRangeToFilter(boolQuery, Elastic.logTm);

        // y축 데이터 넘어오는 경우(scatter)
        sc.yRange().addYRangeToFilter(boolQuery, Elastic.intervaltime);

        // area 컴포넌트에서 호출하는 경우 filter 에 locationCode를 추가한다.
        sc.area().addLocationCodeToFilter(boolQuery);

        // reqUrl 조건이 있는 경우 filter 에 reqUrl 을 추가한다.
        sc.typeAndValue().addTypeAndValueToFilter(boolQuery);

        AvgAggregationBuilder avgBuilder = new AvgAggregationBuilder(Elastic.RES).field(Elastic.intervaltime);

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .aggregation(avgBuilder)
                .sort(Elastic.logTm, SortOrder.DESC)
                .size(1000)
                .fetchSource(NetworkListResponseDto.FIELDS, null);
        String[] indexes = ElasticIndex.getIndicesForDateRange(ElasticIndex.NETWORK_LOG, sc.range());
        return new SearchRequest(indexes).source(searchSourceBuilder);
    }

    /**
     * 네트워크 상세 차트 조회 쿼리를 생성한다.
     *
     * @param dto        네트워크 상세 요청 DTO
     * @param detailData 네트워크 상세 데이터
     * @return SearchRequest 객체
     */
    public static SearchRequest createNetworkChartQuery(NetworkDetailRequestDto dto, NetworkDetailResponseDto.DetailData detailData) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryForFront(dto);
        long[] today = DateUtil.dateToTimestamps();
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm).gte(today[0]).lte(today[1]).timeZone("Z"));

        boolQuery.filter(QueryBuilders.termQuery(Elastic.aliasValue, detailData.getAliasValue()));

        AvgAggregationBuilder avgBuilder = new AvgAggregationBuilder(Elastic.RES).field(Elastic.intervaltime);

        DateHistogramAggregationBuilder histogram = new DateHistogramAggregationBuilder(Elastic.SUB_AGGS_1)
                .fixedInterval(DateHistogramInterval.minutes(10))
                .extendedBounds(new LongBounds(today[0], today[1]))
                .field(Elastic.logTm)
                .timeZone(ZoneId.of("Z"))
                .subAggregation(new AvgAggregationBuilder(Elastic.SUB_AGGS_2).field(Elastic.intervaltime));

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .aggregation(avgBuilder)
                .aggregation(histogram)
                .sort(Elastic.logTm, SortOrder.DESC)
                .size(0)
                .trackTotalHits(true);
        String[] indexes = ElasticIndex.getIndicesForDateRange(ElasticIndex.NETWORK_LOG, dto.getFrom(), dto.getTo());
        return new SearchRequest(indexes).source(searchSourceBuilder);
    }
}
