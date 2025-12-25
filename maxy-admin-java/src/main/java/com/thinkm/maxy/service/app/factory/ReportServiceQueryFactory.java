package com.thinkm.maxy.service.app.factory;

import com.thinkm.common.util.Elastic;
import com.thinkm.maxy.vo.LogRequestVO;
import org.jetbrains.annotations.NotNull;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;

public class ReportServiceQueryFactory {

    @NotNull
    public static BoolQueryBuilder createTroubleLogBoolQuery(LogRequestVO vo) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(vo);

        // from / to 는 DateTime format 에서 변경된 값임
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm).gte(vo.getFrom()).lte(vo.getTo()).timeZone("Z"));
        if (vo.checkAppVer()) {
            boolQuery.filter(QueryBuilders.termQuery(Elastic.appVer, vo.getAppVer()));
        }

        // userId가 있는 경우에만 조회
        boolQuery.filter(QueryBuilders.existsQuery(Elastic.userId_raw));
        boolQuery.mustNot(QueryBuilders.termQuery(Elastic.userId_raw, "-"));
        boolQuery.mustNot(QueryBuilders.termQuery(Elastic.userId_raw, ""));
        return boolQuery;
    }
}
