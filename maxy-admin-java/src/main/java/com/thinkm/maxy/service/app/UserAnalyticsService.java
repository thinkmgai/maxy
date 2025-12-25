package com.thinkm.maxy.service.app;

import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.code.MaxyLogType;
import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.Elastic;
import com.thinkm.common.util.ElasticClient;
import com.thinkm.maxy.dto.app.useranalytics.UserAnalyticsDetailRequestDto;
import com.thinkm.maxy.dto.app.useranalytics.UserAnalyticsDetailResponseDto;
import com.thinkm.maxy.dto.app.useranalytics.UserAnalyticsSearchRequestDto;
import com.thinkm.maxy.dto.app.useranalytics.UserAnalyticsSearchResponseDto;
import com.thinkm.maxy.mapper.DeviceMapper;
import com.thinkm.maxy.service.app.factory.UserAnalyticsQueryFactory;
import com.thinkm.maxy.service.app.helper.UserAnalyticsServiceHelper;
import com.thinkm.maxy.service.common.CommonService;
import com.thinkm.maxy.vo.DeviceVO;
import com.thinkm.maxy.vo.LogRequestVO;
import com.thinkm.maxy.vo.PageLogVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.action.search.SearchResponse;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;
import org.opensearch.search.SearchHit;
import org.opensearch.search.builder.SearchSourceBuilder;
import org.opensearch.search.sort.SortBuilders;
import org.opensearch.search.sort.SortOrder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.util.*;
import java.util.stream.Collectors;

@SuppressWarnings("unchecked")
@Slf4j
@Service
@RequiredArgsConstructor
public class UserAnalyticsService {

    private final ElasticClient elasticClient;
    private final DeviceMapper deviceMapper;

    @Value("${maxy.userid-masking:false}")
    private boolean userIdMasking;
    @Value("${maxy.userid-uppercase:false}")
    private Boolean isUseIdUpperCase;
    @Value("${maxy.optional-search-fields:}")
    private String optionalSearchFields;
    private Map<String, String> optionalSearchFieldMap;

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
        if (Elastic.deviceId.equalsIgnoreCase(searchType) ||
                Elastic.userId.equalsIgnoreCase(searchType)) {
            return true;
        }

