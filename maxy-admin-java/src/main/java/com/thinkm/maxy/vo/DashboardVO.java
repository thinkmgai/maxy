package com.thinkm.maxy.vo;

import com.thinkm.common.code.RequestType;
import com.thinkm.common.util.DateUtil;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@ToString
@SuperBuilder
@RequiredArgsConstructor
public class DashboardVO extends AppInfoVO {

    private String logYear;
    private String logMonth;
    private String logDate;
    private Long logTm;
    private Long pageStartTm;
    private Long pageEndTm;
    private Long parentLogDate;

    /* BI Info */
    private String baseDate;
    private String baseMonth;
    private String baseDateYDA;
    private Long appInstallCount;
    private Long appDeleteCount;
    private Long appIosConnectCount;
    private Long appAndroidConnectCount;
    private Long appOtherOsConnectCount;
    private Long appConnectCount;
    private Long appReconnectCount;
    private Long appUseCount;
    private Long appSleepUserCount;
    private Long appLoginUserCount;
    private double appAvgUseTime;
    private Long appErrorCount;
    private Long appCrashCount;
    private Long appLogCount;
    private Long appMauCount;
    private String appIosUserRating;
    private String appAndroidUserRating;
    private String reqUrl;
    private String appPageNm;
    private String resMsg;
    private Long reqCount;
    private Long endCount;
    private Long intervaltime;
    private Long minIntervaltime;
    private double avgIntervaltime;
    private Long maxIntervaltime;
    private Long minLoadingTime;
    private double avgLoadingTime;
    private Long maxLoadingTime;
    private Long minResponseTime;
    private double avgResponseTime;
    private Long maxResponseTime;
    private Integer flowOrder;
    private Long logType;
    private String logTypeStr;
    private Long androidInstallCount;
    private Long iosInstallCount;
    private String preUrl;
    private Long preUrlTime;

    private Long loadingTime;
    private Long responseTime;

    private String mxPageId;

    // maxy_bi_useinfo
    private Long seq;
    private String installUseYn;
    private String deleteUseYn;
    private String iosuserUseYn;
    private String anduserUseYn;
    private String iosRateUseYn;
    private String andRateUseYn;
    private String userUseYn;
    private String reconnectUseYn;
    private String runUseYn;
    private String sleepUseYn;
    private String loginUseYn;
    private String intervaltimeUseYn;
    private String logUseYn;
    private String errorUseYn;
    private String crashUseYn;
    private String mauCountUseYn;
    private String ccuCountUseYn;
    private int errorCount;
    private int crashCount;
    private int errorAvg;
    private int crashAvg;
    private int dateCount;

    private String locationCode;
    private Integer next;

    private Long from;
    private Long to;
    private String fromDt;
    private String toDt;
    private boolean info;
    private int size;
    private int range;

    private String deviceId;
    private String deviceModel;
    private List<String> deviceList;

    private Map<String, Long> avgMap;

    // dummy
    private boolean dummyYn;

    private String aliasValue;
    private String osVer;

    private String searchType;
    private String searchValue;

    private RequestType requestType;
    private LogTrendType logTrendType;

    private DateType dateType;

    private String biTrendType;

    private Integer optLogmeterLogWeight;
    private Integer optLogmeterErrorWeight;
    private Integer optLogmeterCrashWeight;
    private Integer optPvequalizerMaxSize;
    private Integer optPageviewMaxSize;
    private Integer optFavoritesMaxSize;
    private Integer optLoadingtimescatterRange;
    private Integer optLoadingtimescatterSize;
    private Integer optResponsetimescatterRange;
    private Integer optResponsetimescatterSize;

    private boolean checkAll;

    private String lastLogTm;
    private String lastId;
    private String lastDeviceId;
    private String lastPageStartTm;
    private String clientNm;
    private String clientNo;
    private String userId;
    private String userNm;
    private String birthDay;
    private String type;
    private String cpuUsage;
    private String memUsage;
    private String docId;
    private int offsetIndex;

    private String osType1;
    private String osType2;
    private String appVer1;
    private String appVer2;
    private String accessDate;
    private List<String> accessDateList;

    private String jdomain;
    private String jtime;
    private String jtxid;

    private String comType;
    private String simOperatorNm;

    private List<VersionParam> versionParams;
    private String diff;
    private String logName;

    /**
     * Dashboard VO 의 DateType enum 으로 기준 날짜 반환
     *
     * @return yyyy-mm-dd default: 오늘 날짜 / WEEK: 해당 주의 일요일 / MONTH: 해당 달의 1일
     */
    public String getBaseDateByDateType() {
        String date = DateUtil.getTodayWithDash();
        if (this.dateType != null) {
            date = switch (this.dateType) {
                case WEEK -> DateUtil.getFirstWeekOfDay(date);
                case MONTH -> DateUtil.getFirstMonthOfDay(date);
                default -> date;
            };
        }
        return date;
    }

