package com.thinkm.maxy.service.app.helper;

import com.thinkm.common.exception.NotFoundException;
import com.thinkm.common.util.Elastic;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.action.search.SearchResponse;
import org.opensearch.search.aggregations.Aggregations;
import org.opensearch.search.aggregations.bucket.histogram.Histogram;
import org.opensearch.search.aggregations.bucket.histogram.ParsedDateHistogram;
import org.opensearch.search.aggregations.bucket.terms.ParsedStringTerms;
import org.opensearch.search.aggregations.bucket.terms.Terms;
import org.opensearch.search.aggregations.metrics.ParsedAvg;
import org.opensearch.search.aggregations.metrics.ParsedCardinality;
import org.opensearch.search.aggregations.metrics.ParsedSum;
import org.opensearch.search.aggregations.metrics.ParsedTDigestPercentiles;

import java.time.ZonedDateTime;
import java.util.*;

@Slf4j
public class DashboardServiceHelper extends QueryParseHelper {

    public static Map<String, Object> parseMedTimeVal(SearchResponse response) {
        Map<String, Object> result = new HashMap<>();
        try {
            if (response == null || response.getAggregations() == null) {
                throw new NotFoundException("no med time");
            }
            Aggregations aggregations = response.getAggregations();
            ParsedTDigestPercentiles loadingTime = aggregations.get(Elastic.loadingTime);
            long loadingTimeVal = 0L;
            if (loadingTime != null) {
                loadingTimeVal = Math.round(loadingTime.percentile(50));
            }
            result.put(Elastic.loadingTime, loadingTimeVal);

            ParsedTDigestPercentiles responseTime = aggregations.get(Elastic.responseTime);
            long responseTimeVal = 0L;
            if (responseTime != null) {
                responseTimeVal = Math.round(responseTime.percentile(50));
            }
            result.put(Elastic.responseTime, responseTimeVal);

            return result;
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return Map.of(Elastic.loadingTime, 0, Elastic.responseTime, 0);
        }
    }

    public static List<Map<String, Object>> parsePageViewInfoList(SearchResponse response) {
        if (response == null || response.getAggregations() == null) {
            return Collections.emptyList();
        }
        List<Map<String, Object>> result = new ArrayList<>();
        ParsedStringTerms res = response.getAggregations().get(Elastic.RES);
        for (Terms.Bucket bucket : res.getBuckets()) {
            String reqUrl = bucket.getKeyAsString();  // "key": Field (e.g., "Background", "Foreground")
            long viewCount = bucket.getDocCount();  // "doc_count": Field

            // Extract "viewer" aggregation
            ParsedCardinality viewerAggregation = bucket.getAggregations().get(Elastic.SUB_AGGS_2);
            long viewer = viewerAggregation.getValue();  // "viewer": Field

            // Extract "avgIntervaltime" aggregation
            ParsedAvg avgIntervaltimeAggregation = bucket.getAggregations().get(Elastic.SUB_AGGS_1);
            double intervaltime = avgIntervaltimeAggregation.getValue();  // "avgIntervaltime": Field

            Map<String, Object> item = new HashMap<>();
            item.put("reqUrl", reqUrl);
            item.put("viewCount", viewCount);
            item.put("viewer", viewer);
            item.put("intervaltime", intervaltime);
            result.add(item);
        }
        return result;
    }

    public static Map<String, List<Object>> parseFavoritesRowInfo(SearchResponse response) {
        Map<String, List<Object>> result = new HashMap<>();

        List<Object> logData = new ArrayList<>();
        List<Object> errorData = new ArrayList<>();
        List<Object> crashData = new ArrayList<>();
        List<Object> loadingTimeData = new ArrayList<>();
        List<Object> responseTimeData = new ArrayList<>();

        if (response == null || response.getAggregations() == null) {
            result.put("count", logData);
            result.put("error", errorData);
            result.put("crash", crashData);
            result.put("loadingTime", loadingTimeData);
            result.put("responseTime", responseTimeData);
            return result;
        }

        ParsedDateHistogram res = response.getAggregations().get(Elastic.RES);
        for (Histogram.Bucket bucket : res.getBuckets()) {
            try {
                ParsedSum errorAggregation = bucket.getAggregations().get(Elastic.errorCount);
                ParsedSum crashAggregation = bucket.getAggregations().get(Elastic.crashCount);
                ParsedTDigestPercentiles loadingTime = bucket.getAggregations().get(Elastic.loadingTime);
                ParsedAvg responseTimeAggregation = bucket.getAggregations().get(Elastic.responseTime);

                ZonedDateTime keyTime = (ZonedDateTime) bucket.getKey();
                long time = keyTime.toInstant().toEpochMilli();

                List<Object> logItem = new ArrayList<>();
                logItem.add(time); // timestamp
                logItem.add(bucket.getDocCount()); // log count

                List<Object> errorItem = new ArrayList<>();
                errorItem.add(time); // timestamp
                errorItem.add(errorAggregation.getValue()); // error

                List<Object> crashItem = new ArrayList<>();
                crashItem.add(time); // timestamp
                crashItem.add(crashAggregation.getValue()); // crash

                long loadingTimeVal = 0L;
                if (loadingTime != null) {
                    loadingTimeVal = Math.round(loadingTime.percentile(50));
                }

                List<Object> loadingTimeItem = new ArrayList<>();
                loadingTimeItem.add(time); // timestamp
                loadingTimeItem.add(loadingTimeVal);

                List<Object> responseTimeItem = new ArrayList<>();
                responseTimeItem.add(time); // timestamp
                if (Double.isInfinite(responseTimeAggregation.getValue()) || Double.isNaN(responseTimeAggregation.getValue())) {
                    responseTimeItem.add(0);
                } else {
                    responseTimeItem.add(Math.round(responseTimeAggregation.getValue()));
                }

                logData.add(logItem);
                errorData.add(errorItem);
                crashData.add(crashItem);
                loadingTimeData.add(loadingTimeItem);
                responseTimeData.add(responseTimeItem);
            } catch (Exception e) {
                log.error("{}: {}", bucket.getKeyAsString(), e.getMessage(), e);
            }
        }

        result.put("count", logData);
        result.put("error", errorData);
        result.put("crash", crashData);
        result.put("loadingTime", loadingTimeData);
        result.put("responseTime", responseTimeData);
        return result;
    }
}
