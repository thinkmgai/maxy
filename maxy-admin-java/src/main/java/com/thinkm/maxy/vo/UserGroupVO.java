package com.thinkm.maxy.vo;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class UserGroupVO extends BasicInfoVO {

    /**
     * 그룹 ID
     */
    private String grpId;

    /**
     * 그룹 이름
     */
    private String grpNm;

    /**
     * 상위 그룹 ID
     */
    private String upGrpId;

    /**
     * 우선 순위
     */
    private Integer orderSeq;

    /**
     * 계층 단계
     */
    private Integer grpLevel;

    /**
     * 삭제 여부
     */
    private String deleteYn;

    private String maxGrpId;

    /**
     * 관리자 여부
     */
    private String adminYn; // 그룹관리자 or 해당없음(사용자) 구분

    // 여러 유저 정보 담을 list
    private List<Long> userNoList;
}
