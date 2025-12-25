package com.thinkm.maxy.dto.front.bi;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Schema(description = "BI 웹 바이탈 지표 응답 DTO")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BiVitalResponseDto extends BiResponseDto {

    @ArraySchema(schema = @Schema(implementation = VitalData.class, description = "요청 URL 별 바이탈 데이터"))
    private List<VitalData> data;

    @Getter
    @Setter
    @Schema(description = "바이탈 지표 데이터")
    public static class VitalData {
        @Schema(description = "대상 요청 URL", example = "/page/home")
        private String reqUrl;
        @Schema(description = "지표 평균값", example = "1.23")
        private Double avg;
        @Schema(description = "표본 개수", example = "42")
        private Long count;
    }
}
