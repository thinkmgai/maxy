package com.thinkm.maxy.service.front.factory;

import com.fasterxml.jackson.core.type.TypeReference;
import com.google.gson.JsonSyntaxException;
import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.code.MaxyLogType;
import com.thinkm.common.util.Elastic;
import com.thinkm.common.util.JsonUtil;
import com.thinkm.maxy.dto.front.webperf.error.ErrorAggregateListRequestDto;
import com.thinkm.maxy.dto.front.webperf.network.NetworkAggregateListRequestDto;
import com.thinkm.maxy.dto.front.webperf.page.PageAggregateListRequestDto;
import com.thinkm.maxy.dto.front.webperf.ratio.RatioRequestDto;
import com.thinkm.maxy.dto.front.webperf.vital.VitalRequestDto;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;
import org.opensearch.search.aggregations.AggregationBuilders;
import org.opensearch.search.aggregations.bucket.composite.CompositeAggregationBuilder;
import org.opensearch.search.aggregations.bucket.composite.CompositeValuesSourceBuilder;
import org.opensearch.search.aggregations.bucket.composite.TermsValuesSourceBuilder;
import org.opensearch.search.aggregations.metrics.AvgAggregationBuilder;
import org.opensearch.search.builder.SearchSourceBuilder;

import java.util.*;

/**
 * FrontWebPerfService에서 사용하는 웹 성능 관련 OpenSearch 쿼리를 생성하는 팩토리입니다.
 */
@Slf4j
public class FrontWebPerfFactory {
    private static final TypeReference<Map<String, Object>> typeRef = new TypeReference<>() {
    };

    /**
     * Web Vital 집계 조회 쿼리를 생성한다.
     *
     * @param dto 조회 조건 DTO
     * @return SearchRequest 객체
     */
    public static SearchRequest createVitalQuery(VitalRequestDto dto) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryForFront(dto);
        dto.addRangeToFilter(boolQuery, Elastic.logTm);

