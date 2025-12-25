<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>

<%-- 컴포넌트 JS --%>
<script src="<c:url value="/components/db/logmeter/logmeter.js"/>"></script>
<script src="<c:url value="/components/db/resource-usage/resource-usage.js"/>"></script>
<script src="<c:url value="/components/db/device-analysis/device-analysis.js"/>"></script>
<script src="<c:url value="/components/db/page-analysis/page-analysis.js"/>"></script>
<script src="<c:url value="/components/db/page-view/page-view.js"/>"></script>
<script src="<c:url value="/components/db/rendering-time/rendering-time.js"/>"></script>
<script src="<c:url value="/components/db/accessibility/accessibility.js"/>"></script>
<script src="<c:url value="/components/db/version-conversion/version-conversion.js"/>"></script>
<script src="<c:url value="/components/db/marketing-insight/marketing-insight.js"/>"></script>

<%-- Maxy Front JS --%>
<script src="<c:url value="/components/front/db/bi/bi-chart.js"/>"></script>
<script src="<c:url value="/components/front/db/user-session/user-session.js"/>"></script>
<script src="<c:url value="/components/front/db/interval-scatter/interval-scatter.js"/>"></script>
<script src="<c:url value="/components/front/db/performance-timeline/performance-timeline.js"/>"></script>
<script src="<c:url value="/components/front/db/area/area.js"/>"></script>
<script src="<c:url value="/js/front/frontUserflow.js"/>"></script>
<script src="<c:url value="/components/front/fw/coreVital.js"/>"></script>
<script src="<c:url value="/components/front/fw/webPerfPage.js"/>"></script>
<script src="<c:url value="/components/front/fw/webPerfMetric.js"/>"></script>
<script src="<c:url value="/components/front/fw/webPerfResponse.js"/>"></script>
<script src="<c:url value="/components/front/fw/webPerfError.js"/>"></script>

<%-- Maxy Front Popup JS--%>
<script src="<c:url value="/components/front/db/popup/popup-user-session-setting.js"/>"></script>
<script src="<c:url value="/components/front/db/popup/popup-user-session.js"/>"></script>
<script src="<c:url value="/components/front/db/popup/popup-page-loading.js"/>"></script>
<script src="<c:url value="/components/front/db/popup/popup-ajax-response.js"/>"></script>
<script src="<c:url value="/components/front/db/popup/popup-error-detail.js"/>"></script>
<script src="<c:url value="/components/front/db/chart-tooltip-sync/chart-tooltip-synchronizer.js"/>"></script>
<script src="<c:url value="/components/front/db/popup/popup-bi-detail.js"/>"></script>
<script src="<c:url value="/components/front/db/popup/popup-ccu-detail.js"/>"></script>
<script src="<c:url value="/components/front/db/popup/popup-area-performance.js"/>"></script>
<script src="<c:url value="/components/front/ua/popup/popup-search-user.js"/>"></script>
<script src="<c:url value="/components/front/ua/popup/popup-user-info.js"/>"></script>
<script src="<c:url value="/components/front/ua/popup/popup-page-detail.js"/>"></script>
<script src="<c:url value="/components/front/fw/popup/popup-page-view.js"/>"></script>
<script src="<c:url value="/components/front/db/popup/popup-bi-error-detail.js"/>"></script>
<script src="<c:url value="/components/front/fw/popup/popup-ajax-response-detail.js"/>"></script>
<script src="<c:url value="/components/front/fw/popup/popup-error-detail.js"/>"></script>

<script src="<c:url value="/components/ua/today-use/today-use.js"/>"></script>
<script src="<c:url value="/components/ua/popup/popup-user-list-by-time.js"/>"></script>
<script src="<c:url value="/components/ua/popup/popup-user-info.js"/>"></script>
<script src="<c:url value="/components/ua/popup/popup-search-user.js"/>"></script>

<script src="<c:url value="/components/gm/storeChart.js"/>"></script>
<script src="<c:url value="/components/sa/analytics.js"/>"></script>
<script src="<c:url value="/components/sa/word-cloud.js"/>"></script>

<%-- 로그 분석 차트 모음 --%>
<script src="<c:url value="/components/ta/logChart.js"/>"></script>
<script src="<c:url value="/components/ta/countChart.js"/>"></script>
<script src="<c:url value="/components/ta/histogramChart.js"/>"></script>
<script src="<c:url value="/components/ta/logTable.js"/>"></script>

