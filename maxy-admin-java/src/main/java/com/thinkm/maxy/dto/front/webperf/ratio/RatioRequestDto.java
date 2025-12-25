package com.thinkm.maxy.dto.front.webperf.ratio;

import com.thinkm.maxy.dto.front.common.DefaultRequestDto;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;

@Schema(description = "웹 성능 비율 데이터 조회 요청 DTO")
@Getter
public class RatioRequestDto extends DefaultRequestDto {
    @Getter
    @Schema(description = "비율 데이터 타입")
    public enum DataType {
        PLATFORM,
        OS,
        BROWSER,
        BROWSER_VERSION,
    }
}
