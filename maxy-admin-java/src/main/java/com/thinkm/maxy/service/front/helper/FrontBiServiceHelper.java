package com.thinkm.maxy.service.front.helper;

import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.DateUtil;
import com.thinkm.common.util.Elastic;
import com.thinkm.maxy.dto.front.bi.BiCcuResponseDto;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.action.search.SearchResponse;
import org.opensearch.search.SearchHit;
import org.opensearch.search.aggregations.bucket.composite.ParsedComposite;
import org.opensearch.search.aggregations.metrics.ParsedMax;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * FrontBiService에서 사용하는 OpenSearch/Redis 응답 파싱 유틸리티입니다.
 */
@Slf4j
public class FrontBiServiceHelper {

    /**
     * 일 단위 CCU 차트 응답을 파싱한다.
     *
     * @param response OpenSearch 검색 결과
     * @return CCU 응답 DTO
     */
    public static BiCcuResponseDto parseCcuChart(SearchResponse response) {
        if (response == null || response.getHits() == null) {
            return new BiCcuResponseDto();
        }

        Map<String, Long> tmp = new HashMap<>();
        for (SearchHit hit : response.getHits()) {
            Map<String, Object> map = hit.getSourceAsMap();
            String key = map.get("dateTime").toString();
            Long value = CommonUtil.toLong(map.get("value"));

            tmp.merge(key, value, Long::max);
        }

        return BiCcuResponseDto.from(tmp);
    }

    /**
     * 기간 범위 CCU 차트 응답을 파싱한다.
     *
     * @param response OpenSearch 검색 결과
     * @param from 조회 시작일 (epoch millis)
     * @param to 조회 종료일 (epoch millis)
     * @return CCU 응답 DTO
     */
    public static BiCcuResponseDto parseCcuDateChart(SearchResponse response, long from, long to) {
        if (response == null || response.getAggregations() == null) {
            return new BiCcuResponseDto();
        }

        // date padding 하려고 임시 map에 데이터를 쌓을 것
        Map<String, Long> tmp = new HashMap<>();
        ParsedComposite composite = response.getAggregations().get(Elastic.RES);
        composite.getBuckets().forEach(bucket -> {
            Map<String, Object> keyMap = bucket.getKey();
            ParsedMax parsedMax = bucket.getAggregations().get("maxCount");
            double val = CommonUtil.toDouble(parsedMax.getValue());
            tmp.put("" + keyMap.get("year") + keyMap.get("month") + keyMap.get("day") + "000000", (long) val);
        });

        // padding date
        for (String date : DateUtil.generateDateRange(from, to, "000000")) {
            tmp.putIfAbsent(date, 0L);
        }

        return BiCcuResponseDto.from(tmp);
    }

    /**
     * Redis로부터 조회한 당일 CCU 데이터를 파싱한다.
     *
     * @param valList 값 목록
     * @param keyList 키 목록
     * @return CCU 응답 DTO
     */
    public static BiCcuResponseDto parseCcuTodayData(List<Object> valList, List<String> keyList) {
        if (valList == null || valList.isEmpty()) {
            return new BiCcuResponseDto();
        }

        Map<String, Long> tmp = new HashMap<>();
        long s2 = System.currentTimeMillis();
        for (int i = 0; i < keyList.size(); i++) {
            String key = keyList.get(i);
            String[] keyArr = key.split(":");
            if (keyArr.length != 5) {
                continue;
            }
            String time = keyArr[4];
            if (time.length() > 12) {
                // 12 자리 넘어가면 (초 포함이라면) 분까지로 자르기
                time = time.substring(0, 12);
            }

            // null check 하여 time: val 구조로 넣기
            Object val = valList.get(i);
            tmp.put(time, val == null ? 0L : Long.parseLong(String.valueOf(val)));
        }
        log.debug("get concurrent user count time: {} ms", System.currentTimeMillis() - s2);

        // 현재시간까지의 padding 값 추가
        for (String time : DateUtil.generateTimeArray()) {
            tmp.putIfAbsent(time, 0L);
        }
        return BiCcuResponseDto.from(tmp);
    }
}
