package com.thinkm.maxy.controller.app;

import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.code.perf.Vital;
import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.ValidUtil;
import com.thinkm.maxy.dto.app.performance.PercentileDataResponseDto;
import com.thinkm.maxy.service.common.CommonService;
import com.thinkm.maxy.service.app.PerformanceServiceV2;
import com.thinkm.maxy.vo.LogRequestVO;
import com.thinkm.maxy.vo.LogVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;
import java.util.List;
import java.util.Map;

/**
 * 성능 분석 Controller
 */
@Slf4j
@RestController
@RequestMapping(value = "/pa/0000/v2")
@RequiredArgsConstructor
public class PerformanceControllerV2 {
    private final PerformanceServiceV2 performanceServiceV2;
    @Resource
    private final CommonService commonService;

    @Value("${maxy.userid-masking:false}")
    private boolean userIdMasking;

    /**
     * Page 성능분석 -> Core Vital 데이터 집계
     */
    @PostMapping(value = "/getCoreVital.maxy")
    public ResponseEntity<?> getCoreVital(LogVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(),
                vo.getFrom(), vo.getTo());

        Map<String, Double> coreMap = performanceServiceV2.getCoreVitalAvg(vo);

        List<Object[]> lcpChart = performanceServiceV2.getVitalChart(vo, Vital.LCP);
        List<Object[]> inpChart = performanceServiceV2.getVitalChart(vo, Vital.INP);
        List<Object[]> clsChart = performanceServiceV2.getVitalChart(vo, Vital.CLS);
        List<Object[]> fcpChart = performanceServiceV2.getVitalChart(vo, Vital.FCP);

