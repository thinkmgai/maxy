package com.thinkm.maxy.dto.front.dashboard.network;

import com.thinkm.maxy.dto.front.common.DocumentIdRequestDto;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "네트워크 상세 조회 요청 DTO")
public class NetworkDetailRequestDto extends DocumentIdRequestDto {
    @Schema(description = "문서 ID (필수)", example = "abc123", requiredMode = Schema.RequiredMode.REQUIRED)
    private String docId;
}