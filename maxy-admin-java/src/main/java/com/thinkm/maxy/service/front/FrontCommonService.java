package com.thinkm.maxy.service.front;

import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.util.ElasticClient;
import com.thinkm.maxy.domain.front.common.TimeSeriesChartSearchCondition;
import com.thinkm.maxy.dto.front.common.DefaultRequestDto;
import com.thinkm.maxy.dto.front.common.ReadStatusRequestDto;
import com.thinkm.maxy.dto.front.common.ReadStatusResponseDto;
import com.thinkm.maxy.dto.front.common.TimeSeriesChart;
import com.thinkm.maxy.dto.front.dashboard.feeldex.FeeldexRequestDto;
import com.thinkm.maxy.dto.front.dashboard.feeldex.FeeldexResponseDto;
import com.thinkm.maxy.mapper.FrontCommonMapper;
import com.thinkm.maxy.model.front.ReadStatus;
import com.thinkm.maxy.service.front.factory.FrontCommonFactory;
import com.thinkm.maxy.service.front.factory.FrontDashboardFactory;
import com.thinkm.maxy.service.front.helper.FrontCommonServiceHelper;
import com.thinkm.maxy.service.front.helper.FrontDashboardServiceHelper;
import com.thinkm.maxy.vo.FrontFeeldexVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.action.delete.DeleteRequest;
import org.opensearch.action.index.IndexRequest;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.action.search.SearchResponse;
import org.springframework.stereotype.Service;

/**
 * 프런트 공통 영역에서 사용하는 지표 설정과 읽음 상태 관리를 담당하는 서비스입니다.
 * <p>ElasticSearch(OpenSearch)와 RDB를 조회·갱신해 기본 지표값을 보정하고, 알림/에러 메시지의 읽음 플래그를 유지합니다.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FrontCommonService {
    private final ElasticClient client;
    private final FrontCommonMapper frontCommonMapper;

    /**
     * 선택된 지표에 대한 시계열 차트 데이터를 조회한다.
     *
     * @param dataType        차트 데이터 타입(LCP/INP 등)
     * @param sc 조회 조건
     * @return 시계열 차트 DTO
     */
    public TimeSeriesChart getTimeSeriesChartData(TimeSeriesChart.DataType dataType, TimeSeriesChartSearchCondition sc) {
        SearchRequest searchRequest = FrontDashboardFactory.createTimeSeriesChartQuery(dataType, sc);
        try {
            SearchResponse response = client.get(searchRequest);
            return FrontDashboardServiceHelper.parseTimeSeriesChartData(response);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return new TimeSeriesChart();
        }
    }

    /**
     * Feeldex 지표 설정을 조회하고, 존재하지 않으면 기본값을 생성한 뒤 반환합니다.
     *
     * @param dto    패키지/서버 정보를 담은 요청 DTO
     * @param userNo 기본값 저장 시 기록할 사용자 번호
     * @return LCP/INP/CLS 값이 채워진 응답 DTO
     */
    public FeeldexResponseDto getFeeldexConfig(DefaultRequestDto dto, Long userNo) {
        FrontFeeldexVO param = new FrontFeeldexVO(dto.getPackageNm(), dto.getServerType());
        FrontFeeldexVO result = frontCommonMapper.selectFeeldexConfig(param);
        if (result == null) {
            // 기본값 담아서 insert
            FrontFeeldexVO insertParam = new FrontFeeldexVO(dto.getPackageNm(),
                    dto.getServerType(),
                    40,
                    30,
                    30,
                    userNo);
            frontCommonMapper.insertFeeldexConfig(insertParam);
            result = insertParam;
        }
        return new FeeldexResponseDto(result.getLcp(), result.getInp(), result.getCls());
    }

    /**
     * 사용자가 입력한 Feeldex 설정을 저장합니다.
     *
     * @param dto    저장할 LCP/INP/CLS 정보
     * @param userNo 수정자 식별용 사용자 번호
     */
    public void addFeeldexConfig(FeeldexRequestDto dto, Long userNo) {
        frontCommonMapper.insertFeeldexConfig(new FrontFeeldexVO(dto.getPackageNm(),
                dto.getServerType(),
                dto.getLcp(),
                dto.getInp(),
                dto.getCls(),
                userNo));
    }

    /**
     * 메시지 읽음 여부 확인 및 해당 메시지 읽음 처리
     *
     * @param packageNm  앱 정보
     * @param serverType 서버 정보
     * @param type       유형 (error, message 등.)
     * @param hashKey    해시된 대상 문자열
     * @return 읽음 여부 객체
     */
    public ReadStatus checkRead(String packageNm, String serverType, String type, Long hashKey) {
        if (hashKey == null) {
            return new ReadStatus();
        }
        ReadStatusRequestDto dto = new ReadStatusRequestDto(packageNm, serverType, type, hashKey);
        SearchRequest searchRequest = FrontCommonFactory.createIsReadErrorQuery(dto);
        SearchResponse searchResponse = client.get(searchRequest);
        return FrontCommonServiceHelper.parseIsReadError(searchResponse, hashKey);
    }

    /**
     * 해당 메시지 읽음 처리
     *
     * @return 읽음 여부 객체
     */
    public ReadStatusResponseDto markAsRead(ReadStatusRequestDto dto) {
        if (dto.getHash() == null) {
            return new ReadStatusResponseDto();
        }
        dto.setRegDt(System.currentTimeMillis());
        // read flag 추가
        IndexRequest indexRequest = new IndexRequest(ElasticIndex.CHK.getIndex())
                .id(dto.id())
                .source(ReadStatusRequestDto.toMap(dto));
        client.add(indexRequest);
        return new ReadStatusResponseDto(true, dto.getRegDt(), dto.getRegNo(), dto.getHash());
    }

    /**
     * 읽음 이력 삭제
     *
     * @return 읽음 여부 객체(해시 포함)
     */
    public ReadStatusResponseDto unmarkAsRead(ReadStatusRequestDto dto) {
        DeleteRequest deleteRequest = new DeleteRequest(ElasticIndex.CHK.getIndex()).id(dto.id());
        client.delete(deleteRequest);
        return new ReadStatusResponseDto(dto.getHash());
    }
}
