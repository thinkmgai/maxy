package com.thinkm.maxy.domain.front.common;

import io.swagger.v3.oas.annotations.media.Schema;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;

public record RangeSearchCondition(

        @Schema(description = "조회 시작 시간 (epoch milli)", example = "1719878400000")
        Long from,
        @Schema(description = "조회 종료 시간 (epoch milli)", example = "1719964800000")
        Long to
) {
    public void addRangeToFilter(BoolQueryBuilder boolQueryBuilder, String field) {

        var range = QueryBuilders.rangeQuery(field);

        if (this.from != null) {
            range.gte(this.from);
        }
        if (this.to != null) {
            range.lte(this.to);
        }

        boolQueryBuilder.filter(range.timeZone("Z"));
    }
}
