package com.thinkm.maxy.dto.front.user;

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

@Schema(description = "사용자 페이지 플로우 응답 DTO")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class PageFlowResponseDto {
    public static final String[] FIELDS = {
            Elastic.packageNm,
            Elastic.serverType,
            Elastic.deviceId,
            Elastic.deviceModel,
            Elastic.simOperatorNm,
            Elastic.timezone,
            Elastic.osVer,
            Elastic.osType,
            Elastic.userId,
            Elastic.userNm,
            Elastic.clientNo,
            Elastic.reqUrl,
            Elastic.preUrl,
            Elastic.aliasValue,
            Elastic.flowOrder,
            Elastic.logType,
            Elastic.requestCount,
            Elastic.crashCount,
            Elastic.eventCount,
            Elastic.jsErrorCount,
            Elastic.errorCount,
            Elastic.intervaltime,
            Elastic.eventIntervaltime,
            Elastic.loadingTime,
            Elastic.responseTime,
            Elastic.parentLogDate,
            Elastic.pageStartTm,
            Elastic.pageEndTm,
            Elastic.mxPageId
    };

    @ArraySchema(arraySchema = @Schema(description = "페이지 플로우 단계별 페이지 목록"), minItems = 0)
    private List<List<PageInfo>> pages;

    @Getter
    @Schema(description = "사용자 페이지 플로우 상세 정보")
    public static class PageInfo {
        @Setter
        @Schema(description = "문서 ID", example = "abc123")
        private String docId;
        @Schema(description = "패키지 명", example = "com.thinkm.maxy")
        private String packageNm;
        @Schema(description = "서버 타입", example = "prd")
        private String serverType;
        @Schema(description = "디바이스 ID", example = "device-123")
        private String deviceId;
        @Schema(description = "디바이스 모델명", example = "SM-G998N")
        private String deviceModel;
        @Schema(description = "통신사명", example = "SKT")
        private String simOperatorNm;
        @Schema(description = "사용자 타임존", example = "Asia/Seoul")
        private String timezone;
        @Schema(description = "OS 버전", example = "13")
        private String osVer;
        @Schema(description = "OS 타입", example = "android")
        private String osType;
        @Setter
        @Schema(description = "마스킹된 사용자 ID", example = "user****")
        private String userId;
        @Schema(description = "사용자명", example = "홍길동")
        private String userNm;
        @Schema(description = "클라이언트 번호", example = "client-1")
        private String clientNo;
        @Schema(description = "요청 URL", example = "/page/detail")
        private String reqUrl;
        @Schema(description = "이전 페이지 URL", example = "/page/list")
        private String preUrl;
        @Schema(description = "페이지 별칭", example = "메인")
        private String aliasValue;
        @Schema(description = "플로우 순서", example = "1")
        private String flowOrder;
        @Schema(description = "로그 타입", example = "134217728")
        private Integer logType;
        @Schema(description = "요청 수", example = "10")
        private Integer requestCount;
        @Schema(description = "크래시 수", example = "0")
        private Integer crashCount;
        @Schema(description = "이벤트 수", example = "3")
        private Integer eventCount;
        @Schema(description = "JS 에러 수", example = "1")
        private Integer jsErrorCount;
        @Schema(description = "에러 수", example = "1")
        private Integer errorCount;
        @Schema(description = "페이지 간 이동 간격 (ms)", example = "4000")
        private Integer intervaltime;
        @Schema(description = "이벤트 간 이동 간격 (ms)", example = "1200")
        private Integer eventIntervaltime;
        @Schema(description = "로딩시간 (ms)", example = "1400")
        private Integer loadingTime;
        @Schema(description = "응답시간 (ms)", example = "500")
        private Integer responseTime;
        @Schema(description = "상위 로그 수집 시각", example = "2024-07-02T10:00:00Z")
        private String parentLogDate;
        @Schema(description = "페이지 시작 시간 (epoch milli)", example = "1719878500000")
        private Long pageStartTm;
        @Schema(description = "페이지 종료 시간 (epoch milli)", example = "1719878540000")
        private Long pageEndTm;
        @Schema(description = "MAXY 페이지 ID", example = "1234567")
        private String mxPageId;

        public static PageInfo from(Map<String, Object> source) {
            try {
                return JsonUtil.convertValue(source, PageInfo.class);
            } catch (Exception e) {
                return new PageInfo();
            }
        }
    }
}
