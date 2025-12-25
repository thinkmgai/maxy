package com.thinkm.maxy.service.app;

import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.code.LogType;
import com.thinkm.common.code.MaxyLogType;
import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.DateUtil;
import com.thinkm.common.util.Elastic;
import com.thinkm.common.util.ElasticClient;
import com.thinkm.common.util.retrace.ReTrace;
import com.thinkm.maxy.mapper.ReportMapper;
import com.thinkm.maxy.repository.ModelRepository;
import com.thinkm.maxy.service.app.factory.LogAnalysisQueryFactory;
import com.thinkm.maxy.service.app.helper.LogAnalysisServiceHelper;
import com.thinkm.maxy.service.app.helper.QueryParseHelper;
import com.thinkm.maxy.vo.LogRequestVO;
import com.thinkm.maxy.vo.LogVO;
import com.thinkm.maxy.vo.ReTraceInfo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.lucene.search.TotalHits;
import org.opensearch.action.search.MultiSearchRequest;
import org.opensearch.action.search.MultiSearchResponse;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.action.search.SearchResponse;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;
import org.opensearch.search.SearchHit;
import org.opensearch.search.aggregations.AggregationBuilders;
import org.opensearch.search.aggregations.bucket.histogram.DateHistogramAggregationBuilder;
import org.opensearch.search.aggregations.bucket.histogram.Histogram;
import org.opensearch.search.aggregations.bucket.histogram.LongBounds;
import org.opensearch.search.builder.SearchSourceBuilder;
import org.opensearch.search.sort.SortOrder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.OutputStream;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.DecimalFormat;
import java.text.SimpleDateFormat;
import java.time.ZonedDateTime;
import java.util.*;

@SuppressWarnings("unchecked")
@Service
@Slf4j
@RequiredArgsConstructor
public class LogAnalysisService {

    private final ElasticClient elasticClient;
    private final ReTrace retrace;
    private final ModelRepository modelRepository;
    private final ReportMapper reportMapper;
    private final ReportService reportService;

    @Value("${maxy.userid-masking:false}")
    private boolean userIdMasking;

