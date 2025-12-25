package com.thinkm.maxy.service.app;

import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.code.perf.HitmapOption;
import com.thinkm.common.code.perf.HitmapType;
import com.thinkm.common.code.perf.Vital;
import com.thinkm.common.util.DummyUtil;
import com.thinkm.common.util.Elastic;
import com.thinkm.common.util.ElasticClient;
import com.thinkm.maxy.config.MaxyConfig;
import com.thinkm.maxy.dto.app.performance.NetworkDetailResponseDto;
import com.thinkm.maxy.dto.app.performance.PercentileDataResponseDto;
import com.thinkm.maxy.service.app.factory.PerformanceAnalysisQueryFactory;
import com.thinkm.maxy.service.app.helper.PerformanceAnalysisServiceHelper;
import com.thinkm.maxy.service.common.CommonService;
import com.thinkm.maxy.vo.LogRequestVO;
import com.thinkm.maxy.vo.LogVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.action.search.SearchResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class PerformanceServiceV2 {
    private final CommonService commonService;
    private final PerformanceAnalysisService performanceAnalysisService;
    private final ElasticClient elasticClient;
    private final JenniferService jenniferService;
    private final MaxyConfig maxyConfig;

    @Value("${maxy.response-aggs-hour:48}")
    private int responseAggsHour;

    public Map<String, Object> getHitmap(LogVO vo) {
        HitmapType hitmapType = HitmapType.of(vo.getType());

        HitmapOption hitmapOption = new HitmapOption(hitmapType, Math.max(vo.getDurationStep(), 100));

        SearchRequest searchRequest = PerformanceAnalysisQueryFactory.createHitmapQuery(LogRequestVO.of(vo), hitmapOption);
        log.debug("SearchRequest: {}", searchRequest);
        try {
            SearchResponse searchResponse = elasticClient.get(searchRequest);
            return PerformanceAnalysisServiceHelper.parseHitmap(searchResponse, hitmapOption);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return Collections.emptyMap();
        }
    }

    public List<Long[]> getApiResponseTimeChart(LogVO vo) {
        SearchRequest searchRequest = PerformanceAnalysisQueryFactory.createApiResponseTimeChartQuery(LogRequestVO.of(vo));
        log.debug("SearchRequest: {}", searchRequest);
        try {
            SearchResponse searchResponse = elasticClient.get(searchRequest);
            return PerformanceAnalysisServiceHelper.parseApiResponseTimeChart(searchResponse);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    public List<Map<String, Object>> getLogListByTime(LogVO vo) {

        HitmapType hitmapType = HitmapType.of(vo.getType());

        SearchRequest searchRequest = PerformanceAnalysisQueryFactory.createLogListByTimeQuery(LogRequestVO.of(vo), hitmapType);
        log.debug("SearchRequest: {}", searchRequest);
        try {
            SearchResponse searchResponse = elasticClient.get(searchRequest);
            return PerformanceAnalysisServiceHelper.parseLogListByTime(searchResponse);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    public List<Map<String, Object>> getApiListByApiUrl(LogVO vo) {
        vo.setType("response");
        Map<String, Long> avgMap = performanceAnalysisService.getAvgValueByAppInfo(vo.getType(), vo.getPackageNm(), vo.getServerType());
        vo.setAvgMap(avgMap);
        SearchRequest searchRequest = PerformanceAnalysisQueryFactory.createApiListByApiUrlQuery(LogRequestVO.of(vo));
        log.debug("SearchRequest: {}", searchRequest);
        try {
            SearchResponse searchResponse = elasticClient.get(searchRequest);
            List<Map<String, Object>> result = PerformanceAnalysisServiceHelper.parseApiListByApiUrl(searchResponse);
            PerformanceAnalysisService.putFeeldex(vo.getType(), avgMap, result);
            return result;
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    public List<Map<String, Object>> getApiListByPageUrl(LogVO vo) {
        SearchRequest searchRequest = PerformanceAnalysisQueryFactory.createApiListByPageUrlQuery(LogRequestVO.of(vo));
        log.debug("SearchRequest: {}", searchRequest);
        try {
            SearchResponse searchResponse = elasticClient.get(searchRequest);
            return PerformanceAnalysisServiceHelper.parseApiListByPageUrl(searchResponse);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    /**
     * docId로 api log detail 조회
     */
    public Map<String, Object> getApiDetail(LogVO vo) {
        SearchRequest searchRequest = PerformanceAnalysisQueryFactory.createApiDetailQuery(LogRequestVO.of(vo));
        log.debug("SearchRequest: {}", searchRequest);
        try {
            Map<String, Object> searchResponse = elasticClient.get(ElasticIndex.NETWORK_LOG, vo.getDocId());
            searchResponse.put(Elastic._ID, vo.getDocId());
            // network 정보 조회
            NetworkDetailResponseDto apiDetail = PerformanceAnalysisServiceHelper.parseApiDetail(searchResponse, maxyConfig.isUserIdMasking());
            if (apiDetail == null) {
                return Collections.emptyMap();
            }

            // jennifer 연계 데이터 조회
            Map<String, Object> jennifer = new HashMap<>();
            if (apiDetail.getJtxid() != null
                && apiDetail.getJdomain() != null
                && apiDetail.getJtime() != null) {
                jennifer = jenniferService.get(
                        apiDetail.getJdomain(),
                        apiDetail.getJtime(),
                        apiDetail.getJtxid());
            }

            Map<String, Object> result = new HashMap<>();
            result.put("detail", apiDetail);
            result.put("jenniferObj", jennifer);
            result.put("hasPageLog", commonService.existsPageLog(LogRequestVO.of(vo)));

            // dummy 요청인 경우 더미 값을 반환
            if (vo.isDummyYn()) {
                result.put("dummy", DummyUtil.makeJenniferDummy());
            }
            return result;
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return Collections.emptyMap();
        }
    }

    /**
     * LCP, INP, CLS 각각의 rating 비율, AVG
     */
    public Map<String, Integer> getCoreVital(LogVO vo, Vital vital) {
        SearchRequest searchRequest = PerformanceAnalysisQueryFactory.createCoreVitalQuery(LogRequestVO.of(vo), vital);
        log.debug("SearchRequest: {}", searchRequest);
        try {
            SearchResponse searchResponse = elasticClient.get(searchRequest);
            return PerformanceAnalysisServiceHelper.parseCoreVital(searchResponse);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return Collections.emptyMap();
        }
    }

    /**
     * LCP, INP, CLS 각각의 Value AVG 시계열 Chart
     */
    public List<Object[]> getVitalChart(LogVO vo, Vital vital) {
        SearchRequest searchRequest = PerformanceAnalysisQueryFactory.createVitalChartQuery(LogRequestVO.of(vo), vital);
        log.debug("SearchRequest: {}", searchRequest);
        try {
            SearchResponse searchResponse = elasticClient.get(searchRequest);
            return PerformanceAnalysisServiceHelper.parseVitalChart(searchResponse);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    /**
     * Status Code Group 이 errorStatusCodeGroupSet 에 들어있는 목록을 pageUrl로 검색
     */
    public List<Map<String, Object>> getApiErrorList(LogVO vo) {
        SearchRequest searchRequest = PerformanceAnalysisQueryFactory.createApiErrorListQuery(LogRequestVO.of(vo));
        log.debug("SearchRequest: {}", searchRequest);
        try {
            SearchResponse searchResponse = elasticClient.get(searchRequest);
            return PerformanceAnalysisServiceHelper.parseApiErrorList(searchResponse);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    public List<Map<String, Object>> getVitalListByPage(LogVO vo) {
        SearchRequest searchRequest = PerformanceAnalysisQueryFactory.createVitalListByPageQuery(LogRequestVO.of(vo));
        log.debug("SearchRequest: {}", searchRequest);
        try {
            SearchResponse searchResponse = elasticClient.get(searchRequest);
            return PerformanceAnalysisServiceHelper.parseVitalListByPage(searchResponse);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    public Map<String, List<Long[]>> getApiErrorChart(LogVO vo) {
        SearchRequest searchRequest = PerformanceAnalysisQueryFactory.createApiErrorChartQuery(LogRequestVO.of(vo));
        log.debug("SearchRequest: {}", searchRequest);
        try {
            SearchResponse searchResponse = elasticClient.get(searchRequest);
            return PerformanceAnalysisServiceHelper.parseApiErrorChart(searchResponse);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return Collections.emptyMap();
        }
    }

    public List<Map<String, Object>> getErrorListByApiUrl(LogVO vo) {
        SearchRequest searchRequest = PerformanceAnalysisQueryFactory.createErrorListByApiUrlQuery(LogRequestVO.of(vo));
        log.debug("SearchRequest: {}", searchRequest);
        try {
            SearchResponse searchResponse = elasticClient.get(searchRequest);
            return PerformanceAnalysisServiceHelper.parseErrorListByApiUrl(searchResponse);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    public Map<String, Double> getCoreVitalAvg(LogVO vo) {
        SearchRequest searchRequest = PerformanceAnalysisQueryFactory.createCoreVitalAvgQuery(LogRequestVO.of(vo));
        log.debug("SearchRequest: {}", searchRequest);
        try {
            SearchResponse searchResponse = elasticClient.get(searchRequest);
            return PerformanceAnalysisServiceHelper.parseCoreVitalAvg(searchResponse);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return Collections.emptyMap();
        }
    }

    public List<Map<String, Object>> getHitmapLogList(LogVO vo) {

        HitmapType hitmapType = HitmapType.of(vo.getType());

        SearchRequest searchRequest = PerformanceAnalysisQueryFactory.createHitmapListQuery(LogRequestVO.of(vo), hitmapType);
        log.debug("SearchRequest: {}", searchRequest);
        try {
            SearchResponse searchResponse = elasticClient.get(searchRequest);
            return PerformanceAnalysisServiceHelper.parseHitmapList(searchResponse, hitmapType);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    public PercentileDataResponseDto getPercentileData(LogVO vo) {
        SearchRequest searchRequest = PerformanceAnalysisQueryFactory.createPercentileDataQuery(LogRequestVO.of(vo), responseAggsHour);
        log.debug("SearchRequest: {}", searchRequest);
        try {
            SearchResponse searchResponse = elasticClient.get(searchRequest);
            return PerformanceAnalysisServiceHelper.parsePercentileData(searchResponse);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return new PercentileDataResponseDto();
        }
    }
}

