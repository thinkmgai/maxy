package com.thinkm.maxy.controller.common;

import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import com.thinkm.common.util.ValidUtil;
import com.thinkm.maxy.service.common.LogLevelService;
import com.thinkm.maxy.vo.LogLevelVO;
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

import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;

/**
 * 로그 레벨 Controller
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Log Level Controller", description = "관리 > Log Description (Log Level) API 컨트롤러")
public class LogLevelController {

    @Resource
    private final LogLevelService logLevelService;

    /**
     * 관리 > 종합 > Log Description
     */
    @Operation(summary = "Log Description 페이지 이동",
            description = "Log Description (Log Level) 관리 화면으로 이동합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "Log Description JSP를 반환합니다."))
    @Auditable(action = AuditType.NAVIGATION, method = "Log Description")
    @GetMapping(value = "/gm/0305/goLogDescription.maxy")
    public ModelAndView goLogDescription() {
        return new ModelAndView("gm/GM0305");
    }

    @Operation(summary = "Log Description 목록 조회",
            description = "등록된 Log Level 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "Log Level 목록을 반환합니다."))
    @PostMapping(value = "/gm/0305/getLogDescription.maxy")
    public ResponseEntity<?> getLogDescription(LogLevelVO vo) {

        List<Map<String, Object>> result = logLevelService.getLogLevelList(vo);

        return ResponseEntity.ok().body(result);
    }

    /**
     * 로그 타입 등록
     *
     * @param request {@link HttpServletRequest}, vo {@link LogLevelVO}
     */
    @Operation(summary = "Log Description 등록",
            description = "지정한 패키지/서버의 Log Description을 등록합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "등록 후 Log Level 목록을 반환합니다."))
    @Auditable(action = AuditType.INSERT, method = "로그 타입 등록")
    @PostMapping(value = "/gm/0305/regLogType.maxy")
    public ResponseEntity<?> regLogType(HttpServletRequest request, @RequestBody LogLevelVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getPackageNm(), vo.getServerType());
        vo.setRegInfo(request);

        long logLevelId = logLevelService.getLogLevelIdByAppInfo(vo);
        vo.setLogLevelId(logLevelId);

        logLevelService.addLogLevelMemList(vo);

        List<Map<String, Object>> result = logLevelService.getLogLevelList(vo);

        return ResponseEntity.ok().body(result);
    }
}
