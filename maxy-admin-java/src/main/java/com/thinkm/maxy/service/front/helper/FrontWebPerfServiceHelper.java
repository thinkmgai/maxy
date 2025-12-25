package com.thinkm.maxy.service.front.helper;

import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.Elastic;
import com.thinkm.common.util.JsonUtil;
import com.thinkm.maxy.dto.front.webperf.error.ErrorAggregateListResponseDto;
import com.thinkm.maxy.dto.front.webperf.network.NetworkAggregateListResponseDto;
import com.thinkm.maxy.dto.front.webperf.page.PageAggregateListResponseDto;
import com.thinkm.maxy.dto.front.webperf.ratio.RatioRequestDto;
import com.thinkm.maxy.dto.front.webperf.ratio.RatioResponseDto;
import com.thinkm.maxy.dto.front.webperf.vital.VitalResponseDto;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.action.search.SearchResponse;
import org.opensearch.search.aggregations.bucket.composite.ParsedComposite;
import org.opensearch.search.aggregations.bucket.filter.ParsedFilter;
import org.opensearch.search.aggregations.metrics.ParsedAvg;
import org.opensearch.search.aggregations.metrics.ParsedCardinality;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * FrontWebPerfService에서 사용하는 OpenSearch 응답 파싱 유틸리티입니다.
 * 웹 성능 지표를 DTO 구조로 변환합니다.
 */
@Slf4j
public class FrontWebPerfServiceHelper {
    /**
     * Web Vital 집계 응답을 파싱한다.
     *
     * @param response OpenSearch 검색 결과
     * @return Vital 응답 DTO
     */
    public static VitalResponseDto parseVitalData(SearchResponse response) {
        if (response == null || response.getAggregations() == null) {
            return new VitalResponseDto();
        }

        VitalResponseDto result = new VitalResponseDto();
        ParsedComposite composite = response.getAggregations().get(Elastic.RES);
        for (ParsedComposite.ParsedBucket bucket : composite.getBuckets()) {
            String name = (String) bucket.getKey().get(Elastic.name);
            if (name == null) {
                continue;
            }
            ParsedAvg avg = bucket.getAggregations().get(Elastic.SUB_AGGS_1);
            double val = avg != null ? CommonUtil.toDouble(avg.getValue()) : 0;
            switch (name.toLowerCase()) {
                case "lcp" -> result.setLcp(val);
                case "inp" -> result.setInp(val);
                case "cls" -> result.setCls(val);
                case "fcp" -> result.setFcp(val);
                case "ttfb" -> result.setTtfb(val);
            }
        }
        return result;
    }

    /**
     * 페이지 성능 집계 응답을 파싱한다.
     *
     * @param size     요청한 결과 수
     * @param response OpenSearch 검색 결과
     * @return 페이지 집계 리스트 DTO
     */
    public static PageAggregateListResponseDto parsePageAggregateList(int size, SearchResponse response) {
        if (response == null || response.getAggregations() == null) {
            return new PageAggregateListResponseDto();
        }

        List<PageAggregateListResponseDto.ListData> list = new ArrayList<>();

        ParsedComposite composite = response.getAggregations().get(Elastic.RES);
        if (composite == null) {
            return new PageAggregateListResponseDto();
        }

        composite.getBuckets().forEach(bucket -> {
            Object keyObj = bucket.getKey().get(Elastic.reqUrl);
            String key = (keyObj == null) ? null : keyObj.toString();
            if (key == null || key.isEmpty()) {
                return;
            }

            // 각 metric: filter → avg 구조에서 꺼내기
            double durationVal = 0.0;
            double userCountVal = 0.0;
            double lcpVal = 0.0;
            double inpVal = 0.0;
            double clsVal = 0.0;

            ParsedAvg durationAvg = bucket.getAggregations().get(Elastic.loadingTime);
            if (durationAvg != null && !Double.isNaN(durationAvg.getValue())) {
                durationVal = CommonUtil.toDouble(durationAvg.getValue(), 2);
            }

            ParsedCardinality userCount = bucket.getAggregations().get(Elastic.deviceId);
            if (userCount != null) {
                userCountVal = CommonUtil.toDouble(userCount.getValue(), 0);
            }

            ParsedFilter lcpFilter = bucket.getAggregations().get("lcp_filter");
            if (lcpFilter != null) {
                ParsedAvg lcpAvg = lcpFilter.getAggregations().get("lcp_avg");
                if (lcpAvg != null && !Double.isNaN(lcpAvg.getValue())) {
                    lcpVal = CommonUtil.toDouble(lcpAvg.getValue(), 4);
                }
            }

            ParsedFilter inpFilter = bucket.getAggregations().get("inp_filter");
            if (inpFilter != null) {
                ParsedAvg inpAvg = inpFilter.getAggregations().get("inp_avg");
                if (inpAvg != null && !Double.isNaN(inpAvg.getValue())) {
                    inpVal = CommonUtil.toDouble(inpAvg.getValue(), 4);
                }
            }

            ParsedFilter clsFilter = bucket.getAggregations().get("cls_filter");
            if (clsFilter != null) {
                ParsedAvg clsAvg = clsFilter.getAggregations().get("cls_avg");
                if (clsAvg != null && !Double.isNaN(clsAvg.getValue())) {
                    clsVal = CommonUtil.toDouble(clsAvg.getValue(), 4);
                }
            }

            PageAggregateListResponseDto.ListData data = PageAggregateListResponseDto.ListData.builder()
                    .reqUrl(key)
                    .count(bucket.getDocCount()) // 전체 버킷 문서 수를 유지
                    .loadingTime(durationVal)
                    .userCount(userCountVal)
                    .lcp(lcpVal)
                    .inp(inpVal)
                    .cls(clsVal)
                    .build();

            list.add(data);
        });

        String afterKey = null;
        if (list.size() == size) {
            Map<String, Object> afterKeyMap = composite.afterKey();
            if (afterKeyMap != null && !afterKeyMap.isEmpty()) {
                afterKey = JsonUtil.toJson(afterKeyMap);
            }
        }

        return new PageAggregateListResponseDto(list, afterKey);
    }

