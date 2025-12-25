package com.thinkm.maxy.service.app.factory;

import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.code.MaxyLogType;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.DateUtil;
import com.thinkm.common.util.Elastic;
import com.thinkm.maxy.vo.DashboardComponentVO;
import com.thinkm.maxy.vo.DashboardVO;
import com.thinkm.maxy.vo.LogRequestVO;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.action.search.MultiSearchRequest;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;
import org.opensearch.script.Script;
import org.opensearch.search.aggregations.AggregationBuilders;
import org.opensearch.search.aggregations.BucketOrder;
import org.opensearch.search.aggregations.bucket.composite.CompositeAggregationBuilder;
import org.opensearch.search.aggregations.bucket.composite.TermsValuesSourceBuilder;
import org.opensearch.search.aggregations.bucket.filter.FilterAggregationBuilder;
import org.opensearch.search.aggregations.bucket.histogram.DateHistogramAggregationBuilder;
import org.opensearch.search.aggregations.bucket.histogram.DateHistogramInterval;
import org.opensearch.search.aggregations.bucket.terms.TermsAggregationBuilder;
import org.opensearch.search.aggregations.metrics.AvgAggregationBuilder;
import org.opensearch.search.aggregations.metrics.CardinalityAggregationBuilder;
import org.opensearch.search.aggregations.metrics.PercentilesAggregationBuilder;
import org.opensearch.search.builder.SearchSourceBuilder;

import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.TimeZone;

@Slf4j
public class DashboardQueryFactory {

    public static SearchRequest createMedResponseAndLoadingTimeQuery(DashboardVO vo) {

        String reqUrl = vo.getReqUrl();
        String deviceModel = vo.getDeviceModel();

        if (reqUrl == null && deviceModel == null) {
            log.error("One of two parameters, `reqUrl` or `deviceModel`, is required.");
            throw new BadRequestException();
        }

        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));

        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.pageStartTm)
                .gte("now-3d/d")
                .lte(System.currentTimeMillis())
                .timeZone("Z"));
        if (deviceModel != null) {
            boolQuery.filter(QueryBuilders.termQuery(Elastic.deviceModel, deviceModel));
        }
        if (reqUrl != null) {
            boolQuery.filter(QueryBuilders.termQuery(Elastic.reqUrl_raw, reqUrl));
        }

        // Aggregation 생성
        PercentilesAggregationBuilder loadingTimeAgg = AggregationBuilders
                .percentiles(Elastic.loadingTime)
                .field(Elastic.loadingTime)
                .percentiles(50);

        PercentilesAggregationBuilder responseTimeAgg = AggregationBuilders
                .percentiles(Elastic.responseTime)
                .field(Elastic.responseTime)
                .percentiles(50);

        SearchSourceBuilder sourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .aggregation(loadingTimeAgg)
                .aggregation(responseTimeAgg)
                .size(0);

        String indexMonth = DateUtil.getIndexMonth(System.currentTimeMillis());
        String index = ElasticIndex.PAGE_LOG.getIndex() + indexMonth + "*";
        return new SearchRequest(index).source(sourceBuilder);
    }

    public static SearchRequest createPageViewInfoListQuery(DashboardVO vo, DashboardComponentVO componentConfig) {
        int maxSize = 30;
        if (componentConfig != null && componentConfig.getOptPvequalizerMaxSize() != null) {
            // 설정한 max size
            maxSize = componentConfig.getOptPvequalizerMaxSize();
        }

        long from = DateUtil.dateToTimestamp(vo.getBaseDate(), true);
        long to = new Date().getTime();
        // Bool query with filters
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.pageStartTm)
                .gte(from)
                .lte(to)
                .timeZone("Z"));

        boolQuery.filter(QueryBuilders.termsQuery(Elastic.logType, MaxyLogType.WEB_PAGE_TYPES_SET));

        TermsAggregationBuilder termsAgg = AggregationBuilders.terms(Elastic.RES)
                .field("reqUrl.raw")
                .order(BucketOrder.count(false))  // "_count": "desc" equivalent in OpenSearch
                .size(maxSize)
                .subAggregation(AggregationBuilders.avg(Elastic.SUB_AGGS_1).field(Elastic.intervaltime))  // avg aggregation
                .subAggregation(AggregationBuilders.cardinality(Elastic.SUB_AGGS_2).field(Elastic.deviceId_raw));  // cardinality aggregation

        // Build the full query
        SearchSourceBuilder sourceBuilder = new SearchSourceBuilder()
                .size(0)  // "size": 0
                .query(boolQuery)
                .aggregation(termsAgg);

        return new SearchRequest(ElasticIndex.PAGE_LOG.getIndex() + "*")
                .source(sourceBuilder);
    }

    public static SearchRequest createPageViewInfoDetailList(DashboardVO vo) {
        long from = DateUtil.dateToTimestamp(vo.getBaseDate(), true);
        long to = new Date().getTime();
        DateHistogramInterval calendarInterval = vo.getDateType().equals(DashboardVO.DateType.DAY) ? DateHistogramInterval.HOUR : DateHistogramInterval.DAY;
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.pageStartTm)
                .gte(from)
                .lte(to)
                .timeZone("Z"));
        boolQuery.filter(QueryBuilders.termQuery(Elastic.reqUrl_raw, vo.getReqUrl()));
        CardinalityAggregationBuilder cardinalityAggregationBuilder = AggregationBuilders.cardinality(Elastic.SUB_AGGS_1)
                .field(Elastic.deviceId_raw);
        DateHistogramAggregationBuilder histogramAggregationBuilder = AggregationBuilders.dateHistogram(Elastic.RES)
                .field(Elastic.pageStartTm)
                .calendarInterval(calendarInterval)
                .timeZone(TimeZone.getTimeZone("Asia/Seoul").toZoneId())
                .minDocCount(0).subAggregation(cardinalityAggregationBuilder);

        SearchSourceBuilder sourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .aggregation(histogramAggregationBuilder)
                .size(0);

