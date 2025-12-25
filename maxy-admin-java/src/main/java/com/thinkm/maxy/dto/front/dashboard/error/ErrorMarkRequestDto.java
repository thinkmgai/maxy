package com.thinkm.maxy.dto.front.dashboard.error;

import com.thinkm.maxy.dto.front.common.ReadStatusRequestDto;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
@Schema(description = "에러 읽음 표시 요청 DTO")
public class ErrorMarkRequestDto extends ReadStatusRequestDto {

    {
        setType("error");
    }

    public ErrorMarkRequestDto(String packageNm, String serverType, Long hash) {
        super(packageNm, serverType, "error", hash);
    }
}