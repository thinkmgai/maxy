package com.thinkm.maxy.controller.common;

import com.thinkm.common.code.CommonCode;
import com.thinkm.common.code.MaxyLogType;
import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.code.ServerTypeCode;
import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import com.thinkm.common.exception.AuthException;
import com.thinkm.common.exception.NoMailInfoException;
import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.RSAUtil;
import com.thinkm.common.util.ValidUtil;
import com.thinkm.maxy.dto.otp.OtpResponseDto;
import com.thinkm.maxy.repository.ModelRepository;
import com.thinkm.maxy.repository.PageRepository;
import com.thinkm.maxy.service.app.LogAnalysisService;
import com.thinkm.maxy.service.common.MailService;
import com.thinkm.maxy.service.common.OtpService;
import com.thinkm.maxy.service.common.UserService;
import com.thinkm.maxy.vo.MaxyUser;
import com.thinkm.maxy.vo.UserVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;

import javax.annotation.Nullable;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping(value = "/ln")
@Tag(name = "User Controller", description = "로그인 관리 API 컨트롤러")
public class UserController {

    private final UserService userService;
    private final LogAnalysisService logAnalysisService;
    private final MailService mailService;
    private final PageRepository pageRepository;
    private final ModelRepository modelRepository;
    private final OtpService otpService;

    private final RSAUtil rsaUtil = new RSAUtil();

    @Value("${maxy.mode:maxy}")
    private String maxyMode;

    /**
     * Login 페이지 진입
     *
     * @return LN0100
     */
    @Operation(summary = "로그인 페이지 이동",
            description = "로그인 화면으로 이동하며 기존 세션과 쿠키를 정리합니다.")
    @ApiResponses(@ApiResponse(responseCode = "200", description = "로그인 JSP를 반환합니다."))
    @Auditable(action = AuditType.NAVIGATION, method = "로그인 페이지")
    @RequestMapping(value = "/goLoginPage.maxy")
    public ModelAndView goLoginPage(HttpServletRequest request, HttpServletResponse response, @Nullable @RequestParam String denied) {
        ModelAndView mv = new ModelAndView("/ln/LN0100");

        // 로그인 유저 정보 삭제
        request.getSession().setAttribute(CommonCode.loginUserKey(), null);

        // 쿠키 비우기
        Cookie cookie = new Cookie(CommonCode.COOKIE_NAME.getValue(), "");
        cookie.setMaxAge(0);
        cookie.setPath(request.getContextPath() + "/");
        response.addCookie(cookie);

        // Make Copyright
        mv.addObject("copyright", CommonUtil.getCopyright());

        if (denied != null) {
            mv.addObject("denied", denied);
        }

        mv.addObject("maxyMode", maxyMode);

        return mv;
    }

    /**
     * Login 처리
     *
     * @param userId 아이디
     * @param userPw 비밀번호
     * @return ModelAndView
     */
    @Operation(summary = "로그인 처리",
            description = "사용자 ID/PW로 로그인합니다.")
    @ApiResponses(@ApiResponse(responseCode = "200", description = "로그인 성공 시 빈 응답을 반환합니다."))
    @Auditable(action = AuditType.LOGIN)
    @PostMapping(value = "/doLogin.maxy")
    public ResponseEntity<?> doLogin(
            HttpServletRequest request,
            HttpServletResponse response,
            @RequestParam("userId") String userId,
            @RequestParam("userPw") String userPw
    ) throws Exception {
        long s1 = System.currentTimeMillis();
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_ID_PW, userId, userPw);