    /**
     * 실시간 로그 목록 조회
     *
     * @return logList
     */
    public List<Map<String, Object>> getRealTimeLogList(LogVO vo) {
        SearchRequest searchRequest = LogAnalysisQueryFactory.createRealTimeLogListRequest(vo, modelRepository);
        log.debug("real time log list: {}", searchRequest);
        try {
            SearchResponse response = elasticClient.get(searchRequest);
            return QueryParseHelper.parseSimpleList(response);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    public void downloadRealTimeLogList(List<Map<String, Object>> logList,
                                        HttpServletRequest request,
                                        HttpServletResponse response,
                                        LogVO vo) {
        String newLine = System.lineSeparator();
        String lang = vo.getLocale();
        List<Map<String, Object>> deviceModelList = reportMapper.selectDeviceModelList();
        StringBuilder sb = new StringBuilder();
        String[] header = {
                "Time", "Device ID", "User ID", "Log Type",
                "Log Type Detail", "Run Time", "Request URL",
                "Result Msg.", "Device Model", "OS Ver.", "APP Ver.",
                "Login"
        };
        sb.append(String.join(",", header)).append(newLine);

        try (OutputStream outputStream = response.getOutputStream()) {
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss:SSS");
            SimpleDateFormat fileSDf = new SimpleDateFormat("yyMMddhhmmss");
            Date date = new Date();
            String fileDate = fileSDf.format(date.getTime());
            String fileName = "RealTimeLog_" + fileDate + ".csv";
            String userAgent = request.getHeader("user-agent");

            if (!fileName.contains(".csv") || userAgent.contains("Macintosh")) {
                fileName = URLEncoder.encode(fileName, StandardCharsets.UTF_8);
            } else {
                fileName = new String(fileName.getBytes("euc-kr"), StandardCharsets.ISO_8859_1);
            }

            DecimalFormat formatter = new DecimalFormat("#,##0.00");
            for (Map<String, Object> item : logList) {
                long logTime = Long.parseLong(String.valueOf(item.get("logTm")));
                date.setTime(logTime);
                Double intervalTimed = Math.round(Double.parseDouble(String.valueOf(item.get("intervaltime"))) / 1000 * 100) / 100.00;
                String intervalTime = formatter.format(intervalTimed);

                int logType = (int) item.get("logType");
                String[] content = {
                        sdf.format(date),
                        String.valueOf(item.get("deviceId")),
                        Objects.equals(String.valueOf(item.get("userId")), "null") ? "-" : CommonUtil.maskUserId(String.valueOf(item.get("userId")), userIdMasking, 2),
                        MaxyLogType.findLogTypeGroupByLogType(logType),
                        MaxyLogType.findLogTypeDetailByLogType(logType),
                        intervalTime + "sec",
                        CommonUtil.convertEscapeAndLine(String.valueOf(item.get("reqUrl"))),
                        CommonUtil.convertEscapeAndLine(String.valueOf(item.get("resMsg"))),
                        reportService.convertDeviceModel(deviceModelList, String.valueOf(item.get("deviceModel")), lang),
                        String.valueOf(item.get("osVer")),
                        String.valueOf(item.get("appVer")),
                        String.valueOf(item.get("loginYn")),
                };

                sb.append(String.join(",", content));
                sb.append(newLine);
            }

            CommonUtil.writeCsvFile(response, sb, outputStream, fileName, userAgent);

        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

    }

    /**
     * 최근 error, crash, page log 를 500개 조회. 맥시 시스템 정상동작 하는 지 판단하기 위한 기능.
     *
     * @param vo 앱 정보 및 logType
     * @return 500개 데이터
     */
    public List<Map<String, Object>> getLatestLogListV2(LogVO vo) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));
        String index;
        String timeField;
        switch (vo.getLogType()) {
            case "error" -> {
                index = ElasticIndex.TROUBLE_LOG.getIndex();
                timeField = Elastic.logTm;
                Elastic.errorBuilder(boolQuery);
            }
            case "crash" -> {
                index = ElasticIndex.TROUBLE_LOG.getIndex();
                timeField = Elastic.logTm;
                Elastic.crashBuilder(boolQuery);
            }
            case "pv" -> {
                index = ElasticIndex.PAGE_LOG.getIndex();
                timeField = Elastic.pageStartTm;
            }
            default -> throw new BadRequestException("alert.invalid.logtype");
        }

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .size(500)
                .sort(timeField, SortOrder.DESC);

        SearchRequest searchRequest = new SearchRequest(index + "*")
                .source(searchSourceBuilder);

        List<Map<String, Object>> result = new ArrayList<>();
        try {
            SearchResponse response = elasticClient.get(searchRequest);
            if (response == null) {
                return result;
            }
            for (SearchHit hit : response.getHits()) {
                Map<String, Object> item = hit.getSourceAsMap();
                item.put(Elastic._ID, hit.getId());
                result.add(item);
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        return result;
    }

    // 로그 분석 (log Count 수 조회)
    public Map<String, Long> getLogCountV2(LogVO vo) {
        // Type(Error, Crash, Page) 에 맞는 Today, Yesterday, Total Count
        LogVO.LogCountInfo[] logCountInfos = LogVO.LogCountInfo.fromKey(vo.getType());
        if (logCountInfos == null) {
            throw new BadRequestException(ReturnCode.ERR_WRONG_PARAMS);
        }

        MultiSearchRequest multiSearchRequest = new MultiSearchRequest();
        for (LogVO.LogCountInfo type : logCountInfos) {
            makeLogCountSearchRequest(vo, type, multiSearchRequest);
        }

        Map<String, Long> result = new HashMap<>();
        try {
            MultiSearchResponse multiSearchResponse = elasticClient.get(multiSearchRequest);
            if (multiSearchResponse == null) {
                return result;
            }
            int i = 0;
            for (MultiSearchResponse.Item item : multiSearchResponse) {
                String type = logCountInfos[i].getKey();
                long val = 0L;

                try {
                    SearchResponse response = item.getResponse();
                    assert response != null;
                    TotalHits totalHits = response.getHits().getTotalHits();
                    assert totalHits != null;
                    val = totalHits.value;
                } catch (Exception e) {
                    log.error(e.getMessage(), e);
                }

                result.put(type, val);
                i++;
            }

        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
        return result;
    }

    private void makeLogCountSearchRequest(LogVO vo, LogVO.LogCountInfo type, MultiSearchRequest multiSearchRequest) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));

        if (vo.checkAppVer()) {
            boolQuery.filter(QueryBuilders.termQuery(Elastic.appVer, vo.getAppVer()));
        }

        // 검색조건 세팅
        if (vo.getSearchValue() != null && !vo.getSearchValue().isBlank()) {
            switch (vo.getSearchKey()) {
                case Elastic.deviceId ->
                        boolQuery.filter(QueryBuilders.termQuery(Elastic.deviceId_raw, vo.getSearchValue()));
                case Elastic.userNm ->
                        boolQuery.filter(QueryBuilders.termQuery(Elastic.userNm_raw, vo.getSearchValue()));
                case Elastic.userId ->
                        boolQuery.filter(QueryBuilders.termQuery(Elastic.userId_raw, vo.getSearchValue()));
                case Elastic.reqUrl -> boolQuery.filter(QueryBuilders.wildcardQuery(
                        Elastic.reqUrl_raw,
                        URLDecoder.decode("*" + vo.getSearchValue() + "*", StandardCharsets.UTF_8)
                ));
                case Elastic.pageUrl -> boolQuery.filter(QueryBuilders.wildcardQuery(
                        Elastic.pageUrl_raw,
                        URLDecoder.decode("*" + vo.getSearchValue() + "*", StandardCharsets.UTF_8)
                ));
                default -> {
                }
            }
        }
        // 전체 시간영역의 from/to 날짜가 다른지 여부 (하루치만 어제 데이터를 조회할 수 있음)
        // YDA 키 인데 어제 데이터 조회하지 않는 플래그면 통과
        if ("YDA".equalsIgnoreCase(type.getDateType()) && !DateUtil.isSameDate(vo.getTotalFrom(), vo.getTotalTo())) {
            return;
        }
        long from, to;
        switch (type.getDateType()) {
            case "DAY" -> {
                from = vo.getFrom();
                to = vo.getTo();
            }
            case "YDA" -> {
                from = vo.getYesterdayFrom();
                to = vo.getYesterdayTo();
            }
            case "TOTAL" -> {
                from = vo.getTotalFrom();
                to = vo.getTotalTo();
            }
            default -> {
                return;
            }
        }
        boolQuery.filter(QueryBuilders.rangeQuery(type.getTimeField())
                .gte(from)
                .lte(to)
                .timeZone("Z"));

        // 타입에 따른 로그타입 설정
        if (LogType.ERROR.equals(type.getType())) {
            Elastic.errorBuilder(boolQuery);
        } else if (LogType.CRASH.equals(type.getType())) {
            Elastic.crashBuilder(boolQuery);
        }

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .trackTotalHits(true)
                .size(0);

        SearchRequest searchRequest = new SearchRequest(type.getIndex() + "*")
                .source(searchSourceBuilder);
        multiSearchRequest.add(searchRequest);
    }

