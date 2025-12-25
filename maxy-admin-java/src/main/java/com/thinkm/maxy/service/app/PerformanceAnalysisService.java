package com.thinkm.maxy.service.app;

import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.code.MaxyLogType;
import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.code.StatisticsInfo;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.DateUtil;
import com.thinkm.common.util.Elastic;
import com.thinkm.common.util.ElasticClient;
import com.thinkm.maxy.vo.DashboardVO;
import com.thinkm.maxy.vo.LogRequestVO;
import com.thinkm.maxy.vo.LogVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.text.StringEscapeUtils;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.action.search.SearchResponse;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;
import org.opensearch.search.SearchHit;
import org.opensearch.search.aggregations.AggregationBuilders;
import org.opensearch.search.aggregations.Aggregations;
import org.opensearch.search.aggregations.bucket.histogram.DateHistogramAggregationBuilder;
import org.opensearch.search.aggregations.bucket.histogram.DateHistogramInterval;
import org.opensearch.search.aggregations.bucket.histogram.Histogram;
import org.opensearch.search.aggregations.bucket.histogram.ParsedDateHistogram;
import org.opensearch.search.aggregations.bucket.terms.ParsedLongTerms;
import org.opensearch.search.aggregations.bucket.terms.ParsedStringTerms;
import org.opensearch.search.aggregations.bucket.terms.Terms;
import org.opensearch.search.aggregations.metrics.ParsedTDigestPercentiles;
import org.opensearch.search.aggregations.metrics.ParsedTopHits;
import org.opensearch.search.aggregations.metrics.Percentile;
import org.opensearch.search.aggregations.metrics.PercentilesAggregationBuilder;
import org.opensearch.search.builder.SearchSourceBuilder;
import org.opensearch.search.sort.SortOrder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.stream.Collectors;

@SuppressWarnings("unchecked")
@Service
@Slf4j
@RequiredArgsConstructor
public class PerformanceAnalysisService {
    private final ElasticClient elasticClient;
    private final RedisService redisService;

    // true 면 response time 팝업 데이터에 조회 시 top, bot 값에 대한 범위 조건을 준다.
    @Value("${maxy.response-slice-threshold:false}")
    private Boolean isResponseSliceThreshold;
    // response time 팝업 데이터에 조회 시 histogram interval 값
    @Value("${maxy.response-aggs-interval:50}")
    private Integer responseAggsInterval;
    // userId masking 여부
    @Value("${maxy.userid-masking:false}")
    private boolean isUseridMasking;

    @SuppressWarnings("rawtypes")
    protected static void putFeeldex(String type, Map<String, Long> avgMap, List list) {
        int errorCnt = 0;
        String errorMsg = null;
        for (Object o : list) {
            int feeldex = -1;
            Map<String, Object> map = (Map<String, Object>) o;
            try {
                String key = type;
                if ("response".equalsIgnoreCase(type)) {
                    key = "intervaltime";
                } else {
                    key = key + "Time";
                }
                int time = (int) map.get(key);
                String osType = (String) map.get("osType");
                long standard = avgMap.get(osType);
                feeldex = CommonUtil.feeldex(standard, time);
            } catch (Exception e) {
                errorMsg = e.getMessage();
                errorCnt++;
            }
            map.put("feeldex", feeldex);
        }
        if (errorCnt > 0) {
            log.error("errorCnt: {}, errorMsg: {}", errorCnt, errorMsg);
        }
    }

