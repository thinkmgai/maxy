package com.thinkm.maxy.dto.front.common;

import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.code.MaxyLogType;
import com.thinkm.common.util.Elastic;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Schema(description = "시계열 차트 데이터")
public class TimeSeriesChart {
    @Schema(description = "총 개수", example = "100")
    private Long count = 0L;

    @Schema(description = "시계열 차트 데이터 (시간, 카운트)")
    private List<Long[]> chart = new ArrayList<>();

    @Getter
    @RequiredArgsConstructor
    public enum DataType {
        ERROR(ElasticIndex.TROUBLE_LOG, Elastic.logTm),
        PAGE(ElasticIndex.PAGE_LOG, Elastic.pageStartTm),
        NETWORK(ElasticIndex.NETWORK_LOG, Elastic.logTm);

        private final ElasticIndex index;
        private final String timeColumn;

        /**
         * Page 인 경우 app start를 제외하는 필터 추가
         */
        public void addWebPageFilter(BoolQueryBuilder boolQuery) {
            if (TimeSeriesChart.DataType.PAGE.equals(this)) {
                boolQuery.filter(QueryBuilders.termsQuery(Elastic.logType, MaxyLogType.WEB_PAGE_TYPES_SET));
            }
        }
    }
}