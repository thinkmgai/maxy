package com.thinkm.common.code;

import com.thinkm.common.util.JsonUtil;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@SuppressWarnings("unused")
@Slf4j
@Getter
@RequiredArgsConstructor
public enum MaxyLogType {
    /* log type 구간 설정 */
    G_3("", "", "", 0x00030000, 196608, false, false),
    G_5("", "", "", 0x00050000, 327680, false, false),
    G_9("", "", "", 0x00090000, 589824, false, false),
    G_11("", "", "", 0x00110000, 1114112, false, false),
    G_21("", "", "", 0x00210000, 2162688, false, false),
    G_31("", "", "", 0x00310000, 3211264, false, false),
    G_41("", "", "", 0x00410000, 4259840, false, false),
    G_81("", "", "", 0x00810000, 8454144, false, false),

    /* 웹서버 구동 시간 측정 */
//    G_WebServer("Webserver",
//            "",
//            "",
//            0x00010000, 65536, false, false),
//    T_WebServer_Start("Webserver",
//            "Start",
//            "webserver.start",
//            0x00010001, 65537, false, false),
//    T_WebServer_Error("Webserver",
//            "Error",
//            "webserver.error",
//            0x00010002, 65538, false, false),
//    T_WebServer_End("Webserver",
//            "End",
//            "webserver.end",
//            0x00010003, 65539, false, false),

    /* 웹 네비게이션 */
    G_WebNav("WebNavigation",
            "",
            "",
            0x00020000, 131072, false, false),
    T_WebNav_Start("WebNavigation",
            "Start",
            "모바일 웹 페이지 Loading을 시작",
            0x00020001, 131073, true, false),
    T_WebNav_Response("WebNavigation",
            "Response",
            "모바일 웹 페이지 Loading을 응답",
            0x00020002, 131074, false, false),
    T_WebNav_Finish("WebNavigation",
            "End",
            "모바일 웹 페이지 Loading을 마침",
            0x00020003, 131075, true, false),
    T_WebNav_Error("WebNavigation",
            "Error",
            "모바일 웹 페이지 Loading 시 오류가 발생함",
            0x00020004, 131076, true, false),
    T_WebNav_Java_Error("WebNavigation",
            "Script Error",
            "모바일 웹 페이지 Javascript 오류가 발생함",
            0x00020005, 131077, false, false),
    T_WebNav_Redirection("WebNavigation",
            "Redirection",
            "모바일 웹 페이지 Redirection",
            0x00020006, 131078, false, false),

