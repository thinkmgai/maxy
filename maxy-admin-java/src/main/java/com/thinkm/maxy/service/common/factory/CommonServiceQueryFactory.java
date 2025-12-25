package com.thinkm.maxy.service.common.factory;

import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.util.Elastic;
import com.thinkm.maxy.vo.LogRequestVO;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;
import org.opensearch.search.builder.SearchSourceBuilder;
import org.opensearch.search.sort.SortOrder;

@Slf4j
public class CommonServiceQueryFactory {
    public static SearchRequest createWaterfallDataQuery(LogRequestVO vo) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(vo);
        if (Elastic.hasMxPageId(vo.getMxPageId())) {
            boolQuery.filter(QueryBuilders.termQuery(Elastic.mxPageId, vo.getMxPageId()));
        } else {
            boolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm).gte(vo.getPageStartTm()).lte(vo.getPageEndTm()).timeZone("Z"));
            boolQuery.filter(QueryBuilders.termsQuery(Elastic.deviceId_raw, vo.getDeviceId()));
        }

        SearchSourceBuilder sourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .fetchSource(new String[]{Elastic.resMsg}, null)
                .sort(Elastic.logTm, SortOrder.ASC)
                .size(10000);

        String[] indexes = ElasticIndex.getIndicesForDateRange(ElasticIndex.PERF_LOG, vo.getPageStartTm(), vo.getPageEndTm());
        return new SearchRequest(indexes).source(sourceBuilder);
    }

    public static SearchRequest createCoreVitalDataQuery(LogRequestVO vo) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(vo);
        if (Elastic.hasMxPageId(vo.getMxPageId())) {
            boolQuery.filter(QueryBuilders.termQuery(Elastic.mxPageId, vo.getMxPageId()));
        } else {
            boolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm).gte(vo.getPageStartTm()).lte(vo.getPageEndTm()).timeZone("Z"));
            boolQuery.filter(QueryBuilders.termQuery(Elastic.deviceId_raw, vo.getDeviceId()));
        }

        SearchSourceBuilder sourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .sort(Elastic.logTm, SortOrder.ASC)
                .size(10000);
        String[] indexes = ElasticIndex.getIndicesForDateRange(ElasticIndex.VITAL_LOG, vo.getPageStartTm(), vo.getPageEndTm());
        return new SearchRequest(indexes).source(sourceBuilder);
    }

    public static SearchRequest createWaterfallErrorDataQuery(LogRequestVO vo) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(vo);
        if (Elastic.hasMxPageId(vo.getMxPageId())) {
            boolQuery.filter(QueryBuilders.termQuery(Elastic.mxPageId, vo.getMxPageId()));
        } else {
            boolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm).gte(vo.getPageStartTm()).lte(vo.getPageEndTm()).timeZone("Z"));
            boolQuery.filter(QueryBuilders.termsQuery(Elastic.deviceId_raw, vo.getDeviceId()));
        }
        Elastic.errorBuilder(boolQuery);

        SearchSourceBuilder sourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .sort(Elastic.logTm, SortOrder.ASC)
                .size(10000);

        String[] indexes = ElasticIndex.getIndicesForDateRange(ElasticIndex.TROUBLE_LOG, vo.getPageStartTm(), vo.getPageEndTm());
        return new SearchRequest(indexes).source(sourceBuilder);
    }
}
