package com.thinkm.maxy.dto.front.dashboard.error;

import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.Elastic;
import com.thinkm.common.util.JsonUtil;
import com.thinkm.common.util.sourcemap.StackMappingResult;
import com.thinkm.maxy.model.front.ReadStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "에러 상세 응답 DTO")
public class ErrorDetailResponseDto {

    @Schema(description = "에러 상세 데이터")
    private DetailData detail;
    @Schema(description = "에러 이전 로그 데이터 목록")
    private List<ErrorDetailResponseDto.EventInfo> events;
    @Schema(description = "해당 로그가 포함된 페이지 존재 여부")
    private boolean hasPage;

    @Getter
    public static class EventInfo {
        public static final String[] FIELDS = {
                Elastic.logTm,
                Elastic.logType,
                Elastic.intervaltime,
                Elastic.reqUrl,
                Elastic.resMsg,
                Elastic.mxPageId,
                Elastic.clickInfo,
                Elastic.maxySessionId
        };

        @Setter
        private String docId;
        private Long logTm;
        private Integer logType;
        private Integer intervaltime;
        private String reqUrl;
        private String resMsg;
        private String mxPageId;
        private String maxySessionId;
        @Schema(description = "Click 데이터 정보", example = "JSON")
        private Map<String, Object> clickInfo;
        private String pageUrl;

        public static EventInfo from(Map<String, Object> source) {
            if (source == null || source.isEmpty()) {
                return new EventInfo();
            }
            try {
                return JsonUtil.convertValue(source, EventInfo.class);
            } catch (Exception e) {
                return new EventInfo();
            }
        }
    }

    @Getter
    @Setter
    @SuperBuilder
    @NoArgsConstructor
    @Schema(description = "에러 상세 정보", allOf = ReadStatus.class)
    public static class DetailData extends ReadStatus {

        @Schema(description = "패키지명", example = "com.example.app")
        private String packageNm;

        @Schema(description = "서버 타입", example = "production")
        private String serverType;

        @Schema(description = "디바이스 ID", example = "device123")
        private String deviceId;

        @Schema(description = "로그 시간 (Unix timestamp)", example = "1672531200000")
        private Long logTm;

        @Schema(description = "로그 타입", example = "1")
        private Integer logType;

        @Schema(description = "응답 메시지 (에러 메시지)", example = "Network error occurred")
        private String resMsg;

        @Schema(description = "source remapping한 에러 메시지", example = "[StackMappingResult]")
        private List<StackMappingResult> mappedErrorStack;

        // 장치 정보
        @Schema(description = "OS 타입", example = "Android")
        private String osType;

        @Schema(description = "OS 버전", example = "11.0")
        private String osVer;

        @Schema(description = "디바이스 모델명", example = "Samsung Galaxy S21")
        private String deviceModel;

        @Schema(description = "플랫폼", example = "Windows")
        private String platform;

        @Schema(description = "웹뷰 버전", example = "94.0.4606.61")
        private String webviewVer;

        @Schema(description = "타임존", example = "Asia/Seoul")
        private String timezone;

        @Schema(description = "사용자 ID", example = "user123")
        private String userId;

        @Schema(description = "IP 주소", example = "192.168.1.1")
        private String ip;

        @Schema(description = "요청 URL", example = "https://api.example.com/data")
        private String reqUrl;

        @Schema(description = "페이지 URL", example = "https://example.com/page")
        private String pageUrl;

        @Schema(description = "페이지키값", example = "example123")
        private String mxPageId;

        public static DetailData from(Map<String, Object> source, boolean userIdMasking) {
            if (source == null || source.isEmpty()) {
                return new DetailData();
            }
            try {
                DetailData item = JsonUtil.convertValue(source, DetailData.class);
                item.setUserId(CommonUtil.maskUserId(item.getUserId(), userIdMasking, 2));
                return item;
            } catch (Exception e) {
                return new DetailData();
            }
        }
    }
}