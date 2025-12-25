package com.thinkm.maxy.dto.front.dashboard.common;

import com.thinkm.maxy.dto.front.dashboard.area.AreaRequestDto;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "Res Msg 매개변수 포함 조회 요청 DTO")
public class ResMsgRequestDto extends AreaRequestDto {
    @Schema(description = "Res Msg (선택)", example = "Script Error.")
    private String resMsg;
}