package com.thinkm.maxy.service.front;

import com.thinkm.common.util.ElasticClient;
import com.thinkm.maxy.dto.front.webperf.error.ErrorAggregateListRequestDto;
import com.thinkm.maxy.dto.front.webperf.error.ErrorAggregateListResponseDto;
import com.thinkm.maxy.dto.front.webperf.network.NetworkAggregateListRequestDto;
import com.thinkm.maxy.dto.front.webperf.network.NetworkAggregateListResponseDto;
import com.thinkm.maxy.dto.front.webperf.page.PageAggregateListRequestDto;
import com.thinkm.maxy.dto.front.webperf.page.PageAggregateListResponseDto;
import com.thinkm.maxy.dto.front.webperf.ratio.RatioRequestDto;
import com.thinkm.maxy.dto.front.webperf.ratio.RatioResponseDto;
import com.thinkm.maxy.dto.front.webperf.vital.VitalRequestDto;
import com.thinkm.maxy.dto.front.webperf.vital.VitalResponseDto;
import com.thinkm.maxy.service.front.factory.FrontWebPerfFactory;
import com.thinkm.maxy.service.front.helper.FrontWebPerfServiceHelper;
import com.thinkm.maxy.vo.FrontUrl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.action.search.SearchResponse;
import org.springframework.stereotype.Service;

import java.util.Set;

