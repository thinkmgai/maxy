package com.thinkm.maxy.dto.front.bi;

import com.thinkm.common.util.CommonUtil;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Schema(description = "BI Error 응답 DTO. 차트 데이터와 Error 정보 목록을 포함합니다.")
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class BiErrorResponseDto extends BiResponseDto {

    @ArraySchema(schema = @Schema(description = "차트 데이터 포인트", implementation = Object[].class))
    private List<Object[]> chartData;
    private List<ErrorInfo> list;

    @Getter
    @Builder
    @AllArgsConstructor
    public static class ErrorInfo {
        private String msg;
        private BigDecimal count;
        private BigDecimal rate;
        private Boolean isOther;

        public ErrorInfo(Map<String, Object> map) {
            this.msg = (String) map.get("msg");
            this.count = CommonUtil.toBigDecimal(map.get("count"));
            this.rate = CommonUtil.toBigDecimal(map.get("rate"));
            this.isOther = CommonUtil.toInteger(map.get("isOther")) > 0;
        }
    }
}
