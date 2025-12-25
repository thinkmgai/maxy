package com.thinkm.maxy.domain.front.common;

import com.thinkm.common.util.Elastic;
import io.swagger.v3.oas.annotations.media.Schema;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;

public record ResMsgSearchCondition(

        @Schema(description = "Result Message (선택)", example = "Script run.")
        String resMsg
) {
    public void addResMsgToFilter(BoolQueryBuilder boolQueryBuilder) {
        if (resMsg == null || resMsg.isBlank()) return;
        boolQueryBuilder.filter(QueryBuilders.termQuery(Elastic.resMsg_raw, this.resMsg));
    }
}
