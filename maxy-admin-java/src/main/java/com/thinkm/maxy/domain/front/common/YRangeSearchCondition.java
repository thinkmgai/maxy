package com.thinkm.maxy.domain.front.common;

import io.swagger.v3.oas.annotations.media.Schema;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;

public record YRangeSearchCondition(

        @Schema(description = "Y축 최소값 시간 (ms)", example = "0")
        Long yFrom,
        @Schema(description = "Y축 최대값 시간 (ms)", example = "1000")
        Long yTo
) {
    public void addYRangeToFilter(BoolQueryBuilder boolQueryBuilder, String field) {
        if (this.yFrom != null && this.yTo != null
            && this.yFrom >= 0 && this.yTo >= 0) {
            boolQueryBuilder.filter(QueryBuilders
                    .rangeQuery(field)
                    .gte(this.yFrom)
                    .lte(this.yTo));
        }
    }
}
