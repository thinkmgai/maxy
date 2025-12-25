package com.thinkm.maxy.domain.front.common;

import com.thinkm.common.util.Elastic;
import io.swagger.v3.oas.annotations.media.Schema;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;

public record AreaSearchCondition(

        @Schema(description = "지역 코드 (선택)", example = "KR")
        String locationCode
) {
    public void addLocationCodeToFilter(BoolQueryBuilder boolQueryBuilder) {
        if (locationCode == null || locationCode.isBlank()) return;
        boolQueryBuilder.filter(QueryBuilders.termQuery(Elastic.locationCode, this.locationCode));
    }
}
