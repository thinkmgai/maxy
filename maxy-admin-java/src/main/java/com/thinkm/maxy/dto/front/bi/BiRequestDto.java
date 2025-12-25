package com.thinkm.maxy.dto.front.bi;

import com.thinkm.maxy.dto.front.common.DefaultRequestDto;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Schema(description = "BI 데이터를 조회하기 위한 요청 DTO")
@Getter
@Setter
@ToString
public class BiRequestDto extends DefaultRequestDto {
    @Schema(description = "조회 기준 날짜 타입", example = "DAY")
    private DateType dateType;
    @Schema(description = "필터링할 요청 URL", example = "/dashboard")
    private String reqUrl;

    @Getter
    @AllArgsConstructor
    @Schema(description = "BI 데이터 유형")
    public enum Type {
        NEW("countNew"),
        DAU("countDau"),
        MAU("countMau"),
        CCU("countCcu"),
        USING_TIME("avgUseTime"),
        REVISIT("countRevisit"),
        PV("countPv"),
        LCP("avgLcp"),
        INP("avgInp"),
        CLS("avgCls"),
        FCP("avgFcp"),
        TTFB("avgTtfb"),
//        ERROR("countError")
        ;

        private final String column;
    }

    @Schema(description = "기간 구분 타입")
    public enum DateType {
        DAY, DATE,
    }
}
