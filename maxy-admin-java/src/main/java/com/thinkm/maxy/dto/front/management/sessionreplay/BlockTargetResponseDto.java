package com.thinkm.maxy.dto.front.management.sessionreplay;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Schema(description = "세션 리플레이 차단 대상 목록 응답 DTO")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BlockTargetResponseDto {
    @Schema(description = "차단 대상 목록")
    private List<BlockTargetDetail> list;
    
    @Schema(description = "차단 대상 상세 정보")
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BlockTargetDetail {
        @Schema(description = "시퀀스 번호")
        private Long seq;
        
        @Schema(description = "패키지명", example = "com.thinkm.maxy")
        private String packageNm;
        
        @Schema(description = "서버 타입", example = "0")
        private String serverType;
        
        @Schema(description = "선택자 타입", example = "class")
        private String selector;
        
        @Schema(description = "차단 대상", example = "sensitive-data")
        private String target;
        
        @Schema(description = "비고")
        private String remark;
        
        @Schema(description = "등록일시", example = "20251202160530")
        private String regDt;
        
        @Schema(description = "등록자 번호")
        private Long regNo;
    }
}