        return optionalSearchFieldMap.containsKey(searchType);
    }

    public List<Map<String, Object>> getTotalUserList(DeviceVO vo) {
        Map<String, Object> totalUser;
        List<Map<String, Object>> totalUserList;
        List<Map<String, Object>> result = new ArrayList<>();
        try {
            Map<String, Object> queryParams = new HashMap<>();
            queryParams.put("packageNm", vo.getPackageNm());
            queryParams.put("serverType", vo.getServerType());
            queryParams.put("from", vo.getSearchFromDt());
            queryParams.put("to", vo.getSearchToDt());

            Elastic totalParam = Elastic.builder().method("GET")
                    .endpoint(ElasticIndex.PAGE_LOG.getIndex() + "*/_search")
                    .queryFile("ua/totalUserList.json")
                    .queryParams(queryParams)
                    .build();
            totalUser = elasticClient.get(totalParam);
            Object res = totalUser.get(Elastic.RES);
            if (res instanceof HashMap) {
                result = new ArrayList<>();
            } else {
                totalUserList = (List<Map<String, Object>>) res;
                for (Map<String, Object> map : totalUserList) {
                    Map<String, Object> tmp = new HashMap<>();
                    tmp.put(Elastic.deviceId, ((Map<String, Object>) map.get("key")).get(Elastic.deviceId));
                    tmp.put("totalIntervalTime", ((Map<String, Object>) map.get("total_interval_time")).get("value"));
                    tmp.put("pageStartTm", ((Map<String, Object>) map.get("latest_log_date")).get("value"));
                    Map<String, Object> latestLog = (Map<String, Object>) map.get("latest_log");
                    if (latestLog != null) {
                        Map<String, Object> hitsMap = (Map<String, Object>) latestLog.get("hits");
                        if (hitsMap != null) {
                            List<Map<String, Object>> hitsList = (List<Map<String, Object>>) hitsMap.get("hits");
                            if (hitsList != null && !hitsList.isEmpty()) {
                                Map<String, Object> firstHit = hitsList.get(0);
                                if (firstHit != null) {
                                    Map<String, Object> source = (Map<String, Object>) firstHit.get("_source");
                                    if (source != null && source.containsKey("clientNo")) {
                                        tmp.put("clientNo", source.get("clientNo"));
                                    }
                                }
                            }
                        }
                    }
                    List<Map<String, Object>> userIdBuckets = (List<Map<String, Object>>) ((Map<String, Object>) map.get(Elastic.userId)).get("buckets");
                    if (!userIdBuckets.isEmpty()) {
                        // userIdBucket이 1개보다 클 때
                        if (userIdBuckets.size() > 1) {
                            for (int i = 0; i < userIdBuckets.size(); i++) {
                                // userId가 "-"인 bucket은 제거
                                if ("-".equals(userIdBuckets.get(i).get("key"))) {
                                    userIdBuckets.remove(i);
                                    break;
                                }
                            }
                        }
                        for (Map<String, Object> userIdBucket : userIdBuckets) {
                            userIdBucket.put("key", CommonUtil.maskUserId((String) userIdBucket.get("key"), userIdMasking, 2));
                        }
                        tmp.put(Elastic.userId, userIdBuckets);
                    } else {
                        tmp.put(Elastic.userId, "-");
                    }

                    result.add(tmp);
                }
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        return result;
    }

    /**
     * 사용자 분석 -> 사용자 페이지 흐름 목록 조회
     *
     * @param vo packageNm, serverType, searchType {deviceId, userId}, searchValue, from {timestamp}, to {timestamp}
     * @return userFlowList
     */
    public List<?> getUserFlowListV2(PageLogVO vo) {
        List<List<Map<String, Object>>> result = new ArrayList<>();

        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.parentLogDate)
                .gte(vo.getFrom())
                .lte(vo.getTo())
                .timeZone("Z"));

        // 장치 / UserId 검색조건 추가
        String searchType = vo.getSearchType();
        String searchText = vo.getSearchValue();

        // 복합 검색 처리
        if ("multiple".equals(searchType) && vo.getSearchValues() != null && !vo.getSearchValues().isEmpty()) {
            BoolQueryBuilder multipleSearchQuery = QueryBuilders.boolQuery();

            for (Map.Entry<String, String> entry : vo.getSearchValues().entrySet()) {
                String fieldType = entry.getKey();
                String fieldValue = entry.getValue();

                if (CommonUtil.isValidString(fieldValue) && isValidSearchType(fieldType)) {
                    // userId 면 UPPER CASE
                    String searchValue = (Elastic.userId.equalsIgnoreCase(fieldType) && isUseIdUpperCase)
                            ? fieldValue.toUpperCase()
                            : fieldValue;

                    // AND 조건
                    multipleSearchQuery.must(QueryBuilders.termsQuery(fieldType + ".raw", searchValue));
                }
            }

            boolQuery.filter(multipleSearchQuery);

        } else if (CommonUtil.isValidString(searchText)) {
            // 기존 단일 검색 처리
            if (isValidSearchType(searchType)) {
                // userId 면 UPPER CASE
                String searchValue = (Elastic.userId.equalsIgnoreCase(searchType) && isUseIdUpperCase)
                        ? searchText.toUpperCase()
                        : searchText;

                // keyword 검색을 위한 .raw
                boolQuery.filter(QueryBuilders.termsQuery(searchType + ".raw", searchValue));
            } else {
                // 예상하지 않은 조건이면 400
                log.error("Invalid searchType: {}, searchValue: {}", vo.getSearchType(), searchText);
                throw new BadRequestException(ReturnCode.ERR_WRONG_PARAMS);
            }
        } else if (CommonUtil.isValidString(searchType) && !"multiple".equals(searchType)) {
            // searchText가 없는데 searchType이 있으면 400 (multiple 제외)
            log.error("searchText is empty but searchType is provided: {}", vo.getSearchType());
            throw new BadRequestException(ReturnCode.ERR_WRONG_PARAMS);
        }

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .size(10000)
                .fetchSource(new String[]{
                        Elastic.packageNm,
                        Elastic.serverType,
                        Elastic.deviceId,
                        Elastic.deviceModel,
                        Elastic.simOperatorNm,
                        Elastic.appVer,
                        Elastic.appBuildNum,
                        Elastic.comType,
                        Elastic.timezone,
                        Elastic.osVer,
                        Elastic.osType,
                        Elastic.userId,
                        Elastic.userNm,
                        Elastic.clientNo,
                        Elastic.reqUrl,
                        Elastic.preUrl,
                        Elastic.aliasValue,
                        Elastic.flowOrder,
                        Elastic.logType,
                        Elastic.requestCount,
                        Elastic.crashCount,
                        Elastic.eventCount,
                        Elastic.jsErrorCount,
                        Elastic.errorCount,
                        Elastic.intervaltime,
                        Elastic.eventIntervaltime,
                        Elastic.loadingTime,
                        Elastic.responseTime,
                        Elastic.parentLogDate,
                        Elastic.pageStartTm,
                        Elastic.pageEndTm,
                        Elastic.maxCpuUsage,
                        Elastic.minCpuUsage,
                        Elastic.avgCpuUsage,
                        Elastic.sumCpuUsage,
                        Elastic.maxMemUsage,
                        Elastic.minMemUsage,
                        Elastic.avgMemUsage,
                        Elastic.sumMemUsage,
                        Elastic.maxStorageUsage,
                        Elastic.minStorageUsage,
//                        Elastic.avgStorageUsage,
//                        Elastic.sumStorageUsage,
                        Elastic.maxComSensitivity,
                        Elastic.minComSensitivity,
//                        Elastic.avgComSensitivity,
//                        Elastic.sumComSensitivity,
                        Elastic.maxBatteryLvl,
                        Elastic.minBatteryLvl,
                        Elastic.mxPageId,
//                        Elastic.avgBatteryLvl,
//                        Elastic.sumBatteryLvl
                }, null)
                .sort(Elastic.parentLogDate, SortOrder.DESC)
                .sort(Elastic.pageStartTm, SortOrder.ASC);

        SearchRequest searchRequest = new SearchRequest(ElasticIndex.PAGE_LOG.getIndex() + "*")
                .source(searchSourceBuilder);
        log.debug(searchRequest.toString());
        try {
            SearchResponse response = elasticClient.get(searchRequest);
            if (response == null) {
                return Collections.emptyList();
            }

            List<Map<String, Object>> tmpList = new ArrayList<>();
            // Hits -> list map 변환
            for (SearchHit hit : response.getHits()) {
                Map<String, Object> item = hit.getSourceAsMap();
                item.put("_id", hit.getId());
                Object mxPageId = item.get(Elastic.mxPageId);
                if (mxPageId != null) {
                    item.put(Elastic.mxPageId, mxPageId.toString());
                }
                tmpList.add(item);
            }
            // parentLogDate 로 grouping
            Map<String, List<Map<String, Object>>> unsortedMap = tmpList
                    .stream()
                    .collect(Collectors.groupingBy(map ->
                            map.get(Elastic.parentLogDate).toString()));

            // user id masking
            for (String key : unsortedMap.keySet()) {
                CommonUtil.maskUserId(unsortedMap.get(key), userIdMasking, 2);
                result.add(unsortedMap.get(key));
            }

            // parentLogDate 로 desc sorting
            result.sort(Comparator.comparing((List<Map<String, Object>> cp)
                    -> (Long) cp.get(0).get(Elastic.parentLogDate)).reversed());
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        return result;
    }

    public long getParentLogDateByLogTmV2(PageLogVO vo) {
        long result = -1L;

        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.pageStartTm).lte(vo.getTo()));
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.pageEndTm).gte(vo.getFrom()));

        String searchType = vo.getSearchType();
        // userId 면 UPPER CASE
        String searchValue = Elastic.userId.equalsIgnoreCase(searchType) && isUseIdUpperCase
                ? vo.getSearchValue().toUpperCase()
                : vo.getSearchValue();
        boolQuery.filter(QueryBuilders.termQuery(searchType + ".raw", searchValue));

        SearchSourceBuilder ssb = new SearchSourceBuilder()
                .query(boolQuery)
                .fetchSource(new String[]{Elastic.parentLogDate}, null)
                .size(1);

        String[] indices = ElasticIndex.getIndicesForDateRange(ElasticIndex.PAGE_LOG, vo.getFrom(), vo.getTo());
        SearchRequest sr = new SearchRequest(indices).source(ssb);

        try {
            SearchResponse response = elasticClient.get(sr);
            Map<String, Object> item = Elastic.convertToSingleMap(response);
            return CommonUtil.toLong(item.get(Elastic.parentLogDate));
        } catch (Exception e) {
            log.error("{}: {}", vo, e.getMessage(), e);
            return result;
        }
    }

    /*
    use getParentLogDateByLogTmV2 instead of this method, this method is deprecated.
     */
    @Deprecated(since = "v1.7.0")
    @SuppressWarnings({"unchecked", "unused"})
    public Long getParentLogDateByLogTm(PageLogVO vo) {
        long result = -1L;
        try {
            Map<String, Object> query = new HashMap<>();
            query.put("packageNm", vo.getPackageNm());
            query.put("serverType", vo.getServerType());
            query.put("searchValue", vo.getSearchValue());
            query.put("from", vo.getFrom());
            query.put("to", vo.getTo());

            String searchType = vo.getSearchType();
            if (Elastic.deviceId.equalsIgnoreCase(searchType) || Elastic.userId.equalsIgnoreCase(searchType)) {
                // userId 면 UPPER CASE
                String searchValue = isUseIdUpperCase ? vo.getSearchValue().toUpperCase() : vo.getSearchValue();

                // keyword 검색을 위한 .raw
                searchType += ".raw";

                query.put("searchType", searchType);
                query.put("searchValue", searchValue);
            } else {
                // 예상하지 않은 조건이면 400
                throw new BadRequestException(ReturnCode.ERR_WRONG_PARAMS);
            }
            query.put("searchType", searchType);
            Elastic elastic = Elastic.builder()
                    .queryParams(query)
                    .method(Elastic.POST)
                    .endpoint(ElasticIndex.PAGE_LOG.getIndex() + "*/_search")
                    .queryFile("ua/page-info.json")
                    .build();
            Map<String, Object> q = elasticClient.get(elastic);
            Object res = q.get(Elastic.RES);
            if (res instanceof List) {
                result = (long) ((List<Map<String, Object>>) res).get(0).get(Elastic.parentLogDate);
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
        return result;
    }

    public List<Map<String, Object>> getLogListByPage(PageLogVO vo) {
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));

        boolean hasPageId = Elastic.hasMxPageId(vo.getMxPageId());
        if (hasPageId) {
            boolQuery.filter(QueryBuilders.termQuery(Elastic.mxPageId, vo.getMxPageId()));
        } else {
            boolQuery.filter(QueryBuilders.termQuery(Elastic.deviceId_raw, vo.getDeviceId()));
            boolQuery.filter(QueryBuilders.rangeQuery(Elastic.logTm)
                    .gte(vo.getFrom())
                    .lte(vo.getTo())
                    .timeZone("Z"));
        }

        boolQuery.mustNot(QueryBuilders.termQuery(Elastic.logType, MaxyLogType.T_WebNav_Biz_Error.getDecimal()));
        boolQuery.mustNot(QueryBuilders.termQuery(Elastic.logType, MaxyLogType.T_Native_Biz_Error.getDecimal()));

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .size(1000)
                .sort(SortBuilders.fieldSort(Elastic.logTm).order(SortOrder.ASC));
        SearchRequest searchRequest = new SearchRequest(ElasticIndex.TOTAL_LOG.getIndex() + "*").source(searchSourceBuilder);

        long s1 = System.currentTimeMillis();
        List<Map<String, Object>> resList = elasticClient.getListMap(searchRequest);
        log.debug("get log list by {} time: {}", (hasPageId ? "mxPageId" : "no mxPageId"), System.currentTimeMillis() - s1);
        CommonUtil.maskUserId(resList, userIdMasking, 2);

        return resList;
    }

    /**
     * Waterfall로그 조회를 위한 UserFlow List
     *
     * @param vo packageNm, serverType, searchType {deviceId}, searchValue, from {timestamp}, to {timestamp}
     * @return userFlowList
     */
    public List<?> getUserFlowListForWaterfall(PageLogVO vo) {
        List<List<Map<String, Object>>> result = new ArrayList<>();

        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.parentLogDate)
                .gte(vo.getFrom())
                .lte(vo.getTo())
                .timeZone("Z"));
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.pageStartTm)
                .gte(vo.getPageStartTm())
                .timeZone("Z"));

        // 장치 / UserId 검색조건 추가
        String searchType = vo.getSearchType();
        String searchText = vo.getSearchValue();
        if (CommonUtil.isValidString(searchText) && Elastic.deviceId.equalsIgnoreCase(searchType)) {
            // userId 면 UPPER CASE
            String searchValue = isUseIdUpperCase ? searchText.toUpperCase() : searchText;

            // keyword 검색을 위한 .raw
            boolQuery.filter(QueryBuilders.termsQuery(searchType + ".raw", searchValue));
        } else {
            // 예상하지 않은 조건이면 400
            log.error("searchType: {}, searchValue: {}", vo.getSearchType(), searchText);
            throw new BadRequestException(ReturnCode.ERR_WRONG_PARAMS);
        }

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .query(boolQuery)
                .size(10000)
                .fetchSource(new String[]{
                        Elastic.logType,
                        Elastic.pageStartTm,
                        Elastic.parentLogDate,
                        Elastic.reqUrl
                }, null)
                .sort(Elastic.parentLogDate, SortOrder.DESC)
                .sort(Elastic.pageStartTm, SortOrder.ASC);

        SearchRequest searchRequest = new SearchRequest(ElasticIndex.PAGE_LOG.getIndex() + "*")
                .source(searchSourceBuilder);
        log.debug(searchRequest.toString());
        try {
            SearchResponse response = elasticClient.get(searchRequest);
            if (response == null) {
                return Collections.emptyList();
            }

            List<Map<String, Object>> tmpList = new ArrayList<>();
            // Hits -> list map 변환
            for (SearchHit hit : response.getHits()) {
                Map<String, Object> item = hit.getSourceAsMap();
                item.put("_id", hit.getId());

                tmpList.add(item);
            }
            // parentLogDate 로 grouping
            Map<String, List<Map<String, Object>>> unsortedMap = tmpList
                    .stream()
                    .collect(Collectors.groupingBy(map ->
                            map.get(Elastic.parentLogDate).toString()));

            for (String key : unsortedMap.keySet()) {
                result.add(unsortedMap.get(key));
            }

            // parentLogDate 로 desc sorting
            result.sort(Comparator.comparing((List<Map<String, Object>> cp)
                    -> (Long) cp.get(0).get(Elastic.parentLogDate)).reversed());
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        return result;
    }

    public List<UserAnalyticsSearchResponseDto> getUserList(UserAnalyticsSearchRequestDto dto) {
        SearchRequest searchRequest = UserAnalyticsQueryFactory.createUserListQuery(dto);
        log.debug(searchRequest.toString());
        try {
            SearchResponse response = elasticClient.get(searchRequest);
            List<UserAnalyticsSearchResponseDto> result = UserAnalyticsServiceHelper.parseUserList(response);

            for (UserAnalyticsSearchResponseDto item : result) {
                DeviceVO info = deviceMapper.selectDateInfoByDeviceId(DeviceVO.builder()
                        .packageNm(dto.getPackageNm())
                        .serverType(dto.getServerType())
                        .deviceId(item.getDeviceId())
                        .build());
                if (info == null) {
                    continue;
                }

                if (info != null) {
                    item.setCreatedDate(info.getCreatedDate());
                    item.setUpdatedDate(info.getUpdatedDate());
                }
                item.setUserId(CommonUtil.maskUserId(item.getUserId(), userIdMasking, 2));
            }

            return result;
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    public UserAnalyticsDetailResponseDto getUserDetail(UserAnalyticsDetailRequestDto dto) {
        SearchRequest searchRequestFromPageLog = UserAnalyticsQueryFactory.createUserDetailFromPageLogQuery(dto);
        SearchRequest searchRequestFromAccessLog = UserAnalyticsQueryFactory.createUserDetailFromAccessLogQuery(dto);
        SearchRequest searchRequestFromDeviceInfo = UserAnalyticsQueryFactory.createUserDetailFromDeviceInfoQuery(dto);

        UserAnalyticsDetailResponseDto result = new UserAnalyticsDetailResponseDto();
        // Page Log 조회
        try {
            log.debug(searchRequestFromPageLog.toString());
            SearchResponse response = elasticClient.get(searchRequestFromPageLog);

            UserAnalyticsServiceHelper.parseUserDetailFromPageLog(response, result, userIdMasking);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        // Access Log 조회
        try {
            log.debug(searchRequestFromAccessLog.toString());
            SearchResponse response = elasticClient.get(searchRequestFromAccessLog);

            UserAnalyticsServiceHelper.parseUserDetailFromAccessLog(response, result);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        // Device Info 조회
        try {
            log.debug(searchRequestFromDeviceInfo.toString());
            SearchResponse response = elasticClient.get(searchRequestFromDeviceInfo);

            UserAnalyticsServiceHelper.parseUserDetailFromDeviceInfo(response, result);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        return result;
    }

    public List<UserAnalyticsSearchResponseDto> getOnlyUserList(UserAnalyticsSearchRequestDto dto) {
        SearchRequest searchRequest = UserAnalyticsQueryFactory.createOnlyUserListQuery(dto);
        log.debug(searchRequest.toString());
        try {
            SearchResponse response = elasticClient.get(searchRequest);
            List<UserAnalyticsSearchResponseDto> result = UserAnalyticsServiceHelper.parseOnlyUserList(response);

            return result;
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return Collections.emptyList();
        }
    }
}
