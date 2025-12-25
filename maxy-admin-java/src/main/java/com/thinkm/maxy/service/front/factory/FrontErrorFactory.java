package com.thinkm.maxy.service.front.factory;

import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.code.MaxyLogType;
import com.thinkm.common.util.Elastic;
import com.thinkm.maxy.domain.front.error.ErrorListSearchCondition;
import com.thinkm.maxy.dto.front.common.SinglePageInfo;
import com.thinkm.maxy.dto.front.dashboard.error.ErrorDetailResponseDto;
import com.thinkm.maxy.dto.front.dashboard.error.ErrorListResponseDto;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;
import org.opensearch.search.builder.SearchSourceBuilder;
import org.opensearch.search.sort.SortOrder;

/**
 * FrontErrorService에서 사용하는 OpenSearch 쿼리를 생성하는 팩토리입니다.
 * 에러 관련 검색 조건을 캡슐화합니다.
 */
@Slf4j
public class FrontErrorFactory {

    /**
     * 에러 목록 조회 쿼리를 생성한다.
     *
     * @param sc 에러 목록 요청
     * @return SearchRequest 객체
     */
    public static SearchRequest createErrorListQuery(ErrorListSearchCondition sc) {
        BoolQueryBuilder boolQuery = sc.appInfo().makeBoolQueryForFront();
        sc.range().addRangeToFilter(boolQuery, Elastic.logTm);
        sc.resMsg().addResMsgToFilter(boolQuery);

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .sort(Elastic.logTm, SortOrder.DESC)
                .size(1000)
                .fetchSource(ErrorListResponseDto.ListDetail.FIELDS, null);
        String[] indexes = ElasticIndex.getIndicesForDateRange(ElasticIndex.TROUBLE_LOG,
                sc.range().from(), sc.range().to());
        return new SearchRequest(indexes).source(searchSourceBuilder);
    }

    /**
     * 에러 상세 이벤트 리스트 조회 쿼리를 생성한다.
     *
     * @param dto 단일 페이지 정보 DTO
     * @param to  조회 종료 시각
     * @return SearchRequest 객체
     */
    public static SearchRequest createErrorEventListQuery(SinglePageInfo dto, long to) {
        BoolQueryBuilder boolQuery = new BoolQueryBuilder();
        boolQuery.filter(QueryBuilders.termQuery(Elastic.packageNm, dto.getPackageNm()));
        boolQuery.filter(QueryBuilders.termQuery(Elastic.serverType, dto.getServerType()));
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm).gte(dto.getParentLogDate()).lte(to).timeZone("Z"));
        boolQuery.filter(QueryBuilders.termQuery(Elastic.deviceId_raw, dto.getDeviceId()));
        boolQuery.filter(QueryBuilders.termsQuery(Elastic.logType, MaxyLogType.S_REPLAY_TYPES_SET));

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .size(100)
                .fetchSource(ErrorDetailResponseDto.EventInfo.FIELDS, null)
                .sort(Elastic.logTm, SortOrder.DESC);

        String[] indexes = ElasticIndex.getIndicesForDateRange(ElasticIndex.SESSION_LOG, dto.getParentLogDate(), to);
        return new SearchRequest(indexes).source(searchSourceBuilder);
    }
}
