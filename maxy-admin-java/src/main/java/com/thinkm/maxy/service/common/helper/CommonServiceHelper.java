package com.thinkm.maxy.service.common.helper;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.DateUtil;
import com.thinkm.common.util.Elastic;
import com.thinkm.maxy.repository.WebPerfRegistry;
import lombok.extern.slf4j.Slf4j;
import org.jetbrains.annotations.NotNull;
import org.opensearch.action.search.MultiSearchResponse;
import org.opensearch.action.search.SearchResponse;
import org.opensearch.search.SearchHit;
import org.opensearch.search.aggregations.bucket.composite.CompositeAggregation;
import org.opensearch.search.aggregations.metrics.ParsedSum;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
public class CommonServiceHelper {
    private static final ObjectMapper MAPPER = new ObjectMapper()
            .configure(JsonParser.Feature.ALLOW_UNQUOTED_FIELD_NAMES, true)
            .configure(JsonParser.Feature.ALLOW_SINGLE_QUOTES, true);
    private static final TypeReference<Map<String, Object>> TYPE_REFERENCE = new TypeReference<>() {
    };

    public static List<Map<String, Object>> parseWaterfallDataList(SearchResponse response, WebPerfRegistry webPerfRegistry) {
        List<Map<String, Object>> result = new ArrayList<>();
        if (response == null || response.getHits() == null) {
            return Collections.emptyList();
        }

        for (SearchHit hit : response.getHits()) {
            Map<String, Object> tmp = hit.getSourceAsMap();

            // resMsg 필드 검증
            Object resMsgObj = tmp.get(Elastic.resMsg);
            if (!(resMsgObj instanceof String jsonStr)) {
                continue;
            }

            try {
                if (jsonStr.startsWith("\"") && jsonStr.endsWith("\"")) {
                    jsonStr = jsonStr.substring(1, jsonStr.length() - 1);
                    // 이스케이프된 따옴표 처리
                    jsonStr = jsonStr.replace("\\\"", "\"");
                }
                if (jsonStr.isEmpty()) continue;

                Map<String, Object> resMsg = MAPPER.readValue(jsonStr, TYPE_REFERENCE);

                Map<String, Object> webperfMap = webPerfRegistry.translateKeys(resMsg);

                // navigation인 경우 필요한 데이터로 가공해서 전달
                if ("navigation".equals(webperfMap.get("entryType"))) {
                    // 타이밍 데이터를 한 번에 추출하고 안전하게 형변환
                    Map<String, Double> timings = new HashMap<>();
                    String[] timeKeys = {"startTime", "requestStart", "domainLookupStart", "domainLookupEnd",
                            "connectStart", "connectEnd", "responseStart", "responseEnd",
                            "domContentLoadedEventEnd", "loadEventEnd"};

                    // 모든 타이밍 값을 안전하게 추출
                    for (String key : timeKeys) {
                        Object value = webperfMap.get(key);
                        timings.put(key, (value instanceof Number) ? ((Number) value).doubleValue() : 0.0);
                    }

                    // 페이지 로딩 단계 정의
                    List<Map<String, Object>> phases = Arrays.asList(
                            createPhase("Waiting", timings.get("startTime"), timings.get("requestStart")),
                            createPhase("DNS Lookup", timings.get("domainLookupStart"), timings.get("domainLookupEnd")),
                            createPhase("TCP Connect Start", timings.get("connectStart"), timings.get("connectEnd")),
                            createPhase("Request Time", timings.get("requestStart"), timings.get("responseStart")),
                            createPhase("Response Time", timings.get("responseStart"), timings.get("responseEnd")),
                            createPhase("Dom Processing", timings.get("responseEnd"), timings.get("domContentLoadedEventEnd")),
                            createPhase("Dom Load", timings.get("domContentLoadedEventEnd"), timings.get("loadEventEnd"))
                    );

                    // 유효한 단계만 결과에 추가
                    for (Map<String, Object> phase : phases) {
                        if (phase != null) {
                            phase.put("transferSize", webperfMap.get("transferSize"));
                            phase.put("responseStatus", webperfMap.get("responseStatus"));
                            phase.put("url", webperfMap.get("name"));

                            result.add(phase);
                        }
                    }

                    result.add(webperfMap);
                } else {
                    result.add(webperfMap);
                }
            } catch (Exception e) {
                log.warn("Failed to parse resMsg JSON: {}", e.getMessage());
            }
        }
        return result;
    }

