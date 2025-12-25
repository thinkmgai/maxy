package com.thinkm.maxy.service.app;

import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.code.MaxyLogType;
import com.thinkm.common.util.*;
import com.thinkm.maxy.mapper.ReportMapper;
import com.thinkm.maxy.mapper.ScheduledReportMapper;
import com.thinkm.maxy.repository.AppInfoRepository;
import com.thinkm.maxy.service.app.factory.ReportServiceQueryFactory;
import com.thinkm.maxy.service.app.helper.ReportServiceHelper;
import com.thinkm.maxy.service.common.MailService;
import com.thinkm.maxy.vo.LogRequestVO;
import com.thinkm.maxy.vo.MailVO;
import com.thinkm.maxy.vo.ReportVO;
import com.thinkm.maxy.vo.ReportVO.ReportColumn;
import com.thinkm.maxy.vo.ReportVO.ReportColumnType;
import com.thinkm.maxy.vo.ReportVO.ReportType;
import com.thinkm.maxy.vo.ScheduledMailVO;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentInformation;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.opensearch.action.search.MultiSearchRequest;
import org.opensearch.action.search.MultiSearchResponse;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.action.search.SearchResponse;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.search.aggregations.AggregationBuilders;
import org.opensearch.search.aggregations.bucket.composite.CompositeAggregation;
import org.opensearch.search.aggregations.bucket.composite.CompositeAggregationBuilder;
import org.opensearch.search.aggregations.bucket.composite.TermsValuesSourceBuilder;
import org.opensearch.search.builder.SearchSourceBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

import static com.thinkm.maxy.vo.ReportVO.ReportType.STATUS_INFO;

/**
 * 보고서 서비스
 */
@SuppressWarnings("unchecked")
@Slf4j
@Service
public class ReportService {

    private static final String TITLE = "MAXY Report";
    private static final int FONT_SIZE_16 = 16;
    private static final int FONT_SIZE_10 = 10;
    private static final float MARGIN = 20;
    private static final float ROW_HEIGHT = 20;
    private static final float LINE_GAP = 10;
    private static final String DEFAULT_FONT_PATH = "/font/Pretendard/ttf/Pretendard-Medium.ttf";
    private static final String BOLD_FONT_PATH = "/font/Pretendard/ttf/Pretendard-Bold.ttf";

    private final ElasticClient elasticClient;
    private final ReportMapper mapper;
    private final ScheduledReportMapper scheduledMapper;
    private final AppInfoRepository appInfoRepository;
    private final MailService mailService;

    private final ReportServiceHelper reportServiceHelper;

    private final NumberFormat numberFormat = NumberFormat.getNumberInstance(Locale.US);

    @Value("${maxy.userid-masking:false}")
    private boolean userIdMasking;

    public ReportService(ElasticClient elasticClient, ReportMapper mapper, ScheduledReportMapper scheduledMapper,
                         AppInfoRepository appInfoRepository, MailService mailService) {
        this.elasticClient = elasticClient;
        this.mapper = mapper;
        this.scheduledMapper = scheduledMapper;
        this.appInfoRepository = appInfoRepository;
        this.mailService = mailService;
        this.reportServiceHelper = new ReportServiceHelper(
                TITLE,
                FONT_SIZE_16,
                FONT_SIZE_10,
                MARGIN,
                ROW_HEIGHT,
                LINE_GAP,
                DEFAULT_FONT_PATH,
                BOLD_FONT_PATH);
    }

    private void makeSbStatusInfo(Map<String, Object> statusInfo, ReportVO vo, StringBuilder sb, String newLine) {
        String[] statusHeader = new String[]{
                "Division", "Install", "iOS", "Android",
                "DAU", "PV", "Revisit",
                "Login", "Sleep", "Stay",
                "Error", "Crash"
        };

        String[] statusHeaders = new String[]{
                "Status", "", "", "",
                "", "", "",
                "", "", "",
                "", vo.getLocale().equals("ko") ? "[단위: ms]" : vo.getLocale().equals("en") ? "[unit: ms]" : "[単位: ms]"
        };
        sb.append(String.join(",", statusHeaders)).append(newLine);
        sb.append(String.join(",", statusHeader)).append(newLine);

        Map<String, Object> basicMap = (Map<String, Object>) statusInfo.get("basicMap");
        Map<String, Object> avgMap = (Map<String, Object>) statusInfo.get("avgBasicMap");

        if (basicMap != null) {
            String installCnt = CommonUtil.formatNumber(numberFormat, basicMap.get("installCnt"));
            String ios = CommonUtil.formatNumber(numberFormat, basicMap.get("ios"));
            String android = CommonUtil.formatNumber(numberFormat, basicMap.get("android"));
            String dauCnt = CommonUtil.formatNumber(numberFormat, basicMap.get("dauCnt"));
            String pageviewCnt = CommonUtil.formatNumber(numberFormat, basicMap.get("pageviewCnt"));
            String revisitCnt = CommonUtil.formatNumber(numberFormat, basicMap.get("revisit"));
            String sleepCnt = CommonUtil.formatNumber(numberFormat, basicMap.get("sleepCnt"));
            String loginCnt = CommonUtil.formatNumber(numberFormat, basicMap.get("loginCnt"));
            String errorCnt = CommonUtil.formatNumber(numberFormat, basicMap.get("errorCnt"));
            String crashCnt = CommonUtil.formatNumber(numberFormat, basicMap.get("crashCnt"));

            String[] content = {
                    vo.getLocale().equals("ko") ? "전체" : (vo.getLocale().equals("en") ? "All" : "全体"),
                    installCnt,
                    Math.round(Double.parseDouble(ios)) + "%",
                    Math.round(Double.parseDouble(android)) + "%",
                    dauCnt,
                    pageviewCnt,
                    revisitCnt,
                    loginCnt,
                    sleepCnt,
                    "-",
                    errorCnt,
                    crashCnt,
            };

            trimCsvFormat(sb, content);
        }
        sb.append(newLine);

        if (avgMap != null) {
            String installCnt = CommonUtil.formatNumber(numberFormat, avgMap.get("installCnt"));
            String dauCnt = CommonUtil.formatNumber(numberFormat, avgMap.get("dauCnt"));
            String pageviewCnt = CommonUtil.formatNumber(numberFormat, avgMap.get("pageviewCnt"));
            String revisitCnt = CommonUtil.formatNumber(numberFormat, avgMap.get("revisit"));
            String sleepCnt = CommonUtil.formatNumber(numberFormat, avgMap.get("sleepCnt"));
            String loginCnt = CommonUtil.formatNumber(numberFormat, avgMap.get("loginCnt"));
            String errorCnt = CommonUtil.formatNumber(numberFormat, avgMap.get("errorCnt"));
            String crashCnt = CommonUtil.formatNumber(numberFormat, avgMap.get("crashCnt"));

            String[] content = {
                    vo.getLocale().equals("ko") ? "평균" : (vo.getLocale().equals("en") ? "Avg." : "平均"),
                    installCnt,
                    "-",
                    "-",
                    dauCnt,
                    pageviewCnt,
                    revisitCnt + "%",
                    loginCnt,
                    sleepCnt,
                    numberFormat.format(avgMap.get("totalStayTime")),
                    errorCnt,
                    crashCnt,
            };

            makeCsvFormat(newLine, sb, content);
        }
        sb.append(newLine);
    }

    private void makeSbTotalVerInfo(List<Map<String, Object>> totalVerInfo, ReportVO vo, StringBuilder sb,
                                    String newLine) {
        String[] totalVersionTitleHeader = {
                "App Summary", "", "",
                "", "", "",
                "", "", "",
                vo.getLocale().equals("ko") ? "[단위: ms]" : vo.getLocale().equals("en") ? "[unit: ms]" : "[単位: ms]"
        };

        sb.append(String.join(",", totalVersionTitleHeader)).append(newLine);

        String[] totalVersionHeader = {
                "OS", "Version", "DAU*",
                "PV*", "Loading Time*", "Response Time*",
                "CPU*", "MEM*", "Error",
                "Crash"
        };
        sb.append(String.join(",", totalVersionHeader)).append(newLine);
        for (Map<String, Object> item : totalVerInfo) {
            try {
                BigDecimal renderingTime = (BigDecimal) item.get("totalLoadingTime");
                Object totalResponseTime = item.get("totalResponseTime");
                double responseTime;
                if (totalResponseTime instanceof BigDecimal) {
                    responseTime = ((BigDecimal) totalResponseTime).doubleValue();
                } else {
                    responseTime = (double) totalResponseTime;
                }
                BigDecimal cpuUsage = (BigDecimal) item.get("avgCpuUsage");
                String memUsage = CommonUtil.convertMem("kb", item.get("avgMemUsage"));
                String renderingTimeResult = String.valueOf(Math.round(renderingTime.doubleValue()));

                String osType = (String) item.get("osType");
                String appVer = (String) item.get("appVer");
                String dauCnt = numberFormat.format(item.get("dauCnt"));
                String pageviewCnt = numberFormat.format(item.get("avgPageviewCnt"));
                String errorCnt = numberFormat.format(item.get("errorCnt") == null ? 0 : item.get("errorCnt"));
                String crashCnt = numberFormat.format(item.get("crashCnt") == null ? 0 : item.get("crashCnt"));

                String[] content = {
                        osType,
                        appVer,
                        dauCnt,
                        pageviewCnt,
                        renderingTimeResult,
                        String.valueOf(Math.round(responseTime)),
                        Math.round(cpuUsage.doubleValue()) + "%",
                        memUsage,
                        errorCnt,
                        crashCnt
                };

                makeCsvFormat(newLine, sb, content);
            } catch (Exception e) {
                log.error(e.getMessage(), e);
            }
        }
        sb.append(newLine);
    }

    private void makeSbRenderingSummary(List<Map<String, Object>> renderingSummary, ReportVO vo, StringBuilder sb,
                                        String newLine) {
        String[] performanceRenderingHeader = {
                "OS", "Version", "PV",
                "PV Rate", "MAX", "MED",
                "MIN"
        };

        String[] renderingHeader = {
                "Loading Time (Summary)", "", "",
                "", "", "",
                vo.getLocale().equals("ko") ? "[단위: ms]" : vo.getLocale().equals("en") ? "[unit: ms]" : "[単位: ms]"
        };

        sb.append(String.join(",", renderingHeader)).append(newLine);
        sb.append(String.join(",", performanceRenderingHeader)).append(newLine);
        for (Map<String, Object> item : renderingSummary) {
            try {
                BigDecimal maxRenderingtime = (BigDecimal) item.get("maxLoadingTime");
                BigDecimal medRenderingtime = (BigDecimal) item.get("medLoadingTime");
                BigDecimal minRenderingtime = (BigDecimal) item.get("minLoadingTime");
                BigDecimal pageViewCntRate = (BigDecimal) item.get("pageviewCntRate");
                String appVer = (String) item.get("appVer");
                String pageViewCntRateResult = pageViewCntRate.doubleValue() + "%";
                String renderingTimeResult1 = String.valueOf(Math.round(maxRenderingtime.doubleValue()));
                String renderingTimeResult2 = String.valueOf(Math.round(medRenderingtime.doubleValue()));
                String renderingTimeResult3 = String.valueOf(Math.round(minRenderingtime.doubleValue()));
                String[] content = {
                        String.valueOf(item.get("osType")),
                        appVer,
                        numberFormat.format(item.get("pageviewCnt")),
                        pageViewCntRateResult,
                        numberFormat.format(Long.parseLong(renderingTimeResult1)),
                        numberFormat.format(Long.parseLong(renderingTimeResult2)),
                        numberFormat.format(Long.parseLong(renderingTimeResult3)),
                };

                makeCsvFormat(newLine, sb, content);
            } catch (Exception e) {
                log.error(e.getMessage(), e);
            }
        }
        sb.append(newLine);
    }

