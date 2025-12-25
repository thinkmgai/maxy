package com.thinkm.maxy.dto.front.dashboard.feeldex;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@Schema(description = "Feeldex 설정 응답 DTO")
public class FeeldexResponseDto {
    @Schema(description = "LCP 임계값 (%)", example = "40")
    private int lcp;

    @Schema(description = "INP 임계값 (%)", example = "30")
    private int inp;

    @Schema(description = "CLS 임계값 (%)", example = "30")
    private int cls;
}