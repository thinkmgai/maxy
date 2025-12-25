package com.thinkm.common.util;

import com.thinkm.common.code.MaxyLogType;
import com.thinkm.maxy.dto.front.common.AppInfoRequestDto;
import com.thinkm.maxy.vo.LogRequestVO;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import lombok.extern.slf4j.Slf4j;
import org.jetbrains.annotations.NotNull;
import org.opensearch.action.search.SearchResponse;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;
import org.opensearch.search.SearchHit;
import org.opensearch.search.SearchHits;
import org.opensearch.search.aggregations.bucket.histogram.DateHistogramInterval;

import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

@Slf4j
@Getter
@Setter
@Builder
@ToString
public class Elastic {

    /* Method */
    public static final String POST = "POST";
    public static final String GET = "GET";
    /* API */
    public static final String _COUNT = "_count";
    public static final String _SEARCH = "_search";

    /* 문자열 모음 */
    public static final String _ID = "_id";
    public static final String RES = "res";
    public static final String AGGREGATIONS = "aggregations";
    public static final String GROUPBY = "groupby";
    public static final String BUCKETS = "buckets";
    public static final String AFTER_KEY = "after_key";
    public static final String KEY = "key";
    public static final String VALUE = "value";
    public static final String VALUES = "values";
    public static final String COUNT = "count";
    public static final String HITS = "hits";
    public static final String TOTAL = "total";
    public static final String FIELDS = "fields";
    public static final String SOURCE = "_source";
    public static final String DOC_COUNT = "doc_count";
    public static final String DOC_COUNT_ERROR_UPPER_BOUND = "doc_count_error_upper_bound";
    public static final String SUM_OTHER_DOC_COUNT = "sum_other_doc_count";

    public static final String SUB_AGGS_1 = "subaggs1";
    public static final String SUB_AGGS_2 = "subaggs2";

    /* field */
    public static final String packageNm = "packageNm";
    public static final String serverType = "serverType";
    public static final String osType = "osType";
    public static final String osVer = "osVer";
    public static final String appVer = "appVer";
    public static final String logTm = "logTm";
    public static final String pageStartTm = "pageStartTm";
    public static final String pageEndTm = "pageEndTm";
    public static final String accessDate = "accessDate";
    public static final String deviceModel = "deviceModel";
    public static final String deviceId = "deviceId";
    public static final String deviceId_raw = "deviceId.raw";
    public static final String reqUrl = "reqUrl";
    public static final String reqUrl_raw = "reqUrl.raw";
    public static final String aliasValue = "aliasValue";
    public static final String userId = "userId";
    public static final String userId_raw = "userId.raw";
    public static final String loadingTime = "loadingTime";
    public static final String responseTime = "responseTime";
    public static final String intervaltime = "intervaltime";
    public static final String locationCode = "locationCode";
    public static final String content = "content";
    public static final String contents = "contents";
    public static final String logType = "logType";
    public static final String pageUrl = "pageUrl";
    public static final String pageUrl_raw = "pageUrl.raw";
    public static final String resMsg = "resMsg";
    public static final String resMsg_raw = "resMsg.raw";
    public static final String loginYn = "loginYn";
    public static final String userNm = "userNm";
    public static final String userNm_raw = "userNm.raw";
    public static final String cpuUsage = "cpuUsage";
    public static final String sumCpuUsage = "sumCpuUsage";
    public static final String memUsage = "memUsage";
    public static final String sumMemUsage = "sumMemUsage";
    public static final String comSensitivity = "comSensitivity";
    public static final String avgComSensitivity = "avgComSensitivity";
    public static final String logName = "logName";
    public static final String flowOrder = "flowOrder";
    public static final String logCount = "logCount";
    public static final String errorCount = "errorCount";
    public static final String crashCount = "crashCount";
    public static final String comType = "comType";
    public static final String timeZone = "timezone";
    public static final String simOperatorNm = "simOperatorNm";
    public static final String wtfFlag = "wtfFlag";
    public static final String contents_occur_raw = "contents.occur.raw";
    public static final String appStartTm = "appStartTm";
    public static final String appEndTm = "appEndTm";
    public static final String avgCpuUsage = "avgCpuUsage";
    public static final String avgMemUsage = "avgMemUsage";
    public static final String preUrl = "preUrl";
    public static final String preUrl_raw = "preUrl.raw";
    public static final String preUrlTime = "preUrlTime";
    public static final String parentLogDate = "parentLogDate";
    public static final String type = "type";
    public static final String exception = "exception";
    public static final String reason = "reason";
    public static final String solutionKo = "solutionKo";
    public static final String solutionEn = "solutionEn";
    public static final String mxPageId = "mxPageId";
    public static final String accessCnt = "accessCnt";
    public static final String usingTime = "usingTime";
    public static final String retentionDay = "retentionDay";
    public static final String createdDate = "createdDate";
    public static final String deviceSt = "deviceSt";
    public static final String ip = "ip";
    public static final String maxySessionId = "maxySessionId";
    public static final String maxySessionId_raw = "maxySessionId.raw";
    public static final String clickInfo = "clickInfo";

