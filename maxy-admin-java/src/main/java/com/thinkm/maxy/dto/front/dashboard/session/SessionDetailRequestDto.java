package com.thinkm.maxy.dto.front.dashboard.session;

import com.thinkm.maxy.dto.front.common.DefaultRequestDto;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "세션 상세 조회 요청 DTO")
public class SessionDetailRequestDto extends DefaultRequestDto {
    @Schema(description = "디바이스 ID (필수)", required = true, example = "device123")
    private String deviceId;
}