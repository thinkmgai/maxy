package com.thinkm.maxy.controller.front;

import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.ModelAndView;

/**
 * 대시보드 컨트롤러 (AJAX)
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Front Dashboard Config", description = "대시보드 화면 이동 API")
public class FrontDashboardConfigController {

    /**
     * Basic Information 페이지 이동
     *
     * @return 관리 > 종합 > Basic Information
     */
    @Auditable(action = AuditType.NAVIGATION, method = "Basic Information 관리")
    @Operation(summary = "Basic Information 화면 이동", description = "front/management/basicInfo 뷰로 이동합니다.")
    @ApiResponse(responseCode = "200", description = "뷰 렌더링 성공", content = @Content(mediaType = "text/html"))
    @RequestMapping(value = "/fm/0301/view.maxy")
    public ModelAndView goDashboardBasicConfigView() {
        return new ModelAndView("front/management/basicInfo");
    }

    /**
     * Components 페이지 이동
     *
     * @return 관리 > 종합 > Components
     */
    @Auditable(action = AuditType.NAVIGATION, method = "Components 관리")
    @Operation(summary = "Components 화면 이동", description = "front/management/components 뷰로 이동합니다.")
    @ApiResponse(responseCode = "200", description = "뷰 렌더링 성공", content = @Content(mediaType = "text/html"))
    @RequestMapping(value = "/fm/0302/view.maxy")
    public ModelAndView goDashboardChartConfigView() {
        return new ModelAndView("front/management/components");
    }
}
