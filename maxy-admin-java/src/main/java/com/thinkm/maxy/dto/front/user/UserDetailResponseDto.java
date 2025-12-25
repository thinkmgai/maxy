package com.thinkm.maxy.dto.front.user;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.DateUtil;
import com.thinkm.common.util.Elastic;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Map;

@Schema(description = "사용자 상세 정보 응답 DTO")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class UserDetailResponseDto {

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
    @Schema(description = "디바이스 ID", example = "device-123")
    private String deviceId;
    // 고객 ID
    @Schema(description = "마스킹된 사용자 ID", example = "user****")
    private String userId;
    // 고객 번호
    @Schema(description = "고객 번호", example = "client-001")
    private String clientNo;
    // 고객 성명
    @Schema(description = "고객 성명", example = "홍길동")
    private String clientNm;
    // 고객 분류
    @Schema(description = "고객 분류", example = "VIP")
    private String clientDiv;
    // 전화번호
    @Schema(description = "전화번호", example = "010-1234-5678")
    private String phoneNo;
    // 주민번호
    @Schema(description = "주민등록번호(마스킹)", example = "900101-1******")
    private String residenceNo;
    // 이메일
    @Schema(description = "이메일 주소", example = "user@example.com")
    private String email;
    // 접속 위치
    @Schema(description = "사용자 타임존", example = "Asia/Seoul")
    private String timezone;

    // 방문 정보 //

    // 최초 방문
    @Schema(description = "최초 방문일", example = "2024-06-01 09:00:00")
    private String createdDate;
    // 마지막 방문
    @Schema(description = "마지막 방문일", example = "2024-07-02 10:00:00")
    private String updatedDate;
    // 총 방문일 수
    @Schema(description = "총 방문일 수", example = "12")
    private Integer totalVisitCount;
    // 재방문
    @Schema(description = "재방문 횟수", example = "5")
    private Integer revisitCount;
    // 평균 체류시간
    @Schema(description = "평균 체류시간(초)", example = "180")
    private Long avgStayTime;
    // 총 체류시간
    @Schema(description = "총 체류시간(초)", example = "3600")
    private Long totalStayTime;
    // 휴면 상태
    @Schema(description = "휴면 상태 코드", example = "ACTIVE")
    private String deviceSt;

    // 기기 정보 //

    // 앱 버전
    @Schema(description = "앱 버전", example = "2.3.1")
    private String appVer;
    // OS 유형
    @Schema(description = "OS 유형", example = "android")
    private String osType;
    // OS 버전
    @Schema(description = "OS 버전", example = "13")
    private String osVer;
    // 웹 뷰 버전
    @Schema(description = "웹뷰 버전", example = "117.0.0.0")
    private String webviewVer;
    // 앱 빌드 번호
    @Schema(description = "앱 빌드 번호", example = "12345")
    private String appBuildNum;
    // 장치 모델
    @Schema(description = "디바이스 모델명", example = "SM-G998N")
    private String deviceModel;
    // 네트워크 타입
    @Schema(description = "네트워크 타입", example = "WIFI")
    private String comType;
    // 통신 사업자 명
    @Schema(description = "통신사명", example = "SKT")
    private String simOperatorNm;
    // 통신 감도
    @Schema(description = "통신 감도", example = "4")
    private Integer comSensitivity;
    // 로그 유형
    @Schema(description = "로그 유형 코드", example = "131073")
    private Integer logType;

    // 휴면 일자
    @Schema(description = "휴면 전환 경과 일", example = "30")
    private int sleepDate;

    public void ofPageLog(Map<String, Object> source, boolean userIdMasking) {
        this.deviceId = CommonUtil.emptyIfNull(source.get(Elastic.deviceId));
        this.userId = CommonUtil.maskUserId(CommonUtil.emptyIfNull(source.get(Elastic.userId)), userIdMasking, 2);
        this.clientNo = CommonUtil.emptyIfNull(source.get(Elastic.clientNo));
        this.clientNm = CommonUtil.emptyIfNull(source.get(Elastic.clientNm));
        this.clientDiv = CommonUtil.emptyIfNull(source.get(Elastic.clientDiv));
        this.phoneNo = CommonUtil.emptyIfNull(source.get(Elastic.phoneNo));
        this.residenceNo = CommonUtil.emptyIfNull(source.get(Elastic.residentNo));
        this.email = CommonUtil.emptyIfNull(source.get(Elastic.email));
        this.timezone = CommonUtil.emptyIfNull(source.get(Elastic.timezone));
        this.appVer = CommonUtil.emptyIfNull(source.get(Elastic.appVer));
        this.osType = CommonUtil.emptyIfNull(source.get(Elastic.osType));
        this.osVer = CommonUtil.emptyIfNull(source.get(Elastic.osVer));
        this.appBuildNum = CommonUtil.emptyIfNull(source.get(Elastic.appBuildNum));
        this.deviceModel = CommonUtil.emptyIfNull(source.get(Elastic.deviceModel));
        this.comType = CommonUtil.convertComType(source.get(Elastic.comType));
        this.simOperatorNm = CommonUtil.emptyIfNull(source.get(Elastic.simOperatorNm));
        this.comSensitivity = CommonUtil.toInteger(source.get(Elastic.avgComSensitivity));
        this.logType = CommonUtil.toInteger(source.get(Elastic.logType));
        this.updatedDate = DateUtil.timestampToDate(
                CommonUtil.toLong(source.get(Elastic.pageEndTm)), DateUtil.DATETIME_WITH_COLON_PATTERN);
    }

    public void ofAccessLog(Map<String, Object> source, long totalCount) {
        Long usingTime = CommonUtil.toLong(source.get(Elastic.usingTime));
        Long accessCnt = CommonUtil.toLong(source.get(Elastic.accessCnt));

        this.totalStayTime = usingTime;
        this.avgStayTime = usingTime / accessCnt;
        this.revisitCount = CommonUtil.toInteger(source.get(Elastic.retentionDay));
        this.webviewVer = CommonUtil.emptyIfNull(source.get(Elastic.webviewVer));
        this.appBuildNum = CommonUtil.emptyIfNull(source.get(Elastic.appBuildNum));
        this.totalVisitCount = CommonUtil.toInteger(totalCount);
    }

    public void ofDeviceInfo(Map<String, Object> source) {
        this.createdDate = DateUtil.timestampToDate(
                CommonUtil.toLong(source.get(Elastic.createdDate)), DateUtil.DATETIME_WITH_COLON_PATTERN);
        this.deviceSt = CommonUtil.emptyIfNull(source.get(Elastic.deviceSt));
    }
}