    /* 안드로이드의 경우 각 리소스별 다운로드 시간 */
    T_WebNav_Res_Down_Time_Start("WebNavigation",
            "ResourceDown Start",
            "모바일 웹 페이지의 리소스 다운로드를 시작",
            0x00020007, 131079, false, false),
    T_WebNav_Res_Down_Time_Finish("WebNavigation",
            "ResourceDown End",
            "모바일 웹 페이지의 리소스 다운로드를 마침",
            0x00020008, 131080, false, false),
    T_WebNav_SSL("WebNavigation",
            "SSL",
            "모바일 웹 페이지가 SSL 통신함",
            0x00020009, 131081, false, false),
    T_WebNav_Click("WebNavigation",
            "Click",
            "모바일 웹 페이지 내 Click(Point Up) 이벤트",
            0x00020010, 131088, false, false),
    /* 웹 네비게이션시 java script 이벤트 - MiAPS 미적용 시스템 */
    T_WebNav_Show_Load("WebNavigation",
            "Page Load",
            "모바일 웹 페이지 Lifecycle Load 이벤트",
            0x00020011, 131089, false, false),
    T_WebNav_Show_Back("WebNavigation",
            "Page Back",
            "모바일 웹 페이지 Lifecycle PageShow 이벤트 중 뒤로가기",
            0x00020012, 131090, false, false),
    T_WebNav_Show_Refresh("WebNavigation",
            "Page Refresh",
            "모바일 웹 페이지 Lifecycle PageShow 이벤트 중 새로고침",
            0x00020013, 131091, false, false),
    T_WebNav_Show_Forward("WebNavigation",
            "Page Forward",
            "모바일 웹 페이지 Lifecycle PageShow 이벤트",
            0x00020014, 131092, false, false),
    T_WebNav_Show_Hide("WebNavigation",
            "Page Hide",
            "모바일 웹 페이지 Lifecycle PageHide 이벤트",
            0x00020015, 131093, false, false),
    T_WebNav_Show_Pushstate("WebNavigation",
            "Page PushState",
            "모바일 웹 페이지 History 객체의 PushState 이벤트",
            0x00020016, 131094, false, false),
    T_WebNav_Show_Popstate("WebNavigation",
            "Page PopState",
            "모바일 웹 페이지 뒤로가기 이벤트가 발생함",
            0x00020017, 131095, false, false),
    T_WebNav_Show_Unload("WebNavigation",
            "Page Unload",
            "페이지를 벗어날 때 호출되는 모바일 웹 페이지 Lifecycle Unload 이벤트",
            0x00020018, 131096, false, false),
    T_WebNav_Show_Hashchange("WebNavigation",
            "Page HashChange",
            "대상 모바일 웹 페이지에서 해시(#)만 변경됨",
            0x00020019, 131097, false, false),
    T_WebNav_Show_DocReadyStateChange("WebNavigation",
            "Page ReadyStateChange",
            "모바일 웹 페이지 Lifecycle ReadyStateChange 이벤트",
            0x00020020, 131104, false, false),
    T_WebNav_Show_DoccontentLoad("WebNavigation",
            "Page DOMContentLoaded",
            "모바일 웹 페이지 Lifecycle DOMContentLoaded 이벤트",
            0x00020021, 131105, false, false),
    T_WebNav_MAXY_Login("WebNavigation",
            "Login",
            "모니터링 대상의 로그인 여부를 체크함",
            0x00020022, 131106, false, false),
    T_WebNav_MAXY_Logout("WebNavigation",
            "Logout",
            "모니터링 대상의 로그아웃 여부를 체크함",
            0x00020023, 131107, false, false),
    T_WebNav_WEB_LOADING_END("WebNavigation",
            "Loading Time",
            "모니터링 대상의 웹 리소스 다운로드 시간",
            0x00020024, 131108, false, false),
    T_WebNav_Biz_Error("WebNavigation",
            "Biz Error",
            "모바일 웹 페이지 고객 Business 오류 발생",
            0x00020025, 131109, false, false),
    T_WebNav_Web_Vital("WebNavigation",
            "Web Vital",
            "모바일 웹 페이지 Web Vital Log가 수집됨",
            0x00020026, 131110, false, false),

    T_WebNav_Popup_Info("WebNavigation",
            "Popup Info",
            "팝업 호출 시 호출된 팝업 정보 수집",
            0x00020027, 131111, false, false),
    T_WebNav_Search_Keyword("WebNavigation",
            "Search Keyword",
            "검색키워드 수집",
            0x00020028, 131112, false, false),
    T_WebNav_Terms_Complete("WebNavigation",
            "Terms Complete",
            "약관동의완료 정보 수집",
            0x00020029, 131113, false, false),
    T_WebNav_Subscribe_Complete("WebNavigation",
            "Subscribe Complete",
            "상품가입완료 정보 수집",
            0x00020030, 131120, false, false),
    T_WebNav_Bottom_Popup_Info("WebNavigation",
            "BottomPopup Info",
            "Bottom 팝업 호출 시 호출된 팝업 정보 수집",
            0x00020031, 131121, false, false),

    /* 리소스 다운로드 */
//    G_Res_Down("ResourceDown",
//            "",
//            "",
//            0x00040000, 262144, false, false),
//    T_Res_Down_Inf("ResourceDown",
//            "Inf",
//            "MiAPS Hybrid의 Resource Download용 INF 파일을 다운로드함",
//            0x00040001, 262145, false, false),
//    T_Res_Down_Start("ResourceDown",
//            "Start",
//            "MiAPS Hybrid의 Resource Download를 시작함",
//            0x00040002, 262146, false, false),
//    T_Res_Down_End("ResourceDown",
//            "End",
//            "MiAPS Hybrid의 Resource Download를 마침",
//            0x00040003, 262147, false, false),
//    T_Res_Down_Error("ResourceDown",
//            "Error",
//            "MiAPS Hybrid의 Resource Download 중 Error가 발생함",
//            0x00040004, 262148, false, false),

