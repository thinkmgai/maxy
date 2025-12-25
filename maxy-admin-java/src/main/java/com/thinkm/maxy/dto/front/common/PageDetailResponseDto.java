package com.thinkm.maxy.dto.front.common;

import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.Elastic;
import com.thinkm.common.util.JsonUtil;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Schema(description = "페이지 상세 정보 및 리소스 데이터를 포함한 응답 DTO")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class PageDetailResponseDto {
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
            Elastic.wtfFlag,
    };
    @Schema(description = "페이지 기본 정보")
    private DetailData detail;

    @Schema(description = "페이지 리소스/에러/성능 정보")
    private ResourceData resources;

    @Schema(description = "페이지 기본 정보 DTO")
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DetailData {
        @Schema(description = "기기 ID", example = "device-1234")
        private String deviceId;
        @Schema(description = "MAXY 페이지 ID", example = "123456789")
        private String mxPageId;
        @Schema(description = "패키지 명", example = "com.thinkm.maxy")
        private String packageNm;
        @Schema(description = "서버 타입", example = "prd")
        private String serverType;
        @Schema(description = "웹뷰 버전", example = "117.0.0.0")
        private String webviewVer;
        @Schema(description = "플랫폼 정보", example = "web")
        private String platform;
        @Schema(description = "OS 타입", example = "android")
        private String osType;
        @Schema(description = "OS 버전", example = "13")
        private String osVer;
        @Schema(description = "디바이스 모델명", example = "SM-G998N")
        private String deviceModel;
        @Schema(description = "사용자 타임존", example = "Asia/Seoul")
        private String timezone;
        @Schema(description = "마스킹 처리된 사용자 ID", example = "user****")
        private String userId;
        @Schema(description = "사용자 IP 주소", example = "192.168.0.1")
        private String ip;
        @Schema(description = "요청 URL", example = "/page/detail")
        private String reqUrl;
        @Schema(description = "페이지 시작 시각 (epoch milli)", example = "1719878500000")
        private Long pageStartTm;
        @Schema(description = "페이지 종료 시각 (epoch milli)", example = "1719878560000")
        private Long pageEndTm;
        @Schema(description = "로딩 시간(ms)", example = "1234")
        private Integer loadingTime;

        @Schema(description = "Waterfall 여부", example = "Y/N")
        private String wtfFlag;

        public static DetailData from(Map<String, Object> source, boolean userIdMasking) {
            if (source == null || source.isEmpty()) {
                return new DetailData();
            }
            try {
                DetailData result = JsonUtil.convertValue(source, DetailData.class);
                result.setUserId(CommonUtil.maskUserId(result.getUserId(), userIdMasking, 2));
                return result;
            } catch (Exception e) {
                return new DetailData();
            }
        }
    }

    @Schema(description = "페이지 리소스/에러/퍼포먼스 정보 DTO")
    @Getter
    @Setter
    @AllArgsConstructor
    public static class ResourceData {
        @Schema(description = "리소스 상세 정보 목록")
        private List<Map<String, Object>> resourceInfoData;
        @Schema(description = "에러 정보 목록")
        private List<Map<String, Object>> errorData;
        @Schema(description = "performance.getEntries() 기반 성능 데이터")
        private Map<String, Object> performanceData;
        @Schema(description = "window.performance.timing 기반 타이밍 데이터")
        private Map<String, Object> timingData;
    }
}
