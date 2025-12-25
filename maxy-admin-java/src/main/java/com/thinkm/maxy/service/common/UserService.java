package com.thinkm.maxy.service.common;

import com.thinkm.common.code.CommonCode;
import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.exception.AuthException;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.exception.NeedOtpInfo;
import com.thinkm.common.util.*;
import com.thinkm.maxy.mapper.UserMapper;
import com.thinkm.maxy.service.common.helper.UserServiceHelper;
import com.thinkm.maxy.vo.MailVO;
import com.thinkm.maxy.vo.MaxyUser;
import com.thinkm.maxy.vo.UserAppVO;
import com.thinkm.maxy.vo.UserVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.security.PrivateKey;
import java.time.LocalDate;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {
    private final MailService mailService;
    private final UserMapper userMapper;
    private final SecurityUtil securityUtil;
    private final UserServiceHelper userServiceHelper;
    private final OtpService otpService;

    private final RSAUtil rsaUtil = new RSAUtil();

    @Value("${network.context-url}")
    private String contextUrl;
    @Value("${security.pass.expire-date:90}")
    private int passExpireDate;
    @Value("${security.session.cookie:true}")
    private boolean useCookie;
    @Value("${security.session.timeout:3600}")
    private int sessionTimeout;
    @Value("${security.otp.enabled:false}")
    private boolean useOtp;

    /**
     * 로그인 로직 수행
     *
     * @param userId id
     * @param userPw pw
     * @throws Exception AuthException
     */
    public void doLogin(HttpServletRequest request,
                        HttpServletResponse response,
                        String userId,
                        String userPw) throws Exception {
        try {
            // 비밀번호 RSA 복호화
            PrivateKey pk = (PrivateKey) request.getSession().getAttribute(rsaUtil.getRsaWebKey());
            String rawPw = rsaUtil.decryptRsa(pk, userPw);

            // 복호화한 값을 다시 SHA 암호화
            userPw = SecurityUtil.SHA256Encrypt(rawPw);

            // 파라미터에서 로그인 정보 가져와 VO 생성
            UserVO vo = UserVO.builder()
                    .userId(userId)
                    .userPw(userPw)
                    .build();

            // id 검증
            UserVO user = userMapper.selectUserInfoByUserId(vo);
            if (user == null) {
                throw new AuthException(ReturnCode.ERR_USER_NOT_EXIST);
            }

            // 삭제된 유저 검증
            if (CommonCode.YN_YES.equals(user.getDeleteYn())) {
                throw new AuthException(ReturnCode.ERR_USER_DELETED);
            }

            // 비밀번호 검증
            userServiceHelper.checkPassword(userPw, user, vo);

            // 유효한 사용자 그룹 확인
            userServiceHelper.checkUserGroup(user);

            // 비밀번호 만료 일자 확인
            userServiceHelper.checkExpired(user, request.getSession(true));

            // OTP 사용하는 고객사인 경우
            if (useOtp) {
                HttpSession session = request.getSession(true);
                otpService.processOtp(user, session);
                return;
            }

            // 로그인 성공 이후 처리 로직
            completeLogin(request, response, user);
        } catch (AuthException | NeedOtpInfo e) {
            throw e;
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            throw e;
        }
    }

    /**
     * 로그인 실제 완료되어 메뉴 권한이나 기타 정보들을 세션에 넣어주는 작업
     *
     */
    public void completeLogin(HttpServletRequest request,
                              HttpServletResponse response,
                              UserVO user) throws Exception {
        // 정상 로그인 되었을 경우 로그인 사용자의 메뉴 정보 및 session 에 넣을 객체 생성
        MaxyUser loginResult = userServiceHelper.loginRealDone(user);
        // 세션에 저장
        setSessionLoginInfo(request, response, loginResult);
        HttpSession session = request.getSession();
        // 성공했을 때 RSA Public Key 삭제
        session.removeAttribute(rsaUtil.getRsaWebKey());

        // 성공했을 때 OTP 관련 정보 삭제
        otpService.removeOtpInfo(session);
        // 성공했을 때 비밀번호 만료에 생성된 임시 유저 정보 삭제
        userServiceHelper.removeTmpUserSession(session);
    }

    /**
     * 메뉴 권한 갱신
     *
     */
    public void refreshMenuRole(MaxyUser user) {
        userServiceHelper.refreshMenuRoleToLoginUser(user);
    }

    /**
     * Session 에 로그인 사용자 정보 저장
     *
     * @param request   Session 을 가져와 넣기 위함
     * @param response  쿠키를 추가할 때 response 에 넣음
     * @param loginInfo 로그인 사용자 정보
     */
    public void setSessionLoginInfo(
            HttpServletRequest request,
            HttpServletResponse response,
            MaxyUser loginInfo) {
        // 쿠키에 세션 정보 넣기
        try {
            // 쿠키를 사용한다면
            if (useCookie) {
                // 쿠키에 넣을 유저 정보 세팅
                String cookieUserInfo = String.valueOf(loginInfo.getUserNo());
                // 유저 정보 암호화
                String encodeCookieUserInfo = securityUtil.AES128Encrypt(cookieUserInfo);
                // 쿠키 생성 및 세팅
                Cookie cookie = new Cookie(CommonCode.COOKIE_NAME.getValue(), encodeCookieUserInfo);
                cookie.setMaxAge(sessionTimeout);
                cookie.setPath(request.getContextPath() + "/");
                // 쿠키 넣기
                response.addCookie(cookie);
            } else {
                // 쿠키 삭제 처리
                Cookie cookie = new Cookie(CommonCode.COOKIE_NAME.getValue(), "");
                cookie.setMaxAge(0);
                cookie.setPath(request.getContextPath() + "/");
                response.addCookie(cookie);
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        // 중복로그인 처리
        // TODO

        // 로그인 사용자 Session 에 저장
        request.getSession().setAttribute(CommonCode.loginUserKey(), loginInfo);
        request.getSession().setMaxInactiveInterval(sessionTimeout);
    }

    /**
     * 세션에서 사용자 정보 가져오기 클라이언트에서 세션 정보를 잃어버렸을때 (다중 WAS 환경) 쿠키에서 로그인 정보를 가져와 세팅하는 용도로 사용
     *
     * @param request {@link HttpServletRequest}
     * @return MaxyUser
     */
    @SuppressWarnings("unused")
    public MaxyUser getSessionLoginInfo(
            HttpServletRequest request) {
        String cookieValue = null;
        MaxyUser loginUser;

        // 쿠키 사용 여부 가져오기
        if (useCookie) {
            // 쿠키 가져오기
            Cookie[] cookies = request.getCookies();
            if (cookies != null) {
                for (Cookie cookie : cookies) {
                    // 쿠키 이름 검색
                    String name = cookie.getName();
                    if (CommonCode.COOKIE_NAME.equals(name)) {
                        // 쿠키 값 꺼내오기
                        cookieValue = cookie.getValue();
                        break;
                    }
                }
            }
        }

        // !! ISSUE !! setMaxInactiveInterval 은 어떻게 세팅될 지 모름 !!
        // 쿠키에서 가져온 값을 복호화 하여 유저 정보 다시 세팅
        if (StringUtils.isNotEmpty(cookieValue)) {
            try {
                // 쿠키 복호화
                String strUser = securityUtil.AES128Decrypt(cookieValue);
                // 유저 정보 다시 가져오기
                loginUser = selectUserInfo(strUser);
                if (loginUser != null) {
                    // 추가 정보 세팅
                    userServiceHelper.setAdditionalLoginInfo(loginUser);
                    request.getSession().setAttribute(CommonCode.loginUserKey(), loginUser);
                } else {
                    log.warn("Can not find login cookie user={}.", strUser);
                    throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
                }
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        } else {
            throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
        }
        return loginUser;
    }

    /**
     * userNo 로 사용자 정보 조회
     *
     * @param userNo 유저 고유 번호
     * @return MaxyUser
     */
    private MaxyUser selectUserInfo(String userNo) throws Exception {
        UserVO user = new UserVO();
        user.setUserNo(CommonUtil.toLong(userNo));

        // userNo 로 로그인 정보 조회
        UserVO qResult = userMapper.selectUserInfoByUserNo(user);

        return MaxyUser.builder()
                .userNo(qResult.getUserNo())
                .userId(qResult.getUserId())
                .userNm(qResult.getUserNm())
                .emailAddr(securityUtil.AES128Decrypt(qResult.getEmailAddr()))
                .phoneNo(qResult.getPhoneNo())
                .adminYn(qResult.getAdminYn())
                .grpId(qResult.getGrpId())
                .roleGbn(qResult.getRoleGbn())
                .build();
    }

    /**
     * 사용자 조회가능 패키지명 재 설정
     *
     * @param login MaxyUser
     */
    public void refreshAppInfo(MaxyUser login, String appType) {

        // 로그인 사용자가 조회가능한 패키지명 목록 조회
        UserVO userVO = new UserVO();
        userVO.setUserNo(login.getUserNo());
        userVO.setAppType(appType);
        List<UserAppVO> appInfoList = userMapper.selectAppInfoListByUserNo(userVO);
        Map<String, Map<String, Map<String, UserAppVO>>> appInfoMap = new LinkedHashMap<>();
        for (UserAppVO appInfo : appInfoList) {
            String packageNm = appInfo.getPackageNm();
            String serverType = appInfo.getServerType();
            String osType = appInfo.getOsType();
            String appVer = appInfo.getAppVer();

            // packageNm:serverType
            String appName = String.join(":", packageNm, serverType);

            Map<String, Map<String, UserAppVO>> osTypeMap;
            Map<String, UserAppVO> appVerMap;
            if (!appInfoMap.containsKey(appName)) {
                osTypeMap = new LinkedHashMap<>();
                appVerMap = new LinkedHashMap<>();
            } else {
                osTypeMap = appInfoMap.get(appName);
                if (!osTypeMap.containsKey(osType)) {
                    appVerMap = new LinkedHashMap<>();
                } else {
                    appVerMap = osTypeMap.get(osType);
                }
            }
            appVerMap.put(Objects.requireNonNullElse(appVer, "-"), appInfo);
            osTypeMap.put(osType, appVerMap);
            appInfoMap.put(appName, osTypeMap);
        }

        login.setAppInfo(appInfoMap);
    }

    /**
     * 유저 정보 수정
     *
     * @param user {@link UserVO}
     * @param pk   {@link PrivateKey}
     * @return MaxyUser
     * @throws Exception AuthException, BadRequestException
     */
    public MaxyUser modifyUserInfo(UserVO user, PrivateKey pk) throws Exception {
        try {
            // Get User Info By userNo
            UserVO qResult = userMapper.selectUserInfoByUserNo(user);

            // userNo로 검색 결과가 없는 경우
            if (qResult == null) {
                throw new AuthException(ReturnCode.ERR_USER_NOT_EXIST);
            }

            if (pk != null) {
                // RSA Decrypt
                RSAUtil rsaUtil = new RSAUtil();
                String userPw = rsaUtil.decryptRsa(pk, user.getUserPw());
                String userNewPw = rsaUtil.decryptRsa(pk, user.getUserNewPw());

                // Valid
                ReturnCode validCode = ValidUtil.isValidPassword(qResult.getUserId(), userNewPw);
                if (!validCode.isSuccess()) {
                    // 검증에 통과하지 못한 경우 해당하는 코드를 리턴
                    throw new BadRequestException(validCode);
                }

                // SHA256 Encrypt Password
                userPw = SecurityUtil.SHA256Encrypt(userPw);
                userNewPw = SecurityUtil.SHA256Encrypt(userNewPw);

                // userPw가 틀린 경우
                if (!userPw.equals(qResult.getUserPw())) {
                    throw new AuthException(ReturnCode.ERR_INVALID_PW);
                }

                // 기존 비밀번호와 바꿀 비밀번호가 같은 경우
                if (userNewPw.equals(qResult.getUserPw())) {
                    throw new BadRequestException(ReturnCode.ERR_SAME_CURRENT_PW);
                }

                // set the expired Date (now + 00 days)
                LocalDate expiredDate = DateUtil.stringDateToLocalDate(DateUtil.format());
                expiredDate = expiredDate.plusDays(passExpireDate);
                user.setExpiredDate(DateUtil.LocalDateToStringDate(expiredDate));

                // set userNewPw to userPw
                user.setUserNewPw(userNewPw);
            } else {
                // query 에서 if 처리 하기 위해 null 처리
                user.setUserPw(null);
                user.setUserNewPw(null);
            }

            if (user.getEmailAddr() != null) {
                // Encrypt Email by AES128
                user.setEmailAddr(securityUtil.AES128Encrypt(user.getEmailAddr()));
            }

            // Update
            user.setRegDt(DateUtil.format());
            userMapper.updateUserInfoByUserNo(user);

            // Set User Response Data
            MaxyUser result = MaxyUser.builder()
                    .userNo(qResult.getUserNo())
                    .userId(qResult.getUserId())
                    .userNm(qResult.getUserNm())
                    .emailAddr(securityUtil.AES128Decrypt(user.getEmailAddr()))
                    .adminYn(qResult.getAdminYn())
                    .grpId(qResult.getGrpId())
                    .grpNm(qResult.getGrpNm())
                    .grpAdminYn(qResult.getGrpAdminYn())
                    .roleGbn(qResult.getRoleGbn())
                    .build();

            // Set Additional Login Info
            userServiceHelper.setAdditionalLoginInfo(result);

            return result;
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            throw e;
        }
    }

    public void renewPassword(HttpSession session, String userPw, String userNewPw) throws Exception {
        Long userNo = userServiceHelper.getTmpInfoFromSession(session);

        if (userNo == null) {
            throw new AuthException(ReturnCode.ERR_NO_USER);
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
            pk = (PrivateKey) session.getAttribute(rsaUtil.getRsaWebKey());
        }

        // Param 생성
        UserVO userParam = UserVO.builder()
                .userNo(userNo)
                .updNo(userNo)
                .userPw(userPw)         // nullable
                .userNewPw(userNewPw)   // nullable
                .build();

        // modify service 실행
        MaxyUser result = modifyUserInfo(userParam, pk);

        // 비밀번호 변경됐으면 임시 세션 정보 삭제
        userServiceHelper.removeTmpUserSession(session);

        log.info("renew password userNo: {}", result.getUserNo());
    }

    /**
     * 비밀번호 초기화
     *
     * @param user userId, email
     * @return UserVO
     * @throws Exception AuthenticationError, SecurityError
     */
    public UserVO resetPw(UserVO user) throws Exception {
        String orgEmailAddr = user.getEmailAddr();
        // email 암호화
        user.setEmailAddr(securityUtil.AES128Encrypt(orgEmailAddr));

        // 유저 정보 검색
        UserVO qResult = userMapper.selectUserInfoByUserIdAndEmail(user);
        if (qResult == null) {
            throw new AuthException(ReturnCode.ERR_NO_USER);
        }

        // 새로운 비밀번호 생성
        String userNewPw = CommonUtil.makeRandomStr(10);
        user.setUserNewPw(SecurityUtil.SHA256Encrypt(userNewPw));
        user.setUserNo(qResult.getUserNo());

        // set the expired Date (now + 00 days)
        LocalDate expiredDate = DateUtil.stringDateToLocalDate(DateUtil.format());
        expiredDate = expiredDate.plusDays(passExpireDate);
        user.setExpiredDate(DateUtil.LocalDateToStringDate(expiredDate));

        // set update info
        user.setRegDt(DateUtil.format());

        // do update
        userMapper.updateUserInfoByUserNo(user);
        // reset password error count
        userMapper.updateUserPwCntZero(user);

        // 이메일에 보낼 암호화되지 않은 임시 비밀번호

        return UserVO.builder()
                .userNo(qResult.getUserNo())
                .userNm(qResult.getUserNm())
                .userId(qResult.getUserId())
                .emailAddr(orgEmailAddr)
                .userNewPw(userNewPw)
                .build();
    }

    /**
     * 비밀번호 초기화 이메일 발송 서비스
     *
     * @param userInfo userId, userNm, email, userPw
     * @return 성공 여부
     */
    public boolean sendPwResetMail(UserVO userInfo) {
        if (mailService.checkMailDisabled()) {
            return false;
        }
        List<String> toAddressList = new ArrayList<>();
        toAddressList.add(userInfo.getEmailAddr());

        final String subject = "[MAXY] 비밀번호가 초기화되었습니다.";
        final String userNm = userInfo.getUserNm();
        final String userNewPw = userInfo.getUserNewPw();

        Map<String, String> mailParam = new HashMap<>();
        mailParam.put("contextUrl", contextUrl);
        mailParam.put("userNm", userNm);
        mailParam.put("userNewPw", userNewPw);

        // mail 템플릿을 만들어 사용
        String content = mailService.getTemplate("reset-password.html", mailParam);

        MailVO mailVO = MailVO.builder()
                .toEmailList(toAddressList)
                .subject(subject)
                .content(content)
                .build();
        mailVO.setUser(userInfo);

        return mailService.sendMail(mailVO);
    }

    /**
     * 어드민 비밀번호 실패 횟수 초기화
     */
    public void initAdminPassCnt() {
        // do update
        userMapper.initAdminPassCnt();
    }

    /**
     * 어드민 비밀번호 초기화
     */
    public void initAdminPass() {
        // do update
        userMapper.initAdminPass();
    }
}