<%-- 성능분석 v2 차트&테이블 모음 --%>
<script src="<c:url value="/components/pa/core-vital.js"/>"></script>
<script src="<c:url value="/components/pa/api-error.js"/>"></script>
<script src="<c:url value="/components/pa/ajax-page-analysis.js"/>"></script>
<script src="<c:url value="/components/pa/ajax-api-analysis.js"/>"></script>
<script src="<c:url value="/components/pa/hitmap.js"/>"></script>
<script src="<c:url value="/components/cmm/popup-api-error.js"/>"></script>

<script src="<c:url value="/components/cmm/popup-log-list-by-page.js"/>"></script>
<script src="<c:url value="/components/cmm/popup-log-list-by-user.js"/>"></script>
<script src="<c:url value="/components/cmm/popup-log-list-with-waterfall.js"/>"></script>
<script src="<c:url value="/components/cmm/popup-user-analysis-with-list.js"/>"></script>
<script src="<c:url value="/components/cmm/popup-analysis-detail.js"/>"></script>
<script src="<c:url value="/components/cmm/popup-analysis-loading-multiple-url.js"/>"></script>
<script src="<c:url value="/components/cmm/popup-log-stack.js"/>"></script>
<script src="<c:url value="/components/cmm/popup-pv-list.js"/>"></script>
<script src="<c:url value="/components/cmm/popup-usage-list.js"/>"></script>
<script src="<c:url value="/components/cmm/popup-log-list-by-log.js"/>"></script>
<script src="<c:url value="/components/cmm/popup-analysis-ajax-api.js"/>"></script>
<script src="<c:url value="/components/cmm/popup-analysis-ajax-api-detail.js"/>"></script>
<script src="<c:url value="/components/cmm/popup-analysis-response-multiple-url-v2.js"/>"></script>
<script src="<c:url value="/components/cmm/popup-session-replay.js"/>"></script>

<script src="<c:url value="/components/db/page-view/page-view-equalizer.js"/>"></script>
<script src="<c:url value="/components/db/interval-scatter/interval-scatter.js"/>"></script>
<script src="<c:url value="/components/db/popup/popup-bi-analysis.js"/>"></script>
<script src="<c:url value="/components/db/popup/popup-pv-analysis.js"/>"></script>
<script src="<c:url value="/components/db/popup/popup-favorites-analysis.js"/>"></script>
<script src="<c:url value="/components/db/popup/popup-log-analysis.js"/>"></script>
<script src="<c:url value="/components/db/area-distribution/area-distribution.js"/>"></script>
<script src="<c:url value="/components/db/popup/popup-area-distribution-list.js"/>"></script>
<script src="<c:url value="/components/db/popup/popup-loading-time-list.js"/>"></script>
<script src="<c:url value="/components/db/version-comparison/version-comparison.js"/>"></script>
<script src="<c:url value="/components/db/popup/popup-all-version-comparison.js"/>"></script>
<script src="<c:url value="/components/db/crashes-by-version/crashes-by-version.js"/>"></script>
<script src="<c:url value="/components/db/popup/popup-version-conversion.js"/>"></script>
<script src="<c:url value="/components/db/popup/popup-crashes-by-version.js"/>"></script>
<script src="<c:url value="/components/db/popup/popup-marketing-insight.js"/>"></script>
<script src="<c:url value="/components/db/popup/popup-all-marketing-insight.js"/>"></script>

<script src="<c:url value="/components/gm/popup/popup-component-setting.js"/>"></script>
<script src="<c:url value="/components/gm/popup/popup-setting-max-size.js"/>"></script>
<script src="<c:url value="/components/gm/popup/popup-setting-logmeter.js"/>"></script>
<script src="<c:url value="/components/gm/popup/popup-setting-scatter.js"/>"></script>
<script src="<c:url value="/components/gm/popup/popup-version-comparison-setting.js"/>"></script>
<script src="<c:url value="/components/gm/popup/popup-setting-marketing-insight.js"/>"></script>
<script src="<c:url value="/components/gm/popup/popup-alarm-setting.js"/>"></script>

<script src="<c:url value="/components/db/popup/popup-aibot.js"/>"></script>
<script src="<c:url value="/components/db/popup/popup-ccu-detail.js"/>"></script>

<script src="<c:url value="/components/cmm/popup-app-management.js"/>"></script>
<script src="<c:url value="/components/cmm/popup-search-url.js"/>"></script>
<script src="<c:url value="/components/cmm/popup-search-user.js"/>"></script>