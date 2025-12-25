package com.thinkm.maxy.vo;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@ToString
public class AlertSendConfigVO {

    private String packageNm;
    private String serverType;
    private String sendType;
    private String sendUrl;
    private String token;
    private String accountId;
    private String accountPw;
    private Integer useYn;

    private String regDt;
    private Long regNo;
    private String updDt;
    private Long updNo;
    
    // 알림 대상 목록
    private List<AlertSendTargetVO> targets;
}
