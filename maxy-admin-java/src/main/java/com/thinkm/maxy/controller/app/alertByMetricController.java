package com.thinkm.maxy.controller.app;


import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.exception.ForbiddenException;
import com.thinkm.common.util.ValidUtil;
import com.thinkm.maxy.service.app.AlertService;
import com.thinkm.maxy.vo.AlertSendConfigVO;
import com.thinkm.maxy.vo.AlertSendTargetVO;
import com.thinkm.maxy.vo.AlertLimitConfigVO;
import com.thinkm.maxy.vo.AlertHistoryVO;
import com.thinkm.maxy.vo.MaxyUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 모니터링 지표 별 알림 컨트롤러
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Alert by Metric Controller", description = "관리 > 알림 설정")
public class alertByMetricController {

    private final AlertService alertService;

    /**
     * 알림 설정 페이지 이동
     *
     * @return gm/gm1101
     */
    @Operation(summary = "알림 설정 페이지 이동",
            description = "알림 설정 화면으로 이동합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "알림 설정 페이지 뷰를 반환합니다."))
    @Auditable(action = AuditType.NAVIGATION, method = "알림 설정")
    @GetMapping(value = "/gm/1101/goAlertByMetricView.maxy")
    public ModelAndView goAIBotView() {
        return new ModelAndView("gm/GM1101");
    }

    /**
     * 알림 설정 조회
     */
    @Operation(summary = "알림 설정 조회",
            description = "등록된 알림 설정을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "알림 설정 정보를 반환합니다."))
    @PostMapping(value = "/gm/1101/getAlertConfig.maxy")
    public ResponseEntity<?> getAlertConfig(AlertLimitConfigVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_WRONG_PARAMS, vo.getPackageNm(), vo.getServerType());

        List<AlertLimitConfigVO> alertConfig = alertService.getAlertConfig(vo);
        return ResponseEntity.ok().body(alertConfig);
    }

    /**
     * 알림 설정 저장
     */
    @Operation(summary = "알림 설정 저장",
            description = "등록된 알림 설정을 저장합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "알림 설정 정보를 반환합니다."))
    @PostMapping(value = "/gm/1101/saveAlertConfig.maxy")
    public void saveAlertConfig(HttpServletRequest request, @RequestBody List<AlertLimitConfigVO> list) {
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null) {
            throw new ForbiddenException();
        }

        if (list == null || list.isEmpty()) {
            throw new BadRequestException(ReturnCode.ERR_WRONG_PARAMS);
        }

        list.forEach(vo -> {
            ValidUtil.isValidParams(ReturnCode.ERR_WRONG_PARAMS, vo.getPackageNm(), vo.getServerType(), vo.getTarget());
            vo.setRegNo(user.getUserNo());
            vo.setUpdNo(user.getUserNo());
        });

        alertService.upsertAlertConfig(list);
    }

    /**
     * 알림 이력 조회
     */
    @Operation(summary = "알림 이력 조회",
            description = "알림 이력을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "알림 이력을 반환합니다."))
    @PostMapping(value = "/gm/1101/getAlertHistoryList.maxy")
    public ResponseEntity<?> getAlertHistoryList(AlertHistoryVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_WRONG_PARAMS, vo.getPackageNm(), vo.getServerType());

        List<AlertHistoryVO> list = alertService.getAlertHistoryList(vo);
        return ResponseEntity.ok().body(list);
    }

    /**
     * 알림 외부연동 설정 조회
     */
    @Operation(summary = "알림 외부연동 설정 조회",
            description = "등록된 알림 외부연동 설정을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "알림 외부연동 설정 정보를 반환합니다."))
    @PostMapping(value = "/gm/1101/getAlertSendConfig.maxy")
    public ResponseEntity<?> getAlertSendConfig(AlertSendConfigVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_WRONG_PARAMS, vo.getPackageNm(), vo.getServerType(), vo.getSendType());

        Map<String, Object> result = new HashMap<>();

        result.put("config", alertService.getAlertSendConfig(vo));
        result.put("targets", alertService.selectAlertSendTargets(vo));

        return ResponseEntity.ok().body(result);
    }

    /**
     * 알림 외부연동 설정 저장
     */
    @Operation(summary = "알림 외부연동 설정 저장",
            description = "알림 외부연동 설정을 저장합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "알림 외부연동 설정을 저장합니다."))
    @PostMapping(value = "/gm/1101/saveAlertSendConfig.maxy")
    public void saveAlertSendConfig(HttpServletRequest request, @RequestBody AlertSendConfigVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_WRONG_PARAMS, vo.getPackageNm(), vo.getServerType(), vo.getSendType());

        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null) {
            throw new ForbiddenException();
        }

        // 기본 정보 설정
        vo.setRegNo(user.getUserNo());
        vo.setUpdNo(user.getUserNo());

        // 알림 대상 목록 처리
        List<AlertSendTargetVO> targets = vo.getTargets();
        if (targets != null && !targets.isEmpty()) {
            targets.forEach(target -> {
                ValidUtil.isValidParams(ReturnCode.ERR_WRONG_PARAMS,
                        target.getPackageNm(), target.getServerType(), target.getSendType(), target.getTarget());
                target.setRegNo(user.getUserNo());
                target.setUpdNo(user.getUserNo());
            });
        }

        alertService.saveAlertSendConfig(vo);
    }

    /**
     * 알림 외부연동 설정 삭제
     */
    @Operation(summary = "알림 외부연동 설정 삭제",
            description = "등록된 알림 외부연동 설정을 삭제합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "알림 외부연동 설정 정보를 삭제합니다."))
    @PostMapping(value = "/gm/1101/deleteAlertSendConfig.maxy")
    public void deleteAlertSendConfig(AlertSendConfigVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_WRONG_PARAMS, vo.getPackageNm(), vo.getServerType(), vo.getSendType());

        alertService.deleteAlertSendConfig(vo);
    }

    /**
     * 알림 외부연동 설정 사용여부 설정
     */
    @Operation(summary = "알림 외부연동 설정 사용여부 설정",
            description = "알림 외부연동 설정 사용여부 설정을 저장합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "알림 외부연동 설정 사용여부 설정을 저장합니다."))
    @PostMapping(value = "/gm/1101/updateAlertSendConfigUseYn.maxy")
    public void updateAlertSendConfigUseYn(HttpServletRequest request, @RequestBody AlertSendConfigVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_WRONG_PARAMS, vo.getPackageNm(), vo.getServerType(), vo.getSendType(), vo.getUseYn());

        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null) {
            throw new ForbiddenException();
        }

        // 기본 정보 설정
        vo.setRegNo(user.getUserNo());
        vo.setUpdNo(user.getUserNo());

        alertService.updateAlertSendConfigUseYn(vo);
    }
}
