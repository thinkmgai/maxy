package com.thinkm.maxy.controller.app;

import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.util.Elastic;
import com.thinkm.common.util.ValidUtil;
import com.thinkm.maxy.dto.app.useranalytics.UserAnalyticsDetailRequestDto;
import com.thinkm.maxy.dto.app.useranalytics.UserAnalyticsDetailResponseDto;
import com.thinkm.maxy.dto.app.useranalytics.UserAnalyticsSearchRequestDto;
import com.thinkm.maxy.dto.app.useranalytics.UserAnalyticsSearchResponseDto;
import com.thinkm.maxy.service.app.DashboardService;
import com.thinkm.maxy.service.app.UserAnalyticsService;
import com.thinkm.maxy.service.common.BatchService;
import com.thinkm.maxy.service.common.CommonService;
import com.thinkm.maxy.vo.DashboardVO;
import com.thinkm.maxy.vo.DeviceVO;
import com.thinkm.maxy.vo.LogRequestVO;
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
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.ModelAndView;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 사용자 분석 컨트롤러
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "User Analytics Controller", description = "사용자분석 API 컨트롤러")
public class UserAnalyticsController {
    private final UserAnalyticsService userAnalyticsService;
    private final DashboardService dashboardService;
    private final CommonService commonService;
    private final BatchService batchService;

    @Value("${maxy.search-client-info:false}")
    private boolean useSearchClientInfo;