    /**
     * 비율(플랫폼/브라우저 등) 응답을 파싱한다.
     *
     * @param type     비율 데이터 타입
     * @param response OpenSearch 검색 결과
     * @return 비율 응답 DTO
     */
    public static RatioResponseDto parseRatioList(RatioRequestDto.DataType type, SearchResponse response) {
        boolean isVersion = false;
        String targetField = switch (type) {
            case BROWSER_VERSION -> {
                isVersion = true;
                yield Elastic.deviceModel; // deviceModel + webviewVer 조합
            }
            case BROWSER -> Elastic.deviceModel;
            case PLATFORM -> Elastic.platform;
            case OS -> Elastic.osType;
        };

        if (response == null || response.getAggregations() == null) {
            return new RatioResponseDto();
        }

        ParsedComposite composite = response.getAggregations().get(Elastic.RES);
        if (composite == null) {
            return new RatioResponseDto();
        }

        List<RatioResponseDto.DetailData> detailData = new ArrayList<>();

        for (ParsedComposite.ParsedBucket bucket : composite.getBuckets()) {
            Map<String, Object> keyMap = bucket.getKey();
            Object nameObj = keyMap.get(targetField);
            if (nameObj == null) {
                // 키가 없으면 스킵
                continue;
            }

            String name = nameObj.toString();
            String version = null;
            if (isVersion) {
                Object verObj = keyMap.get(Elastic.webviewVer);
                version = (verObj == null) ? null : verObj.toString();
            }

            double lcpVal = 0.0;
            double clsVal = 0.0;
            double inpVal = 0.0;

            // lcp: filter -> avg
            ParsedFilter lcpFilter = bucket.getAggregations().get("lcp_filter");
            if (lcpFilter != null) {
                ParsedAvg lcpAvg = lcpFilter.getAggregations().get("lcp_avg");
                if (lcpAvg != null && !Double.isNaN(lcpAvg.getValue())) {
                    lcpVal = CommonUtil.toDouble(lcpAvg.getValue());
                }
            }

            // cls: filter -> avg
            ParsedFilter clsFilter = bucket.getAggregations().get("cls_filter");
            if (clsFilter != null) {
                ParsedAvg clsAvg = clsFilter.getAggregations().get("cls_avg");
                if (clsAvg != null && !Double.isNaN(clsAvg.getValue())) {
                    clsVal = CommonUtil.toDouble(clsAvg.getValue());
                }
            }

            // inp: filter -> avg
            ParsedFilter inpFilter = bucket.getAggregations().get("inp_filter");
            if (inpFilter != null) {
                ParsedAvg inpAvg = inpFilter.getAggregations().get("inp_avg");
                if (inpAvg != null && !Double.isNaN(inpAvg.getValue())) {
                    inpVal = CommonUtil.toDouble(inpAvg.getValue());
                }
            }

            detailData.add(
                    RatioResponseDto.DetailData.builder()
                            .name(name)
                            .count(bucket.getDocCount()) // 전체 버킷 문서 수
                            .version(isVersion ? version : null)
                            .cls(clsVal)
                            .inp(inpVal)
                            .lcp(lcpVal)
                            .build()
            );
        }

        // 비율 리스트 구성
        List<RatioResponseDto.RatioData> ratioList = new ArrayList<>();
        for (RatioResponseDto.DetailData item : detailData) {
            ratioList.add(new RatioResponseDto.RatioData(item.getName(), item.getCount()));
        }

        return new RatioResponseDto(ratioList, detailData);
    }

