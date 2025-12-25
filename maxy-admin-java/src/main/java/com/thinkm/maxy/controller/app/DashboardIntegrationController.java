package com.thinkm.maxy.controller.app;

import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import com.thinkm.common.exception.AuthException;
import com.thinkm.common.util.JsonUtil;
import com.thinkm.maxy.dto.app.dashboard.DashboardIntegrationRequestDto;
import com.thinkm.maxy.dto.app.dashboard.DashboardIntegrationResponseDto;
import com.thinkm.maxy.model.AppInfo;
import com.thinkm.maxy.service.app.DashboardIntegrationService;
import com.thinkm.maxy.vo.MaxyUser;
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

import javax.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.List;

/**
 * 통합 대시보드 컨트롤러
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Dashboard Integration Controller", description = "통합 대시보드 API 컨트롤러")
public class DashboardIntegrationController {
    private final DashboardIntegrationService dashboardIntegrationService;


    @Operation(summary = "통합 대시보드 페이지 이동",
            description = "사용자별 통합 대시보드 화면으로 이동합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "통합 대시보드 JSP를 반환합니다."))
    @Auditable(action = AuditType.NAVIGATION, method = "통합 대시보드")
    @RequestMapping(value = "/db/0100/goIntegrationDashboardView.maxy")
    public ModelAndView goIntegrationDashboardView(HttpServletRequest request) {
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null) {
            throw new AuthException();
        }
        long userNo = user.getUserNo();
        List<AppInfo> apps = dashboardIntegrationService.getAppList(userNo);
        request.setAttribute("apps", JsonUtil.toJson(apps));
        return new ModelAndView("db/DB0200");
    }

    @Operation(summary = "통합 대시보드 데이터 조회",
            description = "선택된 앱 목록을 기준으로 실시간 통합 대시보드 데이터를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "통합 대시보드 데이터 응답을 반환합니다."))
    @PostMapping(value = "/db/0100/getDashboardData.maxy")
    public ResponseEntity<DashboardIntegrationResponseDto> getInfo(HttpServletRequest request, @RequestBody DashboardIntegrationRequestDto dto) {
        log.info("getDashboardInfo: {}", dto);
        List<AppInfo> apps = new ArrayList<>();
        if (dto == null || dto.getApps() == null) {
            MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
            if (user == null) {
                throw new AuthException();
            }
            long userNo = user.getUserNo();
            apps.addAll(dashboardIntegrationService.getAppList(userNo));
        } else {
            apps.addAll(dto.getApps());
        }
        if (apps.isEmpty()) {
            return ResponseEntity.ok().body(new DashboardIntegrationResponseDto());
        }
        return ResponseEntity.ok().body(dashboardIntegrationService.getInfo(apps));
    }
}