    public List<Map<String, Object>> getLoadingTimeList(DashboardVO vo) {
        List<Map<String, Object>> result = new ArrayList<>();

        Map<String, Object> queryParams = new HashMap<>();
        Map<String, Boolean> dynamicParams = new HashMap<>();
        queryParams.put("packageNm", vo.getPackageNm());
        queryParams.put("serverType", vo.getServerType());
        queryParams.put("osType", vo.getOsType());
        queryParams.put("from", vo.getFrom());
        queryParams.put("to", vo.getTo());
        dynamicParams.put("isOsType", vo.checkOsType());

        String indexMonth = DateUtil.timestampToDate(vo.getFrom(), DateUtil.MONTH_PATTERN);

        Elastic elastic = Elastic.builder()
                .method(Elastic.POST)
                .index(ElasticIndex.PAGE_LOG.getIndex() + indexMonth + "*")
                .api(Elastic._SEARCH)
                .queryFile("pa/loading-time-list.json")
                .queryParams(queryParams)
                .dynamicParams(dynamicParams)
                .build();
        try {
            Map<String, Object> q = elasticClient.get(elastic);
            Object res = q.get("res");
            if (res instanceof Map) {
                return result;
            }
            result = (List<Map<String, Object>>) q.get("res");
            putFeeldex(vo.getType(), vo.getAvgMap(), result);
            // time 기준 내림차순 정렬
            result.sort((mapA, mapB) -> {
                Long timeA = (Long) mapA.get("pageEndTm");
                Long timeB = (Long) mapB.get("pageEndTm");
                return timeB.compareTo(timeA); // 내림차순 정렬
            });

            return result;
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return new ArrayList<>();
        }
    }

    public List<Map<String, Object>> getLoadingTimeDetailList(LogVO vo, String type) {
        List<Map<String, Object>> result = new ArrayList<>();
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));
        String reqUrl = StringEscapeUtils.unescapeJson(vo.getReqUrl());
        boolQuery.filter(QueryBuilders.termQuery(Elastic.reqUrl_raw, reqUrl))
                .filter(QueryBuilders.rangeQuery(Elastic.pageEndTm).gte(vo.getFrom()).lte(vo.getTo()).timeZone("Z"));

        // Core Vital일 경우 네이티브 페이지 안보여줌
        if ("corevital".equalsIgnoreCase(type)) {
            boolQuery.filter(QueryBuilders.termQuery(Elastic.logType, MaxyLogType.T_WebNav_Start.getDecimal()));
        } else {
            boolQuery.filter(QueryBuilders.termsQuery(Elastic.logType, MaxyLogType.WEB_PAGE_TYPES_SET));
        }

        if (vo.getDurationFrom() != null && vo.getDurationTo() != null
            && vo.getDurationFrom() > 0 && vo.getDurationTo() > 0) {
            boolQuery.filter(QueryBuilders.rangeQuery(Elastic.loadingTime)
                    .gte(vo.getDurationFrom())
                    .lte(vo.getDurationTo()));
        }

        if (vo.checkAppVer()) {
            boolQuery.filter(QueryBuilders.termQuery(Elastic.appVer, vo.getAppVer()));
        }

        if (vo.getDeviceModel() != null) {
            boolQuery.filter(QueryBuilders.termQuery(Elastic.deviceModel, vo.getDeviceModel()));
        }

        if (CommonUtil.isValidString(vo.getSearchValue())) {
            String value = vo.getSearchValue();
            if ("deviceId".equals(vo.getSearchKey())) {
                boolQuery.filter(QueryBuilders.termQuery(Elastic.deviceId_raw, value));
            } else if ("userNm".equals(vo.getSearchKey())) {
                boolQuery.filter(QueryBuilders.termQuery(Elastic.userNm_raw, value));
            } else if ("userId".equals(vo.getSearchKey())) {
                boolQuery.filter(QueryBuilders.termQuery(Elastic.userId_raw, value));
            }
        }

