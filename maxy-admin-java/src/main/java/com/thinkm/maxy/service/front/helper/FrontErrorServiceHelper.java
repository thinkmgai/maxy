package com.thinkm.maxy.service.front.helper;

import com.thinkm.common.util.CommonUtil;
import com.thinkm.maxy.dto.front.dashboard.error.ErrorDetailResponseDto;
import com.thinkm.maxy.dto.front.dashboard.error.ErrorListResponseDto;
import lombok.extern.slf4j.Slf4j;
import org.apache.lucene.search.TotalHits;
import org.opensearch.action.search.SearchResponse;
import org.opensearch.search.SearchHit;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * FrontErrorService에서 사용하는 응답 파싱 로직을 모아둔 헬퍼 클래스입니다.
 * OpenSearch/SearchResponse를 가공해 화면에서 사용하는 DTO로 변환합니다.
 */
@Slf4j
public class FrontErrorServiceHelper {

    /**
     * 에러 목록 응답을 파싱한다.
     *
     * @param response OpenSearch 검색 결과
     * @return 에러 목록 DTO
     */
    public static ErrorListResponseDto.ListData parseErrorListData(SearchResponse response, boolean userIdMasking) {
        if (response == null || response.getHits() == null || response.getHits().getTotalHits() == null) {
            return new ErrorListResponseDto.ListData();
        }
        ErrorListResponseDto.ListData result = new ErrorListResponseDto.ListData();
        TotalHits totalHits = response.getHits().getTotalHits();
        result.setTotalHits(totalHits.value);

        List<ErrorListResponseDto.ListDetail> list = new ArrayList<>();
        for (SearchHit hit : response.getHits()) {
            ErrorListResponseDto.ListDetail item = ErrorListResponseDto.ListDetail.from(hit.getId(), hit.getSourceAsMap());
            item.setUserId(CommonUtil.maskUserId(item.getUserId(), userIdMasking, 2));
            list.add(item);
        }
        result.setList(list);

        return result;
    }


    /**
     * 에러 상세 데이터를 파싱한다.
     *
     * @param source 소스 맵
     * @return 에러 상세 DTO
     */
    public static ErrorDetailResponseDto.DetailData parseErrorDetailData(Map<String, Object> source, boolean userIdMasking) {
        return ErrorDetailResponseDto.DetailData.from(source, userIdMasking);
    }

    /**
     * 에러 상세 이벤트 리스트를 파싱한다.
     *
     * @param response OpenSearch 검색 결과
     * @return 에러 이벤트 리스트
     */
    public static List<ErrorDetailResponseDto.EventInfo> parseErrorEventListData(SearchResponse response) {
        if (response == null || response.getHits() == null || response.getHits().getTotalHits() == null) {
            return new ArrayList<>();
        }

        List<ErrorDetailResponseDto.EventInfo> result = new ArrayList<>();
        response.getHits().forEach(item -> {
            result.add(ErrorDetailResponseDto.EventInfo.from(item.getSourceAsMap()));
        });

        return result;
    }
}
