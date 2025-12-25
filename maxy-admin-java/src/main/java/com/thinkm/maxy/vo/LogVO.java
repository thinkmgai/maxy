package com.thinkm.maxy.vo;

import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.code.LogType;
import com.thinkm.common.code.RequestType;
import com.thinkm.common.util.Elastic;
import com.thinkm.maxy.vo.DashboardVO.DateType;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@ToString
@SuperBuilder
@RequiredArgsConstructor
public class LogVO extends AppInfoVO {

    // log
    private String seq;
    private String targetId;
    private String deviceId;
    private String userNm;
    private String emailAddr;
    private String phoneNo;
    private Long logLevelId;
    private String mFromDt;
    private String mToDt;
    private String useYn;
    private Long logTm;
    private String logType;
    private String comType;
    private String logTypeNm;
    private String logTypeDnm;
    private String reqUrl;
    private String pageUrl;
    private String timeZone;
    private String logYear;
    private String logMonth;
    private String logDate;
    private Long intervaltime;
    private String osVer;
    private String resMsg;
    private String deviceModel;
    private String aliasValue;
    private String simOperatorNm;
    private Integer fromLogType;
    private Integer toLogType;
    private Integer fromLogClass;
    private Integer toLogClass;

    private Long pageStartTm;
    private Long pageEndTm;

    private Long durationFrom;
    private Long durationTo;

    // search
    private String searchToDt;
    private String searchFromDt;
    private Long yesterdayFrom;
    private Long yesterdayTo;
    private Long weekFrom;
    private Long weekTo;

    private Long searchFromDttm;
    private Long searchToDttm;

    private Long totalFrom;
    private Long totalTo;

    private String searchKey;
    private String searchValue;
    private String searchVipYn;
    private List<String> searchLogType;
    private String searchLogClass;
    private String searchPackageTp;
    private String searchYear;
    private String searchMonth;
    private String searchDate;
    private Integer searchPageSize;
    private Integer offsetIndex;
    private Integer targetIndex;
    private String logCnt;
    private String recentLogTm;
    private String lastLogTm;
    private String lastDeviceId;
    private String lastId;
    private String lastLogType;
    private List<AppInfoVO> osVerList;
    private String osVerListStr;

    private String afterKey;

    private boolean downloadYn = false;
    private boolean searchToday = false;

    private String searchToTime;
    private String searchFromTime;
    private String searchToPageFlowTime;
    private String searchFromPageFlowTime;
    private String searchToTotalTime;
    private String searchFromTotalTime;
    private String searchToErrorTime;
    private String searchFromErrorTime;
    private String searchToCrashTime;
    private String searchFromCrashTime;
    private Long value;
    private String relation;
    private Integer size;
    private Integer flowOrder;

    private Long from;
    private Long to;
    private String docId;
    private String mxPageId;

    private RequestType requestType;
    private DateType dateType;
    private String cpuUsage;
    private String memUsage;
    private String interval;
    private String chartType;
    private String searchType;
    private String vipYn;
    private String type;
    private String statusCode;

    private String paramList;
    private List<LogVO> voList;

    private Boolean dummy;

    private boolean dummyYn;

    private String exceptLog;
    private String exceptString;

    private Map<String, Long> avgMap;
    private String locale;

    private String jdomain;
    private String jtime;
    private String jtxid;

    private int durationStep = 100;

    @Getter
    @RequiredArgsConstructor
    public enum LogCountInfo {

        PAGE_VIEW(
                "page-view-count-day",
                "pageView",
                ElasticIndex.PAGE_LOG.getIndex(),
                Elastic.pageStartTm,
                "DAY",
                LogType.PAGE),
        PAGE_VIEW_YDA(
                "page-view-count-yda",
                "pageViewYDA",
                ElasticIndex.PAGE_LOG.getIndex(),
                Elastic.pageStartTm,
                "YDA",
                LogType.PAGE),
        //        PAGE_VIEW_WA(
//                "devicePageFlow-searchCountW",
//                "pageViewWA",
//                ElasticIndex.PAGE_LOG.getIndex() + "*"),
        PAGE_VIEW_TOTAL(
                "page-view-count-total",
                "pageViewTotal",
                ElasticIndex.PAGE_LOG.getIndex(),
                Elastic.pageStartTm,
                "TOTAL",
                LogType.PAGE),
        ERROR(
                "error-log-count-day",
                "error",
                ElasticIndex.TROUBLE_LOG.getIndex(),
                Elastic.logTm,
                "DAY",
                LogType.ERROR),
        ERROR_YDA(
                "error-log-count-yda",
                "errorYDA",
                ElasticIndex.TROUBLE_LOG.getIndex(),
                Elastic.logTm,
                "YDA",
                LogType.ERROR),
        //        ERROR_WA(
//                "appErrorLog-searchCountW",
//                "errorWA",
//                ElasticIndex.PAGE_LOG.getIndex() + "*"),
        ERROR_TOTAL(
                "error-log-count-total",
                "errorTotal",
                ElasticIndex.TROUBLE_LOG.getIndex(),
                Elastic.logTm,
                "TOTAL",
                LogType.ERROR),
        CRASH(
                "crash-log-count-day",
                "crash",
                ElasticIndex.TROUBLE_LOG.getIndex(),
                Elastic.logTm,
                "DAY",
                LogType.CRASH),
        CRASH_YDA(
                "crash-log-count-yda",
                "crashYDA",
                ElasticIndex.TROUBLE_LOG.getIndex(),
                Elastic.logTm,
                "YDA",
                LogType.CRASH),
        //        CRASH_WA(
//                "appCrashLog-searchCountW",
//                "crashWA",
//                ElasticIndex.PAGE_LOG.getIndex() + "*"),
        CRASH_TOTAL(
                "crash-log-count-total",
                "crashTotal",
                ElasticIndex.TROUBLE_LOG.getIndex(),
                Elastic.logTm,
                "TOTAL",
                LogType.CRASH);
        // json 파일 명
        private final String fileName;
        // key 명
        private final String key;
        // elastic search index 명
        private final String index;
        private final String timeField;
        private final String dateType;
        private final LogType type;

        @Schema(hidden = true)
        @Parameter(hidden = true)
        public static LogCountInfo[] fromKey(String key) {

            if (LogType.ERROR.equals(key)) {
                return new LogCountInfo[]{LogCountInfo.ERROR, LogCountInfo.ERROR_TOTAL, LogCountInfo.ERROR_YDA
//                        , LogCountInfo.ERROR_WA
                };
            } else if (LogType.CRASH.equals(key)) {
                return new LogCountInfo[]{LogCountInfo.CRASH, LogCountInfo.CRASH_TOTAL, LogCountInfo.CRASH_YDA
//                        , LogCountInfo.CRASH_WA
                };
            } else if (LogType.PAGE.equals(key)) {
                return new LogCountInfo[]{LogCountInfo.PAGE_VIEW, LogCountInfo.PAGE_VIEW_TOTAL, LogCountInfo.PAGE_VIEW_YDA
//                        , LogCountInfo.PAGE_VIEW_WA
                };
            } else {
                return null;
            }
        }
    }
}