    private void makeSbTopRendering(List<Map<String, Object>> topRendering, ReportVO vo, StringBuilder sb,
                                    String newLine, List<Map<String, Object>> deviceModelList) {
        String[] performanceRenderingTop10Header = {
                "OS", "Device", "User",
                "Rate", "MAX", "MED",
                "MIN"
        };

        String[] renderingTopHeader = {
                "Loading Time (Top 10)", "", "",
                "", "", "",
                vo.getLocale().equals("ko") ? "[단위: ms]" : vo.getLocale().equals("en") ? "[unit: ms]" : "[単位: ms]"
        };

        sb.append(String.join(",", renderingTopHeader)).append(newLine);
        sb.append(String.join(",", performanceRenderingTop10Header)).append(newLine);

        for (Map<String, Object> item : topRendering) {
            try {
                BigDecimal userRate = item.get("rate") != null ? (BigDecimal) item.get("rate") : BigDecimal.valueOf(0);
                String deviceModel = (String) item.get("deviceModel");
                String useCnt = numberFormat.format(item.get("useCnt"));
                String userRateString = userRate.setScale(2, RoundingMode.HALF_UP).toPlainString() + "%";
                String[] content = {
                        String.valueOf(item.get("osType")),
                        convertDeviceModel(deviceModelList, deviceModel, vo.getLocale()),
                        useCnt,
                        userRateString,
                        numberFormat.format(item.get("maxLoadingTime")),
                        numberFormat.format(item.get("medLoadingTime")),
                        numberFormat.format(item.get("minLoadingTime"))
                };

                makeCsvFormat(newLine, sb, content);
            } catch (Exception e) {
                log.error(e.getMessage(), e);
            }
        }
        sb.append(newLine);
    }

    private void makeSbResponseSummary(List<Map<String, Object>> responseSummary, ReportVO vo, StringBuilder sb,
                                       String newLine) {
        String[] responseHeader = {
                "Response Time (Summary)", "", "",
                "", "", "",
                vo.getLocale().equals("ko") ? "[단위: ms]" : vo.getLocale().equals("en") ? "[unit: ms]" : "[単位: ms]"
        };

        String[] performanceResponseHeader = {
                "OS", "Version", "Call",
                "Call Rate", "MAX", "AVG",
                "MIN"
        };

        sb.append(String.join(",", responseHeader)).append(newLine);
        sb.append(String.join(",", performanceResponseHeader)).append(newLine);

        for (Map<String, Object> item : responseSummary) {
            try {
                BigDecimal maxResponsetime = (BigDecimal) item.get("maxResponseTime");
                BigDecimal medResponsetime = (BigDecimal) item.get("medResponseTime");
                BigDecimal minResponsetime = (BigDecimal) item.get("minResponseTime");
                double responseCallRate = (double) item.get("responseCallRate");
                String appVer = (String) item.get("appVer");
                String responseCallRateResult = responseCallRate + "%";
                String responseTimeResult1 = String.valueOf(Math.round(maxResponsetime.doubleValue()));
                String responseTimeResult2 = String.valueOf(Math.round(medResponsetime.doubleValue()));
                String responseTimeResult3 = String.valueOf(Math.round(minResponsetime.doubleValue()));
                String[] content = {
                        String.valueOf(item.get("osType")),
                        appVer,
                        numberFormat.format(item.get("call")),
                        responseCallRateResult,
                        numberFormat.format(Long.parseLong(responseTimeResult1)),
                        numberFormat.format(Long.parseLong(responseTimeResult2)),
                        numberFormat.format(Long.parseLong(responseTimeResult3)),
                };

                makeCsvFormat(newLine, sb, content);
            } catch (Exception e) {
                log.error(e.getMessage(), e);
            }
        }
        sb.append(newLine);
    }

    private void makeSbTopResponse(List<Map<String, Object>> topResponse, ReportVO vo, StringBuilder sb, String newLine,
                                   List<Map<String, Object>> deviceModelList) {
        String[] responseTopHeader = {
                "Response Time (Top 10)", "", "",
                "", "", "",
                vo.getLocale().equals("ko") ? "[단위: ms]" : vo.getLocale().equals("en") ? "[unit: ms]" : "[単位: ms]"
        };
        String[] performanceResponseTop10Header = {
                "OS", "Device", "User",
                "Rate", "MAX", "AVG",
                "MIN"
        };

        sb.append(String.join(",", responseTopHeader)).append(newLine);
        sb.append(String.join(",", performanceResponseTop10Header)).append(newLine);

        for (Map<String, Object> item : topResponse) {
            try {
                BigDecimal userRate = item.get("rate") != null ? (BigDecimal) item.get("rate") : BigDecimal.valueOf(0);
                String deviceModel = (String) item.get("deviceModel");
                String useCnt = numberFormat.format(item.get("useCnt"));
                String userRateString = userRate.setScale(2, RoundingMode.HALF_UP).toPlainString() + "%";
                String[] content = {
                        String.valueOf(item.get("osType")),
                        convertDeviceModel(deviceModelList, deviceModel, vo.getLocale()),
                        useCnt,
                        userRateString,
                        numberFormat.format(item.get("maxResponseTime")),
                        numberFormat.format(item.get("medResponseTime")),
                        numberFormat.format(item.get("minResponseTime"))
                };

                makeCsvFormat(newLine, sb, content);
            } catch (Exception e) {
                log.error(e.getMessage(), e);
            }
        }
        sb.append(newLine);
    }

    private void makeSbPageViewInfo(List<Map<String, Object>> pageViewInfo, ReportVO vo, StringBuilder sb,
                                    String newLine, List<Map<String, Object>> pageList) {
        String[] pageViewHeader = {
                "Page View", "Page (or URL)", "Viewer",
                "Stay Time*", "Loading Time*", "Error",
                "Crash"
        };

        String[] pageViewHeaders = {
                "Page View (Top 10)", "",
                "", "", "",
                "", vo.getLocale().equals("ko") ? "[단위: ms]" : vo.getLocale().equals("en") ? "[unit: ms]" : "[単位: ms]"
        };

        sb.append(String.join(",", pageViewHeaders)).append(newLine);
        sb.append(String.join(",", pageViewHeader)).append(newLine);

        for (Map<String, Object> item : pageViewInfo) {
            try {
                BigDecimal maxResponsetime = (BigDecimal) item.get("totalStayTime");
                BigDecimal medResponsetime = (BigDecimal) item.get("totalLoadingTime");
                String renderingTimeResult1 = numberFormat.format(Math.round(maxResponsetime.doubleValue()));
                String renderingTimeResult2 = numberFormat.format(Math.round(medResponsetime.doubleValue()));
                String pageviewCnt = numberFormat.format(item.get("pageviewCnt"));
                String viewerCnt = numberFormat.format(item.get("viewerCnt"));
                String errorCnt = numberFormat.format(item.get("errorCnt") == null ? 0 : item.get("errorCnt"));
                String crashCnt = numberFormat.format(item.get("crashCnt") == null ? 0 : item.get("crashCnt"));
                String[] content = {
                        pageviewCnt,
                        convertPageNm(pageList, String.valueOf(item.get("reqUrl"))),
                        viewerCnt,
                        renderingTimeResult1,
                        renderingTimeResult2,
                        errorCnt,
                        crashCnt
                };

                makeCsvFormat(newLine, sb, content);
            } catch (Exception e) {
                log.error(e.getMessage(), e);
            }
        }
        sb.append(newLine);
    }

    private void makeSbErrorInfo(List<Map<String, Object>> errorInfo, StringBuilder sb, String newLine) {
        String[] errorHeader = {
                "Count", "Error", "Log Class",
                "Log Type", "Rate"
        };

        sb.append("Error (Top 10)").append(newLine);
        sb.append(String.join(",", errorHeader)).append(newLine);

        for (Map<String, Object> item : errorInfo) {
            try {
                String errorCnt = numberFormat.format(item.get("errorCnt"));
                String[] content = {
                        errorCnt,
                        String.valueOf(item.get("errorMsg")),
                        String.valueOf(item.get("logType")),
                        String.valueOf(item.get("logTypeDnm")),
                        Math.round(Double.parseDouble(String.valueOf(item.get("rate")))) + "%"
                };

                makeCsvFormat(newLine, sb, content);
            } catch (Exception e) {
                log.error(e.getMessage(), e);
            }
        }
        sb.append(newLine);
    }

    private void makeSbCrashInfo(List<Map<String, Object>> crashInfo, StringBuilder sb, String newLine) {
        String[] crashHeader = {
                "Count", "Crash Name", "Caused By", "Rate"
        };

        sb.append("Crash (Top 10)").append(newLine);
        sb.append(String.join(",", crashHeader)).append(newLine);

        for (Map<String, Object> item : crashInfo) {
            try {
                String crashCnt = numberFormat.format(item.get("crashCnt"));
                String[] content = {
                        crashCnt,
                        (String) item.get("crashNm"),
                        (String) item.get("causeBy"),
                        Math.round(Double.parseDouble(String.valueOf(item.get("rate")))) + "%"
                };

                makeCsvFormat(newLine, sb, content);
            } catch (Exception e) {
                log.error(e.getMessage(), e);
            }
        }
        sb.append(newLine);
    }

    private void makeSbDeviceErrorInfo(List<Map<String, Object>> deviceErrorInfo, ReportVO vo, StringBuilder sb, String newLine, List<Map<String, Object>> deviceModelList) {
        String[] top10ErrorHeader = {
                "Error(CT)", "Rate", "Device",
                "OS", "User", "Rate",
        };

        sb.append("Device Top 10 by Error").append(newLine);
        sb.append(String.join(",", top10ErrorHeader)).append(newLine);

        for (Map<String, Object> item : deviceErrorInfo) {
            try {
                String errorCnt = numberFormat.format(item.get("errorCnt"));
                String userCnt = numberFormat.format(item.get("userCnt"));
                String deviceModel = (String) item.get("deviceModel");
                BigDecimal userRate = (BigDecimal) item.get("userRate");
                String userRateString = userRate.setScale(1, RoundingMode.HALF_UP).toPlainString() + "%";
                String[] content = {
                        errorCnt,
                        Math.round(Double.parseDouble(String.valueOf(item.get("errorRate")))) + "%",
                        convertDeviceModel(deviceModelList, deviceModel, vo.getLocale()),
                        String.valueOf(item.get("osType")),
                        userCnt,
                        userRateString
                };

                makeCsvFormat(newLine, sb, content);
            } catch (Exception e) {
                log.error(e.getMessage(), e);
            }
        }
        sb.append(newLine);
    }

    private void makeSbDeviceCrashInfo(List<Map<String, Object>> deviceCrashInfo, ReportVO vo, StringBuilder sb, String newLine, List<Map<String, Object>> deviceModelList) {
        String[] top10CrashHeader = {
                "Crash(CT)", "Rate", "Device",
                "OS", "User", "Rate",
        };

        sb.append("Device Top 10 by Crash").append(newLine);
        sb.append(String.join(",", top10CrashHeader)).append(newLine);

        for (Map<String, Object> item : deviceCrashInfo) {
            try {
                String deviceModel = (String) item.get("deviceModel");
                String crashCnt = numberFormat.format(item.get("crashCnt"));
                String userCnt = numberFormat.format(item.get("userCnt"));
                BigDecimal userRate = (BigDecimal) item.get("userRate");
                String userRateString = userRate.setScale(1, RoundingMode.HALF_UP).toPlainString() + "%";
                String[] content = {
                        crashCnt,
                        Math.round(Double.parseDouble(String.valueOf(item.get("crashRate")))) + "%",
                        convertDeviceModel(deviceModelList, deviceModel, vo.getLocale()),
                        String.valueOf(item.get("osType")),
                        userCnt,
                        userRateString
                };

                makeCsvFormat(newLine, sb, content);
            } catch (Exception e) {
                log.error(e.getMessage(), e);
            }
        }
        sb.append(newLine);
    }

    private void makeSbNetworkErrorInfo(List<Map<String, Object>> infoList, StringBuilder sb, String newLine) {
        String[] headers = {
                "Count", "Error", "Log Class",
                "Log Type", "Com Type", "Rate"
        };

        sb.append("Error By Network (Top 10)").append(newLine);
        sb.append(String.join(",", headers)).append(newLine);

        for (Map<String, Object> item : infoList) {
            try {
                String errorCnt = numberFormat.format(item.get("errorCnt"));
                String[] content = {
                        errorCnt,
                        String.valueOf(item.get("errorMsg")),
                        String.valueOf(item.get("logType")),
                        String.valueOf(item.get("logTypeDnm")),
                        CommonUtil.convertComType(item.get("comType")),
                        Math.round(Double.parseDouble(String.valueOf(item.get("rate")))) + "%"
                };

                makeCsvFormat(newLine, sb, content);
            } catch (Exception e) {
                log.error(e.getMessage(), e);
            }
        }
        sb.append(newLine);
    }