    public static List<Map<String, Object>> parseVersionConversionInfoList(MultiSearchResponse multiSearchResponse) {
        List<List<Map<String, Object>>> responseList = new ArrayList<>();
        for (MultiSearchResponse.Item item : multiSearchResponse) {
            SearchResponse response = item.getResponse();
            List<Map<String, Object>> tmpList = new ArrayList<>();
            if (response == null) {
                responseList.add(Collections.emptyList());
                continue;
            }
            CompositeAggregation aggs = response.getAggregations().get(Elastic.RES);
            for (CompositeAggregation.Bucket bucket : aggs.getBuckets()) {
                Map<String, Object> key = bucket.getKey();
                key.put("count", bucket.getDocCount());

                tmpList.add(key);
            }
            responseList.add(tmpList);
        }

        // 운영체제(OS)별 총 error 개수를 계산하는 Map을 생성
        Map<String, Long> totalErrorCountByOsType = responseList.get(1).stream().collect(Collectors.groupingBy(
                entry -> (String) entry.get("osType"), // osType을 기준으로 그룹화
                Collectors.summingLong(entry -> (Long) entry.get("count")) // count 값을 합산
        ));

        // 각 error 데이터를 처리하여 OS별, 앱 버전별 오류 비율을 계산하는 리스트 생성
        List<Map<String, Object>> errorResult = responseList.get(1).stream().map(entry -> {
            String osType = (String) entry.get("osType");
            Long count = (Long) entry.get("count");
            Long total = totalErrorCountByOsType.get(osType); // 해당 OS의 총 오류 개수
            int percentage = (int) Math.round((count / (double) total) * 100); // 백분율 비율 계산

            return Map.of(
                    "osType", osType,
                    "appVer", entry.get("appVer"),
                    "count", count,
                    "percentage", percentage
            );
        }).toList();

        // 운영체제(OS)별 총 crash 개수를 계산하는 Map을 생성
        Map<String, Long> totalCrashCountByOsType = responseList.get(2).stream()
                .collect(Collectors.groupingBy(
                        entry -> (String) entry.get("osType"), // osType을 기준으로 그룹화
                        Collectors.summingLong(entry -> (Long) entry.get("count")) // count 값을 합산
                ));

        // 각 crash 데이터를 처리하여 OS별, 앱 버전별 crash 비율을 계산하는 리스트 생성
        List<Map<String, Object>> crashResult = responseList.get(2).stream().map(entry -> {
            String osType = (String) entry.get("osType");
            Long count = (Long) entry.get("count");
            Long total = totalCrashCountByOsType.get(osType); // 해당 OS의 총 크래시 개수
            int percentage = (int) Math.round((count / (double) total) * 100); // 백분율 비율 계산
            return Map.of(
                    "osType", osType,
                    "appVer", entry.get("appVer"),
                    "count", count,
                    "percentage", percentage
            );
        }).toList();

        // 운영체제(OS)별 총 사용자 수를 계산하는 Map을 생성
        Map<String, Long> totalCountByOsType = responseList.get(0).stream().collect(Collectors.groupingBy(
                entry -> (String) entry.get("osType"), // osType을 기준으로 그룹화
                Collectors.summingLong(entry -> (Long) entry.get("count")) // count 값을 합산
        ));

        // 최종 결과 리스트 생성
        List<Map<String, Object>> result = responseList.get(0).stream()
                .map(entry -> {
                    String osType = (String) entry.get("osType");
                    Long count = (Long) entry.get("count");
                    Long total = totalCountByOsType.get(osType); // 해당 OS의 총 사용자 수
                    int percentage = (int) Math.round((count / (double) total) * 100); // 사용자 비율 계산

                    // 해당 OS 및 앱 버전에 대한 error 데이터 검색
                    Map<String, Object> errorData = errorResult.stream()
                            .filter(e -> e.get("osType").equals(entry.get("osType"))
                                         && e.get("appVer").equals(entry.get("appVer")))
                            .findFirst()
                            .orElse(null);

                    // 해당 OS 및 앱 버전에 대한 crash 데이터 검색
                    Map<String, Object> crashData = crashResult.stream()
                            .filter(e -> e.get("osType").equals(entry.get("osType"))
                                         && e.get("appVer").equals(entry.get("appVer")))
                            .findFirst()
                            .orElse(null);

                    // 최종 결과 데이터 생성
                    return Map.of(
                            "osType", osType,
                            "appVer", entry.get("appVer"),
                            "user", count,
                            "userRate", percentage,
                            "error", errorData != null ? errorData.get("count") : "0",
                            "errorRate", errorData != null ? errorData.get("percentage") : "0",
                            "crash", crashData != null ? crashData.get("count") : "0",
                            "crashRate", crashData != null ? crashData.get("percentage") : "0"
                    );
                })
                // OS 이름을 기준으로 정렬하고, 동일한 경우 사용자 수를 기준으로 내림차순 정렬
                .sorted(Comparator.comparing((Map<String, Object> entry) -> (String) entry.get("osType"))
                        .thenComparing((Map<String, Object> entry) -> (Long) entry.get("user"), Comparator.reverseOrder()))
                .toList();

        // Top 5까지 보여주고 나머지는 'Others'로 합산하여 표기
        int top = 5;

        // 상위 5개를 제외한 나머지 Others 묶기
        // 운영체제(OS)별로 데이터를 그룹화
        Map<String, List<Map<String, Object>>> groupedByOsType = result.stream()
                .collect(Collectors.groupingBy(entry -> (String) entry.get("osType")));

        List<Map<String, Object>> finalResult = new ArrayList<>();

        groupedByOsType.forEach((osType, entries) -> {
            // 사용자 수 기준 내림차순 정렬
            entries.sort(Comparator.comparing(entry -> (Long) entry.get("user"), Comparator.reverseOrder()));

            // 상위 5개 유지 및 나머지 'Others'로 묶기
            List<Map<String, Object>> topEntries = new ArrayList<>(entries.subList(0, Math.min(top, entries.size())));
            List<Map<String, Object>> otherEntries = entries.size() > top ? entries.subList(top, entries.size()) : List.of();

            if (!otherEntries.isEmpty()) {
                long otherUserCount = otherEntries.stream().mapToLong(entry -> (Long) entry.get("user")).sum();
                long otherErrorCount = otherEntries.stream().mapToLong(entry -> Long.parseLong(entry.get("error").toString())).sum();
                long otherCrashCount = otherEntries.stream().mapToLong(entry -> Long.parseLong(entry.get("crash").toString())).sum();

                long totalUserCount = entries.stream().mapToLong(entry -> (Long) entry.get("user")).sum();
                long totalErrorCount = entries.stream().mapToLong(entry -> Long.parseLong(entry.get("error").toString())).sum();
                long totalCrashCount = entries.stream().mapToLong(entry -> Long.parseLong(entry.get("crash").toString())).sum();
                int otherUserRate = totalUserCount > 0 ? (int) Math.round((otherUserCount / (double) totalUserCount) * 100) : 0;
                int otherErrorRate = otherUserCount > 0 ? (int) Math.round((otherErrorCount / (double) totalErrorCount) * 100) : 0;
                int otherCrashRate = otherUserCount > 0 ? (int) Math.round((otherCrashCount / (double) totalCrashCount) * 100) : 0;

                topEntries.add(Map.of(
                        "osType", osType,
                        "appVer", "Others",
                        "user", otherUserCount,
                        "userRate", otherUserRate,
                        "error", otherErrorCount,
                        "errorRate", otherErrorRate,
                        "crash", otherCrashCount,
                        "crashRate", otherCrashRate
                ));
            }

            finalResult.addAll(topEntries);
        });

        // 최종 결과
        return finalResult;
    }

