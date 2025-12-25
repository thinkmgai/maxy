package com.thinkm.maxy.dto.front.common;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "공통 App 식별 정보 요청 DTO")
@Getter
@Setter
public class AppInfoRequestDto {
    @Schema(description = "패키지 명 또는 서비스 ID", example = "com.thinkm.maxy")
    private String packageNm;

    @Schema(description = "서버 타입 코드", example = "0, 1, 2")
    private String serverType;
}
