package com.thinkm.maxy.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.List;

@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class MenuVO extends BasicInfoVO {

    /**
     * 메뉴 ID
     */
    @Schema(description = "메뉴 고유 ID")
    private String menuId;

    /**
     * 메뉴명
     */
    @Schema(description = "메뉴 이름")
    private String menuNm;

    /**
     * 상위 메뉴 ID
     */
    @Schema(description = "상위 메뉴의 고유 ID")
    private String upMenuId;

    /**
     * 우선 순위
     */
    @Schema(description = "메뉴 우선 순위 (숫자가 낮을수록 높은 우선순위)")
    private Integer orderSeq;

    /**
     * 계층 단계
     */
    @Schema(description = "메뉴의 계층 구조 단계 (0이 루트)")
    private Integer grpLevel;

    /**
     * 메뉴 URL
     */
    @Schema(description = "메뉴가 연결된 URL")
    private String menuUrl;

    /**
     * 메뉴 설명
     */
    @Schema(description = "메뉴에 대한 설명")
    private String menuDesc;

    /**
     * 삭제 여부
     */
    @Schema(description = "삭제 여부 (Y: 삭제됨, N: 활성 상태)")
    private String deleteYn;

    /**
     * 권한 구분
     */
    @Schema(description = "권한 구분 코드")
    private String roleGbn;

    /**
     * 권한 이름
     */
    @Schema(description = "권한 이름")
    private String roleNm;

    /**
     * ON icon
     */
    @Schema(description = "메뉴의 활성 상태 아이콘 URL")
    private String iconOn;

    /**
     * OFF icon
     */
    @Schema(description = "메뉴의 비활성 상태 아이콘 URL")
    private String iconOff;

    private String superRoleGbn;
    private List<String> roleGbnList;

    private String subMenuYn;

    private String menuGrp;

    private String appType;
}
