package com.thinkm.maxy.vo;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@NoArgsConstructor
@ToString
public class AlertSendTargetVO {

    private String packageNm;
    private String serverType;
    private String sendType;
    private String target;          // PK
    private String description;

    private String regDt;
    private Long regNo;
    private String updDt;
    private Long updNo;
}
