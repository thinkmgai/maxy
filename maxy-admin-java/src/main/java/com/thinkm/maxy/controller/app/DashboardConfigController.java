package com.thinkm.maxy.controller.app;

import com.thinkm.common.code.CommonCode;
import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import com.thinkm.common.exception.AuthException;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.DateUtil;
import com.thinkm.common.util.JsonUtil;
import com.thinkm.common.util.ValidUtil;
import com.thinkm.maxy.service.app.DashboardConfigService;
import com.thinkm.maxy.service.app.PageService;
import com.thinkm.maxy.service.app.RedisService;
import com.thinkm.maxy.vo.DashboardComponentVO;
import com.thinkm.maxy.vo.DashboardVO;
import com.thinkm.maxy.vo.MaxyUser;
import com.thinkm.maxy.vo.PagesVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.ModelAndView;

import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 대시보드 컨트롤러 (AJAX)
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Dashboard Config Controller", description = "관리 > Components, 종합분석 Components config API 컨트롤러")
public class DashboardConfigController {
    @Resource
    private final DashboardConfigService dashboardConfigService;
    @Resource
    private final RedisService redisService;
    @Resource
    private final PageService pageService;

    /**
     * Basic Information 페이지 이동
     *
     * @return 관리 > 종합 > Basic Information
     */
    @Operation(summary = "Basic Information 설정 페이지 이동",
            description = "종합 분석 Basic Information 설정 화면으로 이동합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "Basic Information 설정 JSP를 반환합니다."))
    @Auditable(action = AuditType.NAVIGATION, method = "Basic Information 관리")
    @RequestMapping(value = "/gm/0301/goDashboardBasicConfigView.maxy")
    public ModelAndView goDashboardBasicConfigView() {
        return new ModelAndView("gm/GM0301");
    }

    /**
     * Components 페이지 이동
     *
     * @return 관리 > 종합 > Components
     */
    @Operation(summary = "Components 설정 페이지 이동",
            description = "종합 분석 Components 설정 화면으로 이동합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "Components 설정 JSP를 반환합니다."))
    @Auditable(action = AuditType.NAVIGATION, method = "Components 관리")
    @RequestMapping(value = "/gm/0302/goDashboardChartConfigView.maxy")
    public ModelAndView goDashboardChartConfigView() {
        return new ModelAndView("gm/GM0302");
    }

    /**
     * 컴포넌트 관리 정보 조회
     *
     * @param request 로그인 세션 정보
     * @return 컴포넌트 차트 정보
     */
    @Operation(summary = "컴포넌트 차트 설정 조회",
            description = "등록된 종합 분석 컴포넌트 차트 설정을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "컴포넌트 차트 설정 정보를 반환합니다."))
    @PostMapping(value = "/gm/0302/getChartConfig.maxy")
    public ResponseEntity<?> getChartConfig(HttpServletRequest request) {
        DashboardComponentVO vo = new DashboardComponentVO();
        vo.setRegInfo(request);

        Map<Integer, Object> chartConfig = dashboardConfigService.getComponentsConfig(vo);

        return ResponseEntity.ok().body(chartConfig);
    }

    @Operation(summary = "컴포넌트 설정 수정",
            description = "컴포넌트 구성 정보를 수정하고 최신 설정을 반환합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "수정된 컴포넌트 설정 정보를 반환합니다."))
    @Auditable(action = AuditType.UPDATE, method = "컴포넌트 설정 수정")
    @PostMapping(value = "/gm/0302/modifyComponentConfig.maxy")
    public ResponseEntity<?> modifyComponentConfig(HttpServletRequest request, DashboardComponentVO vo) {
        vo.setRegInfo(request);

        // config 수정
        dashboardConfigService.modifyComponentConfig(vo);

        // 수정된 결과 반환
        Map<Integer, Object> result = dashboardConfigService.getChartConfig(vo);

        return ResponseEntity.ok().body(result);
    }

    @Operation(summary = "단일 컴포넌트 설정 조회",
            description = "컴포넌트 타입별 상세 설정을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "요청한 컴포넌트 설정을 반환합니다."))
    @PostMapping(value = "/gm/0302/getComponentConfig.maxy")
    public ResponseEntity<?> getComponentConfig(HttpServletRequest request, DashboardComponentVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getType());
        vo.setRegInfo(request);

        DashboardComponentVO result = dashboardConfigService.getComponentConfig(vo);

        return ResponseEntity.ok().body(result);
    }

    @Operation(summary = "차트 설정 수정",
            description = "컴포넌트 차트 설정을 수정하고 최신 설정을 반환합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "수정된 차트 설정 정보를 반환합니다."))
    @Auditable(action = AuditType.UPDATE, method = "차트 설정 수정")
    @PostMapping(value = "/gm/0302/modifyChartConfig.maxy")
    public ResponseEntity<?> modifyChartConfig(HttpServletRequest request, DashboardComponentVO vo) {
        vo.setRegInfo(request);

        // config 수정
        dashboardConfigService.modifyChartConfig(vo);

        // 수정된 결과 반환
        Map<Integer, Object> result = dashboardConfigService.getChartConfig(vo);

        return ResponseEntity.ok().body(result);
    }

    @Operation(summary = "Basic Information 설정 조회",
            description = "선택한 패키지/서버의 Basic Information 설정을 조회합니다. 없을 경우 기본값을 생성합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "Basic Information 설정을 반환합니다."))
    @PostMapping(value = "/gm/0301/getDashboardBasicConfig.maxy")
    public ResponseEntity<?> getDashboardBasicConfig(HttpServletRequest request, DashboardVO vo) {
        Map<String, Object> resultMap = new HashMap<>();
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getPackageNm(), vo.getServerType());

        vo.setRegInfo(request);

        DashboardVO result = dashboardConfigService.getDashboardBasicConfig(vo);
        if (result == null) {
            dashboardConfigService.addDashboardBasicConfig(vo);
            result = dashboardConfigService.getDashboardBasicConfig(vo);
        }
        resultMap.put("basicConfig", result);
        return ResponseEntity.ok().body(resultMap);
    }

    @Operation(summary = "Basic Information 설정 수정",
            description = "Basic Information 설정을 수정하고 최신 설정을 반환합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "수정된 Basic Information 설정을 반환합니다."))
    @Auditable(action = AuditType.UPDATE, method = "Basic Information 설정 수정")
    @PostMapping(value = "/gm/0301/modifyDashboardBasicConfig.maxy")
    public ResponseEntity<?> modifyDashboardBasicConfig(HttpServletRequest request, DashboardVO vo) {
        Map<String, Object> resultMap = new HashMap<>();
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getPackageNm(), vo.getServerType());
        vo.setRegInfo(request);

        dashboardConfigService.modifyDashboardBasicConfig(vo);
        DashboardVO result = dashboardConfigService.getDashboardBasicConfig(vo);
        resultMap.put("basicConfig", result);
        return ResponseEntity.ok().body(resultMap);
    }

    @Operation(summary = "Version Comparison 설정 수정",
            description = "버전 비교에 사용될 임시 설정을 Redis에 저장합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "Version Comparison 설정 저장 결과를 반환합니다."))
    @Auditable(action = AuditType.UPDATE, method = "Version Comparison 설정 수정")
    @PostMapping(value = "/gm/0301/setVersionComparisonConfig.maxy")
    public void setVersionComparisonConfig(HttpServletRequest request, DashboardComponentVO.VersionComparisonVO vo) {
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null) {
            throw new AuthException();
        }
        String key = String.join(":", CommonCode.COMPONENT_CONFIG_VERSION_COMPARISON.getValue(),
                user.getUserNo() + "",
                vo.getPackageNm(),
                vo.getServerType());

        redisService.set(key, JsonUtil.toJson(vo));
    }

    @Operation(summary = "Marketing Insight 설정 조회",
            description = "마케팅 인사이트 페이지 설정을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "마케팅 인사이트 설정 값을 반환합니다."))
    @PostMapping(value = "/gm/0302/getMarketingInsightConfig.maxy")
    public ResponseEntity<?> getMarketingInsightConfig(HttpServletRequest request, DashboardVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getPackageNm(), vo.getServerType());
        Map<String, Object> result = new HashMap<>();

        DashboardComponentVO config = dashboardConfigService.getMarketingInsightConfig(vo);
        if (config == null) {
            result.put("preUrl", "");
            result.put("reqUrl", "");
        } else {
            result.put("preUrl", config.getPreUrl());
            result.put("reqUrl", config.getReqUrl());
        }

        return ResponseEntity.ok().body(result);
    }

    @Operation(summary = "Marketing Insight 설정 수정",
            description = "앱 화면 URL 기반의 마케팅 인사이트 설정을 저장합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "설정 저장 성공 여부를 반환합니다."))
    @Auditable(action = AuditType.UPDATE, method = "Marketing Insight 설정 수정")
    @PostMapping(value = "/gm/0302/setMarketingInsightConfig.maxy")
    public ResponseEntity<?> setMarketingInsightConfig(HttpServletRequest request, @RequestBody PagesVO vo) {
        List<PagesVO> infoList = vo.getInfoList();

        if (!infoList.isEmpty()) {
            for (PagesVO info : infoList) {
                ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, info.getReqUrl());

                // & ' " < >
                // &amp; &apos; &quot; &lt; &gt;
                info.setAppPageNm(CommonUtil.convertHTMLCode(info.getAppPageNm()));
                info.setReqUrl(CommonUtil.convertHTMLCode(info.getReqUrl()));

                info.setRegInfo(request);
            }

            // Update
            pageService.updatePageMarketingInsight(vo);

            DashboardVO dashboardVO = new DashboardVO();
            dashboardVO.setPackageNm(vo.getPackageNm());
            dashboardVO.setServerType(vo.getServerType());
            dashboardVO.setUserNo(vo.getUserNo());
            dashboardVO.setPreUrl(infoList.get(0).getReqUrl());
            dashboardVO.setReqUrl(infoList.get(1).getReqUrl());
            dashboardVO.setRegDt(DateUtil.format());

            dashboardConfigService.upsertPageMarketingInsight(dashboardVO);
            return ResponseEntity.ok().build();
        } else {
            throw new BadRequestException(ReturnCode.ERR_EMPTY_PARAMS);
        }
    }

    /**
     * url 로 시작/도달 목록 조회
     *
     * @param vo packageNm, serverType, preUrl(optional), reqUrl(optional)
     * @return url list
     */
    @Operation(summary = "URL 연관 경로 조회",
            description = "지정한 URL을 기준으로 시작/도달 경로 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "연관된 URL 목록을 반환합니다."))
    @PostMapping(value = "/gm/0302/searchRelatedUrlList.maxy")
    public ResponseEntity<?> searchRelatedUrlList(DashboardVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getPackageNm(), vo.getServerType());

        String preUrl = vo.getPreUrl();
        String reqUrl = vo.getReqUrl();

        // data 둘 다 없으면 에러
        if ((preUrl == null || preUrl.isEmpty())
            && (reqUrl == null || reqUrl.isEmpty())) {
            throw new BadRequestException();
        }

        List<String> result = pageService.getRelatedUrlList(vo);

        return ResponseEntity.ok().body(result);
    }
}
