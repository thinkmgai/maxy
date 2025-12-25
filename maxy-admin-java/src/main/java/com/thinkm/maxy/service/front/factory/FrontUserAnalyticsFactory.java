package com.thinkm.maxy.service.front.factory;

import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.DateUtil;
import com.thinkm.common.util.Elastic;
import com.thinkm.maxy.dto.front.user.*;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;
import org.opensearch.search.aggregations.AggregationBuilders;
import org.opensearch.search.aggregations.BucketOrder;
import org.opensearch.search.aggregations.bucket.histogram.DateHistogramAggregationBuilder;
import org.opensearch.search.aggregations.bucket.histogram.DateHistogramInterval;
import org.opensearch.search.aggregations.bucket.histogram.LongBounds;
import org.opensearch.search.aggregations.bucket.terms.TermsAggregationBuilder;
import org.opensearch.search.aggregations.metrics.AvgAggregationBuilder;
import org.opensearch.search.aggregations.metrics.MaxAggregationBuilder;
import org.opensearch.search.aggregations.metrics.TopHitsAggregationBuilder;
import org.opensearch.search.builder.SearchSourceBuilder;
import org.opensearch.search.sort.SortBuilders;
import org.opensearch.search.sort.SortOrder;

import java.time.ZoneId;
import java.util.Map;

/**
 * FrontUserAnalyticsService에서 사용하는 사용자 분석 OpenSearch 쿼리를 생성하는 팩토리입니다.
 * 사용자 흐름, 상세, 이벤트, 목록 조회 등을 위한 검색 조건을 구성합니다.
 */
@Slf4j
public class FrontUserAnalyticsFactory {
    /**
     * 사용자 흐름 페이지 목록 조회 쿼리를 생성한다.
     *
     * @param dto 페이지 흐름 요청 DTO
     * @param isUseIdUpperCase 사용자 ID를 대문자로 검색할지 여부
     * @return SearchRequest 객체
     */
    public static SearchRequest createPageListQuery(PageFlowRequestDto dto, boolean isUseIdUpperCase) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryForFront(dto);
        if (dto.getMxPageId() == null) {
            // mxPageId가 없고 from/to 를 가지고 있다면 from/to 사이 데이터를 조회한다.
            dto.addRangeToFilter(boolQuery, Elastic.parentLogDate);
        } else {
            // 만약 mxPageId가 있다면 mxPageId 로 페이지 검색 후 parentLogDate 를 대체하여 조회한다.
            boolQuery.filter(QueryBuilders.termQuery(Elastic.parentLogDate, dto.getParentLogDate()));
        }

        // 장치 / UserId 검색조건 추가
        String searchType = dto.getSearchType();
        String searchValue = dto.getSearchValue();
        Map<String, String> searchValues = dto.getSearchValues();
        if (!CommonUtil.isValidString(searchValue) && !"multiple".equals(searchType)) {
            // searchText가 없는데 searchType이 있으면 400 (multiple 제외)
            log.error("searchText is empty but searchType is provided: {}", searchType);
            throw new BadRequestException(ReturnCode.ERR_WRONG_PARAMS);
        }

