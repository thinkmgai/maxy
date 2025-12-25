package com.thinkm.maxy.service.front.factory;

import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.code.MaxyLogType;
import com.thinkm.common.util.Elastic;
import com.thinkm.maxy.dto.front.sessionreplay.SessionReplayRequestDto;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;
import org.opensearch.search.builder.SearchSourceBuilder;
import org.opensearch.search.sort.SortOrder;

/**
 * FrontSessionReplayService에서 사용하는 세션 리플레이 관련 OpenSearch 쿼리 팩토리입니다.
 */
@Slf4j
public class FrontSessionReplayFactory {
    /**
     * 세션 리플레이 액션 목록 조회 쿼리를 생성한다.
     *
     * @param dto 조회 조건 DTO
     * @return SearchRequest 객체
     */
    public static SearchRequest createActionListQuery(SessionReplayRequestDto dto) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryForFront(dto);
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm).gte(dto.getFrom()).lte(dto.getTo()).timeZone("Z"));
        boolQuery.filter(QueryBuilders.termsQuery(Elastic.logType, MaxyLogType.S_REPLAY_TYPES_SET));
        boolQuery.filter(QueryBuilders.termQuery(Elastic.maxySessionId, dto.getSessionId()));

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .sort(Elastic.logTm, SortOrder.ASC)
                .size(10000);
        String[] indexes = ElasticIndex.getIndicesForDateRange(ElasticIndex.SESSION_LOG, dto.getFrom(), dto.getTo());
        return new SearchRequest(indexes).source(searchSourceBuilder);
    }

    /**
     * maxySessionId로 AppStartTm 데이터를 조회한다
     *
     * @param dto 조회 조건 DTO
     * @return SearchRequest 객체
     */
    public static SearchRequest createGetSessionStartTmQuery(SessionReplayRequestDto dto) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryForFront(dto);
        boolQuery.filter(QueryBuilders.termQuery(Elastic.maxySessionId, dto.getSessionId()));
        boolQuery.filter(QueryBuilders.termQuery(Elastic.logType, MaxyLogType.T_Native_App_Start.getDecimal()));

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .sort(Elastic.pageStartTm, SortOrder.ASC)
                .size(1)
                .fetchSource(new String[]{Elastic.pageStartTm}, null);

        String index = ElasticIndex.PAGE_LOG.getIndex() + "*";
        return new SearchRequest(index).source(searchSourceBuilder);
    }

    /**
     * maxySessionId로 AppStartTm 데이터를 조회한다
     *
     * @param dto 조회 조건 DTO
     * @param sort SortOrder (ASC, DESC)
     * @return SearchRequest 객체
     */
    public static SearchRequest createGetSessionTmQueryFromSessionLog(SessionReplayRequestDto dto, SortOrder sort) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryForFront(dto);
        boolQuery.filter(QueryBuilders.termQuery(Elastic.maxySessionId, dto.getSessionId()));

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .sort(Elastic.logTm, sort)
                .size(1)
                .fetchSource(new String[]{Elastic.logTm}, null);

        String index = ElasticIndex.SESSION_LOG.getIndex() + "*";
        return new SearchRequest(index).source(searchSourceBuilder);
    }
}
