package com.thinkm.maxy.service.front.factory;

import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.util.Elastic;
import com.thinkm.maxy.dto.front.bi.BiRequestDto;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;
import org.opensearch.search.aggregations.AggregationBuilders;
import org.opensearch.search.aggregations.bucket.composite.CompositeAggregationBuilder;
import org.opensearch.search.aggregations.bucket.composite.TermsValuesSourceBuilder;
import org.opensearch.search.aggregations.metrics.MaxAggregationBuilder;
import org.opensearch.search.builder.SearchSourceBuilder;

import java.util.Arrays;

/**
 * FrontBiService에서 사용하는 BI 관련 OpenSearch 쿼리를 생성하는 팩토리입니다.
 */
@Slf4j
public class FrontBiFactory {
    /**
     * 특정 일자의 CCU 차트 조회 쿼리를 생성한다.
     *
     * @param dto 조회 조건 DTO
     * @param date 대상 일자(yyyyMMdd)
     * @return SearchRequest 객체
     */
    public static SearchRequest createCcuChartQuery(BiRequestDto dto, String date) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryForFront(dto);

        boolQuery.filter(QueryBuilders.termQuery("year", date.substring(0, 4)));
        boolQuery.filter(QueryBuilders.termQuery("month", date.substring(4, 6)));
        boolQuery.filter(QueryBuilders.termQuery("day", date.substring(6, 8)));
        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .size(10000)
                .query(boolQuery);

        return new SearchRequest(ElasticIndex.CCU.getIndex()).source(searchSourceBuilder);
    }

    /**
     * 기간 범위 CCU 차트 조회 쿼리를 생성한다.
     *
     * @param dto 조회 조건 DTO
     * @param from 시작일(yyyyMMdd)
     * @param to 종료일(yyyyMMdd)
     * @return SearchRequest 객체
     */
    public static SearchRequest createCcuDateChartQuery(BiRequestDto dto, String from, String to) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryForFront(dto);

        boolQuery.filter(QueryBuilders.rangeQuery("dateTime")
                .gte(from + "0000")
                .lte(to + "2359")
        );

        CompositeAggregationBuilder compositeAggs = AggregationBuilders.composite(Elastic.RES,
                Arrays.asList(
                        new TermsValuesSourceBuilder("year").field("year"),
                        new TermsValuesSourceBuilder("month").field("month"),
                        new TermsValuesSourceBuilder("day").field("day")
                )
        ).size(1000);

        MaxAggregationBuilder maxAgg = AggregationBuilders.max("maxCount")
                .field("value");
        compositeAggs.subAggregation(maxAgg);

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .aggregation(compositeAggs)
                .size(0)
                .query(boolQuery);

        return new SearchRequest(ElasticIndex.CCU.getIndex()).source(searchSourceBuilder);
    }
}
