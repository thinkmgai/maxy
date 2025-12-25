package com.thinkm.maxy.dto.front.dashboard.user;

import com.thinkm.common.util.Elastic;
import com.thinkm.common.util.JsonUtil;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "사용자 상세 응답 DTO")
public class UserDetailResponseDto {
    public static final String[] FIELDS = {
            Elastic.deviceId,
            Elastic.mxPageId,
            Elastic.packageNm,
            Elastic.serverType,
            Elastic.webviewVer,
            Elastic.platform,
            Elastic.osType,
            Elastic.osVer,
            Elastic.deviceModel,
            Elastic.timezone,
            Elastic.userId,
            Elastic.ip,
            Elastic.reqUrl,
            Elastic.pageStartTm,
            Elastic.pageEndTm,
            Elastic.loadingTime,
    };
    @Schema(description = "사용자 상세 정보")
    private DetailData detail;

    @Schema(description = "리소스 데이터")
    private ResourceData resources;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "사용자 상세 정보")
    public static class DetailData {
        @Schema(description = "디바이스 ID", example = "device123")
        private String deviceId;

        @Schema(description = "페이지 ID", example = "page123")
        private String mxPageId;

        @Schema(description = "패키지명", example = "com.example.app")
        private String packageNm;

        @Schema(description = "서버 타입", example = "production")
        private String serverType;

        @Schema(description = "웹뷰 버전", example = "94.0.4606.61")
        private String webviewVer;

        @Schema(description = "플랫폼", example = "Mobile")
        private String platform;

        @Schema(description = "OS 타입", example = "Android")
        private String osType;

        @Schema(description = "OS 버전", example = "11.0")
        private String osVer;

        @Schema(description = "디바이스 모델명", example = "Samsung Galaxy S21")
        private String deviceModel;

        @Schema(description = "타임존", example = "Asia/Seoul")
        private String timezone;

        @Schema(description = "사용자 ID", example = "user123")
        private String userId;

        @Schema(description = "IP 주소", example = "192.168.1.1")
        private String ip;

        @Schema(description = "요청 URL", example = "https://example.com/page")
        private String reqUrl;

        @Schema(description = "페이지 시작 시간 (Unix timestamp)", example = "1672531200000")
        private Long pageStartTm;

        @Schema(description = "페이지 종료 시간 (Unix timestamp)", example = "1672531205000")
        private Long pageEndTm;

        @Schema(description = "로딩시간 (ms)", example = "1500")
        private Integer loadingTime;

        public static DetailData from(Map<String, Object> source) {
            if (source == null || source.isEmpty()) {
                return new DetailData();
            }
            try {
                return JsonUtil.convertValue(source, DetailData.class);
            } catch (Exception e) {
                return new DetailData();
            }
        }
    }

    @Getter
    @Setter
    @AllArgsConstructor
    @Schema(description = "리소스 데이터")
    public static class ResourceData {
        @Schema(description = "리소스 정보 목록")
        private List<Map<String, Object>> resourceInfoData;

        @Schema(description = "에러 데이터 목록")
        private List<Map<String, Object>> errorData;

        @Schema(description = "성능 데이터")
        private Map<String, Object> performanceData;

        @Schema(description = "타이밍 데이터")
        private Map<String, Object> timingData;
    }
}