/**
 * OpenSearch 쿼리를 구성해 실행하고 결과를 DTO로 변환하여 프런트 대시보드에 필요한 웹 성능 분석 데이터를 제공한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FrontWebPerfService {
    private final ElasticClient client;
    private final FrontPageService frontPageService;

    /**
     * {@link FrontWebPerfFactory}를 통해 Web Vital 집계 쿼리를 생성하고 실행하여 결과를 {@link VitalResponseDto}로 변환한다.
     *
     * @param dto 대상 서비스·페이지·디바이스·기간 등의 조건
     * @return 파싱된 Vital 데이터, 실패 시 빈 DTO
     */
    public VitalResponseDto getVitalInfo(VitalRequestDto dto) {
        SearchRequest searchRequest = FrontWebPerfFactory.createVitalQuery(dto);
        try {
            SearchResponse response = client.get(searchRequest);
            return FrontWebPerfServiceHelper.parseVitalData(response);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return new VitalResponseDto();
        }
    }

    /**
     * 페이지 단위 성능 집계 데이터를 조회하고 사용자의 마크 정보를 적용한 뒤 리스트 DTO로 반환한다.
     *
     * @param dto    페이지 집계 조회 조건 및 페이징 정보
     * @param userNo 마크 정보를 적용할 사용자 번호
     * @return 고정 크기만큼의 집계 결과, 실패 시 빈 DTO
     */
    public PageAggregateListResponseDto getPageAggregateList(PageAggregateListRequestDto dto, Long userNo) {
        int size = 30;
        Set<String> markedUrls = null;

        // 즐겨찾기 목록 여부
        if (dto.isMark()) {
            // 즐겨찾기 목록 조회
            markedUrls = frontPageService.getMarkedUrls(dto.getPackageNm(), dto.getServerType(), FrontUrl.Type.PAGE, userNo);
            // 즐겨찾기 목록 결과가 없으면 빈 값 반환
            if (markedUrls == null || markedUrls.isEmpty()) {
                return new PageAggregateListResponseDto();
            }
        }
        SearchRequest searchRequest = FrontWebPerfFactory.createPageAggregateListQuery(size, dto, markedUrls);
        try {
            SearchResponse response = client.get(searchRequest);
            PageAggregateListResponseDto result = FrontWebPerfServiceHelper.parsePageAggregateList(size, response);

            // url이 marked 되어 있으면 mark 처리
            frontPageService.applyMarkedUrls(
                    dto.getPackageNm(),
                    dto.getServerType(),
                    FrontUrl.Type.PAGE,
                    userNo,
                    result.getList(),
                    markedUrls);
            return result;
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return new PageAggregateListResponseDto();
        }
    }

    /**
     * 네트워크 요청 단위로 응답 시간/사용자 수를 집계하고 즐겨찾기 상태를 반영한다.
     *
     * @param dto    네트워크 집계 조회 조건
     * @param userNo 즐겨찾기 정보를 조회할 사용자 번호
     * @return 응답시간/사용자수 등 집계 데이터, 즐겨찾기 조건 미충족 시 빈 DTO
     */
    public NetworkAggregateListResponseDto getNetworkAggregateList(NetworkAggregateListRequestDto dto, Long userNo) {
        int size = 30;
        Set<String> markedUrls = null;

        // 즐겨찾기 목록 여부
        if (dto.isMark()) {
            // 즐겨찾기 목록 조회
            markedUrls = frontPageService.getMarkedUrls(dto.getPackageNm(), dto.getServerType(), FrontUrl.Type.API, userNo);
            // 즐겨찾기 목록 결과가 없으면 빈 값 반환
            if (markedUrls == null || markedUrls.isEmpty()) {
                return new NetworkAggregateListResponseDto();
            }
        }
        SearchRequest searchRequest = FrontWebPerfFactory.createNetworkAggregateListQuery(size, dto, markedUrls);
        try {
            SearchResponse response = client.get(searchRequest);
            NetworkAggregateListResponseDto result = FrontWebPerfServiceHelper.parseNetworkAggregateList(size, response);

            // url이 marked 되어 있으면 mark 처리
            frontPageService.applyMarkedUrls(
                    dto.getPackageNm(),
                    dto.getServerType(),
                    FrontUrl.Type.API,
                    userNo,
                    result.getList(),
                    markedUrls);
            return result;
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return new NetworkAggregateListResponseDto();
        }
    }

    /**
     * 요청된 {@link RatioRequestDto.DataType}에 따라 성공/실패 비율 등의 상대적 지표를 조회한다.
     *
     * @param type 비율 계산 대상 유형(패키지, 디바이스, 상태 등)
     * @param dto  비율 산정을 위한 필터 조건
     * @return 계산된 비율 데이터, 실패 시 빈 DTO
     */
    public RatioResponseDto getRatioListData(RatioRequestDto.DataType type, RatioRequestDto dto) {
        SearchRequest searchRequest = FrontWebPerfFactory.createRatioListQuery(type, dto);
        try {
            SearchResponse response = client.get(searchRequest);
            return FrontWebPerfServiceHelper.parseRatioList(type, response);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return new RatioResponseDto();
        }
    }

    /**
     * 에러 유형별 집계 데이터를 조회하여 즐겨찾기 여부와 함께 반환한다.
     *
     * @param dto    에러 집계 조회 조건
     * @param userNo 즐겨찾기 정보를 조회할 사용자 번호
     * @return 에러 카운트/사용자수 집계 데이터, 즐겨찾기 조건 미충족 시 빈 DTO
     */
    public ErrorAggregateListResponseDto getErrorAggregateList(ErrorAggregateListRequestDto dto, Long userNo) {
        int size = 30;
        Set<String> markedUrls = null;

        // 즐겨찾기 목록 여부
        if (dto.isMark()) {
            // 즐겨찾기 목록 조회
            markedUrls = frontPageService.getMarkedUrls(dto.getPackageNm(), dto.getServerType(), FrontUrl.Type.ERROR, userNo);
            // 즐겨찾기 목록 결과가 없으면 빈 값 반환
            if (markedUrls == null || markedUrls.isEmpty()) {
                return new ErrorAggregateListResponseDto();
            }
        }
        SearchRequest searchRequest = FrontWebPerfFactory.createErrorAggregateListQuery(size, dto, markedUrls);
        try {
            SearchResponse response = client.get(searchRequest);
            ErrorAggregateListResponseDto result = FrontWebPerfServiceHelper.parseErrorAggregateList(size, response);

            // url이 marked 되어 있으면 mark 처리
            frontPageService.applyMarkedUrls(
                    dto.getPackageNm(),
                    dto.getServerType(),
                    FrontUrl.Type.ERROR,
                    userNo,
                    result.getList(),
                    markedUrls);
            return result;
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return new ErrorAggregateListResponseDto();
        }
    }
}
