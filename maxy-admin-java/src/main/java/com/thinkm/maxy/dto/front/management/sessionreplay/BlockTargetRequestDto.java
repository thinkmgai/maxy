package com.thinkm.maxy.dto.front.management.sessionreplay;

import com.thinkm.maxy.dto.front.common.DefaultRequestDto;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Pattern;
import javax.validation.constraints.Size;

@Schema(description = "세션 리플레이 차단 대상 단건 요청 DTO")
@Getter
@Setter
@EqualsAndHashCode(callSuper = false)
public class BlockTargetRequestDto extends DefaultRequestDto {
    @Schema(description = "시퀀스 번호 (수정 시 필수)")
    private Long seq;
    
    @NotBlank(message = "Selector type is required")
    @Pattern(regexp = "^(id|class)$", message = "Selector type can only be id or class")
    @Schema(description = "선택자 타입", example = "class")
    private String selector;
    
    @NotBlank(message = "Blocking is mandatory")
    @Pattern(regexp = "^[a-zA-Z_-][a-zA-Z0-9_-]*$", message = "It's not the right format")
    @Size(max = 200, message = "Blocking target cannot exceed 200 characters")
    @Schema(description = "차단 대상", example = "sensitive-data")
    private String target;
    
    @Size(max = 500, message = "Remarks cannot exceed 500 characters")
    @Schema(description = "비고")
    private String remark;
}
