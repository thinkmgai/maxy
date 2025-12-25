package com.thinkm.maxy.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SessionReplayBlockTargetVO {
    private Long seq;
    private String packageNm;
    private String serverType;
    private String selector;
    private String target;
    private String remark;
    private String regDt;
    private Long regNo;
}
