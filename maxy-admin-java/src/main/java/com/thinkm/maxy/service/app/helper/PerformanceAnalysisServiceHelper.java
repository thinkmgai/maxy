package com.thinkm.maxy.service.app.helper;

import com.thinkm.common.code.perf.HitmapOption;
import com.thinkm.common.code.perf.HitmapType;
import com.thinkm.common.code.perf.Vital;
import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.Elastic;
import com.thinkm.maxy.dto.app.performance.NetworkDetailResponseDto;
import com.thinkm.maxy.dto.app.performance.PercentileDataResponseDto;
import com.thinkm.maxy.service.app.PerformanceServiceV2;
import com.thinkm.maxy.service.app.factory.PerformanceAnalysisQueryFactory;
import com.thinkm.maxy.vo.LogRequestVO;
import com.thinkm.maxy.vo.LogVO;
import org.apache.lucene.search.TotalHits;
import org.opensearch.action.search.SearchResponse;
import org.opensearch.search.aggregations.Aggregations;
import org.opensearch.search.aggregations.bucket.histogram.Histogram;
import org.opensearch.search.aggregations.bucket.histogram.ParsedDateHistogram;
import org.opensearch.search.aggregations.bucket.histogram.ParsedHistogram;
import org.opensearch.search.aggregations.bucket.terms.ParsedTerms;
import org.opensearch.search.aggregations.bucket.terms.Terms;
import org.opensearch.search.aggregations.metrics.*;

import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

public class PerformanceAnalysisServiceHelper extends QueryParseHelper {
    /**
     * {@link PerformanceAnalysisQueryFactory#createHitmapQuery(LogRequestVO, HitmapOption)}
     */
    public static Map<String, Object> parseHitmap(SearchResponse searchResponse, HitmapOption option) {
        Map<String, Object> result = new HashMap<>();
        List<Long[]> resultData = new ArrayList<>();
        if (searchResponse == null || searchResponse.getAggregations() == null) {
            return Collections.emptyMap();
        }
        ParsedDateHistogram parsedDateHistogram = searchResponse.getAggregations().get(Elastic.RES);
        if (parsedDateHistogram == null) {
            return Collections.emptyMap();
        }

        // Duration Max 값 찾기
        long durationMax = 0;
        List<? extends Histogram.Bucket> timeBuckets = parsedDateHistogram.getBuckets();
        for (Histogram.Bucket timeBucket : timeBuckets) {
            ParsedHistogram histogramAgg = timeBucket.getAggregations().get(Elastic.SUB_AGGS_1);
            if (histogramAgg == null) {
                continue;
            }
            for (Histogram.Bucket bucket : histogramAgg.getBuckets()) {
                durationMax = Math.max(durationMax, CommonUtil.toLong(bucket.getKey()));
            }
        }

        // max 가 2천 미만이면 2천으로 최소값 보장
        if (durationMax < 2000) {
            durationMax = 2000;
        }

        // duration 구간 목록 생성 (0 ~ max, step 단위)
        List<Long> durationKeys = new ArrayList<>();
        for (long d = 0; d <= durationMax; d += option.durationStep()) {
            durationKeys.add(d);
        }

        // 가장 큰 count 값 찾기
        AtomicInteger maxCount = new AtomicInteger(0);

        for (Histogram.Bucket timeBucket : timeBuckets) {
            long timestamp = Long.parseLong(timeBucket.getKeyAsString());

            Map<Long, Integer> durationMap = new HashMap<>(durationKeys.size());
            ParsedHistogram histogramAgg = timeBucket.getAggregations().get(Elastic.SUB_AGGS_1);
            histogramAgg.getBuckets().forEach(bucket -> {
                long duration = CommonUtil.toLong(bucket.getKey());
                int count = Math.toIntExact(bucket.getDocCount());
                durationMap.put(duration, count);
            });

            durationKeys.forEach(duration -> {
                int count = durationMap.getOrDefault(duration, 0);
                if (count != 0) {
                    maxCount.set(Math.max(maxCount.get(), count));
                    resultData.add(new Long[]{timestamp, duration, (long) count});
                }
            });
        }

        long minTime = timeBuckets.isEmpty() ? 0 : Long.parseLong(timeBuckets.get(0).getKeyAsString());
        long maxTime = timeBuckets.isEmpty() ? 0 : Long.parseLong(timeBuckets.get(timeBuckets.size() - 1).getKeyAsString());
        result.put("minTime", minTime);
        result.put("maxTime", maxTime);
        result.put("maxDuration", durationMax);
        result.put("maxCount", maxCount);
        result.put("datas", resultData);

        return result;
    }

