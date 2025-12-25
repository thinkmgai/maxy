package com.thinkm.maxy.service.front.factory;

import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.util.Elastic;
import com.thinkm.maxy.dto.front.common.ReadStatusRequestDto;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;
import org.opensearch.search.builder.SearchSourceBuilder;

/**
 * FrontCommonService에서 사용하는 OpenSearch 쿼리를 생성하는 팩토리입니다.
 */
@Slf4j
public class FrontCommonFactory {
    /**
     * 읽음 여부를 확인하는 검색 쿼리를 생성한다.
     *
     * @param dto 검색 조건 DTO
     * @return SearchRequest 객체
     */
    public static SearchRequest createIsReadErrorQuery(ReadStatusRequestDto dto) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryForFront(dto);
        boolQuery.filter(QueryBuilders.termQuery(Elastic.type, dto.getType()));
        boolQuery.filter(QueryBuilders.termQuery("hash", dto.getHash()));

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder().query(boolQuery).size(1);
        return new SearchRequest(ElasticIndex.CHK.getIndex()).source(searchSourceBuilder);
    }
}
