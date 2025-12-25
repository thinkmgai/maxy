package com.thinkm.maxy.controller.common;

import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.code.MaxyLogType;
import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.config.audit.AuditLog;
import com.thinkm.common.config.audit.AuditLogService;
import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.exception.ConflictException;
import com.thinkm.common.exception.ForbiddenException;
import com.thinkm.common.util.JsonUtil;
import com.thinkm.common.util.ValidUtil;
import com.thinkm.maxy.dto.audit.AuditLogRequestDto;
import com.thinkm.maxy.service.app.*;
import com.thinkm.maxy.service.common.MenuService;
import com.thinkm.maxy.service.common.SystemLogService;
import com.thinkm.maxy.service.common.UserService;
import com.thinkm.maxy.vo.ExceptLogVO;
import com.thinkm.maxy.vo.MaxyUser;
import com.thinkm.maxy.vo.MenuVO;
import com.thinkm.maxy.vo.SystemLogVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;

import javax.annotation.PostConstruct;
import javax.servlet.http.HttpServletRequest;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 관리자 메뉴 컨트롤러
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Admin Controller", description = "관리자 메뉴 API 컨트롤러")
public class AdminController {
    private static final ArrayList<String> consumers = new ArrayList<>();

    private final MenuService menuService;
    private final UserService userService;
    private final ExceptLogService exceptLogService;
    private final SystemLogService systemLogService;
    private final AuditLogService auditLogService;
    private final LogAnalysisService logAnalysisService;

    @PostConstruct
    private void init() {
        consumers.add("DeviceAccessHistoryWorker");
        consumers.add("AlarmSendWorker");
        consumers.add("AlimMakeWorker");
        consumers.add("DBLoaderWorker");
        consumers.add("DBLockResolverWorker");
        consumers.add("DevicePageFlowWorker");
        consumers.add("DeviceUsingTimeWorker");
        consumers.add("ErrorLoaderWorker");
        consumers.add("ESLoaderWorker");
        consumers.add("LogmeterWorker");
        consumers.add("StackTraceLoaderWorker");
    }