    /* Http 통신 */
    G_Http_Request("HttpRequest",
            "",
            "",
            0x00080000, 524288, false, true),
    T_Http_Request("HttpRequest",
            "Request",
            "Client¹와 Server 간 Http 요청을 시작함",
            0x00080001, 524289, true, true),
    T_Http_End("HttpRequest",
            "Response(Legacy)",
            "Client¹와 Server 간 Http 요청에 대해 응답함",
            0x00080002, 524290, true, true),
    // End -> Response 로 변경
    T_Http_Response("HttpRequest",
            "Response",
            "Client¹와 Server 간 Http 요청이 응답함",
            0x00080003, 524291, true, true),
    // TODO: HttpRequest -> Network 로 변경 예정. 이 값이 변경되면 다국어팩도 수정해야 함 !!
    T_Http_Error("HttpRequest",
            "Error",
            "Client¹와 Server 간 Http 요청 중 Error가 발생함",
            0x00080004, 524292, true, true),
    T_Http_Exception("HttpRequest",
            "Exception",
            "Client¹와 Server 간 Http 요청 중 Exception이 발생함",
            0x00080005, 524293, true, true),

    /* 네이티브 함수 응답 */
    G_Native_Action("NativeAction",
            "",
            "",
            0x00100000, 1048576, false, false),
    T_Native_Action_Start("NativeAction",
            "Start",
            "모니터링 대상의 Native 영역의 요청이 시작됨",
            0x00100001, 1048577, false, true),
    T_Native_Action_End("NativeAction",
            "End",
            "모니터링 대상의 Native 영역에서 요청이 종료됨",
            0x00100002, 1048578, false, true),
    T_Native_Action_Error("NativeAction",
            "Error",
            "모니터링 대상의 Native 영역에서 Error가 발생함",
            0x00100003, 1048579, true, true),
    T_Native_App_Start("NativeAction",
            "App Start",
            "모니터링 대상의 실행이 시작됨",
            0x00100004, 1048580, true, false),
    T_Native_App_Foreground("NativeAction",
            "App Foreground",
            "모니터링 대상이 Background 상태에서 Foreground로 변경됨",
            0x00100005, 1048581, true, true),
    T_Native_App_Background("NativeAction",
            "App Background",
            "모니터링 대상이 Foreground 상태에서 Background로 변경됨",
            0x00100006, 1048582, true, true),
    T_Native_App_Terminate("NativeAction",
            "App Terminate",
            "모니터링 대상이 종료됨",
            0x00100007, 1048583, true, true),
    T_DeepLink("NativeAction", "DeepLink", "딥링크", 0x00100008, 1048584, false, false),
    T_Native_App_NotResponse("NativeAction", "App NotResponse", "ANR", 0x00100009, 1048585, false, false),
    T_Native_App_PageStart("NativeAction", "App PageStart", "Native app page start", 0x00100010, 1048592, true, false),
    T_Native_App_PageEnd("NativeAction", "App PageEnd", "Native app page end", 0x00100011, 1048593, true, false),

    T_Native_Biz_Error("NativeAction",
            "Biz Error",
            "Native 고객 Business 오류 발생",
            0x00100012,
            1048594,
            false,
            false),
    T_Native_Action_Click("NativeAction",
            "Action Click",
            "Native app 내 수집이 필요한 Click Event 발생 시 Tagging",
            0x00100013,
            1048595,
            false,
            false),
    T_Native_Install_referer("NativeAction",
            "Install Referer",
            "Native app Install referer 수집 로그",
            0x00100014,
            1048596,
            false,
            true),

    T_Native_App_FirstStart("NativeAction",
            "App FirstStart",
            "Native app 최초실행",
            0x00100015,
            1048597,
            false,
            false),

    /* Native crash */
    G_Native_Crash("Native",
            "Crash",
            "Native 영역에서 크래시가 발생함",
            0x00200000, 2097152, true, true),

    /* Custom tag */
    G_Custom_tag("Custom Tag",
            "",
            "",
            0x00400000, 4194304, false, false),
    T_Custom_MAXY_Tagging_Common("Custom Tag",
            "Common",
            "모니터링 대상의 자동 수집되는 Error를 제외한 일반 지표를 정의함",
            0x00400001, 4194305, false, false),
    T_Custom_MAXY_Tagging_Error("Custom Tag",
            "Error",
            "모니터링 대상의 자동 수집되는 Error를 제외한 별도 이슈를 정의함",
            0x00400002, 4194306, false, false),
    T_Custom_MAXY_Tagging_Alarm("Custom Tag",
            "Alarm",
            "모니터링 대상의 자동 수집되는 Error를 제외한 별도 알림 항목을 정의함",
            0x00400003, 4194307, false, false),

