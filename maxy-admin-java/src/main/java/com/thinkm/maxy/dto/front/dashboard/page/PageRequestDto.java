
package com.thinkm.maxy.dto.front.dashboard.page;

import com.thinkm.common.util.Elastic;
import com.thinkm.maxy.dto.front.dashboard.area.AreaRequestDto;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;

@Getter
@Setter
@Schema(description = "페이지 목록 조회 요청 DTO")
public class PageRequestDto extends AreaRequestDto {
    @Schema(description = "Y축 최소값 - 로딩시간 (ms)", example = "0")
    private Long yFrom;

    @Schema(description = "Y축 최대값 - 로딩시간 (ms)", example = "3000")
    private Long yTo;

    public void addYRangeToFilter(BoolQueryBuilder boolQueryBuilder) {
        if (this.yFrom != null && this.yTo != null) {
            boolQueryBuilder.filter(QueryBuilders
                    .rangeQuery(Elastic.loadingTime)
                    .gte(this.yFrom)
                    .lte(this.yTo));
        }
    }
}