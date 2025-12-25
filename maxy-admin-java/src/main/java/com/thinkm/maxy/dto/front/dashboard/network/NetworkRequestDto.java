package com.thinkm.maxy.dto.front.dashboard.network;

import com.thinkm.maxy.dto.front.dashboard.area.AreaRequestDto;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "네트워크 목록 조회 요청 DTO")
public class NetworkRequestDto extends AreaRequestDto {
    @Schema(description = "Y축 최소값 - 응답시간 (ms)", example = "0")
    private Long yFrom;

    @Schema(description = "Y축 최대값 - 응답시간 (ms)", example = "1000")
    private Long yTo;

    @Schema(description = "Request URL", example = "/api/foo")
    private String reqUrl;
}