    /**
     * Dashboard VO 의 DateType enum 으로 기준 날짜 반환
     *
     * @return yyyyMMdd default: 오늘 날짜 / WEEK: 7일 전 / MONTH: 30일 전
     */
    public String getBaseDateByDateTypeV2() {
        String date = DateUtil.getToday();
        if (this.dateType != null) {
            date = switch (this.dateType) {
                case WEEK -> DateUtil.getDayByParam(-7);
                case MONTH -> DateUtil.getDayByParam(-30);
                default -> date;
            };
        }
        return date;
    }

    public DashboardVO of(DashboardComponentVO.VersionComparisonVO vo) {
        return DashboardVO.builder()
                .packageNm(vo.getPackageNm())
                .serverType(vo.getServerType())
                .osType1(vo.getOptOsTypeA())
                .osType2(vo.getOptOsTypeB())
                .appVer1(vo.getOptAppVerA())
                .appVer2(vo.getOptAppVerB())
                .build();
    }

    @Getter
    @RequiredArgsConstructor
    public enum DateType {
        DAY("d"),
        WEEK("w"),
        MONTH("m");

        private final String value;
    }

    @Getter
    @RequiredArgsConstructor
    public enum LogTrendType {

        LOG("log"),
        ERROR("error"),
        CRASH("crash");

        private final String type;
    }

    /**
     * BiType: Bi info 에서 상세 데이터를 요청할 때 사용
     */
    @Getter
    @RequiredArgsConstructor
    public enum BiTrendType {
        // 일간 설치 추세
        INSTALL_TREND("install", new String[]{"app_install_count"}),
        // 일간 삭제 추세
        DELETE_TREND("delete", new String[]{"app_delete_count"}),
        // 휴면 사용자 추세
        SLEEP_TREND("sleep", new String[]{"app_sleep_user_count"}),
        // 로그인 사용자 추세
        LOGIN_TREND("login", new String[]{"app_login_user_count"}),
        // 재설치 추세
        RECONNECT_TREND("login", new String[]{"app_reconnect_count"}),

        // 일간 OS별 접속자 비율 추세
        OS_TREND("os", new String[]{
                "app_ios_connect_count",
                "app_android_connect_count",
                "app_other_os_connect_count"
        }),

        // 평균 사용 시간 추세
        USE_TIME_TREND("useTime", new String[]{"app_avg_use_time"}),

        LOG_COUNT_TREND("logCount", new String[]{"app_log_count"}),
        ERROR_COUNT_TREND("errorCount", new String[]{"app_error_count"}),
        CRASH_COUNT_TREND("crashCount", new String[]{"app_crash_count"}),

        IOS_RATING_TREND("crashCount", new String[]{"app_ios_user_rating"}),
        ANDROID_RATING_TREND("crashCount", new String[]{"app_android_user_rating"}),
        ANDROID_INSTALL_TREND("androidInstallCount", new String[]{"android_install_count"}),
        IOS_INSTALL_TREND("iosInstallCount", new String[]{"ios_install_count"}),

        // 일간 사용자 수 추세
        DAU_TREND("dau", new String[]{"app_connect_count"}),
        // 월간 사용자 수 추세
        MAU_TREND("mau", new String[]{"app_mau_count"});

        private final String key;
        private final String[] columns;
    }

    @Getter
    @Builder
    public static class DashboardUseInfo {
        private String installUseYn;
        private String deleteUseYn;
        private String iosuserUseYn;
        private String anduserUseYn;
        private String iosRateUseYn;
        private String andRateUseYn;
        private String userUseYn;
        private String reconnectUseYn;
        private String runUseYn;
        private String sleepUseYn;
        private String loginUseYn;
        private String intervaltimeUseYn;
        private String logUseYn;
        private String errorUseYn;
        private String crashUseYn;
        private String mauCountUseYn;
        private String ccuCountUseYn;

        @Setter
        private BotVO aibot;

        public static DashboardUseInfo of(DashboardVO vo) {
            return DashboardUseInfo.builder()
                    .installUseYn(vo.getInstallUseYn())
                    .deleteUseYn(vo.getDeleteUseYn())
                    .iosuserUseYn(vo.getIosuserUseYn())
                    .anduserUseYn(vo.getAnduserUseYn())
                    .iosRateUseYn(vo.getIosRateUseYn())
                    .andRateUseYn(vo.getAndRateUseYn())
                    .userUseYn(vo.getUserUseYn())
                    .reconnectUseYn(vo.getReconnectUseYn())
                    .runUseYn(vo.getRunUseYn())
                    .sleepUseYn(vo.getSleepUseYn())
                    .loginUseYn(vo.getLoginUseYn())
                    .intervaltimeUseYn(vo.getIntervaltimeUseYn())
                    .logUseYn(vo.getLogUseYn())
                    .errorUseYn(vo.getErrorUseYn())
                    .crashUseYn(vo.getCrashUseYn())
                    .mauCountUseYn(vo.getMauCountUseYn())
                    .ccuCountUseYn(vo.getCcuCountUseYn())
                    .build();
        }
    }

    @Getter
    @Setter
    public static class VersionParam {
        private String osType;
        private String appVer;

        public VersionParam(String osType, String appVer) {
            this.osType = osType;
            this.appVer = appVer;
        }
    }
}
