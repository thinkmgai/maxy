package com.thinkm.maxy.domain.front.common;

import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.util.Elastic;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;

import java.util.Set;

@Slf4j
public record TypeAndValueSearchCondition(

        @Schema(description = "Search Type", example = "osType, platform, deviceModel, reqUrl")
        String searchType,
        @Schema(description = "Search Value", example = "iOS, Tablet, https://sample.com, etc.")
        String searchValue
) {
    private static final Set<String> FIELDS = Set.of(
            Elastic.osType,
            Elastic.platform,
            Elastic.deviceModel,
            Elastic.reqUrl,
            Elastic.resMsg
    );

    public void addTypeAndValueToFilter(BoolQueryBuilder boolQueryBuilder) {
        if (searchType == null || searchType.isBlank()) return;
        if (searchValue == null || searchValue.isBlank()) return;
        String type = searchType;
        if (!FIELDS.contains(type)) {
            throw new BadRequestException(ReturnCode.ERR_WRONG_PARAMS);
        }
        if (Elastic.reqUrl.equalsIgnoreCase(type) || Elastic.resMsg.equalsIgnoreCase(type)) {
            type = type + ".raw";
        }
        boolQueryBuilder.filter(QueryBuilders.termQuery(type, searchValue));
    }
}