        // 복합 검색 처리
        if ("multiple".equals(searchType) && searchValues != null && !searchValues.isEmpty()) {
            BoolQueryBuilder multipleSearchQuery = QueryBuilders.boolQuery();

            for (Map.Entry<String, String> entry : searchValues.entrySet()) {
                String fieldType = entry.getKey();
                String fieldValue = entry.getValue();

                if (CommonUtil.isValidString(fieldValue)) {
                    // userId 면 UPPER CASE

                    multipleSearchQuery.filter(QueryBuilders.termsQuery(fieldType + ".raw",
                            (Elastic.userId.equalsIgnoreCase(fieldType) && isUseIdUpperCase)
                                    ? fieldValue.toUpperCase() : fieldValue));
                }
            }

            boolQuery.filter(multipleSearchQuery);

        } else {
            // 기존 단일 검색 처리
            // userId 면 UPPER CASE, keyword 검색을 위한 .raw
            boolQuery.filter(QueryBuilders.termsQuery(searchType + ".raw",
                    (Elastic.userId.equalsIgnoreCase(searchType) && isUseIdUpperCase)
                            ? searchValue.toUpperCase() : searchValue));
        }

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .sort(Elastic.parentLogDate, SortOrder.DESC)
                .sort(Elastic.pageStartTm, SortOrder.ASC)
                .size(10000)
                .fetchSource(PageFlowResponseDto.FIELDS, null);
        String[] indexes = ElasticIndex.getIndicesForDateRange(ElasticIndex.PAGE_LOG, dto.getFrom(), dto.getTo());
        return new SearchRequest(indexes).source(searchSourceBuilder);
    }

    /**
     * 이벤트 리스트 조회 쿼리를 생성한다.
     *
     * @param dto 상세 요청 DTO
     * @param mxPageId 대상 페이지 ID
     * @return SearchRequest 객체
     */
    public static SearchRequest createEventListQuery(PageFlowDetailRequestDto dto, String mxPageId) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryForFront(dto);
        boolQuery.filter(QueryBuilders.termQuery(Elastic.mxPageId, mxPageId));
        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .size(10000)
                .query(boolQuery)
                .fetchSource(PageFlowDetailResponseDto.EventInfo.FIELDS, null);
        String[] indexes = ElasticIndex.getIndicesForDateRange(ElasticIndex.TOTAL_LOG, dto.getFrom(), dto.getTo());
        return new SearchRequest(indexes).source(searchSourceBuilder);
    }

    /**
     * 페이지 로그 기반 사용자 상세 조회 쿼리를 생성한다.
     *
     * @param dto 사용자 상세 요청 DTO
     * @return SearchRequest 객체
     */
    public static SearchRequest createUserDetailFromPageLogQuery(UserDetailRequestDto dto) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryForFront(dto);
        boolQuery.filter(QueryBuilders.termQuery(Elastic.deviceId_raw, dto.getDeviceId()));

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .fetchSource(UserDetailResponseDto.FIELDS, null)
                .sort(Elastic.pageStartTm, SortOrder.DESC)
                .size(1);

        return new SearchRequest(ElasticIndex.PAGE_LOG.getIndex() + "*").source(searchSourceBuilder);
    }

    /**
     * 접근 로그 기반 사용자 상세 조회 쿼리를 생성한다.
     *
     * @param dto 사용자 상세 요청 DTO
     * @return SearchRequest 객체
     */
    public static SearchRequest createUserDetailFromAccessLogQuery(UserDetailRequestDto dto) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryForFront(dto);
        boolQuery.filter(QueryBuilders.termQuery(Elastic.deviceId_raw, dto.getDeviceId()));

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .fetchSource(UserDetailResponseDto.FIELDS, null)
                .sort(Elastic.accessDate, SortOrder.DESC)
                .size(1);

        return new SearchRequest(ElasticIndex.ACCESS_HISTORY.getIndex() + "*").source(searchSourceBuilder);
    }

    /**
     * 디바이스 정보 기반 사용자 상세 조회 쿼리를 생성한다.
     *
     * @param dto 사용자 상세 요청 DTO
     * @return SearchRequest 객체
     */
    public static SearchRequest createUserDetailFromDeviceInfoQuery(UserDetailRequestDto dto) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryForFront(dto);
        boolQuery.filter(QueryBuilders.termQuery(Elastic.deviceId_raw, dto.getDeviceId()));

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .fetchSource(UserDetailResponseDto.FIELDS, null)
                .size(1);

        return new SearchRequest(ElasticIndex.DEVICE_INFO.getIndex()).source(searchSourceBuilder);
    }

    /**
     * 사용자 목록 조회 쿼리를 생성한다.
     *
     * @param dto 사용자 목록 요청 DTO
     * @return SearchRequest 객체
     */
    public static SearchRequest createUserListQuery(UserListRequestDto dto) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryForFront(dto);
        boolQuery.filter(QueryBuilders.termQuery(dto.getSearchType() + ".raw", dto.getSearchValue()));

        // 최신 1건을 달기 위한 top_hits 서브 애그리게이션
        TopHitsAggregationBuilder latest = AggregationBuilders.topHits(Elastic.SUB_AGGS_1)
                .sort(SortBuilders.fieldSort(Elastic.logTm).order(SortOrder.DESC))
                .size(1)
                .trackScores(false)
                // 필요한 필드만 제한해서 I/O 비용 절감
                .fetchSource(UserListResponseDto.UserInfo.FIELDS, null);

        // 버킷 정렬을 위해 최대 타임스탬프도 계산(옵션)
        MaxAggregationBuilder maxTs = AggregationBuilders.max("max_ts").field(Elastic.logTm);

        TermsAggregationBuilder terms = AggregationBuilders.terms(Elastic.RES)
                .field(Elastic.deviceId_raw)            // 예: "deviceId.raw"
                .size(100) // 적절히 제한
                .minDocCount(1)
                // 최신 시각 기준으로 버킷 정렬
                .order(BucketOrder.aggregation("max_ts", false))
                .subAggregation(maxTs)
                .subAggregation(latest);

        SearchSourceBuilder ssb = new SearchSourceBuilder()
                .size(0)
                .trackTotalHits(false)
                .query(boolQuery)
                .aggregation(terms);

        String[] indexes = ElasticIndex.getIndicesForDateRange(ElasticIndex.VISIT_LOG, dto.getFrom(), dto.getTo());
        return new SearchRequest(indexes).source(ssb);
    }

    /**
     * 로딩 시간 차트 조회 쿼리를 생성한다.
     *
     * @param dto 상세 요청 DTO
     * @param pageInfo 기준 페이지 정보
     * @return SearchRequest 객체
     */
    public static SearchRequest createLoadingTimeChartQuery(PageFlowDetailRequestDto dto, PageFlowDetailResponseDto.PageInfo pageInfo) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryForFront(dto);
        String targetDate = DateUtil.timestampToDate(pageInfo.getPageEndTm(), DateUtil.DATE_WITH_DASH_PATTERN);
        long[] timestamps = DateUtil.dateToTimestamps(targetDate);
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.pageStartTm).gte(timestamps[0]).lte(timestamps[1]).timeZone("Z"));
        boolQuery.filter(QueryBuilders.termQuery(Elastic.aliasValue, pageInfo.getAliasValue()));

        AvgAggregationBuilder avgBuilder = new AvgAggregationBuilder(Elastic.RES).field(Elastic.loadingTime);

        DateHistogramAggregationBuilder histogram = new DateHistogramAggregationBuilder(Elastic.SUB_AGGS_1)
                .fixedInterval(DateHistogramInterval.minutes(10))
                .extendedBounds(new LongBounds(timestamps[0], timestamps[1]))
                .field(Elastic.pageStartTm)
                .timeZone(ZoneId.of("Z"))
                .subAggregation(new AvgAggregationBuilder(Elastic.SUB_AGGS_2).field(Elastic.loadingTime));

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .aggregation(avgBuilder)
                .aggregation(histogram)
                .sort(Elastic.pageStartTm, SortOrder.DESC)
                .size(0)
                .trackTotalHits(true);
        String[] indexes = ElasticIndex.getIndicesForDateRange(ElasticIndex.PAGE_LOG, dto.getFrom(), dto.getTo());
        return new SearchRequest(indexes).source(searchSourceBuilder);
    }
}
