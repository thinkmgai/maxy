package com.thinkm.maxy.dto.front.common;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "문서 ID 기반 상세 조회 요청 DTO")
@Getter
@Setter
public class DocumentIdRequestDto extends DefaultRequestDto {
    @Schema(description = "Elasticsearch 문서 ID", example = "F5NrAokB3V0RkD4bGd1P")
    private String docId;
}