    public static List<Map<String, Object>> parseVersionConversionInfoChart(SearchResponse response) {
        List<Map<String, Object>> result = new ArrayList<>();
        List<Map<String, Object>> tmpList = new ArrayList<>();
        if (response == null || response.getAggregations() == null) {
            return result;
        }
        CompositeAggregation aggs = response.getAggregations().get(Elastic.RES);
        for (CompositeAggregation.Bucket bucket : aggs.getBuckets()) {
            Map<String, Object> key = bucket.getKey();
            key.put("count", bucket.getDocCount());
            tmpList.add(key);
        }

        // 필요한 차트데이터 형식으로 데이터 가공
        // 데이터를 추출하고 변환. osType과 appVer를 기준으로 데이터를 그룹화.
        Map<String, Map<String, List<Map<String, Object>>>> groupedData = tmpList.stream().collect(Collectors.groupingBy(
                entry -> (String) entry.get("osType"), // Group by osType
                Collectors.groupingBy(entry -> (String) entry.get("appVer")) // Group by appVer
        ));

        // 그룹을 반복
        for (String osType : groupedData.keySet()) {
            for (String appVer : groupedData.get(osType).keySet()) {
                List<Map<String, Object>> entries = groupedData.get(osType).get(appVer);

                // osType, 날짜당 총 수 (백분율을 구하기 위함)
                Map<String, Long> totalCountsByDate = tmpList.stream()
                        .filter(entry -> entry.get("osType").equals(osType))
                        .collect(Collectors.groupingBy(
                                entry -> (String) entry.get("accessDate"), // Group by date
                                Collectors.summingLong(entry -> (Long) entry.get("count")) // Sum doc_count
                        ));

                // 변환된 항목 만들기
                Map<String, Object> transformedEntry = new HashMap<>();
                transformedEntry.put("osType", osType);
                transformedEntry.put("appVer", appVer);
                List<List<Object>> counts = new ArrayList<>();
                List<List<Object>> data = new ArrayList<>();
                Long totalCount = 0L;

                for (Map<String, Object> entry : entries) {
                    String date = (String) entry.get("accessDate");
                    Long count = (Long) entry.get("count");

                    // doc_count를 날짜순으로 모아놓은 배열
                    counts.add(Arrays.asList(DateUtil.dateToTimestamp(date, true), count));
                    totalCount += count;

                    // 백분율 계산을 위한 합
                    Long totalForDate = totalCountsByDate.get(date);

                    // 소수점 2번째 자리까지
                    //double percentage = Math.round((count / (double) totalForDate) * 100 * 100) / 100.0;
                    // 정수로 계산
                    int percentage = (int) Math.round((count / (double) totalForDate) * 100);

                    // 하이차트 그래프에서 사용하는 data
                    data.add(Arrays.asList(DateUtil.dateToTimestamp(date, true), percentage));
                }

                transformedEntry.put("totalCount", totalCount); // doc_count 총 수량
                transformedEntry.put("count", counts); // doc_count를 날짜순으로 모아놓은 배열
                transformedEntry.put("data", data); // 하이차트 그래프에서 사용하는 data

                result.add(transformedEntry);
            }
        }

        // doc_count 데이터들 기준으로 내림차순 정렬
        // 적층형 막대그래프를 그릴때 값이 더 큰 시리즈를 먼저 그려주게끔
        result.sort((a, b) -> {
            Long sumA = (Long) a.get("totalCount");
            Long sumB = (Long) b.get("totalCount");
            return Long.compare(sumB, sumA); // Descending order
        });

        List<Map<String, Object>> finalResult = new ArrayList<>();
        // Top 5까지 보여주고 나머지는 'Others'로 합산하여 표기
        int top = 5;

        // 상위 5개를 제외한 나머지 Others 묶기
        // 운영체제(OS)별로 데이터를 그룹화
        Map<String, List<Map<String, Object>>> groupedByOsType = result.stream()
                .collect(Collectors.groupingBy(entry -> (String) entry.get("osType")));

        groupedByOsType.forEach((osType, entries) -> {
            // 사용자 수 기준 내림차순 정렬
            entries.sort(Comparator.comparing(entry -> (Long) entry.get("totalCount"), Comparator.reverseOrder()));

            // 상위 5개 유지 및 나머지 'Others'로 묶기
            List<Map<String, Object>> topEntries = new ArrayList<>(entries.subList(0, Math.min(top, entries.size())));
            List<Map<String, Object>> otherEntries = entries.size() > top ? entries.subList(top, entries.size()) : List.of();

            if (!otherEntries.isEmpty()) {
                Map<Long, Integer> dataMap = new HashMap<>();
                Map<Long, Long> countMap = new HashMap<>();
                Long totalCount = otherEntries.stream().mapToLong(e -> (Long) e.get("totalCount")).sum();

                otherEntries.forEach(entry -> {
                    ((List<List<Object>>) entry.get("data")).forEach(d ->
                            dataMap.merge((Long) d.get(0), (Integer) d.get(1), Integer::sum));
                    ((List<List<Object>>) entry.get("count")).forEach(c ->
                            countMap.merge((Long) c.get(0), (Long) c.get(1), Long::sum));
                });

                List<List<Object>> mergedData = new ArrayList<>(), mergedCount = new ArrayList<>();
                dataMap.forEach((k, v) -> mergedData.add(List.of(k, v)));
                countMap.forEach((k, v) -> mergedCount.add(List.of(k, v)));
                mergedData.sort(Comparator.comparing(o -> (Long) o.get(0)));
                mergedCount.sort(Comparator.comparing(o -> (Long) o.get(0)));

                topEntries.add(Map.of(
                        "data", mergedData,
                        "appVer", "Others",
                        "osType", osType,
                        "count", mergedCount,
                        "totalCount", totalCount
                ));
            }

            finalResult.addAll(topEntries);
        });

        // 최종 결과
        return finalResult;
    }

