package com.thinkm.maxy.dto.front.webperf.network;

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
@Schema(description = "웹 성능 네트워크 집계 응답 DTO")
public class NetworkAggregateListResponseDto {
    @Schema(description = "집계된 네트워크 목록")
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
        @Schema(description = "평균 응답시간(ms)", example = "320.5")
        private Double responseTime;
        @Schema(description = "사용자 수", example = "150")
        private Double userCount;
        private Long count2xx;
        private Long count4xx;
        private Long count5xx;
    }
}