    public List<long[]> getChartDataV2(LogVO vo) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));

        if (vo.checkAppVer()) {
            boolQuery.filter(QueryBuilders.termQuery(Elastic.appVer, vo.getAppVer()));
        }
        String index;
        String timeField;
        switch (vo.getType()) {
            case "error" -> {
                index = ElasticIndex.TROUBLE_LOG.getIndex();
                timeField = Elastic.logTm;
                Elastic.errorBuilder(boolQuery);
            }
            case "crash" -> {
                index = ElasticIndex.TROUBLE_LOG.getIndex();
                timeField = Elastic.logTm;
                Elastic.crashBuilder(boolQuery);
            }
            case "page" -> {
                index = ElasticIndex.PAGE_LOG.getIndex();
                timeField = Elastic.pageStartTm;
            }
            default -> throw new BadRequestException(ReturnCode.ERR_INVALID_LOG_TYPE);
        }

        boolQuery.filter(QueryBuilders.rangeQuery(timeField)
                .gte(vo.getFrom())
                .lte(vo.getTo())
                .timeZone("Z"));


        if (vo.getSearchValue() != null && !vo.getSearchValue().isBlank()) {
            if (Elastic.deviceId.equals(vo.getSearchKey())) {
                boolQuery.filter(QueryBuilders.termQuery(Elastic.deviceId_raw, vo.getSearchValue()));
            } else if (Elastic.userNm.equals(vo.getSearchKey())) {
                boolQuery.filter(QueryBuilders.termQuery(Elastic.userNm_raw, vo.getSearchValue()));
            } else if (Elastic.userId.equals(vo.getSearchKey())) {
                boolQuery.filter(QueryBuilders.termQuery(Elastic.userId_raw, vo.getSearchValue()));
            } else if (Elastic.reqUrl.equals(vo.getSearchKey())) {
                boolQuery.filter(QueryBuilders.wildcardQuery(Elastic.reqUrl_raw, URLDecoder.decode("*" + vo.getSearchValue() + "*", StandardCharsets.UTF_8)));
            } else if (Elastic.pageUrl.equals(vo.getSearchKey())) {
                boolQuery.filter(QueryBuilders.wildcardQuery(Elastic.pageUrl_raw, URLDecoder.decode("*" + vo.getSearchValue() + "*", StandardCharsets.UTF_8)));
            }
        }

        // Date Histogram Aggregation 설정
        DateHistogramAggregationBuilder dateHistogramAgg = AggregationBuilders.dateHistogram(Elastic.RES)
                .field(timeField)
                .fixedInterval(Elastic.makeDateHistogramInterval(vo.getInterval()))
                .extendedBounds(new LongBounds(vo.getFrom(), vo.getTo())); // ExtendedBounds 명시적으로 설정

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .aggregation(dateHistogramAgg)
                .size(0);

        SearchRequest searchRequest = new SearchRequest(index + "*")
                .source(searchSourceBuilder);

        List<long[]> result = new ArrayList<>();
        try {
            SearchResponse response = elasticClient.get(searchRequest);
            if (response == null) {
                return result;
            }
            // Top-level Aggregations 접근
            Histogram dateHistogram = response.getAggregations().get(Elastic.RES);

            // Date Histogram Buckets 반복
            for (Histogram.Bucket bucket : dateHistogram.getBuckets()) {
                ZonedDateTime keyTime = (ZonedDateTime) bucket.getKey();
                long key = keyTime.toInstant().toEpochMilli();
                long value = bucket.getDocCount();
                result.add(new long[]{key, value});
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        return result;
    }

    public Map<String, Object> getLogStackList(LogVO vo) {
        Map<String, Object> result = new HashMap<>();
        Arrays.stream(new String[]{"before", "after"}).parallel().forEach(type -> {
            SearchRequest searchRequest = LogAnalysisQueryFactory.createLogStackListQuery(LogRequestVO.of(vo), type);
            log.debug("type: {}, searchRequest: {}", type, searchRequest);
            try {
                SearchResponse response = elasticClient.get(searchRequest);
                result.put(type, LogAnalysisServiceHelper.parseLogStackList(response, type, userIdMasking));
            } catch (Exception e) {
                log.error("{}: {}", type, e.getMessage(), e);
            }
        });
        return result;
    }

    // 로그 분석 (PV 리스트 조회)
    public List<Map<String, Object>> getPageViewList(LogVO vo) {
        List<Map<String, Object>> result = new ArrayList<>();
        List<Map<String, Object>> pagingResult = new ArrayList<>();
        try {
            Map<String, Object> query = new HashMap<>();
            query.put("from", vo.getFrom());
            query.put("to", vo.getTo());
            query.put("packageNm", vo.getPackageNm());
            query.put("serverType", vo.getServerType());
            query.put("osType", vo.getOsType());
            query.put("appVer", vo.getAppVer());
            query.put("size", vo.getSize());
            query.put("offsetIndex", vo.getOffsetIndex());

            // 조회 조건 만들기
            boolean searchDeviceId = false;
            boolean searchUserId = false;
            boolean searchUserNm = false;
            boolean searchReqUrl = false;

            if (vo.getSearchValue() != null && !vo.getSearchValue().isBlank()) {
                query.put("searchValue", vo.getSearchValue());
                if ("deviceId".equals(vo.getSearchKey())) {
                    searchDeviceId = true;
                } else if ("userNm".equals(vo.getSearchKey())) {
                    searchUserNm = true;
                } else if ("userId".equals(vo.getSearchKey())) {
                    searchUserId = true;
                } else if ("reqUrl".equals(vo.getSearchKey())) {
                    searchReqUrl = true;
                    query.put("searchValue", URLDecoder.decode("*" + vo.getSearchValue() + "*", StandardCharsets.UTF_8));
                }
            }

            Map<String, Boolean> dynamicParams = new HashMap<>();
            dynamicParams.put("searchDeviceId", searchDeviceId);
            dynamicParams.put("searchUserNm", searchUserNm);
            dynamicParams.put("searchUserId", searchUserId);
            dynamicParams.put("searchReqUrl", searchReqUrl);
            dynamicParams.put("isOsType", vo.checkOsType());
            dynamicParams.put("isAppVer", vo.checkAppVer());

            // ElasticSearch 조회 변수
            Elastic elastic = Elastic.builder().method("GET")// or POST, PUT
                    .endpoint(ElasticIndex.PAGE_LOG.getIndex() + "*/_search")
                    .queryFile("lm/pageFlowList-search.json")
                    .queryParams(query)       // optional
                    .dynamicParams(dynamicParams)
                    .build();      // get() 함수를 사용하여 조회하고 Map 으로 반환

            Map<String, Object> q = elasticClient.get(elastic);
            Object res = q.get("res");
            if (res instanceof HashMap) {
                return result;
            }
            List<Map<String, Object>> resList = (List<Map<String, Object>>) res;
            for (Map<String, Object> map : resList) {
                Map<String, Object> tmp = new HashMap<>();

                Map<String, Object> loadingTimeMap = (Map<String, Object>) map.get("avgLoadingTime");
                Map<String, Object> stayTimeMap = (Map<String, Object>) map.get("avgStayTime");
                Map<String, Object> viewerMap = (Map<String, Object>) map.get("viewer");

                Integer docCount = (Integer) map.get(Elastic.DOC_COUNT);
                String reqUrl = String.valueOf(map.get(Elastic.KEY));
                Double avgLoadingTime = (Double) loadingTimeMap.get(Elastic.VALUE);
                Double avgStayTime = (Double) stayTimeMap.get(Elastic.VALUE);
                Integer viewer = (Integer) viewerMap.get(Elastic.VALUE);

                tmp.put("view", docCount);
                tmp.put("reqUrl", reqUrl);
                tmp.put("avgLoadingTime", avgLoadingTime);
                tmp.put("avgStayTime", avgStayTime);
                tmp.put("viewer", viewer);

                result.add(tmp);
            }
            int size = vo.getSize();
            int offsetIndex = vo.getOffsetIndex();
            int start;
            if (offsetIndex == 1) {
                start = 0;
            } else {
                start = offsetIndex - 1;
            }
            for (int i = start * size; i < size * offsetIndex; i++) {
                if (i >= result.size()) {
                    break;
                }
                pagingResult.add(result.get(i));
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        CommonUtil.maskUserId(pagingResult, userIdMasking, 2);

        return pagingResult;
    }

    public Map<String, List<Map<String, Object>>> getAllLogTypes() {
        List<Map<String, Object>> allLogTypes = MaxyLogType.toList();

        Map<String, List<Map<String, Object>>> result = new HashMap<>();
        for (Map<String, Object> logType : allLogTypes) {
            result.putIfAbsent((String) logType.get("group"), new ArrayList<>());
            for (String key : result.keySet()) {
                List<Map<String, Object>> logTypeList = result.get(key);
                if (logType.get("group").equals(key)) {
                    Map<String, Object> tmp = new HashMap<>();
                    tmp.put("detail", logType.get("detail"));
                    tmp.put("decimal", logType.get("decimal"));
                    logTypeList.add(tmp);
                }
            }
        }
        return result;
    }

    public List<Map<String, Object>> getTroubleLogList(LogVO vo) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));

        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm)
                .gte(vo.getFrom())
                .lte(vo.getTo())
                .timeZone("Z"));

        if (LogType.ERROR.equals(vo.getType())) {
            Elastic.errorBuilder(boolQuery);
        } else if (LogType.CRASH.equals(vo.getType())) {
            Elastic.crashBuilder(boolQuery);
        } else {
            throw new BadRequestException(ReturnCode.ERR_INVALID_LOG_TYPE);
        }

        if (vo.checkAppVer()) {
            boolQuery.filter(QueryBuilders.termQuery(Elastic.appVer, vo.getAppVer()));
        }

        // 검색조건 세팅
        if (vo.getSearchValue() != null && !vo.getSearchValue().isBlank()) {
            switch (vo.getSearchKey()) {
                case Elastic.deviceId ->
                        boolQuery.filter(QueryBuilders.termQuery(Elastic.deviceId_raw, vo.getSearchValue()));
                case Elastic.userNm ->
                        boolQuery.filter(QueryBuilders.termQuery(Elastic.userNm_raw, vo.getSearchValue()));
                case Elastic.userId ->
                        boolQuery.filter(QueryBuilders.termQuery(Elastic.userId_raw, vo.getSearchValue()));
                case Elastic.reqUrl -> boolQuery.filter(QueryBuilders.wildcardQuery(
                        Elastic.reqUrl_raw,
                        URLDecoder.decode("*" + vo.getSearchValue() + "*", StandardCharsets.UTF_8)
                ));
                case Elastic.pageUrl -> boolQuery.filter(QueryBuilders.wildcardQuery(
                        Elastic.pageUrl_raw,
                        URLDecoder.decode("*" + vo.getSearchValue() + "*", StandardCharsets.UTF_8)
                ));
                default -> {
                }
            }
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
                .size(vo.getSize())
                .fetchSource(includes, null)
                // sort 값들은 searchAfter key 로 사용됨
                .sort(Elastic.logTm, SortOrder.DESC);

        // searchAfter 정보가 있으면
        if (vo.getLastId() != null && vo.getLastLogTm() != null
            && !vo.getLastId().isBlank() && !vo.getLastLogTm().isBlank()) {
            // 마지막 데이터의 logTm, id 값을 Object[] 로 넣어줌
            searchSourceBuilder.searchAfter(new Object[]{vo.getLastLogTm()});
        }

        SearchRequest searchRequest = new SearchRequest(ElasticIndex.TROUBLE_LOG.getIndex() + "*")
                .source(searchSourceBuilder);

//        log.debug(searchRequest.toString());

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
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        CommonUtil.maskUserId(result, userIdMasking, 2);

        return result;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getStackTrace(LogVO vo) {
        Map<String, Object> result = new HashMap<>();

        try {
            result = elasticClient.get(ElasticIndex.TROUBLE_LOG, vo.getDocId());
            ReTraceInfo info = ReTraceInfo.fromMap(result);
            String logName = retrace.convert(info, String.valueOf(result.get("logName")));
            result.put("logName", logName);
            Map<String, Object> contents = (Map<String, Object>) result.get("contents");
            String occur = retrace.convert(info, String.valueOf(contents.get("occur")));
            String optional = retrace.convert(info, String.valueOf(contents.get("optional")));
            String prime = retrace.convert(info, String.valueOf(contents.get("prime")));

            contents.put("occur", occur);
            contents.put("optional", optional);
            contents.put("prime", prime);
            result.put("contents", contents);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        return result;
    }

    public List<Map<String, Object>> getLogList(ElasticIndex index, String packageNm, String serverType) {
        BoolQueryBuilder boolQuery = QueryBuilders.boolQuery();
        if (packageNm != null && !packageNm.isBlank()
            && serverType != null && !serverType.isBlank()) {
            boolQuery.filter(QueryBuilders.termQuery(Elastic.packageNm, packageNm));
            boolQuery.filter(QueryBuilders.termQuery(Elastic.serverType, serverType));
        }

        SearchSourceBuilder ssb = new SearchSourceBuilder()
                .query(boolQuery)
                .size(500);

        if (!index.getTimeColumn().isBlank()) {
            ssb.sort(index.getTimeColumn(), SortOrder.DESC);
        }

        SearchRequest searchRequest = new SearchRequest(index.getIndex() + "*").source(ssb);

        List<Map<String, Object>> result = new ArrayList<>();
        try {
            SearchResponse response = elasticClient.get(searchRequest);
            if (response == null) {
                return result;
            }
            for (SearchHit hit : response.getHits()) {
                Map<String, Object> tmp = hit.getSourceAsMap();
                Object time = tmp.get(index.getTimeColumn());
                tmp.put("timestamp", time);

                Object duration = tmp.get(index.getDurationColumn());
                tmp.put("duration", Objects.requireNonNullElse(duration, 0));

                result.add(tmp);
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
        return result;
    }
}

