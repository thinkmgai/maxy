package com.thinkm.maxy.vo;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.io.Serial;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@SuperBuilder
@ToString
@AllArgsConstructor
@NoArgsConstructor
public class UserVO extends BasicInfoVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private String seq;
    private String userId;
    @JsonIgnore
    private String userPw;
    private int passCnt;
    private String userNm;
    private String emailAddr;
    private String phoneNo;
    private String expiredDate;
    private String adminYn;
    private String deleteYn;
    private String grpId;
    private String grpNm;
    private String upGrpId;
    private String orderSeq;
    private String grpLevel;
    private String grpDeleteYn;
    private String grpAdminYn;
    private String roleGbn;
    private String packageNm;
    private String serverType;
    private String serverTypeLvl;
    private Long regNo;
    private Integer appCount;
    private String picked;

    // update UserNo
    private Long updNo;

    // message
    private String sendType;
    private String sendYn;
    private String sendDt;

    private String userNewPw;

    // 검색 조건
    private String searchTextType;
    private String searchValue;

    // OTP
    @JsonIgnore
    private Boolean otpEnabled;
    private Integer otpAttempts;
    private LocalDateTime otpDate;
    @JsonIgnore
    private String otpSecret;

    private List<PackageVO> appInfoList;

    private String appType;

    @Schema(hidden = true)
    @Parameter(hidden = true)
    public static List<SimpleAppInfo> toSimpleAppInfo(List<UserVO> param) {
        List<SimpleAppInfo> result = new ArrayList<>();
        for (UserVO vo : param) {
            result.add(SimpleAppInfo.builder()
                    .packageNm(vo.getPackageNm())
                    .serverType(vo.getServerType())
                    .picked(vo.getPicked())
                    .build());
        }
        return result;
    }

    @Schema(hidden = true)
    @Parameter(hidden = true)
    public static List<SimpleGroupInfo> toSimpleGroupInfo(List<UserGroupVO> param) {
        List<SimpleGroupInfo> result = new ArrayList<>();
        for (UserGroupVO vo : param) {
            result.add(SimpleGroupInfo.builder()
                    .grpId(vo.getGrpId())
                    .grpNm(vo.getGrpNm())
                    .build());
        }
        return result;
    }

    @Schema(hidden = true)
    @Parameter(hidden = true)
    public static SimpleUser toSimpleUser(UserVO vo) {
        return SimpleUser.builder()
                .userNo(vo.getUserNo())
                .userId(vo.getUserId())
                .userNm(vo.getUserNm())
                .emailAddr(vo.getEmailAddr())
                .adminYn(vo.getAdminYn())
                .grpId(vo.getGrpId())
                .grpNm(vo.getGrpNm())
                .grpAdminYn(vo.getGrpAdminYn())
                .roleGbn(vo.getRoleGbn())
                .packageNm(vo.getPackageNm())
                .serverType(vo.getServerType())
                .regDt(vo.getRegDt())
                .appCount(vo.getAppCount())
                .picked(vo.getPicked())
                .build();
    }

    @Getter
    @Builder
    public static class SimpleGroupInfo {
        private String grpId;
        private String grpNm;
    }

    @Getter
    @Builder
    public static class SimpleAppInfo {
        private String packageNm;
        private String serverType;
        private String picked;
    }

    @Getter
    @Builder
    public static class SimpleUser {
        private Long userNo;
        private String userId;
        private String userNm;
        private String emailAddr;
        private String adminYn;
        private String grpId;
        private String grpNm;
        private String grpAdminYn;
        private String roleGbn;
        private String packageNm;
        private String serverType;
        private String regDt;
        private Integer appCount;
        private String picked;
    }
}
