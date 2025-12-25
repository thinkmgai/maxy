package com.thinkm.maxy.service.front.helper;

import com.thinkm.common.util.CommonUtil;
import com.thinkm.maxy.model.front.ReadStatus;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.action.search.SearchResponse;
import org.opensearch.search.SearchHits;

import java.util.Map;

/**
 * FrontCommonService에서 사용하는 OpenSearch 응답 파싱 유틸리티입니다.
 */
@Slf4j
public class FrontCommonServiceHelper {

    /**
     * 읽음 상태 응답 파싱
     * - 응답 없음 → null
     * - 히트 없음 → 기본 ReadStatus(false)
     * - 첫번째 히트 → ReadStatus(true, regDt)
     */
    public static ReadStatus parseIsReadError(SearchResponse response, Long hashKey) {
        if (response == null) {
            return new ReadStatus(hashKey);
        }

        SearchHits hits = response.getHits();
        if (hits == null || hits.getHits().length == 0) {
            return new ReadStatus(hashKey);
        }

        Map<String, Object> item = hits.getAt(0).getSourceAsMap();
        if (item == null) {
            return new ReadStatus(hashKey);
        }

        return new ReadStatus(true,
                CommonUtil.toLong(item.get("regDt")),
                CommonUtil.toLong(item.get("regNo")),
                CommonUtil.toLong(item.get("hash")));
    }
}