    private void makeSbNetworkCrashInfo(List<Map<String, Object>> infoList, StringBuilder sb, String newLine) {
        String[] headers = {
                "Count", "Crash Name", "Cause By",
                "Com Type", "Rate"
        };

        sb.append("Crash By Network (Top 10)").append(newLine);
        sb.append(String.join(",", headers)).append(newLine);

        for (Map<String, Object> item : infoList) {
            try {
                String errorCnt = numberFormat.format(item.get("crashCnt"));
                String[] content = {
                        errorCnt,
                        String.valueOf(item.get("crashNm")),
                        String.valueOf(item.get("causeBy")),
                        CommonUtil.convertComType(item.get("comType")),
                        Math.round(Double.parseDouble(String.valueOf(item.get("rate")))) + "%"
                };

                makeCsvFormat(newLine, sb, content);
            } catch (Exception e) {
                log.error(e.getMessage(), e);
            }
        }
        sb.append(newLine);
    }

    private void makeSbFrontStatusInfo(List<Map<String, Object>> dataList, StringBuilder sb, String newLine) {
        String[] header = {
                "Base Date", "User Count", "Session Count",
                "Page Load Count", "Avg. Loading Time", "AJAX Count",
                "Avg. AJAX Response Time"
        };
        sb.append("Status Info").append(newLine);
        sb.append(String.join(",", header)).append(newLine);
        for (Map<String, Object> item : dataList) {
            try {
                String baseDate = (String) item.get("baseDate");
                String formatBaseDate = baseDate.substring(0, 4) + "-"
                        + baseDate.substring(4, 6) + "-"
                        + baseDate.substring(6, 8);
                String countUser = numberFormat.format(item.get("countUser") == null ? 0 : item.get("countUser"));
                String countSession = numberFormat.format(item.get("countSession") == null ? 0 : item.get("countSession"));
                String countPv = numberFormat.format(item.get("countPv") == null ? 0 : item.get("countPv"));
                String avgLoadingTime = numberFormat.format(item.get("avgLoadingTime") == null ? 0 : item.get("avgLoadingTime"));
                String countNetwork = numberFormat.format(item.get("countNetwork") == null ? 0 : item.get("countNetwork"));
                String avgIntervalTime = numberFormat.format(item.get("avgIntervalTime") == null ? 0 : item.get("avgIntervalTime"));

                String[] content = {
                        baseDate,
                        countUser,
                        countSession,
                        countPv,
                        avgLoadingTime + "ms",
                        countNetwork,
                        avgIntervalTime + "ms"
                };

                makeCsvFormat(newLine, sb, content);
            } catch (Exception e) {
                log.error(e.getMessage(), e);
            }
        }
        sb.append(newLine);
    }

    private void makeSbFrontBrowserPageLoadInfo(List<Map<String, Object>> dataList, StringBuilder sb, String newLine) {
        String[] header = {
                "No.", "Browser", "Count", "Avg. Loading Time"
        };
        sb.append("Top 10 Load pages by browser").append(newLine);
        sb.append(String.join(",", header)).append(newLine);

        int no = 1;
        for (Map<String, Object> item : dataList) {
            try {
                String deviceModel = (String) item.get("deviceModel");
                String countPv = numberFormat.format(item.get("countPv") == null ? 0 : item.get("countPv"));
                String avgLoadingTime = numberFormat.format(item.get("avgLoadingTime") == null ? 0 : item.get("avgLoadingTime"));

                String[] content = {
                        String.valueOf(no++),
                        deviceModel,
                        countPv,
                        avgLoadingTime + "ms"
                };

                makeCsvFormat(newLine, sb, content);
            } catch (Exception e) {
                log.error(e.getMessage(), e);
            }
        }
        sb.append(newLine);
    }

    private void makeSbFrontLocationPageLoadInfo(List<Map<String, Object>> dataList, ReportVO vo, StringBuilder sb, String newLine) {
        String[] header = {
                "No.", "Area name", "Count", "Avg. Loading Time"
        };
        sb.append("Top 10 Page Loads by Region").append(newLine);
        sb.append(String.join(",", header)).append(newLine);

        int no = 1;
        for (Map<String, Object> item : dataList) {
            try {
                String locationDesc = LocationUtil.getLocationName((String) item.get("locationCode"), LocationUtil.Language.valueOf(vo.getLocale().toUpperCase()));
                String countPv = numberFormat.format(item.get("countPv") == null ? 0 : item.get("countPv"));
                String avgLoadingTime = numberFormat.format(item.get("avgLoadingTime") == null ? 0 : item.get("avgLoadingTime"));

                String[] content = {
                        String.valueOf(no++),
                        locationDesc,
                        countPv,
                        avgLoadingTime + "ms"
                };

                makeCsvFormat(newLine, sb, content);
            } catch (Exception e) {
                log.error(e.getMessage(), e);
            }
        }
        sb.append(newLine);
    }

    private void makeSbFrontPageLoadTopInfo(List<Map<String, Object>> dataList, StringBuilder sb, String newLine) {
        String[] header = {
                "No.", "Page(or URL)", "Count", "Avg. Loading Time"
        };
        sb.append("Top 10 Page Load").append(newLine);
        sb.append(String.join(",", header)).append(newLine);

        int no = 1;
        for (Map<String, Object> item : dataList) {
            try {
                String reqUrl = (String) item.get("reqUrl");
                String countPv = numberFormat.format(item.get("countPv") == null ? 0 : item.get("countPv"));
                String avgLoadingTime = numberFormat.format(item.get("avgLoadingTime") == null ? 0 : item.get("avgLoadingTime"));

                String[] content = {
                        String.valueOf(no++),
                        reqUrl,
                        countPv,
                        avgLoadingTime + "ms"
                };

                makeCsvFormat(newLine, sb, content);
            } catch (Exception e) {
                log.error(e.getMessage(), e);
            }
        }
        sb.append(newLine);
    }

    private void makeSbFrontPageLoadWorstInfo(List<Map<String, Object>> dataList, StringBuilder sb, String newLine) {
        String[] header = {
                "No.", "Page(or URL)", "Count", "Avg. Loading Time"
        };
        sb.append("Worst 10 Load page by user").append(newLine);
        sb.append(String.join(",", header)).append(newLine);

        int no = 1;
        for (Map<String, Object> item : dataList) {
            try {
                String reqUrl = (String) item.get("reqUrl");
                String countPv = numberFormat.format(item.get("countPv") == null ? 0 : item.get("countPv"));
                String avgLoadingTime = numberFormat.format(item.get("avgLoadingTime") == null ? 0 : item.get("avgLoadingTime"));

                String[] content = {
                        String.valueOf(no++),
                        reqUrl,
                        countPv,
                        avgLoadingTime + "ms"
                };

                makeCsvFormat(newLine, sb, content);
            } catch (Exception e) {
                log.error(e.getMessage(), e);
            }
        }
        sb.append(newLine);
    }

    private void makeSbFrontLcpWorstInfo(List<Map<String, Object>> dataList, StringBuilder sb, String newLine) {
        String[] header = {
                "No.", "Avg. LCP", "Page(or URL)", "Count", "Avg. Loading Time"
        };
        sb.append("Worst 10 LCP").append(newLine);
        sb.append(String.join(",", header)).append(newLine);

        int no = 1;
        for (Map<String, Object> item : dataList) {
            try {
                String avgLcp = numberFormat.format(item.get("avgLcp") == null ? 0 : item.get("avgLcp"));
                String reqUrl = (String) item.get("reqUrl");
                String countPv = numberFormat.format(item.get("countPv") == null ? 0 : item.get("countPv"));
                String avgLoadingTime = numberFormat.format(item.get("avgLoadingTime") == null ? 0 : item.get("avgLoadingTime"));

                String[] content = {
                        String.valueOf(no++),
                        avgLcp + "ms",
                        reqUrl,
                        countPv,
                        avgLoadingTime + "ms"
                };

                makeCsvFormat(newLine, sb, content);
            } catch (Exception e) {
                log.error(e.getMessage(), e);
            }
        }
        sb.append(newLine);
    }

    private void makeSbFrontClsWorstInfo(List<Map<String, Object>> dataList, StringBuilder sb, String newLine) {
        String[] header = {
                "No.", "Avg. CLS", "Page(or URL)", "Count", "Avg. Loading Time"
        };
        sb.append("Worst 10 CLS").append(newLine);
        sb.append(String.join(",", header)).append(newLine);

        int no = 1;
        for (Map<String, Object> item : dataList) {
            try {
                String avgCls = numberFormat.format(item.get("avgCls") == null ? 0 : item.get("avgCls"));
                String reqUrl = (String) item.get("reqUrl");
                String countPv = numberFormat.format(item.get("countPv") == null ? 0 : item.get("countPv"));
                String avgLoadingTime = numberFormat.format(item.get("avgLoadingTime") == null ? 0 : item.get("avgLoadingTime"));

                String[] content = {
                        String.valueOf(no++),
                        avgCls,
                        reqUrl,
                        countPv,
                        avgLoadingTime + "ms"
                };

                makeCsvFormat(newLine, sb, content);
            } catch (Exception e) {
                log.error(e.getMessage(), e);
            }
        }
        sb.append(newLine);
    }

    private void makeSbFrontInpWorstInfo(List<Map<String, Object>> dataList, StringBuilder sb, String newLine) {
        String[] header = {
                "No.", "Avg. INP", "Page(or URL)", "Count", "Avg. Loading Time"
        };
        sb.append("Worst 10 INP").append(newLine);
        sb.append(String.join(",", header)).append(newLine);

        int no = 1;
        for (Map<String, Object> item : dataList) {
            try {
                String avgInp = numberFormat.format(item.get("avgInp") == null ? 0 : item.get("avgInp"));
                String reqUrl = (String) item.get("reqUrl");
                String countPv = numberFormat.format(item.get("countPv") == null ? 0 : item.get("countPv"));
                String avgLoadingTime = numberFormat.format(item.get("avgLoadingTime") == null ? 0 : item.get("avgLoadingTime"));

                String[] content = {
                        String.valueOf(no++),
                        avgInp + "ms",
                        reqUrl,
                        countPv,
                        avgLoadingTime + "ms"
                };

                makeCsvFormat(newLine, sb, content);
            } catch (Exception e) {
                log.error(e.getMessage(), e);
            }
        }
        sb.append(newLine);
    }

    private void makeSbFrontErrorPageInfo(List<Map<String, Object>> dataList, StringBuilder sb, String newLine) {
        String[] header = {
                "No.", "Page(or URL)", "Error Count"
        };
        sb.append("Top 10 Number of errors per page").append(newLine);
        sb.append(String.join(",", header)).append(newLine);

        int no = 1;
        for (Map<String, Object> item : dataList) {
            try {
                String reqUrl = (String) item.get("reqUrl");
                String countError = numberFormat.format(item.get("countError") == null ? 0 : item.get("countError"));

                String[] content = {
                        String.valueOf(no++),
                        reqUrl,
                        countError
                };

                makeCsvFormat(newLine, sb, content);
            } catch (Exception e) {
                log.error(e.getMessage(), e);
            }
        }
        sb.append(newLine);
    }

    private void makeSbFrontErrorMsgInfo(List<Map<String, Object>> dataList, StringBuilder sb, String newLine) {
        String[] header = {
                "No.", "Error Msg.", "Error Count"
        };
        sb.append("Top 10 Error Message").append(newLine);
        sb.append(String.join(",", header)).append(newLine);

        int no = 1;
        for (Map<String, Object> item : dataList) {
            try {
                String resMsg = (String) item.get("resMsg");
                String countError = numberFormat.format(item.get("countError") == null ? 0 : item.get("countError"));

                String[] content = {
                        String.valueOf(no++),
                        resMsg,
                        countError
                };

                makeCsvFormat(newLine, sb, content);
            } catch (Exception e) {
                log.error(e.getMessage(), e);
            }
        }
        sb.append(newLine);
    }

    private void makeSbFrontErrorNetworkInfo(List<Map<String, Object>> dataList, StringBuilder sb, String newLine) {
        String[] header = {
                "No.", "Error Msg.", "Error Count"
        };
        sb.append("Top 10 AJAX Error").append(newLine);
        sb.append(String.join(",", header)).append(newLine);

        int no = 1;
        for (Map<String, Object> item : dataList) {
            try {
                String resMsg = (String) item.get("resMsg");
                String countError = numberFormat.format(item.get("countError") == null ? 0 : item.get("countError"));

                String[] content = {
                        String.valueOf(no++),
                        resMsg,
                        countError
                };

                makeCsvFormat(newLine, sb, content);
            } catch (Exception e) {
                log.error(e.getMessage(), e);
            }
        }
        sb.append(newLine);
    }

