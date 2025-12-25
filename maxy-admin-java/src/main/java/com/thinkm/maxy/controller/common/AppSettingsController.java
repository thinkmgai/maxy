package com.thinkm.maxy.controller.common;

import com.thinkm.common.code.CommonCode;
import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.code.ServerTypeCode;
import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import com.thinkm.common.exception.AuthException;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.util.ValidUtil;
import com.thinkm.maxy.dto.app.useranalytics.UserAnalyticsSearchRequestDto;
import com.thinkm.maxy.dto.app.useranalytics.UserAnalyticsSearchResponseDto;
import com.thinkm.maxy.dto.front.dashboard.feeldex.FeeldexRequestDto;
import com.thinkm.maxy.service.app.UserAnalyticsService;
import com.thinkm.maxy.service.common.AppSettingsService;
import com.thinkm.maxy.service.common.UserService;
import com.thinkm.maxy.service.front.FrontCommonService;
import com.thinkm.maxy.vo.MaxyUser;
import com.thinkm.maxy.vo.PackageVO;
import com.thinkm.maxy.vo.SessionReplayRuleVO;
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

import javax.servlet.http.HttpServletRequest;
import java.util.List;

/**
 * App Settings Controller
 */

@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "App Settings Controller", description = "시스템 관리 > 앱 설정 API 컨트롤러")
public class AppSettingsController {
    private final AppSettingsService appSettingsService;
    private final UserService userService;
    private final UserAnalyticsService userAnalyticsService;
    private final FrontCommonService frontCommonService;

    @Value("${maxy.integration-dashboard:false}")
    private boolean integration;
    @Value("${maxy.mode:maxy}")
    private String mode;