    /**
     * {@link PerformanceAnalysisQueryFactory#createApiResponseTimeChartQuery(LogRequestVO)}
     */
    public static List<Long[]> parseApiResponseTimeChart(SearchResponse searchResponse) {
        List<Long[]> result = new ArrayList<>();
        if (searchResponse == null || searchResponse.getAggregations() == null) {
            return Collections.emptyList();
        }
        ParsedDateHistogram parsedDateHistogram = searchResponse.getAggregations().get(Elastic.RES);
        if (parsedDateHistogram == null) {
            return Collections.emptyList();
        }

        for (Histogram.Bucket timeBucket : parsedDateHistogram.getBuckets()) {
            long timestamp = CommonUtil.toLong(timeBucket.getKeyAsString());

            ParsedAvg subAgg = timeBucket.getAggregations().get(Elastic.SUB_AGGS_1);
            double avg = subAgg.getValue();

            if (Double.isNaN(avg) || Double.isInfinite(avg)) {
                avg = 0;
            }

            result.add(new Long[]{timestamp, Math.round(avg)});
        }

        return result;
    }

    /**
     * {@link PerformanceAnalysisQueryFactory#createLogListByTimeQuery(LogRequestVO, HitmapType)}
     */
    public static List<Map<String, Object>> parseLogListByTime(SearchResponse searchResponse) {
        return parseSimpleList(searchResponse);
    }

    /**
     * {@link PerformanceAnalysisQueryFactory#createHitmapListQuery(LogRequestVO, HitmapType)}
     */
    public static List<Map<String, Object>> parseHitmapList(SearchResponse searchResponse, HitmapType type) {
        List<Map<String, Object>> result = new ArrayList<>();
        if (searchResponse == null || searchResponse.getAggregations() == null) {
            return result;
        }

        ParsedTerms parsedTerms = searchResponse.getAggregations().get(Elastic.RES);

        parsedTerms.getBuckets().forEach(reqUrlBucket -> {
            String reqUrl = reqUrlBucket.getKeyAsString();
            ParsedAvg parsedAvg = reqUrlBucket.getAggregations().get(Elastic.SUB_AGGS_1);

            double errorCount = 0;
            if (HitmapType.PAGE.equals(type)) {
                ParsedSum errorCountSum = reqUrlBucket.getAggregations().get(Elastic.SUB_AGGS_2);
                errorCount = errorCountSum.getValue();
            }

            Map<String, Object> item = Map.of(
                    "reqUrl", reqUrl,
                    "durationAvg", parsedAvg.getValue(),
                    "count", reqUrlBucket.getDocCount(),
                    "errorCount", errorCount
            );

            result.add(item);
        });

        return result;
    }

    /**
     * {@link PerformanceServiceV2#getApiDetail(LogVO)}
     */
    public static NetworkDetailResponseDto parseApiDetail(Map<String, Object> item, boolean userIdMasking) {
        return NetworkDetailResponseDto.from(item, userIdMasking);
    }

    /**
     * {@link PerformanceAnalysisQueryFactory#createApiListByApiUrlQuery(LogRequestVO)}
     */
    public static List<Map<String, Object>> parseApiListByApiUrl(SearchResponse searchResponse) {
        return parseSimpleList(searchResponse);
    }

    /**
     * {@link PerformanceAnalysisQueryFactory#createApiListByPageUrlQuery(LogRequestVO)}
     */
    public static List<Map<String, Object>> parseApiListByPageUrl(SearchResponse searchResponse) {
        return parseSimpleList(searchResponse);
    }

    /**
     * {@link PerformanceAnalysisQueryFactory#createCoreVitalQuery(LogRequestVO, Vital)}
     */
    public static Map<String, Integer> parseCoreVital(SearchResponse searchResponse) {
        Map<String, Integer> item = new HashMap<>();
        item.put("good", 0);
        item.put("poor", 0);
        item.put("needs-improvement", 0);

        if (searchResponse == null || searchResponse.getAggregations() == null) {
            return item;
        }

        TotalHits totalHits = searchResponse.getHits().getTotalHits();
        if (totalHits == null || totalHits.value == 0) {
            return item;
        }

        long totalCount = totalHits.value;
        ParsedTerms terms = searchResponse.getAggregations().get(Elastic.RES);

        for (Terms.Bucket bucket : terms.getBuckets()) {
            String key = bucket.getKeyAsString();
            long count = bucket.getDocCount();
            if (item.containsKey(key)) {
                int percent = (int) (((double) count / totalCount) * 100);
                item.put(key, percent);
            }
        }

        return item;
    }

