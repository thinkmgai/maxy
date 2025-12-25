package com.thinkm.maxy.domain.front.common;

import com.thinkm.common.util.Elastic;
import io.swagger.v3.oas.annotations.media.Schema;
import org.jetbrains.annotations.NotNull;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;

@Schema(description = "공통 App 식별 정보 검색 조건")
public record AppInfoSearchCondition(

        @Schema(description = "패키지 명 또는 서비스 ID", example = "com.thinkm.maxy")
        String packageNm,

        @Schema(description = "서버 타입 코드", example = "0")
        String serverType

) {
    @NotNull
    public BoolQueryBuilder makeBoolQueryForFront() {
        BoolQueryBuilder boolQuery = QueryBuilders.boolQuery();
        boolQuery.filter(QueryBuilders.termQuery(Elastic.packageNm, this.packageNm));
        boolQuery.filter(QueryBuilders.termQuery(Elastic.serverType, this.serverType));

        return boolQuery;
    }
}
