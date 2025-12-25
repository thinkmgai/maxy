package com.thinkm.maxy.dto.front.webperf.page;

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

@Schema(description = "웹 성능 Raw 페이지 목록 응답 DTO")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PageRawListResponseDto {
    public static final String[] FIELDS = {
            Elastic.deviceId,
            Elastic.mxPageId,
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
    @Schema(description = "전체 문서 수", example = "250")
    private Long totalHits;
    @Schema(description = "평균 로딩시간", example = "1500.5")
    private Double avg;
    @ArraySchema(schema = @Schema(implementation = PageListData.class, description = "Raw 페이지 데이터 목록"))
    private List<PageRawListResponseDto.PageListData> data;

    @Getter
    @Setter
    @Schema(description = "웹 성능 Raw 페이지 항목 DTO")
    public static class PageListData {
        @Schema(description = "문서 ID", example = "abc123")
        private String docId;
        @Schema(description = "디바이스 ID", example = "device-123")
        private String deviceId;
        @Schema(description = "LCP 값", example = "1.8")
        private Double lcp;
        @Schema(description = "CLS 값", example = "0.04")
        private Double cls;
        @Schema(description = "INP 값", example = "150.0")
        private Double inp;
        @Schema(description = "TTFB 값", example = "0.5")
        private Double ttfb;
        @Schema(description = "FCP 값", example = "1.1")
        private Double fcp;
        @Schema(description = "MAXY 페이지 ID", example = "1234567")
        private String mxPageId;
        @Schema(description = "요청 URL", example = "/page/foo")
        private String reqUrl;
        @Schema(description = "로딩시간 (ms)", example = "1500")
        private Integer loadingTime;
        @Schema(description = "페이지 간 이동 간격 (ms)", example = "4000")
        private Integer intervaltime;
        @Schema(description = "Feeldex 수치", example = "1~4")
        private Integer feeldex;
        @Schema(description = "세션 ID", example = "-9081633664255926070")
        private String maxySessionId;
        @Schema(description = "페이지 시작 시간", example = "1760941384066")
        private Long pageStartTm;

        @Schema(description = "Waterfall 여부", example = "Y/N")
        private String wtfFlag;

        public static PageRawListResponseDto.PageListData from(String docId, Map<String, Object> map) {
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
