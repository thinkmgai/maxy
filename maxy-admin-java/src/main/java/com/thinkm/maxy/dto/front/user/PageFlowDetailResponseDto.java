package com.thinkm.maxy.dto.front.user;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.Elastic;
import com.thinkm.common.util.JsonUtil;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class PageFlowDetailResponseDto {

    private List<EventInfo> events;
    private PageInfo pageInfo;
    private ChartData chartData;

    @Getter
    @Setter
    @RequiredArgsConstructor
    @Schema(description = "차트 데이터")
    public static class ChartData {
        @Schema(description = "평균 응답시간 (ms)", example = "250.5")
        private Double avg = 0D;

        @Schema(description = "총 개수", example = "100")
        private Long count = 0L;

        @Schema(description = "시계열 차트 데이터")
        private List<Object[]> chart = new ArrayList<>();
    }

    @Getter
    @Setter
    @RequiredArgsConstructor
    public static class EventInfo {
        @JsonIgnore
        public static final String[] FIELDS = {
                Elastic.userId,
                Elastic.userNm,
                Elastic.clientNo,
                Elastic.reqUrl,
                Elastic.resMsg,
                Elastic.preUrl,
                Elastic.logType,
                Elastic.intervaltime,
                Elastic.logTm,
                Elastic.parentLogDate,
                Elastic.mxPageId
        };

        @Setter
        private String docId;
        private String userId;
        private String userNm;
        private String clientNo;
        private String reqUrl;
        private String resMsg;
        private String preUrl;
        private Integer logType;
        private Integer intervaltime;
        private Long logTm;
        private String parentLogDate;
        private String mxPageId;

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
    @RequiredArgsConstructor
    public static class PageInfo {
        @JsonIgnore
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
                Elastic.mxPageId,
                Elastic.maxySessionId,
                Elastic.wtfFlag,
        };

        private String docId;
        private String packageNm;
        private String serverType;
        private String deviceId;
        private String deviceModel;
        private String simOperatorNm;
        private String timezone;
        private String osVer;
        private String osType;
        private String userId;
        private String userNm;
        private String clientNo;
        private String reqUrl;
        private String preUrl;
        private String aliasValue;
        private String flowOrder;
        private Integer logType;
        private Integer requestCount;
        private Integer crashCount;
        private Integer eventCount;
        private Integer jsErrorCount;
        private Integer errorCount;
        private Integer intervaltime;
        private Integer eventIntervaltime;
        private Integer loadingTime;
        private Integer responseTime;
        private Integer feeldex;
        private String parentLogDate;
        private Long pageStartTm;
        private Long pageEndTm;
        private String mxPageId;
        private String maxySessionId;
        private String ip;
        private String platform;
        private Double lcp;
        private Double cls;
        private Double inp;
        private Double ttfb;
        private Double fcp;
        private String wtfFlag;

        public static PageInfo from(Map<String, Object> map, boolean userIdMasking, Map<String, Long> avgMap) {
            try {
                PageInfo result = JsonUtil.convertValue(map, PageInfo.class);
                if (avgMap != null) {
                    result.setFeeldex(CommonUtil.feeldex(avgMap.get("A"), result.getLoadingTime()));
                }
                result.setUserId(CommonUtil.maskUserId(result.getUserId(), userIdMasking, 2));
                return result;
            } catch (Exception e) {
                return new PageInfo();
            }
        }
    }
}