        // 로그인 로직 실행
        userService.doLogin(request, response, userId, userPw);
        log.debug("login: {}ms", System.currentTimeMillis() - s1);
        return ResponseEntity.ok().build();
    }

    /**
     * OTP 등록 URL 요청
     */
    @Operation(summary = "OTP 등록 URL 요청",
            description = "OTP 등록을 위한 URL을 반환합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "OTP 등록 URL을 반환합니다."))
    @Auditable(action = AuditType.READ, method = "OTP 등록 URL 요청")
    @PostMapping(value = "/otp/register-url.maxy")
    public ResponseEntity<?> getOtpRegisterUrl(HttpServletRequest request) {
        HttpSession session = request.getSession();
        String url = otpService.getOtpRegisterUrl(session);
        return ResponseEntity.ok().body(Map.of("url", url));
    }

    /**
     * OTP 등록 확인
     */
    @Operation(summary = "OTP 등록",
            description = "OTP를 등록하고 비밀키 정보를 저장합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "OTP 등록 결과를 반환합니다.",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = OtpResponseDto.class))))
    @Auditable(action = AuditType.INSERT, method = "OTP 등록 확인")
    @PostMapping(value = "/otp/register.maxy")
    public ResponseEntity<?> saveOtpInfo(HttpServletRequest request) throws Exception {
        HttpSession session = request.getSession();
        otpService.saveOtpSecret(session);
        OtpResponseDto dto = otpService.setOtpStatus(session);
        return ResponseEntity.ok().body(dto);
    }

    /**
     * OTP Code 검증
     */
    @Operation(summary = "OTP 검증",
            description = "로그인 과정에서 OTP 코드를 검증합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "검증 성공 시 로그인 절차를 완성합니다."))
    @Auditable(action = AuditType.ACCESS, method = "OTP 검증")
    @PostMapping(value = "/otp/verify.maxy")
    public ResponseEntity<?> verifyOtpCode(HttpServletRequest request,
                                           HttpServletResponse response,
                                           @RequestParam("otpCode") Integer otpCode) throws Exception {
        HttpSession session = request.getSession();
        UserVO user = otpService.verifyOtpCode(session, otpCode);
        userService.completeLogin(request, response, user);
        return ResponseEntity.ok().build();
    }

    /**
     * 로그아웃 처리
     *
     * @param request  {@link HttpServletRequest}
     * @param response {@link HttpServletResponse}
     * @return ModelAndView
     */
    @Operation(summary = "로그아웃",
            description = "세션과 쿠키를 삭제하고 로그아웃합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "로그인 페이지로 이동합니다."))
    @Auditable(action = AuditType.LOGOUT)
    @GetMapping(value = "/doLogout.maxy")
    public ModelAndView doLogout(
            HttpServletRequest request,
            HttpServletResponse response,
            @Nullable @RequestParam String denied
    ) {
        ModelAndView mv = new ModelAndView("/common/goLoginPage");

        // 기존 세션 정보 제거
        request.getSession().invalidate();

        // 쿠키 삭제
        Cookie cookie = new Cookie(CommonCode.COOKIE_NAME.getValue(), "");
        cookie.setMaxAge(0);
        cookie.setPath(request.getContextPath() + "/");
        response.addCookie(cookie);

        if (denied != null) {
            mv.addObject("denied", denied);
        }

        return mv;
    }

    /**
     * 메일 서비스 활성화 여부
     */
    @Operation(summary = "메일 서비스 사용 가능 여부",
            description = "메일 서비스 설정 여부를 확인합니다.")
    @ApiResponses(@ApiResponse(responseCode = "200", description = "메일 서비스가 활성화되어 있으면 200을 반환합니다."))
    @PostMapping(value = "/checkMailService.maxy")
    public ResponseEntity<?> checkMailService() {
        if (mailService.checkMailDisabled()) {
            throw new NoMailInfoException();
        }
        return ResponseEntity.ok().build();
    }

    /**
     * 비밀번호 초기화
     *
     * @param userId userId
     * @param email  Email
     * @return json
     */
    @Operation(summary = "비밀번호 초기화",
            description = "사용자 비밀번호를 초기화하고 임시 비밀번호를 메일로 전송합니다.")
    @ApiResponses(@ApiResponse(responseCode = "200", description = "비밀번호 초기화 결과를 반환합니다."))
    @Auditable(action = AuditType.RESET_PW)
    @PostMapping(value = "/resetPw.maxy")
    public ResponseEntity<?> resetPw(
            @RequestParam("userId") String userId,
            @RequestParam("email") String email) throws Exception {
        // 값 검증
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_ID_PW, userId, email);

        // VO 생성
        UserVO vo = UserVO.builder()
                .userId(userId)
                .emailAddr(email)
                .build();

        // 비밀번호 초기화 서비스 실행
        UserVO userInfo = userService.resetPw(vo);
        if (StringUtils.isNotEmpty(userInfo.getUserNewPw())) {
            // 임시 비밀번호 이메일 발송
            boolean sendResult = userService.sendPwResetMail(userInfo);
            if (sendResult) {
                log.debug("Success to Send Email: {}", email);
            } else {
                log.error("Fail to Send Email: {}", email);
                throw new Exception("Fail to Send Email: " + email);
            }
        } else {
            throw new Exception("No user new pw: " + vo.getUserId());
        }
        return ResponseEntity.ok().build();
    }

    /**
     * 비밀번호 재설정
     *
     * @param userPw    기존 비밀번호
     * @param userNewPw 새 비밀번호
     * @return 200
     */
    @Operation(summary = "비밀번호 재설정",
            description = "로그인 시 비밀번호 만료됐을 때, 사용자 비밀번호를 재설정합니다.")
    @ApiResponses(@ApiResponse(responseCode = "200", description = "성공 상태 코드를 반환합니다."))
    @Auditable(action = AuditType.RENEW_PW)
    @PostMapping(value = "/renewPw.maxy")
    public ResponseEntity<?> renewPw(
            HttpServletRequest request,
            @RequestParam("userPw") @org.springframework.lang.Nullable String userPw,
            @RequestParam("userNewPw") @org.springframework.lang.Nullable String userNewPw) throws Exception {
        // 임시 로그인 된 상태에서 이 API를 호출할 수 있기에, session 값을 다음 서비스에 주입하기 위한 변수
        // 비밀번호 만료된 상태에서 넣어진 TMP_USER_NO 값을 사용하기 위함
        HttpSession session = request.getSession();

        // 비밀번호 재설정. 내부에서 TMP_ 임시 값들을 삭제한다.
        userService.renewPassword(session, userPw, userNewPw);

        // 성공했을 때 RSA Public Key 삭제
        session.removeAttribute(rsaUtil.getRsaWebKey());

        return ResponseEntity.ok().build();
    }

    /**
     * Session AppInfo 조회
     *
     * @param appType 앱 타입
     * @return appInfo
     */
    @Operation(summary = "세션 정보 조회",
            description = "로그인 사용자의 앱/패키지 정보를 최신화하여 반환합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "세션 기반 앱 정보를 반환합니다."))
    @RequestMapping(value = "/getSessionInfo.maxy")
    public ResponseEntity<?> getSessionInfo(HttpServletRequest request,
                                            @RequestParam(value = "appType", required = false) String appType) {
        Object session = request.getSession().getAttribute(CommonCode.loginUserKey());
        if (session == null) {
            throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
        }

        MaxyUser maxyUser = (MaxyUser) session;
        long s1 = System.currentTimeMillis();
        userService.refreshAppInfo(maxyUser, appType);
        log.debug("refreshAppInfo: {}ms", System.currentTimeMillis() - s1);

        Map<String, Object> result = Map.ofEntries(
                Map.entry("deviceModelList", modelRepository.getModelInfo()),
                Map.entry("logDictionary", MaxyLogType.toMap()),
                Map.entry("logTypeSet", logAnalysisService.getAllLogTypes()),
                Map.entry("alias", pageRepository.getPageAlias()),
                Map.entry("serverType", ServerTypeCode.getAll()),
                Map.entry("appInfoData", maxyUser.getAppInfo()),
                Map.entry("packageOrder", new ArrayList<>(maxyUser.getAppInfo().keySet()))
        );

        return ResponseEntity.ok(result);
    }

    /**
     * Session Alias 조회
     *
     * @return alias
     */
    @RequestMapping(value = "/getSessionAlias.maxy")
    public ResponseEntity<?> getSessionAlias(HttpServletRequest request,
                                             @RequestParam(value = "appType", required = false) String appType) {
        Map<String, Object> result = new HashMap<>();
        Object session = request.getSession().getAttribute(CommonCode.loginUserKey());
        if (session == null) {
            throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
        }

        MaxyUser maxyUser = (MaxyUser) session;
        userService.refreshAppInfo(maxyUser, appType);

        result.put("alias", pageRepository.getPageAlias());
        return ResponseEntity.ok(result);
    }
}