    G_AUTO_TAG("Auto Tag",
            "",
            "",
            0x00500000, 5242880, false, true),
    T_AUTO_TAG_PAGE_START("Auto Tag",
            "Start",
            "Auto Tag 페이지가 시작됨",
            0x00500001, 5242881, false, true),
    T_AUTO_TAG_PAGE_END("Auto Tag",
            "End",
            "Auto Tag 페이지가 종료됨",
            0x00500002, 5242882, false, true),
    T_AUTO_TAG_PAGE_ACTION("Auto Tag",
            "Action",
            "Auto Tag 액션이 발생함",
            0x00500003, 5242883, false, true),

    T_MAXY_Info("MAXY",
            "Info",
            "SetMaxyInfo, TargetAppCheck, JSDownload URL",
            0x00010004, 65540, true, false),

    /* Web Http */
    G_XMLHttpRequest("Ajax",
            "",
            "",
            0x00800000, 8388608, false, false),
    T_XMLHttpRequest_Submit("Ajax",
            "Submit",
            "Submit을 동작함",
            0x00800001, 8388609, false, false),
    // Open -> Request 로 변경
    T_XMLHttpRequest_Request("Ajax",
            "Request",
            "XMLHttpRequest(Ajax) 객체를 생성함",
            0x00800002, 8388610, false, false),
    T_XMLHttpRequest_Send("Ajax",
            "Send",
            "XMLHttpRequest(Ajax) 송신을 시작함",
            0x00800003, 8388611, true, false),
    T_XMLHttpRequest_Response("Ajax",
            "Response",
            "XMLHttpRequest(Ajax) 송신에 따른 응답을 수신함",
            0x00800004, 8388612, true, false),
    T_XMLHttpRequest_Error("Ajax",
            "Error",
            "XMLHttpRequest(Ajax) 송신 코드 값이 3xx, 4xx, 5xx임",
            0x00800005, 8388613, true, false),
    T_XMLHttpRequest_Exception("Ajax",
            "Exception",
            "XMLHttpRequest(Ajax) 송신 시 Exception이 발생함",
            0x00800006, 8388614, true, false);

    // Native 코드 모음
    public static final Set<Integer> NATIVE_TYPES_SET = Stream.of(
            G_Native_Action,
            T_Native_Action_Start,
            T_Native_Action_End,
            T_Native_Action_Error,
            T_Native_App_Start,
            T_Native_App_Foreground,
            T_Native_App_Background,
            T_Native_App_Terminate,
            T_DeepLink,
            T_Native_App_NotResponse,
            T_Native_App_PageStart,
            T_Native_App_PageEnd,
            G_Native_Crash
    ).map(MaxyLogType::getDecimal).collect(Collectors.toUnmodifiableSet());

    // Network 코드 모음 (집계 용도)
    public static final Set<Integer> NETWORK_TYPES_SET = Stream.of(
            T_XMLHttpRequest_Response,
            T_XMLHttpRequest_Error,
            T_Http_Response,
            T_Http_Error
    ).map(MaxyLogType::getDecimal).collect(Collectors.toUnmodifiableSet());

    // Network error 코드 모음 (집계 용도)
    public static final Set<Integer> NETWORK_ERROR_TYPES_SET = Stream.of(
            T_XMLHttpRequest_Error,
            T_XMLHttpRequest_Exception,
            T_Http_Error,
            T_Http_Exception
    ).map(MaxyLogType::getDecimal).collect(Collectors.toUnmodifiableSet());

    // Error 코드 모음
    public static final Set<Integer> ERROR_TYPES_SET = Stream.of(
            T_WebNav_Error,
            T_WebNav_Java_Error,
            T_Http_Error,
            T_Custom_MAXY_Tagging_Error,
            T_Native_Action_Error,
            T_Http_Exception,
            T_XMLHttpRequest_Exception,
            T_XMLHttpRequest_Error
    ).map(MaxyLogType::getDecimal).collect(Collectors.toUnmodifiableSet());

