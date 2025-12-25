package com.thinkm.maxy.service.app.factory;

import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.util.Elastic;
import com.thinkm.maxy.repository.ModelRepository;
import com.thinkm.maxy.vo.AppInfoVO;
import com.thinkm.maxy.vo.LogRequestVO;
import com.thinkm.maxy.vo.LogVO;
import org.jetbrains.annotations.NotNull;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;
import org.opensearch.index.query.RangeQueryBuilder;
import org.opensearch.search.builder.SearchSourceBuilder;
import org.opensearch.search.sort.SortOrder;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class LogAnalysisQueryFactory {
    @NotNull
    public static SearchRequest createRealTimeLogListRequest(LogVO vo, ModelRepository modelRepository) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));

        // osType & appVer 조건 추가
        if (vo.getOsVerList() != null && !vo.getOsVerList().isEmpty()) {
            // osType 별로 appVer 를 terms 쿼리로 검색한다.
            Map<String, List<String>> groupedOsType = vo.getOsVerList().stream()
                    .collect(Collectors.groupingBy(
                            AppInfoVO::getOsType,
                            Collectors.mapping(AppInfoVO::getAppVer, Collectors.toList())
                    ));

            for (Map.Entry<String, List<String>> entry : groupedOsType.entrySet()) {
                boolQuery.should(
                        QueryBuilders.boolQuery()
                                .filter(QueryBuilders.termQuery("osType", entry.getKey()))
                                .filter(QueryBuilders.termsQuery("appVer", entry.getValue()))
                );
            }
            boolQuery.minimumShouldMatch(1);
        }

        // "range" 쿼리
        RangeQueryBuilder logTmRangeQuery = QueryBuilders.rangeQuery("logTm")
                .gte(vo.getFrom())
                .lte(vo.getTo())
                .timeZone("Z");
        boolQuery.filter(logTmRangeQuery);

        // 검색 조건 추가 (Text)
        if (!vo.getSearchKey().isEmpty()) {
            if (vo.getSearchValue() != null && !vo.getSearchValue().isEmpty()) {
                String postfix = "";
                // keyword 검색을 위해 .raw 를 붙여준다.
                if (vo.getSearchKey().equalsIgnoreCase(Elastic.deviceId)
                    || vo.getSearchKey().equalsIgnoreCase(Elastic.userId)
                    || vo.getSearchKey().equalsIgnoreCase(Elastic.reqUrl)) {
                    postfix = ".raw";
                }

                if (vo.getSearchKey().equalsIgnoreCase(Elastic.deviceModel)) {
                    // deviceModel 정보를 받아와 해당하는 Model Identifier set 을 terms 쿼리 한다. (should)
                    boolQuery.filter(QueryBuilders.termsQuery(Elastic.deviceModel, modelRepository.search(vo.getSearchValue())));
                } else if (vo.getSearchKey().equalsIgnoreCase("reqUrl")) {
                    // reqUrl 은 wildcard 쿼리를 사용해서 like 검색을 한다.
                    boolQuery.filter(QueryBuilders.wildcardQuery(vo.getSearchKey() + postfix,
                            URLDecoder.decode("*" + vo.getSearchValue() + "*", StandardCharsets.UTF_8)));
                } else {
                    // 그 외 일반 쿼리는 term 쿼리를 한다. (equal)
                    boolQuery.filter(QueryBuilders.termQuery(vo.getSearchKey() + postfix,
                            URLDecoder.decode(vo.getSearchValue(), StandardCharsets.UTF_8)));
                }
            }
        }
        // 검색 조건 추가 (Vip)
        if (vo.getSearchVipYn() != null && !vo.getSearchVipYn().isEmpty()) {
            boolQuery.filter(QueryBuilders.termQuery("vipYn",
                    "vip".equals(vo.getSearchVipYn()) ? "Y" : "N"));
        }

        // 검색 조건 추가 (Log Type)
        List<String> logTypes = vo.getSearchLogType();
        if (logTypes != null && !logTypes.isEmpty()) {
            List<String> filteredLogTypes = logTypes.stream()
                    .filter(s -> s != null && !s.isBlank())
                    .collect(Collectors.toList());

            if (!filteredLogTypes.isEmpty()) {
                boolQuery.filter(QueryBuilders.termsQuery(Elastic.logType, filteredLogTypes));
            }
        }

        // SearchSourceBuilder 생성 및 쿼리 추가
        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder();
        searchSourceBuilder.query(boolQuery);

        // size 설정
        searchSourceBuilder.size(vo.getSize());

        // sort 설정
        searchSourceBuilder.sort("logTm", SortOrder.DESC);
        searchSourceBuilder.sort("deviceId.raw", SortOrder.DESC);
        searchSourceBuilder.sort("logType", SortOrder.DESC);

        // search_after 설정
        if (vo.getOffsetIndex() > 1) {
            searchSourceBuilder.searchAfter(new Object[]{
                    vo.getLastLogTm(),
                    vo.getLastDeviceId(),
                    vo.getLastLogType()
            });
        }

        searchSourceBuilder.fetchSource(new String[]{
                "seq",
                "deviceId",
                "packageNm",
                "logTm",
                "logType",
                "serverType",
                "osType",
                "osVer",
                "appVer",
                "deviceModel",
                "reqUrl",
                "aliasValue",
                "pageUrl",
                "resMsg",
                "intervaltime",
                "loginYn",
                "userId",
                "clientNo",
        }, null);

        // SearchRequest에 인덱스와 검색 조건 설정
        SearchRequest searchRequest = new SearchRequest(ElasticIndex.getIndicesForDateRange(ElasticIndex.TOTAL_LOG, vo.getFrom())); // 인덱스 이름 설정
        searchRequest.source(searchSourceBuilder);

        return searchRequest;
    }

    public static SearchRequest createLogStackListQuery(
            LogRequestVO vo,
            String type
    ) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(vo);
        boolQuery.filter(QueryBuilders.termQuery(Elastic.deviceId_raw, vo.getDeviceId()));

        int size;
        SortOrder sortOrder;
        if ("before".equalsIgnoreCase(type)) {
            // 검색 로그 포함 + 이전 로그 10건
            size = 11;
            sortOrder = SortOrder.DESC;
            boolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm).lte(vo.getLogTm()).timeZone("Z"));
        } else {
            size = 10;
            sortOrder = SortOrder.ASC;
            boolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm).gt(vo.getLogTm()).timeZone("Z"));
        }
        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .size(size)
                .sort(Elastic.logTm, sortOrder);

        return new SearchRequest(ElasticIndex.getIndicesForDateRange(ElasticIndex.TOTAL_LOG, vo.getLogTm()))
                .source(searchSourceBuilder);
    }
}