    /**
     * {@link PerformanceAnalysisQueryFactory#createVitalChartQuery(LogRequestVO, Vital)}
     */
    public static List<Object[]> parseVitalChart(SearchResponse searchResponse) {
        List<Object[]> result = new ArrayList<>();
        if (searchResponse == null || searchResponse.getAggregations() == null) {
            return result;
        }
        ParsedDateHistogram parsedDateHistogram = searchResponse.getAggregations().get(Elastic.RES);
        if (parsedDateHistogram == null) {
            return result;
        }

        for (Histogram.Bucket timeBucket : parsedDateHistogram.getBuckets()) {
            long timestamp = CommonUtil.toLong(timeBucket.getKeyAsString());

            ParsedAvg subAgg = timeBucket.getAggregations().get(Elastic.SUB_AGGS_1);
            double avg = subAgg.getValue();

            if (Double.isNaN(avg) || Double.isInfinite(avg)) {
                avg = 0;
            }

            result.add(new Object[]{timestamp, avg});
        }

        return result;
    }

    /**
     * {@link PerformanceAnalysisQueryFactory#createApiErrorListQuery(LogRequestVO)}
     */
    public static List<Map<String, Object>> parseApiErrorList(SearchResponse searchResponse) {
        List<Map<String, Object>> result = new ArrayList<>();
        if (searchResponse == null || searchResponse.getAggregations() == null) {
            return Collections.emptyList();
        }

        if (searchResponse.getHits() == null || searchResponse.getHits().getTotalHits() == null) {
            return Collections.emptyList();
        }

        long totalDocCount = searchResponse.getHits().getTotalHits().value;

        ParsedTerms parsedTerms = searchResponse.getAggregations().get(Elastic.RES);

        parsedTerms.getBuckets().forEach(reqUrlBucket -> {
            String reqUrl = reqUrlBucket.getKeyAsString();
            ParsedTerms statusCodeAgg = reqUrlBucket.getAggregations().get(Elastic.statusCode);

            statusCodeAgg.getBuckets().forEach(statusCodeBucket -> {
                long count = statusCodeBucket.getDocCount();
                double ratio = totalDocCount > 0 ? (count * 100.0 / totalDocCount) : 0.0;

                Map<String, Object> item = Map.of(
                        "reqUrl", reqUrl,
                        "statusCode", statusCodeBucket.getKeyAsString(),
                        "count", count,
                        "ratio", ratio
                );

                result.add(item);
            });
        });

        return result;
    }

    /**
     * {@link PerformanceAnalysisQueryFactory#createApiErrorChartQuery(LogRequestVO)}
     */
    public static Map<String, List<Long[]>> parseApiErrorChart(SearchResponse searchResponse) {
        if (searchResponse == null || searchResponse.getAggregations() == null) {
            return Collections.emptyMap();
        }

        Map<String, List<Long[]>> item = new HashMap<>();
        ParsedTerms parsedTerms = searchResponse.getAggregations().get(Elastic.RES);
        parsedTerms.getBuckets().forEach(bucket -> {
            List<Long[]> l = new ArrayList<>();
            ParsedDateHistogram parsedDateHistogram = bucket.getAggregations().get(Elastic.SUB_AGGS_1);
            if (parsedDateHistogram == null) {
                return;
            }
            parsedDateHistogram.getBuckets().forEach(dateHistogramBucket -> {
                long count = dateHistogramBucket.getDocCount();
                Long[] ii = new Long[]{CommonUtil.toLong(dateHistogramBucket.getKeyAsString()), count};
                l.add(ii);
            });
            item.put(bucket.getKeyAsString(), l);
        });

        return item;
    }

    /**
     * {@link PerformanceAnalysisQueryFactory#createErrorListByApiUrlQuery(LogRequestVO)}
     */
    public static List<Map<String, Object>> parseErrorListByApiUrl(SearchResponse searchResponse) {
        return parseSimpleList(searchResponse);
    }

    /**
     * ParsedAvg에 유효한 평균 데이터가 포함되어 있는지 확인
     */
    private static boolean isValidAverage(ParsedAvg avg) {
        if (avg == null) return false;
        double value = avg.getValue();
        return !Double.isNaN(value) && !Double.isInfinite(value);
    }

