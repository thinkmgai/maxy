package com.thinkm.maxy.dto.app.useranalytics;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.thinkm.common.util.Elastic;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserAnalyticsDetailResponseDto {

    @JsonIgnore
    public static final String[] FIELDS = {
            Elastic.deviceId,
            Elastic.userId,
            Elastic.clientNo,
            Elastic.clientNm,
            Elastic.clientDiv,
            Elastic.phoneNo,
            Elastic.residentNo,
            Elastic.email,
            Elastic.timezone,
            Elastic.appVer,
            Elastic.osType,
            Elastic.osVer,
            Elastic.appBuildNum,
            Elastic.webviewVer,
            Elastic.deviceModel,
            Elastic.comType,
            Elastic.avgComSensitivity,
            Elastic.simOperatorNm,
            Elastic.logType,
            Elastic.accessCnt,
            Elastic.usingTime,
            Elastic.createdDate,
            Elastic.deviceSt,
            Elastic.retentionDay,
            Elastic.pageEndTm
    };

    // 기본 정보 //

    // 기기번호
    private String deviceId;
    // 고객 ID
    private String userId;
    // 고객 번호
    private String clientNo;
    // 고객 성명
    private String clientNm;
    // 고객 분류
    private String clientDiv;
    // 전화번호
    private String phoneNo;
    // 주민번호
    private String residenceNo;
    // 이메일
    private String email;
    // 접속 위치
    private String timezone;

    // 방문 정보 //

    // 최초 방문
    private String createdDate;
    // 마지막 방문
    private String updatedDate;
    // 총 방문일 수
    private Integer totalVisitCount;
    // 재방문
    private Integer revisitCount;
    // 평균 체류시간
    private Long avgStayTime;
    // 총 체류시간
    private Long totalStayTime;
    // 휴면 상태
    private String deviceSt;

    // 기기 정보 //

    // 앱 버전
    private String appVer;
    // OS 유형
    private String osType;
    // OS 버전
    private String osVer;
    // 웹 뷰 버전
    private String webviewVer;
    // 앱 빌드 번호
    private String appBuildNum;
    // 장치 모델
    private String deviceModel;
    // 네트워크 타입
    private String comType;
    // 통신 사업자 명
    private String simOperatorNm;
    // 통신 감도
    private Integer comSensitivity;
    // 로그 유형
    private Integer logType;

    // 휴면 일자
    private int sleepDate;
}
