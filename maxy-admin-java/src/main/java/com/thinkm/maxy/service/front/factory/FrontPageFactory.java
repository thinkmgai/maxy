package com.thinkm.maxy.service.front.factory;

import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.code.MaxyLogType;
import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.util.Elastic;
import com.thinkm.common.util.ValidUtil;
import com.thinkm.maxy.domain.front.page.PageListSearchCondition;
import com.thinkm.maxy.dto.front.common.ExistsPageInfoRequestDto;
import com.thinkm.maxy.dto.front.common.PageInfoRequestDto;
import com.thinkm.maxy.dto.front.dashboard.page.PageListResponseDto;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;
import org.opensearch.index.query.RangeQueryBuilder;
import org.opensearch.search.aggregations.metrics.AvgAggregationBuilder;
import org.opensearch.search.builder.SearchSourceBuilder;
import org.opensearch.search.sort.SortOrder;

/**
 * FrontPageService에서 사용하는 OpenSearch 쿼리를 생성하는 팩토리입니다.
 */
@Slf4j
public class FrontPageFactory {
    /**
     * mxPageId로 페이지 정보 조회 쿼리. mxPageId로 단건을 찾고, from/to 값으로 index 범위를 잡는다.
     *
     * @param dto mxPageId, from, to 필수
     * @return 페이지 조회 쿼리
     */
    public static SearchRequest createSinglePageInfoQuery(PageInfoRequestDto dto) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryForFront(dto);
        boolQuery.filter(QueryBuilders.termQuery(Elastic.mxPageId, dto.getMxPageId()));
        boolQuery.filter(QueryBuilders.termsQuery(Elastic.logType, MaxyLogType.WEB_PAGE_TYPES_SET));

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .size(1)
                .sort(Elastic.pageStartTm, SortOrder.DESC);

        String[] indexes = ElasticIndex.getIndicesForDateRange(ElasticIndex.PAGE_LOG, dto.getFrom(), dto.getTo());
        return new SearchRequest(indexes).source(searchSourceBuilder);
    }

    /**
     * 페이지 로그 존재 여부를 확인하는 쿼리를 생성한다.
     *
     * @param dto 존재 여부 확인 요청 DTO
     * @return SearchRequest 객체
     */
    public static SearchRequest createExistsPageInfoQuery(ExistsPageInfoRequestDto dto) {
        final String packageNm = dto.getPackageNm();
        final String serverType = dto.getServerType();
        final String deviceId = dto.getDeviceId();
        final Long mxPageId = dto.getMxPageId();
        final Long logTm = dto.getFrom();

        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, packageNm, serverType, logTm);

        if (mxPageId == null && logTm == null) {
            throw new BadRequestException(ReturnCode.ERR_EMPTY_PARAMS);
        }

        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryForFront(dto);
        boolQuery.filter(QueryBuilders.termsQuery(Elastic.logType, MaxyLogType.WEB_PAGE_TYPES_SET));

        if (mxPageId != null) {
            boolQuery.filter(QueryBuilders.termQuery(Elastic.mxPageId, mxPageId));
        } else {
            boolQuery.filter(QueryBuilders.termQuery(Elastic.deviceId_raw, deviceId));
            RangeQueryBuilder pageEndTmRange = QueryBuilders.rangeQuery(Elastic.pageEndTm)
                    .gte(logTm)
                    .timeZone("Z");
            boolQuery.filter(pageEndTmRange);

            RangeQueryBuilder pageStartTmRange = QueryBuilders.rangeQuery(Elastic.pageStartTm)
                    .lte(logTm)
                    .timeZone("Z");
            boolQuery.filter(pageStartTmRange);
        }
        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder();
        searchSourceBuilder.query(boolQuery).fetchSource(new String[]{Elastic.deviceId}, null);

        String[] indexes = ElasticIndex.getIndicesForDateRange(ElasticIndex.PAGE_LOG, logTm, logTm);
        return new SearchRequest(indexes).source(searchSourceBuilder);
    }

    /**
     * 페이지 목록 조회 쿼리를 생성한다.
     *
     * @param sc 페이지 목록 요청 DTO
     * @return SearchRequest 객체
     */
    public static SearchRequest createPageListQuery(PageListSearchCondition sc) {
        BoolQueryBuilder boolQuery = sc.appInfo().makeBoolQueryForFront();
        sc.range().addRangeToFilter(boolQuery, Elastic.pageStartTm);

        // y축 데이터 넘어오는 경우(scatter)
        sc.yRange().addYRangeToFilter(boolQuery, Elastic.loadingTime);

        boolQuery.filter(QueryBuilders.termsQuery(Elastic.logType, MaxyLogType.WEB_PAGE_TYPES_SET));

        // area 컴포넌트에서 호출하는 경우 filter에 locationCode를 추가한다.
        sc.area().addLocationCodeToFilter(boolQuery);

        sc.typeAndValue().addTypeAndValueToFilter(boolQuery);

        AvgAggregationBuilder avgBuilder = new AvgAggregationBuilder(Elastic.RES).field(Elastic.loadingTime);

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .aggregation(avgBuilder)
                .sort(Elastic.pageStartTm, SortOrder.DESC)
                .size(1000)
                .fetchSource(PageListResponseDto.FIELDS, null);
        String[] indexes = ElasticIndex.getIndicesForDateRange(ElasticIndex.PAGE_LOG, sc.range());
        return new SearchRequest(indexes).source(searchSourceBuilder);
    }
}
