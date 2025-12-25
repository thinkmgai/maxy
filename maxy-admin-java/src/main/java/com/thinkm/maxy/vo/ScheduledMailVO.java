package com.thinkm.maxy.vo;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@Builder
@AllArgsConstructor
@RequiredArgsConstructor
public class ScheduledMailVO extends MessageVO {
    private String packageNm;
    private String serverType;
    private String osType;
    private String appVer;

    private String packageNmText;
    private String osTypeText;
    private String appVerText;

    private String reportType;
    private String reportSubject;
    private String fileType;
    private String sendStartDt;
    private String sendEndDt;
    private int usagePeriod;
    private String sendCycle;
    private String regDt;
    private String updDt;
    private Long userNo;
    private String subject;
    private String locale;

    private String toEmailListStr;

    private LocalDate today;
}