        return ResponseEntity.ok().body(Map.of(
                "core", coreMap,
                "chart", Map.of(
                        "lcp", lcpChart,
                        "inp", inpChart,
                        "cls", clsChart,
                        "fcp", fcpChart
                )
        ));
    }

    /**
     * Page 성능분석 -> Page Vital List
     */
    @PostMapping(value = "/getVitalListByPage.maxy")
    public ResponseEntity<?> getVitalListByPage(LogVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(),
                vo.getFrom(), vo.getTo()
        );
        List<Map<String, Object>> result = performanceServiceV2.getVitalListByPage(vo);

        return ResponseEntity.ok().body(result);
    }

    /**
     * API, Page 성능분석 -> Hitmap 데이터 집계
     */
    @PostMapping(value = "/getApiHitmap.maxy")
    public ResponseEntity<?> getApiHitmap(LogVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(),
                vo.getFrom(), vo.getTo(),
                vo.getType(), vo.getDurationStep(), vo.getInterval()
        );
        Map<String, Object> result = performanceServiceV2.getHitmap(vo);

        return ResponseEntity.ok().body(result);
    }

    /**
     * API 성능분석 -> Response Time 시계열 차트 데이터 집계. status code, response size 등은 이 컨트롤러를 복사해서 사용한다.
     */
    @PostMapping(value = "/getApiResponseTimeChart.maxy")
    public ResponseEntity<?> getApiResponseTimeChart(LogVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(),
                vo.getFrom(), vo.getTo()
        );
        List<Long[]> result = performanceServiceV2.getApiResponseTimeChart(vo);

        return ResponseEntity.ok().body(result);
    }

    /**
     * 성능분석 -> 선택된 시간 조건에 따른 상세 목록 조회
     * <p>
     * type: API / PAGE
     * <p>
     * 시간 조건: from / to, durationFrom / durationTo
     */
    @PostMapping(value = "/getLogListByTime.maxy")
    public ResponseEntity<?> getLogListByTime(LogVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(),
                vo.getType(),
                vo.getFrom(), vo.getTo()
                // durationFrom, To >= 0 일 경우에 검색조건에 포함한다.
//                , vo.getDurationFrom(), vo.getDurationTo()
        );
        List<Map<String, Object>> result = performanceServiceV2.getLogListByTime(vo);

        return ResponseEntity.ok().body(result);
    }

    /**
     * 성능분석 -> Hitmap -> 선택된 시간 조건에 따른 집계 목록 조회
     * <p>
     * type: API / PAGE
     * <p>
     * 시간 조건: from / to, durationFrom / durationTo
     */
    @PostMapping(value = "/getHitmapLogList.maxy")
    public ResponseEntity<?> getHitmapLogList(LogVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(),
                vo.getType(),
                vo.getFrom(), vo.getTo()
                // durationFrom, To >= 0 일 경우에 검색조건에 포함한다.
//                , vo.getDurationFrom(), vo.getDurationTo()
        );
        List<Map<String, Object>> result = performanceServiceV2.getHitmapLogList(vo);

        return ResponseEntity.ok().body(result);
    }

    /**
     * API 성능분석 -> API url 에 따른 목록 조회
     */
    @PostMapping(value = "/getApiListByApiUrl.maxy")
    public ResponseEntity<?> getApiListByApiUrl(LogVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(),
                vo.getFrom(), vo.getTo(),
                vo.getReqUrl()
        );
        List<Map<String, Object>> result = performanceServiceV2.getApiListByApiUrl(vo);

        CommonUtil.maskUserId(result, userIdMasking, 2);

        return ResponseEntity.ok().body(result);
    }

    /**
     * API 성능분석 -> Page url 에 따른 API 목록 조회
     */
    @PostMapping(value = "/getApiListByPageUrl.maxy")
    public ResponseEntity<?> getApiListByPageUrl(LogVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(),
                vo.getFrom(), vo.getTo(),
                vo.getPageUrl()
        );
        List<Map<String, Object>> result = performanceServiceV2.getApiListByPageUrl(vo);

        return ResponseEntity.ok().body(result);
    }


    /**
     * API 성능분석 -> API doc id에 따른 상세 정보
     */
    @PostMapping(value = "/getApiDetail.maxy")
    public ResponseEntity<?> getApiDetail(LogVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(),
                vo.getFrom(), vo.getTo(),
                vo.getDocId()
        );
        Map<String, Object> apiDetail = performanceServiceV2.getApiDetail(vo);

        return ResponseEntity.ok().body(apiDetail);
    }

    /**
     * API 성능분석 -> API Error Chart
     */
    @PostMapping(value = "/getApiErrorChart.maxy")
    public ResponseEntity<?> getApiErrorChart(LogVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(),
                vo.getFrom(), vo.getTo()
        );
        Map<String, List<Long[]>> result = performanceServiceV2.getApiErrorChart(vo);

        return ResponseEntity.ok().body(result);
    }

    /**
     * API 성능분석 -> API Error List
     */
    @PostMapping(value = "/getApiErrorList.maxy")
    public ResponseEntity<?> getApiErrorList(LogVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(),
                vo.getFrom(), vo.getTo());
        List<Map<String, Object>> result = performanceServiceV2.getApiErrorList(vo);

        return ResponseEntity.ok().body(result);
    }

    /**
     * API 성능분석 -> API Url 에 따른 Error List 조회
     */
    @PostMapping(value = "/getErrorListByApiUrl.maxy")
    public ResponseEntity<?> getErrorListByApiUrl(LogVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(),
                vo.getFrom(), vo.getTo(),
                vo.getReqUrl()
        );
        List<Map<String, Object>> result = performanceServiceV2.getErrorListByApiUrl(vo);

        CommonUtil.maskUserId(result, userIdMasking, 2);

        return ResponseEntity.ok().body(result);
    }

    /**
     * API 성능분석 -> device page flow 편성되어 있는지 확인
     */
    @PostMapping(value = "/hasPageLog.maxy")
    public ResponseEntity<?> hasPageLog(LogVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(),
                vo.getOsType(), vo.getDeviceId(),
                vo.getLogTm()
        );

        // elastic 에서 device page flow 편성되어 있는지 확인
        return ResponseEntity.ok().body(commonService.existsPageLog(LogRequestVO.of(vo)));
    }

    /**
     * Network interval time 의 percent 와 5/95% 구간의 percentile 값을 반환
     *
     * @param vo appInfo, reqUrl, intervaltime
     * @return {@link PercentileDataResponseDto}
     */
    @PostMapping(value = "/getPercentileData.maxy")
    public ResponseEntity<?> getPercentileData(LogVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(),
                vo.getOsType(), vo.getReqUrl(), vo.getIntervaltime()
        );

        PercentileDataResponseDto result = performanceServiceV2.getPercentileData(vo);

        return ResponseEntity.ok().body(result);
    }
}
