package com.thinkm.maxy.dto.front.user;

import com.thinkm.maxy.dto.front.common.DefaultRequestDto;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Schema(description = "사용자 페이지 상세/이벤트 조회 요청 DTO")
@Getter
@Setter
@ToString
@RequiredArgsConstructor
public class PageFlowDetailRequestDto extends DefaultRequestDto {
    @Schema(description = "문서 ID", example = "abc123")
    private String docId;
}
