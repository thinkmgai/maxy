package com.thinkm.maxy.service.front;

import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.code.StatisticsInfo;
import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.ElasticClient;
import com.thinkm.maxy.domain.front.page.PageListSearchCondition;
import com.thinkm.maxy.dto.front.common.*;
import com.thinkm.maxy.dto.front.dashboard.page.PageListResponseDto;
import com.thinkm.maxy.dto.front.management.page.MarkPagesRequestDto;
import com.thinkm.maxy.mapper.FrontCommonMapper;
import com.thinkm.maxy.model.front.MarkedItem;
import com.thinkm.maxy.service.app.RedisService;
import com.thinkm.maxy.service.common.CommonService;
import com.thinkm.maxy.service.front.factory.FrontPageFactory;
import com.thinkm.maxy.service.front.helper.FrontPageServiceHelper;
import com.thinkm.maxy.vo.FrontUrl;
import com.thinkm.maxy.vo.LogRequestVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.action.search.SearchResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 프런트 페이지 영역의 OpenSearch/DB 데이터를 조회하고 마킹 정보를 적용하는 서비스입니다.
 * <p>페이지 상세, 단건 조회, 즐겨찾기 URL 관리 등 화면 구성에 필요한 공통 기능을 제공합니다.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FrontPageService {
    private final ElasticClient client;
    private final CommonService commonService;
    private final RedisService redisService;
    private final FrontCommonMapper frontCommonMapper;

    @Value("${maxy.userid-masking:false}")
    private boolean userIdMasking;

    /**
     * 사용자가 즐겨찾기로 지정한 URL 목록을 DB에서 조회한다.
     *
     * @param packageNm  패키지 명
     * @param serverType 서버 타입
     * @param userNo     사용자 번호
     * @return 즐겨찾기 URL VO 리스트
     */
    private List<FrontUrl> getMarkedUrlList(String packageNm, String serverType, FrontUrl.Type type, Long userNo) {
        return frontCommonMapper.selectMarkedUrl(
                new FrontUrl(packageNm, serverType, type, userNo)
        );
    }

    /**
     * 즐겨찾기 URL 목록을 Set 형태로 반환한다.
     *
     * @param packageNm  패키지 명
     * @param serverType 서버 타입
     * @param userNo     사용자 번호
     * @return 즐겨찾기 URL 문자열 Set
     */
    public Set<String> getMarkedUrls(String packageNm, String serverType, FrontUrl.Type type, Long userNo) {
        List<FrontUrl> marked = getMarkedUrlList(packageNm, serverType, type, userNo);
        return marked.stream()
                .map(FrontUrl::getReqUrl)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    /**
     * URL 목록을 DB에 저장된 값과 비교하여 mark 처리 함
     *
     * @param packageNm  조회할 앱 정보
     * @param serverType 조회할 앱 정보
     * @param userNo     조회대상
     * @param urls       URL 목록 객체
     * @param markedUrls DB 에 저장되어 있는 마킹된 URL. 해당 값이 null이 아니면 미리 조회된 것이라 굳이 DB를 한번 더 조회할 필요없음. null 이면 DB 조회해야함
     */
    public void applyMarkedUrls(String packageNm, String serverType, FrontUrl.Type type, Long userNo,
                                List<? extends MarkedItem> urls, Set<String> markedUrls) {
        if (urls == null || urls.isEmpty()) return;
        List<FrontUrl> marked = null;
        // markedUrls 목록이 없으면 DB 에서 조회
        if (markedUrls == null) {
            marked = getMarkedUrlList(packageNm, serverType, type, userNo);
            // DB 결과값 없으면 변경할 것 없음
            if (marked == null || marked.isEmpty()) return;
        }

        // 이미 마킹된 URL을 Set으로 구성하여 O(1) 조회
        Set<String> markedSet = markedUrls != null
                ? markedUrls
                : marked.stream()
                .map(FrontUrl::getReqUrl)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        // 전달받은 리스트의 각 아이템에 마킹 적용
        for (MarkedItem u : urls) {
            // reqUrl이 null일 수 있으므로 null 체크
            String reqUrl = u.getReqUrl();
            if (reqUrl != null && markedSet.contains(reqUrl)) {
                u.setMark(true);
            }
        }
    }

    /**
     * 단일 URL의 즐겨찾기 여부를 저장한다.
     *
     * @param packageNm  패키지 명
     * @param serverType 서버 타입
     * @param userNo     사용자 번호
     * @param reqUrl     대상 URL
     * @param mark       즐겨찾기 여부
     */
    public void mark(String packageNm, String serverType, FrontUrl.Type type, Long userNo, String reqUrl, boolean mark) {
        frontCommonMapper.markUrl(new FrontUrl(packageNm, serverType, type, userNo, reqUrl, mark));
    }

    /**
     * 즐겨찾기 URL을 목록 단위로 해제한다.
     *
     * @param list 삭제할 URL 목록 요청 DTO
     */
    public void deleteMarkUrl(List<MarkPagesRequestDto> list, FrontUrl.Type type) {
        List<FrontUrl> params = new ArrayList<>();
        for (MarkPagesRequestDto dto : list) {
            params.add(new FrontUrl(dto.getPackageNm(), dto.getServerType(), type, dto.getUserNo(), dto.getReqUrl(), false));
        }
        frontCommonMapper.deleteUrls(params);
    }

    /**
     * redis 에서 appInfo 를 기반으로 한 response / loading avg 값 조회
     *
     * @param type       loading / response
     * @param packageNm  앱 명
     * @param serverType 서버 유형
     * @return osType 과 매핑된 avg 값
     */
    public Map<String, Long> getAvgValueByAppInfo(String type, String packageNm, String serverType) {
        Map<String, Long> resultMap = new HashMap<>();
        try {
            StatisticsInfo statisticsType = null;
            if ("loading".equalsIgnoreCase(type)) {
                statisticsType = StatisticsInfo.AVG_LOADING_TIME;
            } else if ("response".equalsIgnoreCase(type)) {
                statisticsType = StatisticsInfo.AVG_RESPONSE_TIME;
            }
            if (statisticsType == null) {
                log.warn("wrong type: {}", type);
                return resultMap;
            }

            String pattern = String.join(":", StatisticsInfo.redisKey,
                    packageNm,
                    serverType,
                    "*",
                    statisticsType.getKey());

            Set<String> keys = redisService.keys(pattern);
            if (keys.isEmpty()) {
                return resultMap;
            }

            // Using a pipeline to get the values in bulk
            List<Object> values = redisService.get(keys);

            int i = 0;
            for (String key : keys) {
                String osType = key.split(":")[3];
                resultMap.put(osType, CommonUtil.toLong(values.get(i++)));
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
        return resultMap;
    }

    /**
     * 페이지 목록 데이터를 조회한다.
     *
     * @param sc 페이지 목록 조회 조건
     * @return 페이징 및 집계 정보가 포함된 응답 DTO
     */
    public PageListResponseDto getPageListData(PageListSearchCondition sc, boolean feeldex) {
        SearchRequest searchRequest = FrontPageFactory.createPageListQuery(sc);
        try {
            SearchResponse response = client.get(searchRequest);

            // feeldex 사용 여부에 따라 redis 조회 여부를 판단한다.
            Map<String, Long> avgMap = null;
            if (feeldex) {
                avgMap = getAvgValueByAppInfo("loading", sc.appInfo().packageNm(), sc.appInfo().serverType());
            }
            return FrontPageServiceHelper.parsePageListData(response, avgMap);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return new PageListResponseDto();
        }
    }

    /**
     * 페이지 상세 데이터를 검색하고 공통 서비스로부터 리소스 정보를 더해 반환한다.
     *
     * @param dto 문서 조회에 필요한 인덱스/시간 범위 정보
     * @return 상세 데이터와 워터폴 데이터가 결합된 DTO
     */
    public PageDetailResponseDto getPageDetailData(DocumentIdRequestDto dto) {
        try {
            String[] indexes = ElasticIndex.getIndicesForDateRange(ElasticIndex.PAGE_LOG, dto.getFrom(), dto.getTo());
            Map<String, Object> response = client.get(indexes, dto.getDocId());
            PageDetailResponseDto.DetailData detailData = FrontPageServiceHelper.parsePageDetailData(response, userIdMasking);
            LogRequestVO param = LogRequestVO.builder()
                    .packageNm(detailData.getPackageNm())
                    .serverType(detailData.getServerType())
                    .mxPageId(detailData.getMxPageId())
                    .pageStartTm(detailData.getPageStartTm())
                    .pageEndTm(detailData.getPageEndTm())
                    .deviceId(detailData.getDeviceId())
                    .build();
            PageDetailResponseDto.ResourceData resourceData = commonService.getWaterfallData(param);

            return new PageDetailResponseDto(detailData, resourceData);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return new PageDetailResponseDto();
        }
    }

    /**
     * mxPageId로 페이지 정보 조회 쿼리. mxPageId로 단건을 찾고, from/to 값으로 index 범위를 잡는다.
     */
    public SinglePageInfo getSinglePageInfo(PageInfoRequestDto dto) {
        SearchRequest searchRequest = FrontPageFactory.createSinglePageInfoQuery(dto);
        try {
            log.debug("Search Request: {}", searchRequest);
            SearchResponse response = client.get(searchRequest);
            return FrontPageServiceHelper.parseSinglePageInfo(response);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return null;
        }
    }

    /**
     * 주어진 조건의 페이지 로그 존재 여부를 확인한다.
     *
     * @param dto 페이지 로그 존재 여부 확인 요청 DTO
     * @return 조회 결과 존재하면 true
     */
    public boolean existsPageLog(ExistsPageInfoRequestDto dto) {
        SearchRequest searchRequest = FrontPageFactory.createExistsPageInfoQuery(dto);
        try {
            SearchResponse response = client.get(searchRequest);
            return FrontPageServiceHelper.parseExistsPageInfo(response);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return false;
        }
    }
}
