package com.thinkm.maxy.dto.front.common;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;

@Schema(description = "공통 기간 조건을 포함하는 요청 DTO")
@Getter
@Setter
public class DefaultRequestDto extends AppInfoRequestDto {
    @Schema(description = "조회 시작 시간 (epoch milli)", example = "1719878400000")
    private Long from;

    @Schema(description = "조회 종료 시간 (epoch milli)", example = "1719964800000")
    private Long to;

    public void addRangeToFilter(BoolQueryBuilder boolQueryBuilder, String field) {
        boolQueryBuilder.filter(QueryBuilders.rangeQuery(field).gte(this.from).lte(this.to).timeZone("Z"));
    }
}
