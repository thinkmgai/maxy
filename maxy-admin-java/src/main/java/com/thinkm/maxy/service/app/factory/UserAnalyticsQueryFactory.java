package com.thinkm.maxy.service.app.factory;

import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.util.Elastic;
import com.thinkm.maxy.dto.app.useranalytics.UserAnalyticsDetailRequestDto;
import com.thinkm.maxy.dto.app.useranalytics.UserAnalyticsDetailResponseDto;
import com.thinkm.maxy.dto.app.useranalytics.UserAnalyticsSearchRequestDto;
import com.thinkm.maxy.vo.LogRequestVO;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;
import org.opensearch.search.aggregations.AggregationBuilders;
import org.opensearch.search.aggregations.bucket.composite.CompositeAggregationBuilder;
import org.opensearch.search.aggregations.bucket.composite.TermsValuesSourceBuilder;
import org.opensearch.search.aggregations.bucket.terms.TermsAggregationBuilder;
import org.opensearch.search.aggregations.metrics.MaxAggregationBuilder;
import org.opensearch.search.aggregations.metrics.TopHitsAggregationBuilder;
import org.opensearch.search.builder.SearchSourceBuilder;
import org.opensearch.search.sort.SortOrder;

import java.util.Arrays;

public class UserAnalyticsQueryFactory {
    public static SearchRequest createUserListQuery(UserAnalyticsSearchRequestDto dto) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.AppInfo()
                .packageNm(dto.getPackageNm())
                .serverType(dto.getServerType())
                .osType(dto.getOsType())
                .build());

        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.pageEndTm).gte(dto.getFrom()).lte(dto.getTo()).timeZone("Z"));

        String searchType = dto.getSearchType();
        String searchTypeRaw = searchType + ".raw";
        boolQuery.filter(QueryBuilders.termQuery(searchTypeRaw, dto.getSearchValue()));

        TopHitsAggregationBuilder lastDoc = AggregationBuilders.topHits(Elastic.SUB_AGGS_1)
                .fetchSource(new String[]{Elastic.appVer, Elastic.osType, Elastic.deviceModel, Elastic.clientNo}, null)
                .sort(Elastic.pageEndTm)
                .size(1);

        MaxAggregationBuilder lastTm = AggregationBuilders.max(Elastic.SUB_AGGS_2).field(Elastic.pageEndTm);

        CompositeAggregationBuilder userCompositeAggs = AggregationBuilders.composite(Elastic.RES, Arrays.asList(
                        new TermsValuesSourceBuilder(Elastic.deviceId).field(Elastic.deviceId_raw),
                        new TermsValuesSourceBuilder(Elastic.userId).field(Elastic.userId_raw)
                ))
                .size(1000)
                .subAggregation(lastDoc)
                .subAggregation(lastTm);
        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .aggregation(userCompositeAggs)
                .size(0);
        String[] index = ElasticIndex.getIndicesForDateRange(ElasticIndex.PAGE_LOG, dto.getFrom(), dto.getTo());
        return new SearchRequest(index).source(searchSourceBuilder);
    }

    public static SearchRequest createUserDetailFromPageLogQuery(UserAnalyticsDetailRequestDto dto) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.AppInfo()
                .packageNm(dto.getPackageNm())
                .serverType(dto.getServerType())
                .build());

        boolQuery.filter(QueryBuilders.termQuery(Elastic.deviceId_raw, dto.getDeviceId()));

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .fetchSource(UserAnalyticsDetailResponseDto.FIELDS, null)
                .sort(Elastic.pageEndTm, SortOrder.DESC)
                .size(1);

        return new SearchRequest(ElasticIndex.PAGE_LOG.getIndex() + "*").source(searchSourceBuilder);
    }

    public static SearchRequest createUserDetailFromAccessLogQuery(UserAnalyticsDetailRequestDto dto) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.AppInfo()
                .packageNm(dto.getPackageNm())
                .serverType(dto.getServerType())
                .build());

        boolQuery.filter(QueryBuilders.termQuery(Elastic.deviceId_raw, dto.getDeviceId()));

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .fetchSource(UserAnalyticsDetailResponseDto.FIELDS, null)
                .sort(Elastic.accessDate, SortOrder.DESC)
                .size(1);

        return new SearchRequest(ElasticIndex.ACCESS_HISTORY.getIndex() + "*").source(searchSourceBuilder);
    }

    public static SearchRequest createUserDetailFromDeviceInfoQuery(UserAnalyticsDetailRequestDto dto) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.AppInfo()
                .packageNm(dto.getPackageNm())
                .serverType(dto.getServerType())
                .build());

        boolQuery.filter(QueryBuilders.termQuery(Elastic.deviceId_raw, dto.getDeviceId()));

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .fetchSource(UserAnalyticsDetailResponseDto.FIELDS, null)
                .size(1);

        return new SearchRequest(ElasticIndex.DEVICE_INFO.getIndex()).source(searchSourceBuilder);
    }

    public static SearchRequest createOnlyUserListQuery(UserAnalyticsSearchRequestDto dto) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.AppInfo()
                .packageNm(dto.getPackageNm())
                .serverType(dto.getServerType())
                .osType(dto.getOsType())
                .build());

        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.pageEndTm).gte(dto.getFrom()).lte(dto.getTo()).timeZone("Z"));
        boolQuery.filter(QueryBuilders.prefixQuery(dto.getSearchType() + ".raw", dto.getSearchValue()));

        TermsAggregationBuilder termsAggregationBuilder = AggregationBuilders.terms(Elastic.userId_raw)
                .field(Elastic.userId_raw)
                .size(10000);

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .aggregation(termsAggregationBuilder)
                .query(boolQuery)
                .size(0);

        String[] index = ElasticIndex.getIndicesForDateRange(ElasticIndex.PAGE_LOG, dto.getFrom(), dto.getTo());
        return new SearchRequest(index).source(searchSourceBuilder);
    }
}
