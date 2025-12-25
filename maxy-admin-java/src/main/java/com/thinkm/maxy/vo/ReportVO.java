package com.thinkm.maxy.vo;

import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Getter
@Setter
@ToString
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class ReportVO extends AppInfoVO {

    private ReportType type;
    private String sortBy;
    private SortType sort;

    private Long from;
    private Long to;

    private String fromDt;
    private String toDt;
    private String searchFromDt;
    private String searchToDt;
    private String fromMonth;
    private String toMonth;

    private String baseDate;
    private String deviceModel;
    private String rate;
    private int appInstallCount;
    private int appIosConnectCount;
    private int appAndroidConnectCount;
    private int appConnectCount;
    private int appUseCount;
    private int appReconnectCount;
    private int appSleepUserCount;
    private int appLoginUserCount;
    private int appAvgUseTime;
    private int appErrorCount;
    private int appCrashCount;

    private String locale;
    private int diff;

    private String packageNmText;
    private String osTypeText;
    private String appVerText;
    private String reportType;
    private List<String> toEmailList;
    private String emailSubject;
    private String reportSubject;

    @Getter
    @RequiredArgsConstructor
    private enum SortType {
        DESC("desc"),
        ASC("asc");

        private final String sort;
    }

    @Getter
    @RequiredArgsConstructor
    public enum ReportTypeGroup {
        INFO("Info"),
        SUMMARY("Summary"),
        TOP("Top"),
        WORST("Worst");

        private final String group;
    }

    @Getter
    @RequiredArgsConstructor
    public enum AppType {
        MAXY("0"),
        MAXY_FRONT("1");

        private final String appType;
    }

    @Getter
    @RequiredArgsConstructor
    public enum ReportType {
        STATUS_INFO("INFO_STS", ReportTypeGroup.INFO.getGroup(), "Status Info", AppType.MAXY.getAppType()),
        VERSION_SUMMARY("SUM_VER", ReportTypeGroup.SUMMARY.getGroup(), "Version (Summary)", AppType.MAXY.getAppType()),
        LOADING_SUMMARY("SUM_LD", ReportTypeGroup.SUMMARY.getGroup(), "Loading Time (Summary)", AppType.MAXY.getAppType()),
        LOADING_10("TOP_LD", ReportTypeGroup.TOP.getGroup(), "Loading Time (Top 10)", AppType.MAXY.getAppType()),
        RESPONSE_SUMMARY("SUM_RS", ReportTypeGroup.SUMMARY.getGroup(), "Response Time (Summary)", AppType.MAXY.getAppType()),
        RESPONSE_10("TOP_RS", ReportTypeGroup.TOP.getGroup(), "Response Time (Top 10)", AppType.MAXY.getAppType()),
        PAGEVIEW_INFO("TOP_PV", ReportTypeGroup.TOP.getGroup(), "Page View (Top 10)", AppType.MAXY.getAppType()),
        ERROR_INFO("TOP_ERR", ReportTypeGroup.TOP.getGroup(), "Error (Top 10)", AppType.MAXY.getAppType()),
        CRASH_INFO("TOP_CRS", ReportTypeGroup.TOP.getGroup(), "Crash (Top 10)", AppType.MAXY.getAppType()),
        TOP10_DEVICE_ERROR_INFO("TOP_DEV_ERR", ReportTypeGroup.TOP.getGroup(), "Top 10 Error by Device", AppType.MAXY.getAppType()),
        TOP10_DEVICE_CRASH_INFO("TOP_DEV_CRS", ReportTypeGroup.TOP.getGroup(), "Top 10 Crash by Device", AppType.MAXY.getAppType()),
        NETWORK_ERROR_INFO("TOP_NET_ERR", ReportTypeGroup.TOP.getGroup(), "Top 10 Error by Network", AppType.MAXY.getAppType()),
        NETWORK_CRASH_INFO("TOP_NET_CRS", ReportTypeGroup.TOP.getGroup(), "Top 10 Crash by Network", AppType.MAXY.getAppType()),

        F_STATUS_INFO("F_INFO_STS", ReportTypeGroup.INFO.getGroup(), "Status Info", AppType.MAXY_FRONT.getAppType()),
        F_BROWSER_10("F_TOP_BRW", ReportTypeGroup.TOP.getGroup(), "Top 10 Load pages by browser", AppType.MAXY_FRONT.getAppType()),
        F_LOCATION_10("F_TOP_LOC", ReportTypeGroup.TOP.getGroup(), "Top 10 Page Loads by Region", AppType.MAXY_FRONT.getAppType()),
        F_PAGE_LOAD_10("F_TOP_PG", ReportTypeGroup.TOP.getGroup(), "Top 10 Page Load", AppType.MAXY_FRONT.getAppType()),
        F_PAGE_LOAD_WORST_10("F_TOP_WST_PAGE", ReportTypeGroup.WORST.getGroup(), "Worst 10 Load page by user", AppType.MAXY_FRONT.getAppType()),
        F_LCP_WORST_10("F_TOP_WST_LCP", ReportTypeGroup.WORST.getGroup(), "Worst 10 LCP", AppType.MAXY_FRONT.getAppType()),
        F_CLS_WORST_10("F_TOP_WST_CLS", ReportTypeGroup.WORST.getGroup(), "Worst 10 CLS", AppType.MAXY_FRONT.getAppType()),
        F_INP_WORST_10("F_TOP_WST_INP", ReportTypeGroup.WORST.getGroup(), "Worst 10 INP", AppType.MAXY_FRONT.getAppType()),
        F_ERROR_PAGE_10("F_TOP_ERR_PAGE", ReportTypeGroup.TOP.getGroup(), "Top 10 Number of errors per page", AppType.MAXY_FRONT.getAppType()),
        F_ERROR_MSG_10("F_TOP_ERR_MSG", ReportTypeGroup.TOP.getGroup(), "Top 10 Error Message", AppType.MAXY_FRONT.getAppType()),
        F_ERROR_NET_10("F_TOP_ERR_NET", ReportTypeGroup.TOP.getGroup(), "Top 10 AJAX Error", AppType.MAXY_FRONT.getAppType());

        private final String type;
        private final String group;
        private final String name;
        private final String appType;

        public static ReportType fromType(String type) {
            for (ReportType reportType : values()) {
                if (reportType.getType().equals(type)) {
                    return reportType;
                }
            }
            throw new IllegalArgumentException("Unknown ReportType for type: " + type);
        }

        /**
         * 특정 appType에 해당하는 ReportType 목록을 반환
         *
         * @param appType 앱 타입 (0: MAXY, 1: MAXY_FRONT)
         * @return 해당 appType의 ReportType 배열
         */
        public static ReportType[] getReportTypesByAppType(String appType) {
            return Arrays.stream(values())
                    .filter(reportType -> reportType.getAppType().equals(appType))
                    .toArray(ReportType[]::new);
        }

        /**
         * 특정 AppType enum에 해당하는 ReportType 목록을 반환
         *
         * @param appType AppType enum
         * @return 해당 AppType의 ReportType 배열
         */
        public static ReportType[] getReportTypesByAppType(AppType appType) {
            return getReportTypesByAppType(appType.getAppType());
        }

        /**
         * 특정 appType에 해당하는 ReportType의 type 문자열 목록을 반환
         *
         * @param appType 앱 타입 (false: MAXY, true: MAXY_FRONT)
         * @return 해당 appType의 type 문자열 리스트
         */
        public static List<String> getReportTypeStringsByAppType(String appType) {
            return Arrays.stream(values())
                    .filter(reportType -> reportType.getAppType().equals(appType))
                    .map(ReportType::getType)
                    .collect(Collectors.toList());
        }

        /**
         * 특정 AppType enum에 해당하는 ReportType의 type 문자열 목록을 반환
         *
         * @param appType AppType enum
         * @return 해당 AppType의 type 문자열 리스트
         */
        public static List<String> getReportTypeStringsByAppType(AppType appType) {
            return getReportTypeStringsByAppType(appType.getAppType());
        }

    }

    @Getter
    @RequiredArgsConstructor
    public enum ReportColumnType {
        STRING("string"),
        NUMBER("number"),
        DECIMAL("decimal"),
        TIME("time"),
        PERCENT("percent"),
        BYTE("byte");

        private final String type;
    }

    @Getter
    @RequiredArgsConstructor
    public enum ReportColumn {
        OS_TYPE("osType", "OS", ReportColumnType.STRING),
        APP_VER("appVer", "Version", ReportColumnType.STRING),
        DAU_CNT("dauCnt", "DAU", ReportColumnType.NUMBER),
        AVG_PAGE_VIEW_CNT("avgPageviewCnt", "PV", ReportColumnType.NUMBER),
        TOTAL_LOADING_TIME("totalLoadingTime", "Loading Time", ReportColumnType.TIME),
        TOTAL_RESPONSE_TIME("totalResponseTime", "Response Time", ReportColumnType.TIME),
        AVG_CPU_USAGE("avgCpuUsage", "CPU", ReportColumnType.PERCENT),
        AVG_MEMORY_USAGE("avgMemUsage", "Memory", ReportColumnType.BYTE),
        ERROR_CNT("errorCnt", "Error", ReportColumnType.NUMBER),
        CRASH_CNT("crashCnt", "Crash", ReportColumnType.NUMBER),
        PAGE_VIEW_CNT("pageviewCnt", "PV", ReportColumnType.NUMBER),
        PAGE_VIEW_CNT_RATE("pageviewCntRate", "PV Rate", ReportColumnType.PERCENT),
        MAX_LOADING_TIME("maxLoadingTime", "Max", ReportColumnType.TIME),
        MED_LOADING_TIME("medLoadingTime", "Med", ReportColumnType.TIME),
        MIN_LOADING_TIME("minLoadingTime", "Min", ReportColumnType.TIME),
        DEVICE_MODEL("deviceModel", "Device", ReportColumnType.STRING),
        USER_CNT("userCnt", "User", ReportColumnType.NUMBER),
        RATE("rate", "Rate", ReportColumnType.PERCENT),
        CALL("call", "Call", ReportColumnType.NUMBER),
        RESPONSE_CALL_RATE("responseCallRate", "Response Rate", ReportColumnType.PERCENT),
        MAX_RESPONSE_TIME("maxResponseTime", "Max", ReportColumnType.TIME),
        MED_RESPONSE_TIME("medResponseTime", "Avg", ReportColumnType.TIME),
        MIN_RESPONSE_TIME("minResponseTime", "Min", ReportColumnType.TIME),
        REQ_URL("reqUrl", "Page(or URL)", ReportColumnType.STRING),
        VIEW_CNT("viewCnt", "View", ReportColumnType.NUMBER),
        TOTAL_STAY_TIME("totalStayTime", "Stay Time", ReportColumnType.TIME),
        ERROR_MSG("errorMsg", "Error Message", ReportColumnType.STRING),
        LOG_TYPE("logType", "Log Class", ReportColumnType.STRING),
        LOG_TYPE_DNM("logTypeDnm", "Log Type", ReportColumnType.STRING),
        CRASH_NM("crashNm", "Crash Name", ReportColumnType.STRING),
        CAUSE_BY("causeBy", "Caused By", ReportColumnType.STRING),
        ERROR_RATE("errorRate", "Error Rate", ReportColumnType.PERCENT),
        CRASH_RATE("crashRate", "Crash Rate", ReportColumnType.PERCENT),
        VIEWER_CNT("viewerCnt", "Viewer", ReportColumnType.NUMBER),
        USER_RATE("userRate", "User Rate", ReportColumnType.PERCENT),
        USE_CNT("useCnt", "User", ReportColumnType.NUMBER),
        INSTALL_COUNT("installCnt", "Install", ReportColumnType.NUMBER),
        IOS("ios", "iOS", ReportColumnType.PERCENT),
        ANDROID("android", "Android", ReportColumnType.PERCENT),
        REVISIT_CNT("revisit", "Revisit", ReportColumnType.NUMBER),
        REVISIT_RATE("revisit", "Revisit", ReportColumnType.PERCENT),
        LOGIN_CNT("loginCnt", "Login", ReportColumnType.NUMBER),
        SLEEP_CNT("sleepCnt", "Sleep", ReportColumnType.NUMBER),
        COM_TYPE_DNM("comTypeDnm", "Network", ReportColumnType.STRING),

        //MAXY FRONT용
        BASE_DATE("baseDate", "Base Date", ReportColumnType.STRING),
        COUNT_USER("countUser", "User Count", ReportColumnType.NUMBER),
        COUNT_SESSION("countSession", "Session Count", ReportColumnType.NUMBER),
        COUNT_PAGE("countPv", "Page Load Count", ReportColumnType.NUMBER),
        COUNT("countPv", "Count", ReportColumnType.NUMBER),
        AVG_LOADING_TIME("avgLoadingTime", "Avg Loading Time", ReportColumnType.TIME),
        AVG_INTERVAL_TIME("avgIntervalTime", "Avg AJAX Response Time", ReportColumnType.TIME),
        COUNT_NETWORK("countNetwork", "AJAX Count", ReportColumnType.NUMBER),
        LOCATION_DESC("locationDesc", "Area Name", ReportColumnType.STRING),
        AVG_LCP("avgLcp", "Avg LCP", ReportColumnType.TIME),
        AVG_CLS("avgCls", "Avg CLS", ReportColumnType.DECIMAL),
        AVG_INP("avgInp", "Avg INP", ReportColumnType.TIME),
        COUNT_ERROR("countError", "Error Count", ReportColumnType.NUMBER),
        ROW_NO("no", "No.", ReportColumnType.NUMBER),
        BROWSER("deviceModel", "Browser", ReportColumnType.STRING),
        RES_MSG("resMsg", "Error Message", ReportColumnType.STRING),;

        private final String column;
        private final String name;
        private final ReportColumnType type;

        public static List<Map<String, Object>> getStatusInfoAll() {
            return List.of(
                    Map.of("column", INSTALL_COUNT.column, "name", INSTALL_COUNT.name, "type", INSTALL_COUNT.type, "width", 9),
                    Map.of("column", IOS.column, "name", IOS.name, "type", IOS.type, "width", 9),
                    Map.of("column", ANDROID.column, "name", ANDROID.name, "type", ANDROID.type, "width", 9),
                    Map.of("column", DAU_CNT.column, "name", DAU_CNT.name, "type", DAU_CNT.type, "width", 10),
                    Map.of("column", PAGE_VIEW_CNT.column, "name", PAGE_VIEW_CNT.name, "type", PAGE_VIEW_CNT.type, "width", 13),
                    Map.of("column", REVISIT_CNT.column, "name", REVISIT_CNT.name, "type", REVISIT_CNT.type, "width", 10),
                    Map.of("column", LOGIN_CNT.column, "name", LOGIN_CNT.name, "type", LOGIN_CNT.type, "width", 10),
                    Map.of("column", SLEEP_CNT.column, "name", SLEEP_CNT.name, "type", SLEEP_CNT.type, "width", 10),
                    Map.of("column", ERROR_CNT.column, "name", ERROR_CNT.name, "type", ERROR_CNT.type, "width", 10),
                    Map.of("column", CRASH_CNT.column, "name", CRASH_CNT.name, "type", CRASH_CNT.type, "width", 10));
        }

        public static List<Map<String, Object>> getStatusInfoAvg() {
            return List.of(
                    Map.of("column", INSTALL_COUNT.column, "name", INSTALL_COUNT.name, "type", INSTALL_COUNT.type, "width", 9),
                    Map.of("column", DAU_CNT.column, "name", DAU_CNT.name, "type", DAU_CNT.type, "width", 10),
                    Map.of("column", PAGE_VIEW_CNT.column, "name", PAGE_VIEW_CNT.name, "type", PAGE_VIEW_CNT.type, "width", 16),
                    Map.of("column", REVISIT_RATE.column, "name", REVISIT_RATE.name, "type", REVISIT_RATE.type, "width", 10),
                    Map.of("column", LOGIN_CNT.column, "name", LOGIN_CNT.name, "type", LOGIN_CNT.type, "width", 10),
                    Map.of("column", SLEEP_CNT.column, "name", SLEEP_CNT.name, "type", SLEEP_CNT.type, "width", 10),
                    Map.of("column", TOTAL_STAY_TIME.column, "name", TOTAL_STAY_TIME.name, "type", TOTAL_STAY_TIME.type, "width", 15),
                    Map.of("column", ERROR_CNT.column, "name", ERROR_CNT.name, "type", ERROR_CNT.type, "width", 10),
                    Map.of("column", CRASH_CNT.column, "name", CRASH_CNT.name, "type", CRASH_CNT.type, "width", 10));
        }

        public static List<Map<String, Object>> getVersionSummary() {
            return List.of(
                    Map.of("column", OS_TYPE.column, "name", OS_TYPE.name, "type", OS_TYPE.type, "width", 10),
                    Map.of("column", APP_VER.column, "name", APP_VER.name, "type", APP_VER.type, "width", 10),
                    Map.of("column", DAU_CNT.column, "name", DAU_CNT.name, "type", DAU_CNT.type, "width", 10),
                    Map.of("column", AVG_PAGE_VIEW_CNT.column, "name", AVG_PAGE_VIEW_CNT.name, "type", AVG_PAGE_VIEW_CNT.type, "width", 10),
                    Map.of("column", TOTAL_LOADING_TIME.column, "name", TOTAL_LOADING_TIME.name, "type", TOTAL_LOADING_TIME.type, "width", 10),
                    Map.of("column", TOTAL_RESPONSE_TIME.column, "name", TOTAL_RESPONSE_TIME.name, "type", TOTAL_RESPONSE_TIME.type, "width", 10),
                    Map.of("column", AVG_CPU_USAGE.column, "name", AVG_CPU_USAGE.name, "type", AVG_CPU_USAGE.type, "width", 10),
                    Map.of("column", AVG_MEMORY_USAGE.column, "name", AVG_MEMORY_USAGE.name, "type", AVG_MEMORY_USAGE.type, "width", 10),
                    Map.of("column", ERROR_CNT.column, "name", ERROR_CNT.name, "type", ERROR_CNT.type, "width", 10),
                    Map.of("column", CRASH_CNT.column, "name", CRASH_CNT.name, "type", CRASH_CNT.type, "width", 10));
        }

        public static List<Map<String, Object>> getLoadingSummary() {
            return List.of(
                    Map.of("column", OS_TYPE.column, "name", OS_TYPE.name, "type", OS_TYPE.type, "width", 20),
                    Map.of("column", APP_VER.column, "name", APP_VER.name, "type", APP_VER.type, "width", 20),
                    Map.of("column", PAGE_VIEW_CNT.column, "name", PAGE_VIEW_CNT.name, "type", PAGE_VIEW_CNT.type, "width", 20),
                    Map.of("column", PAGE_VIEW_CNT_RATE.column, "name", PAGE_VIEW_CNT_RATE.name, "type", PAGE_VIEW_CNT_RATE.type, "width", 10),
                    Map.of("column", MAX_LOADING_TIME.column, "name", MAX_LOADING_TIME.name, "type", MAX_LOADING_TIME.type, "width", 10),
                    Map.of("column", MED_LOADING_TIME.column, "name", MED_LOADING_TIME.name, "type", MED_LOADING_TIME.type, "width", 10),
                    Map.of("column", MIN_LOADING_TIME.column, "name", MIN_LOADING_TIME.name, "type", MIN_LOADING_TIME.type, "width", 10));
        }

        public static List<Map<String, Object>> getLoading10() {
            return List.of(
                    Map.of("column", OS_TYPE.column, "name", OS_TYPE.name, "type", OS_TYPE.type, "width", 20),
                    Map.of("column", DEVICE_MODEL.column, "name", DEVICE_MODEL.name, "type", DEVICE_MODEL.type, "width", 25),
                    Map.of("column", USE_CNT.column, "name", USE_CNT.name, "type", USE_CNT.type, "width", 15),
                    Map.of("column", RATE.column, "name", RATE.name, "type", RATE.type, "width", 10),
                    Map.of("column", MAX_LOADING_TIME.column, "name", MAX_LOADING_TIME.name, "type", MAX_LOADING_TIME.type, "width", 10),
                    Map.of("column", MED_LOADING_TIME.column, "name", MED_LOADING_TIME.name, "type", MED_LOADING_TIME.type, "width", 10),
                    Map.of("column", MIN_LOADING_TIME.column, "name", MIN_LOADING_TIME.name, "type", MIN_LOADING_TIME.type, "width", 10));
        }

        public static List<Map<String, Object>> getResponseSummary() {
            return List.of(
                    Map.of("column", OS_TYPE.column, "name", OS_TYPE.name, "type", OS_TYPE.type, "width", 20),
                    Map.of("column", APP_VER.column, "name", APP_VER.name, "type", APP_VER.type, "width", 20),
                    Map.of("column", CALL.column, "name", CALL.name, "type", CALL.type, "width", 20),
                    Map.of("column", RESPONSE_CALL_RATE.column, "name", RESPONSE_CALL_RATE.name, "type", RESPONSE_CALL_RATE.type, "width", 10),
                    Map.of("column", MAX_RESPONSE_TIME.column, "name", MAX_RESPONSE_TIME.name, "type", MAX_RESPONSE_TIME.type, "width", 10),
                    Map.of("column", MED_RESPONSE_TIME.column, "name", MED_RESPONSE_TIME.name, "type", MED_RESPONSE_TIME.type, "width", 10),
                    Map.of("column", MIN_RESPONSE_TIME.column, "name", MIN_RESPONSE_TIME.name, "type", MIN_RESPONSE_TIME.type, "width", 10));
        }

        public static List<Map<String, Object>> getResponse10() {
            return List.of(
                    Map.of("column", OS_TYPE.column, "name", OS_TYPE.name, "type", OS_TYPE.type, "width", 20),
                    Map.of("column", DEVICE_MODEL.column, "name", DEVICE_MODEL.name, "type", DEVICE_MODEL.type, "width", 25),
                    Map.of("column", USE_CNT.column, "name", USE_CNT.name, "type", USE_CNT.type, "width", 15),
                    Map.of("column", RATE.column, "name", RATE.name, "type", RATE.type, "width", 10),
                    Map.of("column", MAX_RESPONSE_TIME.column, "name", MAX_RESPONSE_TIME.name, "type", MAX_RESPONSE_TIME.type, "width", 10),
                    Map.of("column", MED_RESPONSE_TIME.column, "name", MED_RESPONSE_TIME.name, "type", MED_RESPONSE_TIME.type, "width", 10),
                    Map.of("column", MIN_RESPONSE_TIME.column, "name", MIN_RESPONSE_TIME.name, "type", MIN_RESPONSE_TIME.type, "width", 10));
        }

        public static List<Map<String, Object>> getPageViewInfo() {
            return List.of(
                    Map.of("column", PAGE_VIEW_CNT.column, "name", PAGE_VIEW_CNT.name, "type", PAGE_VIEW_CNT.type, "width", 10),
                    Map.of("column", REQ_URL.column, "name", REQ_URL.name, "type", REQ_URL.type, "width", 40),
                    Map.of("column", VIEWER_CNT.column, "name", VIEWER_CNT.name, "type", VIEWER_CNT.type, "width", 10),
                    Map.of("column", TOTAL_STAY_TIME.column, "name", TOTAL_STAY_TIME.name, "type", TOTAL_STAY_TIME.type, "width", 10),
                    Map.of("column", TOTAL_LOADING_TIME.column, "name", TOTAL_LOADING_TIME.name, "type", TOTAL_LOADING_TIME.type, "width", 10),
                    Map.of("column", ERROR_CNT.column, "name", ERROR_CNT.name, "type", ERROR_CNT.type, "width", 10),
                    Map.of("column", CRASH_CNT.column, "name", CRASH_CNT.name, "type", CRASH_CNT.type, "width", 10));
        }

        public static List<Map<String, Object>> getErrorInfo() {
            return List.of(
                    Map.of("column", ERROR_CNT.column, "name", ERROR_CNT.name, "type", ERROR_CNT.type, "width", 10),
                    Map.of("column", ERROR_MSG.column, "name", ERROR_MSG.name, "type", ERROR_MSG.type, "width", 50),
                    Map.of("column", LOG_TYPE.column, "name", LOG_TYPE.name, "type", LOG_TYPE.type, "width", 20),
                    Map.of("column", LOG_TYPE_DNM.column, "name", LOG_TYPE_DNM.name, "type", LOG_TYPE_DNM.type, "width", 10),
                    Map.of("column", RATE.column, "name", RATE.name, "type", RATE.type, "width", 10));
        }

        public static List<Map<String, Object>> getCrashInfo() {
            return List.of(
                    Map.of("column", CRASH_CNT.column, "name", CRASH_CNT.name, "type", CRASH_CNT.type, "width", 10),
                    Map.of("column", CRASH_NM.column, "name", CRASH_NM.name, "type", CRASH_NM.type, "width", 40),
                    Map.of("column", CAUSE_BY.column, "name", CAUSE_BY.name, "type", CAUSE_BY.type, "width", 40),
                    Map.of("column", RATE.column, "name", RATE.name, "type", RATE.type, "width", 10));
        }

        public static List<Map<String, Object>> getErrorDeviceInfo() {
            return List.of(
                    Map.of("column", ERROR_CNT.column, "name", ERROR_CNT.name, "type", ERROR_CNT.type, "width", 20),
                    Map.of("column", ERROR_RATE.column, "name", ERROR_RATE.name, "type", ERROR_RATE.type, "width", 10),
                    Map.of("column", DEVICE_MODEL.column, "name", DEVICE_MODEL.name, "type", DEVICE_MODEL.type, "width", 20),
                    Map.of("column", OS_TYPE.column, "name", OS_TYPE.name, "type", OS_TYPE.type, "width", 20),
                    Map.of("column", USER_CNT.column, "name", USER_CNT.name, "type", USER_CNT.type, "width", 20),
                    Map.of("column", USER_RATE.column, "name", USER_RATE.name, "type", USER_RATE.type, "width", 10));
        }

        public static List<Map<String, Object>> getCrashDeviceInfo() {
            return List.of(
                    Map.of("column", CRASH_CNT.column, "name", CRASH_CNT.name, "type", CRASH_CNT.type, "width", 20),
                    Map.of("column", CRASH_RATE.column, "name", CRASH_RATE.name, "type", CRASH_RATE.type, "width", 10),
                    Map.of("column", DEVICE_MODEL.column, "name", DEVICE_MODEL.name, "type", DEVICE_MODEL.type, "width", 20),
                    Map.of("column", OS_TYPE.column, "name", OS_TYPE.name, "type", OS_TYPE.type, "width", 20),
                    Map.of("column", USER_CNT.column, "name", USER_CNT.name, "type", USER_CNT.type, "width", 20),
                    Map.of("column", USER_RATE.column, "name", USER_RATE.name, "type", USER_RATE.type, "width", 10));
        }

        public static List<Map<String, Object>> getNetworkErrorInfo() {
            return List.of(
                    Map.of("column", COM_TYPE_DNM.column, "name", COM_TYPE_DNM.name, "type", COM_TYPE_DNM.type, "width", 10),
                    Map.of("column", ERROR_CNT.column, "name", ERROR_CNT.name, "type", ERROR_CNT.type, "width", 10),
                    Map.of("column", ERROR_MSG.column, "name", ERROR_MSG.name, "type", ERROR_MSG.type, "width", 40),
                    Map.of("column", LOG_TYPE.column, "name", LOG_TYPE.name, "type", LOG_TYPE.type, "width", 20),
                    Map.of("column", LOG_TYPE_DNM.column, "name", LOG_TYPE_DNM.name, "type", LOG_TYPE_DNM.type, "width", 10),
                    Map.of("column", RATE.column, "name", RATE.name, "type", RATE.type, "width", 10));
        }

        public static List<Map<String, Object>> getNetworkCrashInfo() {
            return List.of(
                    Map.of("column", COM_TYPE_DNM.column, "name", COM_TYPE_DNM.name, "type", COM_TYPE_DNM.type, "width", 10),
                    Map.of("column", CRASH_CNT.column, "name", CRASH_CNT.name, "type", CRASH_CNT.type, "width", 10),
                    Map.of("column", CRASH_NM.column, "name", CRASH_NM.name, "type", CRASH_NM.type, "width", 35),
                    Map.of("column", CAUSE_BY.column, "name", CAUSE_BY.name, "type", CAUSE_BY.type, "width", 35),
                    Map.of("column", RATE.column, "name", RATE.name, "type", RATE.type, "width", 10));
        }

        public static List<Map<String, Object>> getFrontStatusInfo() {
            return List.of(
                    Map.of("column", BASE_DATE.column, "name", BASE_DATE.name, "type", BASE_DATE.type, "width", 12),
                    Map.of("column", COUNT_USER.column, "name", COUNT_USER.name, "type", COUNT_USER.type, "width", 14),
                    Map.of("column", COUNT_SESSION.column, "name", COUNT_SESSION.name, "type", COUNT_SESSION.type, "width", 14),
                    Map.of("column", COUNT_PAGE.column, "name", COUNT_PAGE.name, "type", COUNT_PAGE.type, "width", 14),
                    Map.of("column", AVG_LOADING_TIME.column, "name", AVG_LOADING_TIME.name, "type", AVG_LOADING_TIME.type, "width", 16),
                    Map.of("column", COUNT_NETWORK.column, "name", COUNT_NETWORK.name, "type", COUNT_NETWORK.type, "width", 14),
                    Map.of("column", AVG_INTERVAL_TIME.column, "name", AVG_INTERVAL_TIME.name, "type", AVG_INTERVAL_TIME.type, "width", 16));
        }

        public static List<Map<String, Object>> getFrontBrowserPageLoadTop10() {
            return List.of(
                    Map.of("column", ROW_NO.column, "name", ROW_NO.name, "type", ROW_NO.type, "width", 10),
                    Map.of("column", BROWSER.column, "name", BROWSER.name, "type", BROWSER.type, "width", 60),
                    Map.of("column", COUNT.column, "name", COUNT.name, "type", COUNT.type, "width", 15),
                    Map.of("column", AVG_LOADING_TIME.column, "name", AVG_LOADING_TIME.name, "type", AVG_LOADING_TIME.type, "width", 15));
        }

        public static List<Map<String, Object>> getFrontLocationPageLoadTop10() {
            return List.of(
                    Map.of("column", ROW_NO.column, "name", ROW_NO.name, "type", ROW_NO.type, "width", 10),
                    Map.of("column", LOCATION_DESC.column, "name", LOCATION_DESC.name, "type", LOCATION_DESC.type, "width", 60),
                    Map.of("column", COUNT.column, "name", COUNT.name, "type", COUNT.type, "width", 15),
                    Map.of("column", AVG_LOADING_TIME.column, "name", AVG_LOADING_TIME.name, "type", AVG_LOADING_TIME.type, "width", 15));
        }

        public static List<Map<String, Object>> getFrontPageLoadTop10() {
            return List.of(
                    Map.of("column", ROW_NO.column, "name", ROW_NO.name, "type", ROW_NO.type, "width", 10),
                    Map.of("column", REQ_URL.column, "name", REQ_URL.name, "type", REQ_URL.type, "width", 60),
                    Map.of("column", COUNT.column, "name", COUNT.name, "type", COUNT.type, "width", 15),
                    Map.of("column", AVG_LOADING_TIME.column, "name", AVG_LOADING_TIME.name, "type", AVG_LOADING_TIME.type, "width", 15));
        }

        public static List<Map<String, Object>> getFrontPageLoadWorst10() {
            return List.of(
                    Map.of("column", ROW_NO.column, "name", ROW_NO.name, "type", ROW_NO.type, "width", 10),
                    Map.of("column", REQ_URL.column, "name", REQ_URL.name, "type", REQ_URL.type, "width", 60),
                    Map.of("column", COUNT.column, "name", COUNT.name, "type", COUNT.type, "width", 15),
                    Map.of("column", AVG_LOADING_TIME.column, "name", AVG_LOADING_TIME.name, "type", AVG_LOADING_TIME.type, "width", 15));
        }

        public static List<Map<String, Object>> getFrontLcpWorst10() {
            return List.of(
                    Map.of("column", ROW_NO.column, "name", ROW_NO.name, "type", ROW_NO.type, "width", 10),
                    Map.of("column", AVG_LCP.column, "name", AVG_LCP.name, "type", AVG_LCP.type, "width", 10),
                    Map.of("column", REQ_URL.column, "name", REQ_URL.name, "type", REQ_URL.type, "width", 50),
                    Map.of("column", COUNT.column, "name", COUNT.name, "type", COUNT.type, "width", 15),
                    Map.of("column", AVG_LOADING_TIME.column, "name", AVG_LOADING_TIME.name, "type", AVG_LOADING_TIME.type, "width", 15));
        }

        public static List<Map<String, Object>> getFrontClsWorst10() {
            return List.of(
                    Map.of("column", ROW_NO.column, "name", ROW_NO.name, "type", ROW_NO.type, "width", 10),
                    Map.of("column", AVG_CLS.column, "name", AVG_CLS.name, "type", AVG_CLS.type, "width", 10),
                    Map.of("column", REQ_URL.column, "name", REQ_URL.name, "type", REQ_URL.type, "width", 50),
                    Map.of("column", COUNT.column, "name", COUNT.name, "type", COUNT.type, "width", 15),
                    Map.of("column", AVG_LOADING_TIME.column, "name", AVG_LOADING_TIME.name, "type", AVG_LOADING_TIME.type, "width", 15));
        }

        public static List<Map<String, Object>> getFrontInpWorst10() {
            return List.of(
                    Map.of("column", ROW_NO.column, "name", ROW_NO.name, "type", ROW_NO.type, "width", 10),
                    Map.of("column", AVG_INP.column, "name", AVG_INP.name, "type", AVG_INP.type, "width", 10),
                    Map.of("column", REQ_URL.column, "name", REQ_URL.name, "type", REQ_URL.type, "width", 50),
                    Map.of("column", COUNT.column, "name", COUNT.name, "type", COUNT.type, "width", 15),
                    Map.of("column", AVG_LOADING_TIME.column, "name", AVG_LOADING_TIME.name, "type", AVG_LOADING_TIME.type, "width", 15));
        }

        public static List<Map<String, Object>> getFrontPageErrorTop10() {
            return List.of(
                    Map.of("column", ROW_NO.column, "name", ROW_NO.name, "type", ROW_NO.type, "width", 10),
                    Map.of("column", REQ_URL.column, "name", REQ_URL.name, "type", REQ_URL.type, "width", 75),
                    Map.of("column", COUNT_ERROR.column, "name", COUNT_ERROR.name, "type", COUNT_ERROR.type, "width", 15));
        }

        public static List<Map<String, Object>> getFrontErrorMsgTop10() {
            return List.of(
                    Map.of("column", ROW_NO.column, "name", ROW_NO.name, "type", ROW_NO.type, "width", 10),
                    Map.of("column", RES_MSG.column, "name", RES_MSG.name, "type", RES_MSG.type, "width", 75),
                    Map.of("column", COUNT_ERROR.column, "name", COUNT_ERROR.name, "type", COUNT_ERROR.type, "width", 15));
        }

        public static List<Map<String, Object>> getFrontErrorNetworkTop10() {
            return List.of(
                    Map.of("column", ROW_NO.column, "name", ROW_NO.name, "type", ROW_NO.type, "width", 10),
                    Map.of("column", RES_MSG.column, "name", RES_MSG.name, "type", RES_MSG.type, "width", 75),
                    Map.of("column", COUNT_ERROR.column, "name", COUNT_ERROR.name, "type", COUNT_ERROR.type, "width", 15));
        }
    }
}
