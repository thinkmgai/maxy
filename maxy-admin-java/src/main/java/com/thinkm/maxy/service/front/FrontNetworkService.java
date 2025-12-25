package com.thinkm.maxy.service.front;

import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.util.ElasticClient;
import com.thinkm.maxy.domain.front.network.NetworkListSearchCondition;
import com.thinkm.maxy.dto.front.common.DocumentIdRequestDto;
import com.thinkm.maxy.dto.front.dashboard.network.NetworkDetailRequestDto;
import com.thinkm.maxy.dto.front.dashboard.network.NetworkDetailResponseDto;
import com.thinkm.maxy.dto.front.dashboard.network.NetworkListResponseDto;
import com.thinkm.maxy.service.app.JenniferService;
import com.thinkm.maxy.service.front.factory.FrontNetworkFactory;
import com.thinkm.maxy.service.front.helper.FrontNetworkServiceHelper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.action.search.SearchResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * 프런트 대시보드의 네트워크 목록과 상세 데이터를 조회하고 Jennifer 연동 정보를 결합하는 서비스입니다.
 * <p>OpenSearch와 Jennifer API를 호출해 응답 지표/차트를 구성하고, 사용자 식별자 마스킹 옵션을 반영합니다.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FrontNetworkService {
    private final ElasticClient client;
    private final JenniferService jenniferService;

    @Value("${maxy.userid-masking:false}")
    private boolean userIdMasking;

    /**
     * 네트워크 요청 목록을 조회한다.
     *
     * @param sc 조회 조건
     * @return 응답 시간 평균 등 집계가 포함된 DTO
     */
    public NetworkListResponseDto getNetworkListData(NetworkListSearchCondition sc) {
        SearchRequest searchRequest = FrontNetworkFactory.createNetworkListQuery(sc);
        try {
            SearchResponse response = client.get(searchRequest);
            return FrontNetworkServiceHelper.parseNetworkListData(response, userIdMasking);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return new NetworkListResponseDto();
        }
    }

    /**
     * 단일 네트워크 로그의 상세 정보를 조회한다.
     *
     * @param dto 조회 조건
     * @return 상세 응답 DTO
     */
    public NetworkDetailResponseDto.DetailData getNetworkDetailData(DocumentIdRequestDto dto) {
        try {
            String[] indexes = ElasticIndex.getIndicesForDateRange(ElasticIndex.NETWORK_LOG, dto.getFrom(), dto.getTo());
            Map<String, Object> response = client.get(indexes, dto.getDocId());
            return FrontNetworkServiceHelper.parseNetworkDetailData(response, userIdMasking);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return new NetworkDetailResponseDto.DetailData();
        }
    }

    /**
     * 제니퍼에 연동하여 네트워크 트랜드 정보를 조회한다.
     *
     * @param detailData 네트워크 상세 정보
     * @return 제니퍼 정보 DTO
     */
    public NetworkDetailResponseDto.JenniferInfo getNetworkJenniferData(NetworkDetailResponseDto.DetailData detailData) {
        if (detailData == null) return null;
        try {
            Map<String, Object> jenniferMap = jenniferService.get(detailData.getJdomain(), detailData.getJtime(), detailData.getJtxid());
            return NetworkDetailResponseDto.JenniferInfo.from(jenniferMap);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return null;
        }
    }

    /**
     * 네트워크 상세 차트 데이터를 조회한다.
     *
     * @param dto        조회 조건
     * @param detailData 상세 데이터 (차트 구성을 위한 조건)
     * @return 차트 데이터 DTO
     */
    public NetworkDetailResponseDto.ChartData getNetworkChartData(NetworkDetailRequestDto dto, NetworkDetailResponseDto.DetailData detailData) {
        SearchRequest searchRequest = FrontNetworkFactory.createNetworkChartQuery(dto, detailData);
        try {
            SearchResponse response = client.get(searchRequest);
            return FrontNetworkServiceHelper.parseNetworkChartData(response);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return new NetworkDetailResponseDto.ChartData();
        }
    }
}
