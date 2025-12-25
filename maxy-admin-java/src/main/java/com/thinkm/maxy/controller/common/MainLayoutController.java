package com.thinkm.maxy.controller.common;

import com.thinkm.MaxyVersion;
import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.config.ElasticConfig;
import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import com.thinkm.common.exception.AuthException;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.util.RSAUtil;
import com.thinkm.common.util.ValidUtil;
import com.thinkm.maxy.service.app.DeviceService;
import com.thinkm.maxy.service.app.ObfuscationService;
import com.thinkm.maxy.service.app.PageService;
import com.thinkm.maxy.service.common.CommonService;
import com.thinkm.maxy.service.common.AppSettingsService;
import com.thinkm.maxy.service.common.SystemLogService;
import com.thinkm.maxy.service.common.UserService;
import com.thinkm.maxy.vo.MaxyUser;
import com.thinkm.maxy.vo.UserVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.Nullable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.ModelAndView;

import javax.annotation.PostConstruct;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.security.PrivateKey;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

/**
 * 메인화면 컨트롤러
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping(value = "/")
@Tag(name = "Main Layout Controller", description = "메인화면 API 컨트롤러")
public class MainLayoutController {

    private final UserService userService;
    private final DeviceService deviceService;
    private final ObfuscationService obfuscationService;
    private final PageService pageService;
    private final SystemLogService systemLogService;
    private final AppSettingsService appSettingsService;
    private final Environment environment;

    private final RSAUtil rsaUtil = new RSAUtil();

    @Value("${maxy.mode:maxy}")
    private String maxyMode;
    @Value("${network.websocket.ssl:false}")
    private boolean websocketSsl;
    @Value("${network.websocket.url}")
    private String websocketHost;

    @Value("${spring.redis.host}")
    private String redisHost;

    @Value("${maxy.health-check:false}")
    private Boolean healthCheck;

    @Value("${maxy.integration-dashboard:false}")
    private boolean integrationDashboard;

    @Value("${maxy.optional-search-fields:}")
    private String optionalSearchFields;
    private String optionalSearchFieldJson;

    // websocket 에서 사용할 로컬 포트
    private String port;
    // websocket URL
    private String socketUrl;
    // sse URL
    private String sseUrl;

    @PostConstruct
    private void init() {
        log.info("[MAXY VERSION]: v{}", MaxyVersion.VERSION.getVersion());
        this.port = environment.getProperty("local.server.port");

        // ssl 적용되어 있으면 ws -> wss, http -> https
        String ssl = this.websocketSsl ? "s" : "";

        this.socketUrl = "ws" + ssl + "://" + this.websocketHost + "/ws";
        this.sseUrl = "http" + ssl + "://" + this.websocketHost + "/subscribe";

        log.info("websocket url: {}", this.socketUrl);
        log.info("sse url: {}", this.sseUrl);
        log.info("redis host: {}", this.redisHost);
        log.info("opensearch host: {}", ElasticConfig.getHosts());

        try {
            optionalSearchFieldJson = CommonService.convertSearchFields(optionalSearchFields);
        } catch (Exception e) {
            optionalSearchFieldJson = "";
        }

        if (healthCheck) {
            // Infra Service 정상적으로 올라와 있는지 체크
            systemLogService.check();
        }

        // Device Model 목록 조회하여 메모리에 적재
        deviceService.refreshModelList();
        // Page URL Alias 목록 조회하여 메모리에 적재
        pageService.refreshPageAliasMapper();
        // 난독화 Rule 목록 조회하여 메모리에 적재
        obfuscationService.refreshRuleList();
        // 앱 정보 초기화
        appSettingsService.update();
    }

    /**
     * 메인화면 이동
     *
     * @return /ml/ML0100.jsp
     */
    @Operation(summary = "메인 화면 이동",
            description = "메인 레이아웃 화면을 초기화하고 필요한 세션 정보를 설정합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "ML0100 JSP를 반환합니다."))
    @RequestMapping(value = "/main.maxy")
    public ModelAndView goMain(HttpServletRequest request) {
        ModelAndView mv = new ModelAndView("/ml/ML0100");

        // admin server port
        request.getSession().setAttribute("port", this.port);

        // websocket 에서 사용할 Origin
        request.getSession().setAttribute("websocket", this.socketUrl);
        // sse 에서 사용할 Origin
        request.getSession().setAttribute("sse", this.sseUrl);

        request.getSession().setAttribute("integrationDashboard", integrationDashboard);

        request.getSession().setAttribute("optionalSearchFields", optionalSearchFieldJson);

        request.getSession().setAttribute("maxyMode", maxyMode);

        return mv;
    }

    /**
     * 비밀번호 암호화를 위한 RSA Key 초기화
     *
     * @param request {@link HttpServletRequest}
     * @return {RSAPub: {RSAModulus, RSAExponent}}
     */
    @Operation(summary = "RSA 키 초기화",
            description = "로그인 등 민감 정보 암호화를 위한 RSA 공개키를 발급합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "RSA 공개키 모듈러스/지수를 반환합니다."))
    @PostMapping(value = "/cmm/initRSAKey.maxy")
    public ResponseEntity<?> initRSAKey(HttpServletRequest request) {
        long s1 = System.currentTimeMillis();
        rsaUtil.initRsa(request);
        Map<String, Object> RSAPub = new HashMap<>();
        RSAPub.put("RSAModulus", request.getAttribute("RSAModulus"));
        RSAPub.put("RSAExponent", request.getAttribute("RSAExponent"));
        log.debug("rsa duration: {}ms", System.currentTimeMillis() - s1);
        return ResponseEntity.ok(Collections.singletonMap("RSAPub", RSAPub));
    }

    /**
     * 사용한 RSA 키 삭제
     *
     * @param request {@link HttpServletRequest}
     * @return void
     */
    @Operation(summary = "RSA 키 삭제",
            description = "사용 완료한 RSA 키를 세션에서 제거합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "삭제 성공 여부를 반환합니다."))
    @PostMapping(value = "/cmm/removeRSAKey.maxy")
    public ResponseEntity<?> removeRSAKey(HttpServletRequest request) {
        request.removeAttribute("RSAModulus");
        request.removeAttribute("RSAExponent");
        request.getSession().removeAttribute(rsaUtil.getRsaWebKey());

        return ResponseEntity.ok().build();
    }

    /**
     * 메인 화면의 로그인 유저 정보 수정.
     * <p>
     * 비밀번호와 같은 민감정보는 VO 에 담지 않음
     *
     * @param request   {@link HttpServletRequest}
     * @param response  {@link HttpServletResponse}
     * @param email     이메일
     * @param userPw    기존 비밀번호
     * @param userNewPw 새 비밀번호
     * @return userInfo
     */
    @Operation(summary = "로그인 사용자 정보 수정",
            description = "로그인 사용자의 이메일 및 비밀번호를 수정합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "갱신된 사용자 정보를 반환합니다."))
    @Auditable(action = AuditType.UPDATE, method = "로그인 사용자 정보 수정")
    @PostMapping(value = "/um/modifyUserInfo.maxy")
    public ResponseEntity<?> modifyUserInfo(
            HttpServletRequest request,
            HttpServletResponse response,
            @RequestParam("email") String email,
            @RequestParam("userPw") @Nullable String userPw,
            @RequestParam("userNewPw") @Nullable String userNewPw
    ) throws Exception {
        // userNo를 세션에서 가져오기
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null) {
            throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
        }
        Long userNo = user.getUserNo();
        if (userNo == null || userNo < 0) {
            throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
        }

        // email 은 필수 정보
        if (StringUtils.isEmpty(email)) {
            throw new BadRequestException(ReturnCode.ERR_EMPTY_PARAMS);
        }

        if (!ValidUtil.isValidEmail(email)) {
            throw new BadRequestException(ReturnCode.ERR_TYPE_EMAIL);
        }

        // 비밀번호 변경 시 PrivateKey 사용
        PrivateKey pk = null;
        // userPw, userNewPw 둘 다 비어 있을 경우는 패스워드 변경하지 않음
        if (!StringUtils.isAllEmpty(userPw, userNewPw)) {
            // userPw, userNewPw 둘 다 들어왔는지 확인
            if (StringUtils.isEmpty(userPw) || StringUtils.isEmpty(userNewPw)) {
                throw new BadRequestException(ReturnCode.ERR_EMPTY_PW);
            }
            // PrivateKey 에 값 넣기
            pk = (PrivateKey) request.getSession().getAttribute(rsaUtil.getRsaWebKey());
        }

        // Param 생성
        UserVO userParam = UserVO.builder()
                .userNo(userNo)
                .emailAddr(email)
                .updNo(userNo)
                .userPw(userPw)         // nullable
                .userNewPw(userNewPw)   // nullable
                .build();

        // modify service 실행
        MaxyUser result = userService.modifyUserInfo(userParam, pk);

        log.debug("update success userNo: {}", result.getUserNo());

        // 정상 변경 되었을 경우 세션에 저장
        userService.setSessionLoginInfo(request, response, result);
        // 성공했을 때 RSA Public Key 삭제
        request.getSession().removeAttribute(rsaUtil.getRsaWebKey());

        // 바뀐 정보로 input 채우도록 정보 return
        return ResponseEntity.ok(Collections.singletonMap("userInfo", result));
    }
}
