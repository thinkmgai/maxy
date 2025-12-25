package com.thinkm.maxy.service.common;

import com.thinkm.common.code.OtpStatus;
import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.exception.NeedOtpInfo;
import com.thinkm.common.exception.NeedOtpReg;
import com.thinkm.common.exception.OtpException;
import com.thinkm.common.util.Aes256Util;
import com.thinkm.common.util.OtpUtil;
import com.thinkm.maxy.dto.otp.OtpRegInfoResponseDto;
import com.thinkm.maxy.dto.otp.OtpResponseDto;
import com.thinkm.maxy.mapper.UserMapper;
import com.thinkm.maxy.vo.UserVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.servlet.http.HttpSession;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class OtpService {

    public static final String ISSUER = "MAXY";
    // session key
    private static final String OTP_USER_NO_KEY = "OTP_USER_NO";
    private static final String OTP_USER_ID_KEY = "OTP_USER_ID";
    private static final String OTP_ISSUED_AT_KEY = "OTP_ISSUED_AT";
    private static final String OTP_SECRET_KEY = "OTP_SECRET_KEY";

    private final Aes256Util aes256Util;
    private final OtpUtil otpUtil;
    private final UserMapper userMapper;

    @Value("${security.otp.max-attempts:3}")
    private int otpMaxAttempts;

    /**
     * user 정보를 사용하여 otp 등록 여부를 판단
     */
    public void processOtp(UserVO user, HttpSession session) throws Exception {
        session.setAttribute(OTP_USER_NO_KEY, user.getUserNo());
        session.setAttribute(OTP_USER_ID_KEY, user.getUserId());

        // OTP 코드 입력 요구
        if (Boolean.TRUE.equals(user.getOtpEnabled())
            && user.getOtpSecret() != null
            && !user.getOtpSecret().isEmpty()) {

            // otpAttempts >= otpMaxAttempts 인 경우 처리 해야할 지

            // 세션에 복호화된 secret key 를 넣어둔다. otp 코드와 비교할 대상
            String decryptedSecret = aes256Util.decrypt(user.getOtpSecret());
            session.setAttribute(OTP_SECRET_KEY, decryptedSecret);

            // otp 입력 시간 제한
            long issuedAt = System.currentTimeMillis();
            session.setAttribute(OTP_ISSUED_AT_KEY, issuedAt);

            // 로그인 시도 시간 및 시도 / 최대 시도 횟수 반환
            OtpResponseDto dto = new OtpResponseDto(OtpStatus.NEED_VERIFY,
                    issuedAt,
                    user.getOtpAttempts(),
                    otpMaxAttempts,
                    true);
            throw new NeedOtpInfo(ReturnCode.OTP_NEED_INFO, dto);
        }
        // OTP 등록 요구
        else {
            // 등록 URL은 별도 API로 받아오게 한다
            OtpRegInfoResponseDto dto = new OtpRegInfoResponseDto(OtpStatus.NEED_REGISTER, true);
            throw new NeedOtpReg(ReturnCode.OTP_NEED_REG, dto);
        }
    }

    // OTP 등록 URL을 만들어서 반환
    public String getOtpRegisterUrl(HttpSession session) {
        String userId = (String) session.getAttribute(OTP_USER_ID_KEY);
        String secret = otpUtil.generateSecretKey();
        session.setAttribute(OTP_SECRET_KEY, secret);
        return otpUtil.getOtpAuthURL(ISSUER, userId, secret);
    }

    // 사용자가 OTP를 등록했을 때 DB에 해당 값을 넣어준다.
    public void saveOtpSecret(HttpSession session) throws Exception {
        Long userNo = (Long) session.getAttribute(OTP_USER_NO_KEY);
        String secret = (String) session.getAttribute(OTP_SECRET_KEY);
        String encryptedOtpSecret = aes256Util.encrypt(secret);
        userMapper.initOtpInfo(UserVO.builder()
                .userNo(userNo)
                .otpSecret(encryptedOtpSecret)
                .otpDate(LocalDateTime.now())
                .build());
    }

    public UserVO verifyOtpCode(HttpSession session, Integer otpCode) {
        Long userNo = (Long) session.getAttribute(OTP_USER_NO_KEY);
        String userId = (String) session.getAttribute(OTP_USER_ID_KEY);
        String otpSecret = (String) session.getAttribute(OTP_SECRET_KEY);
        Long otpIssuedAt = (Long) session.getAttribute(OTP_ISSUED_AT_KEY);

        // 입력시간 - 진입 시간 > 5분 인 경우 에러
        if (otpIssuedAt == null || System.currentTimeMillis() - otpIssuedAt > 1000 * 60 * 5) {
            throw new OtpException(ReturnCode.ERR_OTP_EXPIRED_ISSUED_TIME);
        }

        // 조회용 객체
        UserVO userParam = UserVO.builder()
                .userNo(userNo)
                .userId(userId)
                .build();

        // 등록된 사용자 아닌 경우 에러
        UserVO loginUser = userMapper.selectUserInfoByUserNo(userParam);
        if (loginUser == null) {
            log.error("OTP VERIFY FAIL: user not exist. userNo: {}, userId: {}", userNo, userId);
            throw new OtpException(ReturnCode.ERR_USER_NOT_EXIST);
        }

        // otp 실패 횟수가 최대치를 넘었을 때 에러
        if (loginUser.getOtpAttempts() >= otpMaxAttempts) {
            log.error("OTP VERIFY FAIL: otp attempts exceeded max attempts. userNo: {}, userId: {}", userNo, userId);
            throw new OtpException(ReturnCode.ERR_OTP_EXCEEDED_MAX_ATTEMPTS);
        }

        // OTP 검증
        boolean verify = otpUtil.verifyCode(otpSecret, otpCode);
        if (!verify) {
            log.warn("OTP VERIFY CODE FAIL: {}, {}", userNo, userId);
            userMapper.increaseOtpAttempts(userParam);
            int attempts = userMapper.selectOtpAttempts(userParam);
            throw new OtpException(ReturnCode.ERR_OTP_INVALID, new OtpResponseDto(OtpStatus.NEED_VERIFY,
                    otpIssuedAt,
                    attempts,
                    otpMaxAttempts,
                    true));
        }

        userMapper.resetOtpAttempts(userParam);
        return loginUser;
    }

    public void removeOtpInfo(HttpSession session) {
        session.removeAttribute(OTP_USER_NO_KEY);
        session.removeAttribute(OTP_USER_ID_KEY);
        session.removeAttribute(OTP_ISSUED_AT_KEY);
        session.removeAttribute(OTP_SECRET_KEY);
    }

    public OtpResponseDto setOtpStatus(HttpSession session) {
        long issuedAt = System.currentTimeMillis();
        session.setAttribute(OTP_ISSUED_AT_KEY, issuedAt);
        return new OtpResponseDto(OtpStatus.NEED_VERIFY, issuedAt, 0, otpMaxAttempts, true);
    }
}
