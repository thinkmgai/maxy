package com.thinkm.maxy.service.common.helper;

import com.thinkm.common.code.CommonCode;
import com.thinkm.common.exception.AuthException;
import com.thinkm.common.util.SecurityUtil;
import com.thinkm.maxy.mapper.MenuMapper;
import com.thinkm.maxy.mapper.UserMapper;
import com.thinkm.maxy.vo.MaxyUser;
import com.thinkm.maxy.vo.MenuVO;
import com.thinkm.maxy.vo.UserVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import javax.servlet.http.HttpSession;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceHelperTest {

    @Mock
    private UserMapper userMapper;
    @Mock
    private MenuMapper menuMapper;
    @Mock
    private SecurityUtil securityUtil;

    @InjectMocks
    private UserServiceHelper helper;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(helper, "passErrorCount", 3);
    }

    @Test
    void 비밀번호오류횟수초과시_예외() {
        UserVO user = new UserVO();
        user.setPassCnt(5);

        AuthException ex = assertThrows(AuthException.class,
                () -> helper.checkPassword("pw", user, new UserVO()));
        assertEquals("alert.passcntover", ex.getMessage());
    }

    @Test
    void 비밀번호불일치시_횟수증가및예외() {
        UserVO user = new UserVO();
        user.setUserNo(10L);
        user.setUserPw("db");
        user.setPassCnt(1);

        UserVO input = new UserVO();

        AuthException ex = assertThrows(AuthException.class,
                () -> helper.checkPassword("wrong", user, input));
        assertEquals("alert.invalid.login", ex.getMessage());

        verify(userMapper).updateUserPwCntPlus(argThat(vo ->
                vo.getPassCnt() == 2 && vo.getUserNo().equals(10L)));
    }

    @Test
    void 비밀번호일치시_횟수유지() {
        UserVO user = new UserVO();
        user.setUserPw("db");
        user.setPassCnt(1);

        assertDoesNotThrow(() -> helper.checkPassword("db", user, new UserVO()));
        verify(userMapper, never()).updateUserPwCntPlus(any());
    }

    @Test
    void 비밀번호만료시_임시세션세팅() {
        UserVO user = new UserVO();
        user.setUserNo(1L);
        user.setUserId("tester");
        user.setExpiredDate(LocalDate.now().minusDays(1)
                .format(DateTimeFormatter.ofPattern("yyyyMMdd")));

        HttpSession session = mock(HttpSession.class);
        AuthException ex = assertThrows(AuthException.class, () -> helper.checkExpired(user, session));
        assertEquals("alert.invalid.overuptdt", ex.getMessage());

        verify(session).setAttribute("TMP_USER_NO", 1L);
        verify(session).setAttribute("TMP_USER_ID", "tester");
    }

    @Test
    void 임시세션조회삭제() {
        HttpSession session = mock(HttpSession.class);
        when(session.getAttribute("TMP_USER_NO")).thenReturn(7L);

        assertEquals(7L, helper.getTmpInfoFromSession(session));

        helper.removeTmpUserSession(session);
        verify(session).removeAttribute("TMP_USER_NO");
        verify(session).removeAttribute("TMP_USER_ID");
    }

    @Test
    void 그룹정보없으면_예외() {
        UserVO user = new UserVO();
        user.setAdminYn(CommonCode.YN_NO.getValue());
        user.setGrpId(null);

        AuthException ex = assertThrows(AuthException.class, () -> helper.checkUserGroup(user));
        assertEquals("alert.access.noown", ex.getMessage());
    }

    @Test
    void 삭제된그룹이면_예외() {
        UserVO user = new UserVO();
        user.setAdminYn(CommonCode.YN_NO.getValue());
        user.setGrpId("G");
        user.setGrpDeleteYn(CommonCode.YN_YES.getValue());

        AuthException ex = assertThrows(AuthException.class, () -> helper.checkUserGroup(user));
        assertEquals("alert.deleted.group", ex.getMessage());
    }

    @Test
    void 추가로그인정보설정_슈퍼관리자() {
        MaxyUser login = MaxyUser.builder()
                .userId("super")
                .roleGbn(CommonCode.ROLE_ADMIN_CODE.getValue())
                .adminYn(CommonCode.YN_YES.getValue())
                .build();

        when(menuMapper.selectMenuList(any())).thenReturn(List.of(MenuVO.builder()
                .menuId("MENU1").menuNm("메뉴").build()));
        when(menuMapper.selectMenuRoleList(any())).thenReturn(List.of(MenuVO.builder()
                .menuId("MENU1").build()));

        helper.setAdditionalLoginInfo(login);

        assertEquals("system.menu.superManager", login.getRoleNm());
        assertEquals("no.group", login.getGrpNm());
        assertThat(login.getMenuList()).contains("MENU1");
        assertThat(login.getMenuIdList()).containsExactly("MENU1");
        assertNotNull(login.getLoginDt());
    }

    @Test
    void 추가로그인정보설정_일반사용자() {
        MaxyUser login = MaxyUser.builder()
                .userId("user")
                .roleGbn(CommonCode.ROLE_GENERAL_CODE.getValue())
                .adminYn(CommonCode.YN_NO.getValue())
                .grpNm("group")
                .build();

        when(menuMapper.selectMenuListByRoleGbn(any())).thenReturn(List.of(MenuVO.builder()
                .menuId("MENU2").menuNm("M2").build()));
        when(menuMapper.selectMenuRoleList(any())).thenReturn(List.of(MenuVO.builder()
                .menuId("MENU2").build()));

        helper.setAdditionalLoginInfo(login);

        assertEquals("system.menu.generalUser", login.getRoleNm());
        assertThat(login.getMenuIdList()).containsExactly("MENU2");
    }

    @Test
    void 메뉴권한리프레시() {
        MaxyUser login = MaxyUser.builder()
                .roleGbn(CommonCode.ROLE_GROUP_CODE.getValue())
                .build();
        when(menuMapper.selectMenuRoleList(any()))
                .thenReturn(List.of(MenuVO.builder().menuId("M1").build(), MenuVO.builder().menuId("M2").build()));

        helper.refreshMenuRoleToLoginUser(login);

        assertThat(login.getMenuIdList()).containsExactly("M1", "M2");
    }

    @Test
    void 로그인완료시_암복호화와카운트초기화() throws Exception {
        UserServiceHelper spyHelper = Mockito.spy(helper);
        ReflectionTestUtils.setField(spyHelper, "passErrorCount", 3);

        UserVO user = new UserVO();
        user.setUserId("user");
        user.setUserNo(1L);
        user.setUserNm("테스터");
        user.setEmailAddr("encrypted");
        user.setAdminYn(CommonCode.YN_NO.getValue());
        user.setRoleGbn(CommonCode.ROLE_GENERAL_CODE.getValue());

        doNothing().when(spyHelper).setAdditionalLoginInfo(any());
        when(securityUtil.AES128Decrypt("encrypted")).thenReturn("user@maxy.com");

        MaxyUser result = spyHelper.loginRealDone(user);

        assertEquals("user@maxy.com", result.getEmailAddr());
        verify(userMapper).updateUserPwCntZero(user);
        verify(spyHelper).setAdditionalLoginInfo(any());
    }
}
