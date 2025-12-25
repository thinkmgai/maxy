package com.thinkm.maxy.dto.app.dsym;

import lombok.Data;

/**
 * iOS 앱 정보 응답 DTO
 */
@Data
public class AppInfoResponseDto {
    private final int status;           // 응답 상태 코드
    private final String appName;       // 앱 이름
    private final String uuid;          // 앱 UUID
    private final String appBuildVersion;  // 빌드 버전
    private final String appVersion;    // 앱 버전
    private final String error;         // 에러 메시지

    /**
     * 에러 응답 생성자
     */
    public AppInfoResponseDto(int status, String error) {
        this.status = status;
        this.error = error;
        this.appName = null;
        this.uuid = null;
        this.appBuildVersion = null;
        this.appVersion = null;
    }

    /**
     * 성공 응답 생성자
     */
    public AppInfoResponseDto(int status, String appName, String uuid, String appBuildVersion, String appVersion) {
        this.status = status;
        this.appName = appName;
        this.uuid = uuid;
        this.appBuildVersion = appBuildVersion;
        this.appVersion = appVersion;
        this.error = null;
    }
}