package com.thinkm.maxy.dto.front.dashboard.network;

import com.thinkm.common.util.Elastic;
import com.thinkm.common.util.JsonUtil;
import com.thinkm.maxy.dto.front.common.TimeSeriesChart;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@Schema(description = "네트워크 목록 응답 DTO")
public class NetworkListResponseDto {
    public static final String[] FIELDS = {
            Elastic.deviceId,
            Elastic.userId,
            Elastic.mxPageId,
            Elastic.reqUrl,
            Elastic.intervaltime,
            Elastic.logTm,
            Elastic.statusCode,
            Elastic.statusCodeGroup,
            Elastic.pageUrl
    };
    @Schema(description = "전체 건수", example = "1000")
    private Long totalHits;

    @Schema(description = "평균 응답시간 (ms)", example = "250.5")
    private Double avg;

    @Schema(description = "네트워크 데이터 목록")
    private List<NetworkListData> data;

    @Schema(description = "시계열 차트 데이터")
    private TimeSeriesChart chartData;

    @Getter
    @Setter
    @Schema(description = "네트워크 목록 항목")
    public static class NetworkListData {
        @Schema(description = "문서 ID", example = "abc123")
        private String docId;

        @Schema(description = "디바이스 ID", example = "device123")
        private String deviceId;

        @Schema(description = "사용자 ID", example = "user001")
        private String userId;

        @Schema(description = "페이지 ID", example = "page123")
        private String mxPageId;

        @Schema(description = "요청 URL", example = "https://api.example.com/data")
        private String reqUrl;

        @Schema(description = "응답시간 (ms)", example = "250")
        private Integer intervaltime;

        @Schema(description = "로그 시간 (Unix timestamp)", example = "1672531200000")
        private Long logTm;

        @Schema(description = "HTTP 상태 코드", example = "200")
        private String statusCode;

        @Schema(description = "상태 코드 그룹", example = "2xx")
        private String statusCodeGroup;

        @Schema(description = "페이지 URL", example = "https://example.com/page")
        private String pageUrl;

        public static NetworkListData from(String docId, Map<String, Object> map) {
            try {
                NetworkListData data = JsonUtil.convertValue(map, NetworkListData.class);
                data.setDocId(docId);
                return data;
            } catch (Exception e) {
                return new NetworkListData();
            }
        }
    }
}