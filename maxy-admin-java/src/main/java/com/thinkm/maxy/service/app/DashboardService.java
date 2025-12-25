package com.thinkm.maxy.service.app;

import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.code.MaxyLogType;
import com.thinkm.common.code.RequestType;
import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.exception.AuthException;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.util.*;
import com.thinkm.maxy.mapper.DashboardMapper;
import com.thinkm.maxy.service.app.factory.DashboardQueryFactory;
import com.thinkm.maxy.service.common.helper.CommonServiceHelper;
import com.thinkm.maxy.service.app.helper.DashboardServiceHelper;
import com.thinkm.maxy.vo.DashboardComponentVO;
import com.thinkm.maxy.vo.DashboardVO;
import com.thinkm.maxy.vo.DashboardVO.DateType;
import com.thinkm.maxy.vo.LogRequestVO;
import com.thinkm.maxy.vo.MaxyUser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.lucene.search.TotalHits;
import org.opensearch.action.search.MultiSearchRequest;
import org.opensearch.action.search.MultiSearchResponse;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.action.search.SearchResponse;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;
import org.opensearch.index.query.SimpleQueryStringBuilder;
import org.opensearch.index.query.TermQueryBuilder;
import org.opensearch.script.Script;
import org.opensearch.search.SearchHit;
import org.opensearch.search.SearchHits;
import org.opensearch.search.aggregations.AggregationBuilders;
import org.opensearch.search.aggregations.BucketOrder;
import org.opensearch.search.aggregations.bucket.composite.CompositeAggregationBuilder;
import org.opensearch.search.aggregations.bucket.composite.ParsedComposite;
import org.opensearch.search.aggregations.bucket.composite.TermsValuesSourceBuilder;
import org.opensearch.search.aggregations.bucket.filter.Filters;
import org.opensearch.search.aggregations.bucket.filter.FiltersAggregationBuilder;
import org.opensearch.search.aggregations.bucket.filter.FiltersAggregator;
import org.opensearch.search.aggregations.bucket.filter.ParsedFilter;
import org.opensearch.search.aggregations.bucket.histogram.*;
import org.opensearch.search.aggregations.bucket.terms.ParsedStringTerms;
import org.opensearch.search.aggregations.bucket.terms.ParsedTerms;
import org.opensearch.search.aggregations.bucket.terms.Terms;
import org.opensearch.search.aggregations.bucket.terms.TermsAggregationBuilder;
import org.opensearch.search.aggregations.metrics.*;
import org.opensearch.search.builder.SearchSourceBuilder;
import org.opensearch.search.sort.SortBuilders;
import org.opensearch.search.sort.SortOrder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.servlet.http.HttpServletRequest;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Matcher;
import java.util.stream.Collectors;

import static com.thinkm.common.code.ReturnCode.ERR_DATA_LOAD;

