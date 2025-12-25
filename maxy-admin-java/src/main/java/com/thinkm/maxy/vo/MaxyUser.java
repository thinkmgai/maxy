package com.thinkm.maxy.vo;

import com.thinkm.common.code.CommonCode;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;
import org.springframework.beans.factory.annotation.Value;

import javax.servlet.http.HttpServletRequest;
import java.io.Serial;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
@ToString
@AllArgsConstructor
@NoArgsConstructor
public class MaxyUser implements Serializable {

    @Serial
    private static final long serialVersionUID = -6954744164819473388L;

    @Value("${security.pass.error-count:5}")
    private int passErrorCnt;
    @Value("${security.pass.expire-date:90}")
    private int expireDate;

    private Long userNo;
    private String userId;
    private String userNm;
    private String emailAddr;
    private String phoneNo;
    private String adminYn;
    private String grpId;
    private String upGrpId;
    private String grpNm;
    private String grpAdminYn;
    private String roleNm;
    private String roleGbn;
    private String regDt;
    private int passCnt;
    private int stdCnt;
    private Integer appCount;
    private Map<String, Map<String, Map<String, UserAppVO>>> appInfo;

    /**
     * 로그인 시간
     */
    private String loginDt;

    /**
     * 이전 비밀번호(비밀번호 변경시)
     */
    private String preUserPw;

    /**
     * 이전 비밀번호 검증 사용 여부
     */
    private String useUserPwHistYn;

    /**
     * 비밀번호 변경 일시 검증 사용 여부
     */
    private String usePassLastUptDtYn;

    /* 메뉴 권한 세팅 시작 */

    /**
     * 메뉴 권한 목록
     */
    private List<String> menuIdList;

    /**
     * 로그인 한 사용자의 메뉴 목록을 스트링으로 보관
     */
    private String menuList;

    // 검색 조건
    private String searchUserNm;
    private String searchUserId;
    private String searchUserNo;
    private String searchGeneralUser;
    private String searchGroupManager;
    private String searchAdminManager;
    private String isInitPw;

    @Schema(hidden = true)
    @Parameter(hidden = true)
    public static MaxyUser getMaxyUserFromSessionInfo(HttpServletRequest request) {
        Object session = request.getSession().getAttribute(CommonCode.loginUserKey());
        if (session == null) {
            return null;
        }
        return (MaxyUser) session;
    }

    @Schema(hidden = true)
    @Parameter(hidden = true)
    public SimpleMaxyUser userToMaxyUser(UserVO vo) {
        return SimpleMaxyUser.builder()
                .userNo(vo.getUserNo())
                .userId(vo.getUserId())
                .userNm(vo.getUserNm())
                .emailAddr(vo.getEmailAddr())
                .phoneNo(vo.getPhoneNo())
                .adminYn(vo.getAdminYn())
                .grpId(vo.getGrpId())
                .upGrpId(vo.getUpGrpId())
                .grpNm(vo.getGrpNm())
                .grpAdminYn(vo.getGrpAdminYn())
                .roleGbn(vo.getRoleGbn())
                .regDt(vo.getRegDt())
                .expiredDate(vo.getExpiredDate())
                .passCnt(vo.getPassCnt())
                .appCount(vo.getAppCount())
                .stdCnt(passErrorCnt)
                .build();
    }

    @Schema(hidden = true)
    @Parameter(hidden = true)
    public List<SimpleMaxyUser> toSimpleMaxyUserList(List<UserVO> voList) {
        List<SimpleMaxyUser> result = new ArrayList<>();
        for (UserVO vo : voList) {
            result.add(userToMaxyUser(vo));
        }
        return result;
    }

    /**
     * 슈퍼 관리자 여부
     *
     * @return 슈퍼 관리자: true, 그 외: false
     */
    @Schema(hidden = true)
    @Parameter(hidden = true)
    public boolean isSuperAdmin() {
        return "0011".equals(this.getRoleGbn());
    }

    @Getter
    @Setter
    @Builder
    @Schema(hidden = true)
    public static class SimpleMaxyUser {
        private Long userNo;
        private String userId;
        private String userNm;
        private String emailAddr;
        private String phoneNo;
        private String adminYn;
        private String grpId;
        private String upGrpId;
        private String grpNm;
        private String grpAdminYn;
        private String roleNm;
        private String roleGbn;
        private String regDt;
        private String expiredDate;
        private int passCnt;
        private int stdCnt;
        private Integer appCount;
    }
}
