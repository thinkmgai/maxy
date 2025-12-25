package com.thinkm.maxy.service.app.helper;

import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.DateUtil;
import com.thinkm.common.util.Elastic;
import com.thinkm.maxy.dto.app.useranalytics.UserAnalyticsDetailResponseDto;
import com.thinkm.maxy.dto.app.useranalytics.UserAnalyticsSearchResponseDto;
import org.opensearch.action.search.SearchResponse;
import org.opensearch.search.aggregations.bucket.composite.ParsedComposite;
import org.opensearch.search.aggregations.bucket.terms.Terms;
import org.opensearch.search.aggregations.metrics.ParsedTopHits;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class UserAnalyticsServiceHelper {
    public static List<UserAnalyticsSearchResponseDto> parseUserList(SearchResponse response) {
        List<UserAnalyticsSearchResponseDto> result = new ArrayList<>();

        if (response == null || response.getAggregations() == null) {
            return result;
        }
        ParsedComposite parsedComposite = response.getAggregations().get(Elastic.RES);
        if (parsedComposite == null) {
            return result;
        }
        parsedComposite.getBuckets().forEach(bucket -> {
            Map<String, Object> keys = bucket.getKey();
            ParsedTopHits lastDoc = bucket.getAggregations().get(Elastic.SUB_AGGS_1);
            Map<String, Object> source = lastDoc.getHits().iterator().next().getSourceAsMap();

            String deviceId = (String) keys.get(Elastic.deviceId);
            String userId = (String) keys.get(Elastic.userId);
            String clientNo = (String) source.get(Elastic.clientNo);
            String appVer = (String) source.get(Elastic.appVer);
            String osType = (String) source.get(Elastic.osType);
            String deviceModel = (String) source.get(Elastic.deviceModel);

            UserAnalyticsSearchResponseDto responseDto = UserAnalyticsSearchResponseDto.builder()
                    .deviceId(deviceId)
                    .userId(userId)
                    .clientNo(clientNo)
                    .appVer(appVer)
                    .osType(osType)
                    .deviceModel(deviceModel)
                    .build();
            result.add(responseDto);
        });

        return result;
    }

    public static void parseUserDetailFromPageLog(SearchResponse response, UserAnalyticsDetailResponseDto result, boolean userIdMasking) {
        Map<String, Object> item = Elastic.convertResponse(response);
        result.setDeviceId(CommonUtil.emptyIfNull(item.get(Elastic.deviceId)));
        result.setUserId(CommonUtil.maskUserId(CommonUtil.emptyIfNull(item.get(Elastic.userId)), userIdMasking, 2));
        result.setClientNo(CommonUtil.emptyIfNull(item.get(Elastic.clientNo)));
        result.setClientNm(CommonUtil.emptyIfNull(item.get(Elastic.clientNm)));
        result.setClientDiv(CommonUtil.emptyIfNull(item.get(Elastic.clientDiv)));
        result.setPhoneNo(CommonUtil.emptyIfNull(item.get(Elastic.phoneNo)));
        result.setResidenceNo(CommonUtil.emptyIfNull(item.get(Elastic.residentNo)));
        result.setEmail(CommonUtil.emptyIfNull(item.get(Elastic.email)));
        result.setTimezone(CommonUtil.emptyIfNull(item.get(Elastic.timezone)));
        result.setAppVer(CommonUtil.emptyIfNull(item.get(Elastic.appVer)));
        result.setOsType(CommonUtil.emptyIfNull(item.get(Elastic.osType)));
        result.setOsVer(CommonUtil.emptyIfNull(item.get(Elastic.osVer)));
        result.setAppBuildNum(CommonUtil.emptyIfNull(item.get(Elastic.appBuildNum)));
        result.setDeviceModel(CommonUtil.emptyIfNull(item.get(Elastic.deviceModel)));
        result.setComType(CommonUtil.convertComType(item.get(Elastic.comType)));
        result.setSimOperatorNm(CommonUtil.emptyIfNull(item.get(Elastic.simOperatorNm)));
        result.setComSensitivity(CommonUtil.toInteger(item.get(Elastic.avgComSensitivity)));
        result.setLogType(CommonUtil.toInteger(item.get(Elastic.logType)));
        result.setUpdatedDate(DateUtil.timestampToDate(CommonUtil.toLong(
                item.get(Elastic.pageEndTm)), DateUtil.DATETIME_WITH_COLON_PATTERN));
    }

    public static void parseUserDetailFromAccessLog(SearchResponse response, UserAnalyticsDetailResponseDto result) {
        Map<String, Object> item = Elastic.convertResponse(response);
        Long usingTime = CommonUtil.toLong(item.get(Elastic.usingTime));
        Long accessCnt = CommonUtil.toLong(item.get(Elastic.accessCnt));

        result.setTotalStayTime(usingTime);
        result.setAvgStayTime(usingTime / accessCnt);
        result.setRevisitCount(CommonUtil.toInteger(item.get(Elastic.retentionDay)));
        result.setWebviewVer(CommonUtil.emptyIfNull(item.get(Elastic.webviewVer)));
        result.setAppBuildNum(CommonUtil.emptyIfNull(item.get(Elastic.appBuildNum)));
        if (response.getHits() != null && response.getHits().getTotalHits() != null) {
            result.setTotalVisitCount(CommonUtil.toInteger(response.getHits().getTotalHits().value));
        } else {
            result.setTotalVisitCount(0);
        }
    }

    public static void parseUserDetailFromDeviceInfo(SearchResponse response, UserAnalyticsDetailResponseDto result) {
        Map<String, Object> item = Elastic.convertResponse(response);
        result.setCreatedDate(DateUtil.timestampToDate(CommonUtil.toLong(
                item.get(Elastic.createdDate)), DateUtil.DATETIME_WITH_COLON_PATTERN));
        result.setDeviceSt(CommonUtil.emptyIfNull(item.get(Elastic.deviceSt)));
    }

    public static List<UserAnalyticsSearchResponseDto> parseOnlyUserList(SearchResponse response) {
        List<UserAnalyticsSearchResponseDto> result = new ArrayList<>();

        if (response == null || response.getAggregations() == null) {
            return result;
        }

        Terms terms = response.getAggregations().get(Elastic.userId_raw);
        if (terms == null) {
            return result;
        }

        terms.getBuckets().forEach(bucket -> {
            String userId = bucket.getKeyAsString();

            UserAnalyticsSearchResponseDto responseDto =
                    UserAnalyticsSearchResponseDto.builder()
                            .userId(userId)
                            .build();

            result.add(responseDto);
        });

        return result;
    }
}
