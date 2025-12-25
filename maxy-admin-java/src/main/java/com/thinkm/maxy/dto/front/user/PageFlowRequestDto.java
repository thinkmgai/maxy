package com.thinkm.maxy.dto.front.user;

import com.thinkm.maxy.dto.front.common.DefaultRequestDto;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;

import java.util.Map;

@Schema(description = "사용자 페이지 플로우 목록 조회 요청 DTO")
@Getter
@Setter
@RequiredArgsConstructor
public class PageFlowRequestDto extends DefaultRequestDto {
    @Schema(description = "검색 유형", example = "userId")
    private String searchType;

    @Schema(description = "검색 값", example = "user123")
    private String searchValue;

    @Schema(description = "복수 검색 파라미터 맵", example = "{\"packageNm\":\"com.thinkm.maxy\"}")
    private Map<String, String> searchValues;

    @Schema(description = "페이지 ID. 이 값이 있으면 from/to 대신 이 값으로 조회", example = "12345")
    private String mxPageId;

    @Schema(hidden = true)
    private Long parentLogDate;

    // 상호배타 조건: mxPageId가 있거나, from/to가 모두 있어야 함
    public boolean isValid() {
        if (mxPageId != null) return true;
        return this.getFrom() != null && this.getTo() != null && this.getFrom() <= this.getTo();
    }
}
