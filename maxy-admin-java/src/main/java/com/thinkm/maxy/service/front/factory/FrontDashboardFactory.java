package com.thinkm.maxy.service.front.factory;

import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.code.MaxyLogType;
import com.thinkm.common.util.DateUtil;
import com.thinkm.common.util.Elastic;
import com.thinkm.maxy.domain.front.common.TimeSeriesChartSearchCondition;
import com.thinkm.maxy.dto.front.common.TimeSeriesChart;
import com.thinkm.maxy.dto.front.dashboard.session.SessionDetailRequestDto;
import com.thinkm.maxy.dto.front.dashboard.session.SessionDetailResponseDto;
import com.thinkm.maxy.dto.front.dashboard.user.UserListResponseDto;
import com.thinkm.maxy.dto.front.dashboard.user.UserRequestDto;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;
import org.opensearch.search.aggregations.AggregationBuilders;
import org.opensearch.search.aggregations.bucket.filter.FilterAggregationBuilder;
import org.opensearch.search.aggregations.bucket.histogram.DateHistogramAggregationBuilder;
import org.opensearch.search.aggregations.bucket.histogram.DateHistogramInterval;
import org.opensearch.search.aggregations.bucket.histogram.LongBounds;
import org.opensearch.search.aggregations.metrics.AvgAggregationBuilder;
import org.opensearch.search.builder.SearchSourceBuilder;
import org.opensearch.search.sort.SortOrder;

import java.time.ZoneId;

/**
 * FrontDashboardService에서 사용하는 OpenSearch 쿼리를 생성하는 팩토리입니다.
 * 페이지/네트워크/세션/에러 관련 검색 조건을 캡슐화합니다.
 */
@Slf4j
public class FrontDashboardFactory {

    /**
     * 시계열 차트 조회 쿼리를 생성한다.
     *
     * @param dataType 차트 데이터 타입
     * @param sc       조회 조건
     * @return SearchRequest 객체
     */
    public static SearchRequest createTimeSeriesChartQuery(TimeSeriesChart.DataType dataType, TimeSeriesChartSearchCondition sc) {
        BoolQueryBuilder boolQuery = sc.appInfo().makeBoolQueryForFront();

        long[] dates = DateUtil.normalizeDayRange(sc.range().from(), sc.range().to());
        boolQuery.filter(QueryBuilders.rangeQuery(dataType.getTimeColumn()).gte(dates[0]).lte(dates[1]).timeZone("Z"));

        // Page 인 경우 app start를 제외하는 로직이 필요하다.
        dataType.addWebPageFilter(boolQuery);

        // area에서 요청하는 경우
        sc.area().addLocationCodeToFilter(boolQuery);

        // reqUrl/resMsg 를 검색한다.
        sc.typeAndValue().addTypeAndValueToFilter(boolQuery);

        DateHistogramAggregationBuilder histogram = new DateHistogramAggregationBuilder(Elastic.RES)
                .field(dataType.getTimeColumn())
                .timeZone(ZoneId.of("Z"))
                .fixedInterval(DateHistogramInterval.minutes(30))
                .extendedBounds(new LongBounds(dates[0], dates[1]));

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .aggregation(histogram)
                .sort(dataType.getTimeColumn(), SortOrder.DESC)
                .size(0)
                .trackTotalHits(true);
        String[] indexes = ElasticIndex.getIndicesForDateRange(dataType.getIndex(), sc.range().from(), sc.range().to());
        return new SearchRequest(indexes).source(searchSourceBuilder);
    }

    /**
     * 사용자 목록 조회 쿼리를 생성한다.
     *
     * @param dto 사용자 목록 요청 DTO
     * @return SearchRequest 객체
     */
    public static SearchRequest createUserListQuery(UserRequestDto dto) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryForFront(dto);
        dto.addRangeToFilter(boolQuery, Elastic.appStartTm);

        // area 컴포넌트에서 호출하는 경우 filter에 locationCode를 추가한다.
        dto.addLocationCodeToFilter(boolQuery);

