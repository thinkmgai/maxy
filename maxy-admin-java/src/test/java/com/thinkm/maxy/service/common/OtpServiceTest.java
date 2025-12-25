package com.thinkm.maxy.service.common;

import com.thinkm.common.code.OtpStatus;
import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.exception.NeedOtpInfo;
import com.thinkm.common.exception.NeedOtpReg;
import com.thinkm.common.exception.OtpException;
import com.thinkm.common.util.Aes256Util;
import com.thinkm.common.util.OtpUtil;
import com.thinkm.maxy.dto.otp.OtpResponseDto;
import com.thinkm.maxy.mapper.UserMapper;
import com.thinkm.maxy.vo.UserVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import javax.servlet.http.HttpSession;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OtpServiceTest {

    private static final String OTP_USER_NO_KEY = (String) ReflectionTestUtils.getField(OtpService.class, "OTP_USER_NO_KEY");
    private static final String OTP_USER_ID_KEY = (String) ReflectionTestUtils.getField(OtpService.class, "OTP_USER_ID_KEY");
    private static final String OTP_ISSUED_AT_KEY = (String) ReflectionTestUtils.getField(OtpService.class, "OTP_ISSUED_AT_KEY");
    private static final String OTP_SECRET_KEY = (String) ReflectionTestUtils.getField(OtpService.class, "OTP_SECRET_KEY");

    @Mock
    private Aes256Util aes256Util;
    @Mock
    private OtpUtil otpUtil;
    @Mock
    private UserMapper userMapper;

    @InjectMocks
    private OtpService otpService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(otpService, "otpMaxAttempts", 3);
    }

    @Test
    void otp등록사용자는_정보요청예외() throws Exception {
        UserVO user = new UserVO();
        user.setUserNo(1L);
        user.setUserId("user");
        user.setOtpEnabled(true);
        user.setOtpSecret("encrypted");
        user.setOtpAttempts(1);

        HttpSession session = mock(HttpSession.class);
        when(aes256Util.decrypt("encrypted")).thenReturn("plainSecret");

        NeedOtpInfo ex = assertThrows(NeedOtpInfo.class, () -> otpService.processOtp(user, session));
        assertEquals("alert.otp.need.info", ex.getMessage());
        assertEquals(OtpStatus.NEED_VERIFY, ex.getStatus());
        assertNotNull(ex.getDto());

        verify(session).setAttribute(OTP_SECRET_KEY, "plainSecret");
        verify(session).setAttribute(eq(OTP_ISSUED_AT_KEY), anyLong());
    }

    @Test
    void otp미등록사용자는_등록요청예외() throws Exception {
        UserVO user = new UserVO();
        user.setUserNo(1L);
        user.setUserId("user");
        user.setOtpEnabled(false);

        HttpSession session = mock(HttpSession.class);

        NeedOtpReg ex = assertThrows(NeedOtpReg.class, () -> otpService.processOtp(user, session));
        assertEquals("alert.otp.need.reg", ex.getMessage());
        assertEquals(OtpStatus.NEED_REGISTER, ex.getStatus());
    }

    @Test
    void otp등록URL생성() {
        HttpSession session = mock(HttpSession.class);
        when(session.getAttribute(OTP_USER_ID_KEY)).thenReturn("user");
        when(otpUtil.generateSecretKey()).thenReturn("secret");
        when(otpUtil.getOtpAuthURL(OtpService.ISSUER, "user", "secret")).thenReturn("url");

        String url = otpService.getOtpRegisterUrl(session);

        assertEquals("url", url);
        verify(session).setAttribute(OTP_SECRET_KEY, "secret");
    }

    @Test
    void otp시크릿저장() throws Exception {
        HttpSession session = mock(HttpSession.class);
        when(session.getAttribute(OTP_USER_NO_KEY)).thenReturn(5L);
        when(session.getAttribute(OTP_SECRET_KEY)).thenReturn("secret");
        when(aes256Util.encrypt("secret")).thenReturn("encoded");

        otpService.saveOtpSecret(session);

        verify(userMapper).initOtpInfo(argThat(vo ->
                vo.getUserNo().equals(5L) &&
                        "encoded".equals(vo.getOtpSecret()) &&
                        vo.getOtpDate() != null));
    }

    @Test
    void otp코드검증_만료시간초과() {
        HttpSession session = mockSessionForVerification(System.currentTimeMillis() - 1000 * 60 * 6);

        assertThrows(OtpException.class, () -> otpService.verifyOtpCode(session, 123456));
    }

    @Test
    void otp코드검증_사용자없음() {
        HttpSession session = mockSessionForVerification();
        when(userMapper.selectUserInfoByUserNo(any())).thenReturn(null);

        OtpException ex = assertThrows(OtpException.class, () -> otpService.verifyOtpCode(session, 123456));
        assertEquals("alert.invalid.login", ex.getMessage());
    }

    @Test
    void otp코드검증_시도초과() {
        HttpSession session = mockSessionForVerification();
        UserVO user = new UserVO();
        user.setOtpAttempts(3);
        when(userMapper.selectUserInfoByUserNo(any())).thenReturn(user);

        OtpException ex = assertThrows(OtpException.class, () -> otpService.verifyOtpCode(session, 123456));
        assertEquals("alert.otp.exceeded.max.attempts", ex.getMessage());
    }

    @Test
    void otp코드검증_실패시시도증가() {
        HttpSession session = mockSessionForVerification();
        UserVO user = new UserVO();
        user.setOtpAttempts(0);
        when(userMapper.selectUserInfoByUserNo(any())).thenReturn(user);
        when(otpUtil.verifyCode("secret", 123456)).thenReturn(false);
        when(userMapper.selectOtpAttempts(any())).thenReturn(1);

        OtpException ex = assertThrows(OtpException.class, () -> otpService.verifyOtpCode(session, 123456));
        assertEquals("alert.otp.invalid", ex.getMessage());
        assertNotNull(ex.getDto());

        verify(userMapper).increaseOtpAttempts(any());
        verify(userMapper).selectOtpAttempts(any());
    }

    @Test
    void otp코드검증_성공() {
        HttpSession session = mockSessionForVerification();
        UserVO user = new UserVO();
        user.setOtpAttempts(0);
        when(userMapper.selectUserInfoByUserNo(any())).thenReturn(user);
        when(otpUtil.verifyCode("secret", 123456)).thenReturn(true);

        UserVO result = otpService.verifyOtpCode(session, 123456);

        assertSame(user, result);
        verify(userMapper).resetOtpAttempts(any());
    }

    @Test
    void otp정보삭제() {
        HttpSession session = mock(HttpSession.class);
        otpService.removeOtpInfo(session);
        verify(session).removeAttribute(OTP_USER_NO_KEY);
        verify(session).removeAttribute(OTP_USER_ID_KEY);
        verify(session).removeAttribute(OTP_ISSUED_AT_KEY);
        verify(session).removeAttribute(OTP_SECRET_KEY);
    }

    @Test
    void otp상태설정() {
        HttpSession session = mock(HttpSession.class);

        OtpResponseDto dto = otpService.setOtpStatus(session);

        assertEquals(OtpStatus.NEED_VERIFY, dto.getStatus());
        assertThat(dto.getIssuedAt()).isNotNull();
        verify(session).setAttribute(eq(OTP_ISSUED_AT_KEY), anyLong());
    }

    private HttpSession mockSessionForVerification() {
        return mockSessionForVerification(System.currentTimeMillis());
    }

    private HttpSession mockSessionForVerification(long issuedAt) {
        HttpSession session = mock(HttpSession.class);
        when(session.getAttribute(OTP_USER_NO_KEY)).thenReturn(1L);
        when(session.getAttribute(OTP_USER_ID_KEY)).thenReturn("user");
        when(session.getAttribute(OTP_SECRET_KEY)).thenReturn("secret");
        when(session.getAttribute(OTP_ISSUED_AT_KEY)).thenReturn(issuedAt);
        return session;
    }
}