    public static final String appBuildNum = "appBuildNum";
    public static final String timezone = "timezone";
    public static final String requestCount = "requestCount";
    public static final String eventCount = "eventCount";
    public static final String jsErrorCount = "jsErrorCount";
    public static final String eventIntervaltime = "eventIntervaltime";
    public static final String maxCpuUsage = "maxCpuUsage";
    public static final String minCpuUsage = "minCpuUsage";
    public static final String maxMemUsage = "maxMemUsage";
    public static final String minMemUsage = "minMemUsage";
    public static final String maxStorageUsage = "maxStorageUsage";
    public static final String minStorageUsage = "minStorageUsage";
    public static final String avgStorageUsage = "avgStorageUsage";
    public static final String sumStorageUsage = "sumStorageUsage";
    public static final String maxComSensitivity = "maxComSensitivity";
    public static final String minComSensitivity = "minComSensitivity";
    public static final String sumComSensitivity = "sumComSensitivity";
    public static final String maxBatteryLvl = "maxBatteryLvl";
    public static final String minBatteryLvl = "minBatteryLvl";
    public static final String avgBatteryLvl = "avgBatteryLvl";
    public static final String sumBatteryLvl = "sumBatteryLvl";

    public static final String webviewVer = "webviewVer";
    public static final String storageUsage = "storageUsage";
    public static final String storageTotal = "storageTotal";
    public static final String batteryLvl = "batteryLvl";
    /* Vital */
    public static final String name = "name";
    public static final String rating = "rating";
    public static final String value = "value";
    public static final String lcp = "lcp";
    public static final String inp = "inp";
    public static final String cls = "cls";
    public static final String fcp = "fcp";
    public static final String ttfb = "ttfb";
    /* Network */
    public static final String statusCode = "statusCode";
    public static final String statusCodeGroup = "statusCodeGroup";
    public static final String responseSize = "responseSize";
    public static final String requestSize = "requestSize";
    public static final String waitTime = "waitTime";
    public static final String downloadTime = "downloadTime";
    public static final String reqMsg = "reqMsg";

    /* for hana */
    public static final String userNo = "userNo";
    public static final String clientNo = "clientNo";
    public static final String clientNo_raw = "clientNo.raw";
    public static final String clientNm = "clientNm";
    public static final String bizCode = "bizCode";
    public static final String bizSubCode = "bizSubCode";
    public static final String birthDay = "birthDay";
    public static final String clientDiv = "clientDiv";
    public static final String phoneNo = "phoneNo";
    public static final String residentNo = "residentNo";
    public static final String email = "email";

    /* jennifer */
    public static final String jtxid = "jtxid";
    public static final String jdomain = "jdomain";
    public static final String jtime = "jtime";
    public static final String jinstance = "jinstance";

    /* front */
    public static final String browser = "browser";
    public static final String browserVer = "browserVer";
    public static final String platform = "platform";

    /* ccu */
    public static final String dateTime = "dateTime";
    /* chk */
    public static final String regDt = "regDt";

    // Map으로 설정된 값과 DateHistogramInterval 매핑
    private static final Map<String, DateHistogramInterval> INTERVAL_MAP = new HashMap<>();

    static {
        INTERVAL_MAP.put("30s", DateHistogramInterval.seconds(30));
        INTERVAL_MAP.put("1m", DateHistogramInterval.minutes(1));
        INTERVAL_MAP.put("5m", DateHistogramInterval.minutes(5));
        INTERVAL_MAP.put("10m", DateHistogramInterval.minutes(10));
        INTERVAL_MAP.put("1h", DateHistogramInterval.hours(1));
        INTERVAL_MAP.put("1d", DateHistogramInterval.days(1));
    }

    /**
     * HTTP Method (GET, POST, PUT)
     */
    private String method;
    /**
     * ElasticSearch 요청 endpoint
     */
    private String endpoint;
    /**
     * ElasticSearch 요청 index
     */
    private String index;
    /**
     * ElasticSearch 요청 api
     */
    private String api;
    /**
     * JSON Query file 명
     */
    private String queryFile;
    /**
     * URL Request 파라미터
     */
    private Map<String, String> requestParams;
    /**
     * JSON 쿼리의 파라미터
     */
    private Map<String, Object> queryParams;
    /**
     * JSON 동적 쿼리 파라미터
     */
    private Map<String, Boolean> dynamicParams;

