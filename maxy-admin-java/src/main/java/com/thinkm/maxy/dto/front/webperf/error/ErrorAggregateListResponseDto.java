package com.thinkm.maxy.dto.front.webperf.error;

import com.thinkm.maxy.model.front.MarkedItem;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "웹 성능 에러 집계 응답 DTO")
public class ErrorAggregateListResponseDto {
    @Schema(description = "집계된 에러 목록")
    private List<ListData> list;
    @Schema(description = "다음 페이지 조회를 위한 afterKey")
    private String afterKey;

    @Getter
    @Setter
    @SuperBuilder
    @Schema(allOf = MarkedItem.class)
    public static class ListData extends MarkedItem {
        @Schema(description = "집계 건수", example = "200")
        private Long count;
//        private Double responseTime;
        @Schema(description = "사용자 수", example = "80")
        private Double userCount;
    }
}
