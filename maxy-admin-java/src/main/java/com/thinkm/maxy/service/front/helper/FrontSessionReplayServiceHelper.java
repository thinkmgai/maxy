package com.thinkm.maxy.service.front.helper;

import com.thinkm.common.util.Elastic;
import com.thinkm.maxy.dto.front.sessionreplay.SessionReplayRequestDto;
import com.thinkm.maxy.dto.front.sessionreplay.SessionReplayResponseDto;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.action.search.SearchResponse;
import org.opensearch.search.SearchHit;

import java.util.ArrayList;
import java.util.List;

/**
 * FrontSessionReplayService에서 사용하는 응답 파싱 헬퍼입니다.
 */
@Slf4j
public class FrontSessionReplayServiceHelper {

    /**
     * 세션 리플레이 액션 리스트 응답을 파싱한다.
     *
     * @param response OpenSearch 검색 결과
     * @param dto 조회 조건 DTO
     * @return 액션 리스트가 포함된 응답 DTO
     */
    public static SessionReplayResponseDto parseActionListData(SearchResponse response, SessionReplayRequestDto dto) {
        if (response == null || response.getHits() == null || response.getHits().getTotalHits() == null) {
            return new SessionReplayResponseDto();
        }
        SessionReplayResponseDto result = new SessionReplayResponseDto();

        List<SessionReplayResponseDto.ActionListData> list = new ArrayList<>();
        for (SearchHit hit : response.getHits()) {
            list.add(SessionReplayResponseDto.ActionListData.from(hit.getSourceAsMap(), dto.getFrom()));
        }
        result.setActionList(list);

        return result;
    }

    /**
     * 세션 시작 시간(pageStartTm)을 파싱한다.
     *
     * @param response OpenSearch 검색 결과
     * @return 응답 DTO
     */
    public static Long parsePageStartTm(SearchResponse response) {
        if (response == null || response.getHits() == null || response.getHits().getTotalHits() == null) {
            return null;
        }

        SearchHit[] hits = response.getHits().getHits();
        if (hits.length == 0) {
            return null;
        }

        return (Long) hits[0].getSourceAsMap().get(Elastic.pageStartTm);
    }

    /**
     * 세션 종료 시간(logTm)을 파싱한다.
     *
     * @param response OpenSearch 검색 결과
     * @return logTm 값 (없으면 null)
     */
    public static Long parseLogTm(SearchResponse response) {
        if (response == null || response.getHits() == null || response.getHits().getTotalHits() == null) {
            return null;
        }

        SearchHit[] hits = response.getHits().getHits();
        if (hits.length == 0) {
            return null;
        }

        return (Long) hits[0].getSourceAsMap().get(Elastic.logTm);
    }
}
