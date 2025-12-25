package com.thinkm.maxy.dto.front.dashboard.session;

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

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "세션 상세 응답 DTO")
public class SessionDetailResponseDto {
    @Schema(description = "세션 프로필 정보")
    private Profile detail;

    @Schema(description = "Web Vital 지표")
    private Vital vital;

    @Schema(description = "페이지 목록")
    private List<PageInfo> pages;

    @Schema(description = "이벤트 목록")
    private List<EventInfo> events;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "페이지 정보")
    public static class PageInfo {
        public static final String[] FIELDS = {
                Elastic.deviceId,
                Elastic.mxPageId,
                Elastic.packageNm,
                Elastic.serverType,
                Elastic.pageStartTm,
                Elastic.pageEndTm,
                Elastic.loadingTime,
                Elastic.reqUrl,
                Elastic.lcp,
                Elastic.inp,
                Elastic.cls,
                Elastic.wtfFlag,
        };

        @Schema(description = "Document ID", example = "docId123")
        private String docId;

        @Schema(description = "디바이스 ID", example = "device123")
        private String deviceId;

        @Schema(description = "페이지 ID", example = "page123")
        private String mxPageId;

        @Schema(description = "패키지명", example = "com.example.app")
        private String packageNm;

        @Schema(description = "서버 타입", example = "production")
        private String serverType;

        @Schema(description = "페이지 시작 시간 (Unix timestamp)", example = "1672531200000")
        private Long pageStartTm;

        @Schema(description = "페이지 종료 시간 (Unix timestamp)", example = "1672531205000")
        private Long pageEndTm;

        @Schema(description = "로딩시간 (ms)", example = "1500")
        private Long loadingTime;

        @Schema(description = "요청 URL", example = "https://example.com/page")
        private String reqUrl;

        @Schema(description = "LCP (ms)", example = "2500.5")
        private float lcp;

        @Schema(description = "INP (ms)", example = "200.0")
        private float inp;

        @Schema(description = "CLS", example = "0.1")
        private float cls;

        @Schema(description = "Waterfall Flag", example = "Y/N")
        private String wtfFlag;

        public static PageInfo from(Map<String, Object> source, String docId) {
            try {
                PageInfo info = JsonUtil.convertValue(source, PageInfo.class);
                info.setDocId(docId);
                return info;
            } catch (IllegalArgumentException e) {
                return new PageInfo();
            }
        }
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "이벤트 정보")
    public static class EventInfo {
        public static final String[] FIELDS = {
                Elastic.deviceId,
                Elastic.mxPageId,
                Elastic.packageNm,
                Elastic.serverType,
                Elastic.logTm,
                Elastic.logType,
                Elastic.reqUrl,
                Elastic.intervaltime,
        };

        @Schema(description = "디바이스 ID", example = "device123")
        private String deviceId;

        @Schema(description = "페이지 ID", example = "page123")
        private String mxPageId;

        @Schema(description = "패키지명", example = "com.example.app")
        private String packageNm;

        @Schema(description = "서버 타입", example = "production")
        private String serverType;

        @Schema(description = "로그 시간 (Unix timestamp)", example = "1672531200000")
        private Long logTm;

        @Schema(description = "로그 타입", example = "1")
        private Integer logType;

        @Schema(description = "페이지 URL", example = "https://example.com/page")
        private String reqUrl;

        @Schema(description = "응답시간 (ms)", example = "250")
        private Integer intervaltime;

        public static EventInfo from(Map<String, Object> source) {
            try {
                return JsonUtil.convertValue(source, EventInfo.class);
            } catch (Exception e) {
                return new EventInfo();
            }
        }
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "세션 프로필 정보")
    public static class Profile {
        public static final String[] FIELDS = {
                Elastic.deviceId,
                Elastic.packageNm,
                Elastic.serverType,
                Elastic.parentLogDate,
                Elastic.deviceModel,
                Elastic.webviewVer,
                Elastic.osType,
                Elastic.osVer,
                Elastic.platform,
                Elastic.timezone,
                Elastic.userId,
                Elastic.ip,
        };

        @Schema(description = "디바이스 ID", example = "device123")
        private String deviceId;

        @Schema(description = "패키지명", example = "com.example.app")
        private String packageNm;

        @Schema(description = "서버 타입", example = "production")
        private String serverType;

        @Schema(description = "부모 로그 날짜 (세션 시작 시간)", example = "1672531200000")
        private Long parentLogDate;

        @Schema(description = "상태", example = "online")
        private String status;

        @Schema(description = "네트워크 상태", example = "Normal")
        private String network;

        @Schema(description = "브라우저/디바이스 모델", example = "Chrome")
        private String deviceModel;

        @Schema(description = "브라우저 버전", example = "94.0.4606.61")
        private String webviewVer;

        @Schema(description = "OS 타입", example = "Android")
        private String osType;

        @Schema(description = "OS 버전", example = "11.0")
        private String osVer;

        @Schema(description = "플랫폼 (PC/Mobile/Tablet/Unknown)", example = "Mobile")
        private String platform;

        @Schema(description = "타임존", example = "Asia/Seoul")
        private String timezone;

        @Schema(description = "매핑된 사용자 ID", example = "user123")
        private String userId;

        @Schema(description = "접속 IP 정보", example = "192.168.1.1")
        private String ip;

        public static Profile from(Map<String, Object> source, boolean userIdMasking) {
            try {
                Profile result = JsonUtil.convertValue(source, Profile.class);
                result.setUserId(CommonUtil.maskUserId(result.getUserId(), userIdMasking, 2));
                return result;
            } catch (Exception e) {
                return new Profile();
            }
        }
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @Schema(description = "Web Vital 지표")
    public static class Vital {
        @Schema(description = "LCP (Largest Contentful Paint, ms)", example = "2500.5")
        private Double lcp;

        @Schema(description = "INP (Interaction to Next Paint, ms)", example = "200.0")
        private Double inp;

        @Schema(description = "CLS (Cumulative Layout Shift)", example = "0.1")
        private Double cls;

        @Schema(description = "FCP (First Contentful Paint, ms)", example = "1000.5")
        private Double fcp;

        @Schema(description = "TTFB (Time to First Byte, ms)", example = "300.5")
        private Double ttfb;

        public Vital(Double lcp, Double inp, Double cls) {
            this.lcp = lcp;
            this.inp = inp;
            this.cls = cls;
        }
    }
}