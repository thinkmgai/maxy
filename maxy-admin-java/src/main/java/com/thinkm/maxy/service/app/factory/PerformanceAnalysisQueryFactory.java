package com.thinkm.maxy.service.app.factory;

import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.code.MaxyLogType;
import com.thinkm.common.code.perf.HitmapOption;
import com.thinkm.common.code.perf.HitmapType;
import com.thinkm.common.code.perf.Vital;
import com.thinkm.common.util.Elastic;
import com.thinkm.maxy.vo.LogRequestVO;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;
import org.opensearch.search.aggregations.AggregationBuilders;
import org.opensearch.search.aggregations.bucket.histogram.DateHistogramAggregationBuilder;
import org.opensearch.search.aggregations.bucket.histogram.DateHistogramInterval;
import org.opensearch.search.aggregations.bucket.histogram.HistogramAggregationBuilder;
import org.opensearch.search.aggregations.bucket.histogram.LongBounds;
import org.opensearch.search.aggregations.bucket.terms.TermsAggregationBuilder;
import org.opensearch.search.aggregations.metrics.AvgAggregationBuilder;
import org.opensearch.search.aggregations.metrics.PercentileRanksAggregationBuilder;
import org.opensearch.search.aggregations.metrics.PercentilesAggregationBuilder;
import org.opensearch.search.aggregations.metrics.SumAggregationBuilder;
import org.opensearch.search.builder.SearchSourceBuilder;

import java.time.ZoneId;

public class PerformanceAnalysisQueryFactory {
    public static SearchRequest createHitmapQuery(LogRequestVO vo, HitmapOption option) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(vo);

        String timeField, durationTimeField, index;
        if (HitmapType.API.equals(option.type())) {
            timeField = Elastic.logTm;
            durationTimeField = Elastic.intervaltime;
            index = ElasticIndex.NETWORK_LOG.getIndex() + "*";
            boolQuery.filter(QueryBuilders.termsQuery(Elastic.logType, MaxyLogType.NETWORK_TYPES_SET));
        } else if (HitmapType.PAGE.equals(option.type())) {
            timeField = Elastic.pageEndTm;
            durationTimeField = Elastic.loadingTime;
            index = ElasticIndex.PAGE_LOG.getIndex() + "*";
            boolQuery.filter(QueryBuilders.termsQuery(Elastic.logType, MaxyLogType.WEB_PAGE_TYPES_SET));
        } else {
            throw new IllegalArgumentException("invalid type: " + option.type());
        }

        boolQuery.filter(QueryBuilders.rangeQuery(timeField)
                .gte(vo.getFrom())
                .lte(vo.getTo())
                .timeZone("Z"));

        HistogramAggregationBuilder histogramBuilder = new HistogramAggregationBuilder(Elastic.SUB_AGGS_1)
                .field(durationTimeField)
                .interval(option.durationStep());

        DateHistogramAggregationBuilder aggregationBuilder = new DateHistogramAggregationBuilder(Elastic.RES)
                .field(timeField)
                .fixedInterval(DateHistogramInterval.minutes(Integer.parseInt(vo.getInterval())))
                .timeZone(ZoneId.of("Z"))
                .minDocCount(0)
                .extendedBounds(new LongBounds(vo.getFrom(), vo.getTo()))
                .subAggregation(histogramBuilder);

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .aggregation(aggregationBuilder)
                .size(0);

