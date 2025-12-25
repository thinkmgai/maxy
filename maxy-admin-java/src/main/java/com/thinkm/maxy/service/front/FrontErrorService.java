package com.thinkm.maxy.service.front;

import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.util.DummyUtil;
import com.thinkm.common.util.ElasticClient;
import com.thinkm.common.util.HashUtil;
import com.thinkm.common.util.sourcemap.StackMappingResult;
import com.thinkm.maxy.domain.front.error.ErrorListSearchCondition;
import com.thinkm.maxy.dto.front.common.SinglePageInfo;
import com.thinkm.maxy.dto.front.dashboard.error.ErrorDetailRequestDto;
import com.thinkm.maxy.dto.front.dashboard.error.ErrorDetailResponseDto;
import com.thinkm.maxy.dto.front.dashboard.error.ErrorListResponseDto;
import com.thinkm.maxy.model.front.ReadStatus;
import com.thinkm.maxy.service.common.SourceMapService;
import com.thinkm.maxy.service.front.factory.FrontErrorFactory;
import com.thinkm.maxy.service.front.helper.FrontErrorServiceHelper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.action.search.SearchResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 프런트 대시보드에서 에러 목록/상세 데이터를 조회하고 읽음 상태와 이벤트 내역을 제공하는 서비스입니다.
 * <p>OpenSearch에서 에러 로그를 검색해 DTO로 변환하고, 공통 서비스와 연동해 사용자가 이미 확인한 오류인지 표시합니다.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FrontErrorService {
    private final ElasticClient client;
    private final FrontCommonService frontCommonService;
    private final SourceMapService sourceMapService;

    @Value("${maxy.userid-masking:false}")
    private boolean userIdMasking;

    /**
     * 에러 요청 목록을 조회한다.
     *
     * @param sc 조회 조건
     * @return 응답 시간 평균 등 집계가 포함된 DTO
     */
    public ErrorListResponseDto.ListData getErrorListData(ErrorListSearchCondition sc) {
        SearchRequest searchRequest = FrontErrorFactory.createErrorListQuery(sc);
        try {
            SearchResponse response = client.get(searchRequest);
            return FrontErrorServiceHelper.parseErrorListData(response, userIdMasking);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return new ErrorListResponseDto.ListData();
        }
    }

    /**
     * 에러 상세 데이터를 조회하고 읽음 여부를 계산한다.
     *
     * @param dto 조회 조건
     * @return 에러 상세 DTO
     */
    public ErrorDetailResponseDto.DetailData getErrorDetailData(ErrorDetailRequestDto dto) {
        try {
            // docId로 detail 조회
            String[] indexes = ElasticIndex.getIndicesForDateRange(ElasticIndex.TROUBLE_LOG, dto.getFrom(), dto.getTo());
            Map<String, Object> response = client.get(indexes, dto.getDocId());
            ErrorDetailResponseDto.DetailData result = FrontErrorServiceHelper.parseErrorDetailData(response, userIdMasking);

            // appId가 front(demo 시연용)이면 더미 에러 메시지로 대체하여 파싱한다.
            if ("front".equals(dto.getPackageNm())) {
                List<StackMappingResult> parsedError = sourceMapService.mapErrorStack(DummyUtil.makeErrorStackDummy());
                result.setMappedErrorStack(parsedError);
            }

            // error msg 읽었는지 판단
            Long hashKey = HashUtil.hash(result.getResMsg());
            if (hashKey != null) {
                // 에러 메시지 해시 기반으로 읽음 플래그를 조회
                ReadStatus readStatus = frontCommonService.checkRead(
                        dto.getPackageNm(),
                        dto.getServerType(),
                        "error",
                        hashKey);
                result.setHash(hashKey + "");
                if (readStatus != null && readStatus.isReadFlag()) {
                    result.setReadFlag(true);
                    result.setReadAt(readStatus.getReadAt());
                } else {
                    result.setReadFlag(false);
                }
            }

            return result;
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return new ErrorDetailResponseDto.DetailData();
        }
    }

    /**
     * 에러 발생 시점의 이벤트 정보를 조회한다.
     *
     * @param dto 에러 상세 정보
     * @param to  조회 종료 시간
     * @return 에러 이벤트 리스트
     */
    public List<ErrorDetailResponseDto.EventInfo> getErrorEventInfoList(SinglePageInfo dto, long to) {
        SearchRequest searchRequest = FrontErrorFactory.createErrorEventListQuery(dto, to);
        try {
            SearchResponse response = client.get(searchRequest);
            return FrontErrorServiceHelper.parseErrorEventListData(response);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return new ArrayList<>();
        }
    }
}
