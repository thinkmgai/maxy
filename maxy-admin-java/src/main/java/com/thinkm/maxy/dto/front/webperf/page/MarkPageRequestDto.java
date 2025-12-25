package com.thinkm.maxy.dto.front.webperf.page;

import com.thinkm.maxy.dto.front.common.DefaultRequestDto;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "웹 성능 페이지 북마크 요청 DTO")
@Getter
@Setter
public class MarkPageRequestDto extends DefaultRequestDto {
    @Schema(description = "대상 페이지 URL", example = "/page/foo")
    private String reqUrl;
    @Schema(description = "true: 북마크 설정, false: 해제", example = "true")
    private boolean mark;
}