//        String[] indices = ElasticIndex.getIndicesForDateRange(ElasticIndex.DEVICE_PAGE_FLOW, from, to);
        return new SearchRequest(ElasticIndex.PAGE_LOG.getIndex() + "*")
                .source(sourceBuilder);
    }

    public static SearchRequest createResourcePopupRowDataForUser(DashboardVO vo) {
        long from = DateUtil.dateToTimestamp(vo.getBaseDate(), true);
        long to = System.currentTimeMillis();

        // DAY: 1h / WEEK, MONTH: 1d
        DateHistogramInterval interval = vo.getDateType().equals(DashboardVO.DateType.DAY) ? DateHistogramInterval.HOUR : DateHistogramInterval.DAY;

        // Bool query with filters
        BoolQueryBuilder userBoolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));
        BoolQueryBuilder resourceBoolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));

        userBoolQuery.filter(QueryBuilders.termQuery(Elastic.deviceModel, vo.getDeviceModel()));
        userBoolQuery.filter(QueryBuilders.rangeQuery(Elastic.appStartTm).gte(from).lte(to).timeZone("Z"));
        resourceBoolQuery.filter(QueryBuilders.termQuery(Elastic.deviceModel, vo.getDeviceModel()));
        resourceBoolQuery.filter(QueryBuilders.rangeQuery(Elastic.pageStartTm).gte(from).lte(to).timeZone("Z"));

        DateHistogramAggregationBuilder userHistogramAgg = AggregationBuilders.dateHistogram(Elastic.RES)
                .field(Elastic.appStartTm)
                .calendarInterval(interval)
                .timeZone(TimeZone.getTimeZone("Asia/Seoul").toZoneId())
                .minDocCount(0);

        SearchSourceBuilder userSourceBuilder = new SearchSourceBuilder()
                .query(userBoolQuery)
                .aggregation(userHistogramAgg)
                .size(0);

        return new SearchRequest(ElasticIndex.ACCESS_HISTORY.getIndex() + "*")
                .source(userSourceBuilder);
    }

    public static SearchRequest createResourcePopupRowDataForResource(DashboardVO vo) {
        long from = DateUtil.dateToTimestamp(vo.getBaseDate(), true);
        long to = System.currentTimeMillis();

        // DAY: 1h / WEEK, MONTH: 1d
        DateHistogramInterval interval = vo.getDateType().equals(DashboardVO.DateType.DAY) ? DateHistogramInterval.HOUR : DateHistogramInterval.DAY;

        // Bool query with filters
        BoolQueryBuilder userBoolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));
        BoolQueryBuilder resourceBoolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));

        userBoolQuery.filter(QueryBuilders.termQuery(Elastic.deviceModel, vo.getDeviceModel()));
        userBoolQuery.filter(QueryBuilders.rangeQuery(Elastic.appStartTm).gte(from).lte(to).timeZone("Z"));
        resourceBoolQuery.filter(QueryBuilders.termQuery(Elastic.deviceModel, vo.getDeviceModel()));
        resourceBoolQuery.filter(QueryBuilders.rangeQuery(Elastic.pageStartTm).gte(from).lte(to).timeZone("Z"));

        AvgAggregationBuilder errorCountAgg = AggregationBuilders.avg(Elastic.avgMemUsage)
                .field(Elastic.avgMemUsage); // avgMEM Avg
        AvgAggregationBuilder crashCountAgg = AggregationBuilders.avg(Elastic.avgCpuUsage)
                .field(Elastic.avgCpuUsage); // avgCPU Avg

        DateHistogramAggregationBuilder resourceHistogramAgg = AggregationBuilders.dateHistogram(Elastic.RES)
                .field(Elastic.pageStartTm)
                .calendarInterval(interval)
                .timeZone(TimeZone.getTimeZone("Asia/Seoul").toZoneId())
                .minDocCount(1)
                .subAggregation(errorCountAgg)
                .subAggregation(crashCountAgg);

        SearchSourceBuilder resourceSourceBuilder = new SearchSourceBuilder()
                .query(resourceBoolQuery)
                .aggregation(resourceHistogramAgg)
                .size(0);

        return new SearchRequest(ElasticIndex.PAGE_LOG.getIndex() + "*")
                .source(resourceSourceBuilder);
    }

    public static SearchRequest createFavoritesInfoListQuery(DashboardVO vo, List<String> reqUrlList) {
        long from = DateUtil.dateToTimestamp(vo.getBaseDate(), true);
        long to = System.currentTimeMillis();

        // Aggregation for terms on reqUrl.raw field
        TermsAggregationBuilder termsAgg = AggregationBuilders.terms(Elastic.RES)
                .field(Elastic.reqUrl_raw)
                .order(BucketOrder.count(false))  // "_count": "desc"
                .size(500)
                .subAggregation(AggregationBuilders.sum(Elastic.logCount).field(Elastic.logCount))        // sumLogCount aggregation
                .subAggregation(AggregationBuilders.sum(Elastic.sumCpuUsage).field(Elastic.sumCpuUsage))    // sumCpuUsage aggregation
                .subAggregation(AggregationBuilders.sum(Elastic.sumMemUsage).field(Elastic.sumMemUsage))    // sumMemUsage aggregation
                .subAggregation(AggregationBuilders.avg(Elastic.loadingTime).field(Elastic.loadingTime))    // loadingTime avg aggregation
                .subAggregation(AggregationBuilders.avg(Elastic.responseTime).field(Elastic.responseTime))  // responseTime avg aggregation
                .subAggregation(AggregationBuilders.avg(Elastic.intervaltime).field(Elastic.intervaltime))  // intervaltime avg aggregation
                .subAggregation(AggregationBuilders.sum(Elastic.errorCount).field(Elastic.errorCount))      // errorCount sum aggregation
                .subAggregation(AggregationBuilders.sum(Elastic.crashCount).field(Elastic.crashCount));     // crashCount sum aggregation

        // Bool query with filters
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo))
                .filter(QueryBuilders.rangeQuery(Elastic.pageStartTm)
                        .gte(from)
                        .lte(to)
                        .timeZone("Z"));
        if (!reqUrlList.isEmpty()) {
            boolQuery.filter(QueryBuilders.termsQuery(Elastic.reqUrl_raw, reqUrlList));
        }

        boolQuery.filter(QueryBuilders.termsQuery(Elastic.logType, MaxyLogType.WEB_PAGE_TYPES_SET));

        // Build the full query
        SearchSourceBuilder sourceBuilder = new SearchSourceBuilder()
                .size(0)  // "size": 0
                .query(boolQuery)
                .aggregation(termsAgg);