    public static List<Map<String, Object>> parseAllCrashesByVersionDataForUser(SearchResponse response) {
        if (response == null || response.getAggregations() == null) {
            return Collections.emptyList();
        }
        List<Map<String, Object>> result = new ArrayList<>();
        CompositeAggregation userAggs = response.getAggregations().get(Elastic.RES);
        for (CompositeAggregation.Bucket bucket : userAggs.getBuckets()) {
            Map<String, Object> key = bucket.getKey();

            key.put("user", bucket.getDocCount()); // User 수

            result.add(key);
        }
        return result;
    }

    public static List<Map<String, Object>> parseAllCrashesByVersionDataForCrash(SearchResponse response) {
        if (response == null || response.getAggregations() == null) {
            return Collections.emptyList();
        }

        CompositeAggregation crashAggs = response.getAggregations().get(Elastic.RES);
        List<Map<String, Object>> crashList = new ArrayList<>();
        double crashTotal = 0.0;
        for (CompositeAggregation.Bucket bucket : crashAggs.getBuckets()) {
            Map<String, Object> key = bucket.getKey();

            ParsedSum crashAggregation = bucket.getAggregations().get(Elastic.crashCount);
            key.put(Elastic.crashCount, (long) crashAggregation.getValue()); // Crash 수
            crashTotal += crashAggregation.getValue();

            crashList.add(key);
        }

        // crash 비율을 계산하는 리스트 생성
        double finalCrashTotal = crashTotal;
        // 소수점 1번째 자리까지
        return crashList.stream().map(entry -> {
            String osType = (String) entry.get("osType");
            Long crashCount = (Long) entry.get(Elastic.crashCount);
            // 소수점 1번째 자리까지
            double crashRate = Math.round((crashCount / finalCrashTotal) * 100 * 10) / 10.0;

            return Map.of(
                    "osType", osType,
                    "appVer", entry.get("appVer"),
                    "crashCount", crashCount,
                    "crashRate", crashRate
            );
        }).toList();
    }