    public void downloadReportData(Map<String, Object> reportData, HttpServletRequest request, HttpServletResponse response, ReportVO vo) {

        List<Map<String, Object>> deviceModelList = mapper.selectDeviceModelList();
        List<Map<String, Object>> pageList = mapper.selectPageList(vo);
        String newLine = System.lineSeparator();
        StringBuilder sb = new StringBuilder();

        try (OutputStream outputStream = response.getOutputStream()) {
            outputStream.write(0xEF);
            outputStream.write(0xBB);
            outputStream.write(0xBF);
            SimpleDateFormat fileSDf = new SimpleDateFormat("yyMMddhhmmss");
            Date date = new Date();
            String fileDate = fileSDf.format(date.getTime());
            String fileName = "ReportData_" + fileDate + ".csv";
            String userAgent = request.getHeader("user-agent");

            if (!fileName.contains(".csv") || userAgent.contains("Macintosh")) {
                fileName = URLEncoder.encode(fileName, StandardCharsets.UTF_8);
            } else {
                fileName = new String(
                        fileName.getBytes("euc-kr"), StandardCharsets.ISO_8859_1);
            }

            String[] typeList = vo.getReportType().split(","); // 보여줘야할 리포트 정보 유형
            for (String type : typeList) {
                switch (ReportType.fromType(type)) {
                    case STATUS_INFO -> // 상태 정보
                            makeSbStatusInfo((Map<String, Object>) reportData.get(type), vo, sb, newLine);
                    case VERSION_SUMMARY -> // App 버전별 통계
                            makeSbTotalVerInfo((List<Map<String, Object>>) reportData.get(type), vo, sb, newLine);
                    case LOADING_SUMMARY -> // Performance - Loading Time (Summary)
                            makeSbRenderingSummary((List<Map<String, Object>>) reportData.get(type), vo, sb, newLine);
                    case LOADING_10 -> // Performance - Loading Time (Top 10)
                            makeSbTopRendering((List<Map<String, Object>>) reportData.get(type), vo, sb, newLine, deviceModelList);
                    case RESPONSE_SUMMARY -> // Performance - Response Time (Summary)
                            makeSbResponseSummary((List<Map<String, Object>>) reportData.get(type), vo, sb, newLine);
                    case RESPONSE_10 -> // Performance - Response Time (Top 10)
                            makeSbTopResponse((List<Map<String, Object>>) reportData.get(type), vo, sb, newLine, deviceModelList);
                    case PAGEVIEW_INFO -> // Performance - Page View (Top 10)
                            makeSbPageViewInfo((List<Map<String, Object>>) reportData.get(type), vo, sb, newLine, pageList);
                    case ERROR_INFO -> // Performance - Error (Top 10)
                            makeSbErrorInfo((List<Map<String, Object>>) reportData.get(type), sb, newLine);
                    case CRASH_INFO -> // Performance - Crash (Top 10)
                            makeSbCrashInfo((List<Map<String, Object>>) reportData.get(type), sb, newLine);
                    case TOP10_DEVICE_ERROR_INFO -> // Performance - Device Error Info (Top 10)
                            makeSbDeviceErrorInfo((List<Map<String, Object>>) reportData.get(type), vo, sb, newLine, deviceModelList);
                    case TOP10_DEVICE_CRASH_INFO -> // Performance - Device Crash Info (Top 10)
                            makeSbDeviceCrashInfo((List<Map<String, Object>>) reportData.get(type), vo, sb, newLine, deviceModelList);
                    case NETWORK_ERROR_INFO ->
                            makeSbNetworkErrorInfo((List<Map<String, Object>>) reportData.get(type), sb, newLine);
                    case NETWORK_CRASH_INFO ->
                            makeSbNetworkCrashInfo((List<Map<String, Object>>) reportData.get(type), sb, newLine);
                    case F_STATUS_INFO ->
                            makeSbFrontStatusInfo((List<Map<String, Object>>) reportData.get(type), sb, newLine);
                    case F_BROWSER_10 ->
                            makeSbFrontBrowserPageLoadInfo((List<Map<String, Object>>) reportData.get(type), sb, newLine);
                    case F_LOCATION_10 ->
                            makeSbFrontLocationPageLoadInfo((List<Map<String, Object>>) reportData.get(type), vo, sb, newLine);
                    case F_PAGE_LOAD_10 ->
                            makeSbFrontPageLoadTopInfo((List<Map<String, Object>>) reportData.get(type), sb, newLine);
                    case F_PAGE_LOAD_WORST_10 ->
                            makeSbFrontPageLoadWorstInfo((List<Map<String, Object>>) reportData.get(type), sb, newLine);
                    case F_LCP_WORST_10 ->
                            makeSbFrontLcpWorstInfo((List<Map<String, Object>>) reportData.get(type), sb, newLine);
                    case F_CLS_WORST_10 ->
                            makeSbFrontClsWorstInfo((List<Map<String, Object>>) reportData.get(type), sb, newLine);
                    case F_INP_WORST_10 ->
                            makeSbFrontInpWorstInfo((List<Map<String, Object>>) reportData.get(type), sb, newLine);
                    case F_ERROR_PAGE_10 ->
                            makeSbFrontErrorPageInfo((List<Map<String, Object>>) reportData.get(type), sb, newLine);
                    case F_ERROR_MSG_10 ->
                            makeSbFrontErrorMsgInfo((List<Map<String, Object>>) reportData.get(type), sb, newLine);
                    case F_ERROR_NET_10 ->
                            makeSbFrontErrorNetworkInfo((List<Map<String, Object>>) reportData.get(type), sb, newLine);

                }
            }

            response.setContentType("text/csv");
            response.setHeader("Content-type", "text/csv; charset=UTF-8");
            response.setHeader("Content-Disposition", "attachment; filename=" + fileName);

            outputStream.write(sb.toString().getBytes(StandardCharsets.UTF_8));
            outputStream.flush();
            sb.setLength(0);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
    }

    private void trimCsvFormat(StringBuilder sb, String[] content) {
        for (int i = 0; i < content.length; i++) {
            if (content[i].contains(",") || content[i].contains("\n")) {
                content[i] = "\"" + content[i].replace("\"", "\"\"") + "\"";
            }
        }

        sb.append(String.join(",", content));
    }

    public void downloadErrorCrashReportData(ReportVO vo, Map<String, List<Map<String, Object>>> info,
                                             HttpServletRequest request,
                                             HttpServletResponse response) {
        String packageNm = vo.getPackageNm();
        String serverType = vo.getServerType();
        String appName = appInfoRepository.get(packageNm, serverType);

        String newLine = System.lineSeparator();
        StringBuilder sb = new StringBuilder();
        String[] statusHeader = {
                "구분", "발생건수", "요청번호", "담당팀명", "오류채널",
                "앱종류", "앱버전", "로그종류", "로그유형",
                "오류내용", "USER ID", "발생일", "발생시간"
        };
        sb.append(String.join(",", statusHeader)).append(newLine);

        try (OutputStream outputStream = response.getOutputStream()) {
            SimpleDateFormat fileSDf = new SimpleDateFormat("yyMMddhhmmss");
            Date date = new Date();
            String fileDate = fileSDf.format(date.getTime());
            String fileName = "ReportErrorCrashData_" + fileDate + ".csv";
            String userAgent = request.getHeader("user-agent");

            if (!fileName.contains(".csv") || userAgent.contains("Macintosh")) {
                fileName = URLEncoder.encode(fileName, StandardCharsets.UTF_8);
            } else {
                fileName = new String(
                        fileName.getBytes("euc-kr"), StandardCharsets.ISO_8859_1);
            }
            int maxErrorIndex = Math.min(info.get("error").size(), 50);
            for (int i = 0; i < maxErrorIndex; i++) {
                Map<String, Object> item = info.get("error").get(i);
                int logType = (int) item.get("logType");
                long logTm = (long) item.get("logTm");
                String userId = (String) item.get("userId.raw");
                userId = CommonUtil.maskUserId(userId, userIdMasking, 2);
                String[] contents = {
                        "Error",
                        numberFormat.format(item.get("count")),
                        String.valueOf(i + 1),
                        "",
                        appName,
                        String.valueOf(item.get("osType")),
                        String.valueOf(item.get("appVer")),
                        MaxyLogType.findLogTypeGroupByLogType(logType),
                        MaxyLogType.findLogTypeDetailByLogType(logType),
                        String.valueOf(item.get("resMsg.raw")),
                        userId,
                        DateUtil.timestampToDate(logTm, "yyyyMMdd"),
                        DateUtil.timestampToDate(logTm, "HH:mm:ss"),
                };

                makeCsvFormat(newLine, sb, contents);
            }

            int maxCrashIndex = Math.min(info.get("crash").size(), 50);
            for (int i = 0; i < maxCrashIndex; i++) {
                Map<String, Object> item = info.get("crash").get(i);
                int logType = (int) item.get("logType");
                long logTm = (long) item.get("logTm");
                String userId = (String) item.get("userId.raw");
                userId = CommonUtil.maskUserId(userId, userIdMasking, 2);
                String[] contents = {
                        "Crash",
                        String.valueOf(item.get("count")),
                        String.valueOf(i + 1),
                        "",
                        appName,
                        String.valueOf(item.get("osType")),
                        String.valueOf(item.get("appVer")),
                        MaxyLogType.findLogTypeGroupByLogType(logType),
                        MaxyLogType.findLogTypeDetailByLogType(logType),
                        String.valueOf(item.get("contents.occur.raw")),
                        userId,
                        DateUtil.timestampToDate(logTm, "yyyyMMdd"),
                        DateUtil.timestampToDate(logTm, "HH:mm:ss"),
                };
                makeCsvFormat(newLine, sb, contents);
            }

            CommonUtil.writeCsvFile(response, sb, outputStream, fileName, userAgent);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
    }

    private void makeCsvFormat(String newLine, StringBuilder sb, String[] contents) {
        trimCsvFormat(sb, contents);
        sb.append(newLine);
    }

    /**
     * 다운로드 할 에러/크래시 로그 목록
     *
     * @param params packageNm, serverType
     * @return 에러/크래시 별 로그 목록
     */
    public Map<String, List<Map<String, Object>>> getTroubleLogList(ReportVO params) {
        LogRequestVO vo = LogRequestVO.of(params);
        BoolQueryBuilder errorBoolQuery = ReportServiceQueryFactory.createTroubleLogBoolQuery(vo);
        BoolQueryBuilder crashBoolQuery = ReportServiceQueryFactory.createTroubleLogBoolQuery(vo);

        Elastic.errorBuilder(errorBoolQuery);
        Elastic.crashBuilder(crashBoolQuery);

        // error 전용 composite 쿼리
        CompositeAggregationBuilder errorCompositeAggs = AggregationBuilders.composite(Elastic.RES,
                Arrays.asList(
                        new TermsValuesSourceBuilder(Elastic.resMsg_raw).field(Elastic.resMsg_raw),
                        new TermsValuesSourceBuilder(Elastic.osType).field(Elastic.osType),
                        new TermsValuesSourceBuilder(Elastic.logType).field(Elastic.logType),
                        new TermsValuesSourceBuilder(Elastic.appVer).field(Elastic.appVer),
                        new TermsValuesSourceBuilder(Elastic.logTm).field(Elastic.logTm),
                        new TermsValuesSourceBuilder(Elastic.userId_raw).field(Elastic.userId_raw)
                )
        ).size(1000);

        // crash 전용 composite 쿼리
        CompositeAggregationBuilder crashCompositeAggs = AggregationBuilders.composite(Elastic.RES,
                Arrays.asList(
                        new TermsValuesSourceBuilder(Elastic.contents_occur_raw).field(Elastic.contents_occur_raw),
                        new TermsValuesSourceBuilder(Elastic.osType).field(Elastic.osType),
                        new TermsValuesSourceBuilder(Elastic.logType).field(Elastic.logType),
                        new TermsValuesSourceBuilder(Elastic.appVer).field(Elastic.appVer),
                        new TermsValuesSourceBuilder(Elastic.logTm).field(Elastic.logTm),
                        new TermsValuesSourceBuilder(Elastic.userId_raw).field(Elastic.userId_raw)
                )
        ).size(1000);

        SearchSourceBuilder errorSourceBuilder = new SearchSourceBuilder()
                .query(errorBoolQuery)
                .aggregation(errorCompositeAggs)
                .size(0);
        SearchSourceBuilder crashSourceBuilder = new SearchSourceBuilder()
                .query(crashBoolQuery)
                .aggregation(crashCompositeAggs)
                .size(0);

        SearchRequest errorSearchRequest = new SearchRequest(ElasticIndex.TROUBLE_LOG.getIndex() + "*")
                .source(errorSourceBuilder);
        SearchRequest crashSearchRequest = new SearchRequest(ElasticIndex.TROUBLE_LOG.getIndex() + "*")
                .source(crashSourceBuilder);

        log.debug(errorSearchRequest.toString());
        log.debug(crashSearchRequest.toString());

        MultiSearchRequest multiSearchRequest = new MultiSearchRequest()
                .add(errorSearchRequest)
                .add(crashSearchRequest);

        List<List<Map<String, Object>>> resultList = new ArrayList<>();
        Map<String, List<Map<String, Object>>> result = new HashMap<>();

        try {
            MultiSearchResponse multiSearchResponse = elasticClient.get(multiSearchRequest);
            for (MultiSearchResponse.Item item : multiSearchResponse) {
                SearchResponse response = item.getResponse();
                List<Map<String, Object>> tmpList = new ArrayList<>();
                try {
                    if (response == null) {
                        resultList.add(Collections.emptyList());
                        continue;
                    }
                    CompositeAggregation aggs = response.getAggregations().get(Elastic.RES);
                    for (CompositeAggregation.Bucket bucket : aggs.getBuckets()) {
                        Map<String, Object> key = bucket.getKey();
                        key.put("count", bucket.getDocCount());
                        tmpList.add(key);
                    }
                } catch (Exception e) {
                    log.error(e.getMessage(), e);
                }
                resultList.add(tmpList);
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        result.put("error", resultList.get(0));
        result.put("crash", resultList.get(1));

        return result;
    }

    public Map<String, Object> getStatusInfoDB(ReportVO vo) {
        vo.setFromMonth(DateUtil.timestampToDate(Long.valueOf(vo.getSearchFromDt()), "yyyyMM"));
        vo.setToMonth(DateUtil.timestampToDate(Long.valueOf(vo.getSearchToDt()), "yyyyMM"));
        Map<String, Object> result = new HashMap<>();

        Map<String, Object> basicMap = mapper.getStatusInfo(vo);
        Map<String, Object> avgBasicMap = mapper.getAvgStatusInfo(vo);

        result.put("basicMap", basicMap);
        result.put("avgBasicMap", avgBasicMap);

        return result;
    }

    public List<Map<String, Object>> getTotalVersionInfoDB(ReportVO vo) {
        // 버전 별 통계
        return mapper.getAppVerSummary(vo);
    }

    public List<Map<String, Object>> getRenderingSummaryDB(ReportVO vo) {
        // 사용성 분석 (페이지 로딩 시간)
        List<Map<String, Object>> summaryList = mapper.getLoadingSummary(vo);
        // 사용자 분석 - 페이지 뷰, 페이지 뷰 비율
        List<Map<String, Object>> pageViewList = mapper.getPerformancePageViewCnt(vo);
        List<Map<String, Object>> result = new ArrayList<>();

        for (Map<String, Object> summary : summaryList) {
            for (Map<String, Object> pageView : pageViewList) {
                Map<String, Object> tmp = new HashMap<>();
                if (summary.get("appVer").equals(pageView.get("appVer")) && summary.get("osType").equals(pageView.get("osType"))) {
                    tmp.put("osType", summary.get("osType"));
                    tmp.put("appVer", summary.get("appVer"));
                    if (pageView.get("pageviewCnt") == null) {
                        tmp.put("pageviewCnt", 0);
                    } else {
                        tmp.put("pageviewCnt", pageView.get("pageviewCnt"));
                    }

                    if (pageView.get("pageviewCntRate") == null) {
                        tmp.put("pageviewCntRate", 0);
                    } else {
                        tmp.put("pageviewCntRate", pageView.get("pageviewCntRate"));
                    }
                    tmp.put("maxLoadingTime", summary.get("maxLoadingTime"));
                    tmp.put("medLoadingTime", summary.get("medLoadingTime"));
                    tmp.put("minLoadingTime", summary.get("minLoadingTime"));

                    result.add(tmp);
                }
            }
        }
        return result;
    }

    public List<Map<String, Object>> getRenderingTop(ReportVO vo) {
        return mapper.getLoadingTop(vo);
    }

    public List<Map<String, Object>> getResponseSummaryDB(ReportVO vo) {
        List<Map<String, Object>> summaryList = mapper.getResponseSummary(vo);
        List<Map<String, Object>> responseTimeCallList = mapper.selectCallList(vo);

        List<Map<String, Object>> result = new ArrayList<>();

        long totalCallCnt = 0L;

        for (Map<String, Object> r : responseTimeCallList) {
            BigDecimal callCnt = (BigDecimal) r.get("callCnt");
            long callResult = callCnt.longValue();
            totalCallCnt += callResult;
        }

        for (Map<String, Object> summary : summaryList) {
            for (Map<String, Object> call : responseTimeCallList) {
                Map<String, Object> tmp = new HashMap<>();
                if (summary.get("appVer").equals(call.get("appVer")) && summary.get("osType").equals(call.get("osType"))) {
                    tmp.put("osType", summary.get("osType"));
                    tmp.put("appVer", summary.get("appVer"));
                    if (call.get("callCnt") == null) {
                        tmp.put("call", 0);
                    } else {
                        tmp.put("call", call.get("callCnt"));
                    }
                    BigDecimal callCnt = (BigDecimal) call.get("callCnt");
                    long callResult = callCnt.longValue();

                    double percentage = ((double) callResult / totalCallCnt) * 100;

                    tmp.put("responseCallRate", percentage);
                    tmp.put("maxResponseTime", summary.get("maxResponseTime"));
                    tmp.put("medResponseTime", summary.get("medResponseTime"));
                    tmp.put("minResponseTime", summary.get("minResponseTime"));

                    result.add(tmp);
                }
            }
        }
        return result;
    }

    public List<Map<String, Object>> getResponseTop(ReportVO vo) {
        // 장치 별 페이지 로딩 시간
        return mapper.getResponseTop(vo);
    }

    public List<Map<String, Object>> getPageViewInfoDB(ReportVO vo) {
        // Page View
        return mapper.getPageViewInfoDB(vo);
    }

    public List<Map<String, Object>> getErrorInfo(ReportVO vo) {
        List<Map<String, Object>> result = new ArrayList<>();
        // Error 목록
        List<Map<String, Object>> errorList = mapper.getErrorInfo(vo);
        for (Map<String, Object> e : errorList) {
            Map<String, Object> tmp = new HashMap<>();
            tmp.put("errorCnt", e.get("errorCnt"));
            tmp.put("errorMsg", e.get("errorMsg"));
            tmp.put("logType", e.get("logTypeNm"));
            tmp.put("logTypeDnm", e.get("logTypeDnm"));
            tmp.put("rate", e.get("rate"));

            result.add(tmp);
        }
        return result;
    }

    public List<Map<String, Object>> getCrashInfo(ReportVO vo) {
        // Crash 목록
        return mapper.getCrashInfo(vo);
    }

    public List<Map<String, Object>> deviceErrorInfo(ReportVO vo) {
        // 장치 별 Error
        return mapper.getDeviceErrorInfo(vo);
    }

    public List<Map<String, Object>> deviceCrashInfo(ReportVO vo) {
        // 장치 별 Crash
        return mapper.getDeviceCrashInfo(vo);
    }

    /**
     * 네트워크 에러 정보를 조회합니다.
     * maxy_report_network_error 테이블에서 네트워크 타입별 에러 정보를 가져옵니다.
     *
     * @param vo 리포트 요청 정보를 담은 VO 객체
     * @return 네트워크 에러 정보 리스트
     */
    public List<Map<String, Object>> getNetworkErrorInfo(ReportVO vo) {
        // 네트워크 에러 목록 조회
        return mapper.getNetworkErrorInfo(vo);
    }

    /**
     * 네트워크 크래시 정보를 조회합니다.
     * maxy_report_network_crash 테이블에서 네트워크 타입별 크래시 정보를 가져옵니다.
     *
     * @param vo 리포트 요청 정보를 담은 VO 객체
     * @return 네트워크 크래시 정보 리스트
     */
    public List<Map<String, Object>> getNetworkCrashInfo(ReportVO vo) {
        // 네트워크 크래시 목록 조회
        return mapper.getNetworkCrashInfo(vo);
    }

    public String convertDeviceModel(List<Map<String, Object>> deviceModelList, String str, String lang) {
        String result = "";

        for (Map<String, Object> d : deviceModelList) {
            if (str.equals(d.get("deviceModel"))) {
                if (lang.equals("ko")) {
                    result = (String) d.get("nameKo");
                } else if (lang.equals("en")) {
                    result = (String) d.get("nameEn");
                }
            }
        }

        // 매칭되는 모델명이 없으면 원본 모델명 그대로 반환
        if ("".equals(result)) {
            result = str;
        }

        return result;
    }

    private String convertPageNm(List<Map<String, Object>> pageList, String str) {
        String result = str;

        for (Map<String, Object> p : pageList) {
            if (str.equals(p.get("reqUrl"))) {
                result = (String) p.get("appPageNm");
                break;
            }
        }

        if (result == null || result.isEmpty()) {
            result = str;
        }

        return result;
    }

    public Map<String, List<Map<String, Object>>> getReportType(ReportVO vo) {
        ReportType[] reportTypes = ReportType.getReportTypesByAppType(vo.getAppType());
        List<Map<String, Object>> tmpList = new ArrayList<>();

        for (ReportType reportType : reportTypes) {
            Map<String, Object> map = new HashMap<>();
            map.put("type", reportType.getType());
            map.put("group", reportType.getGroup());
            map.put("name", reportType.getName());
            tmpList.add(map);
        }

        return tmpList.stream()
                .filter(map -> map.containsKey("group"))
                .collect(Collectors.groupingBy(map -> (String) map.get("group")));
    }

    /**
     * 리포트 데이터를 기반으로 PDF 파일을 생성하여 ByteArrayOutputStream으로 반환
     * 테이블 내용이 페이지 범위를 벗어나는 경우 자동으로 새 페이지를 생성하여 내용을 이어서 표시합니다.
     * 이를 통해 테이블의 행이 많거나 행 높이가 높아 페이지 범위를 넘어가는 경우에도 모든 데이터가 정상적으로 표시됩니다.
     *
     * @param vo 리포트 요청 정보를 담은 VO 객체
     * @return PDF 파일이 저장된 ByteArrayOutputStream
     * @throws IOException 파일 처리 중 오류 발생 시
     */
    public ByteArrayOutputStream createPdfReport(ReportVO vo) throws IOException {
        List<Map<String, Object>> deviceModelList = mapper.selectDeviceModelList();

        // 대용량 보고서 처리를 위한 버퍼 크기 설정
        int bufferSize = 8192;

        // PDF를 메모리에 생성하기 위한 ByteArrayOutputStream
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream(bufferSize);

        try (PDDocument document = new PDDocument()) {
            // PDF 문서 생성

            // PDF 리더 타이틀 지정
            PDDocumentInformation info = new PDDocumentInformation();
            info.setTitle(TITLE);
            document.setDocumentInformation(info);

            // 기본 폰트와 볼드 폰트 로드
            PDType0Font baseFont;
            PDType0Font boldFont;

            try {
                baseFont = loadFont(document, DEFAULT_FONT_PATH);
                boldFont = loadFont(document, BOLD_FONT_PATH);
            } catch (IOException e) {
                log.error("PDF 생성에 필요한 폰트를 로드할 수 없습니다: {}", e.getMessage());
                throw new IOException("PDF 생성에 필요한 폰트를 로드할 수 없습니다", e);
            }

            String[] typeList = vo.getReportType().split(","); // 보여줘야할 리포트 정보 유형
            String dataSubTitle = ""; // 리포트 정보 유형 제목

            // 리포트 정보 유형 별로 PDF 페이지 생성
            for (String type : typeList) {
                Map<String, Object> mapData = new HashMap<>(); // 리포트 정보 유형 데이터 타입이 Map
                List<Map<String, Object>> listData = new ArrayList<>(); // 리포트 정보 유형 데이터 타입이 List
                List<Map<String, Object>> columnList = new ArrayList<>(); // 데이터 컬럼 리스트

                ReportType reportType = ReportType.fromType(type);
                dataSubTitle = reportType.getName();

                switch (reportType) {
                    case STATUS_INFO -> { // 상태 정보
                        mapData = getStatusInfoDB(vo);
                    }
                    case VERSION_SUMMARY -> { // App 버전별 통계
                        columnList = ReportColumn.getVersionSummary();
                        listData = getTotalVersionInfoDB(vo);
                    }
                    case LOADING_SUMMARY -> { // Performance - Loading Time (Summary)
                        columnList = ReportColumn.getLoadingSummary();
                        listData = getRenderingSummaryDB(vo);
                    }
                    case LOADING_10 -> { // Performance - Loading Time (Top 10)
                        columnList = ReportColumn.getLoading10();
                        listData = getRenderingTop(vo);
                        for (Map<String, Object> item : listData) {
                            String deviceModel = convertDeviceModel(deviceModelList, (String) item.get("deviceModel"), vo.getLocale());
                            item.put("deviceModel", deviceModel);
                        }
                    }
                    case RESPONSE_SUMMARY -> { // Performance - Response Time (Summary)
                        columnList = ReportColumn.getResponseSummary();
                        listData = getResponseSummaryDB(vo);
                    }
                    case RESPONSE_10 -> { // Performance - Response Time (Top 10)
                        columnList = ReportColumn.getResponse10();
                        listData = getResponseTop(vo);
                        for (Map<String, Object> item : listData) {
                            String deviceModel = convertDeviceModel(deviceModelList, (String) item.get("deviceModel"), vo.getLocale());
                            item.put("deviceModel", deviceModel);
                        }
                    }
                    case PAGEVIEW_INFO -> {  // Performance - Page View (Top 10)
                        columnList = ReportColumn.getPageViewInfo();
                        listData = getPageViewInfoDB(vo);
                    }
                    case ERROR_INFO -> { // Performance - Error (Top 10)
                        columnList = ReportColumn.getErrorInfo();
                        listData = getErrorInfo(vo);

                        // 개행문자가 있으면 폰트에서 오류나서 제거
                        for (Map<String, Object> item : listData) {
                            String errorMsg = (String) item.get("errorMsg");

                            String cleanErrorMsg = errorMsg.replace("\r", "").replace("\n", "");
                            if (cleanErrorMsg.length() > 1000) {
                                cleanErrorMsg = cleanErrorMsg.substring(0, 1000) + "...";
                            }

                            item.put("errorMsg", cleanErrorMsg);
                        }
                    }
                    case CRASH_INFO -> { // Performance - Crash (Top 10)
                        columnList = ReportColumn.getCrashInfo();
                        listData = getCrashInfo(vo);

                        // 개행문자가 있으면 폰트에서 오류나서 제거
                        for (Map<String, Object> item : listData) {
                            String causeBy = (String) item.get("causeBy");
                            String crashNm = (String) item.get("crashNm");

                            String cleanCauseBy = causeBy.replace("\r", "").replace("\n", "");
                            if (cleanCauseBy.length() > 1000) {
                                cleanCauseBy = cleanCauseBy.substring(0, 1000) + "...";
                            }

                            String cleanCrashNm = crashNm.replace("\r", "").replace("\n", "");
                            if (cleanCrashNm.length() > 1000) {
                                cleanCrashNm = cleanCrashNm.substring(0, 1000) + "...";
                            }

                            item.put("causeBy", cleanCauseBy);
                            item.put("crashNm", cleanCrashNm);
                        }
                    }
                    case TOP10_DEVICE_ERROR_INFO -> { // Performance - Device Error Info (Top 10)
                        columnList = ReportColumn.getErrorDeviceInfo();
                        listData = deviceErrorInfo(vo);
                        for (Map<String, Object> item : listData) {
                            String deviceModel = convertDeviceModel(deviceModelList, (String) item.get("deviceModel"), vo.getLocale());
                            item.put("deviceModel", deviceModel);
                        }
                    }
                    case TOP10_DEVICE_CRASH_INFO -> { // Performance - Device Crash Info (Top 10)
                        columnList = ReportColumn.getCrashDeviceInfo();
                        listData = deviceCrashInfo(vo);
                        for (Map<String, Object> item : listData) {
                            String deviceModel = convertDeviceModel(deviceModelList, (String) item.get("deviceModel"), vo.getLocale());
                            item.put("deviceModel", deviceModel);
                        }
                    }
                    case NETWORK_ERROR_INFO -> { // 네트워크 에러 정보 (Top 10)
                        columnList = ReportColumn.getNetworkErrorInfo();
                        listData = getNetworkErrorInfo(vo);

                        // 개행문자가 있으면 폰트에서 오류나서 제거
                        for (Map<String, Object> item : listData) {
                            String comTypeDnm = CommonUtil.convertComType(item.get("comType"));
                            item.put("comTypeDnm", comTypeDnm);

                            String errorMsg = (String) item.get("errorMsg");
                            if (errorMsg != null) {
                                String cleanErrorMsg = errorMsg.replace("\r", "").replace("\n", "");
                                if (cleanErrorMsg.length() > 1000) {
                                    cleanErrorMsg = cleanErrorMsg.substring(0, 1000) + "...";
                                }
                                item.put("errorMsg", cleanErrorMsg);
                            }
                        }
                    }
                    case NETWORK_CRASH_INFO -> { // 네트워크 크래시 정보 (Top 10)
                        columnList = ReportColumn.getNetworkCrashInfo();
                        listData = getNetworkCrashInfo(vo);

                        // 개행문자가 있으면 폰트에서 오류나서 제거
                        for (Map<String, Object> item : listData) {
                            String comTypeDnm = CommonUtil.convertComType(item.get("comType"));
                            item.put("comTypeDnm", comTypeDnm);

                            String causeBy = (String) item.get("causeBy");
                            String crashNm = (String) item.get("crashNm");

                            if (causeBy != null) {
                                String cleanCauseBy = causeBy.replace("\r", "").replace("\n", "");
                                if (cleanCauseBy.length() > 1000) {
                                    cleanCauseBy = cleanCauseBy.substring(0, 1000) + "...";
                                }
                                item.put("causeBy", cleanCauseBy);
                            }
                            if (crashNm != null) {
                                String cleanCrashNm = crashNm.replace("\r", "").replace("\n", "");
                                if (cleanCrashNm.length() > 1000) {
                                    cleanCrashNm = cleanCrashNm.substring(0, 1000) + "...";
                                }
                                item.put("crashNm", cleanCrashNm);
                            }
                        }
                    }
                    case F_STATUS_INFO -> { // MAXY FRONT - 기본정보
                        columnList = ReportColumn.getFrontStatusInfo();
                        listData = getFrontBasicInfo(vo);

                        for (Map<String, Object> item : listData) {
                            Object baseDateObj = item.get("baseDate");
                            if (baseDateObj != null) {
                                String baseDate = baseDateObj.toString();
                                String formatted = baseDate.substring(0, 4) + "/"
                                        + baseDate.substring(4, 6) + "/"
                                        + baseDate.substring(6, 8);
                                item.put("base_date", formatted); // CamelMap이라서 _를 써야 key가 baseDate로 됨
                            }
                        }
                    }
                    case F_BROWSER_10 -> { // MAXY FRONT - 브라우저 별 페이지 로드 Top 10
                        columnList = ReportColumn.getFrontBrowserPageLoadTop10();
                        listData = getFrontPageInfoByBrowser(vo);

                        int no = 1;
                        for (Map<String, Object> item : listData) {
                            item.put("no", no++);
                        }
                    }
                    case F_LOCATION_10 -> { // MAXY FRONT - 지역 별 페이지 로드 Top 10
                        columnList = ReportColumn.getFrontLocationPageLoadTop10();
                        listData = getFrontPageInfoByLocation(vo);

                        int no = 1;
                        for (Map<String, Object> item : listData) {
                            item.put("no", no++);

                            String locationCode = (String) item.get("locationCode");
                            String locationDesc = LocationUtil.getLocationName(locationCode, LocationUtil.Language.valueOf(vo.getLocale().toUpperCase()));
                            item.put("location_desc", locationDesc); // CamelMap이라서 _를 써야 key가 locationDesc 됨
                        }
                    }
                    case F_PAGE_LOAD_10 -> { // MAXY FRONT - 페이지 로드 Top 10
                        columnList = ReportColumn.getFrontPageLoadTop10();
                        listData = getFrontPageLoadTop10(vo);

                        int no = 1;
                        for (Map<String, Object> item : listData) {
                            item.put("no", no++);
                        }
                    }
                    case F_PAGE_LOAD_WORST_10 -> { // MAXY FRONT - 사용자 체감 별 페이지 로드 Worst 10
                        columnList = ReportColumn.getFrontPageLoadWorst10();
                        listData = getFrontPageLoadWorst10(vo);

                        int no = 1;
                        for (Map<String, Object> item : listData) {
                            item.put("no", no++);
                        }
                    }
                    case F_LCP_WORST_10 -> { // MAXY FRONT - LCP Worst 10
                        columnList = ReportColumn.getFrontLcpWorst10();
                        listData = getFrontLcpWorst10(vo);

                        int no = 1;
                        for (Map<String, Object> item : listData) {
                            item.put("no", no++);
                        }
                    }
                    case F_CLS_WORST_10 -> { // MAXY FRONT - CLS Worst 10
                        columnList = ReportColumn.getFrontClsWorst10();
                        listData = getFrontClsWorst10(vo);

                        int no = 1;
                        for (Map<String, Object> item : listData) {
                            item.put("no", no++);
                        }
                    }
                    case F_INP_WORST_10 -> { // MAXY FRONT - INP Worst 10
                        columnList = ReportColumn.getFrontInpWorst10();
                        listData = getFrontInpWorst10(vo);

                        int no = 1;
                        for (Map<String, Object> item : listData) {
                            item.put("no", no++);
                        }
                    }
                    case F_ERROR_PAGE_10 -> { // MAXY FRONT - 페이지 별 에러 수 Top 10
                        columnList = ReportColumn.getFrontPageErrorTop10();
                        listData = getFrontPageInfoByPageError(vo);

                        int no = 1;
                        for (Map<String, Object> item : listData) {
                            item.put("no", no++);
                        }
                    }
                    case F_ERROR_MSG_10 -> { // MAXY FRONT - 에러 메시지 별 Top 10
                        columnList = ReportColumn.getFrontErrorMsgTop10();
                        listData = getFrontPageInfoByErrorMsg(vo);

                        int no = 1;
                        for (Map<String, Object> item : listData) {
                            item.put("no", no++);
                        }
                    }
                    case F_ERROR_NET_10 -> { // MAXY FRONT - 페이지 별 에러 수 Top 10
                        columnList = ReportColumn.getFrontErrorNetworkTop10();
                        listData = getFrontPageInfoByNetworkErrorMsg(vo);

                        int no = 1;
                        for (Map<String, Object> item : listData) {
                            item.put("no", no++);
                        }
                    }
                }

                // 페이지 추가
                PDPage page = new PDPage(PDRectangle.A4);
                document.addPage(page);

                float yPos = page.getMediaBox().getHeight() - MARGIN; // PDF 작성 시작 Y위치
                float tableWidth = page.getMediaBox().getWidth() - 2 * MARGIN; // 데이터 표 너비

                PDPageContentStream stream = new PDPageContentStream(document, page);

                // 제목 출력
                float titleHeight = boldFont.getFontDescriptor().getFontBoundingBox().getHeight() / 1000 * FONT_SIZE_16; // 타이틀 높이
                reportServiceHelper.writeText(stream, boldFont, FONT_SIZE_16, MARGIN, yPos, TITLE);

                // 조회 조건 출력(MAXY일 경우) : 시작날짜~종료날짜, 앱, OS, 버전
                String searchTitle = String.format("%s~%s     App: %s     OS: %s     버전: %s"
                        , DateUtil.timestampToDate(vo.getFrom(), DateUtil.DATE_WITH_DASH_PATTERN)
                        , DateUtil.timestampToDate(vo.getTo(), DateUtil.DATE_WITH_DASH_PATTERN)
                        , vo.getPackageNmText(), vo.getOsTypeText(), vo.getAppVerText());

                // 조회 조건 출력(MAXY FRONT일 경우) : 시작날짜~종료날짜, 앱
                if (vo.getOsTypeText() == null || vo.getAppVerText() == null) {
                    searchTitle = String.format("%s~%s     App: %s"
                            , DateUtil.timestampToDate(vo.getFrom(), DateUtil.DATE_WITH_DASH_PATTERN)
                            , DateUtil.timestampToDate(vo.getTo(), DateUtil.DATE_WITH_DASH_PATTERN)
                            , vo.getPackageNmText());
                }

                reportServiceHelper.writeText(stream, baseFont, FONT_SIZE_10, MARGIN, yPos - titleHeight, searchTitle);

                // 서브타이틀 출력
                yPos -= 50;
                reportServiceHelper.writeText(stream, boldFont, FONT_SIZE_10, MARGIN, yPos, dataSubTitle);

                yPos -= LINE_GAP; // 줄 띄움

                if (ReportType.fromType(type) == STATUS_INFO) { // 조회 결과가 Map 형식인 경우, (STATUS_INFO - 상태정보)
                    Map<String, Object> basicMap = (Map<String, Object>) mapData.get("basicMap");
                    Map<String, Object> avgBasicMap = (Map<String, Object>) mapData.get("avgBasicMap");

                    if (basicMap == null) {
                        // 조회된 데이터 없음 안내문
                        reportServiceHelper.noDataText(stream, page, boldFont, FONT_SIZE_16);
                        stream.close();
                        continue;
                    }

                    yPos -= LINE_GAP; // 줄 띄움
                    reportServiceHelper.writeText(stream, boldFont, FONT_SIZE_10, MARGIN, yPos, "전체");
                    yPos -= LINE_GAP; // 줄 띄움

                    // 데이터 표 그리기
                    columnList = ReportColumn.getStatusInfoAll();
                    float[] columnWidthsAll = reportServiceHelper.calculateColumnWidths(tableWidth, columnList); // colWidth 대신 columnWidths 배열 사용

                    // 1. 헤더 행 그리기
                    float xPos = MARGIN;
                    float headerHeight = 0;

                    // 1단계: 먼저 모든 헤더 셀의 필요한 높이를 계산
                    for (int i = 0; i < columnList.size(); i++) {
                        Map<String, Object> column = columnList.get(i);
                        String columnName = column.get("name").toString();
                        float colWidth = columnWidthsAll[i]; // 각 컬럼별 너비 사용

                        // 텍스트 줄바꿈 계산하여 필요한 높이 확인
                        List<String> lines = reportServiceHelper.calculateWrappedText(columnName, colWidth, baseFont, FONT_SIZE_10);
                        float lineHeight = baseFont.getFontDescriptor().getFontBoundingBox().getHeight() / 1000 * FONT_SIZE_10 + 2;
                        float cellHeight = Math.max(ROW_HEIGHT, lineHeight * lines.size() + 6);

                        // 최대 높이 업데이트
                        headerHeight = Math.max(headerHeight, cellHeight);
                    }

                    // 2단계: 계산된 동일한 높이로 모든 헤더 셀 그리기
                    xPos = MARGIN;
                    for (int i = 0; i < columnList.size(); i++) {
                        Map<String, Object> column = columnList.get(i);
                        String columnName = column.get("name").toString();
                        float colWidth = columnWidthsAll[i]; // 각 컬럼별 너비 사용

                        float cellHeight = reportServiceHelper.drawCell(stream, xPos, yPos, colWidth, columnName, ReportColumnType.STRING, true, baseFont, FONT_SIZE_10);
                        headerHeight = Math.max(headerHeight, cellHeight);
                        xPos += colWidth;
                    }

                    // 2. 데이터 행 그리기
                    xPos = MARGIN;
                    yPos -= headerHeight;
                    float dataRowHeight = 0;

                    // 먼저 모든 셀의 최대 높이 계산
                    for (int i = 0; i < columnList.size(); i++) {
                        Map<String, Object> column = columnList.get(i);
                        String columnKey = column.get("column").toString();
                        ReportColumnType columnType = (ReportColumnType) column.get("type");
                        Object valueObj = basicMap.getOrDefault(columnKey, "");
                        String value = (valueObj != null) ? valueObj.toString() : "";
                        float colWidth = columnWidthsAll[i]; // 각 컬럼별 너비 사용

                        // 먼저 텍스트 처리
                        String processedValue = reportServiceHelper.processText(value, columnType);

                        List<String> lines = reportServiceHelper.calculateWrappedText(processedValue, colWidth, baseFont, FONT_SIZE_10);
                        float lineHeight = baseFont.getFontDescriptor().getFontBoundingBox().getHeight() / 1000 * FONT_SIZE_10 + 2;
                        float cellHeight = Math.max(ROW_HEIGHT, lineHeight * lines.size() + 6);

                        dataRowHeight = Math.max(dataRowHeight, cellHeight);
                    }

                    // 계산된 동일한 높이로 모든 셀 그리기
                    xPos = MARGIN;
                    for (int i = 0; i < columnList.size(); i++) {
                        Map<String, Object> column = columnList.get(i);
                        String columnKey = column.get("column").toString();
                        ReportColumnType columnType = (ReportColumnType) column.get("type");
                        Object valueObj = basicMap.getOrDefault(columnKey, "");
                        String value = (valueObj != null) ? valueObj.toString() : "";
                        float colWidth = columnWidthsAll[i]; // 각 컬럼별 너비 사용

                        reportServiceHelper.drawCellWithFixedHeight(stream, xPos, yPos, colWidth, value, columnType, false, baseFont, FONT_SIZE_10, dataRowHeight);
                        xPos += colWidth;
                    }
                    yPos -= dataRowHeight * 2; // 행 높이만큼 줄 띄움

                    // 페이지 하단 여백 설정 (페이지 끝에서 최소한 이 정도 공간은 남겨둠)
                    float bottomMargin = 50; // 페이지 하단 여백 (픽셀)

                    // 일 평균 테이블이 페이지 범위를 벗어나는지 확인
                    // 헤더 높이와 예상 데이터 행 높이를 고려하여 계산
                    float estimatedTableHeight = 30 + LINE_GAP; // 제목 + 간격

                    // 테이블이 페이지 끝에 가까워지면 새 페이지로 이동
                    if (yPos - estimatedTableHeight < bottomMargin) {
                        // 현재 페이지의 콘텐츠 스트림 닫기
                        stream.close();

                        // 새 페이지 생성
                        PDPage newPage = new PDPage(PDRectangle.A4);
                        document.addPage(newPage);

                        // 새 콘텐츠 스트림 생성
                        stream = new PDPageContentStream(document, newPage);

                        // 새 페이지의 시작 Y위치 설정
                        yPos = newPage.getMediaBox().getHeight() - MARGIN;
                    }

                    reportServiceHelper.writeText(stream, boldFont, FONT_SIZE_10, MARGIN, yPos, "일 평균");
                    yPos -= LINE_GAP;

                    // 평균 데이터 표 그리기 (위와 동일한 패턴으로)
                    columnList = ReportColumn.getStatusInfoAvg();
                    float[] columnWidthsAvg = reportServiceHelper.calculateColumnWidths(tableWidth, columnList); // colWidth 대신 columnWidths 배열 사용

                    // 1. 헤더 행 그리기
                    xPos = MARGIN;
                    headerHeight = 0;

                    for (int i = 0; i < columnList.size(); i++) {
                        Map<String, Object> column = columnList.get(i);
                        String columnName = column.get("name").toString();
                        float colWidth = columnWidthsAvg[i]; // 각 컬럼별 너비 사용

                        float cellHeight = reportServiceHelper.drawCell(stream, xPos, yPos, colWidth, columnName, ReportColumnType.STRING, true, baseFont, FONT_SIZE_10);
                        headerHeight = Math.max(headerHeight, cellHeight);
                        xPos += colWidth;
                    }

                    // 2. 데이터 행 그리기
                    xPos = MARGIN;
                    yPos -= headerHeight;
                    dataRowHeight = 0;

                    // 먼저 모든 셀의 최대 높이 계산
                    for (int i = 0; i < columnList.size(); i++) {
                        Map<String, Object> column = columnList.get(i);
                        String columnKey = column.get("column").toString();
                        ReportColumnType columnType = (ReportColumnType) column.get("type");
                        Object valueObj = avgBasicMap.getOrDefault(columnKey, "");
                        String value = (valueObj != null) ? valueObj.toString() : "";
                        float colWidth = columnWidthsAvg[i]; // 각 컬럼별 너비 사용

                        // 먼저 텍스트 처리
                        String processedValue = reportServiceHelper.processText(value, columnType);

                        List<String> lines = reportServiceHelper.calculateWrappedText(processedValue, colWidth, baseFont, FONT_SIZE_10);
                        float lineHeight = baseFont.getFontDescriptor().getFontBoundingBox().getHeight() / 1000 * FONT_SIZE_10 + 2;
                        float cellHeight = Math.max(ROW_HEIGHT, lineHeight * lines.size() + 6);

                        dataRowHeight = Math.max(dataRowHeight, cellHeight);
                    }

                    // 계산된 동일한 높이로 모든 셀 그리기
                    xPos = MARGIN;
                    for (int i = 0; i < columnList.size(); i++) {
                        Map<String, Object> column = columnList.get(i);
                        String columnKey = column.get("column").toString();
                        ReportColumnType columnType = (ReportColumnType) column.get("type");
                        Object valueObj = avgBasicMap.getOrDefault(columnKey, "");
                        String value = (valueObj != null) ? valueObj.toString() : "";
                        float colWidth = columnWidthsAvg[i]; // 각 컬럼별 너비 사용

                        reportServiceHelper.drawCellWithFixedHeight(stream, xPos, yPos, colWidth, value, columnType, false, baseFont, FONT_SIZE_10, dataRowHeight);
                        xPos += colWidth;
                    }

                } else if (!listData.isEmpty()) { // 조회 결과가 List 형식인 경우
                    stream.setFont(baseFont, FONT_SIZE_10);

                    // 데이터 표 컬럼 그리기
                    float xPos = MARGIN;
                    float headerHeight = 0;

                    // 1단계: 먼저 모든 헤더 셀의 필요한 높이를 계산
                    float[] columnWidths = reportServiceHelper.calculateColumnWidths(tableWidth, columnList); // colWidth 대신 columnWidths 배열 사용

                    for (int i = 0; i < columnList.size(); i++) {
                        Map<String, Object> column = columnList.get(i);
                        String columnName = column.get("name").toString();
                        float colWidth = columnWidths[i]; // 각 컬럼별 너비 사용

                        // 텍스트 줄바꿈 계산하여 필요한 높이 확인
                        List<String> lines = reportServiceHelper.calculateWrappedText(columnName, colWidth, baseFont, FONT_SIZE_10);
                        float lineHeight = baseFont.getFontDescriptor().getFontBoundingBox().getHeight() / 1000 * FONT_SIZE_10 + 2;
                        float cellHeight = Math.max(ROW_HEIGHT, lineHeight * lines.size() + 6);

                        // 최대 높이 업데이트
                        headerHeight = Math.max(headerHeight, cellHeight);
                    }

                    // 2단계: 계산된 동일한 높이로 모든 헤더 셀 그리기
                    xPos = MARGIN;
                    for (int i = 0; i < columnList.size(); i++) {
                        Map<String, Object> column = columnList.get(i);
                        String columnName = column.get("name").toString();
                        float colWidth = columnWidths[i]; // 각 컬럼별 너비 사용

                        reportServiceHelper.drawCellWithFixedHeight(stream, xPos, yPos, colWidth, columnName, ReportColumnType.STRING, true, baseFont, FONT_SIZE_10, headerHeight);
                        xPos += colWidth;
                    }

                    // 데이터 표 그리기
                    xPos = MARGIN;
                    yPos -= headerHeight; // 헤더 높이만큼 줄 띄움

                    // 데이터 표 그리기 부분 수정
                    // 페이지 하단 여백 설정 (페이지 끝에서 최소한 이 정도 공간은 남겨둠)
                    // 테이블 내용이 페이지 범위를 벗어나는 경우를 처리하기 위한 여백
                    float bottomMargin = 50; // 페이지 하단 여백 (픽셀)

                    for (Map<String, Object> item : listData) {
                        float rowHeight = 0; // 현재 행의 최대 높이
                        xPos = MARGIN;

                        // 먼저 이 행에서 필요한 최대 높이 계산
                        for (int i = 0; i < columnList.size(); i++) {
                            Map<String, Object> column = columnList.get(i);
                            String columnKey = column.get("column").toString();
                            ReportColumnType columnType = (ReportColumnType) column.get("type");
                            Object valueObj = item.getOrDefault(columnKey, "");
                            String value = (valueObj != null) ? valueObj.toString() : "";
                            float colWidth = columnWidths[i]; // 각 컬럼별 너비 사용

                            // 먼저 텍스트 처리
                            String processedValue = reportServiceHelper.processText(value, columnType);

                            // 텍스트 줄바꿈 계산하여 필요한 높이 확인
                            List<String> lines = reportServiceHelper.calculateWrappedText(processedValue, colWidth, baseFont, FONT_SIZE_10);
                            float lineHeight = baseFont.getFontDescriptor().getFontBoundingBox().getHeight() / 1000 * FONT_SIZE_10 + 2;
                            float cellHeight = Math.max(ROW_HEIGHT, lineHeight * lines.size() + 6);

                            // 최대 높이 업데이트
                            rowHeight = Math.max(rowHeight, cellHeight);
                        }

                        // 현재 행이 페이지 범위를 벗어나는지 확인
                        // 페이지 하단 여백보다 현재 Y위치가 작아지면 새 페이지 생성
                        // 테이블 행이 페이지 끝에 가까워지면 새 페이지로 이동하는 로직
                        if (yPos - rowHeight < bottomMargin) {
                            // 현재 페이지의 콘텐츠 스트림 닫기
                            stream.close();

                            // 새 페이지 생성
                            PDPage newPage = new PDPage(PDRectangle.A4);
                            document.addPage(newPage);

                            // 새 콘텐츠 스트림 생성
                            stream = new PDPageContentStream(document, newPage);

                            // 새 페이지의 시작 Y위치 설정
                            yPos = newPage.getMediaBox().getHeight() - MARGIN;

                            // 새 페이지에 헤더 다시 그리기 (테이블 연속성 유지를 위해)
                            xPos = MARGIN;
                            for (int i = 0; i < columnList.size(); i++) {
                                Map<String, Object> column = columnList.get(i);
                                String columnName = column.get("name").toString();
                                float colWidth = columnWidths[i];

                                reportServiceHelper.drawCellWithFixedHeight(stream, xPos, yPos, colWidth, columnName, ReportColumnType.STRING, true, baseFont, FONT_SIZE_10, headerHeight);
                                xPos += colWidth;
                            }

                            // 헤더 높이만큼 Y위치 조정
                            yPos -= headerHeight;
                        }

                        // 계산된 동일한 높이로 모든 셀 그리기
                        xPos = MARGIN;
                        for (int i = 0; i < columnList.size(); i++) {
                            Map<String, Object> column = columnList.get(i);
                            String columnKey = column.get("column").toString();
                            ReportColumnType columnType = (ReportColumnType) column.get("type");
                            Object valueObj = item.getOrDefault(columnKey, "");
                            String value = (valueObj != null) ? valueObj.toString() : "";
                            float colWidth = columnWidths[i]; // 각 컬럼별 너비 사용

                            // 모든 셀에 동일한 rowHeight 전달
                            reportServiceHelper.drawCellWithFixedHeight(stream, xPos, yPos, colWidth, value, columnType, false, baseFont, FONT_SIZE_10, rowHeight);
                            xPos += colWidth;
                        }

                        yPos -= rowHeight; // 계산된 행 높이만큼 줄 띄움
                    }
                } else {
                    // 조회된 데이터 없음 안내문
                    reportServiceHelper.noDataText(stream, page, boldFont, FONT_SIZE_16);
                }

                stream.close();
            }
            // 메모리에 저장
            document.save(outputStream);
            return outputStream;
        } catch (Exception e) {
            // 상세한 오류 로깅
            log.error("PDF 생성 중 오류 발생: {}", e.getMessage(), e);
            throw new IOException("PDF 생성 중 오류가 발생했습니다: " + e.getMessage(), e);
        }
        // 리소스 정리: PDF 문서 닫기
    }

    /**
     * 리포트 데이터를 기반으로 PDF 파일을 생성하여 응답으로 전송
     *
     * @param vo       리포트 요청 정보를 담은 VO 객체
     * @param request  HTTP 요청 객체
     * @param response HTTP 응답 객체 (PDF 파일이 이 응답으로 전송됨)
     */
    public void makePdf(ReportVO vo, HttpServletRequest request, HttpServletResponse response) {
        try {
            // PDF 생성
            ByteArrayOutputStream outputStream = createPdfReport(vo);

            // 응답 헤더 설정
            response.setContentType("application/pdf");
            String action = request.getParameter("action");

            // 현재 날짜와 시간을 포함한 파일명 생성
            SimpleDateFormat dateFormat = new SimpleDateFormat("yyyyMMdd_HHmmss");
            String timestamp = dateFormat.format(new Date());
            String filename = "MAXY_Report_" + timestamp + ".pdf";

            // 브라우저 호환성을 위한 인코딩
            String encodedFilename = URLEncoder.encode(filename, StandardCharsets.UTF_8)
                    .replaceAll("\\+", "%20");

            if ("download".equals(action)) {
                response.setHeader("Content-Disposition", "attachment; filename=\"" + encodedFilename + "\"");
            } else {
                response.setHeader("Content-Disposition", "inline; filename=\"" + encodedFilename + "\"");
            }

            // PDF 데이터를 출력 스트림에 쓰기
            try (OutputStream out = response.getOutputStream()) {
                outputStream.writeTo(out);
                out.flush();
            }

            // 리소스 정리: 출력 스트림 닫기
            try {
                outputStream.close();
            } catch (IOException e) {
                log.error("출력 스트림 닫기 실패: {}", e.getMessage(), e);
            }
        } catch (Exception e) {
            // 상세한 오류 로깅
            log.error("PDF 생성 중 오류 발생: {}", e.getMessage(), e);

            // 클라이언트에게 오류 응답 전송
            response.setContentType("text/plain;charset=UTF-8");
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            try (PrintWriter writer = response.getWriter()) {
                writer.write("PDF 생성 중 오류가 발생했습니다: " + e.getMessage());
            } catch (IOException ioException) {
                log.error("오류 메시지 전송 실패: {}", ioException.getMessage(), ioException);
            }
        }
    }

    /**
     * 리포트 데이터를 기반으로 PDF 파일을 생성하여 이메일로 전송
     *
     * @param vo     리포트 요청 정보를 담은 VO 객체
     * @param mailVO 이메일 전송 정보를 담은 VO 객체
     * @return 이메일 전송 성공 여부
     */
    public boolean sendReportByEmail(ByteArrayOutputStream outputStream, ReportVO vo, MailVO mailVO) {
        try {
            // 임시 파일로 저장, 지정한 파일명에 "_"로 구분자를 붙여서 임시파일패턴과 구분
            File tempFile = File.createTempFile(vo.getReportSubject() + "_", ".pdf");
            try (FileOutputStream fos = new FileOutputStream(tempFile)) {
                outputStream.writeTo(fos);
            }

            // 첨부 파일 목록이 없으면 생성
            if (mailVO.getAttachFileList() == null) {
                mailVO.setAttachFileList(new ArrayList<>());
            }

            // 첨부 파일 추가
            mailVO.getAttachFileList().add(tempFile.getAbsolutePath());

            // 이메일 전송
            boolean result = mailService.sendMail(mailVO);

            // 임시 파일 삭제
            if (!tempFile.delete()) {
                log.warn("임시 파일 삭제 실패: {}", tempFile.getAbsolutePath());
                tempFile.deleteOnExit(); // JVM 종료 시 삭제 시도
            }

            // 리소스 정리: 출력 스트림 닫기
            try {
                outputStream.close();
            } catch (IOException e) {
                log.error("출력 스트림 닫기 실패: {}", e.getMessage(), e);
            }

            return result;
        } catch (Exception e) {
            log.error("PDF 생성 및 이메일 전송 중 오류 발생: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * PDF 문서에 사용할 폰트를 로드
     *
     * @param document PDF 문서 객체
     * @param fontPath 폰트 파일 경로 (클래스패스 기준)
     * @return 로드된 폰트 객체, 로드 실패 시 null
     * @throws IOException 폰트 파일 접근 또는 로드 중 오류 발생 시
     */
    private PDType0Font loadFont(PDDocument document, String fontPath) throws IOException {
        // 자원 누수 방지를 위해 try-with-resources 사용
        try (InputStream is = getClass().getResourceAsStream(fontPath)) {
            if (is != null) {
                try {
                    return PDType0Font.load(document, is);
                } catch (IOException e) {
                    log.error("폰트 '{}' 로딩 중 오류 발생: {}", fontPath, e.getMessage(), e);
                    throw new IOException("폰트 로딩 실패: " + fontPath, e);
                }
            } else {
                log.warn("폰트 파일 '{}' 을 찾을 수 없습니다.", fontPath);
                throw new IOException("폰트 파일을 찾을 수 없습니다: " + fontPath);
            }
        }
    }

    public List<ScheduledMailVO> selectScheduledEmail(Long userNo) {
        return scheduledMapper.selectScheduledEmail(userNo);
    }

    public List<Map<String, Object>> scheduledEmailListReform(List<ScheduledMailVO> scheduledEmails) {
        List<Map<String, Object>> emailList = new ArrayList<>();

        for (ScheduledMailVO email : scheduledEmails) {
            Map<String, Object> emailMap = new HashMap<>();
            emailMap.put("seq", email.getSeq());
            emailMap.put("subject", email.getSubject());
            emailMap.put("reportSubject", email.getReportSubject());
            emailMap.put("sendCycle", email.getSendCycle());
            emailMap.put("toEmailListStr", email.getToEmailListStr());
            emailMap.put("sendStartDt", email.getSendStartDt());
            emailMap.put("sendEndDt", email.getSendEndDt());
            emailMap.put("usagePeriod", email.getUsagePeriod());

            // 수신자 수 계산
            int recipientCount = 0;
            if (email.getToEmailListStr() != null && !email.getToEmailListStr().isEmpty()) {
                recipientCount = email.getToEmailListStr().split(",").length;
            }
            // 수신자 수
            emailMap.put("recipientCount", recipientCount);

            // 상태 여부 (날짜 비교에 따른 3가지 케이스)
            LocalDate today = LocalDate.now();
            LocalDate startDate = LocalDate.parse(email.getSendStartDt());
            LocalDate endDate = LocalDate.parse(email.getSendEndDt());

            String status;
            if (today.isBefore(startDate)) {
                // 오늘날짜 < 시작일인 경우 : 예약중
                status = "0";
            } else if (!today.isBefore(startDate) && !today.isAfter(endDate)) {
                // 시작일 <= 오늘날짜 <= 종료일 : 활성
                status = "1";
            } else {
                // 종료일 < 오늘날짜 : 만료됨
                status = "2";
            }

            emailMap.put("status", status);                              // 상태 여부

            emailList.add(emailMap);
        }

        return emailList;
    }

    public List<ScheduledMailVO> selectActiveScheduledEmail() {
        ScheduledMailVO vo = new ScheduledMailVO();
        vo.setToday(LocalDate.now());
        return scheduledMapper.selectActiveScheduledEmail(vo);
    }

    public void insertScheduledEmail(ScheduledMailVO vo) {
        scheduledMapper.insertScheduledEmail(vo);
    }

    public void updateScheduledEmail(ScheduledMailVO vo) {
        scheduledMapper.updateScheduledEmail(vo);
    }

    public void deleteScheduledEmail(ScheduledMailVO vo) {
        scheduledMapper.deleteScheduledEmail(vo);
    }

    // ========== 프론트 전용 리포트 메서드들 ==========

    /**
     * 프론트 상태 정보 조회
     */
    public List<Map<String, Object>> getFrontBasicInfo(ReportVO vo) {
        // 프론트 전용 상태 정보 로직 구현
        // 기존 getStatusInfoDB와 유사하지만 프론트 데이터에 특화된 로직
        return mapper.selectFrontReportBasicInfo(vo);
    }

    public List<Map<String, Object>> getFrontPageInfoByBrowser(ReportVO vo) {
        return mapper.selectFrontReportPageInfoByBrowser(vo);
    }

    public List<Map<String, Object>> getFrontPageInfoByPageError(ReportVO vo) {
        return mapper.selectFrontReportPageInfoByPageError(vo);
    }

    public List<Map<String, Object>> getFrontPageInfoByErrorMsg(ReportVO vo) {
        return mapper.selectFrontReportPageInfoByErrorMsg(vo);
    }

    public List<Map<String, Object>> getFrontPageInfoByLocation(ReportVO vo) {
        return mapper.selectFrontReportPageInfoByLocation(vo);
    }

    public List<Map<String, Object>> getFrontPageInfoByNetworkErrorMsg(ReportVO vo) {
        return mapper.selectFrontReportPageInfoByNetworkErrorMsg(vo);
    }

    public List<Map<String, Object>> getFrontPageInfoByPageUrl(ReportVO vo) {
        return mapper.selectFrontReportPageInfoByPageUrl(vo);
    }

    public List<Map<String, Object>> getFrontPageLoadTop10(ReportVO vo) {
        return mapper.selectFrontReportPageLoadTop10(vo);
    }

    public List<Map<String, Object>> getFrontPageLoadWorst10(ReportVO vo) {
        return mapper.selectFrontReportPageLoadWorst10(vo);
    }

    public List<Map<String, Object>> getFrontLcpWorst10(ReportVO vo) {
        return mapper.selectFrontReportLcpWorst10(vo);
    }

    public List<Map<String, Object>> getFrontClsWorst10(ReportVO vo) {
        return mapper.selectFrontReportClsWorst10(vo);
    }

    public List<Map<String, Object>> getFrontInpWorst10(ReportVO vo) {
        return mapper.selectFrontReportInpWorst10(vo);
    }
}
