package com.thinkm.maxy.dto.front.dashboard.area;

import com.thinkm.common.util.Elastic;
import com.thinkm.maxy.dto.front.common.DefaultRequestDto;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;

@Getter
@Setter
@Schema(description = "지역 목록 조회 요청 DTO")
public class AreaRequestDto extends DefaultRequestDto {
    @Schema(description = "지역 코드 (선택)", example = "KR")
    private String locationCode;

    public void addLocationCodeToFilter(BoolQueryBuilder boolQueryBuilder) {
        if (locationCode == null || locationCode.isBlank()) return;
        boolQueryBuilder.filter(QueryBuilders.termQuery(Elastic.locationCode, this.locationCode));
    }
}