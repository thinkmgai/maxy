package com.thinkm.maxy.dto.front.webperf.vital;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "웹 성능 Vital 지표 응답 DTO")
@Getter
@Setter
public class VitalResponseDto {
    @Schema(description = "Largest Contentful Paint", example = "1.8")
    private Double lcp;
    @Schema(description = "Cumulative Layout Shift", example = "0.04")
    private Double cls;
    @Schema(description = "Interaction to Next Paint", example = "150.0")
    private Double inp;
    @Schema(description = "First Contentful Paint", example = "1.2")
    private Double fcp;
    @Schema(description = "Time to First Byte", example = "0.4")
    private Double ttfb;
}
