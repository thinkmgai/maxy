package com.thinkm.maxy.dto.front.common;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "읽음 처리 결과를 반환하는 DTO")
@Getter
@Setter
public class ReadStatusResponseDto {
    @Schema(description = "읽음 여부", example = "true")
    private Boolean readFlag;

    @Schema(description = "데이터 구분 해시", example = "1234567890")
    private String hash;

    @Schema(description = "읽음 처리 시각 (epoch milli)", example = "1719900000000")
    private Long readAt;

    @Schema(description = "읽음 처리자 사번/식별자", example = "1001")
    private Long regNo;

    public ReadStatusResponseDto() {
        this.readFlag = false;
    }

    public ReadStatusResponseDto(String hash) {
        this.readFlag = false;
        this.hash = hash;
    }

    public ReadStatusResponseDto(boolean readFlag, Long readAt, Long regNo, String hash) {
        this.readFlag = readFlag;
        this.readAt = readAt;
        this.regNo = regNo;
        this.hash = hash;
    }
}
