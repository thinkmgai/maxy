package com.thinkm.maxy.dto.front.webperf.error;

import com.thinkm.maxy.dto.front.common.DefaultRequestDto;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "Error 요청 집계 목록 조회 요청 DTO")
@Getter
@Setter
public class ErrorAggregateListRequestDto extends DefaultRequestDto {
    @Schema(description = "에러 메시지", example = "Script Error.")
    private String resMsg;

    @Schema(description = "페이징 키", example = "Stringify JSON")
    private String afterKey;

    @Schema(description = "즐겨찾기 검색 여부", example = "true")
    private boolean mark;
}
