package com.thinkm.maxy.dto.front.webperf.page;

import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.util.Elastic;
import com.thinkm.maxy.dto.front.common.DefaultRequestDto;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;

import java.util.Set;

@Schema(description = "웹 성능 Raw 로그 목록 조회 요청 DTO")
@Getter
@Setter
public class PageRawListRequestDto extends DefaultRequestDto {
    private static final Set<String> FIELDS = Set.of(
            Elastic.osType,
            Elastic.platform,
            Elastic.deviceModel,
            Elastic.reqUrl
    );

    @Schema(description = "요청 유형", example = "osType, platform, deviceModel, reqUrl")
    private String searchType;

    @Schema(description = "요청 값", example = "Windows")
    private String searchValue;

    public void addSearchFilter(BoolQueryBuilder boolQueryBuilder) {
        String type = this.searchType;
        if (type != null && this.searchValue != null
            && !type.isBlank() && !this.searchValue.isBlank()) {
            if (!FIELDS.contains(type)) {
                throw new BadRequestException(ReturnCode.ERR_WRONG_PARAMS);
            }
            if (Elastic.reqUrl.equalsIgnoreCase(type)) {
                type = type + ".raw";
            }
            boolQueryBuilder.filter(QueryBuilders.termQuery(type, this.searchValue));
        }
    }
}