    private String key;
    /**
     * composite query 에서 페이징을 할 지 여부
     */
    private boolean paging;
    /**
     * composite query 에서 after_key 값
     */
    private String afterKey;
    /**
     * 페이징 할 값
     */
    private int size;


    @NotNull
    public static BoolQueryBuilder makeBoolQueryByAppInfo(String packageNm, String serverType, String osType) {
        BoolQueryBuilder boolQuery = QueryBuilders.boolQuery();
        LogRequestVO vo = LogRequestVO.builder()
                .packageNm(packageNm)
                .serverType(serverType)
                .osType(osType)
                .build();
        boolQuery.filter(QueryBuilders.termQuery(Elastic.packageNm, vo.getPackageNm()));
        boolQuery.filter(QueryBuilders.termQuery(Elastic.serverType, vo.getServerType()));
        if (vo.checkOsType()) {
            boolQuery.filter(QueryBuilders.termQuery(Elastic.osType, vo.getOsType()));
        }
        return boolQuery;
    }

    @NotNull
    public static BoolQueryBuilder makeBoolQueryByAppInfo(LogRequestVO vo) {
        BoolQueryBuilder boolQuery = QueryBuilders.boolQuery();
        boolQuery.filter(QueryBuilders.termQuery(Elastic.packageNm, vo.getPackageNm()));
        boolQuery.filter(QueryBuilders.termQuery(Elastic.serverType, vo.getServerType()));
        if (vo.checkOsType()) {
            boolQuery.filter(QueryBuilders.termQuery(Elastic.osType, vo.getOsType()));
        }
        return boolQuery;
    }

    @NotNull
    public static BoolQueryBuilder makeBoolQueryForFront(AppInfoRequestDto vo) {
        BoolQueryBuilder boolQuery = QueryBuilders.boolQuery();
        boolQuery.filter(QueryBuilders.termQuery(Elastic.packageNm, vo.getPackageNm()));
        boolQuery.filter(QueryBuilders.termQuery(Elastic.serverType, vo.getServerType()));

        return boolQuery;
    }

    public static void errorBuilder(BoolQueryBuilder boolQuery) {
        boolQuery.filter(QueryBuilders.termsQuery(Elastic.logType, MaxyLogType.ERROR_TYPES_SET));
    }

    public static void crashBuilder(BoolQueryBuilder boolQuery) {
        boolQuery.filter(QueryBuilders.termQuery(Elastic.logType, MaxyLogType.G_Native_Crash.getDecimal()));
    }

    public static DateHistogramInterval makeDateHistogramInterval(String intervalKey) {
        return INTERVAL_MAP.getOrDefault(intervalKey, DateHistogramInterval.minutes(1)); // 기본값 1m
    }

    public static Map<String, Object> convertHit(SearchHit hit) {
        Map<String, Object> item = new HashMap<>(hit.getSourceAsMap());
        item.put(Elastic._ID, hit.getId());

        Object mxPageId = item.get(Elastic.mxPageId);
        if (mxPageId != null && !mxPageId.toString().isBlank()) {
            item.put(Elastic.mxPageId, mxPageId.toString());
        }

        return item;
    }

    public static boolean hasMxPageId(String mxPageId) {
        return mxPageId != null && !mxPageId.isBlank();
    }

    public static Map<String, Object> convertResponse(SearchResponse response) {
        if (response == null || response.getHits() == null) {
            return Collections.emptyMap();
        }
        Iterator<SearchHit> iterator = response.getHits().iterator();
        if (iterator.hasNext()) {
            return iterator.next().getSourceAsMap();
        } else {
            return Collections.emptyMap();
        }
    }

    public static long convertTotalHits(SearchResponse response) {
        if (response == null || response.getHits() == null || response.getHits().getTotalHits() == null) {
            return 0;
        }
        return response.getHits().getTotalHits().value;
    }

    public static Map<String, Object> convertToSingleMap(SearchResponse response) {
        Map<String, Object> result = new HashMap<>();
        if (response == null) {
            return result;
        }
        SearchHits hits = response.getHits();
        if (hits == null) {
            return result;
        }
        SearchHit hit = hits.getAt(0);
        if (hit == null) {
            return result;
        }
        return hit.getSourceAsMap();
    }
}