    /**
     * 사용자 분석 화면 이동
     *
     * @return ua/UA0000
     */
    @Operation(summary = "사용자 분석 페이지 이동",
            description = "사용자 분석 화면으로 이동합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "사용자 분석 JSP를 반환합니다."))
    @Auditable(action = AuditType.NAVIGATION, method = "사용자 분석")
    @GetMapping(value = "/ua/0000/goUserAnalysisView.maxy")
    public ModelAndView goUserAnalysisView() {
        ModelAndView mv = new ModelAndView("ua/UA0000");
        mv.addObject("useSearchClientInfo", useSearchClientInfo);
        return mv;
    }

    /**
     * 사용자 분석 화면 이동(상단 메뉴를 통해)
     *
     * @return ua/UA0400
     */
    @Operation(summary = "사용자 분석 새창 이동",
            description = "상단 메뉴에서 사용자 분석 화면을 새 창으로 엽니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "사용자 분석 새창 JSP를 반환합니다."))
    @Auditable(action = AuditType.NAVIGATION, method = "사용자 분석 (새창)")
    @GetMapping(value = "/ua/0000/goMenuUserAnalysisView.maxy")
    public ModelAndView goMenuUserAnalysisView() {
        ModelAndView mv = new ModelAndView("ua/UA0400");
        mv.addObject("useSearchClientInfo", useSearchClientInfo);
        return mv;
    }

    @Operation(summary = "페이지 플로우 조회",
            description = "검색 조건에 맞는 사용자 페이지 플로우를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "페이지 플로우 목록을 반환합니다."))
    @PostMapping(value = "/ua/0000/getPageFlowList.maxy")
    public ResponseEntity<?> getPageFlowList(PageLogVO vo) {
        Map<String, Object> resultMap = new HashMap<>();

        // 기존 단일 검색 또는 복합 검색 파라미터 검증
        if ("multiple".equals(vo.getSearchType())) {
            // 복합 검색인 경우 searchValues 검증
            ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                    vo.getPackageNm(), vo.getServerType(), vo.getSearchType());
            if (vo.getSearchValues() == null || vo.getSearchValues().isEmpty()) {
                throw new BadRequestException(ReturnCode.ERR_EMPTY_PARAMS);
            }
        } else {
            // 기존 단일 검색인 경우
            ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                    vo.getPackageNm(), vo.getServerType(), vo.getSearchType(), vo.getSearchValue());
        }

        if ((vo.getFrom() == null || vo.getTo() == null) && vo.getLogTm() == null) {
            throw new BadRequestException(ReturnCode.ERR_EMPTY_PARAMS);
        }

        // logTm 이 없고, from/to 가 동일할 경우 from 값을 logTm 으로 간주
        if (vo.getLogTm() == null && (vo.getFrom().equals(vo.getTo()))) {
            vo.setLogTm(vo.getFrom());
        }

        if (vo.getLogTm() != null && vo.getLogTm() > 0) {
            long logTm = vo.getLogTm();
            vo.setFrom(logTm);
            vo.setTo(logTm);
            long parentLogDate = userAnalyticsService.getParentLogDateByLogTmV2(vo);
            vo.setFrom(parentLogDate);
            vo.setTo(parentLogDate);
        }

        resultMap.put("userFlowList", userAnalyticsService.getUserFlowListV2(vo));

        return ResponseEntity.ok(resultMap);
    }

    @Operation(summary = "페이지별 로그 목록 조회",
            description = "페이지 범위 내 로그 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "페이지별 로그 목록을 반환합니다."))
    @PostMapping(value = "/ua/0000/getLogListByPage.maxy")
    public ResponseEntity<?> getLogListByPage(PageLogVO vo) {
        Map<String, Object> resultMap = new HashMap<>();

        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS
                , vo.getPackageNm()
                , vo.getServerType()
                , vo.getDeviceId()
                , vo.getFrom()
                , vo.getTo()
        );

        List<?> result = userAnalyticsService.getLogListByPage(vo);
        resultMap.put("logList", result);

        return ResponseEntity.ok(resultMap);
    }

    @Operation(summary = "페이지 성능 상세 조회",
            description = "선택한 사용자 세션의 페이지 메트릭과 상세 정보를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "페이지 성능 정보를 반환합니다."))
    @PostMapping(value = "/ua/0000/getPageInfo.maxy")
    public ResponseEntity<?> getPageInfo(DashboardVO vo) {
        Map<String, Object> resultMap = new HashMap<>();

        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS
                , vo.getPackageNm()
                , vo.getServerType()
                , vo.getDeviceId()
                , vo.getFrom()
                , vo.getTo()
        );

        Map<String, Object> result = dashboardService.getMedResponseAndLoadingTime(vo);
        resultMap.put("med", result);

        // 팝업의 logDetail에서 rendering, responseTime을 구한다.
        long s1 = System.currentTimeMillis();
        boolean hasPageId = Elastic.hasMxPageId(vo.getMxPageId());
        Map<String, Object> pageInfo;
        if (hasPageId) {
            pageInfo = commonService.getCurrentPageInfoByPageId(vo.getPackageNm(), vo.getServerType(), vo.getMxPageId());
        } else {
            pageInfo = commonService.getCurrentPageInfoByDeviceId(LogRequestVO.of(vo));
        }
        log.debug("getPageInfo by {} cost time: {} ms", (hasPageId ? "mxPageId" : "no mxPageId"), System.currentTimeMillis() - s1);
        resultMap.put("pageInfo", pageInfo);

        return ResponseEntity.ok(resultMap);
    }

    @Operation(summary = "전체 사용자 리스트 조회",
            description = "사용자 분석 대상 장치 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "전체 사용자 목록을 반환합니다."))
    @PostMapping(value = "/ua/0000/getTotalUserList.maxy")
    public ResponseEntity<?> getTotalUserList(DeviceVO vo) {
        Map<String, Object> resultMap = new HashMap<>();

        List<Map<String, Object>> result = userAnalyticsService.getTotalUserList(vo);
        resultMap.put("totalUserList", result);

        return ResponseEntity.ok(resultMap);
    }

    @Operation(summary = "사용자 검색",
            description = "조건에 맞는 사용자 목록을 검색합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "사용자 검색 결과를 반환합니다."))
    @PostMapping(value = "/ua/0000/getUserList.maxy")
    public ResponseEntity<List<UserAnalyticsSearchResponseDto>> getUserList(UserAnalyticsSearchRequestDto dto) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                dto.getPackageNm(), dto.getServerType(),
                dto.getSearchType(), dto.getSearchValue(),
                dto.getFrom(), dto.getTo());

        List<UserAnalyticsSearchResponseDto> result = userAnalyticsService.getUserList(dto);

        return ResponseEntity.ok().body(result);
    }

    @Operation(summary = "사용자 상세 조회",
            description = "특정 사용자의 상세 정보를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "사용자 상세 정보를 반환합니다."))
    @PostMapping(value = "/ua/0000/getUserDetail.maxy")
    public ResponseEntity<UserAnalyticsDetailResponseDto> getUserDetail(UserAnalyticsDetailRequestDto dto) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                dto.getPackageNm(), dto.getServerType(),
                dto.getDeviceId(), dto.getFrom(), dto.getTo());

        UserAnalyticsDetailResponseDto result = userAnalyticsService.getUserDetail(dto);

        int sleepDate = batchService.getSleepDate();
        result.setSleepDate(sleepDate);

        return ResponseEntity.ok().body(result);
    }
}
