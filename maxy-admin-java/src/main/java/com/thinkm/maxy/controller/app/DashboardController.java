package com.thinkm.maxy.controller.app;

import com.google.gson.JsonSyntaxException;
import com.thinkm.common.code.CommonCode;
import com.thinkm.common.code.MaxyLogType;
import com.thinkm.common.code.RequestType;
import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import com.thinkm.common.exception.AuthException;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.exception.NotFoundException;
import com.thinkm.common.util.*;
import com.thinkm.maxy.service.app.*;
import com.thinkm.maxy.service.common.CommonService;
import com.thinkm.maxy.service.common.helper.CommonServiceHelper;
import com.thinkm.maxy.vo.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.headers.Header;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;
import org.opensearch.search.aggregations.bucket.histogram.DateHistogramInterval;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 종합분석 컨트롤러
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Dashboard Controller", description = "종합분석 API 컨트롤러")
public class DashboardController {
    private final RedisService redisService;
    private final DashboardService dashboardService;
    private final CommonService commonService;
    private final DashboardConfigService dashboardConfigService;
    private final PerformanceAnalysisService performanceAnalysisService;
    private final BotService botService;
    private final UserAnalyticsService userAnalyticsService;
    private final JenniferService jenniferService;

    @Value("${maxy.response-aggs-hour:48}")
    private int responseAggsHour;
    @Value("${maxy.logmeter-throttle-ms:10}")
    private int logmeterThrottleMs;
    @Value("${maxy.production:true}")
    private boolean production;
    // userId masking 여부
    @Value("${maxy.userid-masking:false}")
    private boolean isUseridMasking;

