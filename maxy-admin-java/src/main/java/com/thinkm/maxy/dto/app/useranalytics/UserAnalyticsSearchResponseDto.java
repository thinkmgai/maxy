package com.thinkm.maxy.dto.app.useranalytics;

import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserAnalyticsSearchResponseDto {
    private String clientNo;
    private String deviceId;
    private String userId;
    private String appVer;
    private String osType;
    private String deviceModel;
    private String createdDate;
    private String updatedDate;
}