    // Front Error 코드 모음
    public static final Set<Integer> FRONT_ERROR_TYPES_SET = Stream.of(
            T_WebNav_Error,
            T_WebNav_Java_Error,
            T_Custom_MAXY_Tagging_Error,
            T_Native_Action_Error
    ).map(MaxyLogType::getDecimal).collect(Collectors.toUnmodifiableSet());

    // Crash 코드 모음
    public static final Set<Integer> CRASH_TYPES_SET = Stream.of(
            G_Native_Crash
    ).map(MaxyLogType::getDecimal).collect(Collectors.toUnmodifiableSet());

    // Vital 코드 모음
    public static final Set<Integer> VITAL_TYPES_SET = Stream.of(
            T_WebNav_Web_Vital
    ).map(MaxyLogType::getDecimal).collect(Collectors.toUnmodifiableSet());

    // Access 코드 모음
    public static final Set<Integer> ACCESS_TYPES_SET = Stream.of(
            T_Native_Action_Start,
            T_Native_App_Start,
            T_WebNav_Start
    ).map(MaxyLogType::getDecimal).collect(Collectors.toUnmodifiableSet());

    // Visit 코드 모음
    public static final Set<Integer> VISIT_TYPES_SET = Stream.of(
            T_Native_App_Start,
            T_WebNav_MAXY_Login
    ).map(MaxyLogType::getDecimal).collect(Collectors.toUnmodifiableSet());

    // Web Performance 코드 모음
    public static final Set<Integer> WEBPERF_TYPES_SET = Stream.of(
            T_WebNav_Res_Down_Time_Start,
            T_WebNav_Res_Down_Time_Finish
    ).map(MaxyLogType::getDecimal).collect(Collectors.toUnmodifiableSet());

    // Web Page 코드 모음
    public static final Set<Integer> WEB_PAGE_TYPES_SET = Stream.of(
            T_WebNav_Start,
            T_Native_App_PageStart
    ).map(MaxyLogType::getDecimal).collect(Collectors.toUnmodifiableSet());

    // Session Replay Action 코드 모음
    public static final Set<Integer> S_REPLAY_TYPES_SET = Stream.of(
            T_WebNav_Start,
            T_Native_App_PageStart,
            T_WebNav_Click,
            T_Native_App_Start,
            T_WebNav_Error,
            T_WebNav_Java_Error,
            T_Custom_MAXY_Tagging_Error,
            T_Custom_MAXY_Tagging_Common,
            T_Native_Action_Error
    ).map(MaxyLogType::getDecimal).collect(Collectors.toUnmodifiableSet());

    // I/F 연동 코드 모음
    public static final Set<Integer> IF_TYPES_SET = Stream.of(
            T_WebNav_Error,
            T_WebNav_Java_Error,
            T_Http_Error,
            T_Custom_MAXY_Tagging_Error,
            T_Native_Action_Error,
            T_Http_Exception,
            T_XMLHttpRequest_Exception,
            T_XMLHttpRequest_Error,
            G_Native_Crash,
            T_WebNav_Start,
            T_WebNav_Click,
            T_Native_Action_Start,
            T_Native_App_Start,
            T_Native_App_Foreground,
            T_Native_App_Background,
            T_Custom_MAXY_Tagging_Common,
            T_Http_Request,
            T_Http_Response,
            T_XMLHttpRequest_Request,
            T_XMLHttpRequest_Response
    ).map(MaxyLogType::getDecimal).collect(Collectors.toUnmodifiableSet());

    // DireaIF ResMsg 미전송 코드 모음
    public static final Set<Integer> IF_DIREA_RESMSG_NOT_SEND_TYPES_SET = Stream.of(
            T_Http_Request,
            T_Http_Response,
            T_XMLHttpRequest_Request,
            T_XMLHttpRequest_Response
    ).map(MaxyLogType::getDecimal).collect(Collectors.toUnmodifiableSet());

    // Error Status Code Group 모음 반환
    public static final Set<String> ERROR_STATUS_CODE_GROUP_SET = Set.of("3xx", "4xx", "5xx");

    private final String group;
    private final String detail;
    private final String description;
    private final int hex;
    private final int decimal;

    // 필수값 여부
    private final boolean essentialYn;
    private final boolean appOnly;

    public static MaxyLogType findByLogType(int logType) {
        for (MaxyLogType value : values()) {
            if (value.decimal == logType) {
                return value;
            }
        }
        return null;
    }

