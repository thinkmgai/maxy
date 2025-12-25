package com.thinkm.maxy.service.front.helper;

import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.Elastic;
import com.thinkm.maxy.dto.front.common.PageDetailResponseDto;
import com.thinkm.maxy.dto.front.common.SinglePageInfo;
import com.thinkm.maxy.dto.front.dashboard.page.PageListResponseDto;
import lombok.extern.slf4j.Slf4j;
import org.apache.lucene.search.TotalHits;
import org.opensearch.action.search.SearchResponse;
import org.opensearch.search.SearchHit;
import org.opensearch.search.SearchHits;
import org.opensearch.search.aggregations.metrics.ParsedAvg;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * FrontPageService에서 조회한 OpenSearch 응답을 DTO로 변환하는 헬퍼 클래스입니다.
 */
@Slf4j
public class FrontPageServiceHelper {
    /**
     * 페이지 상세 데이터를 DTO로 변환한다.
     *
     * @param source        OpenSearch 소스 맵
     * @param userIdMasking 사용자 ID 마스킹 여부
     * @return 상세 데이터 DTO
     */
    public static PageDetailResponseDto.DetailData parsePageDetailData(Map<String, Object> source, boolean userIdMasking) {
        return PageDetailResponseDto.DetailData.from(source, userIdMasking);
    }

    /**
     * 단일 페이지 정보를 파싱한다.
     *
     * @param response OpenSearch 검색 응답
     * @return 단일 페이지 정보 DTO
     */
    public static SinglePageInfo parseSinglePageInfo(SearchResponse response) {
        if (response == null || response.getHits() == null) {
            return null;
        }
        SearchHits hits = response.getHits();
        if (hits.iterator().hasNext()) {
            Map<String, Object> source = hits.iterator().next().getSourceAsMap();
            return SinglePageInfo.from(source);
        } else {
            return null;
        }
    }

    /**
     * 페이지 로그 존재 여부를 파악한다.
     *
     * @param response OpenSearch 검색 응답
     * @return 로그 존재시 true
     */
    public static boolean parseExistsPageInfo(SearchResponse response) {
        if (response == null || response.getHits() == null) {
            return false;
        }
        return response.getHits().getTotalHits() != null && response.getHits().getTotalHits().value > 0;
    }

    /**
     * 페이지 목록 응답을 파싱한다.
     *
     * @param response OpenSearch 검색 결과
     * @return 페이지 목록 DTO
     */
    public static PageListResponseDto parsePageListData(SearchResponse response, Map<String, Long> avgMap) {
        if (response == null || response.getHits() == null || response.getHits().getTotalHits() == null) {
            return new PageListResponseDto();
        }
        PageListResponseDto result = new PageListResponseDto();

        // 검색 결과 전체
        TotalHits totalHits = response.getHits().getTotalHits();
        result.setTotalHits(totalHits.value);

        // avg loading time
        if (response.getAggregations() != null && response.getAggregations().get(Elastic.RES) != null) {
            ParsedAvg avg = response.getAggregations().get(Elastic.RES);
            result.setAvg(CommonUtil.toDouble(avg.getValue(), 2));
        }

        // 목록 항목
        List<PageListResponseDto.PageListData> list = new ArrayList<>();
        for (SearchHit hit : response.getHits()) {
            Map<String, Object> source = hit.getSourceAsMap();
            CommonUtil.putFeelDex(Elastic.loadingTime, avgMap, source);
            list.add(PageListResponseDto.PageListData.from(hit.getId(), source));
        }
        result.setData(list);

        return result;
    }
}