    /**
     * 종합 분석 페이지 이동
     *
     * @return 메인 > 종합분석
     */
    @Operation(summary = "종합 분석 페이지 이동",
            description = "종합 분석 페이지로 이동합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "종합 분석 페이지를 반환합니다.",
                    content = @Content(mediaType = "application/json",
                            array = @ArraySchema(schema = @Schema(implementation = DashboardComponentVO.class)))
            )
    })
    @Auditable(action = AuditType.NAVIGATION, method = "종합 분석")
    @RequestMapping(value = "/db/0100/goDashboardView.maxy")
    public ModelAndView goDashboardView(HttpServletRequest request) {
        ModelAndView mv = new ModelAndView("db/DB0100");

        DashboardComponentVO vo = new DashboardComponentVO();
        vo.setRegInfo(request);

        // 컴포넌트 정보를 가져온다.
        Map<Integer, Object> componentsConfig = dashboardConfigService.getComponentsConfig(vo);

        // 컴포넌트 정보
        mv.addObject("componentsConfig", JsonUtil.toJson(componentsConfig));
        // 로그미터 한 번에 얼마나 보낼지에 대한 정보 (숫자)
        mv.addObject("logmeterThrottle", logmeterThrottleMs);
        // 운영 프로젝트 여부
        mv.addObject("prod", production);
        return mv;
    }

    /**
     * 종합분석 팝업에서의 로그 목록 조회
     *
     * @param vo packageNm, serverType, osType, {@link com.thinkm.common.code.RequestType}, from, reqUrl
     * @return logList
     */
    @Operation(summary = "종합 분석 팝업에서의 로그 목록 조회",
            description = "종합 분석 화면에서 팝업에서 필요한 로그 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "requestType 에 따른 로그 목록을 반환합니다.",
                    content = @Content(mediaType = "application/json",
                            array = @ArraySchema(schema = @Schema(implementation = DashboardVO.class)))
            )
    })
    @PostMapping(value = "/db/0100/getCommonLogList.maxy")
    public ResponseEntity<?> getBasicLogList(DashboardVO vo) {
        Map<String, Object> resultMap = new HashMap<>();

        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(), vo.getOsType(), vo.getRequestType());

        // 조회 기준 일시 timestamp
        if (vo.getFrom() == null) {
            vo.setFrom(DateUtil.dateToTimestamp(vo.getBaseDateByDateType(), true));
        }

        List<Map<String, Object>> logList;
        if (vo.getReqUrl() != null) {
//            logList = dashboardService.getErrorCrashListByReqUrlFromES(vo);
            int pagingSize = 500;
            logList = dashboardService.getTroubleListByPageUrl(vo, pagingSize);
            // 데이터가 있는 경우
            if (logList != null && !logList.isEmpty()) {
                // 마지막 객체
                Map<String, Object> lastObj = logList.get(logList.size() - 1);
                if (logList.size() < pagingSize) {
                    // 결과값이 페이징 사이즈보다 작은 경우 end flag 삽입
                    lastObj.put("end", true);
                } else {
                    // 결과값이 pagingSize 인 경우는 다음 데이터가 있다고 보고 searchAfter 값을 넣어줌
                    resultMap.put("searchAfter", new Object[]{lastObj.get("logTm"), lastObj.get("_id")});
                }
            }
        } else {
            logList = commonService.getLogList(LogRequestVO.of(vo));
        }

        resultMap.put("logList", logList);

        return ResponseEntity.ok().body(resultMap);
    }

    /**
     * Response Time Scatter Popup 상세 정보
     * 2025-08-27 : 해당 API대신 /pa/0000/v2/getApiDetail.maxy API를 대신 사용
     *
     * @param vo       packageNm, serverType, osType, deviceId, docId
     * @param response 호출한 값과 반환된 값을 맞추기 위해 uuid 를 header 에 부여하기 위한 response
     * @return logDetail, chartData, detail
     */
    @Operation(summary = "Response Time Scatter 팝업에서 선택한 로그의 상세 데이터 조회",
            description = "선택한 로그의 상세 데이터와, 최근 N일치의 response time histogram을 반환합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "로그 상세 정보 logDetail과 chartData, detail, jennifer 연동 정보를 반환합니다.",
                    content = @Content(mediaType = "application/json",
                            array = @ArraySchema(schema = @Schema(implementation = DashboardVO.class)))
            )
    })
    @PostMapping(value = "/db/0100/getResponseDetail.maxy")
    public ResponseEntity<?> getResponseDetail(DashboardVO vo, HttpServletResponse response) {
        Map<String, Object> resultMap = new HashMap<>();
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(), vo.getOsType(), vo.getDeviceId(), vo.getDocId());

        // 로그 상세 조회
        vo.setRequestType(RequestType.NETWORK);
        long s1 = System.currentTimeMillis();
        Map<String, Object> map = commonService.getLogDetail(LogRequestVO.of(vo));
        log.debug("getCommonLogDetail cost time: {} ms", System.currentTimeMillis() - s1);
        if (map == null) {
            map = new HashMap<>();
        }
        resultMap.put("logDetail", map);

        // 상세가 있는 경우 Response 차트 데이터 반환
        // 차트 데이터, top/bot 데이터
        if (!map.isEmpty()) {
            String reqUrl = CommonUtil.convertHTMLCode(String.valueOf(map.get("reqUrl"))).replace("\"", "\\\"");
            // 현재 시간 - responseAggsHour 값을 from 으로 함
            long to = new Date().getTime();
            long from = to - ((long) responseAggsHour * 60 * 60 * 1000);

            String type = vo.getSearchType();
            String value = vo.getSearchValue();

            BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));
            if (vo.getOsVer() != null) {
                boolQuery.filter(QueryBuilders.termQuery(Elastic.osVer, vo.getOsVer()));
            }
            boolQuery.filter(QueryBuilders.termQuery(Elastic.reqUrl_raw, reqUrl));
            boolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm).gte(from).lte(to).timeZone("Z"));
            if (value != null && !value.isEmpty()) {
                // all 조회 조건이 아닌 경우 (검색 조건이 있음)
                if (map.get(Elastic.deviceModel) != null && type.equalsIgnoreCase(Elastic.deviceModel)) {
                    boolQuery.filter(QueryBuilders.termQuery(Elastic.deviceModel, map.get(Elastic.deviceModel)));
                }
                if (map.get(Elastic.comType) != null && type.equalsIgnoreCase(Elastic.comType)) {
                    boolQuery.filter(QueryBuilders.termQuery(Elastic.comType, map.get(Elastic.comType)));
                }
                if (map.get(Elastic.simOperatorNm) != null && type.equalsIgnoreCase(Elastic.simOperatorNm)) {
                    boolQuery.filter(QueryBuilders.termQuery(Elastic.simOperatorNm, map.get(Elastic.simOperatorNm)));
                }
            }

            boolQuery.filter(QueryBuilders.termsQuery(Elastic.logType, MaxyLogType.NETWORK_TYPES_SET));

            Map<String, Long> topBotMap = performanceAnalysisService.getResponseTopBot(boolQuery);

            // Response Chart 데이터 조회
            Map<Integer, Integer> chartData = performanceAnalysisService.getResponseTimeData(boolQuery, topBotMap);

            resultMap.put("detail", topBotMap);
            resultMap.put("chartData", chartData);

            Map<String, Object> jenniferObj = new HashMap<>();
            if (map.get("jtxid") != null && map.get("jdomain") != null && map.get("jtime") != null) {
                String domain = (String) map.get("jdomain");
                String time = (String) map.get("jtime");
                String txid = (String) map.get("jtxid");

                jenniferObj = jenniferService.get(domain, time, txid);
            }
            resultMap.put("jenniferObj", jenniferObj);
        }

        // dummy 요청인 경우 더미 값을 반환
        if (vo.isDummyYn()) {
            resultMap.put("dummy", DummyUtil.makeJenniferDummy());
        }

        // elastic 에서 device page flow 편성되어 있는지 확인
        long s2 = System.currentTimeMillis();
        resultMap.put("hasPageLog", commonService.existsPageLog(LogRequestVO.of(vo)));
        log.debug("hasPageLog cost time: {} ms", System.currentTimeMillis() - s2);

        // 요청한 값에 맞춰 반환하기 위한 uuid 반환
        response.setHeader("uuid", vo.getUuid());
        return ResponseEntity.ok().body(resultMap);
    }

    /**
     * Loading Time Popup 상세 데이터 조회 (WaterFall)
     *
     * @param vo       packageNm, serverType, osType, deviceId, logTm, reqUrl
     * @param response 호출한 값과 반환된 값을 맞추기 위해 uuid 를 header 에 부여하기 위한 response
     * @return resourceInfoData, hasPageLog
     */
    @Operation(summary = "Loading Time Popup 상세 데이터 조회 (WaterFall)",
            description = "Loading Time Popup에서 선택한 페이지의 상세 WaterFall 데이터를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Loading Time Popup에서 선택한 페이지의 상세 WaterFall 데이터를 반환합니다.",
                    content = @Content(mediaType = "application/json",
                            array = @ArraySchema(schema = @Schema(implementation = DashboardVO.class))),
                    headers = {
                            @Header(name = "uuid",
                                    description = "호출한 값과 반환한 값을 서로간에 맞추기 위한 uuid 값",
                                    schema = @Schema(type = "string"))
                    }
            )
    })
    @PostMapping(value = "/db/0100/getLoadingDetail.maxy")
    public ResponseEntity<?> getLoadingDetail(DashboardVO vo, HttpServletResponse response) {
        Map<String, Object> resultMap = new HashMap<>();
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(), vo.getOsType(),
                vo.getDeviceId(), vo.getReqUrl(),
                vo.getPageStartTm(), vo.getPageEndTm()
        );

        long s1 = System.currentTimeMillis();
        vo.setRequestType(RequestType.PAGE);
        Map<String, Object> info = commonService.getLogDetail(LogRequestVO.of(vo));
        resultMap.put("logInfo", info);
        log.debug("getLogInfo cost time: {} ms", System.currentTimeMillis() - s1);

        long s6 = System.currentTimeMillis();
        // elastic 에서 device page flow 편성되어 있는지 확인
        resultMap.put("hasPageLog", commonService.existsPageLog(LogRequestVO.of(vo)));
        log.debug("existsPageLog cost time: {} ms", System.currentTimeMillis() - s6);

        if (vo.getLogType() != null && MaxyLogType.isNative(Math.toIntExact(vo.getLogType()))) {
            // Native일 경우 Waterfall 정보가 없어서 빈값으로 반환
            List<String> tmp = new ArrayList<>();

            resultMap.put("errorData", tmp);
            resultMap.put("performanceData", tmp);
            resultMap.put("resourceInfoData", tmp);
            resultMap.put("timingData", tmp);
        } else {
            // mxPageId 가 없는 경우 기존처럼 pageStartTm ~ pageEndTm 을 찾아오는 과정이 있다
            if (!Elastic.hasMxPageId(vo.getMxPageId())) {
                // Native가 아닐 경우 Waterfall 데이터 조회
                // Native는 waterfall 데이터가 생길 수 없음
                // 예시) UserFlow가 [Web1] -> [Native] -> [Web2] 일 경우
                // [Web1]의 waterfall 데이터가 [Native]의 pageStartTm ~ pageEndTm사이에 껴서 [Web1]의 waterfall 데이터가 유실될 수 있음
                // 그래서 [Web1]의 waterfall 데이터를 조회할때
                // 다음 WebView의 pageStartTm을 구해서 -1 후에 해당 값을 pageEndTm으로 바꿔서 조회한다.
                PageLogVO pageLogVO = new PageLogVO();
                pageLogVO.setPackageNm(vo.getPackageNm());
                pageLogVO.setServerType(vo.getServerType());
                pageLogVO.setSearchValue(vo.getDeviceId());
                pageLogVO.setSearchType("deviceId");
                pageLogVO.setFrom(vo.getLogTm());
                pageLogVO.setTo(vo.getLogTm());
                pageLogVO.setPageStartTm(vo.getPageStartTm());
                long parentLogDate = userAnalyticsService.getParentLogDateByLogTmV2(pageLogVO);

                pageLogVO.setFrom(parentLogDate);
                pageLogVO.setTo(parentLogDate);

                // userflow 조회, waterfall을 조회한 userflow부터 시작
                List<?> userFlowList = userAnalyticsService.getUserFlowListForWaterfall(pageLogVO);
                if (userFlowList.size() > 1) {
                    List<Map<String, Object>> userFlow = (List<Map<String, Object>>) userFlowList.get(0);
                    // 다음 WebView의 pageStartTm을 구해서 -1 후에 해당 값을 pageEndTm으로 바꿔서 조회한다.
                    long pageEndTm = dashboardService.getPageStartTimeFromAfterWebview(userFlow);
                    vo.setPageEndTm(pageEndTm);
                }
            }

            long s2 = System.currentTimeMillis();
            LogRequestVO param = LogRequestVO.of(vo);
            List<Map<String, Object>> resourceInfoData = commonService.getWaterfallDataList(param);
            log.debug("getWaterfallDataListV2 cost time: {} ms", System.currentTimeMillis() - s2);

            long s9 = System.currentTimeMillis();
            List<Map<String, Object>> coreVitalData = commonService.getCoreVitalData(param);
            log.debug("getCoreVitalData cost time: {} ms", System.currentTimeMillis() - s9);

            long s3 = System.currentTimeMillis();
            Map<String, Object> performanceData = CommonServiceHelper.convertPerformanceData(resourceInfoData);
            resultMap.put("performanceData", performanceData);
            log.debug("convertPerformanceData cost time: {} ms", System.currentTimeMillis() - s3);

            long s4 = System.currentTimeMillis();
            resultMap.put("timingData", CommonServiceHelper.convertWaterfallTimingData(resourceInfoData, coreVitalData));
            log.debug("convertWaterfallTimingData cost time: {} ms", System.currentTimeMillis() - s4);

            long s7 = System.currentTimeMillis();
            List<Map<String, Object>> errorInfoData = commonService.getWaterfallErrorData(param);
            resultMap.put("errorData", errorInfoData);
            log.debug("getWaterfallErrorData cost time: {} ms", System.currentTimeMillis() - s7);

            long s8 = System.currentTimeMillis();
            // Error데이터를 waterfall 데이터 형식으로 가공해서 주기
            CommonServiceHelper.processErrorData(errorInfoData, resourceInfoData);

            // navigation항목은 상단에 유지한 상태로 startTime 기준으로 resourceInfoData 정렬
            CommonServiceHelper.sortResourceInfoData(resourceInfoData);

            // resourceInfoData에서 원본 navigation 데이터는 제거
            // reformNavigation로 waterfall 차트에 필요한 navigation 정보는 만들어서 줌
            resourceInfoData = CommonServiceHelper.trimResourceInfoData(resourceInfoData);

            // LCP(Largest Contentful Paint) 마킹 로직
            // entryType=largest-contentful-paint인 객체에서 url을 찾아서
            // name이 해당 url인 객체에 mark=lcp 추가
            CommonServiceHelper.markLargestContentfulPaint(resourceInfoData);

            resultMap.put("resourceInfoData", resourceInfoData);
            log.debug("resourceInfoData Reform cost time: {} ms", System.currentTimeMillis() - s8);
        }

        // 요청한 값에 맞춰 반환하기 위한 uuid 반환
        response.setHeader("uuid", vo.getUuid());

        return ResponseEntity.ok().body(resultMap);
    }

    /**
     * 종합분석 팝업에서의 로그 상세 조회
     *
     * @param vo docId, {@link RequestType}
     * @return logDetail, pageInfo, hasPageLog
     */
    @Operation(summary = "종합 분석 팝업 로그 상세 조회",
            description = "선택한 로그의 상세 정보와 관련 페이지 정보를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "로그 상세 정보와 페이지 정보를 반환합니다."))
    @PostMapping(value = "/db/0100/getLogDetail.maxy")
    public ResponseEntity<?> getLogDetail(DashboardVO vo) {
        Map<String, Object> resultMap = new HashMap<>();
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getDocId());

        Map<String, Object> logDetail = commonService.getLogDetail(LogRequestVO.of(vo));

        if (logDetail == null || logDetail.isEmpty()) {
            throw new NotFoundException();
        }

        vo.setPackageNm(logDetail.get("packageNm").toString());
        vo.setServerType(logDetail.get("serverType").toString());
        vo.setOsType(logDetail.get("osType").toString());
        vo.setDeviceId(logDetail.get("deviceId").toString());
        vo.setFrom((Long) logDetail.get("logTm"));
        vo.setLogTm((Long) logDetail.get("logTm"));

        // 팝업의 logDetail에서 rendering, responseTime을 구한다.
        Map<String, Object> pageInfo = commonService.getCurrentPageInfoByDeviceId(LogRequestVO.of(vo));

        resultMap.put("pageInfo", pageInfo);
        resultMap.put("logDetail", logDetail);

        // elastic 에서 device page flow 편성되어 있는지 확인
        resultMap.put("hasPageLog", commonService.existsPageLog(LogRequestVO.of(vo)));
        return ResponseEntity.ok().body(resultMap);
    }

    /**
     * Area Distribution 컴포넌트의 특정 지역을 눌렀을 때, 해당 지역의 error, crash 조회
     *
     * @param vo packageNm, serverType, osType, resMsg, next
     */
    @Operation(summary = "지역별 오류/크래시 목록 조회",
            description = "Area Distribution에서 선택한 지역의 오류/크래시 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "지역별 오류/크래시 목록을 반환합니다."))
    @PostMapping(value = "/db/0100/getAreaDetailList.maxy")
    public ResponseEntity<?> getAreaDetailList(DashboardVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(), vo.getOsType(), vo.getLocationCode());

        List<?> list = dashboardService.getErrorCrashListByLocationCode(vo);

        return ResponseEntity.ok().body(list);
    }

    /**
     * favorites 컴포넌트의 all 버튼을 눌렀을 때 전체 목록 조회
     */
    @Operation(summary = "Favorites 전체 목록 조회",
            description = "Favorites 컴포넌트의 전체 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "Favorites 전체 목록을 반환합니다."))
    @PostMapping(value = "/db/0100/getFavoritesInfoList.maxy")
    public ResponseEntity<?> getFavoritesInfoList(DashboardVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(), vo.getOsType());

        String baseDate = switch (vo.getDateType()) {
            case WEEK -> DateUtil.getDayByParam(-7);
            case MONTH -> DateUtil.getDayByParam(-30);
            default -> DateUtil.getDayByParam(0);
        };

        vo.setBaseDate(DateUtil.convertFormat(baseDate, DateUtil.DATE_PATTERN, DateUtil.DATE_WITH_DASH_PATTERN));

        List<Map<String, Object>> result = dashboardService.getFavoritesInfoList(vo);

        return ResponseEntity.ok().body(result);
    }

    /**
     * favorites 컴포넌트의 all 버튼 팝업 > 행 클릭시
     *
     * @param vo appInfo
     * @return result
     */
    @Operation(summary = "Favorites 행 상세 조회",
            description = "Favorites 팝업에서 선택한 항목의 상세 정보를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "Favorites 행 상세 정보를 반환합니다."))
    @PostMapping(value = "/db/0100/getFavoritesRowInfo.maxy")
    public ResponseEntity<?> getFavoritesRowIssueInfo(DashboardVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType());

        String baseDate = switch (vo.getDateType()) {
            case WEEK -> DateUtil.getDayByParam(-7);
            case MONTH -> DateUtil.getDayByParam(-30);
            default -> DateUtil.getDayByParam(0);
        };

        vo.setBaseDate(DateUtil.convertFormat(baseDate, DateUtil.DATE_PATTERN, DateUtil.DATE_WITH_DASH_PATTERN));

        Map<String, List<Object>> result = dashboardService.getFavoritesRowInfo(vo);

        return ResponseEntity.ok().body(result);
    }

    /**
     * PV Equalizer > All 버튼 > Popup 목록
     *
     * @param vo packageNm, serverType, osType, {@link com.thinkm.maxy.vo.DashboardVO.DateType}
     * @return list
     */
    @Operation(summary = "PV Equalizer 전체 목록 조회",
            description = "PV Equalizer 컴포넌트의 전체 페이지 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "PV Equalizer 전체 목록을 반환합니다."))
    @PostMapping(value = "/db/0100/getPageViewInfoList.maxy")
    public ResponseEntity<?> getPageViewInfoList(HttpServletRequest request, DashboardVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(), vo.getOsType(), vo.getDateType());

        String baseDate = vo.getBaseDateByDateTypeV2();

        vo.setBaseDate(baseDate);

        List<Map<String, Object>> result = dashboardService.getPageViewInfoList(vo, request);

        return ResponseEntity.ok().body(result);
    }

    /**
     * PV Equalizer > All 버튼 > Popup 목록 > 상세
     *
     * @param vo packageNm, serverType, osType, {@link com.thinkm.maxy.vo.DashboardVO.DateType}, reqUrl
     * @return list
     */
    @Operation(summary = "PV Equalizer 상세 조회",
            description = "PV Equalizer 팝업에서 선택한 페이지의 상세 정보를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "선택 페이지의 상세 정보를 반환합니다."))
    @PostMapping(value = "/db/0100/getPageViewInfoDetail.maxy")
    public ResponseEntity<?> getPageViewInfoDetail(DashboardVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(), vo.getOsType(), vo.getReqUrl());

        String baseDate = vo.getBaseDateByDateTypeV2();

        vo.setBaseDate(baseDate);

        List<Map<String, Object>> result = dashboardService.getPageViewInfoDetailList(vo);

        return ResponseEntity.ok().body(result);
    }

    /**
     * 상단 Bi 정보 중 Log/Error/Crash 클릭 시 팝업 내용 조회
     *
     * @param vo packageNm, serverType, osType, dateType, logTrendType
     * @return chartList, info
     */
    @Operation(summary = "로그 트렌드 상세 조회",
            description = "상단 BI 영역에서 로그/에러/크래시 클릭 시 팝업 데이터를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "트렌드 차트와 상세 정보를 반환합니다."))
    @PostMapping(value = "/db/0100/getLogTrendInfo.maxy")
    public ResponseEntity<?> getLogTrendInfo(DashboardVO vo) {
        Map<String, Object> resultMap = new ConcurrentHashMap<>();

        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(), vo.getOsType(), vo.getFrom(), vo.getTo(), vo.getLogTrendType());

        // 그 외 trend
        String[] baseDates = DateUtil.getBaseDates(vo.getFrom(), vo.getTo());
        vo.setFromDt(baseDates[0]);
        vo.setToDt(baseDates[1]);

        long s = System.currentTimeMillis();
        Object info = switch (vo.getLogTrendType()) {
            case ERROR, CRASH -> dashboardService.getTopLogListV3(vo);
            default -> new HashMap<>();
        };
        resultMap.put("info", info);

        if (!"info".equalsIgnoreCase(vo.getType())) {
            resultMap.put("chartList", dashboardService.getLogTrendChartListV2(vo));
        }

        log.debug("[TIME CHECK] Log Trend: {}ms", System.currentTimeMillis() - s);

        return ResponseEntity.ok().body(resultMap);
    }

    /**
     * 상단 Bi 정보 중 Log/Error/Crash 제외한 값 클릭 시 팝업 내용 조회
     *
     * @param vo packageNm, serverType, osType
     * @return chartList, info
     */
    @Operation(summary = "BI 지표 상세 조회",
            description = "상단 BI 영역에서 기타 지표 클릭 시 팝업 데이터를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "일간/월간 지표 및 CCU 데이터를 반환합니다."))
    @PostMapping(value = "/db/0100/getBiDetail.maxy")
    public ResponseEntity<?> getBiDetail(DashboardVO vo) {
        Map<String, Object> resultMap = new HashMap<>();

        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(), vo.getOsType(), vo.getFrom(), vo.getTo());
        // 그 외 trend
        String[] baseDates = DateUtil.getBaseDates(vo.getFrom(), vo.getTo());

        if ("appCcuCount".equalsIgnoreCase(vo.getType())) {
            Map<String, Map<String, Long>> ccuData;
            if (baseDates[0].equalsIgnoreCase(baseDates[1])) {
                // 하루치
                // 오늘이면
                if (baseDates[0].equalsIgnoreCase(DateUtil.getToday())) {
                    // 오늘이면 redis 조회
                    ccuData = dashboardService.getConcurrentUserCount(vo);
                } else {
                    vo.setBaseDate(baseDates[0]);
                    // 오늘이 아니면 해당 일자로 opensearch 조회
                    ccuData = dashboardService.getConcurrentUserCountByDate(vo);
                }
            } else {
                // 하루 이상 조회 시 opensearch 조회 및 일간 peak 만 잡아서 조회
                ccuData = dashboardService.getConcurrentUserCountByDateRange(vo);
            }

            // Map -> List 로 변경하여 List 에서 time 기준으로 acs sort 하도록 함
            Map<String, List<Map<String, Long>>> ccuResult = dashboardService.convertConcurrentUserMap(ccuData);
            resultMap.put("ccu", ccuResult);

            // osType 별 peak 데이터 값 구하여 넣어줌
            Map<String, Long> peak = dashboardService.getPeakConcurrentUserData(ccuData);
            resultMap.put("peak", peak);
        } else {
            vo.setFromDt(baseDates[0]);
            vo.setToDt(baseDates[1]);
            Map<String, Map<String, Map<String, Object>>> daily = dashboardService.getDailyTrendInfo(vo);

            String[] baseMonths = DateUtil.getBaseMonths(vo.getFrom(), vo.getTo());
            vo.setFromDt(baseMonths[0]);
            vo.setToDt(baseMonths[1]);
            Map<String, Map<String, Map<String, Object>>> monthly = dashboardService.getMonthlyTrendInfo(vo);

            resultMap.put("daily", daily);
            resultMap.put("monthly", monthly);
        }

        return ResponseEntity.ok().body(resultMap);
    }

    /**
     * Bi 사용 정보 조회
     *
     * @param request {@link HttpServletRequest}
     * @param vo      appInfo
     * @return BiUseInfo
     */
    @Operation(summary = "Dashboard 기본 설정 조회",
            description = "사용자의 Dashboard 기본 설정 정보를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "Dashboard 기본 설정 정보를 반환합니다."))
    @PostMapping(value = "/db/0100/getDashboardInfo.maxy")
    public ResponseEntity<?> getDashboardInfo(HttpServletRequest request, DashboardVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_NO_APPINFO, vo.getPackageNm(), vo.getServerType());

        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        vo.setUserNo(user.getUserNo());
        DashboardVO biUseinfo = dashboardService.getDashboardBasicConfig(vo);
        if (biUseinfo == null) {
            dashboardService.addDashboardBasicConfig(vo);
            biUseinfo = dashboardService.getDashboardBasicConfig(vo);
        }

        DashboardVO.DashboardUseInfo result = DashboardVO.DashboardUseInfo.of(biUseinfo);

        // ai bot config 정보
        result.setAibot(botService.getBotConfig(BotVO.of(vo)));

        // 결과값
        return ResponseEntity.ok().body(result);
    }

    /**
     * Resource Usage Popup 정보 조회
     *
     * @param vo appInfo
     * @return result
     */
    @Operation(summary = "Resource Usage 팝업 데이터 조회",
            description = "Resource Usage 팝업에 필요한 요약 데이터를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "Resource Usage 팝업 데이터를 반환합니다."))
    @PostMapping(value = "/db/0100/getResourcePopupData.maxy")
    public ResponseEntity<?> getResourcePopupData(DashboardVO vo) {
        Map<String, Object> resultMap = new HashMap<>();
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType());

        String baseDate = switch (vo.getDateType()) {
            case WEEK -> DateUtil.getDayByParam(-7);
            case MONTH -> DateUtil.getDayByParam(-30);
            default -> DateUtil.getDayByParam(0);
        };

        vo.setBaseDate(DateUtil.convertFormat(baseDate, DateUtil.DATE_PATTERN, DateUtil.DATE_WITH_DASH_PATTERN));

        Map<String, Object> result = dashboardService.getResourcePopupData(vo);
        resultMap.put("result", result);
        return ResponseEntity.ok().body(resultMap);
    }

    /**
     * Resource Usage Popup 정보 조회
     *
     * @param vo appInfo
     * @return result
     */
    @Operation(summary = "Resource Usage 행 데이터 조회",
            description = "Resource Usage 팝업의 행 데이터를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "행별 Resource Usage 데이터를 반환합니다."))
    @PostMapping(value = "/db/0100/getResourcePopupRowData.maxy")
    public ResponseEntity<?> getResourcePopupRowData(DashboardVO vo) {
        Map<String, Object> resultMap = new HashMap<>();
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType());

        String baseDate = switch (vo.getDateType()) {
            case WEEK -> DateUtil.getDayByParam(-7);
            case MONTH -> DateUtil.getDayByParam(-30);
            default -> DateUtil.getDayByParam(0);
        };

        vo.setBaseDate(DateUtil.convertFormat(baseDate, DateUtil.DATE_PATTERN, DateUtil.DATE_WITH_DASH_PATTERN));

        Map<String, List<Object>> result = dashboardService.getResourcePopupRowData(vo);
        resultMap.put("result", result);
        return ResponseEntity.ok().body(resultMap);
    }

    /**
     * PV Equalizer 페이지 클릭 시 팝업 차트 조회
     *
     * @param vo appInfo, reqUrl
     * @return list
     */
    @Operation(summary = "PV Equalizer 차트 데이터 조회",
            description = "선택한 URL의 PV Equalizer 차트 데이터를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "차트 데이터를 반환합니다."))
    @PostMapping(value = "/db/0100/getPageViewerChartByReqUrl.maxy")
    public ResponseEntity<?> getPageViewerChartByReqUrl(DashboardVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(), vo.getOsType(), vo.getReqUrl());

        Map<String, List<Object[]>> result = dashboardService.getPageViewerChartByReqUrl(vo);

        return ResponseEntity.ok().body(result);
    }

    /**
     * PV Equalizer 페이지 클릭 시 팝업 리스트 조회
     *
     * @param vo appInfo, reqUrl
     * @return list
     */
    @Operation(summary = "PV Equalizer 리스트 조회",
            description = "선택한 URL의 PV Equalizer 리스트 데이터를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "PV Equalizer 리스트 데이터를 반환합니다."))
    @PostMapping(value = "/db/0100/getPageViewerListByReqUrl.maxy")
    public ResponseEntity<?> getPageViewerListByReqUrl(DashboardVO vo) {
        Map<String, Object> resultMap = new HashMap<>();
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(), vo.getOsType(), vo.getReqUrl());

        List<Map<String, Object>> result = dashboardService.getPageViewerListByReqUrl(vo);
        resultMap.put("list", result);

        return ResponseEntity.ok().body(resultMap);
    }


    /**
     * 공통: device page flow 조건을 갖췄는지 조회
     *
     * @param vo packageNm, serverType, osType, deviceId, logTm
     * @return {hasPageLog: boolean}
     */
    @Operation(summary = "페이지 로그 존재 여부 확인",
            description = "디바이스 페이지 플로우 데이터 존재 여부를 확인합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "페이지 로그 존재 여부를 반환합니다."))
    @PostMapping(value = "/db/0100/existsPageLog.maxy")
    public ResponseEntity<?> existsPageLog(DashboardVO vo) {
        Map<String, Object> resultMap = new HashMap<>();
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(), vo.getOsType(), vo.getDeviceId(), vo.getLogTm());

        vo.setFrom(vo.getLogTm());

        // elastic 에서 device page flow 편성되어 있는지 확인
        resultMap.put("hasPageLog", commonService.existsPageLog(LogRequestVO.of(vo)));
        return ResponseEntity.ok().body(resultMap);
    }

    /**
     * Resource All Popup 목록 조회
     *
     * @param vo appInfo
     * @return result
     */
    @Operation(summary = "Resource 전체 데이터 조회",
            description = "Resource All 팝업 데이터를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "Resource 전체 데이터를 반환합니다."))
    @PostMapping(value = "/db/0100/getAllAnalysisData.maxy")
    public ResponseEntity<?> getAllAnalysisData(DashboardVO vo) {
        Map<String, Object> resultMap = new HashMap<>();
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType());

        String baseDate = switch (vo.getDateType()) {
            case WEEK -> DateUtil.getDayByParam(-7);
            case MONTH -> DateUtil.getDayByParam(-30);
            default -> DateUtil.getDayByParam(0);
        };

        vo.setBaseDate(DateUtil.convertFormat(baseDate, DateUtil.DATE_PATTERN, DateUtil.DATE_WITH_DASH_PATTERN));

        Map<String, Object> result = dashboardService.getAllAnalysisData(vo);
        resultMap.put("result", result);
        return ResponseEntity.ok().body(resultMap);
    }

    /**
     * Device Distribution > All 팝업 > 행 클릭 데이터 User, Error, Crash 반환
     *
     * @param vo appInfo
     * @return result
     */
    @Operation(summary = "Device Distribution 행 상세 조회",
            description = "Device Distribution 팝업의 행 상세 데이터를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "행 상세 데이터를 반환합니다."))
    @PostMapping(value = "/db/0100/getAllAnalysisRowData.maxy")
    public ResponseEntity<?> getAllAnalysisRowData(DashboardVO vo) {
        Map<String, Object> resultMap = new HashMap<>();
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType());

        String baseDate = switch (vo.getDateType()) {
            case WEEK -> DateUtil.getDayByParam(-7);
            case MONTH -> DateUtil.getDayByParam(-30);
            default -> DateUtil.getDayByParam(0);
        };

        vo.setBaseDate(DateUtil.convertFormat(baseDate, DateUtil.DATE_PATTERN, DateUtil.DATE_WITH_DASH_PATTERN));

        Map<String, List<Object>> result = dashboardService.getAllAnalysisRowData(vo);

        resultMap.put("result", result);

        return ResponseEntity.ok().body(resultMap);
    }

    /**
     * Redis 에서 AVG 값 조회하여 반환
     *
     * @param vo type, appInfo
     * @return avg info
     */
    @Operation(summary = "AVG 성능 지표 조회",
            description = "Redis에 저장된 AVG 성능 지표를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "AVG 지표 값을 반환합니다."))
    @PostMapping(value = "/db/0100/getAvgFromLoadingOrResponse.maxy")
    public ResponseEntity<?> getAvgFromLoadingOrResponse(PageLogVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType());

        return ResponseEntity.ok().body(performanceAnalysisService.getAvgValueByAppInfo(vo.getType(), vo.getPackageNm(), vo.getServerType()));
    }

    /**
     * Redis 에서 MED 값 조회하여 반환
     *
     * @param vo type, appInfo
     * @return med info
     */
    @Operation(summary = "MED 성능 지표 조회",
            description = "MED 응답/로딩 시간을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "MED 지표 값을 반환합니다."))
    @PostMapping(value = "/db/0100/getMedFromLoadingOrResponse.maxy")
    public ResponseEntity<?> getMedFromLoadingOrResponse(DashboardVO vo) {
        Map<String, Object> resultMap = new HashMap<>();
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType());

        if (vo.getFrom() == null) {
            vo.setFrom(vo.getLogTm());
        }

        Map<String, Object> result = dashboardService.getMedResponseAndLoadingTime(vo);
        resultMap.put("result", result);
        return ResponseEntity.ok().body(resultMap);
    }

    /**
     * Response Line Component 팝업 목록 조회
     *
     * @param vo packageNm, serverType, osType, from, to
     * @return responseList
     */
    @Operation(summary = "Response Time 목록 조회",
            description = "Response 차트 팝업 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "Response Time 목록을 반환합니다."))
    @PostMapping(value = "/db/0100/getResponseTimeList.maxy")
    public ResponseEntity<?> getResponseTimeList(DashboardVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_WRONG_PARAMS,
                vo.getPackageNm(), vo.getServerType(), vo.getOsType(), vo.getFrom(), vo.getTo());

        Map<String, Object> resultMap = new HashMap<>();

        vo.setType("response");
        Map<String, Long> avgMap = performanceAnalysisService.getAvgValueByAppInfo(vo.getType(), vo.getPackageNm(), vo.getServerType());
        vo.setAvgMap(avgMap);
        List<Map<String, Object>> result = performanceAnalysisService.getResponseTimeList(vo);

        CommonUtil.maskUserId(result, isUseridMasking, 2);
        resultMap.put("list", result);

        return ResponseEntity.ok().body(resultMap);
    }


    /**
     * Loading Line Component 팝업 목록 조회
     *
     * @param vo packageNm, serverType, osType, from, to
     * @return loadingList
     */
    @Operation(summary = "Loading Time 목록 조회",
            description = "Loading 차트 팝업 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "Loading Time 목록을 반환합니다."))
    @PostMapping(value = "/db/0100/getLoadingTimeList.maxy")
    public ResponseEntity<?> getLoadingTimeList(DashboardVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_WRONG_PARAMS,
                vo.getPackageNm(), vo.getServerType(), vo.getOsType(), vo.getFrom(), vo.getTo());

        Map<String, Object> resultMap = new HashMap<>();

        vo.setType("loading");
        Map<String, Long> avgMap = performanceAnalysisService.getAvgValueByAppInfo(vo.getType(), vo.getPackageNm(), vo.getServerType());
        vo.setAvgMap(avgMap);
        List<Map<String, Object>> result = performanceAnalysisService.getLoadingTimeList(vo);

        CommonUtil.maskUserId(result, isUseridMasking, 2);
        resultMap.put("list", result);

        return ResponseEntity.ok().body(resultMap);
    }

    /**
     * Version Comparison 컴포넌트 데이터 조회
     *
     * @param vo packageNm, serverType, osType, from, to
     * @return loadingList
     */
    @Operation(summary = "Version Comparison 데이터 조회",
            description = "Version Comparison 컴포넌트 데이터를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "버전 비교 데이터와 합계를 반환합니다."))
    @PostMapping(value = "/db/0100/getVersionComparisonData.maxy")
    public ResponseEntity<?> getVersionComparisonData(HttpServletRequest request, DashboardVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_WRONG_PARAMS,
                vo.getPackageNm(), vo.getServerType(), vo.getFrom(), vo.getTo(), vo.getAccessDate());
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null) {
            throw new AuthException();
        }

        String key = String.join(":", CommonCode.COMPONENT_CONFIG_VERSION_COMPARISON.getValue(),
                user.getUserNo() + "",
                vo.getPackageNm(),
                vo.getServerType());

        Map<String, Object> result = new HashMap<>();
        try {
            Object value = redisService.get(key);
            if (value != null) {
                DashboardComponentVO.VersionComparisonVO comparisonVO
                        = JsonUtil.fromJson(value.toString(), DashboardComponentVO.VersionComparisonVO.class);

                DashboardVO param = new DashboardVO().of(comparisonVO);
                param.setFrom(vo.getFrom());
                param.setTo(vo.getTo());
                param.setAccessDate(vo.getAccessDate());

                List<Map<String, Object>> versionData = dashboardService.getVersionComparisonDataV2(param, request);
                Map<String, Object> totalVersionData = dashboardService.getTotalVersionData(param);
                result.put("versionData", versionData);
                result.put("totalVersionData", totalVersionData);
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        return ResponseEntity.ok().body(result);
    }

    /**
     * Version Comparison All 팝업 데이터 조회
     *
     * @param vo packageNm, serverType, osType, from, to, accessDate,
     * @return loadingList
     */
    @Operation(summary = "Version Comparison 전체 데이터 조회",
            description = "All 팝업에 필요한 버전 비교 데이터를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "전체 버전 비교 데이터를 반환합니다."))
    @PostMapping(value = "/db/0100/getAllVersionComparisonData.maxy")
    public ResponseEntity<?> getAllVersionComparisonData(DashboardVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_WRONG_PARAMS, vo.getPackageNm(), vo.getServerType());

        // 어제 기준으로 조회
        String baseDate = switch (vo.getDateType()) {
            case WEEK -> DateUtil.getDayByParam(-8);
            case MONTH -> DateUtil.getDayByParam(-31);
            default -> DateUtil.getDayByParam(-1);
        };

        vo.setBaseDate(DateUtil.convertFormat(baseDate, DateUtil.DATE_PATTERN, DateUtil.DATE_WITH_DASH_PATTERN));

        Map<String, Object> resultMap = new HashMap<>();

        List<Map<String, Object>> versionData = dashboardService.getAllVersionDataV2(vo);
        resultMap.put("allVersionData", versionData);

        return ResponseEntity.ok().body(resultMap);
    }

    /**
     * Version Comparison 컴포넌트의 all 버튼 팝업 > 행 클릭시
     *
     * @param vo appInfo
     * @return result
     */
    @Operation(summary = "Version Comparison 행 상세 조회",
            description = "All 팝업에서 선택한 행의 상세 데이터를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "행 상세 데이터를 반환합니다."))
    @PostMapping(value = "/db/0100/getAllVersionComparisonRowData.maxy")
    public ResponseEntity<?> getAllVersionComparisonRowData(DashboardVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType());

        // 어제 기준으로 조회
        String baseDate = switch (vo.getDateType()) {
            case WEEK -> DateUtil.getDayByParam(-8);
            case MONTH -> DateUtil.getDayByParam(-31);
            default -> DateUtil.getDayByParam(-1);
        };

        vo.setBaseDate(DateUtil.convertFormat(baseDate, DateUtil.DATE_PATTERN, DateUtil.DATE_WITH_DASH_PATTERN));

        /*
            Version Comparison은 report 데이터로 만들어주는데 Day조회의 경우 시간단위로 쪼갤수 있는 필드가 없어서
            Opensearch로 조회하여 차트 데이터를 만든다. 그래서 Day의 경우 테이블과 차트 데이터간에 차이가 있을 수 있음.
            Week, Month의 경우 Report 데이터에서 가져옴
        */
        Map<String, List<Object>> result;
        if (vo.getDateType() == DashboardVO.DateType.WEEK || vo.getDateType() == DashboardVO.DateType.MONTH) {
            result = dashboardService.getAllVersionComparisonRowInfoGetReport(vo);
        } else {
            result = dashboardService.getAllVersionComparisonRowInfoGetElastic(vo);
        }

        return ResponseEntity.ok().body(result);
    }

    /**
     * Version Comparison 선택 정보 조회
     *
     * @param request HttpServletRequest
     * @param vo      packageNm, serverType, osType, from, to, accessDate,
     * @return resultMap(redis 정보)
     */
    @Operation(summary = "Version Comparison 선택 정보 조회",
            description = "사용자가 저장한 Version Comparison 선택 정보를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "저장된 선택 정보를 반환합니다."))
    @PostMapping(value = "/db/0100/getVersionSelectInfo.maxy")
    public Map<String, Object> getVersionSelectInfo(HttpServletRequest request, DashboardVO vo) {
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null) {
            throw new AuthException();
        }

        Map<String, Object> resultMap = new HashMap<>();
        String key = String.join(":", CommonCode.COMPONENT_CONFIG_VERSION_COMPARISON.getValue(),
                user.getUserNo() + "",
                vo.getPackageNm(),
                vo.getServerType());

        try {
            String value = redisService.getString(key);
            if (value != null) {
                DashboardComponentVO.VersionComparisonVO comparisonVO
                        = JsonUtil.fromJson(value, DashboardComponentVO.VersionComparisonVO.class);

                DashboardVO param = new DashboardVO().of(comparisonVO);

                resultMap.put("packageNm", param.getPackageNm());
                resultMap.put("serverType", param.getServerType());
                resultMap.put("osTypeA", param.getOsType1());
                resultMap.put("osTypeB", param.getOsType2());
                resultMap.put("appVerA", param.getAppVer1());
                resultMap.put("appVerB", param.getAppVer2());
            }
        } catch (JsonSyntaxException e) {
            log.error(e.getMessage(), e);
        }
        return resultMap;
    }

    @Operation(summary = "경고 구간 데이터 조회",
            description = "Loading/Response Scatter의 경고 구간 데이터를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "경고 구간 데이터를 반환합니다."))
    @PostMapping(value = "/db/0100/getWarningIntervaltimeData.maxy")
    public ResponseEntity<?> getWarningIntervaltimeData(HttpServletRequest request, DashboardVO vo) {
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);

        if (user == null) {
            throw new AuthException();
        }
        vo.setUserNo(user.getUserNo());
        DashboardComponentVO limit = dashboardConfigService.getWarningLimitValue(vo);
        if (limit != null) {
            vo.setOptLoadingtimescatterRange(limit.getOptLoadingtimescatterRange());
            vo.setOptResponsetimescatterRange(limit.getOptResponsetimescatterRange());
        } else {
            throw new NotFoundException(ReturnCode.ERR_AUTH_MODIFY_MENU);
        }

        vo.setUserNo(user.getUserNo());
        List<Map<String, Object>> result = performanceAnalysisService.getWarningIntervaltimeData(vo);

        return ResponseEntity.ok().body(result);
    }

    /**
     * Version Conversion > All 버튼 > Popup 목록
     *
     * @param vo packageNm, serverType, osType, {@link com.thinkm.maxy.vo.DashboardVO.DateType}
     * @return list
     */
    @Operation(summary = "Version Conversion 데이터 조회",
            description = "Version Conversion All 팝업 데이터를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "리스트 및 차트 데이터를 반환합니다."))
    @PostMapping(value = "/db/0100/getVersionConversionInfoList.maxy")
    public ResponseEntity<?> getVersionConversionInfoList(DashboardVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getPackageNm(), vo.getServerType(), vo.getOsType(), vo.getDateType());

        String baseDate = vo.getBaseDateByDateTypeV2();

        vo.setBaseDate(baseDate);

        Map<String, Object> resultMap = new HashMap<>();

        // 리스트 데이터
        List<Map<String, Object>> listResult = dashboardService.getVersionConversionInfoList(vo);
        // 차트 데이터
        List<Map<String, Object>> chartResult = dashboardService.getVersionConversionInfoChart(vo);

        resultMap.put("listResult", listResult);
        resultMap.put("chartResult", chartResult);

        return ResponseEntity.ok().body(resultMap);
    }

    /**
     * Crashes by Version > All Popup 목록 조회
     *
     * @param vo appInfo
     * @return result
     */
    @Operation(summary = "Crashes by Version 전체 조회",
            description = "Crashes by Version All 팝업 데이터를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "Crashes by Version 데이터를 반환합니다."))
    @PostMapping(value = "/db/0100/getAllCrashesByVersionData.maxy")
    public ResponseEntity<?> getAllCrashesByVersionData(DashboardVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(), vo.getOsType());

        String baseDate = switch (vo.getDateType()) {
            case WEEK -> DateUtil.getDayByParam(-7);
            case MONTH -> DateUtil.getDayByParam(-30);
            default -> DateUtil.getDayByParam(0);
        };

        vo.setBaseDate(DateUtil.convertFormat(baseDate, DateUtil.DATE_PATTERN, DateUtil.DATE_WITH_DASH_PATTERN));

        List<Map<String, Object>> result = dashboardService.getAllCrashesByVersionData(vo);

        return ResponseEntity.ok().body(result);
    }

    /**
     * Crashes by Version > All Popup 목록 > 행 클릭 데이터 Crash 반환
     *
     * @param vo appInfo
     * @return result
     */
    @Operation(summary = "Crashes by Version 행 상세 조회",
            description = "Crashes by Version 팝업의 행 상세 데이터를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "행 상세 데이터를 반환합니다."))
    @PostMapping(value = "/db/0100/getAllCrashesByVersionRowData.maxy")
    public ResponseEntity<?> getAllCrashesByVersionRowData(DashboardVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(), vo.getOsType());

        String baseDate = switch (vo.getDateType()) {
            case WEEK -> DateUtil.getDayByParam(-7);
            case MONTH -> DateUtil.getDayByParam(-30);
            default -> DateUtil.getDayByParam(0);
        };

        vo.setBaseDate(DateUtil.convertFormat(baseDate, DateUtil.DATE_PATTERN, DateUtil.DATE_WITH_DASH_PATTERN));

        List<Object> result = dashboardService.getAllCrashesByVersionRowData(vo);

        return ResponseEntity.ok().body(result);
    }

    /**
     * Marketing Insight 컴포넌트 데이터 조회
     *
     * @param vo
     * @param request
     * @return
     */
    @Operation(summary = "Marketing Insight 데이터 조회",
            description = "설정된 preUrl/reqUrl 기반 마케팅 인사이트 데이터를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "마케팅 인사이트 데이터를 반환합니다."))
    @PostMapping(value = "/db/0100/getMarketingInsight.maxy")
    public ResponseEntity<?> getMarketingInsight(DashboardVO vo, HttpServletRequest request) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getPackageNm(), vo.getServerType(), vo.getOsType());

        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null) {
            throw new BadRequestException(ReturnCode.ERR_NO_ACCESS_AUTHORITY);
        }
        vo.setUserNo(user.getUserNo());
        DashboardComponentVO config = dashboardConfigService.getMarketingInsightConfig(vo);

        // preUrl, reqUrl이 있어야 함 (config null체크 먼저)
        ValidUtil.isValidParams(ReturnCode.ERR_NO_SET_MARKETING_INSIGHT, config);
        ValidUtil.isValidParams(ReturnCode.ERR_NO_SET_MARKETING_INSIGHT, config.getPreUrl(), config.getReqUrl());
        vo.setPreUrl(config.getPreUrl());
        vo.setReqUrl(config.getReqUrl());

        List<Map<String, Object>> data = dashboardService.getMarketingInsight(vo);

        Map<String, Object> result = new HashMap<>();
        result.put("preUrl", config.getPreUrl());
        result.put("reqUrl", config.getReqUrl());
        // conver data
        if (data != null && !data.isEmpty()) {
            result.put("datas", dashboardService.processMarketingInsightData(data));
        } else {
            result.put("datas", data);
        }


        return ResponseEntity.ok().body(result);
    }

    /**
     * Marketing Insight 컴포넌트 클릭시 시간 별 데이터 목록 조회
     *
     * @param vo
     * @param request
     * @return
     */
    @Operation(summary = "Marketing Insight 시간대별 목록 조회",
            description = "마케팅 인사이트 컴포넌트 클릭 시 시간대별 상세 데이터를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "시간대별 마케팅 인사이트 데이터를 반환합니다."))
    @PostMapping(value = "/db/0100/getMarketingInsightList.maxy")
    public ResponseEntity<?> getMarketingInsightList(DashboardVO vo, HttpServletRequest request) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(), vo.getOsType(),
                vo.getPreUrl(), vo.getReqUrl(), vo.getFrom(), vo.getTo());

        Map<String, Object> bounce = dashboardService.getMarketingInsightList(vo, "bounce");
        Map<String, Object> reach = dashboardService.getMarketingInsightList(vo, "reach");

        Map<String, Object> result = new HashMap<>();
        result.put("bounce", bounce);
        result.put("reach", reach);

        return ResponseEntity.ok().body(result);
    }

    /**
     * Marketing Insight 컴포넌트 클릭시 시간 별 데이터 목록 > 상세 (사용자 흐름)조회
     *
     * @param vo packageNm, serverType, parentLogDate, deviceId
     * @return 사용자 흐름 목록
     */
    @Operation(summary = "Marketing Insight 사용자 흐름 조회",
            description = "마케팅 인사이트 시간대 상세에서 사용자 흐름을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "사용자 흐름 데이터를 반환합니다."))
    @PostMapping(value = "/db/0100/getMarketingInsightDetail.maxy")
    public ResponseEntity<?> getMarketingInsightDetail(DashboardVO vo, HttpServletRequest request) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(),
                vo.getParentLogDate(), vo.getDeviceId());

        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null) {
            throw new BadRequestException(ReturnCode.ERR_NO_ACCESS_AUTHORITY);
        }
        vo.setUserNo(user.getUserNo());
        // config 를 조회하여 preUrl / reqUrl 설정
        DashboardComponentVO config = dashboardConfigService.getMarketingInsightConfig(vo);

        Map<String, Object> result = new HashMap<>();

        // 사용자 흐름 목록 조회를 위한 매개변수 세팅
        PageLogVO param = new PageLogVO();
        param.setPackageNm(vo.getPackageNm());
        param.setServerType(vo.getServerType());
        param.setSearchType("deviceId");
        param.setSearchValue(vo.getDeviceId());
        param.setFrom(vo.getParentLogDate());
        param.setTo(vo.getParentLogDate());

        List<?> list = userAnalyticsService.getUserFlowListV2(param);

        if (list.isEmpty()) {
            return ResponseEntity.ok().body(result);
        }

        List<Map<String, Object>> listData = (List<Map<String, Object>>) list.get(0);

        Map<String, Object> prevPreUrlPage = null; // preUrl의 이전 페이지
        Map<String, Object> preUrlPage = null; // preUrl 페이지
        Map<String, Object> reqUrlPage = null; // reqUrl 페이지
        Map<String, Object> nextReqUrlPage = null; // reqUrl의 다음 페이지

        // pageList를 찾기위한 반복문
        for (int i = 0, size = listData.size(); i < size; i++) {
            Map<String, Object> item = listData.get(i);

            if (vo.getPreUrl().equals(item.get("reqUrl")) && vo.getPreUrlTime().equals(item.get("pageStartTm"))) {
                // reqUrl & pageStartTm으로 preUrl 페이지, preUrl 이전 페이지 찾기
                preUrlPage = item;
                if (i > 0) prevPreUrlPage = listData.get(i - 1);
            } else if (vo.getReqUrl().equals(item.get("reqUrl")) && vo.getPageStartTm().equals(item.get("pageStartTm"))) {
                // reqUrl & pageStartTm으로 reqUrl 페이지, reqUrl 다음 페이지 찾기
                reqUrlPage = item;
                if (i < size - 1) nextReqUrlPage = listData.get(i + 1);
            }

            // preUrlPage, reqUrlPage가 모두 찾았으면 break
            if (preUrlPage != null && reqUrlPage != null) {
                break;
            }
        }

        // 페이지 정보 순서대로 add
        List<Map<String, Object>> pageList = new ArrayList<>();
        if (prevPreUrlPage != null) pageList.add(prevPreUrlPage);
        if (preUrlPage != null) pageList.add(preUrlPage);
        if (reqUrlPage != null) pageList.add(reqUrlPage);
        if (nextReqUrlPage != null) pageList.add(nextReqUrlPage);

        List<List<Map<String, Object>>> pageListData = new ArrayList<>();
        pageListData.add(pageList);

        result.put("preUrl", config.getPreUrl());
        result.put("reqUrl", config.getReqUrl());
        result.put("list", pageListData);

        return ResponseEntity.ok().body(result);
    }

    /**
     * Marketing Insight 컴포넌트 All 팝업 목록 조회
     *
     * @param vo
     * @param request
     * @return
     */
    @Operation(summary = "Marketing Insight 일별 데이터 조회",
            description = "마케팅 인사이트 All 팝업용 일자별 데이터를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "일자별 리스트 및 차트 데이터를 반환합니다."))
    @PostMapping(value = "/db/0100/getDailyMarketingInsight.maxy")
    public ResponseEntity<?> getDailyMarketingInsight(DashboardVO vo, HttpServletRequest request) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getPackageNm(), vo.getServerType(), vo.getOsType());

        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null) {
            throw new BadRequestException(ReturnCode.ERR_NO_ACCESS_AUTHORITY);
        }
        vo.setUserNo(user.getUserNo());
        // config 를 조회하여 preUrl / reqUrl 설정
        DashboardComponentVO config = dashboardConfigService.getMarketingInsightConfig(vo);

        // preUrl, reqUrl이 있어야 함 (config null체크 먼저)
        ValidUtil.isValidParams(ReturnCode.ERR_NO_SET_MARKETING_INSIGHT, config);
        ValidUtil.isValidParams(ReturnCode.ERR_NO_SET_MARKETING_INSIGHT, config.getPreUrl(), config.getReqUrl());
        vo.setPreUrl(config.getPreUrl());
        vo.setReqUrl(config.getReqUrl());

        Map<String, Object> result = new HashMap<>();
        result.put("preUrl", config.getPreUrl());
        result.put("reqUrl", config.getReqUrl());
        List<Map<String, Object>> data = dashboardService.getMarketingInsight(vo, DateHistogramInterval.DAY, vo.getFrom(), vo.getTo());
        // 테이블 데이터
        result.put("listData", dashboardService.processDailyMarketingInsight(data));
        // 차트 데이터
        //result.put("chartData", dashboardService.getMarketingInsightPageRelations(vo));

        return ResponseEntity.ok().body(result);
    }

    /**
     * Marketing Insight 컴포넌트 All 팝업 -> 페이지 간 연관 관계
     *
     * @param vo
     * @param request
     * @return
     */
    @Operation(summary = "Marketing Insight 페이지 연관 관계 조회",
            description = "마케팅 인사이트 All 팝업에서 페이지 간 연관관계를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "페이지 연관 관계 데이터를 반환합니다."))
    @PostMapping(value = "/db/0100/getMarketingInsightPageRelations.maxy")
    public ResponseEntity<?> getMarketingInsightPageRelations(DashboardVO vo, HttpServletRequest request) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getPackageNm(), vo.getServerType(), vo.getOsType());

        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null) {
            throw new BadRequestException(ReturnCode.ERR_NO_ACCESS_AUTHORITY);
        }
        vo.setUserNo(user.getUserNo());
        // config 를 조회하여 preUrl / reqUrl 설정
        DashboardComponentVO config = dashboardConfigService.getMarketingInsightConfig(vo);

        // preUrl, reqUrl이 있어야 함 (config null체크 먼저)
        ValidUtil.isValidParams(ReturnCode.ERR_NO_SET_MARKETING_INSIGHT, config);
        ValidUtil.isValidParams(ReturnCode.ERR_NO_SET_MARKETING_INSIGHT, config.getPreUrl(), config.getReqUrl());
        vo.setPreUrl(config.getPreUrl());
        vo.setReqUrl(config.getReqUrl());

        Map<String, Object> result = new HashMap<>();
        result.put("preUrl", config.getPreUrl());
        result.put("reqUrl", config.getReqUrl());
        result.put("datas", dashboardService.getMarketingInsightPageRelations(vo));

        return ResponseEntity.ok().body(result);
    }

    /**
     * Crash에러 디버깅 가이드 조회
     *
     * @param vo
     * @return
     */
    @Operation(summary = "Crash 디버깅 가이드 조회",
            description = "OS별 Crash 디버깅 가이드를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "Crash 디버깅 가이드 데이터를 반환합니다."))
    @PostMapping(value = "/db/0100/getCrashDebuggingGuide.maxy")
    public ResponseEntity<?> getCrashDebuggingGuide(DashboardVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getOsType(), vo.getLogName(), vo.getType());

        Map<String, Object> result = new HashMap<>();

        if ("Android".equals(vo.getOsType())) {
            // 안드로이드만 logName을 ':'을 기준으로 split
            String logName = vo.getLogName();
            if (logName != null && logName.contains(":")) {
                String[] logNameParts = logName.split(":");
                vo.setLogName(logNameParts[0]);
            }

            result.put("datas", dashboardService.getCrashDebuggingGuideAos(vo));
        } else if ("iOS".equals(vo.getOsType())) {
            result.put("datas", dashboardService.getCrashDebuggingGuideIos(vo));
        } else {
            throw new BadRequestException(ReturnCode.ERR_WRONG_PARAMS);
        }

        return ResponseEntity.ok().body(result);
    }
}
