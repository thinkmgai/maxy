package com.thinkm.maxy.controller.app;

import com.thinkm.common.code.MaxyLogType;
import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.Elastic;
import com.thinkm.common.util.ValidUtil;
import com.thinkm.maxy.service.app.DashboardService;
import com.thinkm.maxy.service.app.PerformanceAnalysisService;
import com.thinkm.maxy.service.app.UserAnalyticsService;
import com.thinkm.maxy.service.common.CommonService;
import com.thinkm.maxy.service.common.helper.CommonServiceHelper;
import com.thinkm.maxy.vo.DashboardVO;
import com.thinkm.maxy.vo.LogRequestVO;
import com.thinkm.maxy.vo.LogVO;
import com.thinkm.maxy.vo.PageLogVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.HttpServletResponse;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 성능 분석 Controller
 */
@Slf4j
@RestController
@RequestMapping(value = "/pa")
@RequiredArgsConstructor
@Tag(name = "Performance Analysis Controller", description = "성능분석 API 컨트롤러")
public class PerformanceAnalysisController {

    private final PerformanceAnalysisService performanceAnalysisService;
    private final DashboardService dashboardService;
    private final CommonService commonService;
    private final UserAnalyticsService userAnalyticsService;

    @Value("${maxy.userid-masking:false}")
    private boolean userIdMasking;

    @Operation(summary = "성능 분석 페이지 이동",
            description = "성능 분석 대시보드 화면으로 이동합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "성능 분석 JSP를 반환합니다."))
    @Auditable(action = AuditType.NAVIGATION, method = "성능 분석")
    @GetMapping(value = "/0000/goPerformanceAnalysisView.maxy")
    public ModelAndView goPerformanceAnalysisView() {
        return new ModelAndView("pa/PA0000");
    }

    @Operation(summary = "Loading Time 상세 목록 조회",
            description = "Loading 타임 상세 데이터를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "Loading 상세 목록을 반환합니다."))
    @PostMapping(value = "/0000/getLoadingTimeDetailList.maxy")
    public ResponseEntity<?> getLoadingTimeDetailList(LogVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType());

        String type = "";
        if ("corevital".equalsIgnoreCase(vo.getType())) {
            type = "corevital";
        }

        vo.setType("loading");
        Map<String, Long> avgMap = performanceAnalysisService.getAvgValueByAppInfo(vo.getType(), vo.getPackageNm(), vo.getServerType());
        vo.setAvgMap(avgMap);

        List<Map<String, Object>> result = performanceAnalysisService.getLoadingTimeDetailList(vo, type);

        Map<String, Object> resultMap = new HashMap<>();

        CommonUtil.maskUserId(result, userIdMasking, 2);

        resultMap.put("detailList", result);

        return ResponseEntity.ok().body(resultMap);
    }

    @Operation(summary = "Loading 상세 데이터 조회",
            description = "워터폴, 타이밍, 에러 등 Loading 상세 데이터를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "Loading 상세 정보를 반환합니다."))
    @PostMapping(value = "/0000/getLoadingDetail.maxy")
    public ResponseEntity<?> getLoadingDetail(LogVO vo, HttpServletResponse response) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType());
        Map<String, Object> resultMap = new HashMap<>();

        DashboardVO param = DashboardVO.builder()
                .packageNm(vo.getPackageNm())
                .serverType(vo.getServerType())
                .osType(vo.getOsType())
                .pageStartTm(vo.getPageStartTm())
                .pageEndTm(vo.getPageEndTm())
                .from(vo.getPageStartTm())
                .logTm(vo.getPageStartTm())
                .deviceId(vo.getDeviceId())
                .logType(Long.valueOf(vo.getLogType()))
                .mxPageId(vo.getMxPageId())
                .build();

        resultMap.put("hasPageLog", commonService.existsPageLog(LogRequestVO.of(param)));

        if (vo.getLogType() != null && MaxyLogType.isNative(Math.toIntExact(Long.parseLong(vo.getLogType())))) {
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
                pageLogVO.setPackageNm(param.getPackageNm());
                pageLogVO.setServerType(param.getServerType());
                pageLogVO.setSearchValue(param.getDeviceId());
                pageLogVO.setSearchType("deviceId");
                pageLogVO.setFrom(param.getLogTm());
                pageLogVO.setTo(param.getLogTm());
                pageLogVO.setPageStartTm(param.getPageStartTm());
                long parentLogDate = userAnalyticsService.getParentLogDateByLogTmV2(pageLogVO);

                pageLogVO.setFrom(parentLogDate);
                pageLogVO.setTo(parentLogDate);

                // userflow 조회, waterfall을 조회한 userflow부터 시작
                List<?> userFlowList = userAnalyticsService.getUserFlowListForWaterfall(pageLogVO);
                if (userFlowList.size() > 1) {
                    List<Map<String, Object>> userFlow = (List<Map<String, Object>>) userFlowList.get(0);
                    // 다음 WebView의 pageStartTm을 구해서 -1 후에 해당 값을 pageEndTm으로 바꿔서 조회한다.
                    long pageEndTm = dashboardService.getPageStartTimeFromAfterWebview(userFlow);
                    param.setPageEndTm(pageEndTm);
                }
            }

            long s2 = System.currentTimeMillis();
            LogRequestVO paramVo = LogRequestVO.of(param);
            List<Map<String, Object>> resourceInfoData = commonService.getWaterfallDataList(paramVo);
            log.debug("getWaterfallDataListV2 cost time: {} ms", System.currentTimeMillis() - s2);

            long s9 = System.currentTimeMillis();
            List<Map<String, Object>> coreVitalData = commonService.getCoreVitalData(paramVo);
            log.debug("getCoreVitalData cost time: {} ms", System.currentTimeMillis() - s9);

            long s3 = System.currentTimeMillis();
            Map<String, Object> performanceData = CommonServiceHelper.convertPerformanceData(resourceInfoData);
            resultMap.put("performanceData", performanceData);
            log.debug("convertPerformanceData cost time: {} ms", System.currentTimeMillis() - s3);

            long s4 = System.currentTimeMillis();
            resultMap.put("timingData", CommonServiceHelper.convertWaterfallTimingData(resourceInfoData, coreVitalData));
            log.debug("convertWaterfallTimingData cost time: {} ms", System.currentTimeMillis() - s4);

            long s7 = System.currentTimeMillis();
            List<Map<String, Object>> errorInfoData = commonService.getWaterfallErrorData(paramVo);
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
}
