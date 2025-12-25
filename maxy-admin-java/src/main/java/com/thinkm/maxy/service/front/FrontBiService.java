package com.thinkm.maxy.service.front;

import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.DateUtil;
import com.thinkm.common.util.ElasticClient;
import com.thinkm.maxy.dto.front.bi.BiCcuResponseDto;
import com.thinkm.maxy.dto.front.bi.BiDefaultResponseDto;
import com.thinkm.maxy.dto.front.bi.BiErrorResponseDto;
import com.thinkm.maxy.dto.front.bi.BiRequestDto;
import com.thinkm.maxy.mapper.FrontBiMapper;
import com.thinkm.maxy.service.app.RedisService;
import com.thinkm.maxy.service.front.factory.FrontBiFactory;
import com.thinkm.maxy.service.front.helper.FrontBiServiceHelper;
import com.thinkm.maxy.vo.FrontBiVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.action.search.SearchResponse;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * BI 대시보드에서 사용하는 CCU/MAU 등 지표 데이터를 조회하는 서비스입니다.
 * <p>Redis와 OpenSearch, RDB를 복합적으로 조회해 차트 데이터를 구성합니다.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FrontBiService {
    private final RedisService redisService;
    private final ElasticClient elasticClient;
    private final FrontBiMapper frontBiMapper;

    /**
     * Bi Chart List 날짜별 조회
     *
     * @param type 지표 타입
     * @param dto  조회 조건
     * @return 차트 데이터 및 원본 데이터 맵
     */
    public BiDefaultResponseDto getBiInfo(BiRequestDto.Type type, BiRequestDto dto) {
        if (type == null) {
            return new BiDefaultResponseDto();
        }
        String[] dates = DateUtil.getBaseDates(dto.getFrom(), dto.getTo());
        List<Map<String, Object>> list = frontBiMapper.selectFrontBiInfoList(new FrontBiVO(dto, dates));
        // dates 배열을 기준으로 빈 데이터 채움
        Map<String, Object> dataMap = list.stream()
                .collect(Collectors.toMap(
                        item -> item.get("baseDate").toString(),
                        item -> item.getOrDefault(type.getColumn(), 0),
                        (a, b) -> a // 중복 방지
                ));

        List<Object[]> chartData = new ArrayList<>();
        List<String> fullDates = DateUtil.interpolation(DateUtil.DATE_PATTERN, dates[0], dates[1]);
        for (String date : fullDates) {
            // 없으면 0
            Object value = dataMap.getOrDefault(date, 0);
            chartData.add(new Object[]{CommonUtil.toLong(date), value});
        }

        // 정렬 (date 오름차순)
        chartData.sort(Comparator.comparingLong(o -> (long) o[0]));

        Map<String, BiDefaultResponseDto.BiData> biDataMap = new HashMap<>();
        for (Map<String, Object> item : list) {
            biDataMap.put(item.get("baseDate").toString(), BiDefaultResponseDto.BiData.from(item));
        }

        return new BiDefaultResponseDto(chartData, biDataMap);
    }

    /**
     * BI 대시보드 에러 지표(일자별 추이 및 Top 에러)를 조회한다.
     *
     * @param dto 조회 기간 및 앱 정보
     * @return 에러 차트 데이터와 상위 에러 상세 목록
     */
    public BiErrorResponseDto getBiErrorInfo(BiRequestDto dto) {
        String[] dates = DateUtil.getBaseDates(dto.getFrom(), dto.getTo());
        List<Map<String, Object>> list = frontBiMapper.selectFrontBiInfoList(new FrontBiVO(dto, dates));
        // dates 배열을 기준으로 빈 데이터 채움
        Map<String, Object> dataMap = list.stream()
                .collect(Collectors.toMap(
                        item -> item.get("baseDate").toString(),
                        item -> item.getOrDefault("countError", 0),
                        (a, b) -> a // 중복 방지
                ));

        List<Object[]> chartData = new ArrayList<>();
        List<String> fullDates = DateUtil.interpolation(DateUtil.DATE_PATTERN, dates[0], dates[1]);
        for (String date : fullDates) {
            // 없으면 0
            Object value = dataMap.getOrDefault(date, 0);
            chartData.add(new Object[]{CommonUtil.toLong(date), value});
        }

        // 정렬 (date 오름차순)
        chartData.sort(Comparator.comparingLong(o -> (long) o[0]));

        FrontBiVO param = new FrontBiVO(dto, dates);
        List<Map<String, Object>> errorList = frontBiMapper.selectTopErrorLogListFromReport(param);
        List<BiErrorResponseDto.ErrorInfo> errorInfoList = new ArrayList<>();
        for (Map<String, Object> item : errorList) {
            errorInfoList.add(new BiErrorResponseDto.ErrorInfo(item));
        }

        return new BiErrorResponseDto(chartData, errorInfoList);
    }

    /**
     * 월 단위 MAU 데이터를 조회한다.
     *
     * @param dto 조회 기간 DTO
     * @return 월별 MAU 차트 데이터
     */
    public BiDefaultResponseDto getBiMauInfo(BiRequestDto dto) {
        String[] months = DateUtil.getBaseMonths(dto.getFrom(), dto.getTo());
        List<Map<String, Object>> list = frontBiMapper.selectFrontBiMonthlyInfoList(new FrontBiVO(dto, months));
        // dates 배열을 기준으로 빈 데이터 채움
        Map<String, Object> dataMap = list.stream()
                .collect(Collectors.toMap(
                        item -> item.get("baseMonth").toString(),
                        item -> item.get("appMauCount"),
                        (a, b) -> a // 중복 방지
                ));

        List<Object[]> chartData = new ArrayList<>();
        List<String> fullDates = DateUtil.interpolateMonths(months[0], months[1]);
        for (String date : fullDates) {
            // 없으면 0
            Object value = dataMap.getOrDefault(date, 0);
            chartData.add(new Object[]{CommonUtil.toLong(date), value});
        }

        // 정렬 (date 오름차순)
        chartData.sort(Comparator.comparingLong(o -> (long) o[0]));

        Map<String, BiDefaultResponseDto.BiData> biDataMap = new HashMap<>();
//        for (Map<String, Object> item : list) {
            // 추후 기획 나오면 추가할 예정
//            biDataMap.put(item.get("baseMonth").toString(), BiDefaultResponseDto.BiData.from(item));
//        }

        return new BiDefaultResponseDto(chartData, biDataMap);
    }

    /**
     * CCU 정보를 조회한다.
     * <p>조회 기간이 오늘인 경우 Redis를 우선 조회하고, 그 외에는 OpenSearch에서 데이터를 수집합니다.</p>
     *
     * @param dto 조회 조건
     * @return CCU 차트 데이터
     */
    public BiCcuResponseDto getCcuInfo(BiRequestDto dto) {
        String[] dates = DateUtil.getBaseDates(dto.getFrom(), dto.getTo());

        if (dates[0].equalsIgnoreCase(dates[1])) {
            // 하루치
            // 오늘이면
            if (dates[0].equalsIgnoreCase(DateUtil.getToday())) {
                // 오늘이면 redis 조회
                return getCcuData(dto);
            } else {
                // 오늘이 아니면 해당 일자로 opensearch 조회
                return getCcuDataByDate(dto, dates[0]);
            }
        } else {
            // 하루 이상 조회 시 opensearch 조회 및 일간 peak 만 잡아서 조회
            return getCcuDataByDateRange(dto, dates[0], dates[1]);
        }
    }

    /**
     * 당일 CCU 데이터를 Redis에서 조회한다.
     *
     * @param dto 조회 조건
     * @return CCU 응답 DTO
     */
    private BiCcuResponseDto getCcuData(BiRequestDto dto) {
        // appCcuCount:appId:serverType:osType:yyyyMMdd
        String pattern = String.join(":",
                "front:countCcu",
                dto.getPackageNm(),
                dto.getServerType(),
                DateUtil.getIndexDate());

        // 당일 날짜의 모든 키 조회 (시간:분 까지)
        long s = System.currentTimeMillis();
        Set<String> keys = redisService.keys(pattern + "*");
        log.debug("get keys time: {}ms ", System.currentTimeMillis() - s);

        if (keys.isEmpty()) {
            return new BiCcuResponseDto();
        }

        List<String> keyList = new ArrayList<>(keys);
        long s1 = System.currentTimeMillis();
        // 이미 데이터를 넣을 때 String 으로 넣어서 getLong 을 사용할 수 없었음 .. 추후에 Long 타입으로 넣으면 좋을 듯
        List<Object> valList = redisService.get(keyList);
        log.debug("get val time: {}ms ", System.currentTimeMillis() - s1);
        return FrontBiServiceHelper.parseCcuTodayData(valList, keyList);
    }

    /**
     * 특정 일자에 대한 CCU 데이터를 OpenSearch에서 조회한다.
     *
     * @param dto  조회 조건
     * @param date 대상 일자
     * @return CCU 응답 DTO
     */
    private BiCcuResponseDto getCcuDataByDate(BiRequestDto dto, String date) {
        SearchRequest searchRequest = FrontBiFactory.createCcuChartQuery(dto, date);
        try {
            SearchResponse response = elasticClient.get(searchRequest);
            return FrontBiServiceHelper.parseCcuChart(response);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return new BiCcuResponseDto();
        }
    }

    /**
     * 기간 범위에 대한 CCU 피크 데이터를 조회한다.
     *
     * @param dto  조회 조건
     * @param from 시작일
     * @param to   종료일
     * @return CCU 응답 DTO
     */
    private BiCcuResponseDto getCcuDataByDateRange(BiRequestDto dto, String from, String to) {
        SearchRequest searchRequest = FrontBiFactory.createCcuDateChartQuery(dto, from, to);
        try {
            SearchResponse response = elasticClient.get(searchRequest);
            return FrontBiServiceHelper.parseCcuDateChart(response, dto.getFrom(), dto.getTo());
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return new BiCcuResponseDto();
        }
    }
}