    /**
     * 성능 데이터를 분석하여 리소스 로딩 시간 구간을 병합하고 clickAction 시간 구간과 longTask 시간 구간을 구한다
     *
     * @param waterfallList 성능 데이터가 포함된 워터폴 리스트
     * @return 병합된 리소스 시간 구간과 clickAction 시간 구간과 longTask 시간 구간
     */
    public static Map<String, Object> convertPerformanceData(List<Map<String, Object>> waterfallList) {
        Map<String, Object> result = new HashMap<>();

        // 입력 검증
        if (waterfallList == null || waterfallList.isEmpty()) {
            log.warn("Empty or null waterfallList provided to getPerformanceData");
            return result;
        }

        try {
            List<Map<String, Object>> resourceList = new ArrayList<>();
            List<Map<String, Object>> mergeResourceList = new ArrayList<>();
            List<Map<String, Object>> longTaskList = new ArrayList<>();
            List<Map<String, Object>> clickEventList = new ArrayList<>();

            // waterfall 데이터에서 필요한 데이터만 리스트로 만들기
            for (Map<String, Object> item : waterfallList) {
                if ("longtask".equals(item.get("entryType"))) {
                    Object startTime = item.get("startTime");
                    Object duration = item.get("duration");
                    if (startTime instanceof Number && duration instanceof Number) {
                        Map<String, Object> tmp = new HashMap<>();
                        tmp.put("startTime", startTime);
                        tmp.put("endTime", ((Number) startTime).doubleValue() + ((Number) duration).doubleValue());
                        longTaskList.add(tmp);
                    }
                }

                if ("event".equals(item.get("entryType")) && "click".equals(item.get("name"))) {
                    Object startTime = item.get("startTime");
                    Object duration = item.get("duration");
                    if (startTime instanceof Number && duration instanceof Number) {
                        Map<String, Object> tmp = new HashMap<>();
                        tmp.put("startTime", startTime);
                        tmp.put("endTime", ((Number) startTime).doubleValue() + ((Number) duration).doubleValue());
                        clickEventList.add(tmp);
                    }
                }

                // resource 데이터 처리
                if ("resource".equals(item.get("entryType"))) {
                    Object startTime = item.get("startTime");
                    Object responseEnd = item.get("responseEnd");

                    if (startTime instanceof Number && responseEnd instanceof Number) {
                        Map<String, Object> tmp = new HashMap<>();
                        tmp.put("startTime", startTime);
                        tmp.put("responseEnd", responseEnd);
                        resourceList.add(tmp);
                    }
                }
            }

            // resource list가 있으면 merge
            if (!resourceList.isEmpty()) {
                // startTime부터 responseEnd까지를 하나의 구간으로 봤을 때,
                // 겹치는 시간 구간을 병합해서 최종적으로 겹치지 않는 구간 리스트를 반환
                // 1. 정렬 (startTime 기준)
                resourceList.sort(Comparator.comparingDouble(m -> ((Number) m.get("startTime")).doubleValue()));

                Map<String, Object> prev = new HashMap<>(resourceList.get(0));

                // 2. 병합을 위한 비교로직
                for (int i = 1; i < resourceList.size(); i++) {
                    Map<String, Object> curr = resourceList.get(i);

                    double prevEnd = ((Number) prev.get("responseEnd")).doubleValue();
                    double currStart = ((Number) curr.get("startTime")).doubleValue();
                    double currEnd = ((Number) curr.get("responseEnd")).doubleValue();

                    if (currStart <= prevEnd) {
                        // 병합
                        prev.put("responseEnd", Math.max(prevEnd, currEnd));
                    } else {
                        // 병합되지 않음 → 이전 범위 저장, 새 범위로 갱신
                        mergeResourceList.add(prev);
                        prev = new HashMap<>(curr);
                    }
                }

                // 마지막 범위 추가
                mergeResourceList.add(prev);
            }

            result.put("click", clickEventList);
            result.put("longTask", longTaskList);
            result.put("resource", mergeResourceList);
        } catch (Exception e) {
            log.error("Error processing performance data: {}", e.getMessage(), e);
        }

        return result;
    }


