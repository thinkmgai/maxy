package com.thinkm.maxy.dto.front.webperf.page;

import com.thinkm.maxy.dto.front.common.DefaultRequestDto;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "웹 성능 페이지 집계 목록 조회 요청 DTO")
@Getter
@Setter
public class PageAggregateListRequestDto extends DefaultRequestDto {
    @Schema(description = "요청 URL 필터", example = "/page/foo")
    private String reqUrl;

    @Schema(description = "페이징 키", example = "Stringify JSON")
    private String afterKey;

    @Schema(description = "즐겨찾기 검색 여부", example = "true")
    private boolean mark;
}
