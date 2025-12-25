package com.thinkm.maxy.controller.app;

import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.util.ValidUtil;
import com.thinkm.maxy.service.app.IntegrationService;
import com.thinkm.maxy.vo.IntegrationVO;
import com.thinkm.maxy.vo.MaxyUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.ModelAndView;

import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import java.util.List;

@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Integration Controller", description = "시스템관리 > Slack 통합 API 컨트롤러")
public class IntegrationController {

    @Resource
    private final IntegrationService integrationService;

    @Operation(summary = "Integration 설정 페이지 이동",
            description = "Slack 연동 설정 화면으로 이동합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "Integration 설정 JSP를 반환합니다."))
    @Auditable(action = AuditType.NAVIGATION, method = "Integration 설정")
    @GetMapping(value = "/sm/0700/goIntegrationConfigView.maxy")
    public ModelAndView goIntegrationConfigView() {
        return new ModelAndView("sm/SM0700");
    }

    @Operation(summary = "Landing 페이지 URL 유효성 검증",
            description = "입력한 페이지 URL이 Slack 알림 연동 조건에 적합한지 확인합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "URL 검증 결과를 반환합니다."))
    @PostMapping("/sm/0700/confirmPageUrl.maxy")
    public ResponseEntity<?> confirmPageUrl(IntegrationVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(), vo.getReqUrl());

        boolean result = integrationService.confirmLandingPageUrl(vo);

        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Landing 페이지 설정 삭제",
            description = "등록된 Landing 페이지 설정을 삭제합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "삭제 후 남은 설정 목록을 반환합니다."))
    @Auditable(action = AuditType.DELETE, method = "Landing 페이지 설정 삭제")
    @PostMapping("/sm/0700/delPageConfig.maxy")
    public ResponseEntity<?> delPageConfig(IntegrationVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getId(), vo.getPackageNm(), vo.getServerType());

        integrationService.delLandingPageConfig(vo);

        List<IntegrationVO> config = integrationService.getLandingPageConfig(vo);

        return ResponseEntity.ok(config);
    }

    @Operation(summary = "Landing 페이지 설정 추가",
            description = "Slack 알림을 위한 Landing 페이지를 등록합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "등록 후 설정 목록을 반환합니다."))
    @Auditable(action = AuditType.INSERT, method = "Landing 페이지 설정 추가")
    @PostMapping("/sm/0700/addPageConfig.maxy")
    public ResponseEntity<?> addPageConfig(HttpServletRequest request, IntegrationVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(),
                vo.getServerType(),
                vo.getReqUrl(),
                vo.getInterval(),
                vo.getInsertType(),
                vo.getFromHour(),
                vo.getToHour(),
                vo.getFromMin(),
                vo.getToMin());

        setUserNo(request, vo);

        try {

            // 기존 데이터와 입력 시간이 겹치는지 확인
            boolean flag = checkDuplicateTime(vo);
            if (flag) {
                throw new BadRequestException(ReturnCode.ERR_DUPLICATE_TIME);
            } else {
                integrationService.addLandingPageConfig(vo);
            }

        } catch (DuplicateKeyException e) {
            throw new BadRequestException(ReturnCode.ERR_DUPLICATE_CD_VAL);
        }

        List<IntegrationVO> config = integrationService.getLandingPageConfig(vo);

        return ResponseEntity.ok(config);
    }

    private boolean checkDuplicateTime(IntegrationVO param) {
        boolean result = false;

        if (param.getFromHour().length() == 1) param.setFromHour("0" + param.getFromHour());
        if (param.getFromMin().length() == 1) param.setFromMin("0" + param.getFromMin());
        if (param.getToHour().length() == 1) param.setToHour("0" + param.getToHour());
        if (param.getToMin().length() == 1) param.setToMin("0" + param.getToMin());

        List<IntegrationVO> resList = integrationService.selectBeforeSettingPageList(param);

        if (resList != null && !resList.isEmpty()) {

            String fromTime = param.getFromHour() + param.getFromMin();
            String toTime = param.getToHour() + param.getToMin();

            String targetFrom;
            String targetTo;
            for (IntegrationVO res : resList) {
                targetFrom = res.getFromHour() + res.getFromMin();
                targetTo = res.getToHour() + res.getToMin();

                if ((Integer.parseInt(fromTime) <= Integer.parseInt(targetFrom))
                    && (Integer.parseInt(toTime) >= Integer.parseInt(targetFrom))
                    && (Integer.parseInt(toTime) <= Integer.parseInt(targetTo))
                ) {
                    result = true;
                    break;
                } else if ((Integer.parseInt(fromTime) >= Integer.parseInt(targetFrom))
                           && (Integer.parseInt(fromTime) <= Integer.parseInt(targetTo))
                           && (Integer.parseInt(toTime) >= Integer.parseInt(targetTo))
                ) {
                    result = true;
                    break;
                } else if ((Integer.parseInt(fromTime) >= Integer.parseInt(targetFrom))
                           && (Integer.parseInt(fromTime) <= Integer.parseInt(targetTo))
                           && (Integer.parseInt(toTime) <= Integer.parseInt(targetTo))
                ) {
                    result = true;
                    break;
                }
            }
        }

        return result;
    }

    @Operation(summary = "Landing 페이지 설정 조회",
            description = "사용자 기준으로 Landing 페이지 설정 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "Landing 페이지 설정 목록을 반환합니다."))
    @PostMapping("/sm/0700/getPageConfig.maxy")
    public ResponseEntity<?> getPageConfig(HttpServletRequest request, IntegrationVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType());

        setUserNo(request, vo);

        List<IntegrationVO> config = integrationService.getLandingPageConfig(vo);

        return ResponseEntity.ok(config);
    }

    @Operation(summary = "연동 설정 수정",
            description = "Slack 등 외부 연동 설정을 수정하고 최신 상태를 반환합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "수정된 연동 설정을 반환합니다."))
    @Auditable(action = AuditType.UPDATE, method = "연동 설정 수정")
    @PostMapping("/sm/0700/modifyIntegrationConfig.maxy")
    public ResponseEntity<?> modifyIntegrationConfig(HttpServletRequest request, IntegrationVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getType(), vo.getPackageNm(), vo.getServerType());

        setUserNo(request, vo);

        integrationService.modifyIntegrationConfig(vo);

        IntegrationVO config = integrationService.getIntegrationConfig(vo);
        return ResponseEntity.ok(config);
    }

    /**
     * 외부 앱 연동 설정 조회, 없을 경우 생성
     *
     * @param request {@link HttpServletRequest}
     * @param vo      {type, packageN, serverType}
     * @return config
     */
    @Operation(summary = "연동 설정 조회/생성",
            description = "연동 설정이 없으면 생성한 뒤 상세 정보를 반환합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "연동 설정 정보를 반환합니다."))
    @Auditable(action = AuditType.INSERT, method = "연동 설정 추가 및 조회")
    @PostMapping("/sm/0700/getIntegrationConfig.maxy")
    public ResponseEntity<?> getIntegrationConfig(HttpServletRequest request, IntegrationVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getType(), vo.getPackageNm(), vo.getServerType());

        setUserNo(request, vo);

        // 연동 정보 없으면
        if (!integrationService.existsIntegrationConfig(vo)) {
            // 해당 조건에 맞는 연동 정보를 새로 만듬
            integrationService.addIntegrationConfig(vo);
        }

        IntegrationVO config = integrationService.getIntegrationConfig(vo);

        return ResponseEntity.ok(config);
    }

    private void setUserNo(HttpServletRequest request, IntegrationVO vo) {
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user != null) {
            vo.setUserNo(user.getUserNo());
        }
    }
}
