package com.thinkm.maxy.vo;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@NoArgsConstructor
@ToString
public class AlertLimitConfigVO {

    private String packageNm;
    private String serverType;
    private String target;          // PK
    private String targetDesc;
    private String targetPostfix;
    private Integer limitValue;
    private Integer optional;
    private Integer limitOvertime;
    private Integer alertPeriod;
    private String templateMsg;
    private Integer useYn;

    private String regDt;
    private Long regNo;
    private String updDt;
    private Long updNo;
}