    /**
     * 리소스 로딩 시간 구간을 이용해서 Resource Timing을 구합니다.
     *
     * @param waterfallList 성능 데이터가 포함된 워터폴 리스트
     * @return Resource Timing
     */
    public static Map<String, Object> convertWaterfallTimingData(List<Map<String, Object>> waterfallList, List<Map<String, Object>> coreVitalData) {
        Map<String, Object> result = new HashMap<>();

        // 입력 검증
        if (waterfallList == null || waterfallList.isEmpty()) {
            log.warn("Empty or null waterfallList, coreVitalData provided to getPerformanceData");
            return result;
        }

        try {
            Map<String, Object> nav = new HashMap<>();

            Double fid = null, tbt = 0d;

            // waterfall 데이터에서 navigation, resource timing 찾기
            for (Map<String, Object> item : waterfallList) {
                // navigation 데이터 처리
                if ("navigation".equals(item.get("entryType"))) {
                    nav = item;
                    continue;
                }

                // first input delay (FID) 데이터 처리
                if ("first-input".equals(item.get("entryType"))) {
                    Object startTime = item.get("startTime");
                    if (startTime instanceof Number value && value.doubleValue() != 0) {
                        fid = value.doubleValue();
                    }
                }

                // TBT (Total Blocking Time) 데이터 처리
                if ("longtask".equals(item.get("entryType"))) {
                    Object duration = item.get("duration");
                    if (duration instanceof Number) {
                        tbt += ((Number) duration).doubleValue() - 50;
                    }
                }
            }

            // coreVital 데이터에서 LCP, TTFB, INP, CLS, FCP 찾기
            Map<String, Double> metricValues = extractCoreVitalMetrics(coreVitalData);

            result.put("fid", fid);
            result.put("tbt", (tbt == 0d) ? null : tbt);
            result.put("fcp", metricValues.getOrDefault("FCP", null));
            result.put("lcp", metricValues.getOrDefault("LCP", null));
            result.put("inp", metricValues.getOrDefault("INP", null));
            result.put("cls", metricValues.getOrDefault("CLS", null));
            result.put("ttfb", metricValues.getOrDefault("TTFB", null));

            if (nav.isEmpty()) {
                result.put("dclTime", null);
                result.put("loadTime", null);
                result.put("domProcessingTime", null);
                result.put("connectionTime", null);
                result.put("dnsLookupTime", null);
                result.put("redirectTime", null);
                result.put("fetchTime", null);
                result.put("domInteractive", null);

                return result;
            }

            /*
                ## 웹 성능 측정 지표 ##

                ----- Page Timing -----

                First Input Delay (FID) @return [fid]
                    - 사용자가 처음 상호작용(클릭, 키 입력 등)한 순간부터
                      브라우저가 이벤트를 처리할 수 있을 때까지의 지연 시간

                First Contentful Paint (FCP) @return [fcp]
                    - DOM에서 처음으로 텍스트나 이미지 등의 콘텐츠가 렌더링되는 시점

                Largest Contentful Paint (LCP) @return [lcp]
                    - 뷰포트 내 가장 큰 콘텐츠(예: 이미지, 텍스트 블록)가 로딩 완료된 시점

                Interaction to Next Paint (INP) @return [inp]
                    - 사용자 입력에 대해 화면이 실제로 반응하기까지 걸린 지연 시간
                    - 여러 상호작용 중 가장 느린 반응 시간 측정

                Cumulative Layout Shift (CLS) @return [cls]
                    - 사용자 조작 없이 레이아웃이 예기치 않게 이동한 비율의 총합

                TBT (Total Blocking Time) @return [tbt]
                    - 사용자가 상호작용할 수 없는 상태로 메인 스레드가 막힌 총 시간 (50ms 이상)
                    - 50ms 초과분만 누적합

                ----- Resource Timing (navigation 항목) -----

                Time to First Byte (TTFB) : responseStart - requestStart @return [ttfb]
                    - 요청 후 서버가 첫 바이트를 응답하기까지의 시간
                    - 서버 처리 속도, 네트워크 지연, 캐시 여부 등에 영향

                DOMContentLoaded (DCL) Time : domContentLoadedEventEnd - navigationStart @return [dclTime]
                    - 초기 HTML 파싱이 완료되고 DOMContentLoaded 이벤트가 발생한 시점

                Load Time (onLoad Time) : loadEventEnd - navigationStart @return [loadTime]
                    - 페이지의 모든 리소스(이미지, JS 등)를 포함한 로딩 완료 시점

                DOM Processing Time : domComplete - domInteractive @return [domProcessingTime]
                    - HTML 파싱 완료 이후 DOM이 완전히 준비되기까지의 시간

                Connection Time (TCP + SSL) : connectEnd - connectStart (+ SSL) @return [connectionTime]
                    - TCP 핸드쉐이크 및 SSL 연결에 걸린 시간
                    - SSL: secureConnectionStart > 0 인 경우, connectEnd - secureConnectionStart

                DNS Lookup Time : domainLookupEnd - domainLookupStart @return [dnsLookupTime]
                    - 도메인을 IP로 변환하는 데 걸린 시간

                Redirect Time : redirectEnd - redirectStart @return [redirectTime]
                    - HTTP 3xx 리디렉션 처리에 소요된 시간

                Fetch Until Response End : responseEnd - fetchStart @return [fetchTime]
                    - 요청 시작부터 전체 응답 수신 완료까지의 시간

                DOM Interactive : domInteractive - navigationStart @return [domInteractive]
                    - HTML 파싱 완료 시점 (JS 실행 전)
                    - 사용자가 문서와 상호작용할 수 있는 첫 시점
            */

            Double tcpTime = ((Number) nav.get("connectEnd")).doubleValue() - ((Number) nav.get("connectStart")).doubleValue();
            Double sslTime = (nav.containsKey("secureConnectionStart") &&
                              ((Number) nav.get("secureConnectionStart")).doubleValue() > 0)
                    ? ((Number) nav.get("connectEnd")).doubleValue() - ((Number) nav.get("secureConnectionStart")).doubleValue()
                    : 0;

            result.put("dclTime", CommonUtil.zeroToNull(((Number) nav.get("domContentLoadedEventEnd")).doubleValue() - ((Number) nav.get("startTime")).doubleValue()));
            result.put("loadTime", CommonUtil.zeroToNull(((Number) nav.get("loadEventEnd")).doubleValue() - ((Number) nav.get("startTime")).doubleValue()));
            result.put("domProcessingTime", CommonUtil.zeroToNull(((Number) nav.get("domComplete")).doubleValue() - ((Number) nav.get("domInteractive")).doubleValue()));
            result.put("connectionTime", CommonUtil.zeroToNull(tcpTime + sslTime));
            result.put("dnsLookupTime", CommonUtil.zeroToNull(((Number) nav.get("domainLookupEnd")).doubleValue() - ((Number) nav.get("domainLookupStart")).doubleValue()));
            result.put("redirectTime", CommonUtil.zeroToNull(((Number) nav.get("redirectEnd")).doubleValue() - ((Number) nav.get("redirectStart")).doubleValue()));
            result.put("fetchTime", CommonUtil.zeroToNull(((Number) nav.get("responseEnd")).doubleValue() - ((Number) nav.get("fetchStart")).doubleValue()));
            result.put("domInteractive", CommonUtil.zeroToNull(((Number) nav.get("domInteractive")).doubleValue()));

        } catch (Exception e) {
            log.error("Error processing performance data: {}", e.getMessage(), e);
        }

        return result;
    }


