package com.thinkm.maxy.service.common;

import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.code.RequestType;
import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.util.*;
import com.thinkm.common.util.retrace.ReTrace;
import com.thinkm.common.util.sourcemap.StackMappingResult;
import com.thinkm.maxy.dto.front.common.PageDetailResponseDto;
import com.thinkm.maxy.repository.WebPerfRegistry;
import com.thinkm.maxy.service.app.helper.QueryParseHelper;
import com.thinkm.maxy.service.common.factory.CommonServiceQueryFactory;
import com.thinkm.maxy.service.common.helper.CommonServiceHelper;
import com.thinkm.maxy.vo.LogRequestVO;
import com.thinkm.maxy.vo.ReTraceInfo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.action.search.SearchResponse;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;
import org.opensearch.index.query.RangeQueryBuilder;
import org.opensearch.search.SearchHit;
import org.opensearch.search.SearchHits;
import org.opensearch.search.builder.SearchSourceBuilder;
import org.opensearch.search.sort.SortOrder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class CommonService {

    private final ReTrace retrace;
    private final ElasticClient elasticClient;
    private final WebPerfRegistry webPerfRegistry;
    private final SourceMapService sourceMapService;
    @Value("${maxy.userid-masking:false}")
    private boolean userIdMasking;

    public static Map<String, String> convertSearchFieldsToMap(String searchFields) {
        Map<String, String> result = new HashMap<>();
        if (searchFields == null || searchFields.isBlank()) {
            return new HashMap<>();
        }

        String[] fields = searchFields.trim().split(",");
        for (String field : fields) {
            String[] keyValue = field.trim().split(":");
            if (keyValue.length == 2) {
                result.put(keyValue[0], keyValue[1]);
            } else {
                result.put(keyValue[0], keyValue[0]);
            }
        }

        return Collections.unmodifiableMap(result);
    }

    public static String convertSearchFields(String searchFields) {
        if (searchFields == null || searchFields.isBlank()) {
            return JsonUtil.toJson(new HashMap<>());
        }

        return JsonUtil.toJson(convertSearchFieldsToMap(searchFields));
    }

    /**
     * 앱 정보, deviceId, 로그 시간으로 페이지 정보가 존재하는지 판단
     *
     * @param vo packageNm, serverType, osType, deviceId, logTm
     * @return 페이지 존재: true
     */
    public boolean existsPageLog(LogRequestVO vo) throws BadRequestException {
        return existsPageLog(vo, false);
    }

    /**
     * 앱 정보, deviceId, 로그 시간으로 페이지 정보가 존재하는지 판단
     *
     * @param vo      packageNm, serverType, osType, deviceId, logTm
     * @param logging logging 여부
     * @return 페이지 존재: true
     */
    public boolean existsPageLog(LogRequestVO vo, boolean logging) {
        final String packageNm = vo.getPackageNm();
        final String serverType = vo.getServerType();
        final String osType = vo.getOsType();
        final String deviceId = vo.getDeviceId();
        final Long logTm = vo.getLogTm();
        final String mxPageId = vo.getMxPageId();

        if (logTm == null || logTm < 1) {
            log.error("logTm is null: {}", vo);
            return false;
        }

        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, packageNm, serverType, osType, logTm, deviceId);
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(vo);

        if (mxPageId != null && !mxPageId.isBlank()) {
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

        String indexMonth = DateUtil.getIndexMonth(logTm);
        String index = ElasticIndex.PAGE_LOG.getIndex() + indexMonth + "*";
        SearchRequest searchRequest = new SearchRequest(index)
                .source(searchSourceBuilder);
        try {
            SearchResponse response = elasticClient.get(searchRequest);
            // 검색 결과의 hits를 가져옴
            SearchHits hits = response.getHits();

            // hits가 0보다 크면 존재한다는 의미
            return hits.getTotalHits() != null && hits.getTotalHits().value > 0;
        } catch (Exception e) {
            return false;
        }
    }

    public List<Map<String, Object>> getLogList(LogRequestVO vo) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(vo);

        if (vo.getTo() == null) {
            vo.setTo(System.currentTimeMillis());
        }
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm)
                .gte(vo.getFrom())
                .lte(vo.getTo())
                .timeZone("Z"));

        if (vo.checkAppVer()) {
            boolQuery.filter(QueryBuilders.termQuery(Elastic.appVer, vo.getAppVer()));
        }

        if (vo.getDeviceModel() != null) {
            boolQuery.filter(QueryBuilders.termQuery(Elastic.deviceModel, vo.getDeviceModel()));
        }

        if (vo.getDeviceId() != null) {
            boolQuery.filter(QueryBuilders.termQuery(Elastic.deviceId_raw, vo.getDeviceId()));
        }

        if (vo.getReqUrl() != null) {
            boolQuery.filter(QueryBuilders.termQuery(Elastic.reqUrl_raw, vo.getReqUrl()));
        }

        boolean isCrash = false;
        ElasticIndex index = switch (vo.getRequestType()) {
            case ERROR -> {
                Elastic.errorBuilder(boolQuery);
                yield ElasticIndex.TROUBLE_LOG;
            }
            case CRASH -> {
                isCrash = true;
                Elastic.crashBuilder(boolQuery);
                yield ElasticIndex.TROUBLE_LOG;
            }
            default -> ElasticIndex.TOTAL_LOG;
        };

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .sort(Elastic.logTm, SortOrder.DESC)
                .size(500);
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

                // for hana bank
                Elastic.userNm,
                Elastic.userNo,
                Elastic.clientNo,
                Elastic.clientNm,
                Elastic.bizCode,
                Elastic.bizSubCode,
                Elastic.birthDay,
        };
        searchSourceBuilder.fetchSource(includes, null);

        SearchRequest searchRequest = new SearchRequest(index.getIndex() + "*");
        searchRequest.source(searchSourceBuilder);

        List<Map<String, Object>> result = new ArrayList<>();
        try {
            SearchResponse response = elasticClient.get(searchRequest);
            SearchHits hits = response.getHits();
            if (hits.getTotalHits() == null) {
                return result;
            }
            for (SearchHit hit : hits) {
                Map<String, Object> item = hit.getSourceAsMap();
                item.put(Elastic._ID, hit.getId());
                if (isCrash) {
                    // 난독화 retrace
                    ReTraceInfo info = ReTraceInfo.fromMap(item);
                    if (info != null) {
                        String logName = retrace.convert(info, String.valueOf(item.get(Elastic.logName)));
                        item.put(Elastic.logName, logName);
                    }
                }
                result.add(item);
            }

            CommonUtil.maskUserId(result, userIdMasking, 2);

        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
        return result;
    }

    public Map<String, Object> getLogDetail(LogRequestVO vo) {
        return getLogDetail(vo, false);
    }

    public Map<String, Object> getLogDetail(LogRequestVO vo, boolean logging) {

        try {
            final String docId = vo.getDocId();
            ElasticIndex elasticIndex;
            boolean isCrash = false;
            boolean isError = false;
            if (vo.getRequestType() == null) {
                vo.setRequestType(RequestType.TOTAL);
            }
            switch (vo.getRequestType()) {
                case PAGE:
                    elasticIndex = ElasticIndex.PAGE_LOG;
                    break;
                case ERROR:
                    elasticIndex = ElasticIndex.TROUBLE_LOG;
                    isError = true;
                    break;
                case CRASH:
                    elasticIndex = ElasticIndex.TROUBLE_LOG;
                    isCrash = true;
                    break;
                case NETWORK:
                    elasticIndex = ElasticIndex.NETWORK_LOG;
                    break;
                default:
                    elasticIndex = ElasticIndex.TOTAL_LOG;
            }

            Map<String, Object> result = elasticClient.get(elasticIndex, docId, logging);

            result.put("userId", CommonUtil.maskUserId((String) result.get("userId"), userIdMasking, 2));
            if (result.get("maxySessionId") != null) {
                result.put("maxySessionId", result.get("maxySessionId").toString());
            }

            // 난독화 retrace
            if (isCrash) {
                ReTraceInfo info = ReTraceInfo.fromMap(result);
                if (info != null) {
                    String logName = retrace.convert(info, String.valueOf(result.get(Elastic.logName)));
                    String content = retrace.convert(info, String.valueOf(result.get(Elastic.content)));
                    result.put(Elastic.logName, logName);
                    result.put(Elastic.content, content);
                }
            }

            // Error Source Map Parse
            if (isError) {
                String errorMessage = "maxy".equals(vo.getPackageNm())
                        ? DummyUtil.makeErrorStackDummy() : (String) result.get(Elastic.resMsg);

                List<StackMappingResult> parsedError = sourceMapService.mapErrorStack(errorMessage);
                result.put("mappedErrorStack", parsedError);
            }

            return result;
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return new HashMap<>();
        }
    }

    public Map<String, Object> getCurrentPageInfoByDeviceId(LogRequestVO vo) {
        return getCurrentPageInfoByDeviceId(vo, false);
    }

    public Map<String, Object> getCurrentPageInfoByDeviceId(LogRequestVO vo, boolean logging) {

        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(vo);

        boolQuery.filter(QueryBuilders.termQuery(Elastic.deviceId_raw, vo.getDeviceId()));

        if (vo.getFlowOrder() != null && vo.getFlowOrder() >= 0) {
            boolQuery.filter(QueryBuilders.termQuery(Elastic.flowOrder, vo.getFlowOrder()));
        }

        Long logTm = vo.getLogTm();
        // Range queries
        RangeQueryBuilder pageStartTmRange = QueryBuilders.rangeQuery(Elastic.pageStartTm)
                .lte(logTm)
                .timeZone("Z");
        boolQuery.filter(pageStartTmRange);

        RangeQueryBuilder pageEndTmRange = QueryBuilders.rangeQuery(Elastic.pageEndTm)
                .gte(logTm)
                .timeZone("Z");
        boolQuery.filter(pageEndTmRange);

        // SearchSourceBuilder에 쿼리와 _source 필드 설정
        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder();
        searchSourceBuilder.query(boolQuery);

        // _source 필드를 특정 필드만 선택하도록 설정
        searchSourceBuilder.fetchSource(new String[]{Elastic.loadingTime, Elastic.responseTime, Elastic.reqUrl}, null);

        String indexMonth = DateUtil.getIndexMonth(logTm);
        String index = ElasticIndex.PAGE_LOG.getIndex() + indexMonth + "*";
        SearchRequest searchRequest = new SearchRequest(index);
        searchRequest.source(searchSourceBuilder);

        try {
            SearchResponse response = elasticClient.get(searchRequest);
            if (logging) {
                log.debug(searchRequest.toString());
                log.debug(response.toString());
            }

            SearchHits hits = response.getHits();
            if (hits.getHits().length > 0) {
                SearchHit firstHit = hits.getAt(0);
                Map<String, Object> result = firstHit.getSourceAsMap();
                result.put(Elastic._ID, firstHit.getId());
                return result;
            } else {
                return new HashMap<>();
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return new HashMap<>();
        }
    }

    public Map<String, Object> getCurrentPageInfoByPageId(String packageNm, String serverType, String mxPageId) {
        BoolQueryBuilder boolQuery = new BoolQueryBuilder();
        boolQuery.filter(QueryBuilders.termQuery(Elastic.packageNm, packageNm));
        boolQuery.filter(QueryBuilders.termQuery(Elastic.serverType, serverType));
        boolQuery.filter(QueryBuilders.termQuery(Elastic.mxPageId, mxPageId));

        // SearchSourceBuilder에 쿼리와 _source 필드 설정
        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder();
        searchSourceBuilder.query(boolQuery);

        // _source 필드를 특정 필드만 선택하도록 설정
        searchSourceBuilder.fetchSource(new String[]{Elastic.loadingTime, Elastic.responseTime, Elastic.reqUrl}, null);

        String index = ElasticIndex.PAGE_LOG.getIndex() + "*";
        SearchRequest searchRequest = new SearchRequest(index);
        searchRequest.source(searchSourceBuilder);

        try {
            SearchResponse response = elasticClient.get(searchRequest);

            SearchHits hits = response.getHits();
            if (hits.getHits().length > 0) {
                SearchHit firstHit = hits.getAt(0);
                Map<String, Object> result = firstHit.getSourceAsMap();
                result.put(Elastic._ID, firstHit.getId());
                Object mxPageIdObj = result.get(Elastic.mxPageId);
                if (mxPageIdObj != null) {
                    result.put(Elastic.mxPageId, mxPageIdObj.toString());
                }
                return result;
            } else {
                return new HashMap<>();
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return new HashMap<>();
        }
    }

    public List<Map<String, Object>> getWaterfallDataList(LogRequestVO vo) {
        SearchRequest searchRequest = CommonServiceQueryFactory.createWaterfallDataQuery(vo);
        log.debug("getWaterfallDataList : {}", searchRequest);
        try {
            SearchResponse response = elasticClient.get(searchRequest);
            return CommonServiceHelper.parseWaterfallDataList(response, webPerfRegistry);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    public List<Map<String, Object>> getCoreVitalData(LogRequestVO vo) {
        SearchRequest searchRequest = CommonServiceQueryFactory.createCoreVitalDataQuery(vo);

        log.debug("getCoreVitalData : {}", searchRequest);
        try {
            SearchResponse response = elasticClient.get(searchRequest);
            return QueryParseHelper.parseSimpleList(response);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return new ArrayList<>();
        }
    }

    public List<Map<String, Object>> getWaterfallErrorData(LogRequestVO vo) {
        SearchRequest searchRequest = CommonServiceQueryFactory.createWaterfallErrorDataQuery(vo);

        List<Map<String, Object>> result = new ArrayList<>();
        try {
            SearchResponse response = elasticClient.get(searchRequest);
            if (response == null) {
                return Collections.emptyList();
            }

            for (SearchHit hit : response.getHits()) {
                Map<String, Object> tmp = hit.getSourceAsMap();
                tmp.put(Elastic._ID, hit.getId());
                // waterfall에서 사용하는 값
                // 에러발생시간 - 페이지시작시간으로 페이시 시작으로 부터 에러가 발생한 ms시간 값을 구함
                tmp.put("waterfallTm", (long) tmp.get(Elastic.logTm) - vo.getPageStartTm());

                result.add(tmp);
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
        return result;
    }

    public PageDetailResponseDto.ResourceData getWaterfallData(LogRequestVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(),
                vo.getDeviceId(), vo.getMxPageId(),
                vo.getPageStartTm(), vo.getPageEndTm()
        );

        // resource 기본 정보 목록
        List<Map<String, Object>> resourceInfo = getWaterfallDataList(vo);

        List<Map<String, Object>> coreVital = getCoreVitalData(vo);
        Map<String, Object> performance = CommonServiceHelper.convertPerformanceData(resourceInfo);
        Map<String, Object> timing = CommonServiceHelper.convertWaterfallTimingData(resourceInfo, coreVital);
        List<Map<String, Object>> error = getWaterfallErrorData(vo);

        // Error데이터를 waterfall 데이터 형식으로 가공해서 주기
        CommonServiceHelper.processErrorData(error, resourceInfo);

        // navigation항목은 상단에 유지한 상태로 startTime 기준으로 resourceInfoData 정렬
        CommonServiceHelper.sortResourceInfoData(resourceInfo);

        // resourceInfoData에서 원본 navigation 데이터는 제거
        // reformNavigation로 waterfall 차트에 필요한 navigation 정보는 만들어서 줌
        resourceInfo = CommonServiceHelper.trimResourceInfoData(resourceInfo);


        // LCP(Largest Contentful Paint) 마킹 로직
        // entryType=largest-contentful-paint인 객체에서 url을 찾아서
        // name이 해당 url인 객체에 mark=lcp 추가
        CommonServiceHelper.markLargestContentfulPaint(resourceInfo);

        return new PageDetailResponseDto.ResourceData(resourceInfo, error, performance, timing);
    }
}