    /**
     * 앱 설정 페이지 이동
     *
     * @return sm/sm0400
     */
    @Operation(summary = "앱 설정 화면 이동",
            description = "앱 설정(앱 관리) 화면으로 이동합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "SM0400 JSP를 반환합니다."))
    @Auditable(action = AuditType.NAVIGATION, method = "앱 설정")
    @GetMapping(value = "/sm/0500/goPackageView.maxy")
    public ModelAndView goPackageView() {
        ModelAndView mv = new ModelAndView("sm/SM0400");

        String serverType = ServerTypeCode.getAllToString();

        mv.addObject("serverType", serverType);
        mv.addObject("integration", integration);

        mv.addObject("mode", mode);

        return mv;
    }


    /**
     * 앱 목록 조회
     *
     * @return packageList
     */
    @Operation(summary = "앱 목록 조회",
            description = "등록된 앱 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "앱 목록을 반환합니다."))
    @PostMapping(value = "/sm/0500/getAppInfoList.maxy")
    public ResponseEntity<?> getAppInfoList() {
        List<PackageVO> result = appSettingsService.getAppInfoList();

        return ResponseEntity.ok().body(result);
    }


    /**
     * 앱 등록/수정
     *
     * @param vo {@link PackageVO}
     */
    @Operation(summary = "앱 등록/수정",
            description = "앱 정보를 등록하거나 수정합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "갱신된 앱 목록을 반환합니다."))
    @Auditable(action = AuditType.INSERT, method = "앱 등록/수정")
    @PostMapping(value = "/sm/0500/saveAppInfo.maxy")
    public ResponseEntity<?> saveAppInfo(HttpServletRequest request, PackageVO vo) {
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null) {
            throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
        }
        vo.setRegInfo(request);

        if (vo.getPackageNm() == null || vo.getDisplayNm() == null) {
            throw new BadRequestException(ReturnCode.ERR_EMPTY_PACKAGE_VALUE);
        }

        appSettingsService.saveAppInfo(vo);

        // Front 모니터링일 경우에만
        if(CommonCode.FRONT_APP_TYPE.equals(vo.getAppType())){
            FeeldexRequestDto dto = new FeeldexRequestDto();
            dto.setPackageNm(vo.getPackageNm());
            dto.setServerType(vo.getServerType());
            dto.setLcp(vo.getLcp());
            dto.setInp(vo.getInp());
            dto.setCls(vo.getCls());
            frontCommonService.addFeeldexConfig(dto, user.getUserNo());
        }

        List<PackageVO> result = appSettingsService.getAppInfoList();

        // 사용자 조회가능 앱명 재설정
        userService.refreshAppInfo(user, vo.getAppType());
        return ResponseEntity.ok().body(result);
    }

    /**
     * 앱 삭제
     *
     * @param vo {@link PackageVO}
     */
    @Operation(summary = "앱 삭제",
            description = "선택한 앱 정보를 삭제합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "삭제 후 앱 목록을 반환합니다."))
    @Auditable(action = AuditType.DELETE, method = "앱 삭제")
    @PostMapping(value = "/sm/0500/deleteAppInfo.maxy")
    public ResponseEntity<?> deleteAppInfo(HttpServletRequest request, PackageVO vo) {
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);

        if (user == null) {
            throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
        }
        vo.setRegInfo(request);

        // Delete
        appSettingsService.deleteAppInfo(vo);

        List<PackageVO> result = appSettingsService.getAppInfoList();

        // 사용자 조회가능 앱명 재설정
        userService.refreshAppInfo(user, vo.getAppType());
        return ResponseEntity.ok().body(result);
    }

    /**
     * 세션 리플레이 Rule 정보 추가
     *
     * @param vo {@link SessionReplayRuleVO}
     */
    @Operation(summary = "세션 리플레이 Rule 정보 추가",
            description = "세션 리플레이 Rule 정보를 추가합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "추가 후 Rule 목록을 반환합니다."))
    @Auditable(action = AuditType.INSERT, method = "세션 리플레이 Rule 정보 추가")
    @PostMapping(value = "/sm/0500/addSessionReplayRuleInfo.maxy")
    public ResponseEntity<?> addSessionReplayRuleInfo(HttpServletRequest request, SessionReplayRuleVO vo) {
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);

        if (user == null) {
            throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
        }
        vo.setRegInfo(request);

        appSettingsService.addSessionReplayRule(vo);

        List<SessionReplayRuleVO> list = appSettingsService.getSessionReplayRule(vo);
        return ResponseEntity.ok().body(list);
    }

    /**
     * 세션 리플레이 Rule 정보 삭제
     *
     * @param vo {@link SessionReplayRuleVO}
     */
    @Operation(summary = "세션 리플레이 Rule 정보 삭제",
            description = "세션 리플레이 Rule 정보를 삭제합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "삭제 후 Rule 목록을 반환합니다."))
    @Auditable(action = AuditType.DELETE, method = "세션 리플레이 Rule 정보 삭제")
    @PostMapping(value = "/sm/0500/deleteSessionReplayRuleInfo.maxy")
    public ResponseEntity<?> deleteSessionReplayRuleInfo(HttpServletRequest request, SessionReplayRuleVO vo) {
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);

        if (user == null) {
            throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
        }
        vo.setRegInfo(request);

        appSettingsService.deleteSessionReplayRule(vo);

        List<SessionReplayRuleVO> list = appSettingsService.getSessionReplayRule(vo);
        return ResponseEntity.ok().body(list);
    }

    /**
     * 세션 리플레이 Rule 정보 조회
     *
     * @param vo {@link SessionReplayRuleVO}
     */
    @Operation(summary = "세션 리플레이 Rule 정보 조회",
            description = "세션 리플레이 Rule 정보를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "Rule 목록을 반환합니다."))
    @Auditable(action = AuditType.READ, method = "세션 리플레이 Rule 정보 조회")
    @PostMapping(value = "/sm/0500/getSessionReplayRuleInfo.maxy")
    public ResponseEntity<?> getSessionReplayRuleInfo(HttpServletRequest request, SessionReplayRuleVO vo) {
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);

        if (user == null) {
            throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
        }

        List<SessionReplayRuleVO> list = appSettingsService.getSessionReplayRule(vo);
        return ResponseEntity.ok().body(list);
    }

    @Operation(summary = "사용자 검색",
            description = "조건에 맞는 사용자 목록을 검색합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "사용자 검색 결과를 반환합니다."))
    @PostMapping(value = "/sm/0500/getUserList.maxy")
    public ResponseEntity<List<UserAnalyticsSearchResponseDto>> getUserList(UserAnalyticsSearchRequestDto dto) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                dto.getPackageNm(), dto.getServerType(),
                dto.getSearchType(), dto.getSearchValue(),
                dto.getFrom(), dto.getTo());

        List<UserAnalyticsSearchResponseDto> result = userAnalyticsService.getOnlyUserList(dto);

        return ResponseEntity.ok().body(result);
    }
}