    @NotNull
    public static List<Map<String, Object>> trimResourceInfoData(List<Map<String, Object>> resourceInfoData) {
        return resourceInfoData.stream()
                .filter(item -> !"navigation".equals(item.get("entryType")))
                .collect(Collectors.toList());
    }

    public static void sortResourceInfoData(List<Map<String, Object>> resourceInfoData) {
        resourceInfoData.sort((m1, m2) -> {
            // entryType 비교
            boolean isNavigation1 = "reformNavigation".equals(m1.get("entryType"));
            boolean isNavigation2 = "reformNavigation".equals(m2.get("entryType"));

            if (isNavigation1 != isNavigation2) {
                return isNavigation1 ? -1 : 1; // navigation이 항상 앞으로
            }

            // startTime 비교
            Object startTime1 = m1.get("startTime");
            Object startTime2 = m2.get("startTime");

            double time1 = (startTime1 instanceof Number) ? ((Number) startTime1).doubleValue() : Double.MAX_VALUE;
            double time2 = (startTime2 instanceof Number) ? ((Number) startTime2).doubleValue() : Double.MAX_VALUE;

            return Double.compare(time1, time2);
        });
    }

    public static void processErrorData(List<Map<String, Object>> errorData, List<Map<String, Object>> resourceInfoData) {
        for (Map<String, Object> errorInfo : errorData) {
            Map<String, Object> reformErrorInfo = new HashMap<>();
            reformErrorInfo.put("entryType", "error");
            reformErrorInfo.put("name", "error");
            reformErrorInfo.put("initiatorType", "other");
            reformErrorInfo.put("startTime", errorInfo.get("waterfallTm"));
            reformErrorInfo.put("resMsg", errorInfo.get("resMsg"));
            reformErrorInfo.put("logTm", errorInfo.get("logTm"));

            resourceInfoData.add(reformErrorInfo);
        }
    }

