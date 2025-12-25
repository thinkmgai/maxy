package com.thinkm.maxy.dto.front.dashboard.page;

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
@Schema(description = "페이지 목록 응답 DTO")
public class PageListResponseDto {
    public static final String[] FIELDS = {
            Elastic.deviceId,
            Elastic.userId,
            Elastic.mxPageId,
            Elastic.reqUrl,
            Elastic.loadingTime,
            Elastic.intervaltime,
            Elastic.pageStartTm,
            Elastic.pageEndTm,
            Elastic.lcp,
            Elastic.cls,
            Elastic.inp,
            Elastic.ttfb,
            Elastic.fcp,
            Elastic.maxySessionId,
            Elastic.wtfFlag
    };
    @Schema(description = "전체 건수", example = "1000")
    private Long totalHits;

    @Schema(description = "평균 로딩시간 (ms)", example = "1500.5")
    private Double avg;

    @Schema(description = "페이지 데이터 목록")
    private List<PageListData> data;

    @Schema(description = "시계열 차트 데이터")
    private TimeSeriesChart chartData;

    @Getter
    @Setter
    @Schema(description = "페이지 목록 항목")
    public static class PageListData {
        @Schema(description = "문서 ID", example = "abc123")
        private String docId;

        @Schema(description = "디바이스 ID", example = "device123")
        private String deviceId;

        @Schema(description = "사용자 ID", example = "user001")
        private String userId;

        @Schema(description = "LCP (Largest Contentful Paint, ms)", example = "2500.5")
        private Double lcp;

        @Schema(description = "CLS (Cumulative Layout Shift)", example = "0.1")
        private Double cls;

        @Schema(description = "INP (Interaction to Next Paint, ms)", example = "200.0")
        private Double inp;

        @Schema(description = "TTFB (Time to First Byte, ms)", example = "300.5")
        private Double ttfb;

        @Schema(description = "FCP (First Contentful Paint, ms)", example = "1000.5")
        private Double fcp;

        @Schema(description = "페이지 ID", example = "page123")
        private String mxPageId;

        @Schema(description = "요청 URL", example = "https://example.com/page")
        private String reqUrl;

        @Schema(description = "로딩시간 (ms)", example = "1500")
        private Integer loadingTime;

        @Schema(description = "페이지 간 이동 간격 (ms)", example = "4000")
        private Integer intervaltime;

        @Schema(description = "Waterfall 여부", example = "Y/N")
        private String wtfFlag;

        @Schema(description = "Feeldex 수치", example = "1~4")
        private Integer feeldex;

        @Schema(description = "세션 ID", example = "-9081633664255926070")
        private String maxySessionId;

        @Schema(description = "페이지 시작 시간", example = "1760941384066")
        private Long pageStartTm;

        public static PageListData from(String docId, Map<String, Object> map) {
            try {
                PageListData data = JsonUtil.convertValue(map, PageListData.class);
                data.setDocId(docId);
                return data;
            } catch (Exception e) {
                return new PageListData();
            }
        }
    }
}