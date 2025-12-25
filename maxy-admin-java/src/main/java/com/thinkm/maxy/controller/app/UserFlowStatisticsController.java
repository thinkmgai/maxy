package com.thinkm.maxy.controller.app;

import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import com.thinkm.common.util.ValidUtil;
import com.thinkm.maxy.service.app.UserFlowStatisticsService;
import com.thinkm.maxy.vo.PageSummaryVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.ModelAndView;

import javax.annotation.Resource;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * User Flow Statistics 컨트롤러
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "User Flow Statistics Controller", description = "관리 > 사용자 흐름 분석 API 컨트롤러 (추후 개발용도)")
public class UserFlowStatisticsController {

    @Resource
    private final UserFlowStatisticsService userFlowStatisticsService;

    /**
     * 관리 > 사용자 > User Flow Statistics 화면 진입
     *
     * @return PA0200
     */
    @Operation(summary = "User Flow Statistics 페이지 이동",
            description = "사용자 흐름 통계 화면으로 이동합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "User Flow Statistics JSP를 반환합니다."))
    @Auditable(action = AuditType.NAVIGATION, method = "User Flow Statistics")
    @RequestMapping(value = "/gm/1002/goPageFlowView.maxy")
    public ModelAndView goPageFlowView() {
        return new ModelAndView("pa/PA0200");
    }

    /**
     * 앱 페이지 사용 집계 조회
     *
     * @param vo {packageNm, serverType, searchFromDt, searchToDt}
     * @return pageEventParentList
     */
    @Operation(summary = "앱 페이지 사용 집계 조회",
            description = "기간별 Landing Page 및 사용자 흐름 집계 데이터를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "Landing 페이지 목록과 흐름 요약을 반환합니다."))
    @PostMapping(value = "/gm/1002/getPageFlowSummaryList.maxy")
    public ResponseEntity<?> getPageFlowSummaryList(PageSummaryVO vo) {
        Map<String, Object> resultMap = new HashMap<>();
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getPackageNm(), vo.getServerType());

        List<PageSummaryVO> landingPageList = userFlowStatisticsService.getLandingPageList(vo);

        List<?> pageFlowSummaryList = userFlowStatisticsService.getPageFlowSummaryList(vo);

        resultMap.put("landingPageList", landingPageList);
        resultMap.put("pageFlowSummaryList", pageFlowSummaryList);
        return ResponseEntity.ok(resultMap);
    }

    @Operation(summary = "Landing Page 별 사용자 흐름 조회",
            description = "선택한 랜딩 페이지 이후 사용자 흐름을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "사용자 흐름 요약 목록을 반환합니다."))
    @PostMapping(value = "/gm/1002/getPageFlowSummaryListByLandingPage.maxy")
    public ResponseEntity<?> getPageFlowSummaryListByLandingPage(PageSummaryVO vo) {
        Map<String, Object> resultMap = new HashMap<>();
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(), vo.getFlowOrder(), vo.getReqUrl());

        List<PageSummaryVO> pageFlowSummaryList = userFlowStatisticsService.getPageFlowSummaryListByLandingPage(vo);

        List<Map<String, Object>> pageFlowSummaryListMap = new ArrayList<>();
        for (PageSummaryVO p : pageFlowSummaryList) {
            pageFlowSummaryListMap.add(p.of());
        }

        resultMap.put("pageFlowSummaryList", pageFlowSummaryListMap);
        return ResponseEntity.ok(resultMap);
    }
}
