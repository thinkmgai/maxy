package com.thinkm.maxy.vo;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@NoArgsConstructor
@ToString
public class AlertHistoryVO {
    private Integer seq;
    private String packageNm;
    private String serverType;
    private String alertType;
    private String sendMethod;
    private String target;
    private String message;
    private String result;
    private String regDt;
    private String alertDesc;
}
