package com.thinkm.maxy.service.front;

import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.exception.NotFoundException;
import com.thinkm.common.util.Elastic;
import com.thinkm.common.util.ElasticClient;
import com.thinkm.maxy.dto.front.common.PageInfoRequestDto;
import com.thinkm.maxy.dto.front.common.SinglePageInfo;
import com.thinkm.maxy.dto.front.user.*;
import com.thinkm.maxy.service.common.CommonService;
import com.thinkm.maxy.service.front.factory.FrontUserAnalyticsFactory;
import com.thinkm.maxy.service.front.helper.FrontUserAnalyticsServiceHelper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.action.search.SearchResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 프론트 사용자 분석 데이터를 조회하고 가공하는 서비스.
 * <p>
 * OpenSearch에 저장된 페이지/이벤트/사용자 로그를 조회해 화면에서 필요한 정보를 반환한다.
 * 공통 설정 값(아이디 마스킹 여부, 검색 필드 옵션 등)을 이용해 쿼리와 응답을 조정한다.
 * </p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FrontUserAnalyticsService {
    private final ElasticClient client;
    private final FrontPageService frontPageService;

    @Value("${maxy.userid-masking:false}")
    private boolean userIdMasking;
    @Value("${maxy.userid-uppercase:false}")
    private Boolean isUseIdUpperCase;
    @Value("${maxy.optional-search-fields:}")
    private String optionalSearchFields;
    private Map<String, String> optionalSearchFieldMap;

    /**
     * 선택 검색 필드 설정을 내부 맵 구조로 변환한다.
     * 오류가 발생할 경우 빈 맵으로 초기화해 검색 기능이 중단되지 않도록 한다.
     */
    @PostConstruct
    private void init() {
        try {
            optionalSearchFieldMap = CommonService.convertSearchFieldsToMap(optionalSearchFields);
        } catch (Exception e) {
            optionalSearchFieldMap = new HashMap<>();
        }
    }

    /**
     * searchType이 유효한 검색 필드인지 확인
     *
     * @param searchType 검색 타입
     * @return 유효한 검색 필드인지 여부
     */
    private boolean isValidSearchType(String searchType) {
        // 기본 검색 필드 (deviceId, userId, clientNo)
        if (Elastic.deviceId.equalsIgnoreCase(searchType)
            || Elastic.userId.equalsIgnoreCase(searchType)
            || "multiple".equalsIgnoreCase(searchType)) {
            return true;
        }

        return optionalSearchFieldMap.containsKey(searchType);
    }

    /**
     * 사용자 흐름(페이지 이동 경로) 목록을 조회한다.
     * <p>
     * mxPageId가 전달되면 페이지 정보를 선 조회해 parentLogDate를 보정한 뒤 검색을 수행한다.
     * 검색 중 오류가 발생하면 비어 있는 리스트를 반환한다.
     * </p>
     *
     * @param dto 사용자 흐름 조회 조건
     * @return 사용자 흐름 페이지 정보 목록
     */
    public List<List<PageFlowResponseDto.PageInfo>> getUserFlowList(PageFlowRequestDto dto) {
        if (!dto.isValid()) {
            throw new BadRequestException(ReturnCode.ERR_EMPTY_PARAMS);
        }
        if (dto.getMxPageId() != null) {
            // 만약 mxPageId가 있다면 mxPageId 로 페이지 검색 후 parentLogDate 를 대체하여 조회한다.
            SinglePageInfo pageInfo = frontPageService.getSinglePageInfo(new PageInfoRequestDto(
                    dto.getPackageNm(),
                    dto.getServerType(),
                    dto.getMxPageId(),
                    dto.getFrom()));
            if (pageInfo == null || pageInfo.getParentLogDate() == null || pageInfo.getParentLogDate() <= 0) {
                throw new NotFoundException(ReturnCode.ERR_NOT_FOUND_DOC);
            }
            dto.setParentLogDate(pageInfo.getParentLogDate());
        }

        // mxPageId가 없고 from/to 를 가지고 있다면 from/to 사이 데이터를 조회한다.
        SearchRequest searchRequest = FrontUserAnalyticsFactory.createPageListQuery(dto, isUseIdUpperCase);
        try {
            SearchResponse response = client.get(searchRequest);
            return FrontUserAnalyticsServiceHelper.parsePageList(response, userIdMasking);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    /**
     * 단일 페이지 로그 상세 정보를 조회한다.
     *
     * @param dto 페이지 상세 요청 정보
     * @return 페이지 상세 응답 DTO (없으면 {@code null})
     */
    public PageFlowDetailResponseDto.PageInfo getPageInfo(PageFlowDetailRequestDto dto, Map<String, Long> avgMap) {
        try {
            String[] indexes = ElasticIndex.getIndicesForDateRange(ElasticIndex.PAGE_LOG, dto.getFrom(), dto.getTo());
            Map<String, Object> map = client.get(indexes, dto.getDocId());
            return PageFlowDetailResponseDto.PageInfo.from(map, userIdMasking, avgMap);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return null;
        }
    }

    /**
     * 특정 페이지에 연결된 이벤트 목록을 조회한다.
     *
     * @param dto      검색 기간 및 필터 조건
     * @param pageInfo 연관 페이지 정보 (mxPageId 사용)
     * @return 이벤트 상세 목록
     */
    public List<PageFlowDetailResponseDto.EventInfo> getEvents(PageFlowDetailRequestDto dto, PageFlowDetailResponseDto.PageInfo pageInfo) {
        String mxPageId = pageInfo.getMxPageId();
        SearchRequest searchRequest = FrontUserAnalyticsFactory.createEventListQuery(dto, mxPageId);
        try {
            SearchResponse response = client.get(searchRequest);
            return FrontUserAnalyticsServiceHelper.parseEventList(response);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    /**
     * 특정 사용자의 상세 정보를 조회한다.
     * <p>
     * 페이지 로그, 접근 로그, 디바이스 정보를 순차적으로 조회하며 응답 DTO에 병합한다.
     * 조회 과정에서 예외가 발생해도 가능한 정보는 계속 누적한다.
     * </p>
     *
     * @param dto 사용자 상세 요청 조건
     * @return 사용자 상세 응답 DTO
     */
    public UserDetailResponseDto getUserDetail(UserDetailRequestDto dto) {
        SearchRequest searchRequestFromPageLog = FrontUserAnalyticsFactory.createUserDetailFromPageLogQuery(dto);
        SearchRequest searchRequestFromAccessLog = FrontUserAnalyticsFactory.createUserDetailFromAccessLogQuery(dto);
        SearchRequest searchRequestFromDeviceInfo = FrontUserAnalyticsFactory.createUserDetailFromDeviceInfoQuery(dto);

        UserDetailResponseDto result = new UserDetailResponseDto();
        // Page Log 조회
        try {
            log.debug(searchRequestFromPageLog.toString());
            SearchResponse response = client.get(searchRequestFromPageLog);

            FrontUserAnalyticsServiceHelper.parseUserDetailFromPageLog(response, result, userIdMasking);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        // Access Log 조회
        try {
            log.debug(searchRequestFromAccessLog.toString());
            SearchResponse response = client.get(searchRequestFromAccessLog);

            FrontUserAnalyticsServiceHelper.parseUserDetailFromAccessLog(response, result);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        // Device Info 조회
        try {
            log.debug(searchRequestFromDeviceInfo.toString());
            SearchResponse response = client.get(searchRequestFromDeviceInfo);

            FrontUserAnalyticsServiceHelper.parseUserDetailFromDeviceInfo(response, result);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        return result;
    }

    /**
     * 사용자 목록을 검색 조건에 따라 조회한다.
     *
     * @param dto 사용자 목록 조회 조건
     * @return 사용자 목록 응답 DTO
     */
    public UserListResponseDto getUserList(UserListRequestDto dto) {
        SearchRequest searchRequest = FrontUserAnalyticsFactory.createUserListQuery(dto);
        try {
            SearchResponse response = client.get(searchRequest);
            return FrontUserAnalyticsServiceHelper.parseUserList(response);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return new UserListResponseDto();
        }
    }

    /**
     * 페이지 로딩 시간 관련 차트 데이터를 조회한다.
     *
     * @param dto      차트 조회 조건
     * @param pageInfo 기준 페이지 정보
     * @return 로딩 시간 차트 데이터
     */
    public PageFlowDetailResponseDto.ChartData getLoadingTimeChartData(PageFlowDetailRequestDto dto, PageFlowDetailResponseDto.PageInfo pageInfo) {
        SearchRequest searchRequest = FrontUserAnalyticsFactory.createLoadingTimeChartQuery(dto, pageInfo);
        try {
            SearchResponse response = client.get(searchRequest);
            return FrontUserAnalyticsServiceHelper.parseLoadingTimeChartData(response);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return new PageFlowDetailResponseDto.ChartData();
        }
    }
}