@SuppressWarnings("unchecked")
@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final ElasticClient elasticClient;
    private final DashboardMapper dashboardMapper;
    private final RedisService redisService;
    private final DashboardConfigService dashboardConfigService;

    @Value("${maxy.userid-masking:false}")
    private boolean userIdMasking;

    private static void addEmptyData(DashboardVO vo, String osType, String appVer, List<Map<String, Object>> result) {
        Map<String, Object> tmp = new HashMap<>();
        tmp.put("packageNm", vo.getPackageNm());
        tmp.put("serverType", vo.getServerType());
        tmp.put("osType", osType);
        tmp.put("appVer", appVer);
        tmp.put("dau", 0);
        tmp.put("install", 0);
        tmp.put("error", 0);
        tmp.put("crash", 0);
        tmp.put("loadingTime", 0.0);
        tmp.put("responseTime", 0.0);

        result.add(tmp);
    }

    /**
     * 최근 3일간 response, loading time 의 중위값 조회
     *
     * @param vo app 정보 및 deviceModel / reqUrl
     * @return {loadingTime, responseTime}
     */
    public Map<String, Object> getMedResponseAndLoadingTime(DashboardVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(), vo.getOsType());

        SearchRequest searchRequest = DashboardQueryFactory.createMedResponseAndLoadingTimeQuery(vo);

        try {
            SearchResponse response = elasticClient.get(searchRequest);
            return DashboardServiceHelper.parseMedTimeVal(response);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return Map.of(Elastic.loadingTime, 0, Elastic.responseTime, 0);
        }
    }

    public DashboardVO getDashboardBasicConfig(DashboardVO vo) throws BadRequestException {
        return dashboardMapper.selectBiUseInfo(vo);
    }

    public void addDashboardBasicConfig(DashboardVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getPackageNm(), vo.getServerType());
        dashboardMapper.insertBiUseInfo(vo);
    }

    public Map<String, Map<String, Map<String, Object>>> getDailyTrendInfo(DashboardVO vo) {
        List<DashboardVO> result = dashboardMapper.selectDailyBiDayInfoList(vo);

        // baseDate, osType 별로 그룹화
        Map<String, Map<String, Map<String, Object>>> groupedData = new HashMap<>();
        for (DashboardVO d : result) {
            String baseDate = d.getBaseDate();
            String osType = d.getOsType();

            Map<String, Map<String, Object>> baseDateMap = groupedData.getOrDefault(baseDate, new HashMap<>());
            Map<String, Object> osTypeMap = baseDateMap.getOrDefault(osType, new HashMap<>());
            osTypeMap.put("appInstallCount", d.getAppInstallCount());
            osTypeMap.put("appDeleteCount", d.getAppDeleteCount());

            osTypeMap.put("appIosConnectCount", d.getAppIosConnectCount());
            osTypeMap.put("appAndroidConnectCount", d.getAppAndroidConnectCount());
            osTypeMap.put("appOtherOsConnectCount", d.getAppOtherOsConnectCount());

            osTypeMap.put("appConnectCount", d.getAppConnectCount());
            osTypeMap.put("appReconnectCount", d.getAppReconnectCount());
            osTypeMap.put("appUseCount", d.getAppUseCount());
            osTypeMap.put("appSleepUserCount", d.getAppSleepUserCount());
            osTypeMap.put("appLoginUserCount", d.getAppLoginUserCount());
            osTypeMap.put("appAvgUseTime", d.getAppAvgUseTime());

            osTypeMap.put("appLogCount", d.getAppLogCount());
            osTypeMap.put("appErrorCount", d.getAppErrorCount());
            osTypeMap.put("appCrashCount", d.getAppCrashCount());

            osTypeMap.put("appIosUserRating", d.getAppIosUserRating());
            osTypeMap.put("appAndroidUserRating", d.getAppAndroidUserRating());
            osTypeMap.put("androidInstallCount", d.getAndroidInstallCount());
            osTypeMap.put("iosInstallCount", d.getIosInstallCount());

            baseDateMap.put(osType, osTypeMap);
            groupedData.put(baseDate, baseDateMap);
        }
        return groupedData;
    }

    public Map<String, Map<String, Map<String, Object>>> getMonthlyTrendInfo(DashboardVO vo) {
        List<DashboardVO> result = dashboardMapper.selectBiMonthlyInfoList(vo);

        Map<String, Map<String, Map<String, Object>>> groupedData = new HashMap<>();
        for (DashboardVO d : result) {
            String baseMonth = d.getBaseMonth();
            String osType = d.getOsType();

            Map<String, Map<String, Object>> baseMonthMap = groupedData.getOrDefault(baseMonth, new HashMap<>());
            Map<String, Object> osTypeMap = baseMonthMap.getOrDefault(osType, new HashMap<>());
            osTypeMap.put("appMauCount", d.getAppMauCount());

            baseMonthMap.put(osType, osTypeMap);
            groupedData.put(baseMonth, baseMonthMap);
        }
        return groupedData;
    }

    /**
     * PV Equalizer > All 버튼 > Popup 목록
     *
     * @param vo packageNm, serverType, osType, {@link com.thinkm.maxy.vo.DashboardVO.DateType}
     * @return list
     */
    public List<Map<String, Object>> getPageViewInfoList(DashboardVO vo, HttpServletRequest request) {
        // Popup 목록 가져오는 개수를 설정한 PV Equalizer 옵션 수만큼 조회
        DashboardComponentVO componentVO = DashboardComponentVO.builder()
                .type("pvequalizer")
                .build();
        componentVO.setRegInfo(request);
        DashboardComponentVO componentConfig = dashboardConfigService.getComponentConfig(componentVO);
        SearchRequest searchRequest = DashboardQueryFactory.createPageViewInfoListQuery(vo, componentConfig);
        try {
            SearchResponse response = elasticClient.get(searchRequest);
            return DashboardServiceHelper.parsePageViewInfoList(response);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    /**
     * PV Equalizer > All 버튼 > Popup 목록 > 상세
     *
     * @param vo packageNm, serverType, osType, {@link com.thinkm.maxy.vo.DashboardVO.DateType}, reqUrl
     * @return list
     */
    public List<Map<String, Object>> getPageViewInfoDetailList(DashboardVO vo) {
        SearchRequest searchRequest = DashboardQueryFactory.createPageViewInfoDetailList(vo);

        List<Map<String, Object>> result = new ArrayList<>();
        try {
            SearchResponse response = elasticClient.get(searchRequest);
            if (response == null) {
                return result;
            }
            ParsedDateHistogram res = response.getAggregations().get(Elastic.RES);
            for (Histogram.Bucket bucket : res.getBuckets()) {
                //Object time = bucket.getKeyAsString();  // "key": Field (e.g., "Background", "Foreground")
                long viewCount = bucket.getDocCount();  // "doc_count": Field

                // Extract "viewer" aggregation
                ParsedCardinality viewerAggregation = bucket.getAggregations().get(Elastic.SUB_AGGS_1);
                long viewer = viewerAggregation.getValue();  // "viewer": Field

                Map<String, Object> item = new HashMap<>();
                item.put("time", bucket.getKeyAsString());
                item.put("viewCount", viewCount);
                item.put("viewer", viewer);
                result.add(item);
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
        return result;
    }

    // Resource Usage 전체 팝업 Data 구하기
    public Map<String, Object> getResourcePopupData(DashboardVO vo) {
        Map<String, Object> result = new ConcurrentHashMap<>();
        List<Map<String, Object>> resultList = new ArrayList<>();
        List<Map<String, Object>> userList = new ArrayList<>();
        List<Map<String, Object>> totalResult = new ArrayList<>();
        try {
            // Elastic search 에서 날짜 검색을 위함
            long fromTimestamp = DateUtil.dateToTimestamp(vo.getBaseDate(), true);
            long toTimestamp = System.currentTimeMillis();

            // osType 을 내부에서 결정하기 때문에 lambda 식 내부에서 Map 새로 생성
            Map<String, Object> queryParams = new HashMap<>();
            Map<String, Boolean> dynamicParams = new HashMap<>();
            Map<String, Object> totalData = new HashMap<>();
            queryParams.put("packageNm", vo.getPackageNm());
            queryParams.put("serverType", vo.getServerType());
            queryParams.put("from", fromTimestamp);
            queryParams.put("to", toTimestamp);
            queryParams.put("fromDate", DateUtil.timestampToDate(fromTimestamp, DateUtil.DATE_PATTERN));
            queryParams.put("toDate", DateUtil.timestampToDate(toTimestamp, DateUtil.DATE_PATTERN));
            queryParams.put("osType", vo.getOsType());
            queryParams.put("size", vo.getSize());

            dynamicParams.put("isOsType", vo.checkOsType());

            Arrays.stream(new String[]{"allUser", "user", "resource"}).parallel().forEach(type -> {
                Elastic countParam = Elastic.builder()
                        .method(Elastic.GET)
                        .queryParams(queryParams)
                        .dynamicParams(dynamicParams)
                        .build();

                try {
                    if ("resource".equals(type)) {
                        countParam.setEndpoint(ElasticIndex.PAGE_LOG.getIndex() + "*/_search");
                        countParam.setQueryFile("db/resource/" + type + "-count-by-model.json");
                    } else {
                        countParam.setEndpoint(ElasticIndex.ACCESS_HISTORY.getIndex() + "*/_search");
                        countParam.setQueryFile("db/resource/" + type + "-count-by-all.json");
                    }
                    Map<String, Object> u = elasticClient.get(countParam);

                    if ("allUser".equals(type)) {
                        totalData.put("totalCount", ((Map<String, Object>) u.get("res")).get("value"));
                    } else if ("user".equals(type)) {
                        List<Map<String, Object>> userResult = (List<Map<String, Object>>) u.get("res");
                        for (Map<String, Object> l : userResult) {
                            Map<String, Object> tmp = new HashMap<>();
                            tmp.put("deviceModel", l.get("key"));
                            tmp.put("userCount", l.get("doc_count"));
                            userList.add(tmp);
                        }
                    } else if ("resource".equals(type)) {
                        Object resObj = u.get("res");
                        for (Map<String, Object> r : (List<Map<String, Object>>) resObj) {
                            Map<String, Object> resultData = new HashMap<>();
                            String deviceModel = String.valueOf(r.get("key"));
                            Map<String, Object> osTypeMap = (Map<String, Object>) r.get("osType");
                            List<Map<String, Object>> resourceMap = (List<Map<String, Object>>) osTypeMap.get("buckets");
                            resultData.put("deviceModel", deviceModel);
                            resultData.put("osType", resourceMap.get(0).get("key"));
                            resultData.put("cpuUsage", ((Map<String, Object>) resourceMap.get(0).get("avgCPU")).get("value"));
                            resultData.put("memUsage", ((Map<String, Object>) resourceMap.get(0).get("avgMEM")).get("value"));
                            resultList.add(resultData);
                        }
                    }

                } catch (Exception e) {
                    log.error(e.getMessage(), e);
                }

            });
            // 장치 별 resource Data, 전체의 resource Data put
            for (Map<String, Object> r : resultList) {
                for (Map<String, Object> l : userList) {
                    Map<String, Object> tmp = new HashMap<>();
                    if (r.get("deviceModel").equals(l.get("deviceModel"))) {
                        tmp.put("count", l.get("userCount"));
                        tmp.put("deviceModel", r.get("deviceModel"));
                        tmp.put("cpuUsage", r.get("cpuUsage"));
                        tmp.put("memUsage", r.get("memUsage"));
                        tmp.put("usageCount", r.get("usageCount"));
                        tmp.put("osType", r.get("osType"));
                        totalResult.add(tmp);
                    }
                }
            }
            result.put("popupData", totalResult);
            result.put("totalData", totalData);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
        return result;
    }

    /**
     * Resource Usage > All 팝업 > 행 클릭 데이터 User, CPU 사용량, Memory 사용량 반환
     *
     * @param vo packageNm, serverType, osType, {@link DateType}, deviceModel
     * @return User/Error/Crash 별 목록
     */
    public Map<String, List<Object>> getResourcePopupRowData(DashboardVO vo) {
        Map<String, List<Object>> result = new HashMap<>();

        SearchRequest userSearchRequest = DashboardQueryFactory.createResourcePopupRowDataForUser(vo);
        SearchRequest resourceSearchRequest = DashboardQueryFactory.createResourcePopupRowDataForResource(vo);
        try {
            SearchResponse userResponse = elasticClient.get(userSearchRequest);
            SearchResponse resourceResponse = elasticClient.get(resourceSearchRequest);

            if (userResponse == null || resourceResponse == null) {
                return result;
            }

            ParsedDateHistogram userRes = userResponse.getAggregations().get(Elastic.RES);
            List<Object> userData = new ArrayList<>();

            for (Histogram.Bucket bucket : userRes.getBuckets()) {
                ZonedDateTime keyTime = (ZonedDateTime) bucket.getKey();
                long time = keyTime.toInstant().toEpochMilli();

                List<Object> item = new ArrayList<>();
                item.add(time); // timestamp
                item.add(bucket.getDocCount()); // "doc_count": Field

                userData.add(item);
            }

            result.put("user", userData);

            ParsedDateHistogram errorRes = resourceResponse.getAggregations().get(Elastic.RES);
            List<Object> cpuData = new ArrayList<>();
            List<Object> memData = new ArrayList<>();

            for (Histogram.Bucket bucket : errorRes.getBuckets()) {
                ParsedAvg cpuAggregation = bucket.getAggregations().get(Elastic.avgCpuUsage);
                ParsedAvg memAggregation = bucket.getAggregations().get(Elastic.avgMemUsage);

                ZonedDateTime keyTime = (ZonedDateTime) bucket.getKey();
                long time = keyTime.toInstant().toEpochMilli();

                List<Object> cpuItem = new ArrayList<>();
                cpuItem.add(time); // timestamp
                if (Double.isInfinite(cpuAggregation.getValue()) || Double.isNaN(cpuAggregation.getValue())) {
                    cpuItem.add(0);
                } else {
                    cpuItem.add(Math.round(cpuAggregation.getValue() * 10) / 10.0); // avgCPU Avg
                }

                List<Object> memItem = new ArrayList<>();
                memItem.add(time); // timestamp
                if (Double.isInfinite(memAggregation.getValue()) || Double.isNaN(memAggregation.getValue())) {
                    memItem.add(0);
                } else {
                    memItem.add(Math.round(memAggregation.getValue())); // avgMem Avg
                }

                cpuData.add(cpuItem);
                memData.add(memItem);
            }

            result.put("cpu", cpuData);
            result.put("memory", memData);

        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        return result;
    }

    /**
     * favorites 컴포넌트의 all 버튼을 눌렀을 때 전체 목록 조회
     */
    public List<Map<String, Object>> getFavoritesInfoList(DashboardVO vo) {
        // get favorites page list
        List<DashboardVO> pageList = dashboardMapper.selectFavoritePages(vo);

        // get favorites page list
        List<String> reqUrlList = new ArrayList<>();
        for (DashboardVO page : pageList) {
            reqUrlList.add(page.getReqUrl());
        }
        SearchRequest searchRequest = DashboardQueryFactory.createFavoritesInfoListQuery(vo, reqUrlList);

        List<Map<String, Object>> result = new ArrayList<>();
        try {
            String[] keys = {
                    Elastic.logCount,
                    Elastic.sumCpuUsage,
                    Elastic.sumMemUsage,
                    Elastic.loadingTime,
                    Elastic.intervaltime,
                    Elastic.responseTime,
                    Elastic.errorCount,
                    Elastic.crashCount
            };
            SearchResponse response = elasticClient.get(searchRequest);

            if (response == null) {
                return result;
            }

            ParsedTerms aggs = response.getAggregations().get(Elastic.RES);
            for (Terms.Bucket bucket : aggs.getBuckets()) {
                Map<String, Object> item = new HashMap<>();
                item.put(Elastic.reqUrl, bucket.getKeyAsString());
                item.put(Elastic.COUNT, bucket.getDocCount());
                for (String key : keys) {
                    Object o = bucket.getAggregations().get(key);
                    if (o instanceof ParsedSum o2) {
                        item.put(key, o2.getValue());
                    } else if (o instanceof ParsedAvg o2) {
                        item.put(key, o2.getValue());
                    }
                }
                result.add(item);
            }

            // calculate AVG cpu/mem usage
            for (Map<String, Object> item : result) {
                double sumCpuUsage = (double) item.get("sumCpuUsage");
                double sumMemUsage = (double) item.get("sumMemUsage");
                double count = (double) item.get("logCount");

                long cpuUsage = 0;
                long memUsage = 0;
                if (count > 0) {
                    cpuUsage = Math.round(sumCpuUsage / count);
                    memUsage = Math.round(sumMemUsage / count);
                }

                item.put("cpuUsage", cpuUsage);
                item.put("memUsage", memUsage);
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
        return result;
    }

    /**
     * favorites > All 팝업 > Issue, Performance 탭 > 행 클릭 차트 데이터 반환
     *
     * @param vo packageNm, serverType, osType, {@link DateType}, reqUrl
     * @return logCount/Error/Crash 별 목록
     */
    public Map<String, List<Object>> getFavoritesRowInfo(DashboardVO vo) {
        SearchRequest searchRequest = DashboardQueryFactory.createFavoritesRowInfoQuery(vo);
        try {
            SearchResponse response = elasticClient.get(searchRequest);
            return DashboardServiceHelper.parseFavoritesRowInfo(response);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return Collections.unmodifiableMap(new HashMap<>());
        }
    }

    /**
     * User Flow 리스트에서 reqUrl과 pageStartTm으로 waterfall 데이터 시작Flow를 찾고
     * 다음 WebView Flow의 pageStartTm-1을 반환해준다.
     * WebView와 WebView 사이 Native화면일 경우에 Native화면에 속한 waterfall 데이터를 앞 WebView에 포함시키기 위함
     *
     * @param userFlow 성능 데이터가 포함된 워터폴 리스트
     * @return Long
     */
    public Long getPageStartTimeFromAfterWebview(List<Map<String, Object>> userFlow) {
        long result = -1L;

        // i가 1, 첫번째는 waterfall을 조회하려는 userflow 시작점
        for (int i = 1; i < userFlow.size(); i++) {
            Map<String, Object> item = userFlow.get(i);
            if (!MaxyLogType.isNative((Integer) item.get("logType"))) {
                result = (long) item.get("pageStartTm") - 1L;
                break;
            }
        }

        return result;
    }

    public List<Map<String, Object>> getLogTrendChartListV2(DashboardVO vo) {
        DashboardVO.LogTrendType type = vo.getLogTrendType();
        List<DashboardVO> list = dashboardMapper.selectLogCountFromReportBasicStatus(vo);
        List<Map<String, Object>> result = new ArrayList<>();
        for (DashboardVO data : list) {
            Map<String, Object> tmp = new HashMap<>();
            long key = DateUtil.dateToTimestamp(data.getBaseDate(), true);
            tmp.put("key", key);
            long value = switch (type) {
                case LOG -> data.getAppLogCount();
                case ERROR -> data.getAppErrorCount();
                case CRASH -> data.getAppCrashCount();
            };

            tmp.put("value", value);
            result.add(tmp);
        }
        return result;
    }

    public Map<String, List<Object[]>> getPageViewerChartByReqUrl(DashboardVO vo) {
        Map<String, List<Object[]>> result = new HashMap<>();
        List<Object[]> resIntervaltime = new ArrayList<>();
        List<Object[]> resLoadingTime = new ArrayList<>();

        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.pageStartTm)
                .gte(vo.getFrom())
                .lte(vo.getTo())
                .timeZone("Z")
        );

        String reqUrl = CommonUtil.convertHTMLCode(vo.getReqUrl());
        boolQuery.filter(QueryBuilders.termQuery(Elastic.reqUrl_raw, reqUrl));

        if (vo.getSearchType() != null && !vo.getSearchType().isEmpty()) {
            if (vo.getSearchValue() != null && !vo.getSearchValue().isEmpty()) {
                String postfix = "";
                if (vo.getSearchType().equalsIgnoreCase("deviceId")
                    || vo.getSearchType().equalsIgnoreCase("userId")
                    || vo.getSearchType().equalsIgnoreCase("userNm")) {
                    postfix = ".raw";
                }
                if (!vo.getSearchType().equalsIgnoreCase("reqUrl")) {
                    boolQuery.filter(QueryBuilders.termQuery(vo.getSearchType() + postfix,
                            URLDecoder.decode(vo.getSearchValue(), StandardCharsets.UTF_8)));
                }
            }
        }

        if (vo.checkAppVer()) {
            boolQuery.filter(QueryBuilders.termQuery("appVer", vo.getAppVer()));
        }

        // 시간 범위를 기준으로 간격 계산
        DateHistogramInterval interval;
        long timeDiff = vo.getTo() - vo.getFrom();
        long sixHoursInMillis = 6 * 60 * 60 * 1000;
        long oneDayInMillis = 24 * 60 * 60 * 1000;

        if (timeDiff <= sixHoursInMillis) {
            // 6시간 이내일때 1분 간격
            interval = DateHistogramInterval.minutes(1);
        } else if (timeDiff <= oneDayInMillis) {
            // 24시간 이내일때 5분 간격
            interval = DateHistogramInterval.minutes(5);
        } else {
            // 24시간 이상일때 1시간 간격
            interval = DateHistogramInterval.hours(1);
        }

        AvgAggregationBuilder avgIntervalTimeBuilder = new AvgAggregationBuilder(Elastic.intervaltime).field(Elastic.intervaltime);
        AvgAggregationBuilder avgLoadingTimeBuilder = new AvgAggregationBuilder(Elastic.loadingTime).field(Elastic.loadingTime);

        DateHistogramAggregationBuilder aggregationBuilder = new DateHistogramAggregationBuilder(Elastic.RES)
                .field(Elastic.pageStartTm)
                .fixedInterval(interval)
                .timeZone(ZoneId.of("Z"))
                .minDocCount(0)
                .extendedBounds(new LongBounds(vo.getFrom(), vo.getTo()))
                .subAggregation(avgIntervalTimeBuilder)
                .subAggregation(avgLoadingTimeBuilder);

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .aggregation(aggregationBuilder)
                .size(0);

        SearchRequest searchRequest = new SearchRequest(ElasticIndex.PAGE_LOG.getIndex() + "*");
        searchRequest.source(searchSourceBuilder);

        try {
            SearchResponse searchResponse = elasticClient.get(searchRequest);

            if (searchResponse == null || searchResponse.getAggregations() == null) {
                return result;
            }

            ParsedDateHistogram parsedDateHistogram = searchResponse.getAggregations().get(Elastic.RES);
            if (parsedDateHistogram == null) {
                return result;
            }

            for (Histogram.Bucket timeBucket : parsedDateHistogram.getBuckets()) {
                long timestamp = CommonUtil.toLong(timeBucket.getKeyAsString());

                ParsedAvg intervalAgg = timeBucket.getAggregations().get(Elastic.intervaltime);
                ParsedAvg loadingAgg = timeBucket.getAggregations().get(Elastic.loadingTime);
                double intervalAvg = intervalAgg.getValue();
                double loadingAvg = loadingAgg.getValue();

                if (Double.isNaN(intervalAvg) || Double.isInfinite(intervalAvg)) {
                    intervalAvg = 0;
                }

                if (Double.isNaN(loadingAvg) || Double.isInfinite(loadingAvg)) {
                    loadingAvg = 0;
                }

                resIntervaltime.add(new Object[]{timestamp, Math.round(intervalAvg)});
                resLoadingTime.add(new Object[]{timestamp, Math.round(loadingAvg)});
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        result.put(Elastic.intervaltime, resIntervaltime);
        result.put(Elastic.loadingTime, resLoadingTime);

        return result;
    }

    public List<Map<String, Object>> getPageViewerListByReqUrl(DashboardVO vo) {
        long from, to;
        // dashboard 일때만
        if (vo.getDateType() != null && vo.getDateType().equals(DateType.DAY)) {
            from = DateUtil.dateToTimestamp(DateUtil.getTodayWithDash(), true);
            to = System.currentTimeMillis();
        } else {
            // 로그 분석에서 왔을 경우
            if (vo.getFrom() == null || vo.getTo() == null) {
                throw new BadRequestException(ReturnCode.ERR_EMPTY_PARAMS);
            }
            from = vo.getFrom();
            to = vo.getTo();
        }

        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.pageStartTm)
                .gte(from)
                .lte(to)
                .timeZone("Z")
        );

        String reqUrl = CommonUtil.convertHTMLCode(vo.getReqUrl());
        boolQuery.filter(QueryBuilders.termQuery(Elastic.reqUrl_raw, reqUrl));

        if (vo.getSearchType() != null && !vo.getSearchType().isEmpty()) {
            if (vo.getSearchValue() != null && !vo.getSearchValue().isEmpty()) {
                String postfix = "";
                if (vo.getSearchType().equalsIgnoreCase("deviceId")
                    || vo.getSearchType().equalsIgnoreCase("userId")
                    || vo.getSearchType().equalsIgnoreCase("userNm")) {
                    postfix = ".raw";
                }
                if (!vo.getSearchType().equalsIgnoreCase("reqUrl")) {
                    boolQuery.filter(QueryBuilders.termQuery(vo.getSearchType() + postfix,
                            URLDecoder.decode(vo.getSearchValue(), StandardCharsets.UTF_8)));
                }
            }
        }

        if (vo.checkAppVer()) {
            boolQuery.filter(QueryBuilders.termQuery("appVer", vo.getAppVer()));
        }

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .size(500)
                .sort(SortBuilders.fieldSort(Elastic.pageStartTm).order(SortOrder.DESC))
                .sort(SortBuilders.fieldSort(Elastic.deviceId_raw).order(SortOrder.ASC));

        if (vo.getLastLogTm() != null
            && vo.getLastDeviceId() != null
            && !vo.getLastLogTm().isEmpty()
            && !vo.getLastDeviceId().isEmpty()) {
            searchSourceBuilder.searchAfter(new Object[]{
                    vo.getLastLogTm(),
                    vo.getLastDeviceId(),
            });
        }

        SearchRequest searchRequest = new SearchRequest(ElasticIndex.PAGE_LOG.getIndex() + "*");
        searchRequest.source(searchSourceBuilder);

        List<Map<String, Object>> resList = elasticClient.getListMap(searchRequest);

        CommonUtil.maskUserId(resList, userIdMasking, 2);

        return resList;
    }

    public Map<String, Object> getAllAnalysisData(DashboardVO vo) {
        Map<String, Object> result = new ConcurrentHashMap<>();
        List<Map<String, Object>> deviceInfoList = new ArrayList<>();
        try {
            Map<String, Object> queryParams = new ConcurrentHashMap<>();
            Map<String, Boolean> dynamicParams = new ConcurrentHashMap<>();

            long fromTimestamp = DateUtil.dateToTimestamp(vo.getBaseDate(), true);
            long toTimestamp = System.currentTimeMillis();

            queryParams.put("packageNm", vo.getPackageNm());
            queryParams.put("serverType", vo.getServerType());
            queryParams.put("from", fromTimestamp);
            queryParams.put("to", toTimestamp);
            queryParams.put("osType", vo.getOsType());

            queryParams.put("fromDate", DateUtil.timestampToDate(fromTimestamp, DateUtil.DATE_PATTERN));
            queryParams.put("toDate", DateUtil.timestampToDate(toTimestamp, DateUtil.DATE_PATTERN));

            dynamicParams.put("isOsType", vo.checkOsType());

            List<Elastic> elastics = new ArrayList<>();

            // 총 User Count 계산
            Elastic allUserCountInfo = Elastic.builder().method(Elastic.GET)// or POST, PUT
                    .index(ElasticIndex.ACCESS_HISTORY.getIndex() + "*")
                    .queryFile("db/device/user-count-by-all.json")
                    .queryParams(queryParams)
                    .dynamicParams(dynamicParams)
                    .key("allUserCountInfo")
                    .build();

            elastics.add(allUserCountInfo);

            // device 별 User Count 계산
            Elastic userCountByDeviceInfo = Elastic.builder().method(Elastic.GET)// or POST, PUT
                    .index(ElasticIndex.ACCESS_HISTORY.getIndex() + "*")
                    .queryFile("db/device/count-by-model-all.json")
                    .queryParams(queryParams)
                    .dynamicParams(dynamicParams)
                    .key("userCountByDeviceInfo")
                    .build();
            elastics.add(userCountByDeviceInfo);

            // TODO: page -> trouble 로 변경 필요
            for (String type : new String[]{"error", "crash"}) {
                Elastic totalCountInfo = Elastic.builder().method(Elastic.GET)// or POST, PUT
                        .index(ElasticIndex.PAGE_LOG.getIndex() + "*")
                        .queryFile("db/device/log-count-by-all.json")
                        .queryParams(queryParams)
                        .dynamicParams(dynamicParams)
                        .key("totalCountInfo" + type)
                        .build();

                // device 모델 별 Error, Crash Count 계산
                Elastic logCountByDeviceInfo = Elastic.builder().method(Elastic.GET)// or POST, PUT
                        .index(ElasticIndex.PAGE_LOG.getIndex() + "*")
                        .queryFile("db/device/log-count-by-model.json")
                        .queryParams(queryParams)
                        .dynamicParams(dynamicParams)
                        .key("logCountByDeviceInfo" + type)
                        .build();

                elastics.add(totalCountInfo);
                elastics.add(logCountByDeviceInfo);

            }

            long s1 = System.currentTimeMillis();
            List<Map<String, Object>> r = elasticClient.get(elastics);
            log.info("ANALYSIS TIME: {}ms", (System.currentTimeMillis() - s1));

            long s2 = System.currentTimeMillis();
            Map<String, Object> errorCrashInfo = new HashMap<>();
            Map<String, Object> errorCrashTotalInfo = new HashMap<>();
            List<Map<String, Object>> userCountByDevice = new ArrayList<>();
            for (Map<String, Object> tmpMap : r) {
                Map<String, Object> rr = ElasticClient.parser(tmpMap);
                String tmpMapKey = (String) tmpMap.get("reqKey");
                if ("allUserCountInfo".equals(tmpMapKey)) {
                    result.put("totalUserCount", ((Map<String, Object>) rr.get("res")).get("value"));
                } else if ("userCountByDeviceInfo".equals(tmpMapKey)) {
                    userCountByDevice = (List<Map<String, Object>>) rr.get("res");
                } else if ("totalCountInfoerror".equals(tmpMapKey)) {
                    errorCrashTotalInfo.put("errorTotalInfo", ((Map<String, Object>) rr.get("errorCnt")).get("res"));
                } else if ("totalCountInfocrash".equals(tmpMapKey)) {
                    errorCrashTotalInfo.put("crashTotalInfo", ((Map<String, Object>) rr.get("crashCnt")).get("res"));
                } else if ("logCountByDeviceInfoerror".equals(tmpMapKey)) {
                    errorCrashInfo.put("errorInfo", rr.get("res"));
                } else if ("logCountByDeviceInfocrash".equals(tmpMapKey)) {
                    errorCrashInfo.put("crashInfo", rr.get("res"));
                }
            }

            List<Map<String, Object>> errorList = (List<Map<String, Object>>) errorCrashInfo.get("errorInfo");
            List<Map<String, Object>> crashList = (List<Map<String, Object>>) errorCrashInfo.get("crashInfo");


            // device 별 userCount를 넣어둔 list와 error, crash list의 deviceModel 비교 후 Count put
            for (Map<String, Object> u : userCountByDevice) {
                Map<String, Object> deviceInfo = new HashMap<>();
                List<Map<String, Object>> osBuckets = (List<Map<String, Object>>) ((Map<String, Object>) u.get("osType")).get("buckets");
                deviceInfo.put("deviceModel", u.get("key"));
                for (Map<String, Object> o : osBuckets) {
                    deviceInfo.put("osType", o.get("key"));
                    deviceInfo.put("userCount", o.get("doc_count"));
                }
                boolean errorFound = false;
                boolean crashFound = false;
                for (Map<String, Object> e : errorList) {
                    if (e.get("key").equals(u.get("key"))) {
                        deviceInfo.put("errorCount", ((Map<String, Object>) e.get("errorCnt")).get("value"));
                        errorFound = true;
                        break;
                    }
                }
                if (!errorFound) {
                    deviceInfo.put("errorCount", 0);
                }

                for (Map<String, Object> c : crashList) {
                    if (u.get("key").equals(c.get("key"))) {
                        deviceInfo.put("crashCount", ((Map<String, Object>) c.get("crashCnt")).get("value"));
                        crashFound = true;
                        break;
                    }
                }
                if (!crashFound) {
                    deviceInfo.put("crashCount", 0);
                }
                deviceInfoList.add(deviceInfo);
            }

            log.info("ANALYSIS PARSING TIME: {}ms", (System.currentTimeMillis() - s2));
            result.put("errorCrashTotalInfo", errorCrashTotalInfo);
            result.put("deviceInfo", deviceInfoList);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        return result;
    }

    /**
     * Device Distribution > All 팝업 > 행 클릭 데이터 User, Error, Crash 반환
     *
     * @param vo packageNm, serverType, osType, {@link DateType}, deviceModel
     * @return User/Error/Crash 별 목록
     */
    public Map<String, List<Object>> getAllAnalysisRowData(DashboardVO vo) {
        Map<String, List<Object>> result = new HashMap<>();

        long from = DateUtil.dateToTimestamp(vo.getBaseDate(), true);
        long to = System.currentTimeMillis();

        // DAY: 1h / WEEK, MONTH: 1d
        DateHistogramInterval interval = vo.getDateType().equals(DateType.DAY) ? DateHistogramInterval.HOUR : DateHistogramInterval.DAY;

        // Bool query with filters
        BoolQueryBuilder userBoolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));
        BoolQueryBuilder errorBoolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));

        userBoolQuery.filter(QueryBuilders.termQuery(Elastic.deviceModel, vo.getDeviceModel()));
        userBoolQuery.filter(QueryBuilders.rangeQuery(Elastic.appStartTm).gte(from).lte(to).timeZone("Z"));
        errorBoolQuery.filter(QueryBuilders.termQuery(Elastic.deviceModel, vo.getDeviceModel()));
        errorBoolQuery.filter(QueryBuilders.rangeQuery(Elastic.pageStartTm).gte(from).lte(to).timeZone("Z"));

        SumAggregationBuilder errorCountAgg = AggregationBuilders.sum(Elastic.errorCount)
                .field(Elastic.errorCount); // Error sum
        SumAggregationBuilder crashCountAgg = AggregationBuilders.sum(Elastic.crashCount)
                .field(Elastic.crashCount); // Crash sum

        DateHistogramAggregationBuilder userHistogramAggregationBuilder = AggregationBuilders.dateHistogram(Elastic.RES)
                .field(Elastic.appStartTm)
                .calendarInterval(interval)
                .timeZone(TimeZone.getTimeZone("Asia/Seoul").toZoneId())
                .minDocCount(0);
        DateHistogramAggregationBuilder errorHistogramAggregationBuilder = AggregationBuilders.dateHistogram(Elastic.RES)
                .field(Elastic.pageStartTm)
                .calendarInterval(interval)
                .timeZone(TimeZone.getTimeZone("Asia/Seoul").toZoneId())
                .minDocCount(0)
                .subAggregation(errorCountAgg)
                .subAggregation(crashCountAgg);

        SearchSourceBuilder userSourceBuilder = new SearchSourceBuilder()
                .query(userBoolQuery)
                .aggregation(userHistogramAggregationBuilder)
                .size(0);
        SearchSourceBuilder errorSourceBuilder = new SearchSourceBuilder()
                .query(errorBoolQuery)
                .aggregation(errorHistogramAggregationBuilder)
                .size(0);

        SearchRequest userSearchRequest = new SearchRequest(ElasticIndex.ACCESS_HISTORY.getIndex() + "*")
                .source(userSourceBuilder);
        SearchRequest errorSearchRequest = new SearchRequest(ElasticIndex.PAGE_LOG.getIndex() + "*")
                .source(errorSourceBuilder);

        try {
            SearchResponse userResponse = elasticClient.get(userSearchRequest);
            SearchResponse errorResponse = elasticClient.get(errorSearchRequest);

            if (userResponse == null || errorResponse == null) {
                return result;
            }

            ParsedDateHistogram userRes = userResponse.getAggregations().get(Elastic.RES);
            List<Object> userData = new ArrayList<>();

            for (Histogram.Bucket bucket : userRes.getBuckets()) {
                ZonedDateTime keyTime = (ZonedDateTime) bucket.getKey();
                long time = keyTime.toInstant().toEpochMilli();

                List<Object> item = new ArrayList<>();
                item.add(time); // timestamp
                item.add(bucket.getDocCount()); // "doc_count": Field

                userData.add(item);
            }

            result.put("user", userData);

            ParsedDateHistogram errorRes = errorResponse.getAggregations().get(Elastic.RES);
            List<Object> errorData = new ArrayList<>();
            List<Object> crashData = new ArrayList<>();

            for (Histogram.Bucket bucket : errorRes.getBuckets()) {
                ParsedSum errorAggregation = bucket.getAggregations().get(Elastic.errorCount);
                ParsedSum crashAggregation = bucket.getAggregations().get(Elastic.crashCount);

                ZonedDateTime keyTime = (ZonedDateTime) bucket.getKey();
                long time = keyTime.toInstant().toEpochMilli();

                List<Object> errorItem = new ArrayList<>();
                errorItem.add(time); // timestamp
                errorItem.add(errorAggregation.getValue()); // error total

                List<Object> crashItem = new ArrayList<>();
                crashItem.add(time); // timestamp
                crashItem.add(crashAggregation.getValue()); // crash total

                errorData.add(errorItem);
                crashData.add(crashItem);
            }

            result.put("error", errorData);
            result.put("crash", crashData);

        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        return result;
    }

    public List<Map<String, Object>> getErrorCrashListByLocationCode(DashboardVO vo) {
        List<Map<String, Object>> result = new ArrayList<>();

        int next = vo.getNext() != null ? vo.getNext() : 0;

        // Map 정보를 기반으로 한 조회는 어제 일자를 조회한다.
        String dayInfo = DateUtil.getYesterdayWithDash();

        // 어제 일자의 00시 00분
        long from = DateUtil.dateToTimestamp(dayInfo, true);
        // 어제 일자의 23시 59분
        long to = DateUtil.dateToTimestamp(dayInfo, false);

        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));
        boolQuery.filter(QueryBuilders.termQuery(Elastic.locationCode, vo.getLocationCode()));
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm).gte(from).lte(to).timeZone("Z"));

        if (RequestType.ERROR.equals(vo.getRequestType())) {
            Elastic.errorBuilder(boolQuery);
        } else if (RequestType.CRASH.equals(vo.getRequestType())) {
            Elastic.crashBuilder(boolQuery);
        }

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .size(50)
                .from(next)
                .fetchSource(new String[]{
                        Elastic.logTm,
                        Elastic.deviceId,
                        Elastic.deviceModel,
                        Elastic.reqUrl,
                        Elastic.appVer,
                        Elastic.packageNm,
                        Elastic.serverType,
                        Elastic.osType,
                        Elastic.logType,
                        Elastic.userId,
                        Elastic.intervaltime,
                        Elastic.pageUrl,

                        Elastic.userNm,
                        Elastic.userNo,
                        Elastic.clientNo,
                        Elastic.clientNm,
                        Elastic.bizCode,
                        Elastic.bizSubCode,
                        Elastic.birthDay,
                }, null)
                .sort(SortBuilders.fieldSort(Elastic.logTm).order(SortOrder.DESC));

        SearchRequest searchRequest = new SearchRequest(ElasticIndex.TROUBLE_LOG.getIndex() + "*")
                .source(searchSourceBuilder);

        try {
            SearchResponse response = elasticClient.get(searchRequest);
            if (response == null) {
                log.error("response is null");
                return result;
            }
            for (SearchHit hit : response.getHits()) {
                Map<String, Object> tmp = hit.getSourceAsMap();
                tmp.put(Elastic._ID, hit.getId());
                result.add(tmp);
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
        // logTm 기준으로 desc
        result.sort(Comparator.comparing(el -> -(long) el.get(Elastic.logTm)));

        CommonUtil.maskUserId(result, userIdMasking, 2);

        return result;
    }

    // 버전 비교 컴포넌트 데이터 조회
    public List<Map<String, Object>> getVersionComparisonDataV2(DashboardVO vo, HttpServletRequest request) {
        List<Map<String, Object>> result = new ArrayList<>();
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null) {
            throw new AuthException();
        }

        List<Map<String, Object>> comparisonData = dashboardMapper.selectVersionComparisonData(vo);
        // 첫 번째 조건 (osType1, appVer1)
        boolean found1 = false;
        for (Map<String, Object> map : comparisonData) {
            if (vo.getOsType1().equals(map.get("osType")) && vo.getAppVer1().equals(map.get("appVer"))) {
                result.add(map); // 조건에 맞는 데이터를 result에 추가
                found1 = true;
                break;
            }
        }
        if (!found1) {
            // 조건에 맞는 데이터가 없으면 빈 Map 추가
            addEmptyData(vo, vo.getOsType1(), vo.getAppVer1(), result);
        }

        // 두 번째 조건 (osType2, appVer2)
        boolean found2 = false;
        for (Map<String, Object> map : comparisonData) {
            if (vo.getOsType2().equals(map.get("osType")) && vo.getAppVer2().equals(map.get("appVer"))) {
                result.add(map); // 조건에 맞는 데이터를 result에 추가
                found2 = true;
                break;
            }
        }
        if (!found2) {
            // 조건에 맞는 데이터가 없으면 빈 Map 추가
            addEmptyData(vo, vo.getOsType2(), vo.getAppVer2(), result);
        }

        return result;
    }

    // 버전 비교 컴포넌트 데이터 조회
    public Map<String, Object> getTotalVersionData(DashboardVO vo) {
        Map<String, Object> result;

        result = dashboardMapper.selectTotalVersionData(vo);

        return result;
    }

    public List<Map<String, Object>> getAllVersionDataV2(DashboardVO vo) {
        List<Map<String, Object>> result;
        String yesterday = DateUtil.getYesterdayWithDash();

        long fromTimestamp = DateUtil.dateToTimestamp(vo.getBaseDate(), true);
        long toTimestamp = DateUtil.dateToTimestamp(yesterday, false);

        LocalDate startDate = Instant.ofEpochMilli(fromTimestamp).atZone(ZoneId.systemDefault()).toLocalDate();
        LocalDate endDate = Instant.ofEpochMilli(toTimestamp).atZone(ZoneId.systemDefault()).toLocalDate();

        // yyyyMMdd 형식 지정
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMdd");

        List<String> accessDateList = new ArrayList<>();

        // 시작 날짜부터 종료 날짜까지 순회하며 출력
        while (!startDate.isAfter(endDate)) {
            accessDateList.add(startDate.format(formatter));
            startDate = startDate.plusDays(1); // 하루씩 증가
        }

        vo.setAccessDateList(accessDateList);
        vo.setDiff(String.valueOf(accessDateList.size()));

        result = dashboardMapper.selectAllVersionData(vo);

        return result;
    }

    /**
     * Version Comparison > All 팝업 > Day > 행 클릭 데이터 반환
     * Version Comparison은 report 데이터로 만들어주는데 Day조회의 경우 시간단위로 쪼갤수 있는 필드가 없어서
     * Opensearch로 조회하여 차트 데이터를 만든다. 그래서 Day의 경우 테이블과 차트 데이터간에 차이가 있을 수 있음.
     * Week, Month의 경우 Report 데이터에서 가져옴
     *
     * @param vo packageNm, serverType, osType, {@link DateType}, appVer
     * @return DAU/Error/Crash 별 목록
     */
    public Map<String, List<Object>> getAllVersionComparisonRowInfoGetElastic(DashboardVO vo) {
        Map<String, List<Object>> result = new HashMap<>();
        String USER = "user";
        String COUNT = "count";

        try {
            String yesterday = DateUtil.getYesterdayWithDash();

            long from = DateUtil.dateToTimestamp(vo.getBaseDate(), true);
            long to = DateUtil.dateToTimestamp(yesterday, false);

            // DAY: 1h / WEEK, MONTH: 1d
            DateHistogramInterval interval = vo.getDateType().equals(DateType.DAY) ? DateHistogramInterval.HOUR : DateHistogramInterval.DAY;

            // Bool query with filters
            BoolQueryBuilder userBoolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));
            BoolQueryBuilder errorBoolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));
            BoolQueryBuilder crashBoolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));
            BoolQueryBuilder performanceBoolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));

            Elastic.errorBuilder(errorBoolQuery);
            Elastic.crashBuilder(crashBoolQuery);

            userBoolQuery.filter(QueryBuilders.termQuery(Elastic.appVer, vo.getAppVer()));
            userBoolQuery.filter(QueryBuilders.rangeQuery(Elastic.appStartTm).gte(from).lte(to).timeZone("Z"));
            errorBoolQuery.filter(QueryBuilders.termQuery(Elastic.appVer, vo.getAppVer()));
            errorBoolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm).gte(from).lte(to).timeZone("Z"));
            crashBoolQuery.filter(QueryBuilders.termQuery(Elastic.appVer, vo.getAppVer()));
            crashBoolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm).gte(from).lte(to).timeZone("Z"));
            performanceBoolQuery.filter(QueryBuilders.termQuery(Elastic.appVer, vo.getAppVer()));
            performanceBoolQuery.filter(QueryBuilders.rangeQuery(Elastic.pageStartTm).gte(from).lte(to).timeZone("Z"));

            DateHistogramAggregationBuilder userHistogramAgg = AggregationBuilders.dateHistogram(Elastic.RES)
                    .field(Elastic.appStartTm)
                    .calendarInterval(interval)
                    .timeZone(TimeZone.getTimeZone("Asia/Seoul").toZoneId())
                    .minDocCount(0)
                    .subAggregation(AggregationBuilders.cardinality(USER).field(Elastic.deviceId_raw));
            DateHistogramAggregationBuilder troubleHistogramAgg = AggregationBuilders.dateHistogram(Elastic.RES)
                    .field(Elastic.logTm)
                    .calendarInterval(interval)
                    .timeZone(TimeZone.getTimeZone("Asia/Seoul").toZoneId())
                    .minDocCount(0)
                    .subAggregation(AggregationBuilders.cardinality(COUNT).field(Elastic.deviceId_raw));
            DateHistogramAggregationBuilder performanceHistogramAgg = AggregationBuilders.dateHistogram(Elastic.RES)
                    .field(Elastic.pageStartTm)
                    .calendarInterval(interval)
                    .timeZone(TimeZone.getTimeZone("Asia/Seoul").toZoneId())
                    .minDocCount(0)
                    .subAggregation(AggregationBuilders.percentiles(Elastic.loadingTime).field(Elastic.loadingTime).percentiles(50))
                    .subAggregation(AggregationBuilders.avg(Elastic.responseTime).field(Elastic.responseTime));

            SearchSourceBuilder userSourceBuilder = new SearchSourceBuilder()
                    .query(userBoolQuery)
                    .aggregation(userHistogramAgg)
                    .size(0);
            SearchSourceBuilder errorSourceBuilder = new SearchSourceBuilder()
                    .query(errorBoolQuery)
                    .aggregation(troubleHistogramAgg)
                    .size(0);
            SearchSourceBuilder crashSourceBuilder = new SearchSourceBuilder()
                    .query(crashBoolQuery)
                    .aggregation(troubleHistogramAgg)
                    .size(0);
            SearchSourceBuilder performanceSourceBuilder = new SearchSourceBuilder()
                    .query(performanceBoolQuery)
                    .aggregation(performanceHistogramAgg)
                    .size(0);

            SearchRequest userSearchRequest = new SearchRequest(ElasticIndex.ACCESS_HISTORY.getIndex() + "*")
                    .source(userSourceBuilder);
            SearchRequest errorSearchRequest = new SearchRequest(ElasticIndex.TROUBLE_LOG.getIndex() + "*")
                    .source(errorSourceBuilder);
            SearchRequest crashSearchRequest = new SearchRequest(ElasticIndex.TROUBLE_LOG.getIndex() + "*")
                    .source(crashSourceBuilder);
            SearchRequest performanceSearchRequest = new SearchRequest(ElasticIndex.PAGE_LOG.getIndex() + "*")
                    .source(performanceSourceBuilder);

            SearchResponse userResponse = elasticClient.get(userSearchRequest);
            SearchResponse errorResponse = elasticClient.get(errorSearchRequest);
            SearchResponse crashResponse = elasticClient.get(crashSearchRequest);
            SearchResponse performanceResponse = elasticClient.get(performanceSearchRequest);

            if (userResponse == null || errorResponse == null || crashResponse == null || performanceResponse == null) {
                return result;
            }

            ParsedDateHistogram userRes = userResponse.getAggregations().get(Elastic.RES);
            List<Object> userData = new ArrayList<>();

            for (Histogram.Bucket bucket : userRes.getBuckets()) {
                ZonedDateTime keyTime = (ZonedDateTime) bucket.getKey();
                long time = keyTime.toInstant().toEpochMilli();

                List<Object> item = new ArrayList<>();
                item.add(time); // timestamp
                item.add(bucket.getDocCount()); // "doc_count": Field

                userData.add(item);
            }

            result.put("user", userData);

            ParsedDateHistogram errorRes = errorResponse.getAggregations().get(Elastic.RES);
            List<Object> errorData = new ArrayList<>();

            for (Histogram.Bucket bucket : errorRes.getBuckets()) {
                ZonedDateTime keyTime = (ZonedDateTime) bucket.getKey();
                long time = keyTime.toInstant().toEpochMilli();

                List<Object> item = new ArrayList<>();
                item.add(time); // timestamp
                item.add(bucket.getDocCount()); // error total

                errorData.add(item);
            }

            result.put("error", errorData);

            ParsedDateHistogram crashRes = crashResponse.getAggregations().get(Elastic.RES);
            List<Object> crashData = new ArrayList<>();

            for (Histogram.Bucket bucket : crashRes.getBuckets()) {
                ZonedDateTime keyTime = (ZonedDateTime) bucket.getKey();
                long time = keyTime.toInstant().toEpochMilli();

                List<Object> item = new ArrayList<>();
                item.add(time); // timestamp
                item.add(bucket.getDocCount()); // crash total

                crashData.add(item);
            }

            result.put("crash", crashData);

            ParsedDateHistogram performanceRes = performanceResponse.getAggregations().get(Elastic.RES);
            List<Object> loadingTimeData = new ArrayList<>();
            List<Object> responseTimeData = new ArrayList<>();

            for (Histogram.Bucket bucket : performanceRes.getBuckets()) {
                ParsedTDigestPercentiles loadingTime = bucket.getAggregations().get(Elastic.loadingTime);
                ParsedAvg responseTimeAggregation = bucket.getAggregations().get(Elastic.responseTime);

                ZonedDateTime keyTime = (ZonedDateTime) bucket.getKey();
                long time = keyTime.toInstant().toEpochMilli();

                long loadingTimeVal = 0L;
                if (loadingTime != null) {
                    loadingTimeVal = Math.round(loadingTime.percentile(50));
                }

                List<Object> loadingTimeItem = new ArrayList<>();
                loadingTimeItem.add(time); // timestamp
                loadingTimeItem.add(loadingTimeVal);

                List<Object> responseTimeItem = new ArrayList<>();
                responseTimeItem.add(time); // timestamp
                if (Double.isInfinite(responseTimeAggregation.getValue()) || Double.isNaN(responseTimeAggregation.getValue())) {
                    responseTimeItem.add(0);
                } else {
                    responseTimeItem.add(Math.round(responseTimeAggregation.getValue()));
                }

                loadingTimeData.add(loadingTimeItem);
                responseTimeData.add(responseTimeItem);
            }

            result.put("loadingTime", loadingTimeData);
            result.put("responseTime", responseTimeData);

        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        return result;
    }

    /**
     * Version Comparison > All 팝업 > Week, Month > 행 클릭 데이터 반환
     * Version Comparison은 report 데이터로 만들어주는데 Day조회의 경우 시간단위로 쪼갤수 있는 필드가 없어서
     * Opensearch로 조회하여 차트 데이터를 만든다. 그래서 Day의 경우 테이블과 차트 데이터간에 차이가 있을 수 있음.
     * Week, Month의 경우 Report 데이터에서 가져옴
     *
     * @param vo packageNm, serverType, osType, {@link DateType}, appVer
     * @return DAU/Error/Crash 별 목록
     */
    public Map<String, List<Object>> getAllVersionComparisonRowInfoGetReport(DashboardVO vo) {
        Map<String, List<Object>> result = new HashMap<>();
        result.put("user", new ArrayList<>());
        result.put("error", new ArrayList<>());
        result.put("crash", new ArrayList<>());
        result.put("loadingTime", new ArrayList<>());
        result.put("responseTime", new ArrayList<>());

        String yesterday = DateUtil.getYesterdayWithDash();

        long fromTimestamp = DateUtil.dateToTimestamp(vo.getBaseDate(), true);
        long toTimestamp = DateUtil.dateToTimestamp(yesterday, false);

        LocalDate startDate = Instant.ofEpochMilli(fromTimestamp).atZone(ZoneId.systemDefault()).toLocalDate();
        LocalDate endDate = Instant.ofEpochMilli(toTimestamp).atZone(ZoneId.systemDefault()).toLocalDate();

        // yyyyMMdd 형식 지정
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMdd");

        List<String> accessDateList = new ArrayList<>();

        // 시작 날짜부터 종료 날짜까지 순회하며 출력
        while (!startDate.isAfter(endDate)) {
            accessDateList.add(startDate.format(formatter));
            startDate = startDate.plusDays(1); // 하루씩 증가
        }

        vo.setAccessDateList(accessDateList);
        vo.setDiff(String.valueOf(accessDateList.size()));

        List<Map<String, Object>> issueData = dashboardMapper.selectVersionComparisonRowInfo(vo);

        for (Map<String, Object> data : issueData) {
            long timestamp = DateUtil.dateToTimestamp(String.valueOf(data.get("baseDate")), true);

            result.get("user").add(List.of(timestamp, data.get("dau")));
            result.get("error").add(List.of(timestamp, data.get("error")));
            result.get("crash").add(List.of(timestamp, data.get("crash")));
            result.get("loadingTime").add(List.of(timestamp, data.get("loadingTime")));
            result.get("responseTime").add(List.of(timestamp, data.get("responseTime")));
        }

        return result;
    }

    /**
     * Redis에서 OS 별 동시 접속자 데이터 조회
     *
     * @param vo osType, appInfo, from, to
     * @return osType 별 동시 접속자 정보
     */
    public Map<String, Map<String, Long>> getConcurrentUserCount(DashboardVO vo) {
        Map<String, Map<String, Long>> result = new HashMap<>();
        if ("A".equalsIgnoreCase(vo.getOsType())) {
            for (String o : new String[]{"iOS", "Android"}) {
                result.put(o, getConcurrentUserCount(vo, o));
            }
        } else {
            result.put(vo.getOsType(), getConcurrentUserCount(vo, vo.getOsType()));
        }

        return result;
    }

    /**
     * 특정 osType 의 동시 접속자 정보
     *
     * @param vo     appInfo
     * @param osType osType(not all)
     * @return 동시 접속자 정보
     */
    private Map<String, Long> getConcurrentUserCount(DashboardVO vo, String osType) {
        Map<String, Long> result = new HashMap<>();

        // appCcuCount:appId:serverType:osType:yyyyMMdd
        String pattern = String.join(":",
                "appCcuCount",
                vo.getPackageNm(),
                vo.getServerType(),
                osType,
                DateUtil.getIndexDate());

        // 당일 날짜의 모든 키 조회 (시간:분 까지)
        long s = System.currentTimeMillis();
        Set<String> keys = redisService.keys(pattern + "*");
        log.debug("get keys time: {}ms ", System.currentTimeMillis() - s);

        if (keys.isEmpty()) {
            return Collections.emptyMap();
        }

        List<String> keyList = new ArrayList<>(keys);
        long s1 = System.currentTimeMillis();
        // 이미 데이터를 넣을 때 String 으로 넣어서 getLong 을 사용할 수 없었음 .. 추후에 Long 타입으로 넣으면 좋을 듯
        List<Object> valList = redisService.get(keyList);
        log.debug("get val time: {} ms", System.currentTimeMillis() - s1);
        if (valList == null || valList.isEmpty()) {
            return Collections.emptyMap();
        }

        long s2 = System.currentTimeMillis();
        for (int i = 0; i < keyList.size(); i++) {
            String key = keyList.get(i);
            String[] keyArr = key.split(":");
            if (keyArr.length != 5) {
                continue;
            }
            String time = keyArr[4];
            if (time.length() > 12) {
                // 12 자리 넘어가면 (초 포함이라면) 분까지로 자르기
                time = time.substring(0, 12);
            }

            // null check 하여 time: val 구조로 넣기
            Object val = valList.get(i);
            result.put(time, val == null ? 0L : Long.parseLong(String.valueOf(val)));
        }
        log.debug("get concurrent user count time: {} ms", System.currentTimeMillis() - s2);

        // 현재시간까지의 padding 값 추가
        for (String time : DateUtil.generateTimeArray()) {
            result.putIfAbsent(time, 0L);
        }

        return result;
    }

    public Map<String, Map<String, Long>> getConcurrentUserCountByDate(DashboardVO vo) {
        Map<String, Map<String, Long>> result = new HashMap<>();

        BoolQueryBuilder boolQuery = QueryBuilders.boolQuery();
        boolQuery.filter(QueryBuilders.termQuery(Elastic.packageNm, vo.getPackageNm()));
        boolQuery.filter(QueryBuilders.termQuery(Elastic.serverType, vo.getServerType()));
        if (vo.checkOsType()) {
            boolQuery.filter(QueryBuilders.termQuery(Elastic.osType, vo.getOsType()));
        } else {
            boolQuery.filter(QueryBuilders.termsQuery(Elastic.osType, "iOS", "Android"));
        }

        boolQuery.filter(QueryBuilders.termQuery("year", vo.getBaseDate().substring(0, 4)));
        boolQuery.filter(QueryBuilders.termQuery("month", vo.getBaseDate().substring(4, 6)));
        boolQuery.filter(QueryBuilders.termQuery("day", vo.getBaseDate().substring(6, 8)));

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .size(10000)
                .query(boolQuery);

        SearchRequest searchRequest = new SearchRequest(ElasticIndex.CCU.getIndex())
                .source(searchSourceBuilder);

        log.debug(searchRequest.toString());
        try {
            SearchResponse response = elasticClient.get(searchRequest);
            if (response == null) {
                return Collections.emptyMap();
            }

            for (SearchHit hit : response.getHits()) {
                Map<String, Object> map = hit.getSourceAsMap();
                String osType = (String) map.get("osType");
                Map<String, Long> tmp = result.getOrDefault(osType, new HashMap<>());
                tmp.put(String.valueOf(map.get("dateTime")), Long.valueOf((Integer) map.get("value")));
                result.put(osType, tmp);
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        return result;
    }

    public Map<String, Map<String, Long>> getConcurrentUserCountByDateRange(DashboardVO vo) {
        Map<String, Map<String, Long>> result = new HashMap<>();
        if ("A".equalsIgnoreCase(vo.getOsType())) {
            for (String osType : new String[]{"iOS", "Android"}) {
                result.put(osType, getConcurrentUserCountByDateRange(vo, osType));
            }
        } else {
            result.put(vo.getOsType(), getConcurrentUserCountByDateRange(vo, vo.getOsType()));
        }
        return result;
    }

    public Map<String, Long> getConcurrentUserCountByDateRange(DashboardVO vo, String osType) {
        Map<String, Long> result = new HashMap<>();

        BoolQueryBuilder boolQuery = QueryBuilders.boolQuery();
        boolQuery.filter(QueryBuilders.termQuery(Elastic.packageNm, vo.getPackageNm()));
        boolQuery.filter(QueryBuilders.termQuery(Elastic.serverType, vo.getServerType()));
        boolQuery.filter(QueryBuilders.termQuery(Elastic.osType, osType));

        String[] dateTime = DateUtil.getBaseDates(vo.getFrom(), vo.getTo());

        boolQuery.filter(QueryBuilders.rangeQuery("dateTime")
                .gte(dateTime[0] + "0000")
                .lte(dateTime[1] + "2359")
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

        SearchRequest searchRequest = new SearchRequest(ElasticIndex.CCU.getIndex())
                .source(searchSourceBuilder);

        log.debug(searchRequest.toString());

        try {
            SearchResponse response = elasticClient.get(searchRequest);
            if (response == null) {
                return Collections.emptyMap();
            }

            ParsedComposite composite = response.getAggregations().get(Elastic.RES);
            composite.getBuckets().forEach(bucket -> {
                Map<String, Object> keyMap = bucket.getKey();
                ParsedMax parsedMax = bucket.getAggregations().get("maxCount");
                double val = parsedMax.getValue();
                if (Double.isNaN(val) || Double.isInfinite(val)) {
                    val = 0;
                }
                result.put("" + keyMap.get("year") + keyMap.get("month") + keyMap.get("day") + "000000", (long) val);
            });
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        // padding date
        for (String date : DateUtil.generateDateRange(vo.getFrom(), vo.getTo(), "000000")) {
            result.putIfAbsent(date, 0L);
        }

        return result;
    }

    /**
     * 금일 CCU 데이터 중 OS 별 최대치의 값 도출
     *
     * @param ccu 동접자 데이터
     * @return OS 별 최대치 데이터
     */
    public Map<String, Long> getPeakConcurrentUserData(Map<String, Map<String, Long>> ccu) {
        Map<String, Long> result = new HashMap<>();
        for (Map.Entry<String, Map<String, Long>> entry : ccu.entrySet()) {
            String osType = entry.getKey();
            Map<String, Long> value = entry.getValue();
            Long max = 0L;
            // max 값 조회
            for (Map.Entry<String, Long> en : value.entrySet()) {
                Long val = en.getValue();
                if (val > max) {
                    max = val;
                }
            }
            result.put(osType, max);
        }

        return result;
    }

    /**
     * Map -> List 로 변경하여 List 에서 time 기준으로 acs sort 하도록 함
     *
     * @param ccuData osType 별 time: value 구조
     * @return osType 별 List<time:value> 구조
     */
    public Map<String, List<Map<String, Long>>> convertConcurrentUserMap(Map<String, Map<String, Long>> ccuData) {
        Map<String, List<Map<String, Long>>> ccuResult = new HashMap<>();
        // osType 순회
        for (Map.Entry<String, Map<String, Long>> osTypeMapEntry : ccuData.entrySet()) {
            String key = osTypeMapEntry.getKey();
            Map<String, Long> valueMap = osTypeMapEntry.getValue();
            List<Map<String, Long>> tmpList = new ArrayList<>();
            // ccu 데이터 순회
            for (Map.Entry<String, Long> timeMapEntry : valueMap.entrySet()) {
                String k = timeMapEntry.getKey();
                Long value = timeMapEntry.getValue();
                Map<String, Long> tmpMap = new HashMap<>();
                tmpMap.put("key", Long.valueOf(k));
                tmpMap.put("value", value);
                tmpList.add(tmpMap);
            }
            // time (key) 기준으로 asc
            tmpList.sort(Comparator.comparing(map -> map.get("key")));
            ccuResult.put(key, tmpList);
        }
        return ccuResult;
    }

    public List<Map<String, Object>> getTroubleListByPageUrl(DashboardVO vo, int pagingSize) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getPackageNm(), vo.getServerType(), vo.getOsType(), vo.getReqUrl());

        // 앱 정보, OS 유형 세팅
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));
        // 날짜 조건 세팅
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm).gte(vo.getFrom()).lte(vo.getTo()).timeZone("Z"));

        // 조회할 pageUrl 조건 설정
        boolQuery.filter(QueryBuilders.termQuery(Elastic.pageUrl_raw, vo.getReqUrl()));

        if (RequestType.ERROR.equals(vo.getRequestType())) {
            Elastic.errorBuilder(boolQuery);
        } else if (RequestType.CRASH.equals(vo.getRequestType())) {
            Elastic.crashBuilder(boolQuery);
        }

        // 로그 목록에 필요한 데이터만 가져오도록 설정
        String[] includes = new String[]{
                Elastic.packageNm,
                Elastic.serverType,
                Elastic.osType,
                Elastic.osVer,
                Elastic.appVer,
                Elastic.logTm,
                Elastic.deviceModel,
                Elastic.deviceId,
                Elastic.reqUrl,
                Elastic.logType,
                Elastic.pageUrl,
                Elastic.resMsg,
                Elastic.logName,
                Elastic.intervaltime,
                Elastic.loginYn,
                Elastic.userId,

                // for additional data
                Elastic.userNm,
                Elastic.userNo,
                Elastic.clientNo,
                Elastic.clientNm,
                Elastic.bizCode,
                Elastic.bizSubCode,
                Elastic.birthDay,
        };

        // query, size, _source, sort 설정
        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .size(pagingSize)
                .fetchSource(includes, null)
                // sort 값들은 searchAfter key 로 사용됨
                .sort(Elastic.logTm, SortOrder.DESC);

        // searchAfter 정보가 있으면
        if (vo.getLastId() != null) {
            // 마지막 데이터의 logTm, id 값을 Object[] 로 넣어줌
            searchSourceBuilder.searchAfter(new Object[]{vo.getLastLogTm()});
        }

        SearchRequest searchRequest = new SearchRequest(ElasticIndex.TROUBLE_LOG.getIndex() + "*")
                .source(searchSourceBuilder);

        log.debug(searchRequest.toString());

        List<Map<String, Object>> result = new ArrayList<>();
        try {
            SearchResponse response = elasticClient.get(searchRequest);
            if (response == null) {
                return result;
            }
            for (SearchHit hit : response.getHits()) {
                Map<String, Object> tmp = hit.getSourceAsMap();
                tmp.put(Elastic._ID, hit.getId());
                result.add(tmp);
            }
            CommonUtil.maskUserId(result, userIdMasking, 2);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
        return result;
    }

    public List<Map<String, Object>> getTopLogListV3(DashboardVO vo) {
        // error / crash에따라서 maxy_report_error 또는 maxy_report_crash 테이블에서 select
        switch (vo.getLogTrendType()) {
            case ERROR -> {
                return dashboardMapper.selectTopErrorLogListByReportError(vo);
            }
            case CRASH -> {
                return dashboardMapper.selectTopCrashLogListByReportCrash(vo);
            }
            default -> throw new BadRequestException(ReturnCode.ERR_WRONG_PARAMS);
        }
    }

    /**
     * Version Conversion > All 버튼 > Popup 목록
     *
     * @param vo packageNm, serverType, osType, {@link com.thinkm.maxy.vo.DashboardVO.DateType}
     * @return 전환율/에러/크래시 별 로그 목록
     */
    public List<Map<String, Object>> getVersionConversionInfoList(DashboardVO vo) {
        MultiSearchRequest multiSearchRequest = DashboardQueryFactory.createVersionConversionInfoListQuery(vo);
        try {
            MultiSearchResponse multiSearchResponse = elasticClient.get(multiSearchRequest);
            return CommonServiceHelper.parseVersionConversionInfoList(multiSearchResponse);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    /**
     * Version Conversion > All 버튼 > Popup 목록
     *
     * @param vo packageNm, serverType, osType, {@link DateType}
     * @return 전환율/에러/크래시 별 로그 목록
     */
    public List<Map<String, Object>> getVersionConversionInfoChart(DashboardVO vo) {
        // Bool query with filters
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));

        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.accessDate).gt(vo.getBaseDate()).lte(DateUtil.getToday()).timeZone("Z"));

        CompositeAggregationBuilder compositeAggs = AggregationBuilders.composite(Elastic.RES,
                Arrays.asList(
                        new TermsValuesSourceBuilder(Elastic.osType).field(Elastic.osType),
                        new TermsValuesSourceBuilder(Elastic.appVer).field(Elastic.appVer),
                        new TermsValuesSourceBuilder(Elastic.accessDate).field(Elastic.accessDate)
                )
        ).size(1000);

        SearchSourceBuilder sourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .aggregation(compositeAggs)
                .size(0);

        SearchRequest searchRequest = new SearchRequest(ElasticIndex.ACCESS_HISTORY.getIndex() + "*")
                .source(sourceBuilder);

        try {
            SearchResponse response = elasticClient.get(searchRequest);
            return CommonServiceHelper.parseVersionConversionInfoChart(response);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    /**
     * Crashes by Version > All 버튼 > Popup 목록
     *
     * @param vo packageNm, serverType, osType, {@link DateType}
     * @return OS / Version 별 User, Crash, Crash Rate
     */
    public List<Map<String, Object>> getAllCrashesByVersionData(DashboardVO vo) {
        long from = DateUtil.dateToTimestamp(vo.getBaseDate(), true);
        long to = System.currentTimeMillis();

        // Bool query with filters
        BoolQueryBuilder userBoolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));
        userBoolQuery.filter(QueryBuilders.rangeQuery(Elastic.appStartTm).gte(from).lte(to).timeZone("Z"));
        BoolQueryBuilder crashBoolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));
        crashBoolQuery.filter(QueryBuilders.rangeQuery(Elastic.pageStartTm).gte(from).lte(to).timeZone("Z"));

        // osType, appVer으로 그룹
        CompositeAggregationBuilder userCompositeAggs = AggregationBuilders.composite(Elastic.RES, Arrays.asList(
                new TermsValuesSourceBuilder(Elastic.osType).field(Elastic.osType),
                new TermsValuesSourceBuilder(Elastic.appVer).field(Elastic.appVer)
        )).size(1000);
        CompositeAggregationBuilder crashCompositeAggs = AggregationBuilders.composite(Elastic.RES, Arrays.asList(
                        new TermsValuesSourceBuilder(Elastic.osType).field(Elastic.osType),
                        new TermsValuesSourceBuilder(Elastic.appVer).field(Elastic.appVer)
                )).size(1000)
                .subAggregation(AggregationBuilders.sum(Elastic.crashCount).field(Elastic.crashCount));

        SearchSourceBuilder userSourceBuilder = new SearchSourceBuilder()
                .query(userBoolQuery)
                .aggregation(userCompositeAggs)
                .size(0);
        SearchSourceBuilder crashSourceBuilder = new SearchSourceBuilder()
                .query(crashBoolQuery)
                .aggregation(crashCompositeAggs)
                .size(0);

        SearchRequest userSearchRequest = new SearchRequest(ElasticIndex.ACCESS_HISTORY.getIndex() + "*")
                .source(userSourceBuilder);
        SearchRequest crashSearchRequest = new SearchRequest(ElasticIndex.PAGE_LOG.getIndex() + "*")
                .source(crashSourceBuilder);

        try {
            SearchResponse userResponse = elasticClient.get(userSearchRequest);
            SearchResponse crashResponse = elasticClient.get(crashSearchRequest);

            if (userResponse == null || crashResponse == null) {
                return Collections.emptyList();
            }

            List<Map<String, Object>> userResultList = CommonServiceHelper.parseAllCrashesByVersionDataForUser(userResponse);
            List<Map<String, Object>> result = new ArrayList<>(userResultList);
            List<Map<String, Object>> crashResult = CommonServiceHelper.parseAllCrashesByVersionDataForCrash(crashResponse);
            result.addAll(crashResult);

            // user, crash 데이터를 osType, appVer 기준으로 merge
            List<Map<String, Object>> resultList = new ArrayList<>(result.stream().collect(Collectors.toMap(
                    entry -> Map.of(
                            "osType", entry.get("osType"),
                            "appVer", entry.get("appVer")
                    ),
                    HashMap::new,
                    (map1, map2) -> {
                        map1.putAll(map2);
                        return map1;
                    }
            )).values());

            // 리스트 정렬 crashRate desc
            resultList.sort(Comparator.comparing((Map<String, Object> map) -> (Double) map.get("crashRate"))
                    .reversed());

            return resultList;
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    /**
     * Crashes by Version > All 팝업 > 행 클릭 데이터 Crash 반환
     *
     * @param vo packageNm, serverType, osType, {@link DateType}, appVer
     * @return 목록의 Crash 분포
     */
    public List<Object> getAllCrashesByVersionRowData(DashboardVO vo) {
        List<Object> result = new ArrayList<>();

        try {
            long from = DateUtil.dateToTimestamp(vo.getBaseDate(), true);
            long to = System.currentTimeMillis();

            // DAY: 1h / WEEK, MONTH: 1d
            DateHistogramInterval interval = vo.getDateType().equals(DateType.DAY) ? DateHistogramInterval.HOUR : DateHistogramInterval.DAY;

            // Bool query with filters
            BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));

            boolQuery.filter(QueryBuilders.termQuery(Elastic.appVer, vo.getAppVer()));
            boolQuery.filter(QueryBuilders.rangeQuery(Elastic.pageStartTm).gte(from).lte(to).timeZone("Z"));

            SumAggregationBuilder countAgg = AggregationBuilders.sum(Elastic.crashCount)
                    .field(Elastic.crashCount); // Crash sum

            DateHistogramAggregationBuilder histogramAggregationBuilder = AggregationBuilders.dateHistogram(Elastic.RES)
                    .field(Elastic.pageStartTm)
                    .calendarInterval(interval)
                    .timeZone(TimeZone.getTimeZone("Asia/Seoul").toZoneId())
                    .minDocCount(0)
                    .subAggregation(countAgg);

            SearchSourceBuilder sourceBuilder = new SearchSourceBuilder()
                    .query(boolQuery)
                    .aggregation(histogramAggregationBuilder)
                    .size(0);

            SearchRequest searchRequest = new SearchRequest(ElasticIndex.PAGE_LOG.getIndex() + "*")
                    .source(sourceBuilder);

            SearchResponse response = elasticClient.get(searchRequest);

            if (response == null) {
                return result;
            }

            ParsedDateHistogram res = response.getAggregations().get(Elastic.RES);

            for (Histogram.Bucket bucket : res.getBuckets()) {
                ParsedSum crashAggregation = bucket.getAggregations().get(Elastic.crashCount);

                ZonedDateTime keyTime = (ZonedDateTime) bucket.getKey();
                long time = keyTime.toInstant().toEpochMilli();

                List<Object> item = new ArrayList<>();
                item.add(time); // timestamp
                item.add(crashAggregation.getValue()); // crash total

                result.add(item);
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        return result;
    }

    public List<Map<String, Object>> getMarketingInsight(DashboardVO vo) {
        long[] times = DateUtil.calculateTimestamps(System.currentTimeMillis());
        return getMarketingInsight(vo, DateHistogramInterval.HOUR, times[0], times[1]);
    }

    public List<Map<String, Object>> getMarketingInsight(DashboardVO vo,
                                                         DateHistogramInterval interval,
                                                         long from, long to) {
        SearchRequest searchRequest = DashboardQueryFactory.createMarketingInsightQuery(vo, interval, from, to);
        log.debug(searchRequest.toString());
        try {
            SearchResponse response = elasticClient.get(searchRequest);
            if (response == null || response.getAggregations() == null) {
                return Collections.emptyList();
            }
            List<Map<String, Object>> result = new ArrayList<>();
            ParsedDateHistogram res = response.getAggregations().get(Elastic.RES);
            for (Histogram.Bucket bucket : res.getBuckets()) {
                Map<String, Object> item = new HashMap<>();
                item.put("pageStartTm", Long.parseLong(bucket.getKeyAsString()));
                ParsedCardinality users = bucket.getAggregations().get("users");
                item.put("users", users.getValue());
                ParsedFilter reach = bucket.getAggregations().get("reach");
                item.put("reach", reach.getDocCount());
                ParsedFilter bounce = bucket.getAggregations().get("bounce");
                item.put("bounce", bounce.getDocCount());

                // 일간 집계인 경우에만 lead avg를 구한다
                if (DateHistogramInterval.DAY.equals(interval)) {
                    ParsedAvg lead = bucket.getAggregations().get("lead");
                    // doc_count가 없어서 Infinity로 나올때
                    if (Double.isInfinite(lead.getValue())) {
                        item.put("lead", 0);
                    } else {
                        item.put("lead", lead.getValue());
                    }
                }

                result.add(item);
            }

            return result;
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    public Map<String, List<List<Object>>> processMarketingInsightData(List<Map<String, Object>> rawData) {
        // 데이터 정렬
        rawData = rawData.stream()
                .sorted(Comparator.comparingLong(d -> (long) d.get("pageStartTm")))
                .collect(Collectors.toList());

        long startTime = DateUtil.getStartOfDay(rawData.get(0).get("pageStartTm"));
        long endTime = DateUtil.getCurrentHour();

        Map<Long, Map<String, Integer>> timeDataMap = new TreeMap<>();

        // 주어진 데이터 추가
        for (Map<String, Object> entry : rawData) {
            Map<String, Integer> values = new HashMap<>();
            long time = (long) entry.get("pageStartTm");
            values.put("users", CommonUtil.longToInt((long) entry.get("users")));
            values.put("reach", CommonUtil.longToInt((long) entry.get("reach")));
            values.put("bounce", CommonUtil.longToInt((long) entry.get("bounce")));
            timeDataMap.put(time, values);
        }

        // 보간하여 데이터 채우기
        List<Long> timestamps = new ArrayList<>(timeDataMap.keySet());
        for (long time = startTime; time <= endTime; time += 3600) {
            if (!timeDataMap.containsKey(time)) {
                long prevTime = DateUtil.findPreviousTime(timestamps, time);
                long nextTime = DateUtil.findNextTime(timestamps, time);

                if (prevTime != -1 && nextTime != -1) {
                    // 선형 보간
                    Map<String, Integer> prevData = timeDataMap.get(prevTime);
                    Map<String, Integer> nextData = timeDataMap.get(nextTime);

                    double ratio = (double) (time - prevTime) / (nextTime - prevTime);
                    Map<String, Integer> interpolated = new HashMap<>();
                    interpolated.put("users", CommonUtil.interpolate(prevData.get("users"), nextData.get("users"), ratio));
                    interpolated.put("reach", CommonUtil.interpolate(prevData.get("reach"), nextData.get("reach"), ratio));
                    interpolated.put("bounce", CommonUtil.interpolate(prevData.get("bounce"), nextData.get("bounce"), ratio));

                    timeDataMap.put(time, interpolated);
                }
            }
        }

        // 최종 결과를 원하는 구조로 변환
        Map<String, List<List<Object>>> result = new HashMap<>();
        result.put("users", new ArrayList<>());
        result.put("reach", new ArrayList<>());
        result.put("bounce", new ArrayList<>());

        for (Map.Entry<Long, Map<String, Integer>> entry : timeDataMap.entrySet()) {
            long time = entry.getKey();
            Map<String, Integer> values = entry.getValue();
            result.get("users").add(Arrays.asList(time, values.get("users")));
            result.get("reach").add(Arrays.asList(time, values.get("reach")));
            result.get("bounce").add(Arrays.asList(time, values.get("bounce")));
        }

        return result;
    }

    public Map<String, Object> getMarketingInsightList(DashboardVO vo, String type) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.pageStartTm).gte(vo.getFrom()).lte(vo.getTo()).timeZone("Z"));
        boolQuery.filter(QueryBuilders.termsQuery(Elastic.preUrl_raw, vo.getPreUrl()));

        TermQueryBuilder reqUrlBuilder = QueryBuilders.termQuery(Elastic.reqUrl_raw, vo.getReqUrl());

        if ("bounce".equalsIgnoreCase(type)) {
            // 이탈은 reqUrl 이 아닌것
            boolQuery.mustNot(reqUrlBuilder);
        } else if ("reach".equalsIgnoreCase(type)) {
            // 도달은 reqUrl 인것
            boolQuery.filter(reqUrlBuilder);
        } else {
            throw new BadRequestException();
        }

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder();
        searchSourceBuilder.query(boolQuery);
        searchSourceBuilder.size(50);
        // sort 값들은 searchAfter key 로 사용됨
        searchSourceBuilder.sort(Elastic.pageStartTm, SortOrder.DESC); // 정렬 기준 필드
        searchSourceBuilder.trackTotalHits(true); // 비율 구하는 용도
        searchSourceBuilder.fetchSource(new String[]{
                Elastic.pageStartTm,
                Elastic.deviceId,
                Elastic.userId,
                Elastic.preUrl,
                Elastic.preUrlTime,
                Elastic.parentLogDate,
                Elastic.reqUrl,
                Elastic.deviceModel,
                Elastic.osType,
                Elastic.appVer,
                Elastic.osVer,
                Elastic.simOperatorNm,
                Elastic.comType,
                Elastic.timeZone,
                Elastic.logType,
                Elastic.flowOrder,
                Elastic.userNm,
                Elastic.clientNm,
                Elastic.birthDay
        }, null);

        Script script = new Script("(!doc.containsKey('preUrlTime') || doc['preUrlTime'].empty || doc['preUrlTime'].value.toInstant().toEpochMilli() == 0) ? 0 : doc['pageStartTm'].value.toInstant().toEpochMilli() - doc['preUrlTime'].value.toInstant().toEpochMilli()");
        AvgAggregationBuilder leadAggregation = AggregationBuilders.avg("leadAvg").script(script);
        searchSourceBuilder.aggregation(leadAggregation);

        // searchAfter 정보가 있으면
        if (vo.getLastId() != null && vo.getLastPageStartTm() != null
            && !vo.getLastId().isBlank() && !vo.getLastPageStartTm().isBlank()) {
            // 마지막 데이터의 logTm, id 값을 Object[] 로 넣어줌
            searchSourceBuilder.searchAfter(new Object[]{vo.getLastPageStartTm()});
        }

        SearchRequest searchRequest = new SearchRequest(ElasticIndex.PAGE_LOG.getIndex() + "*")
                .source(searchSourceBuilder);

        log.debug(searchRequest.toString());

        Map<String, Object> resultMap = new HashMap<>();
        List<Map<String, Object>> result = new ArrayList<>();
        long count = 0L;
        try {
            SearchResponse response = elasticClient.get(searchRequest);
            if (response == null) {
                return Collections.emptyMap();
            }
            // 결과물 id 넣어주기
            SearchHits hits = response.getHits();
            hits.forEach(hit -> {
                Map<String, Object> item = hit.getSourceAsMap();
                item.put(Elastic._ID, hit.getId());

                if (item.get(Elastic.preUrlTime) == null) {
                    item.put("lead", "-");
                } else {
                    Long lead = (Long) item.get(Elastic.pageStartTm) - (Long) item.get(Elastic.preUrlTime);
                    item.put("lead", lead);
                }

                result.add(item);
            });
            // 비율 구하기 위한 total hits
            TotalHits totalHits = hits.getTotalHits();
            count = totalHits == null ? 0 : totalHits.value;

            // lead avg 값
            ParsedAvg aggr = response.getAggregations().get("leadAvg");
            resultMap.put("avgLeadTime", Math.round(aggr.getValue()));
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        CommonUtil.maskUserId(result, userIdMasking, 2);

        resultMap.put("count", count);
        resultMap.put("list", result);

        if (!result.isEmpty()) {
            // 마지막 데이터
            Map<String, Object> tmp = result.get(result.size() - 1);
            resultMap.put("lastPageStartTm", tmp.get("pageStartTm"));
            resultMap.put("lastId", tmp.get(Elastic._ID));
        }

        return resultMap;
    }

    public List<Map<String, Object>> processDailyMarketingInsight(List<Map<String, Object>> data) {
        for (Map<String, Object> item : data) {
            float reach = Float.parseFloat(item.get("reach").toString());
            float bounce = Float.parseFloat(item.get("bounce").toString());
            item.put("reachRate", Math.round(reach / (reach + bounce) * 1000) / 10.0);
            item.put("bounceRate", Math.round(bounce / (reach + bounce) * 1000) / 10.0);
        }
        return data;
    }

    public Map<String, Object> getMarketingInsightPageRelations(DashboardVO vo) {
        // preUrl로 들어오는 boolquery
        BoolQueryBuilder inBoolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));
        inBoolQuery.filter(QueryBuilders.rangeQuery(Elastic.pageStartTm).gte(vo.getFrom()).lte(vo.getTo()).timeZone("Z"));
        inBoolQuery.filter(QueryBuilders.termQuery(Elastic.reqUrl_raw, vo.getPreUrl()));
        inBoolQuery.mustNot(QueryBuilders.termQuery(Elastic.preUrl_raw, vo.getPreUrl()));

        // preUrl에서 나가는 boolquery
        BoolQueryBuilder outBoolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));
        outBoolQuery.filter(QueryBuilders.rangeQuery(Elastic.pageStartTm).gte(vo.getFrom()).lte(vo.getTo()).timeZone("Z"));
        outBoolQuery.filter(QueryBuilders.termQuery(Elastic.preUrl_raw, vo.getPreUrl()));
        outBoolQuery.mustNot(QueryBuilders.termQuery(Elastic.reqUrl_raw, vo.getPreUrl()));

        // preUrl로 들어오는 url 집계
        TermsAggregationBuilder inTermsAgg = AggregationBuilders
                .terms(Elastic.RES)
                .field(Elastic.preUrl_raw)
                .size(10)
                .executionHint("map")
                .order(BucketOrder.count(false));

        // preUrl에서 나가는 url 집계
        TermsAggregationBuilder outTermsAgg = AggregationBuilders.terms(Elastic.RES)
                .field(Elastic.reqUrl_raw)
                .size(10)
                .executionHint("map")
                .order(BucketOrder.count(false));

        FiltersAggregationBuilder reachAgg = AggregationBuilders.filters("reach",
                new FiltersAggregator.KeyedFilter("count",
                        QueryBuilders.termQuery(Elastic.reqUrl_raw, vo.getReqUrl()))
        );

        SearchSourceBuilder inSourceBuilder = new SearchSourceBuilder()
                .query(QueryBuilders.boolQuery().filter(inBoolQuery))  // 최종 bool 필터
                .size(0)  // 결과는 집계만
                .trackTotalHits(true)
                .aggregation(inTermsAgg);

        SearchSourceBuilder outSourceBuilder = new SearchSourceBuilder()
                .query(outBoolQuery)
                .size(0)
                .trackTotalHits(true)
                .aggregation(outTermsAgg)
                .aggregation(reachAgg);

        SearchRequest inSearchRequest = new SearchRequest(ElasticIndex.PAGE_LOG.getIndex() + "*")
                .source(inSourceBuilder);

        SearchRequest outSearchRequest = new SearchRequest(ElasticIndex.PAGE_LOG.getIndex() + "*")
                .source(outSourceBuilder);

        Map<String, Object> result = new HashMap<>();
        try {
            SearchResponse inResponse = elasticClient.get(inSearchRequest);
            SearchResponse outResponse = elasticClient.get(outSearchRequest);

            if (inResponse == null || outResponse == null) {
                result.put("errMsg", ERR_DATA_LOAD.getMsg());
                return result;
            }

            // 인바운드 집계 결과 조회
            ParsedStringTerms inParsedTerms = inResponse.getAggregations().get(Elastic.RES);

            // 아웃바운드 집계 결과 조회
            ParsedStringTerms outParsedTerms = outResponse.getAggregations().get(Elastic.RES);

            // 도달 URL 집계 결과 조회
            Filters reachFilters = outResponse.getAggregations().get("reach");

            // 비율을 구하기 위한 전체 검색 결과 값
            result.put("inCount", inResponse.getHits().getTotalHits().value);
            result.put("outCount", outResponse.getHits().getTotalHits().value);

            // reachUrl 여부를 판단하여 reachUrl 을 추가로 넣어줄 지 말지를 판단하기 위한 flag
            AtomicBoolean found = new AtomicBoolean(false);
            List<Object[]> linkList = new ArrayList<>();
            List<Map<String, String>> nodeList = new ArrayList<>();

            inParsedTerms.getBuckets().forEach(bucket -> {
                // String, String, Long 값이 들어가기 때문에 Object 배열로 선언
                Object[] link = new Object[4];
                // highchart에서 node 명칭 보여주기용
                Map<String, String> node = new HashMap<>();

                // key: url
                String key = Objects.equals(bucket.getKeyAsString(), "") ? "-" : bucket.getKeyAsString();
                String keytmp = "IN_" + key; // in/out 구분을 위해 (sankey 차트에서 in/out에 동일한 url이 있으면 차트가 망가짐..)

                link[0] = keytmp;
                link[1] = vo.getPreUrl();
                link[2] = bucket.getDocCount();
                link[3] = "#DEDEDE";
                linkList.add(link);

                node.put("id", keytmp);
                node.put("name", key);
                node.put("color", "#DEDEDE");
                nodeList.add(node);
            });

            outParsedTerms.getBuckets().forEach(bucket -> {
                // String, String, Long 값이 들어가기 때문에 Object 배열로 선언
                Object[] link = new Object[4];
                // highchart에서 node 명칭 보여주기용
                Map<String, String> node = new HashMap<>();

                // key: url
                String key = Objects.equals(bucket.getKeyAsString(), "") ? "-" : bucket.getKeyAsString();
                String keytmp = "OUT_" + key; // in/out 구분을 위해 (sankey 차트에서 in/out에 동일한 url이 있으면 차트가 망가짐..)

                link[0] = vo.getPreUrl();
                link[1] = keytmp;
                link[2] = bucket.getDocCount();

                // 결과값에 reach url 이 있으면 found flag 를 true
                if (key.equals(vo.getReqUrl())) {
                    found.set(true);
                    link[3] = "#009FF9"; // 도달 URL인 경우 파란색으로 표시
                } else {
                    // OUT일때 도달 Req Url이 아닌 경우
                    // 하이차트에서 node와 link는 회색
                    link[3] = "#DEDEDE";
                }

                linkList.add(link);

                node.put("id", keytmp);
                node.put("name", key);
                if (key.equals(vo.getReqUrl())) {
                    // 도달 URL인 경우 파란색으로 표시
                    node.put("color", "#009FF9");
                } else {
                    // OUT일때 도달 Req Url이 아닌 경우
                    // 하이차트에서 node와 link는 회색
                    node.put("color", "#DEDEDE");
                }
                nodeList.add(node);
            });

            // 만약 reachUrl 을 찾지 못했으면 추가로 집계한 쿼리 결과물을 마지막에 붙여넣는다.
            if (!found.get()) {
                // "reach" 필터 집계 조회
                reachFilters.getBuckets().forEach(bucket -> {
                    if (bucket.getDocCount() > 0) {
                        // 도달 URL에 대한 링크 추가
                        Object[] link = new Object[4];
                        link[0] = vo.getPreUrl();
                        link[1] = "OUT_" + vo.getReqUrl();
                        link[2] = bucket.getDocCount();
                        link[3] = "#009FF9"; // 도달 URL은 파란색으로 표시
                        linkList.add(link);

                        // 도달 URL에 대한 노드 추가
                        Map<String, String> node = new HashMap<>();
                        node.put("id", "OUT_" + vo.getReqUrl());
                        node.put("name", vo.getReqUrl());
                        node.put("color", "#009FF9");
                        node.put("fontSize", "20px");
                        nodeList.add(node);
                    }
                });
            }

            // other 데이터 값 추가
            long inOther = inParsedTerms.getSumOfOtherDocCounts();
            long outOther = outParsedTerms.getSumOfOtherDocCounts();

            // other 는 마지막에 넣어줌
            // other 는 하이차트에서 node와 link는 회색
            // in: other -> url
            if (inOther > 0) {
                Object[] inOtherLink = new Object[4];
                inOtherLink[0] = "IN_Others";
                inOtherLink[1] = vo.getPreUrl();
                inOtherLink[2] = inOther;
                inOtherLink[3] = "#DEDEDE";
                linkList.add(inOtherLink);
                nodeList.add(new HashMap<>(Map.of("id", "IN_Others", "name", "Others", "color", "#DEDEDE")));
            }

            // out: url -> other
            if (outOther > 0) {
                Object[] outOtherLink = new Object[4];
                outOtherLink[0] = vo.getPreUrl();
                outOtherLink[1] = "OUT_Others";
                outOtherLink[2] = outOther;
                outOtherLink[3] = "#DEDEDE";
                linkList.add(outOtherLink);
                nodeList.add(new HashMap<>(Map.of("id", "OUT_Others", "name", "Others", "color", "#DEDEDE")));
            }

            result.put("links", linkList);
            result.put("nodes", nodeList);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        return result;
    }

    public List<Map<String, Object>> getCrashDebuggingGuideAos(DashboardVO vo) {
        BoolQueryBuilder boolQuery = QueryBuilders.boolQuery();
        boolQuery.filter(QueryBuilders.termQuery(Elastic.osType, vo.getOsType()));
        boolQuery.filter(QueryBuilders.termQuery(Elastic.type, vo.getType()));

        String replacement = Matcher.quoteReplacement("[\\\\$\\\\.]");
        String exception = vo.getLogName().replaceAll("[.$]", replacement);

        boolQuery.must(QueryBuilders.regexpQuery(Elastic.exception, exception));

        SearchSourceBuilder sourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .fetchSource(new String[]{
                        Elastic.solutionKo,
                        Elastic.solutionEn,
                }, null);

        SearchRequest searchRequest = new SearchRequest(ElasticIndex.TROUBLE_SOLUTION.getIndex())
                .source(sourceBuilder);

        List<Map<String, Object>> result = new ArrayList<>();
        try {
            SearchResponse response = elasticClient.get(searchRequest);

            if (response == null) {
                return Collections.emptyList();
            }

            for (SearchHit hit : response.getHits()) {
                Map<String, Object> tmp = hit.getSourceAsMap();
                tmp.put(Elastic._ID, hit.getId());
                result.add(tmp);
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        return result;
    }

    public List<Map<String, Object>> getCrashDebuggingGuideIos(DashboardVO vo) {
        BoolQueryBuilder boolQuery = QueryBuilders.boolQuery();
        boolQuery.filter(QueryBuilders.termQuery(Elastic.osType, vo.getOsType()));
        boolQuery.filter(QueryBuilders.termQuery(Elastic.type, vo.getType()));

        String logName = vo.getLogName().replace("+", "\\+");
        SimpleQueryStringBuilder simpleQuery = QueryBuilders
                .simpleQueryStringQuery(logName)
                .defaultOperator(SimpleQueryStringBuilder.DEFAULT_OPERATOR.OR)
                .field("reason");

        boolQuery.must(simpleQuery);

        SearchSourceBuilder sourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .size(1000)
                .fetchSource(new String[]{
                        Elastic.exception,
                        Elastic.reason,
                        Elastic.solutionKo,
                        Elastic.solutionEn,
                }, null);

        SearchRequest searchRequest = new SearchRequest(ElasticIndex.TROUBLE_SOLUTION.getIndex())
                .source(sourceBuilder);

        List<Map<String, Object>> result = new ArrayList<>();
        try {
            SearchResponse response = elasticClient.get(searchRequest);

            if (response == null) {
                return Collections.emptyList();
            }

            for (SearchHit hit : response.getHits()) {
                // _score 10 이상인것들만
                if (hit.getScore() >= 10) {
                    Map<String, Object> tmp = hit.getSourceAsMap();
                    tmp.put(Elastic._ID, hit.getId());
                    result.add(tmp);
                }
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        return result;
    }
}