    /**
     * 메뉴 권한 설정 화면 이동
     *
     * @return sm/SM0100
     */
    @Operation(summary = "메뉴 권한 설정 화면 이동",
            description = "메뉴 권한 설정 화면 이동",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "sm/SM0100.jsp"
            )
    })
    @Auditable(action = AuditType.NAVIGATION, method = "메뉴 권한 설정")
    @GetMapping(value = "/sm/0300/goSetMenuAuthView.maxy")
    public ModelAndView goSetMenuAuthView() {
        return new ModelAndView("sm/SM0100");
    }

    /**
     * 예외 처리 로그 조회 화면 이동
     *
     * @return sm/SM0800
     */
    @Operation(summary = "예외 처리 로그 조회 화면 이동",
            description = "예외 처리 로그 조회 화면 이동",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "sm/SM0800.jsp"
            )
    })
    @Auditable(action = AuditType.NAVIGATION, method = "예외 처리 로그 설정")
    @GetMapping(value = "/sm/0800/goExceptErrorLogView.maxy")
    public ModelAndView goExceptErrorLogView() {
        return new ModelAndView("sm/SM0800");
    }

    /**
     * 시스템 로그 관리 화면 이동
     *
     * @return sm/sm0900
     */
    @Operation(summary = "시스템 로그 관리 화면 이동",
            description = "시스템 로그 관리 화면 이동",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "sm/sm0900.jsp"
            )
    })
    @Auditable(action = AuditType.NAVIGATION, method = "시스템 로그 관리")
    @GetMapping(value = "/sm/0800/goSystemLogView.maxy")
    public ModelAndView goSystemManagementView() {
        ModelAndView mv = new ModelAndView("sm/SM0900");

        mv.addObject("consumers", consumers);
        return mv;
    }

    /**
     * 감사 로그 조회 화면 이동
     *
     * @return sm/sm1000
     */
    @Operation(summary = "감사 로그 화면 이동",
            description = "감사 로그 목록 화면으로 이동합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "SM0200 JSP를 반환합니다."))
    @Auditable(action = AuditType.NAVIGATION, method = "Access 로그")
    @GetMapping(value = "/sm/0200/goAuditLogView.maxy")
    public ModelAndView goAuditLogView() {
        ModelAndView mv = new ModelAndView("sm/SM0200");

        mv.addObject("actions", JsonUtil.toJson(AuditType.values()));
        return mv;
    }

    /**
     * 감사 로그 목록 조회
     *
     */
    @Operation(summary = "감사 로그 목록 조회",
            description = "조건에 맞는 감사 로그 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "감사 로그 목록을 반환합니다."))
    @Auditable(action = AuditType.READ, method = "Access 로그 목록 조회")
    @PostMapping(value = "/sm/0200/getAuditLogList.maxy")
    public ResponseEntity<?> getAuditLogList(AuditLogRequestDto dto) {
        List<AuditLog> list = auditLogService.getAuditLogList(dto);
        return ResponseEntity.ok().body(list);
    }

    /**
     * 메뉴 권한 목록 조회
     *
     * @return menuList
     */
    @Operation(summary = "메뉴 권한 목록 조회",
            description = "메뉴 권한 목록을 반환합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "모든 메뉴 권한 목록을 반환합니다.",
                    content = @Content(mediaType = "application/json",
                            array = @ArraySchema(schema = @Schema(implementation = MenuVO.class)))
            )
    })
    @Auditable(action = AuditType.READ, method = "메뉴 권한 목록 조회")
    @PostMapping(value = "/sm/0300/getMenuAuthList.maxy")
    public ResponseEntity<?> getMenuAuthList() {
        Map<String, Object> resultMap = new HashMap<>();

        List<MenuVO> menuList = menuService.getAllMenuList();

        resultMap.put("menuList", menuList);

        return ResponseEntity.ok().body(resultMap);
    }

    /**
     * 메뉴 설정
     *
     * @return menuList
     */
    @Operation(summary = "메뉴 권한 설정",
            description = "메뉴 권한을 설정합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "변경된 메뉴 권한 목록을 반환합니다.",
                    content = @Content(mediaType = "application/json",
                            array = @ArraySchema(schema = @Schema(implementation = MenuVO.class)))
            )
    })
    @Auditable(action = AuditType.UPDATE, method = "메뉴 권한 설정")
    @PostMapping(value = "/sm/0300/modifyMenuAuthList.maxy")
    public ResponseEntity<?> modifyMenuAuthList(@Parameter(hidden = true) HttpServletRequest request, MenuVO vo) {
        Map<String, Object> resultMap = new HashMap<>();

        menuService.updateMenuList(request, vo);

        // update 된 권한 갱신
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        userService.refreshMenuRole(user);

        List<MenuVO> menuList = menuService.getAllMenuList();

        resultMap.put("menuList", menuList);

        return ResponseEntity.ok().body(resultMap);
    }

    /**
     * 예외처리 에러 문자열 목록 조회
     *
     * @param vo appInfo
     * @return list
     */
    @Operation(summary = "예외처리 에러 문자열 목록 조회",
            description = "예외처리 에러 문자열 목록 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "예외처리 에러 문자열 목록을 반환합니다.",
                    content = @Content(mediaType = "application/json",
                            array = @ArraySchema(schema = @Schema(implementation = ExceptLogVO.class)))
            )
    })
    @Auditable(action = AuditType.READ, method = "예외처리 로그 목록 조회")
    @PostMapping(value = "/sm/0800/getExceptLogList.maxy")
    public ResponseEntity<?> getExceptLogList(ExceptLogVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType());
        List<ExceptLogVO> list = exceptLogService.getExceptLogList(vo);

        return ResponseEntity.ok().body(list);
    }

    /**
     * 예외처리 문자열 삭제
     *
     * @param vo seq, appInfo
     * @return list
     */
    @Operation(summary = "예외처리 에러 문자열 삭제",
            description = "예외처리 에러 문자열 삭제",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "예외처리 에러 문자열 목록을 반환합니다.",
                    content = @Content(mediaType = "application/json",
                            array = @ArraySchema(schema = @Schema(implementation = ExceptLogVO.class)))
            )
    })
    @Auditable(action = AuditType.DELETE, method = "예외처리 로그 삭제")
    @PostMapping(value = "/sm/0800/deleteExceptLog.maxy")
    public ResponseEntity<?> deleteExceptLog(ExceptLogVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(), vo.getSeq());

        exceptLogService.deleteExceptLog(vo);

        // 변경된 목록 조회
        List<ExceptLogVO> list = exceptLogService.getExceptLogList(vo);

        return ResponseEntity.ok().body(list);
    }

    /**
     * 특정 Error 예외처리 문자열 추가
     *
     * @param vo packageNm, serverType, logType, exceptLog
     * @return 200, 400, 403
     */
    @Operation(summary = "예외처리 에러 문자열 추가",
            description = "예외처리 에러 문자열 추가",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "예외처리 에러 문자열 목록을 반환합니다.",
                    content = @Content(mediaType = "application/json",
                            array = @ArraySchema(schema = @Schema(implementation = ExceptLogVO.class)))
            )
    })
    @Auditable(action = AuditType.INSERT, method = "예외처리 로그 추가")
    @PostMapping(value = "/sm/0000/addExceptLog.maxy")
    public ResponseEntity<?> addExceptLog(@Parameter(hidden = true) HttpServletRequest request, ExceptLogVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_WRONG_PARAMS, vo.getPackageNm(), vo.getServerType(), vo.getLogType(), vo.getExceptString());

        // SuperAdmin 만 추가 가능
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null || !user.isSuperAdmin()) {
            throw new ForbiddenException(ReturnCode.ERR_NO_GRANTS);
        }

        // Error Log 만 등록 가능
        if (!MaxyLogType.isErrorLog(vo.getLogType())) {
            throw new BadRequestException(ReturnCode.ERR_INVALID_LOG_TYPE);
        }

        // 최대 20개까지만 등록 가능
        if (exceptLogService.countExceptLog(vo) >= 20) {
            throw new ConflictException(ReturnCode.ERR_OVER_COUNT);
        }

        // 중복 체크
        if (exceptLogService.existsExceptLog(vo)) {
            throw new ConflictException(ReturnCode.ERR_DUPL_VALUE);
        }

        vo.setRegInfo(request);

        // 등록
        exceptLogService.addExceptLog(vo);
        return ResponseEntity.ok().build();
    }

    /**
     * 예외처리 문자열 수정
     *
     * @param vo packageNm, serverType, exceptLog, seq
     * @return 200, 400, 403
     */
    @Operation(summary = "예외처리 에러 문자열 수정",
            description = "예외처리 에러 문자열 수정",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "예외처리 에러 문자열 목록을 반환합니다.",
                    content = @Content(mediaType = "application/json",
                            array = @ArraySchema(schema = @Schema(implementation = ExceptLogVO.class)))
            )
    })
    @Auditable(action = AuditType.UPDATE, method = "예외처리 로그 수정")
    @PostMapping(value = "/sm/0000/modifyExceptLog.maxy")
    public ResponseEntity<?> modifyExceptLog(@Parameter(hidden = true) HttpServletRequest request, ExceptLogVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_WRONG_PARAMS, vo.getPackageNm(), vo.getServerType(), vo.getSeq(), vo.getExceptString());

        // SuperAdmin 만 추가 가능
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null || !user.isSuperAdmin()) {
            throw new ForbiddenException(ReturnCode.ERR_NO_GRANTS);
        }

        // 동일한 예외처리 log가 있는지 확인
        if (exceptLogService.existsExceptLog(vo)) {
            throw new ConflictException(ReturnCode.ERR_DUPL_VALUE);
        }

        vo.setRegInfo(request);

        // 등록
        exceptLogService.modifyExceptLog(vo);

        // 변경된 목록 조회
        List<ExceptLogVO> list = exceptLogService.getExceptLogList(vo);

        return ResponseEntity.ok().body(list);
    }

    /**
     * 시스템 로그 조회
     */
    @Operation(summary = "시스템 로그 조회",
            description = "Consumer 코드를 로깅했을때, 그 결과 로그 조회",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "시스템 로그 목록을 반환합니다.",
                    content = @Content(mediaType = "application/json",
                            array = @ArraySchema(schema = @Schema(implementation = ExceptLogVO.class)))
            )
    })
    @Auditable(action = AuditType.READ, method = "시스템 로그 조회")
    @PostMapping(value = "/sm/0800/getSystemLogList.maxy")
    public ResponseEntity<?> getSystemLogList(@Parameter(hidden = true) HttpServletRequest request, @RequestBody SystemLogVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getConsumerName(), vo.getThreadNum(), vo.getFrom(), vo.getTo());

        if (vo.getThreadNum() < 0) {
            throw new BadRequestException("thread num must be greater than zero");
        }

        // SuperAdmin 만 추가 가능
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null || !user.isSuperAdmin()) {
            throw new ForbiddenException(ReturnCode.ERR_NO_GRANTS);
        }

        // 변경된 목록 조회
        List<SystemLogVO> list = systemLogService.getSystemLogList(vo);

        List<SystemLogVO.SystemLog> result = new ArrayList<>();
        for (SystemLogVO v : list) {
            result.add(SystemLogVO.SystemLog.builder()
                    .msg(v.getMsg())
                    .param(v.getParam())
                    .type(v.getType())
                    .regDt(v.getRegDt().toInstant(ZoneOffset.ofHours(9)).toEpochMilli())
                    .build());
        }

        return ResponseEntity.ok().body(result);
    }

    /**
     * 시스템 접속 상황 조회
     */
    @Operation(summary = "시스템 접속 상황 조회",
            description = "노드별 소비자 프로그램의 접속 상태를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "시스템 접속 상태를 반환합니다."))
    @Auditable(action = AuditType.READ, method = "시스템 접속 상황 조회")
    @PostMapping(value = "/sm/0800/getSystemHealth.maxy")
    public ResponseEntity<?> getSystemHealth(HttpServletRequest request, @RequestBody SystemLogVO.SystemHealth vo) {
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null || !user.isSuperAdmin()) {
            throw new ForbiddenException(ReturnCode.ERR_NO_GRANTS);
        }

        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getProgramName(), vo.getNodeNumber(), vo.getLogType());

        return ResponseEntity.ok().body(systemLogService.getSystemHealth(vo.getProgramName(), vo.getNodeNumber(), vo.getLogType()));
    }

    /**
     * 시스템 Status 조회
     */
    @Operation(summary = "시스템 Status 조회",
            description = "시스템 헬스체크 결과를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "각 서비스의 상태 정보를 반환합니다."))
    @Auditable(action = AuditType.READ, method = "시스템 Status 조회")
    @PostMapping(value = "/sm/0800/getSystemStatus.maxy")
    public ResponseEntity<?> getSystemStatus() {
        Map<String, Boolean> status = systemLogService.check();

        return ResponseEntity.ok().body(status);
    }


    /**
     * 로그 데이터 조회
     */
    @Operation(summary = "로그 데이터 조회",
            description = "Elastic 인덱스별 로그 데이터를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "로그 데이터를 반환합니다."))
    @Auditable(action = AuditType.READ, method = "로그 데이터 조회")
    @PostMapping(value = "/sm/0000/log/{type}.maxy")
    public ResponseEntity<?> getLogData(@PathVariable("type") ElasticIndex type,
                                        @RequestParam String packageNm,
                                        @RequestParam String serverType) {
        List<Map<String, Object>> list = logAnalysisService.getLogList(type, packageNm, serverType);

        return ResponseEntity.ok().body(list);
    }
}
