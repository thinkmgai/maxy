package com.thinkm.maxy.dto.front.webperf.ratio;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Schema(description = "웹 성능 비율 데이터 응답 DTO")
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class RatioResponseDto {
    @ArraySchema(schema = @Schema(implementation = RatioData.class, description = "차트용 비율 데이터"))
    private List<RatioData> ratio;
    @ArraySchema(schema = @Schema(implementation = DetailData.class, description = "세부 데이터 목록"))
    private List<DetailData> list;

    @Getter
    @AllArgsConstructor
    @Schema(description = "비율 차트 데이터 항목")
    public static class RatioData {
        @Schema(description = "항목 이름", example = "Android")
        private String name;
        @Schema(description = "카운트", example = "120")
        private Long count;
    }

    @Getter
    @Builder
    @Schema(description = "비율 세부 데이터 항목")
    public static class DetailData {
        @Schema(description = "항목 이름", example = "Android")
        private String name;
        @Schema(description = "버전 정보", example = "13")
        private String version; // optional
        @Schema(description = "카운트", example = "120")
        private Long count;
        @Schema(description = "평균 LCP", example = "1.23")
        private Double lcp;
        @Schema(description = "평균 INP", example = "150.0")
        private Double inp;
        @Schema(description = "평균 CLS", example = "0.06")
        private Double cls;
    }
}