    /**
     * Core Vital 메트릭 데이터를 추출하는 헬퍼 메소드
     *
     * @param coreVitalData Core Vital 데이터 목록
     * @return 메트릭 이름을 키로, 값을 값으로 하는 맵
     */
    private static Map<String, Double> extractCoreVitalMetrics(List<Map<String, Object>> coreVitalData) {
        Map<String, Double> metrics = new HashMap<>();

        // 지원하는 메트릭 목록
        List<String> supportedMetrics = Arrays.asList("FCP", "LCP", "INP", "CLS", "TTFB");

        for (Map<String, Object> item : coreVitalData) {
            String name = (String) item.get("name");

            // 지원하는 메트릭인 경우에만 처리
            if (supportedMetrics.contains(name)) {
                Object objValue = item.get("value");
                if (objValue instanceof Number value && value.doubleValue() != 0) {
                    metrics.put(name, value.doubleValue());
                }
            }
        }

        return metrics;
    }

    // 헬퍼 메소드: 유효한 경우에만 단계 객체 생성
    private static Map<String, Object> createPhase(String name, double start, double end) {
        if (end - start >= 0 && start > 0) {
            Map<String, Object> phase = new HashMap<>();
            phase.put("entryType", "reformNavigation");
            phase.put("name", name);
            phase.put("startTime", start);
            phase.put("responseEnd", end);
            return phase;
        }
        return null;
    }

    /**
     * LCP(Largest Contentful Paint) 마킹을 위한 메서드
     * 성능 최적화: 단일 루프로 LCP URL 찾기와 마킹을 동시에 처리
     *
     * @param resourceInfoData 리소스 정보 데이터 리스트
     */
    public static void markLargestContentfulPaint(List<Map<String, Object>> resourceInfoData) {
        if (resourceInfoData == null || resourceInfoData.isEmpty()) {
            return;
        }

        // 가독성을 위한 상수 정의
        final String LCP_ENTRY_TYPE = "largest-contentful-paint";
        final String LCP_MARK = "lcp";
        final String ENTRY_TYPE_KEY = "entryType";
        final String URL_KEY = "url";
        final String NAME_KEY = "name";
        final String SIZE_KEY = "size";
        final String MARK_KEY = "mark";

        String lcpUrl = null;
        int maxSize = 0;

        // 첫 번째 패스: 최대 크기를 가진 LCP URL 찾기
        for (Map<String, Object> item : resourceInfoData) {
            if (LCP_ENTRY_TYPE.equals(item.get(ENTRY_TYPE_KEY))) {
                String url = (String) item.get(URL_KEY);
                Integer size = CommonUtil.toInteger(item.get(SIZE_KEY));

                if (CommonUtil.isValidString(url) && size != null && size > maxSize) {
                    lcpUrl = url;
                    maxSize = size;
                }
            }
        }

        // 두 번째 패스: LCP URL에 해당하는 리소스에 마킹
        if (lcpUrl != null) {
            final String finalLcpUrl = lcpUrl;
            final int finalMaxSize = maxSize;
            resourceInfoData.stream()
                    .filter(item -> finalLcpUrl.equals(item.get(NAME_KEY)))
                    .findFirst()
                    .ifPresent(item -> {
                        item.put(MARK_KEY, LCP_MARK);
                        item.put("lcpSize", finalMaxSize);
                    });
        }
    }
}
