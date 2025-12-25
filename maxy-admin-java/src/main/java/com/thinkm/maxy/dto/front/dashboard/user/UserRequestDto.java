package com.thinkm.maxy.dto.front.dashboard.user;

import com.thinkm.maxy.dto.front.dashboard.area.AreaRequestDto;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "사용자 목록 조회 요청 DTO")
public class UserRequestDto extends AreaRequestDto {

}