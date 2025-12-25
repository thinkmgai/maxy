package com.thinkm.maxy.dto.front.dashboard.feeldex;

import com.thinkm.maxy.dto.front.common.DefaultRequestDto;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "Feeldex 설정 요청 DTO")
public class FeeldexRequestDto extends DefaultRequestDto {
    @Schema(description = "LCP 임계값 (%)", example = "40", minimum = "0", maximum = "100")
    private int lcp;

    @Schema(description = "INP 임계값 (%)", example = "30", minimum = "0", maximum = "100")
    private int inp;

    @Schema(description = "CLS 임계값 (%)", example = "30", minimum = "0", maximum = "100")
    private int cls;
}