    public static NetworkAggregateListResponseDto parseNetworkAggregateList(int size, SearchResponse response) {
        if (response == null || response.getAggregations() == null) {
            return new NetworkAggregateListResponseDto();
        }

        List<NetworkAggregateListResponseDto.ListData> list = new ArrayList<>();

        ParsedComposite composite = response.getAggregations().get(Elastic.RES);
        if (composite == null) {
            return new NetworkAggregateListResponseDto();
        }

        composite.getBuckets().forEach(bucket -> {
            Object keyObj = bucket.getKey().get(Elastic.reqUrl);
            String key = (keyObj == null) ? null : keyObj.toString();
            if (key == null || key.isEmpty()) {
                return;
            }

            double durationVal = 0.0;
            double userCountVal = 0.0;

            ParsedAvg durationAvg = bucket.getAggregations().get(Elastic.intervaltime);
            if (durationAvg != null && !Double.isNaN(durationAvg.getValue())) {
                durationVal = CommonUtil.toDouble(durationAvg.getValue(), 2);
            }

            ParsedCardinality userCount = bucket.getAggregations().get(Elastic.deviceId);
            if (userCount != null) {
                userCountVal = CommonUtil.toDouble(userCount.getValue(), 0);
            }

            ParsedFilter filter2xx = bucket.getAggregations().get("2xx");
            ParsedFilter filter4xx = bucket.getAggregations().get("4xx");
            ParsedFilter filter5xx = bucket.getAggregations().get("5xx");

            NetworkAggregateListResponseDto.ListData data = NetworkAggregateListResponseDto.ListData.builder()
                    .reqUrl(key)
                    .count(bucket.getDocCount()) // 전체 버킷 문서 수를 유지
                    .responseTime(durationVal)
                    .userCount(userCountVal)
                    .count2xx(filter2xx.getDocCount())
                    .count4xx(filter4xx.getDocCount())
                    .count5xx(filter5xx.getDocCount())
                    .build();

            list.add(data);
        });

        String afterKey = null;
        if (list.size() == size) {
            Map<String, Object> afterKeyMap = composite.afterKey();
            if (afterKeyMap != null && !afterKeyMap.isEmpty()) {
                afterKey = JsonUtil.toJson(afterKeyMap);
            }
        }

        return new NetworkAggregateListResponseDto(list, afterKey);
    }

    public static ErrorAggregateListResponseDto parseErrorAggregateList(int size, SearchResponse response) {
        if (response == null || response.getAggregations() == null) {
            return new ErrorAggregateListResponseDto();
        }

        List<ErrorAggregateListResponseDto.ListData> list = new ArrayList<>();

        ParsedComposite composite = response.getAggregations().get(Elastic.RES);
        if (composite == null) {
            return new ErrorAggregateListResponseDto();
        }

        composite.getBuckets().forEach(bucket -> {
            Object keyObj = bucket.getKey().get(Elastic.resMsg);
            String key = (keyObj == null) ? null : keyObj.toString();
            if (key == null || key.isEmpty()) {
                return;
            }

            double userCountVal = 0.0;

            ParsedCardinality userCount = bucket.getAggregations().get(Elastic.deviceId);
            if (userCount != null) {
                userCountVal = CommonUtil.toDouble(userCount.getValue(), 0);
            }

            ErrorAggregateListResponseDto.ListData data = ErrorAggregateListResponseDto.ListData.builder()
                    .reqUrl(key)
                    .count(bucket.getDocCount()) // 전체 버킷 문서 수를 유지
                    .userCount(userCountVal)
                    .build();

            list.add(data);
        });

        String afterKey = null;
        if (list.size() == size) {
            Map<String, Object> afterKeyMap = composite.afterKey();
            if (afterKeyMap != null && !afterKeyMap.isEmpty()) {
                afterKey = JsonUtil.toJson(afterKeyMap);
            }
        }

        return new ErrorAggregateListResponseDto(list, afterKey);
    }
}
