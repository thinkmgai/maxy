package com.thinkm.maxy.dto.front.user;

import com.thinkm.maxy.dto.front.common.DefaultRequestDto;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Schema(description = "사용자 목록 조회 요청 DTO")
@Getter
@Setter
@ToString
@RequiredArgsConstructor
public class UserListRequestDto extends DefaultRequestDto {
    @Schema(description = "검색 유형", example = "userId")
    private String searchType;
    @Schema(description = "검색 값", example = "user123")
    private String searchValue;
}
