package com.thinkm.maxy.dto.front.dashboard.user;

import com.thinkm.maxy.dto.front.common.DefaultRequestDto;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "사용자 상세 조회 요청 DTO")
public class UserDetailRequestDto extends DefaultRequestDto {
    @Schema(description = "문서 ID (필수)", required = true, example = "abc123")
    private String docId;
}