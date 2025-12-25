package com.thinkm.maxy.dto.front.dashboard.error;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.thinkm.common.util.Elastic;
import com.thinkm.common.util.JsonUtil;
import com.thinkm.maxy.dto.front.common.TimeSeriesChart;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@Schema(description = "에러 목록 응답 DTO")
public class ErrorListResponseDto {

    @Schema(description = "에러 목록 데이터")
    private ListData listData;
    @Schema(description = "시계열 차트 데이터")
    private TimeSeriesChart chartData;

    public ErrorListResponseDto(ListData listData) {
        this.listData = listData;
    }

    public ErrorListResponseDto(ListData listData, TimeSeriesChart chartData) {
        this.listData = listData;
        this.chartData = chartData;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "목록 데이터")
    public static class ListData {
        @Schema(description = "에러 상세 목록")
        List<ListDetail> list;

        @Schema(description = "전체 건수", example = "1000")
        private Long totalHits;
    }

    @Getter
    @Setter
    @RequiredArgsConstructor
    @Schema(description = "에러 목록 항목")
    public static class ListDetail {
        @JsonIgnore
        public static final String[] FIELDS = {
                Elastic.deviceId,
                Elastic.userId,
                Elastic.deviceModel,
                Elastic.mxPageId,
                Elastic.reqUrl,
                Elastic.pageUrl,
                Elastic.logTm,
                Elastic.logType,
                Elastic.resMsg
        };

        @Schema(description = "문서 ID", example = "abc123")
        private String docId;

        @Schema(description = "디바이스 ID", example = "device123")
        private String deviceId;

        @Schema(description = "사용자 ID", example = "user001")
        private String userId;

        @Schema(description = "브라우저 (장치 모델)", example = "Chrome")
        private String deviceModel;

        @Schema(description = "페이지 ID", example = "page123")
        private String mxPageId;

        @Schema(description = "요청 URL", example = "https://api.example.com/data")
        private String reqUrl;

        @Schema(description = "페이지 URL", example = "https://example.com/page")
        private String pageUrl;

        @Schema(description = "로그 시간 (Unix timestamp)", example = "1672531200000")
        private Long logTm;

        @Schema(description = "로그 타입", example = "1")
        private Integer logType;

        @Schema(description = "응답 메시지 (에러 메시지)", example = "Network error")
        private String resMsg;

        public static ListDetail from(String docId, Map<String, Object> map) {
            try {
                ListDetail data = JsonUtil.convertValue(map, ListDetail.class);
                data.setDocId(docId);
                return data;
            } catch (Exception e) {
                return new ListDetail();
            }
        }
    }
}