        return new SearchRequest(index).source(searchSourceBuilder);
    }

    public static SearchRequest createApiResponseTimeChartQuery(LogRequestVO vo) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(vo);
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm)
                .gte(vo.getFrom())
                .lte(vo.getTo())
                .timeZone("Z"));
        boolQuery.filter(QueryBuilders.termsQuery(Elastic.logType, MaxyLogType.NETWORK_TYPES_SET));

        AvgAggregationBuilder avgBuilder = new AvgAggregationBuilder(Elastic.SUB_AGGS_1).field(Elastic.intervaltime);

        DateHistogramAggregationBuilder aggregationBuilder = new DateHistogramAggregationBuilder(Elastic.RES)
                .field(Elastic.logTm)
                .fixedInterval(DateHistogramInterval.minutes(1))
                .timeZone(ZoneId.of("Z"))
                .minDocCount(0)
                .extendedBounds(new LongBounds(vo.getFrom(), vo.getTo()))
                .subAggregation(avgBuilder);

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .aggregation(aggregationBuilder)
                .size(0);

        return new SearchRequest(ElasticIndex.NETWORK_LOG.getIndex() + "*").source(searchSourceBuilder);
    }

    public static SearchRequest createHitmapListQuery(LogRequestVO vo, HitmapType type) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(vo);

        String timeField, durationTimeField, index;
        if (HitmapType.API.equals(type)) {
            timeField = Elastic.logTm;
            durationTimeField = Elastic.intervaltime;
            index = ElasticIndex.NETWORK_LOG.getIndex() + "*";
            boolQuery.filter(QueryBuilders.termsQuery(Elastic.logType, MaxyLogType.NETWORK_TYPES_SET));
        } else if (HitmapType.PAGE.equals(type)) {
            timeField = Elastic.pageEndTm;
            durationTimeField = Elastic.loadingTime;
            index = ElasticIndex.PAGE_LOG.getIndex() + "*";
            boolQuery.filter(QueryBuilders.termsQuery(Elastic.logType, MaxyLogType.WEB_PAGE_TYPES_SET));
        } else {
            throw new IllegalArgumentException("invalid type: " + type);
        }

        boolQuery.filter(QueryBuilders.rangeQuery(timeField)
                .gte(vo.getFrom())
                .lte(vo.getTo())
                .timeZone("Z"));

        if (vo.getDurationFrom() != null && vo.getDurationTo() != null
            && vo.getDurationFrom() >= 0 && vo.getDurationTo() >= 0) {
            boolQuery.filter(QueryBuilders.rangeQuery(durationTimeField)
                    .gte(vo.getDurationFrom())
                    .lte(vo.getDurationTo()));
        }

        AvgAggregationBuilder avgBuilder = new AvgAggregationBuilder(Elastic.SUB_AGGS_1).field(durationTimeField);
        TermsAggregationBuilder aggsBuilder = new TermsAggregationBuilder(Elastic.RES).field(Elastic.reqUrl_raw)
                .subAggregation(avgBuilder)
                .size(1000);

        if (HitmapType.PAGE.equals(type)) {
            SumAggregationBuilder sumBuilder = new SumAggregationBuilder(Elastic.SUB_AGGS_2).field(Elastic.errorCount);
            aggsBuilder.subAggregation(sumBuilder);
        }

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .aggregation(aggsBuilder)
                .size(0);

        return new SearchRequest(index).source(searchSourceBuilder);
    }

    public static SearchRequest createLogListByTimeQuery(LogRequestVO vo, HitmapType type) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(vo);

        String timeField, durationTimeField, index;
        if (HitmapType.API.equals(type)) {
            timeField = Elastic.logTm;
            durationTimeField = Elastic.intervaltime;
            index = ElasticIndex.NETWORK_LOG.getIndex() + "*";
            boolQuery.filter(QueryBuilders.termsQuery(Elastic.logType, MaxyLogType.NETWORK_TYPES_SET));
        } else if (HitmapType.PAGE.equals(type)) {
            timeField = Elastic.pageEndTm;
            durationTimeField = Elastic.loadingTime;
            index = ElasticIndex.PAGE_LOG.getIndex() + "*";
        } else {
            throw new IllegalArgumentException("invalid type: " + type);
        }

        boolQuery.filter(QueryBuilders.rangeQuery(timeField)
                .gte(vo.getFrom())
                .lte(vo.getTo())
                .timeZone("Z"));

        if (vo.getDurationFrom() != null && vo.getDurationTo() != null
            && vo.getDurationFrom() > 0 && vo.getDurationTo() > 0) {
            boolQuery.filter(QueryBuilders.rangeQuery(durationTimeField)
                    .gte(vo.getDurationFrom())
                    .lte(vo.getDurationTo()));
        }

        String[] includes = new String[]{
                timeField,
                durationTimeField,
                Elastic.statusCode,
                Elastic.resMsg,
                Elastic.reqUrl,
                Elastic.pageUrl,
                Elastic.mxPageId
        };

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .fetchSource(includes, null)
                .size(1000);

        return new SearchRequest(index).source(searchSourceBuilder);
    }

    public static SearchRequest createApiListByApiUrlQuery(LogRequestVO vo) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(vo);
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm)
                .gte(vo.getFrom())
                .lte(vo.getTo())
                .timeZone("Z"));

        if (vo.getDurationFrom() != null && vo.getDurationTo() != null
            && vo.getDurationFrom() > 0 && vo.getDurationTo() > 0) {
            boolQuery.filter(QueryBuilders.rangeQuery(Elastic.intervaltime)
                    .gte(vo.getDurationFrom())
                    .lte(vo.getDurationTo()));
        }

        boolQuery.filter(QueryBuilders.termsQuery(Elastic.logType, MaxyLogType.NETWORK_TYPES_SET));
        boolQuery.filter(QueryBuilders.termQuery(Elastic.reqUrl_raw, vo.getReqUrl()));

        String[] includes = new String[]{
                Elastic.logTm,
                Elastic.intervaltime,
                Elastic.deviceId,
                Elastic.userId,
                Elastic.comSensitivity,
                Elastic.reqUrl,
                Elastic.pageUrl,
                Elastic.resMsg,
                Elastic.statusCode,
                Elastic.osType,
                Elastic.clientNo,
                Elastic.mxPageId
        };

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .fetchSource(includes, null)
                .size(1000);

        return new SearchRequest(ElasticIndex.NETWORK_LOG.getIndex() + "*").source(searchSourceBuilder);
    }

    public static SearchRequest createApiListByPageUrlQuery(LogRequestVO vo) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(vo);
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm)
                .gte(vo.getFrom())
                .lte(vo.getTo())
                .timeZone("Z"));
        boolQuery.filter(QueryBuilders.termQuery(Elastic.pageUrl_raw, vo.getPageUrl()));
        boolQuery.filter(QueryBuilders.termsQuery(Elastic.logType, MaxyLogType.NETWORK_TYPES_SET));

        String[] includes = new String[]{
                Elastic.logTm,
                Elastic.intervaltime,
                Elastic.deviceId,
                Elastic.userId,
                Elastic.comSensitivity,
                Elastic.reqUrl,
                Elastic.pageUrl,
                Elastic.resMsg,
                Elastic.statusCode,
                Elastic.mxPageId
        };

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .fetchSource(includes, null)
                .size(1000);

        return new SearchRequest(ElasticIndex.NETWORK_LOG.getIndex() + "*").source(searchSourceBuilder);
    }

    public static SearchRequest createCoreVitalQuery(LogRequestVO vo, Vital vital) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(vo);
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm)
                .gte(vo.getFrom())
                .lte(vo.getTo())
                .timeZone("Z"));
        boolQuery.filter(QueryBuilders.termQuery(Elastic.name, vital.name().toUpperCase()));

        TermsAggregationBuilder builder = new TermsAggregationBuilder(Elastic.RES).field(Elastic.rating);

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .aggregation(builder)
                .size(0);

        return new SearchRequest(ElasticIndex.VITAL_LOG.getIndex() + "*").source(searchSourceBuilder);
    }

    public static SearchRequest createVitalChartQuery(LogRequestVO vo, Vital vital) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(vo);
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm)
                .gte(vo.getFrom())
                .lte(vo.getTo())
                .timeZone("Z"));
        boolQuery.filter(QueryBuilders.termQuery(Elastic.name, vital.name().toUpperCase()));

        AvgAggregationBuilder avgBuilder = new AvgAggregationBuilder(Elastic.SUB_AGGS_1).field(Elastic.value);

        DateHistogramAggregationBuilder aggregationBuilder = new DateHistogramAggregationBuilder(Elastic.RES)
                .field(Elastic.logTm)
                .fixedInterval(DateHistogramInterval.minutes(5))
                .timeZone(ZoneId.of("Z"))
                .minDocCount(0)
                .extendedBounds(new LongBounds(vo.getFrom(), vo.getTo()))
                .subAggregation(avgBuilder);

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .aggregation(aggregationBuilder)
                .size(0);

        return new SearchRequest(ElasticIndex.VITAL_LOG.getIndex() + "*").source(searchSourceBuilder);
    }

    public static SearchRequest createApiErrorListQuery(LogRequestVO vo) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(vo);
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm)
                .gte(vo.getFrom())
                .lte(vo.getTo())
                .timeZone("Z"));
        boolQuery.filter(QueryBuilders.termsQuery(Elastic.statusCodeGroup, MaxyLogType.ERROR_STATUS_CODE_GROUP_SET));

        TermsAggregationBuilder statusCodeBuilder = new TermsAggregationBuilder(Elastic.statusCode).field(Elastic.statusCode);
        TermsAggregationBuilder aggsBuilder = new TermsAggregationBuilder(Elastic.RES).field(Elastic.reqUrl_raw)
                .subAggregation(statusCodeBuilder);

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .aggregation(aggsBuilder)
                .size(0);

        return new SearchRequest(ElasticIndex.NETWORK_LOG.getIndex() + "*").source(searchSourceBuilder);
    }

    public static SearchRequest createErrorListByApiUrlQuery(LogRequestVO vo) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(vo);
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm)
                .gte(vo.getFrom())
                .lte(vo.getTo())
                .timeZone("Z"));
        boolQuery.filter(QueryBuilders.termQuery(Elastic.reqUrl_raw, vo.getReqUrl()));
        boolQuery.filter(QueryBuilders.termQuery(Elastic.statusCode, vo.getStatusCode()));
        boolQuery.filter(QueryBuilders.termsQuery(Elastic.statusCodeGroup, MaxyLogType.ERROR_STATUS_CODE_GROUP_SET));

        String[] includes = new String[]{
                Elastic.logTm,
                Elastic.statusCode,
                Elastic.resMsg,
                Elastic.deviceId,
                Elastic.deviceModel,
                Elastic.userId,
                Elastic.osType,
                Elastic.appVer,
                Elastic.osVer,
                Elastic.comType,
                Elastic.simOperatorNm,
                Elastic.locationCode,
                Elastic.logType,
                Elastic.timeZone,
                Elastic.pageUrl,
                Elastic.clientNo,
                Elastic.clientNm,
                Elastic.userNm,
                Elastic.birthDay,
                Elastic.mxPageId
        };

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .fetchSource(includes, null)
                .size(1000);

        return new SearchRequest(ElasticIndex.NETWORK_LOG.getIndex() + "*").source(searchSourceBuilder);
    }

    public static SearchRequest createApiErrorChartQuery(LogRequestVO vo) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(vo);
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm)
                .gte(vo.getFrom())
                .lte(vo.getTo())
                .timeZone("Z"));
        boolQuery.filter(QueryBuilders.termsQuery(Elastic.statusCodeGroup, MaxyLogType.ERROR_STATUS_CODE_GROUP_SET));


        DateHistogramAggregationBuilder aggregationBuilder = new DateHistogramAggregationBuilder(Elastic.SUB_AGGS_1)
                .field(Elastic.logTm)
                .fixedInterval(DateHistogramInterval.minutes(5))
                .timeZone(ZoneId.of("Z"))
                .minDocCount(0)
                .extendedBounds(new LongBounds(vo.getFrom(), vo.getTo()));

        TermsAggregationBuilder subAggsBuilder = new TermsAggregationBuilder(Elastic.RES)
                .field(Elastic.statusCodeGroup)
                .subAggregation(aggregationBuilder);

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .aggregation(subAggsBuilder)
                .size(0);

        return new SearchRequest(ElasticIndex.NETWORK_LOG.getIndex() + "*").source(searchSourceBuilder);
    }

    public static SearchRequest createVitalListByPageQuery(LogRequestVO vo) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(vo);
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.pageEndTm)
                .gte(vo.getFrom())
                .lte(vo.getTo())
                .timeZone("Z"));

        boolQuery.filter(QueryBuilders.termQuery(Elastic.logType, MaxyLogType.T_WebNav_Start.getDecimal()));

        AvgAggregationBuilder lcpBuilder = new AvgAggregationBuilder(Elastic.lcp).field(Elastic.lcp);
        AvgAggregationBuilder inpBuilder = new AvgAggregationBuilder(Elastic.inp).field(Elastic.inp);
        AvgAggregationBuilder clsBuilder = new AvgAggregationBuilder(Elastic.cls).field(Elastic.cls);
        AvgAggregationBuilder fcpBuilder = new AvgAggregationBuilder(Elastic.fcp).field(Elastic.fcp);
        AvgAggregationBuilder avgLoadingTimeBuilder = new AvgAggregationBuilder(Elastic.loadingTime).field(Elastic.loadingTime);
        TermsAggregationBuilder aggsBuilder = new TermsAggregationBuilder(Elastic.RES).field(Elastic.reqUrl_raw)
                .subAggregation(avgLoadingTimeBuilder)
                .subAggregation(inpBuilder)
                .subAggregation(clsBuilder)
                .subAggregation(lcpBuilder)
                .subAggregation(fcpBuilder);

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .aggregation(aggsBuilder)
                .size(0);

        return new SearchRequest(ElasticIndex.PAGE_LOG.getIndex() + "*").source(searchSourceBuilder);
    }

    public static SearchRequest createCoreVitalAvgQuery(LogRequestVO vo) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(vo);
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm)
                .gte(vo.getFrom())
                .lte(vo.getTo())
                .timeZone("Z"));
        boolQuery.filter(QueryBuilders.termsQuery(Elastic.name, Vital.usesToString()));

        TermsAggregationBuilder builder = new TermsAggregationBuilder(Elastic.RES).field(Elastic.name);
        AvgAggregationBuilder avgBuilder = new AvgAggregationBuilder(Elastic.SUB_AGGS_1).field(Elastic.value);
        builder.subAggregation(avgBuilder);

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .aggregation(builder)
                .size(0);

        return new SearchRequest(ElasticIndex.VITAL_LOG.getIndex() + "*").source(searchSourceBuilder);
    }

    public static SearchRequest createApiDetailQuery(LogRequestVO vo) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(vo);
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm)
                .gte(vo.getFrom())
                .lte(vo.getTo())
                .timeZone("Z"));
        boolQuery.filter(QueryBuilders.termsQuery(Elastic._ID, vo.getDocId()));

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .size(1);

        return new SearchRequest(ElasticIndex.NETWORK_LOG.getIndex() + "*").source(searchSourceBuilder);
    }

    public static SearchRequest createPercentileDataQuery(LogRequestVO vo, int hour) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(vo);
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.intervaltime).gte(0));
        boolQuery.filter(QueryBuilders.termQuery(Elastic.reqUrl_raw, vo.getReqUrl()));

        // 현재 시간 - hour 값을 from 으로 함
        long to = System.currentTimeMillis();
        long from = to - ((long) hour * 60 * 60 * 1000);
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm).gte(from).lte(to).timeZone("Z"));

        PercentilesAggregationBuilder aggs = AggregationBuilders
                .percentiles(Elastic.RES)
                .field(Elastic.intervaltime)
                .percentiles(5, 95);

        PercentileRanksAggregationBuilder rankAggs = AggregationBuilders
                .percentileRanks(Elastic.SUB_AGGS_1, new double[]{vo.getIntervaltime()})
                .field(Elastic.intervaltime);


        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .size(0)
                .aggregation(aggs)
                .aggregation(rankAggs);

        return new SearchRequest(ElasticIndex.NETWORK_LOG.getIndex() + "*")
                .source(searchSourceBuilder);
    }
}