        AvgAggregationBuilder avgBuilder = new AvgAggregationBuilder(Elastic.SUB_AGGS_1).field(Elastic.value);
        CompositeAggregationBuilder composite = AggregationBuilders
                .composite(Elastic.RES, Collections.singletonList(new TermsValuesSourceBuilder(Elastic.name)
                        .field(Elastic.name)))
                .size(10)
                .subAggregation(avgBuilder);

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .aggregation(composite)
                .size(0);
        String[] indexes = ElasticIndex.getIndicesForDateRange(ElasticIndex.VITAL_LOG, dto.getFrom(), dto.getTo());
        return new SearchRequest(indexes).source(searchSourceBuilder);
    }

    /**
     * 페이지 성능 집계 리스트 조회 쿼리를 생성한다.
     *
     * @param size          페이지 사이즈
     * @param dto           조회 조건 DTO
     * @param markedUrlList 즐겨찾기 URL 목록
     * @return SearchRequest 객체
     */
    public static SearchRequest createPageAggregateListQuery(int size, PageAggregateListRequestDto dto, Set<String> markedUrlList) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryForFront(dto);
        dto.addRangeToFilter(boolQuery, Elastic.pageStartTm);

        // App Start 제외
        boolQuery.filter(QueryBuilders.termsQuery(Elastic.logType, MaxyLogType.WEB_PAGE_TYPES_SET));

        // 즐겨찾기 URL 필터
        if (markedUrlList != null && !markedUrlList.isEmpty()) {
            boolQuery.filter(QueryBuilders.termsQuery(Elastic.reqUrl_raw, markedUrlList));
        }

        // URL 검색(키워드 포함). 주의: leading wildcard는 비용이 큼
        if (dto.getReqUrl() != null && !dto.getReqUrl().isBlank()) {
            boolQuery.filter(QueryBuilders.wildcardQuery(Elastic.reqUrl_raw, "*" + dto.getReqUrl() + "*"));
        }

        // composite after_key 기반 집계: reqUrl별 버킷
        CompositeAggregationBuilder terms = AggregationBuilders
                .composite(Elastic.RES, Collections.singletonList(
                        new TermsValuesSourceBuilder(Elastic.reqUrl).field(Elastic.reqUrl_raw)))
                // lcp > 0 평균
                .subAggregation(
                        AggregationBuilders.filter("lcp_filter", QueryBuilders.rangeQuery(Elastic.lcp).gt(0))
                                .subAggregation(AggregationBuilders.avg("lcp_avg").field(Elastic.lcp))
                )
                // inp > 0 평균
                .subAggregation(
                        AggregationBuilders.filter("inp_filter", QueryBuilders.rangeQuery(Elastic.inp).gt(0))
                                .subAggregation(AggregationBuilders.avg("inp_avg").field(Elastic.inp))
                )
                // cls > 0 평균
                .subAggregation(
                        AggregationBuilders.filter("cls_filter", QueryBuilders.rangeQuery(Elastic.cls).gt(0))
                                .subAggregation(AggregationBuilders.avg("cls_avg").field(Elastic.cls))
                )
                // loadingTime 평균
                .subAggregation(AggregationBuilders.avg(Elastic.loadingTime).field(Elastic.loadingTime))
                // user count
                .subAggregation(AggregationBuilders.cardinality(Elastic.deviceId).field(Elastic.deviceId_raw))
                .size(size);

        // after_key 페이징
        if (dto.getAfterKey() != null && !dto.getAfterKey().isBlank()) {
            try {
                Map<String, Object> afterKey = JsonUtil.fromJson(dto.getAfterKey(), typeRef.getType());
                if (afterKey != null) {
                    terms.aggregateAfter(afterKey);
                }
            } catch (JsonSyntaxException e) {
                log.warn("{}: {}", e.getMessage(), dto.getAfterKey(), e);
            }
        }

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .aggregation(terms)
                .size(0);

        String[] indexes = ElasticIndex.getIndicesForDateRange(ElasticIndex.PAGE_LOG, dto.getFrom(), dto.getTo());
        return new SearchRequest(indexes).source(searchSourceBuilder);
    }

    /**
     * 비율 데이터 조회 쿼리를 생성한다.
     *
     * @param type 비율 데이터 타입
     * @param dto  조회 조건 DTO
     * @return SearchRequest 객체
     */
    public static SearchRequest createRatioListQuery(RatioRequestDto.DataType type, RatioRequestDto dto) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryForFront(dto);
        dto.addRangeToFilter(boolQuery, Elastic.pageStartTm);

        // App Start 제외
        boolQuery.filter(QueryBuilders.termsQuery(Elastic.logType, MaxyLogType.WEB_PAGE_TYPES_SET));

        boolean isVersion = false;
        String targetField = switch (type) {
            case BROWSER_VERSION -> {
                isVersion = true;
                yield Elastic.deviceModel; // BROWSER_VERSION: deviceModel + webviewVer 조합
            }
            case BROWSER -> Elastic.deviceModel;
            case PLATFORM -> Elastic.platform;
            case OS -> Elastic.osType;
        };

        List<CompositeValuesSourceBuilder<?>> termsSources = new ArrayList<>();
        termsSources.add(new TermsValuesSourceBuilder(targetField).field(targetField));
        if (isVersion) {
            termsSources.add(new TermsValuesSourceBuilder(Elastic.webviewVer).field(Elastic.webviewVer));
        }

        CompositeAggregationBuilder composite = AggregationBuilders
                .composite(Elastic.RES, termsSources)
                // lcp > 0 평균
                .subAggregation(
                        AggregationBuilders.filter("lcp_filter", QueryBuilders.rangeQuery(Elastic.lcp).gt(0))
                                .subAggregation(AggregationBuilders.avg("lcp_avg").field(Elastic.lcp))
                )
                // cls > 0 평균
                .subAggregation(
                        AggregationBuilders.filter("cls_filter", QueryBuilders.rangeQuery(Elastic.cls).gt(0))
                                .subAggregation(AggregationBuilders.avg("cls_avg").field(Elastic.cls))
                )
                // inp > 0 평균
                .subAggregation(
                        AggregationBuilders.filter("inp_filter", QueryBuilders.rangeQuery(Elastic.inp).gt(0))
                                .subAggregation(AggregationBuilders.avg("inp_avg").field(Elastic.inp))
                );

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .aggregation(composite);

        String[] indexes = ElasticIndex.getIndicesForDateRange(ElasticIndex.PAGE_LOG, dto.getFrom(), dto.getTo());
        SearchRequest searchRequest = new SearchRequest(indexes).source(searchSourceBuilder);
        log.debug("{}: {}", type.name(), searchRequest);
        return searchRequest;
    }

    public static SearchRequest createNetworkAggregateListQuery(int size, NetworkAggregateListRequestDto dto, Set<String> markedUrlList) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryForFront(dto);
        dto.addRangeToFilter(boolQuery, Elastic.logTm);

        // 즐겨찾기 URL 필터
        if (markedUrlList != null && !markedUrlList.isEmpty()) {
            boolQuery.filter(QueryBuilders.termsQuery(Elastic.reqUrl_raw, markedUrlList));
        }

        // URL 검색(키워드 포함). 주의: leading wildcard는 비용이 큼
        if (dto.getReqUrl() != null && !dto.getReqUrl().isBlank()) {
            boolQuery.filter(QueryBuilders.wildcardQuery(Elastic.reqUrl_raw, "*" + dto.getReqUrl() + "*"));
        }

        // composite after_key 기반 집계: reqUrl별 버킷
        CompositeAggregationBuilder terms = AggregationBuilders
                .composite(Elastic.RES, Collections.singletonList(
                        new TermsValuesSourceBuilder(Elastic.reqUrl).field(Elastic.reqUrl_raw)))
                // response time 평균
                .subAggregation(AggregationBuilders.avg(Elastic.intervaltime).field(Elastic.intervaltime))
                // 2xx count
                .subAggregation(
                        AggregationBuilders.filter("2xx", QueryBuilders.termQuery(Elastic.statusCodeGroup, "2xx"))
                )
                // 4xx count
                .subAggregation(
                        AggregationBuilders.filter("4xx", QueryBuilders.termQuery(Elastic.statusCodeGroup, "4xx"))
                )
                // 5xx count
                .subAggregation(
                        AggregationBuilders.filter("5xx", QueryBuilders.termQuery(Elastic.statusCodeGroup, "5xx"))
                )
                // user count
                .subAggregation(AggregationBuilders.cardinality(Elastic.deviceId).field(Elastic.deviceId_raw))
                .size(size);

        // after_key 페이징
        if (dto.getAfterKey() != null && !dto.getAfterKey().isBlank()) {
            try {
                Map<String, Object> afterKey = JsonUtil.fromJson(dto.getAfterKey(), typeRef.getType());
                if (afterKey != null) {
                    terms.aggregateAfter(afterKey);
                }
            } catch (JsonSyntaxException e) {
                log.warn("{}: {}", e.getMessage(), dto.getAfterKey(), e);
            }
        }

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .aggregation(terms)
                .size(0);

        String[] indexes = ElasticIndex.getIndicesForDateRange(ElasticIndex.NETWORK_LOG, dto.getFrom(), dto.getTo());
        return new SearchRequest(indexes).source(searchSourceBuilder);
    }

    public static SearchRequest createErrorAggregateListQuery(int size, ErrorAggregateListRequestDto dto, Set<String> markedUrlList) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryForFront(dto);
        dto.addRangeToFilter(boolQuery, Elastic.logTm);

        // 즐겨찾기 URL 필터
        if (markedUrlList != null && !markedUrlList.isEmpty()) {
            boolQuery.filter(QueryBuilders.termsQuery(Elastic.resMsg_raw, markedUrlList));
        }

        boolQuery.filter(QueryBuilders.termsQuery(Elastic.logType, MaxyLogType.FRONT_ERROR_TYPES_SET));

        // URL 검색(키워드 포함). 주의: leading wildcard는 비용이 큼
        if (dto.getResMsg() != null && !dto.getResMsg().isBlank()) {
            boolQuery.filter(QueryBuilders.wildcardQuery(Elastic.resMsg_raw, "*" + dto.getResMsg() + "*"));
        }

        // composite after_key 기반 집계: reqUrl별 버킷
        CompositeAggregationBuilder terms = AggregationBuilders
                .composite(Elastic.RES, Collections.singletonList(
                        new TermsValuesSourceBuilder(Elastic.resMsg).field(Elastic.resMsg_raw)))
//                // loadingTime 평균
//                .subAggregation(AggregationBuilders.avg(Elastic.intervaltime).field(Elastic.intervaltime))
                // user count
                .subAggregation(AggregationBuilders.cardinality(Elastic.deviceId).field(Elastic.deviceId_raw))
                .size(size);

        // after_key 페이징
        if (dto.getAfterKey() != null && !dto.getAfterKey().isBlank()) {
            try {
                Map<String, Object> afterKey = JsonUtil.fromJson(dto.getAfterKey(), typeRef.getType());
                if (afterKey != null) {
                    terms.aggregateAfter(afterKey);
                }
            } catch (JsonSyntaxException e) {
                log.warn("{}: {}", e.getMessage(), dto.getAfterKey(), e);
            }
        }

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .aggregation(terms)
                .size(0);

        String[] indexes = ElasticIndex.getIndicesForDateRange(ElasticIndex.TROUBLE_LOG, dto.getFrom(), dto.getTo());
        return new SearchRequest(indexes).source(searchSourceBuilder);
    }
}
