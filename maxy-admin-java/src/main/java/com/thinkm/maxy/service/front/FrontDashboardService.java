package com.thinkm.maxy.service.front;

import com.thinkm.common.util.ElasticClient;
import com.thinkm.maxy.dto.front.dashboard.session.SessionDetailRequestDto;
import com.thinkm.maxy.dto.front.dashboard.session.SessionDetailResponseDto;
import com.thinkm.maxy.dto.front.dashboard.user.UserRequestDto;
import com.thinkm.maxy.dto.front.dashboard.user.UserListResponseDto;
import com.thinkm.maxy.service.front.factory.FrontDashboardFactory;
import com.thinkm.maxy.service.front.helper.FrontDashboardServiceHelper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.action.search.SearchResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * 프런트 대시보드 화면에서 사용하는 페이지/네트워크/세션/에러 데이터를 조회하는 서비스입니다.
 * <p>OpenSearch와 제니퍼 연동을 통해 다양한 지표를 수집해 DTO로 변환합니다.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FrontDashboardService {
    private final ElasticClient client;

    @Value("${maxy.userid-masking:false}")
    private boolean userIdMasking;

    /**
     * 사용자 목록을 조회한다.
     *
     * @param dto 조회 조건
     * @return 사용자 목록 DTO
     */
    public UserListResponseDto getUserList(UserRequestDto dto) {
        SearchRequest searchRequest = FrontDashboardFactory.createUserListQuery(dto);
        try {
            log.debug(searchRequest.toString());
            SearchResponse response = client.get(searchRequest);
            return FrontDashboardServiceHelper.parseUserListData(response, userIdMasking);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return new UserListResponseDto();
        }
    }

    /**
     * 세션 프로필 정보를 조회한다.
     *
     * @param dto 조회 조건
     * @return 세션 프로필 DTO
     */
    public SessionDetailResponseDto.Profile getSessionProfileInfo(SessionDetailRequestDto dto) {
        SearchRequest searchRequest = FrontDashboardFactory.createSessionProfileInfoQuery(dto);
        try {
            SearchResponse response = client.get(searchRequest);
            return FrontDashboardServiceHelper.parseSessionProfileData(response, userIdMasking);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return new SessionDetailResponseDto.Profile();
        }
    }

    /**
     * Vital 정보를 조회한다.
     *
     * @param dto  조회 조건
     * @param from 조회 시작 시간
     * @return Vital 정보 DTO
     */
    public SessionDetailResponseDto.Vital getSessionVitalInfo(SessionDetailRequestDto dto, long from) {
        SearchRequest searchRequest = FrontDashboardFactory.createSessionVitalInfoQuery(dto, from);
        try {
            SearchResponse response = client.get(searchRequest);
            return FrontDashboardServiceHelper.parseSessionVitalData(response);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return new SessionDetailResponseDto.Vital();
        }
    }

    /**
     * 세션별 페이지 이동 목록을 조회한다.
     *
     * @param dto  조회 조건
     * @param from 인덱스 계산을 위한 시작 시간
     * @return 페이지 정보 리스트
     */
    public List<SessionDetailResponseDto.PageInfo> getSessionPageInfo(SessionDetailRequestDto dto, long from) {
        SearchRequest searchRequest = FrontDashboardFactory.createSessionPageListQuery(dto, from);
        try {
            SearchResponse response = client.get(searchRequest);
            return FrontDashboardServiceHelper.parseSessionPageListData(response);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return new ArrayList<>();
        }
    }

    /**
     * 세션별 이벤트 목록을 조회한다.
     *
     * @param dto  조회 조건
     * @param from 인덱스 계산 범위 시작
     * @return 이벤트 정보 리스트
     */
    public List<SessionDetailResponseDto.EventInfo> getSessionEventInfo(SessionDetailRequestDto dto, long from) {
        SearchRequest searchRequest = FrontDashboardFactory.createSessionEventListQuery(dto, from);
        try {
            SearchResponse response = client.get(searchRequest);
            return FrontDashboardServiceHelper.parseSessionEventListData(response);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return new ArrayList<>();
        }
    }
}
