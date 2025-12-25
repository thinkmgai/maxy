package com.thinkm.maxy.dto.front.dashboard.error;

import com.thinkm.maxy.dto.front.dashboard.common.ResMsgRequestDto;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "에러 목록 조회 요청 DTO")
public class ErrorRequestDto extends ResMsgRequestDto {
}