    /**
     * {@link PerformanceAnalysisQueryFactory#createVitalListByPageQuery(LogRequestVO)}
     */
    public static List<Map<String, Object>> parseVitalListByPage(SearchResponse searchResponse) {
        if (searchResponse == null || searchResponse.getAggregations() == null) {
            return Collections.emptyList();
        }

        List<Map<String, Object>> result = new ArrayList<>();
        ParsedTerms parsedTerms = searchResponse.getAggregations().get(Elastic.RES);
        parsedTerms.getBuckets().forEach(bucket -> {
            ParsedAvg inpAvg = bucket.getAggregations().get(Elastic.inp);
            ParsedAvg lcpAvg = bucket.getAggregations().get(Elastic.lcp);
            ParsedAvg clsAvg = bucket.getAggregations().get(Elastic.cls);
            ParsedAvg fcpAvg = bucket.getAggregations().get(Elastic.fcp);
            ParsedAvg loadingAvg = bucket.getAggregations().get(Elastic.loadingTime);
            Long count = bucket.getDocCount();

            Map<String, Object> item = new HashMap<>();
            item.put("reqUrl", bucket.getKeyAsString());
            item.put(Elastic.inp, isValidAverage(inpAvg) ? CommonUtil.toDouble(inpAvg.getValue()) : "");
            item.put(Elastic.lcp, isValidAverage(lcpAvg) ? CommonUtil.toDouble(lcpAvg.getValue()) : "");
            item.put(Elastic.cls, isValidAverage(clsAvg) ? CommonUtil.toDouble(clsAvg.getValue()) : "");
            item.put(Elastic.fcp, isValidAverage(fcpAvg) ? CommonUtil.toDouble(fcpAvg.getValue()) : "");
            item.put("loadingAvg", CommonUtil.toDouble(loadingAvg.getValue()));
            item.put("count", count);
            result.add(item);
        });

        return result;
    }

    /**
     * {@link PerformanceAnalysisQueryFactory#createCoreVitalAvgQuery(LogRequestVO)}
     */
    public static Map<String, Double> parseCoreVitalAvg(SearchResponse searchResponse) {
        Map<String, Double> result = new HashMap<>();
        result.put(Elastic.inp.toUpperCase(), 0D);
        result.put(Elastic.cls.toUpperCase(), 0.0);
        result.put(Elastic.lcp.toUpperCase(), 0D);
        result.put(Elastic.fcp.toUpperCase(), 0D);
        if (searchResponse == null || searchResponse.getAggregations() == null) {
            return result;
        }

        ParsedTerms parsedTerms = searchResponse.getAggregations().get(Elastic.RES);
        parsedTerms.getBuckets().forEach(bucket -> {
            ParsedAvg avg = bucket.getAggregations().get(Elastic.SUB_AGGS_1);
            result.put(bucket.getKeyAsString(), avg.getValue());
        });

        return result;
    }

    public static PercentileDataResponseDto parsePercentileData(SearchResponse searchResponse) {
        if (searchResponse == null || searchResponse.getAggregations() == null) {
            return new PercentileDataResponseDto(); // 0으로 초기화된 기본값
        }

        Aggregations aggs = searchResponse.getAggregations();

        // 1) 5%, 95% 분위값
        long p5 = 0;
        long p95 = 0;
        Percentiles percentiles = aggs.get(Elastic.RES); // percentiles(...) 생성 시 사용한 agg 이름
        if (percentiles != null) {
            // percentiles.percentile(5) = 하위 5% 지점의 값
            p5 = CommonUtil.toLong(percentiles.percentile(5));
            p95 = CommonUtil.toLong(percentiles.percentile(95));
        }

        // 2) 대상값의 Percent(<= value 비율 %)
        long percent = 0;
        PercentileRanks ranks = aggs.get(Elastic.SUB_AGGS_1);
        if (ranks != null) {
            // percentile_ranks 응답은 요청 시 지정한 values 각각에 대한 항목을 가짐
            // iterator의 각 항목: getPercent() = 요청값(value), getValue() = 누적비율(%)
            Percentile first = ranks.iterator().hasNext() ? ranks.iterator().next() : null;
            if (first != null) {
                percent = CommonUtil.toLong(first.getPercent());
            }
        }

        return PercentileDataResponseDto.builder()
                .top5(p5)
                .top95(p95)
                .percent(percent)
                .build();
    }
}
