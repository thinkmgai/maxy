package com.thinkm.maxy.dto.front.webperf.vital;

import com.thinkm.maxy.dto.front.common.DefaultRequestDto;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;

@Schema(description = "웹 성능 Vital 지표 조회 요청 DTO")
@Getter
public class VitalRequestDto extends DefaultRequestDto {
}