    public static String findLogTypeGroupByLogType(int logType) {
        for (MaxyLogType value : values()) {
            if (value.decimal == logType) {
                return value.group;
            }
        }
        return null;
    }

    public static String findLogTypeDetailByLogType(int logType) {
        for (MaxyLogType value : values()) {
            if (value.decimal == logType) {
                return value.detail;
            }
        }
        return null;
    }

    public static List<Map<String, Object>> toList() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (MaxyLogType value : MaxyLogType.values()) {
            if (value.getDetail().isEmpty()) {
                continue;
            }
            Map<String, Object> tmp = new HashMap<>();
            tmp.put("group", value.getGroup());
            tmp.put("detail", value.getDetail());
//            tmp.put("description", value.getDescription());
            tmp.put("hex", String.format("0x%08X", value.getHex()));
            tmp.put("decimal", value.getDecimal());
            tmp.put("essentialYn", value.isEssentialYn());
            tmp.put("appOnly", value.isAppOnly());

            result.add(tmp);
        }
        return result;
    }

    public static Map<Integer, Object> toMap() {
        Map<Integer, Object> result = new HashMap<>();

        for (MaxyLogType value : MaxyLogType.values()) {
            if (value.getDetail().isEmpty()) {
                continue;
            }
            Map<String, String> tmp = new HashMap<>();
            tmp.put("group", value.getGroup());
            tmp.put("detail", value.getDetail());
            tmp.put("appOnly", value.isAppOnly() ? "Y" : "N");
            result.put(value.getDecimal(), tmp);
        }

        return result;
    }

    // 검색 조건에 따라 decimal List 반환
    public static List<String> findSearchLogType(String logClass, String logType) {
        List<String> result = new ArrayList<>();

        for (MaxyLogType value : MaxyLogType.values()) {
            if (value.getDetail().isEmpty()) {
                continue;
            }

            if (logClass.isEmpty()) {
                if (value.getDetail().equals(logType)) {
                    result.add(String.valueOf(value.getDecimal()));
                }
            } else if (logType.isEmpty()) {
                if (value.getGroup().equals(logClass)) {
                    result.add(String.valueOf(value.getDecimal()));
                }
            } else {
                if (value.getGroup().equals(logClass) && value.getDetail().equals(logType)) {
                    result.add(String.valueOf(value.getDecimal()));
                }
            }
        }

        return result;
    }

    public static String toJson() {
        return JsonUtil.toJson(toMap());
    }

    /**
     * 에러 타입 판단
     */
    public static boolean isErrorLog(int logType) {
        return ERROR_TYPES_SET.contains(logType);
    }

    /**
     * 크래시 타입 판단
     */
    public static boolean isCrashLog(int logType) {
        return CRASH_TYPES_SET.contains(logType);
    }

    /**
     * 네이티브 타입 판단
     */
    public static boolean isNative(int logType) {
        return NATIVE_TYPES_SET.contains(logType);
    }

    /**
     * I/F 연동 타입 판단
     */
    public static boolean isIfLogType(int logType) {
        return IF_TYPES_SET.contains(logType);
    }

    /**
     * DireaIF ResMsg 미전송 타입 판단
     */
    public static boolean isResMsgNotSendIfLogType(int logType) {
        return IF_DIREA_RESMSG_NOT_SEND_TYPES_SET.contains(logType);
    }

    /**
     * Web Perf 타입 판단
     */
    public static boolean isWebPerfLog(int logType) {
        return WEBPERF_TYPES_SET.contains(logType);
    }

    /**
     * Network 타입 판단
     */
    public static boolean isNetworkLog(int logType) {
        return NETWORK_TYPES_SET.contains(logType);
    }

    /**
     * Vital 타입 판단
     */
    public static boolean isVitalLog(int logType) {
        return VITAL_TYPES_SET.contains(logType);
    }

    /**
     * Access 타입 판단
     */
    public static boolean isAccessLog(int logType) {
        return ACCESS_TYPES_SET.contains(logType);
    }

    /**
     * Visit 타입 판단
     */
    public static boolean isVisitLog(int logType) {
        return VISIT_TYPES_SET.contains(logType);
    }

    /**
     * Session 타입 판단
     */
    public static boolean isSessionLog(int logType) {
        return S_REPLAY_TYPES_SET.contains(logType);
    }

    public boolean equalsByLogType(int logType) {
        return decimal == logType;
    }
}
