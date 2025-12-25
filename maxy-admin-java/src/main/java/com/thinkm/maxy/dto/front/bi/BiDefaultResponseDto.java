package com.thinkm.maxy.dto.front.bi;

import com.thinkm.common.util.JsonUtil;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Schema(description = "BI 기본 응답 DTO. 차트 데이터와 주요 지표 요약을 포함합니다.")
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class BiDefaultResponseDto extends BiResponseDto {

    @ArraySchema(schema = @Schema(description = "차트 데이터 포인트", implementation = Object[].class))
    private List<Object[]> chartData;
    @Schema(description = "지표 요약 데이터 맵 (키: 지표명)")
    private Map<String, BiData> biData;

    @Setter
    @Getter
    @Schema(description = "BI 지표 집계 데이터")
    public static class BiData {
        @Schema(description = "신규 사용자 수")
        private BigDecimal countNew;
        @Schema(description = "일간 활성 사용자 수")
        private BigDecimal countDau;
        @Schema(description = "월간 활성 사용자 수")
        private BigDecimal countMau;
        @Schema(description = "동시 접속자 수")
        private BigDecimal countCcu;
        @Schema(description = "재방문 사용자 수")
        private BigDecimal countRevisit;
        @Schema(description = "에러 건수")
        private BigDecimal countError;
        @Schema(description = "평균 사용 시간(초)")
        private Float avgUseTime;
        @Schema(description = "평균 LCP 값")
        private Float avgLcp;
        @Schema(description = "평균 INP 값")
        private Float avgInp;
        @Schema(description = "평균 CLS 값")
        private Float avgCls;
        @Schema(description = "평균 FCP 값")
        private Float avgFcp;
        @Schema(description = "평균 TTFB 값")
        private Float avgTtfb;

        public static BiData from(Map<String, Object> item) {
            try {
                return JsonUtil.convertValue(item, BiData.class);
            } catch (Exception e) {
                return new BiData();
            }
        }
    }
}
