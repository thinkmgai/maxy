package com.thinkm.maxy.dto.front.user;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.thinkm.common.util.Elastic;
import com.thinkm.common.util.JsonUtil;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Schema(description = "사용자 목록 응답 DTO")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class UserListResponseDto {

    @ArraySchema(schema = @Schema(implementation = UserInfo.class, description = "사용자 정보 항목"))
    private List<UserInfo> users;

    @Getter
    @Setter
    @Schema(description = "사용자 목록 항목 DTO")
    public static class UserInfo {
        @JsonIgnore
        public static final String[] FIELDS = {
                Elastic.appBuildNum,
                Elastic.appVer,
                Elastic.clientNm,
                Elastic.clientNo,
                Elastic.deviceId,
                Elastic.deviceModel,
                Elastic.ip,
                Elastic.logTm,
                Elastic.logType,
                Elastic.maxySessionId,
                Elastic.osType,
                Elastic.osVer,
                Elastic.packageNm,
                Elastic.platform,
                Elastic.serverType,
                Elastic.simOperatorNm,
                Elastic.timezone,
                Elastic.userId,
                Elastic.userNm,
                Elastic.userNo,
                Elastic.webviewVer,
        };
        @Schema(description = "앱 빌드 번호", example = "12345")
        private String appBuildNum;
        @Schema(description = "앱 버전", example = "2.3.1")
        private String appVer;
        @Schema(description = "고객명", example = "홍길동")
        private String clientNm;
        @Schema(description = "고객 번호", example = "client-001")
        private String clientNo;
        @Schema(description = "디바이스 ID", example = "device-123")
        private String deviceId;
        @Schema(description = "디바이스 모델명", example = "SM-G998N")
        private String deviceModel;
        @Schema(description = "IP 주소", example = "192.168.0.1")
        private String ip;
        @Schema(description = "로그 수집 시각", example = "2024-07-02T10:00:00Z")
        private String logTm;
        @Schema(description = "로그 타입", example = "131073")
        private String logType;
        @Schema(description = "MAXY 세션 ID", example = "session-1234")
        private String maxySessionId;
        @Schema(description = "OS 타입", example = "android")
        private String osType;
        @Schema(description = "OS 버전", example = "13")
        private String osVer;
        @Schema(description = "패키지 명", example = "com.thinkm.maxy")
        private String packageNm;
        @Schema(description = "플랫폼", example = "web")
        private String platform;
        @Schema(description = "등록 일시", example = "2024-07-02 10:00:00")
        private String regDt;
        @Schema(description = "서버 타입", example = "prd")
        private String serverType;
        @Schema(description = "통신사명", example = "SKT")
        private String simOperatorNm;
        @Schema(description = "사용자 타임존", example = "Asia/Seoul")
        private String timezone;
        @Schema(description = "마스킹된 사용자 ID", example = "user****")
        private String userId;
        @Schema(description = "사용자명", example = "홍길동")
        private String userNm;
        @Schema(description = "사용자 번호", example = "1001")
        private String userNo;
        @Schema(description = "웹뷰 버전", example = "117.0.0.0")
        private String webviewVer;

        public static UserInfo from(Map<String, Object> source) {
            try {
                return JsonUtil.convertValue(source, UserInfo.class);
            } catch (Exception e) {
                return new UserInfo();
            }
        }
    }
}