        AvgAggregationBuilder avgBuilder = new AvgAggregationBuilder(Elastic.RES).field(Elastic.usingTime);

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .aggregation(avgBuilder)
                .sort(Elastic.appStartTm, SortOrder.DESC)
                .size(1000)
                .fetchSource(UserListResponseDto.FIELDS, null);
        String[] indexes = ElasticIndex.getIndicesForDateRange(ElasticIndex.ACCESS_HISTORY, dto.getFrom(), dto.getTo());
        return new SearchRequest(indexes).source(searchSourceBuilder);
    }

    /**
     * 세션 프로필 정보 조회 쿼리를 생성한다.
     *
     * @param dto 세션 상세 요청 DTO
     * @return SearchRequest 객체
     */
    public static SearchRequest createSessionProfileInfoQuery(SessionDetailRequestDto dto) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryForFront(dto);
        dto.addRangeToFilter(boolQuery, Elastic.pageStartTm);
        boolQuery.filter(QueryBuilders.termQuery(Elastic.deviceId_raw, dto.getDeviceId()));

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .sort(Elastic.pageStartTm, SortOrder.DESC)
                .size(1000)
                .fetchSource(SessionDetailResponseDto.Profile.FIELDS, null);
        String[] indexes = ElasticIndex.getIndicesForDateRange(ElasticIndex.PAGE_LOG, dto.getFrom(), dto.getTo());
        return new SearchRequest(indexes).source(searchSourceBuilder);
    }

    /**
     * 세션 Vital 정보 조회 쿼리를 생성한다.
     *
     * @param dto  세션 상세 요청 DTO
     * @param from 조회 시작 시각
     * @return SearchRequest 객체
     */
    public static SearchRequest createSessionVitalInfoQuery(SessionDetailRequestDto dto, Long from) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryForFront(dto);
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm)
                .gte(from)
                .lte(dto.getTo())
                .timeZone("Z"));
        boolQuery.filter(QueryBuilders.termQuery(Elastic.deviceId_raw, dto.getDeviceId()));

        // name: LCP, value > 0 인 문서만 대상으로 avg(lcp)
        FilterAggregationBuilder lcpFilterAgg = AggregationBuilders.filter(
                "lcp_filter",
                QueryBuilders.boolQuery()
                        .filter(QueryBuilders.termQuery(Elastic.name, "LCP"))
        );
        lcpFilterAgg.subAggregation(
                AggregationBuilders.avg(Elastic.lcp).field(Elastic.value)
        );

        // name: INP, value > 0 인 문서만 대상으로 avg(inp)
        FilterAggregationBuilder inpFilterAgg = AggregationBuilders.filter(
                "inp_filter",
                QueryBuilders.boolQuery()
                        .filter(QueryBuilders.termQuery(Elastic.name, "INP"))
        );
        inpFilterAgg.subAggregation(
                AggregationBuilders.avg(Elastic.inp).field(Elastic.value)
        );

        // name: CLS, value > 0 인 문서만 대상으로 avg(cls)
        FilterAggregationBuilder clsFilterAgg = AggregationBuilders.filter(
                "cls_filter",
                QueryBuilders.boolQuery()
                        .filter(QueryBuilders.termQuery(Elastic.name, "CLS"))
        );
        clsFilterAgg.subAggregation(
                AggregationBuilders.avg(Elastic.cls).field(Elastic.value)
        );

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .aggregation(lcpFilterAgg)
                .aggregation(inpFilterAgg)
                .aggregation(clsFilterAgg)
                .size(0);

        String[] indexes = ElasticIndex.getIndicesForDateRange(ElasticIndex.VITAL_LOG, from, dto.getTo());
        return new SearchRequest(indexes).source(searchSourceBuilder);
    }

    /**
     * 세션 페이지 리스트 조회 쿼리를 생성한다.
     *
     * @param dto  세션 상세 요청 DTO
     * @param from 조회 시작 시각
     * @return SearchRequest 객체
     */
    public static SearchRequest createSessionPageListQuery(SessionDetailRequestDto dto, long from) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryForFront(dto);
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.pageStartTm).gte(from).lte(dto.getTo()).timeZone("Z"));
        boolQuery.filter(QueryBuilders.termQuery(Elastic.deviceId_raw, dto.getDeviceId()));

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .size(100)
                .fetchSource(SessionDetailResponseDto.PageInfo.FIELDS, null)
                .sort(Elastic.pageStartTm, SortOrder.DESC);

        String[] indexes = ElasticIndex.getIndicesForDateRange(ElasticIndex.PAGE_LOG, from, dto.getTo());
        return new SearchRequest(indexes).source(searchSourceBuilder);
    }

    /**
     * 세션 이벤트 리스트 조회 쿼리를 생성한다.
     *
     * @param dto  세션 상세 요청 DTO
     * @param from 조회 시작 시각
     * @return SearchRequest 객체
     */
    public static SearchRequest createSessionEventListQuery(SessionDetailRequestDto dto, long from) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryForFront(dto);
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm).gte(from).lte(dto.getTo()).timeZone("Z"));
        boolQuery.filter(QueryBuilders.termsQuery(Elastic.logType, MaxyLogType.S_REPLAY_TYPES_SET));
        boolQuery.filter(QueryBuilders.termQuery(Elastic.deviceId_raw, dto.getDeviceId()));

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .size(100)
                .fetchSource(SessionDetailResponseDto.EventInfo.FIELDS, null)
                .sort(Elastic.logTm, SortOrder.DESC);

        String[] indexes = ElasticIndex.getIndicesForDateRange(ElasticIndex.SESSION_LOG, from, dto.getTo());
        return new SearchRequest(indexes).source(searchSourceBuilder);
    }
}
