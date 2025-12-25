package com.thinkm.maxy.controller.common;

import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import com.thinkm.common.util.sourcemap.StackMappingResult;
import com.thinkm.maxy.service.common.SourceMapService;
import com.thinkm.maxy.service.common.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.List;

@Slf4j
@RestController
@RequiredArgsConstructor
public class CommonController {

    private final UserService userService;
    private final SourceMapService sourceMapService;

    /**
     * Admin 패스워드 틀린 횟수 초기화
     */
    @Operation(summary = "Admin 패스워드 틀린 횟수 초기화",
            description = "Admin 패스워드 틀린 횟수 초과했을때 이 api를 호출합니다.")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "성공 메시지"
            )
    })
    @Auditable(action = AuditType.RESET_PW, method = "Admin 패스워드 틀린 횟수 초기화")
    @GetMapping(value = "/djemalschrlghk.maxy")
    @ResponseBody
    public String initAdminPassCnt() {

        try {
            userService.initAdminPassCnt();
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return e.getMessage();
        }

        return "done";
    }

    /**
     * Admin 패스워드 초기화
     */
    @Operation(summary = "Admin 패스워드 초기화",
            description = "Admin 패스워드를 잊어버렸을 경우 이 api를 호출하면 MAXY 관리자 초기 비밀번호로 초기화 됩니다.")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "성공 메시지"
            )
    })
    @Auditable(action = AuditType.RESET_PW, method = "Admin 패스워드 초기화")
    @GetMapping(value = "/djemalsqlqjsqusrud.maxy")
    @ResponseBody
    public String initAdminPass() {
        try {
            userService.initAdminPass();
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return e.getMessage();
        }

        return "done";
    }

    /**
     * Pulse 에서 사용할 health check 용도
     */
    @Operation(summary = "헬스 체크",
            description = "Pulse 등 외부 모니터링을 위한 Health Check API.")
    @ApiResponses(@ApiResponse(responseCode = "200", description = "서버가 정상인 경우 'ok' 문자열을 반환합니다."))
    @GetMapping(value = "/health.maxy")
    public String health() {
        return "ok";
    }

    @GetMapping("/test")
    public ResponseEntity<?> test(@RequestParam String value) throws IOException {
        if (value != null && value.equalsIgnoreCase("1")) {
            String text = """
                    Uncaught TypeError: Cannot read properties of undefined (reading 'callbackid") Cannot read properties undefined (reading 'callbackid') TypeError: Cannot read properties of undefined (reading 'callbackid")
                    Object.callBackResult (https://corp.co.kr:8080/spa/top-dir/dir3/page-b0aedb59bf76801a.js:1:8190)
                    at <anonymous>:1:16
                    """;
            List<StackMappingResult> result = sourceMapService.mapErrorStack(text);
            return ResponseEntity.ok().body(result);
        } else {
            String text = """
                    page-b0aedb59bf76801a.js:1 Uncaught (in promise) Error: Intentional login click error
                    at B (page-b0aedb59bf76801a.js:1:8190)
                    at sY (4bd1b696-053d5bec6121fa8c.js:1:151226)
                    at 4bd1b696-053d5bec6121fa8c.js:1:157114
                    at nU (4bd1b696-053d5bec6121fa8c.js:1:20179)
                    at s1 (4bd1b696-053d5bec6121fa8c.js:1:152459)
                    at fC (4bd1b696-053d5bec6121fa8c.js:1:188384)
                    at fx (4bd1b696-053d5bec6121fa8c.js:1:188206)
                    """;
            List<StackMappingResult> result = sourceMapService.mapErrorStack(text);
            return ResponseEntity.ok().body(result);
        }
    }
}