//        String[] indices = ElasticIndex.getIndicesForDateRange(ElasticIndex.DEVICE_PAGE_FLOW, from, to);
        return new SearchRequest(ElasticIndex.PAGE_LOG.getIndex() + "*")
                .source(sourceBuilder);
    }

    public static SearchRequest createFavoritesRowInfoQuery(DashboardVO vo) {
        long from = DateUtil.dateToTimestamp(vo.getBaseDate(), true);
        long to = System.currentTimeMillis();

        // DAY: 1h / WEEK, MONTH: 1d
        DateHistogramInterval interval = vo.getDateType().equals(DashboardVO.DateType.DAY) ? DateHistogramInterval.HOUR : DateHistogramInterval.DAY;

        // Bool query with filters
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));

        String reqUrl = CommonUtil.convertHTMLCode(vo.getReqUrl());
        boolQuery.filter(QueryBuilders.termQuery(Elastic.reqUrl_raw, reqUrl));
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.pageStartTm).gte(from).lte(to).timeZone("Z"));

        DateHistogramAggregationBuilder histogramAggregationBuilder = AggregationBuilders.dateHistogram(Elastic.RES)
                .field(Elastic.pageStartTm)
                .calendarInterval(interval)
                .timeZone(TimeZone.getTimeZone("Asia/Seoul").toZoneId())
                .minDocCount(0)
                .subAggregation(AggregationBuilders.sum(Elastic.errorCount).field(Elastic.errorCount)) // Error sum
                .subAggregation(AggregationBuilders.sum(Elastic.crashCount).field(Elastic.crashCount)) // Crash sum
                .subAggregation(AggregationBuilders.percentiles(Elastic.loadingTime).field(Elastic.loadingTime).percentiles(50)) // Loading Time Med
                .subAggregation(AggregationBuilders.avg(Elastic.responseTime).field(Elastic.responseTime)); // Response Time Avg

        SearchSourceBuilder sourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .aggregation(histogramAggregationBuilder)
                .size(0);

        return new SearchRequest(ElasticIndex.PAGE_LOG.getIndex() + "*")
                .source(sourceBuilder);
    }

    public static MultiSearchRequest createVersionConversionInfoListQuery(DashboardVO vo) {
        // Bool query with filters
        BoolQueryBuilder conversionBoolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));
        BoolQueryBuilder errorBoolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));
        BoolQueryBuilder crashBoolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));

        // 기준 일자(WEEK, MONTH에 따라 -7, -30)의 00시 00분
        long from = DateUtil.dateToTimestamp(vo.getBaseDate(), false);
        // 오늘의 23시 59분
        long to = DateUtil.dateToTimestamp(DateUtil.getToday(), false);

        conversionBoolQuery.filter(QueryBuilders.rangeQuery(Elastic.accessDate).gt(vo.getBaseDate()).lte(DateUtil.getToday()).timeZone("Z"));
        errorBoolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm).gt(from).lte(to).timeZone("Z"));
        Elastic.errorBuilder(errorBoolQuery); // trouble index에서 error만
        crashBoolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm).gt(from).lte(to).timeZone("Z"));
        Elastic.crashBuilder(crashBoolQuery); // trouble index에서 crash만

        // osType, appVer으로 그룹
        CompositeAggregationBuilder compositeAggs = AggregationBuilders.composite(Elastic.RES,
                Arrays.asList(
                        new TermsValuesSourceBuilder(Elastic.osType).field(Elastic.osType),
                        new TermsValuesSourceBuilder(Elastic.appVer).field(Elastic.appVer)
                )
        ).size(1000);

        SearchSourceBuilder conversionSourceBuilder = new SearchSourceBuilder()
                .query(conversionBoolQuery)
                .aggregation(compositeAggs)
                .size(0);
        SearchSourceBuilder errorSourceBuilder = new SearchSourceBuilder()
                .query(errorBoolQuery)
                .aggregation(compositeAggs)
                .size(0);
        SearchSourceBuilder crashSourceBuilder = new SearchSourceBuilder()
                .query(crashBoolQuery)
                .aggregation(compositeAggs)
                .size(0);

        SearchRequest conversionSearchRequest = new SearchRequest(ElasticIndex.ACCESS_HISTORY.getIndex() + "*")
                .source(conversionSourceBuilder);
        SearchRequest errorSearchRequest = new SearchRequest(ElasticIndex.TROUBLE_LOG.getIndex() + "*")
                .source(errorSourceBuilder);
        SearchRequest crashSearchRequest = new SearchRequest(ElasticIndex.TROUBLE_LOG.getIndex() + "*")
                .source(crashSourceBuilder);

        return new MultiSearchRequest()
                .add(conversionSearchRequest)
                .add(errorSearchRequest)
                .add(crashSearchRequest);
    }

    public static SearchRequest createMarketingInsightQuery(DashboardVO vo,
                                                            DateHistogramInterval interval,
                                                            long from, long to) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.pageStartTm).gte(from).lte(to).timeZone("Z"));
        boolQuery.filter(QueryBuilders.termsQuery(Elastic.preUrl_raw, vo.getPreUrl()));

        // Aggregations 설정
        DateHistogramAggregationBuilder dateHistogramAgg = AggregationBuilders.dateHistogram(Elastic.RES)
                .field("pageStartTm")
                .fixedInterval(interval)
                .timeZone(TimeZone.getTimeZone("Asia/Seoul").toZoneId());

        // Unique Users 집계
        CardinalityAggregationBuilder usersAgg = AggregationBuilders.cardinality("users")
                .field("deviceId.raw");

        // Bounce (reqUrl이 특정 URL이 아닌 경우)
        FilterAggregationBuilder bounceAgg = AggregationBuilders.filter("bounce",
                QueryBuilders.boolQuery()
                        .mustNot(QueryBuilders.termQuery("reqUrl.raw", vo.getReqUrl()))
        );

        // Reach (reqUrl이 특정 URL인 경우)
        FilterAggregationBuilder reachAgg = AggregationBuilders.filter("reach",
                QueryBuilders.termQuery("reqUrl.raw", vo.getReqUrl())
        );

        // 일간 집계인 경우에만 lead avg를 구한다
        if (DateHistogramInterval.DAY.equals(interval)) {
            Script script = new Script("(!doc.containsKey('preUrlTime') || doc['preUrlTime'].empty || doc['preUrlTime'].value.toInstant().toEpochMilli() == 0) ? 0 : doc['pageStartTm'].value.toInstant().toEpochMilli() - doc['preUrlTime'].value.toInstant().toEpochMilli()");
            AvgAggregationBuilder leadAggregation = AggregationBuilders.avg("lead").script(script);
            dateHistogramAgg.subAggregation(leadAggregation);
        }

        // Aggregations 추가
        dateHistogramAgg.subAggregation(usersAgg);
        dateHistogramAgg.subAggregation(bounceAgg);
        dateHistogramAgg.subAggregation(reachAgg);

        SearchSourceBuilder sourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .aggregation(dateHistogramAgg)
                .size(0);
        return new SearchRequest(ElasticIndex.PAGE_LOG.getIndex() + "*")
                .source(sourceBuilder);
    }
}
