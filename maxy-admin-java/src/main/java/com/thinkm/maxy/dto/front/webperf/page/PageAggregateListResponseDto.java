package com.thinkm.maxy.dto.front.webperf.page;

import com.thinkm.maxy.model.front.MarkedItem;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "웹 성능 페이지 집계 응답 DTO")
public class PageAggregateListResponseDto {
    @Schema(description = "집계된 페이지 목록")
    private List<ListData> list;
    @Schema(description = "다음 페이지 조회를 위한 afterKey")
    private String afterKey;

    @Getter
    @SuperBuilder
    @Schema(allOf = MarkedItem.class)
    public static class ListData extends MarkedItem {
        @Schema(description = "집계 건수", example = "120")
        private Long count;
        @Schema(description = "평균 로딩 시간(ms)", example = "1450.5")
        private Double loadingTime;
        @Schema(description = "사용자 수", example = "80")
        private Double userCount;
        @Schema(description = "평균 LCP", example = "1.8")
        private Double lcp;
        @Schema(description = "평균 INP", example = "180.0")
        private Double inp;
        @Schema(description = "평균 CLS", example = "0.08")
        private Double cls;
    }
}
