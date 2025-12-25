package com.thinkm.maxy.service.common.helper;

import com.thinkm.common.code.AuthCode;
import com.thinkm.common.code.CommonCode;
import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.exception.AuthException;
import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.DateUtil;
import com.thinkm.common.util.JsonUtil;
import com.thinkm.common.util.SecurityUtil;
import com.thinkm.maxy.dto.menu.MenuInfoDto;
import com.thinkm.maxy.mapper.MenuMapper;
import com.thinkm.maxy.mapper.UserMapper;
import com.thinkm.maxy.vo.MaxyUser;
import com.thinkm.maxy.vo.MenuVO;
import com.thinkm.maxy.vo.UserVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.jetbrains.annotations.NotNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.servlet.http.HttpSession;
import java.time.LocalDate;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class UserServiceHelper {
    // session key
    private static final String TMP_USER_NO_KEY = "TMP_USER_NO";
    private static final String TMP_USER_ID_KEY = "TMP_USER_ID";
    private final UserMapper userMapper;
    private final MenuMapper menuMapper;
    private final SecurityUtil securityUtil;
    @Value("${security.pass.error-count:5}")
    private int passErrorCount;

    public void checkPassword(String userPw, UserVO user, UserVO vo) {
        // pw 검증 시작
        String dbPw = user.getUserPw();
        int passCnt = user.getPassCnt();

        // 비밀번호 오류 횟수 초과
        if (passCnt > this.passErrorCount) {
            throw new AuthException(ReturnCode.ERR_PASSCNT_OVER);
        }

        // 비밀번호 같지 않을 때
        vo.setRegDt(DateUtil.format());
        vo.setUserNo(user.getUserNo());
        if (!dbPw.equals(userPw)) {
            vo.setPassCnt(user.getPassCnt() + 1);
            userMapper.updateUserPwCntPlus(vo);
            // 비밀번호 오류 메시지 대신 유저가 없다고 메시지를 반환
            throw new AuthException(ReturnCode.ERR_USER_NOT_EXIST);
        }
    }

    public void checkExpired(UserVO user, HttpSession session) {
        // 비밀번호 변경 일자 지났을 때
        // 비밀번호 변경 날짜 기본값은 현재시간
        LocalDate expiredDate = DateUtil.stringDateToLocalDate(user.getExpiredDate());
        if (LocalDate.now().isAfter(expiredDate)) {
            processResetPassword(user, session);
        }
    }

    private void processResetPassword(UserVO user, HttpSession session) {
        session.setAttribute(TMP_USER_NO_KEY, user.getUserNo());
        session.setAttribute(TMP_USER_ID_KEY, user.getUserId());
        throw new AuthException(ReturnCode.ERR_UPT_PW_OVER);
    }

    public Long getTmpInfoFromSession(HttpSession session) {
        return CommonUtil.toLong(session.getAttribute(TMP_USER_NO_KEY));
    }

    public void removeTmpUserSession(HttpSession session) {
        session.removeAttribute(TMP_USER_NO_KEY);
        session.removeAttribute(TMP_USER_ID_KEY);
    }

    public void checkUserGroup(UserVO user) {
        // 슈퍼 관리자가 아니고
        if (CommonCode.YN_NO.equals(user.getAdminYn())) {
            // 그룹 아이디가 없거나
            if (StringUtils.isEmpty(user.getGrpId())) {
                throw new AuthException(ReturnCode.ERR_NO_ACCESS_AUTHORITY);
            }
            // 소속 그룹이 삭제되었을 때 에러 발생
            if (CommonCode.YN_YES.equals(user.getGrpDeleteYn())) {
                throw new AuthException(ReturnCode.ERR_DELETED_GROUP);
            }
        }
    }

    @NotNull
    public MaxyUser loginRealDone(UserVO user) throws Exception {
        // 비밀번호 검증이 끝났으면 세션에 담을 MaxyUser 객체에 옮겨 담음
        // 필요없는 값을 가리기 위해 MaxyUser 객체를 별도로 생성
        MaxyUser result = MaxyUser.builder()
                .userId(user.getUserId())
                .userNo(user.getUserNo())
                .userNm(user.getUserNm())
                .emailAddr(securityUtil.AES128Decrypt(user.getEmailAddr()))
                .adminYn(user.getAdminYn())
                .grpId(user.getGrpId())
                .grpNm(user.getGrpNm())
                .grpAdminYn(user.getGrpAdminYn())
                .roleGbn(user.getRoleGbn())
                .regDt(user.getRegDt())
                .build();

        // 로그인 사용자 추가 정보 설정
        setAdditionalLoginInfo(result);

        // 로그인 성공 시 passCnt = 0
        userMapper.updateUserPwCntZero(user);
        return result;
    }


    /**
     * 추가 사용자 정보 세팅
     *
     * @param login MaxyUser
     */
    public void setAdditionalLoginInfo(MaxyUser login) {
        // 권한 구분 값 넣기
        MenuVO vo = MenuVO.builder()
                .roleGbn(login.getRoleGbn())
                .build();

        // 권한에 따른 권한 이름 부여
        if (AuthCode.ADMIN_SUPER.equals(login.getRoleGbn())) {
            login.setRoleNm(AuthCode.ADMIN_SUPER.getName());
        } else if (AuthCode.ADMIN_GROUP.equals(login.getRoleGbn())) {
            login.setRoleNm(AuthCode.ADMIN_GROUP.getName());
        } else if (AuthCode.GENERAL.equals(login.getRoleGbn())) {
            login.setRoleNm(AuthCode.GENERAL.getName());
        } else {
            log.warn("Unknown role division. Can't set RoleNm > {}, {}",
                    login.getUserId(), login.getRoleGbn());
        }

        // 그룹이 없을 경우 텍스트 처리
        if (StringUtils.isEmpty(login.getGrpNm())) {
            login.setGrpNm("no.group");
        }

        List<MenuVO> menuList;
        // 슈퍼 관리자의 권한 메뉴 목록 (전체 메뉴)
        if (CommonCode.YN_YES.equals(login.getAdminYn())) {
            menuList = menuMapper.selectMenuList(vo);
        } else {
            // 권한별 메뉴 목록
            menuList = menuMapper.selectMenuListByRoleGbn(vo);
        }
        // 메뉴 권한 목록 (세션필터에서 사용)
        refreshMenuRoleToLoginUser(login);

        // 화면에서 사용할 수 있도록 JSON String 으로 변환하여 저장
        List<MenuInfoDto> menuInfoDtoList = MenuInfoDto.of(menuList);
        login.setMenuList(JsonUtil.toJson(menuInfoDtoList));
        login.setLoginDt(DateUtil.format(DateUtil.DATETIME_WITH_COLON_PATTERN));
    }

    /**
     * 메뉴 권한 갱신
     *
     * @param login 로그인 유저
     */
    public void refreshMenuRoleToLoginUser(MaxyUser login) {
        if (login == null) {
            return;
        }
        // 권한 구분 값 넣기
        List<MenuVO> menuRoleList = menuMapper.selectMenuRoleList(MenuVO.builder()
                .roleGbn(login.getRoleGbn())
                .build());
        List<String> menuIdList = menuRoleList.stream().map(MenuVO::getMenuId).toList();
        login.setMenuIdList(menuIdList);
    }
}
