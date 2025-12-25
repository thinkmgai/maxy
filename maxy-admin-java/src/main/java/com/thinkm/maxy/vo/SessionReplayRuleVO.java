package com.thinkm.maxy.vo;

import lombok.*;
import lombok.experimental.SuperBuilder;

@Getter
@Setter
@ToString
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class SessionReplayRuleVO extends AppInfoVO {

    private Long seq;
    private String selector;
    private String target;
    private String remark;
    private String useYn;
    private String regDt;
    private Long regNo;
}
