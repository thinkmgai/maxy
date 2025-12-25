package com.thinkm.maxy.vo;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SystemLogVO {
    private Long id;
    private String consumerName;
    private int threadNum;
    private String type;
    private String msg;
    private String param;
    private LocalDateTime regDt;
    private LocalDateTime from;
    private LocalDateTime to;
    private long regTs;

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SystemLog {
        private String type;
        private String msg;
        private String param;
        private long regDt;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SystemHealth {
        private String programName;
        private Integer nodeNumber;
        private String logType;
    }
}
