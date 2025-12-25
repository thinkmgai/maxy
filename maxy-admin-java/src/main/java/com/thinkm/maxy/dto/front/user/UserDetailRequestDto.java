package com.thinkm.maxy.dto.front.user;

import com.thinkm.maxy.dto.front.common.DefaultRequestDto;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Schema(description = "사용자 상세 정보 조회 요청 DTO")
@Getter
@Setter
@ToString
@RequiredArgsConstructor
public class UserDetailRequestDto extends DefaultRequestDto {
    @Schema(description = "디바이스 ID", example = "device-123")
    private String deviceId;
}