//        String[] indices = ElasticIndex.getIndicesForDateRange(ElasticIndex.DEVICE_PAGE_FLOW, vo.getFrom(), vo.getTo());

        String[] sources = new String[]{
                Elastic.packageNm,
                Elastic.serverType,
                Elastic.osType,
                Elastic.osVer,
                Elastic.appVer,
                Elastic.pageStartTm,
                Elastic.pageEndTm,
                Elastic.deviceModel,
                Elastic.deviceId,
                Elastic.reqUrl,
                Elastic.logType,
                Elastic.pageUrl,
                Elastic.resMsg,
                Elastic.logName,
                Elastic.intervaltime,
                Elastic.loadingTime,
                Elastic.loginYn,
                Elastic.userId,
                Elastic.wtfFlag,
                Elastic.timeZone,
                Elastic.simOperatorNm,
                Elastic.comType,
                Elastic.comSensitivity,
                Elastic.avgComSensitivity,
                Elastic.lcp,
                Elastic.fcp,
                Elastic.inp,
                Elastic.cls,
                Elastic.mxPageId,

                // for hana bank
                Elastic.userNm,
                Elastic.userNo,
                Elastic.clientNo,
                Elastic.clientNm,
                Elastic.bizCode,
                Elastic.bizSubCode,
                Elastic.birthDay,
        };

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .size(1000)
                .fetchSource(sources, null)
                .sort(Elastic.pageEndTm, SortOrder.DESC);

        SearchRequest searchRequest = new SearchRequest(ElasticIndex.PAGE_LOG.getIndex() + "*")
                .source(searchSourceBuilder);

        log.debug(searchRequest.toString());

        try {
            SearchResponse searchResponse = elasticClient.get(searchRequest);
            if (searchResponse == null) {
                return result;
            }

            for (SearchHit hit : searchResponse.getHits()) {
                result.add(Elastic.convertHit(hit));
            }

            // mxPageId가 있는 경우 VITAL_LOG 데이터 조회 및 매핑
            enrichWithPerfLogData(result, vo);

            putFeeldex(vo.getType(), vo.getAvgMap(), result);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        return result;
    }

    /**
     * PAGE_LOG 결과에서 mxPageId를 추출하여 VITAL_LOG 데이터를 조회하고 vital정보를 mxPageId 기준으로 매핑
     *
     * @param pageLogResults PAGE_LOG 조회 결과
     * @param vo             조회 조건
     */
    private void enrichWithPerfLogData(List<Map<String, Object>> pageLogResults, LogVO vo) {
        if (pageLogResults.isEmpty()) {
            return;
        }

        // mxPageId 수집
        Set<String> mxPageIds = pageLogResults.stream()
                .map(result -> result.get(Elastic.mxPageId))
                .filter(Objects::nonNull)
                .map(Object::toString)
                .filter(id -> !id.isBlank())
                .collect(Collectors.toSet());

        if (mxPageIds.isEmpty()) {
            return;
        }

        // VITAL_LOG에서 mxPageId로 bulk 조회
        Map<String, Map<String, Object>> vitalLogMap = queryVitalLogByMxPageIds(mxPageIds, vo);

        // vital 필드 매핑 테이블
        Map<String, String> vitalFieldMapping = Map.of(
                "LCP", Elastic.lcp,
                "INP", Elastic.inp,
                "CLS", Elastic.cls,
                "FCP", Elastic.fcp
        );

        // 결과 매핑
        for (Map<String, Object> pageResult : pageLogResults) {
            Object mxPageIdObj = pageResult.get(Elastic.mxPageId);
            if (mxPageIdObj == null) {
                continue;
            }

            String mxPageId = mxPageIdObj.toString();
            if (mxPageId.isBlank()) {
                continue;
            }

            // vital 필드 초기화
            vitalFieldMapping.values().forEach(field -> pageResult.put(field, null));

            // VITAL_LOG 데이터가 있으면 매핑
            Map<String, Object> vitalData = vitalLogMap.get(mxPageId);
            if (vitalData != null) {
                vitalFieldMapping.forEach((vitalKey, elasticField) -> {
                    Object value = vitalData.get(vitalKey);
                    if (value != null) {
                        pageResult.put(elasticField, value);
                    }
                });
            }
        }
    }

    /**
     * VITAL_LOG 인덱스에서 mxPageId 목록으로 데이터 조회
     * 동일한 mxPageId와 name에 대해 logTm이 가장 늦은(최신) 데이터만 조회
     *
     * @param mxPageIds mxPageId 목록
     * @param vo        조회 조건 (from, to, packageNm, serverType, osType)
     * @return mxPageId를 key로 하고, name(LCP, INP, CLS, FCP)을 key로 하는 value 맵
     */
    private Map<String, Map<String, Object>> queryVitalLogByMxPageIds(Set<String> mxPageIds, LogVO vo) {
        Map<String, Map<String, Object>> resultMap = new HashMap<>();

        try {
            // 쿼리 조건 구성
            BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));
            boolQuery.filter(QueryBuilders.termsQuery(Elastic.mxPageId, mxPageIds))
                    .filter(QueryBuilders.termsQuery(Elastic.name, "LCP", "INP", "CLS", "FCP"));

            String[] indices = ElasticIndex.getIndicesForDateRange(ElasticIndex.VITAL_LOG, vo.getFrom(), vo.getTo());

            // Aggregation 구성: mxPageId별 -> name별 -> logTm 최신 1건
            SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                    .query(boolQuery)
                    .size(0)
                    .aggregation(
                            AggregationBuilders.terms("by_mxPageId")
                                    .field(Elastic.mxPageId)
                                    .size(mxPageIds.size())
                                    .subAggregation(
                                            AggregationBuilders.terms("by_name")
                                                    .field(Elastic.name)
                                                    .size(4)
                                                    .subAggregation(
                                                            AggregationBuilders.topHits("latest")
                                                                    .size(1)
                                                                    .sort(Elastic.logTm, SortOrder.DESC)
                                                                    .fetchSource(new String[]{Elastic.value}, null)
                                                    )
                                    )
                    );

            // 쿼리 실행
            SearchRequest searchRequest = new SearchRequest(indices).source(searchSourceBuilder);
            SearchResponse searchResponse = elasticClient.get(searchRequest);

            if (searchResponse == null || searchResponse.getAggregations() == null) {
                return resultMap;
            }

            // 결과 파싱
            ParsedLongTerms mxPageIdBuckets = searchResponse.getAggregations().get("by_mxPageId");

            for (Terms.Bucket mxPageIdBucket : mxPageIdBuckets.getBuckets()) {
                String mxPageId = String.valueOf(mxPageIdBucket.getKey());
                Map<String, Object> vitalData = new HashMap<>(4);

                ParsedStringTerms nameBuckets = mxPageIdBucket.getAggregations().get("by_name");

                for (Terms.Bucket nameBucket : nameBuckets.getBuckets()) {
                    String name = nameBucket.getKeyAsString().toUpperCase();

                    ParsedTopHits topHits = nameBucket.getAggregations().get("latest");

                    SearchHit[] hits = topHits.getHits().getHits();
                    if (hits.length > 0) {
                        Object value = hits[0].getSourceAsMap().get(Elastic.value);
                        if (value != null) {
                            vitalData.put(name, value);
                        }
                    }
                }

                if (!vitalData.isEmpty()) {
                    resultMap.put(mxPageId, vitalData);
                }
            }
        } catch (Exception e) {
            log.error("Error querying VITAL_LOG: {}", e.getMessage(), e);
        }

        return resultMap;
    }

    /**
     * redis 에서 appInfo 를 기반으로 한 response / loading avg 값 조회
     *
     * @param type       loading / response
     * @param packageNm  앱 명
     * @param serverType 서버 유형
     * @return osType 과 매핑된 avg 값
     */
    public Map<String, Long> getAvgValueByAppInfo(String type, String packageNm, String serverType) {
        Map<String, Long> resultMap = new HashMap<>();
        try {
            StatisticsInfo statisticsType = null;
            if ("loading".equalsIgnoreCase(type)) {
                statisticsType = StatisticsInfo.AVG_LOADING_TIME;
            } else if ("response".equalsIgnoreCase(type)) {
                statisticsType = StatisticsInfo.AVG_RESPONSE_TIME;
            }
            if (statisticsType == null) {
                log.warn("wrong type: {}", type);
                return resultMap;
            }

            String pattern = String.join(":", StatisticsInfo.redisKey,
                    packageNm,
                    serverType,
                    "*",
                    statisticsType.getKey());

            Set<String> keys = redisService.keys(pattern);
            if (keys.isEmpty()) {
                return resultMap;
            }

            // Using a pipeline to get the values in bulk
            List<Object> values = redisService.get(keys);

            int i = 0;
            for (String key : keys) {
                String osType = key.split(":")[3];
                resultMap.put(osType, CommonUtil.toLong(values.get(i++)));
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
        return resultMap;
    }

    public List<Map<String, Object>> getResponseTimeList(DashboardVO vo) {
        List<Map<String, Object>> result = Collections.synchronizedList(new ArrayList<>());

        try {
            Map<String, Object> query = new HashMap<>();
            Map<String, Boolean> dynamic = new HashMap<>();

            query.put("packageNm", vo.getPackageNm());
            query.put("serverType", vo.getServerType());
            query.put("osType", vo.getOsType());

            query.put("from", vo.getFrom());
            query.put("to", vo.getTo());

            dynamic.put("isOsType", vo.checkOsType());
            String indexDate = DateUtil.timestampToDate(vo.getFrom(), DateUtil.DATE_PATTERN);

            Elastic elastic = Elastic.builder()
                    .method(Elastic.POST)
                    .queryParams(query)
                    .dynamicParams(dynamic)
                    .index(ElasticIndex.NETWORK_LOG.getIndex() + indexDate)
                    .api(Elastic._SEARCH)
                    .queryFile("pa/response-time-list.json")
                    .build();
            Map<String, Object> q = elasticClient.get(elastic);
            Object res = q.get("res");
            if (res instanceof Map) {
                return result;
            }
            result = (List<Map<String, Object>>) q.get("res");
            for (Map<String, Object> map : result) {
                map.put("responseTime", map.get("intervaltime"));
                map.put("logDate", map.get("logTm"));
            }
            putFeeldex(vo.getType(), vo.getAvgMap(), result);
            // time 기준 내림차순 정렬
            result.sort((mapA, mapB) -> {
                Long timeA = (Long) mapA.get("logTm");
                Long timeB = (Long) mapB.get("logTm");
                return timeB.compareTo(timeA); // 내림차순 정렬
            });
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        return result;
    }

    public Map<String, Long> getResponseTopBot(BoolQueryBuilder boolQuery) {
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.intervaltime).gte(0));

        // Aggregation 생성
        PercentilesAggregationBuilder aggs = AggregationBuilders
                .percentiles(Elastic.RES)
                .field(Elastic.intervaltime)
                .percentiles(5, 95);

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .size(0)
                .aggregation(aggs);

        SearchRequest searchRequest = new SearchRequest(ElasticIndex.NETWORK_LOG.getIndex() + "*")
                .source(searchSourceBuilder);

        SearchResponse response = elasticClient.get(searchRequest);
        if (response == null) {
            return new HashMap<>();
        }

        Map<String, Long> result = new HashMap<>();
        Aggregations aggregations = response.getAggregations();
        ParsedTDigestPercentiles buckets = aggregations.get(Elastic.RES);
        for (Percentile bucket : buckets) {
            double d = bucket.getPercent();
            double v = bucket.getValue();
            result.put(d == 5 ? "top" : "bot", (long) v);
        }

        return result;
    }

    public Map<Integer, Integer> getResponseTimeData(BoolQueryBuilder boolQuery, Map<String, Long> topBotMap) {
        LinkedHashMap<Integer, Integer> result = new LinkedHashMap<>();
        // 설정에서 analysis.response-slice-threshold 값이 true 면 top, bot 값에 대한 범위 조건을 준다.
        if (isResponseSliceThreshold) {
            Long top = topBotMap.get("top");
            Long bot = topBotMap.get("bot");

            if (top != null && bot != null && !top.equals(bot)) {
                boolQuery.filter(QueryBuilders.rangeQuery(Elastic.intervaltime).gte(top).lte(bot));
            }
        }

        DateHistogramAggregationBuilder aggregationBuilder = new DateHistogramAggregationBuilder(Elastic.RES)
                .field(Elastic.intervaltime)
                .fixedInterval(new DateHistogramInterval(responseAggsInterval + "ms"));

        SearchSourceBuilder sourceBuilder = new SearchSourceBuilder()
                .size(0)
                .query(boolQuery)
                .aggregation(aggregationBuilder);

        SearchRequest searchRequest = new SearchRequest(ElasticIndex.NETWORK_LOG.getIndex() + "*")
                .source(sourceBuilder);
        SearchResponse response = elasticClient.get(searchRequest);
        if (response == null) {
            return new HashMap<>();
        }

        ParsedDateHistogram buckets = response.getAggregations().get(Elastic.RES);
        for (Histogram.Bucket bucket : buckets.getBuckets()) {
            Integer time = Integer.valueOf(bucket.getKeyAsString());
            Integer count = Math.toIntExact(bucket.getDocCount());
            result.put(time, count);
        }

        return result;
    }

    /**
     * 오늘 일자의 Response time warning 데이터
     *
     * @param vo optResponsetimescatterSize, optLoadingtimescatterSize
     * @return warning data lise
     */
    public List<Map<String, Object>> getWarningIntervaltimeData(DashboardVO vo) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));

        long from = DateUtil.todayToTimestamp(true);
        long to = ZonedDateTime.now(ZoneId.of("Asia/Seoul")).toInstant().toEpochMilli();

        // 인덱스
        String[] indices;
        // page, log의 time field 가 서로 다름
        String timeRangeField;
        // page, log의 intervaltime field 가 서로 다름
        String intervaltimeField;
        // 임계치
        Integer limit;
        String type;
        switch (vo.getRequestType()) {
            case RESPONSE_TIME_SCATTER -> {
                type = "response";
                limit = vo.getOptResponsetimescatterRange();
                intervaltimeField = Elastic.intervaltime;
                indices = ElasticIndex.getIndicesForDateRange(ElasticIndex.NETWORK_LOG, from, to);
                timeRangeField = Elastic.logTm;

                boolQuery.filter(QueryBuilders.termsQuery(Elastic.logType, MaxyLogType.NETWORK_TYPES_SET));
            }
            case LOADING_TIME_SCATTER -> {
                type = "loading";
                limit = vo.getOptLoadingtimescatterRange();
                intervaltimeField = Elastic.loadingTime;
                indices = ElasticIndex.getIndicesForDateRange(ElasticIndex.PAGE_LOG, from, to);
                timeRangeField = Elastic.pageEndTm;
            }
            default -> throw new BadRequestException(ReturnCode.ERR_WRONG_PARAMS);
        }
        vo.setType(type);

        // warning 값 이상의 데이터 조건
        boolQuery.filter(QueryBuilders.rangeQuery(intervaltimeField).gte(limit));

        // 오늘 날짜 제한
        boolQuery.filter(QueryBuilders.rangeQuery(timeRangeField).gte(from).lte(to).timeZone("Z"));

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .sort(intervaltimeField, SortOrder.DESC)
                .fetchSource(new String[]{
                        Elastic.packageNm,
                        Elastic.serverType,
                        Elastic.osType,
                        Elastic.osVer,
                        Elastic.appVer,
                        Elastic.logTm,
                        Elastic.pageStartTm,
                        Elastic.pageEndTm,
                        Elastic.deviceModel,
                        Elastic.deviceId,
                        Elastic.reqUrl,
                        Elastic.logType,
                        Elastic.pageUrl,
                        Elastic.resMsg,
                        Elastic.logName,
                        Elastic.intervaltime,
                        Elastic.loadingTime,
                        Elastic.loginYn,
                        Elastic.userId,
                        Elastic.wtfFlag,
                        Elastic.comSensitivity,
                        Elastic.avgComSensitivity,

                        // for hana bank
                        Elastic.userNm,
                        Elastic.userNo,
                        Elastic.clientNo,
                        Elastic.clientNm,
                        Elastic.bizCode,
                        Elastic.bizSubCode,
                        Elastic.birthDay,
                }, null)
                .size(1000);
        SearchRequest searchRequest = new SearchRequest(indices).source(searchSourceBuilder);

        List<Map<String, Object>> results = new ArrayList<>();
        SearchResponse searchResponse = elasticClient.get(searchRequest);
        if (searchResponse == null) {
            return results;
        }

        searchResponse.getHits().forEach(hit -> {
            Map<String, Object> tmp = hit.getSourceAsMap();
            tmp.put("_id", hit.getId());
            if ("loading".equalsIgnoreCase(type)) {
                tmp.put(Elastic.logTm, tmp.get(Elastic.pageEndTm));
                tmp.put(Elastic.intervaltime, tmp.get(Elastic.loadingTime));
            }
            results.add(tmp);
        });

        CommonUtil.maskUserId(results, isUseridMasking, 2);

        Map<String, Long> avgMap = getAvgValueByAppInfo(vo.getType(), vo.getPackageNm(), vo.getServerType());
        putFeeldex(vo.getType(), avgMap, results);

        return results;
    }
}

