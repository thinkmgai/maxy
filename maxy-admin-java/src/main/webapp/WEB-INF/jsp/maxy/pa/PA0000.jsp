<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%--suppress CssUnusedSymbol --%>
<style>
    .maxy_pa_wrap h1 {
        font-size: 18px;
        font-weight: 700;
        line-height: 20px;
        margin: .8em .6em 0 .8em;
        color: var(--color-title-light);
    }

    h1.sub {
        font-size: 16px;
    }

    .dark_mode .maxy_pa_wrap h1 {
        color: white;
    }

    .pa_contents_wrap .chart_top_wrap .dv2,
    .pa_contents_wrap .bot_data_wrap > .dv2 {
        height: 400px;
        display: grid;
        grid-template-columns: 50% calc(50% - 1em);
        gap: 1em;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        min-width: 0; /* grid 아이템의 overflow 방지용 필수 */
        overflow: hidden;
        border: 1px solid #e3e3e3;
        border-radius: var(--radius);
    }

    .dark_mode .pa_contents_wrap .chart_top_wrap .dv2,
    .dark_mode .pa_contents_wrap .bot_data_wrap > .dv2 {
        border: 1px solid var(--color-table-block-dark-1);
        background-color: #272829;
    }

    .pa_contents_wrap .dv2 > div {
        display: flex;
        height: 400px;
        flex-direction: column;
    }

    .dark_mode .pa_contents_wrap .chart_top_wrap > div,
    .dark_mode .pa_contents_wrap .bot_data_wrap > div {
        box-shadow: none;
    }

    .dark_mode .core_vital_wrap.table.tabulator,
    .dark_mode .error_wrap.table.tabulator,
    .dark_mode .chart_top_wrap .error_wrap.chart,
    .dark_mode .chart_bot_wrap .ajax_wrap.chart,
    .dark_mode .core_vital_bar_chart_wrap,
    .dark_mode .core_vital_line_chart_wrap,
    .dark_mode .core_vital_bar_chart_wrap {
        background-color: var(--color-block-dark-1);
    }

    .pa_contents_wrap .bot_data_wrap .chart {
        gap: 4%;
    }

    .pa_contents_wrap .chart_top_wrap,
    .chart_bot_wrap .bot_data_wrap {
        display: grid;
        /*grid-template-rows: auto auto;*/
        gap: 1em;
    }

    .chart_bot_wrap {
        margin-bottom: 50px; /* 하단 여백 추가 */
    }

    /* core vital */
    .pa_contents_wrap .core_vital_wrap {
        height: auto !important; /* 고정 높이 대신 자동 높이 설정 */
        min-height: 600px; /* 최소 높이 설정 */
        display: flex; /* 플렉스박스 사용 */
        flex-direction: column; /* 세로 방향 배치 */
    }

    .core_vital_wrap.table, .error_wrap.table, .ajax_wrap.table {
        border-left: 1px solid var(--color-table-row-light-1);
    }

    .dark_mode .core_vital_wrap, .dark_mode .error_wrap.table, .dark_mode .ajax_wrap.table {
        border-left: 1px solid var(--color-table-block-dark-1);
    }

    .pa_contents_wrap .core_vital_wrap.chart > .core_vital_total_chart_wrap {
        flex: 0 0 auto; /* 내용물 크기에 맞게 자동 조정 */
        margin-bottom: 2px;
        display: flex; /* Flexbox 레이아웃 사용 */
        flex-direction: column;
    }

    .maxy_pa_wrap .selection_time_wrap {
        font-weight: 700;
        height: 50px;
        color: var(--color-title-light);
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-left: 0.8em;
        margin-right: 0.8em;
        gap: 0.5em;
    }

    .maxy_pa_wrap .selection_time_wrap div {
        display: flex;
        align-items: center;
        gap: .5em;
    }

    .dark_mode .maxy_pa_wrap .selection_time_wrap {
        color: white;
    }

    .maxy_pa_wrap .img_icon_watch {
        scale: 0.85;
    }

    .selection_time_wrap .img_icon_wide_btn {
        scale: 0.8;
    }

    .pa_contents_wrap .core_vital_wrap.chart > .core_vital_bar_chart_wrap {
        flex: 0 0 auto; /* 내용물 크기에 맞게 자동 조정 */
        min-height: 120px; /* 최소 높이 설정 */
        display: flex; /* Flexbox 레이아웃 사용 */
        flex-direction: row; /* 가로 방향으로 배치 */
        flex-wrap: nowrap; /* 줄바꿈 없이 한 줄에 표시 */
        width: 100%; /* 부모 요소의 전체 너비 사용 */
        box-sizing: border-box; /* 패딩과 테두리를 너비에 포함 */
    }

    .pa_contents_wrap .core_vital_wrap.chart > .core_vital_bar_chart_wrap > div:nth-child(1) {
        margin-left: 1em;
        flex: 0 0 180px;
    }

    .pa_contents_wrap .core_vital_wrap.chart > .core_vital_bar_chart_wrap > div:nth-child(2) {
        flex: 1 1 auto;
        min-width: 0;
        min-height: 120px;
    }

    .pa_contents_wrap .core_vital_wrap.chart > .core_vital_bar_chart_wrap > div:nth-child(3) {
        margin-right: 1em;
        flex: 0 0 100px
    }

    .pa_contents_wrap .core_vital_wrap.chart > .core_vital_bar_chart_wrap > .core_vital_bar_chart_text_wrap {
        gap: .8em;
        margin-top: 1.1em;
        display: flex;
        flex-direction: column;
    }

    .core_vital_bar_chart_wrap > .core_vital_bar_chart_text_wrap > div {
        display: flex;
        justify-content: space-between;
        gap: 1em;
        height: 16px;
    }

    .core_vital_bar_chart_wrap > .core_vital_bar_chart_text_wrap .vital_detail_value {
        text-align: right;
    }

    .core_vital_bar_chart_desc_wrap {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 2em;
        height: 16px;
        margin-bottom: 1.1em;
    }

    .core_vital_bar_chart_desc_wrap > div {
        display: flex;
        align-items: center;
        color: #808080;
        gap: 0.5em;
    }

    .core_vital_bar_chart_desc_wrap div.circle {
        width: 8px;
        height: 8px;
        border-radius: var(--radius);
    }

    .core_vital_bar_chart_desc_wrap div.circle.green {
        background-color: var(--point-green);
    }

    .core_vital_bar_chart_desc_wrap div.circle.yellow {
        background-color: var(--point-yellow);
    }

    .core_vital_bar_chart_desc_wrap div.circle.red {
        background-color: var(--point-red);
    }

    .chart_top_wrap .dv2:first-child {
        height: auto;
        flex-direction: row;
    }

    /* 라인 차트 래퍼 설정 */
    .pa_contents_wrap .core_vital_line_chart_wrap {
        display: flex; /* Flexbox 레이아웃 사용 */
        flex-direction: row; /* 가로 방향으로 배치 */
        flex-wrap: wrap; /* 줄바꿈 허용하여 여러 줄에 표시 */
        flex: 1 1 auto; /* 남은 공간을 차지하도록 설정 */
        width: 100%; /* 부모 요소의 전체 너비 사용 */
        box-sizing: border-box; /* 패딩과 테두리를 너비에 포함 */
        height: 400px; /* 고정 높이 설정 */
        overflow-y: auto; /* 내용이 넘칠 경우 스크롤 표시 */
    }

    /* 각 차트 항목 설정 */
    .core_vital_line_chart_wrap > div {
        flex: 0 0 50%; /* 각 div가 50%의 너비를 차지하도록 설정 (2개씩 배치) */
        min-width: 0; /* 내용이 많아도 최소 너비 제한 없음 */
        padding-left: 5px; /* 좌우 여백 (필요시 조정) */
        padding-right: 5px; /* 좌우 여백 (필요시 조정) */
        padding-bottom: 5px;
        box-sizing: border-box; /* 패딩을 너비에 포함 */
        height: 200px; /* 각 항목의 높이를 고정 (부모 높이의 절반) */
    }

    /* 차트 내부 텍스트 정렬 */
    .core_vital_line_chart_wrap > div > span {
        padding-left: 1em;
        display: inline-block;
    }

    /* Core Vital Chart 스타일 */
    .core-vital-chart-container {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        height: 120px;
        padding: 1.1em 1em 0 1em;
        gap: 0.8em;
    }

    .core-vital-metric-container {
        display: flex;
        flex-direction: row;
        align-items: center;
        width: 100%;
        height: 16px;
        position: relative;
    }

    .core-vital-bg-bar {
        height: 100%;
        position: absolute;
        left: 0;
        opacity: 0.3;
        display: flex;
        align-items: center;
        justify-content: center;
        color: black;
    }

    .core-vital-bg-bar-good {
        border-top-left-radius: 4px;
        border-bottom-left-radius: 4px;
        background-color: #35DA9E;
    }

    .core-vital-bg-bar-needs {
        background-color: #FFC700;
    }

    .core-vital-bg-bar-poor {
        border-top-right-radius: 4px;
        border-bottom-right-radius: 4px;
        background-color: #FF6969;
    }

    .core-vital-value-bar {
        width: 0;
        height: 100%;
        background-color: #35DA9E;
        position: absolute;
        left: 0;
        border-radius: 4px;
        transition: width 0.3s, background-color 0.3s;
    }

    .core-vital-bg-bar-text {
        position: absolute;
        white-space: nowrap;
        z-index: 10;
        color: #808080;
    }

    /* 라인 차트 설정 */
    .pa_contents_wrap .core_vital_line_chart_wrap .core_vital_line_chart {
        margin-top: 2px;
        height: calc(100% - 40px); /* 텍스트 공간 제외한 높이 */
        max-height: 160px; /* 부모 요소 높이(150px)에서 텍스트와 여백 공간 제외 */
    }

    .pa_contents_wrap .core_vital_wrap .core_vital_line_tooltip {
        line-height: 16px;
        font-size: 12px;
        font-family: "Pretendard", sans-serif;
    }

    .ic_question {
        content: url(/images/maxy/ic-question-grey-blue.svg);
        width: 12px;
        height: 14px;
        margin-left: 0.5em;
    }

    .pa_contents_wrap .core_vital_wrap.table .btn_yn {
        width: 100%;
        font-weight: 500;
        color: white;
    }

    .pa_contents_wrap .core_vital_wrap.table .btn_yn.none {
        color: var(--logo-purple-2);
    }

    .dark_mode .pa_contents_wrap .core_vital_wrap.table .btn_yn {
        color: #101010;
    }

    .pa_contents_wrap .core_vital_wrap.table .btn_yn.good {
        background-color: var(--point-green)
    }

    .pa_contents_wrap .core_vital_wrap.table .btn_yn.improve {
        background-color: var(--point-yellow)
    }

    .pa_contents_wrap .core_vital_wrap.table .btn_yn.poor {
        background-color: var(--point-red)
    }

    .core_vital_bar_chart_text_wrap .detail {
        color: var(--color-grid-title-light-2);
    }

    /* core vital 테이블 팝업 */
    #logDetail__logList {
        height: 100% !important;
    }

    /* core vital 끝 */

    .error_wrap #apiErrorChart {
        height: calc(100% - 20px);
    }

    .chart_bot_wrap > h1 {
        margin-bottom: .8em;
    }

    .dialog {
        font-family: 'Pretendard', sans-serif;
    }

    .dialog-header {
        margin-bottom: 10px;
    }

    .dialog-body {
        line-height: 1.5;
    }

    .space-y-2 > div {
        margin-bottom: 8px;
    }

    .font-mono {
        font-family: monospace;
    }

    #ajaxPageChart .highcharts-point, #ajaxApiChart .highcharts-point {
        stroke: #fff;
        stroke-width: 3px;
    }

    .dark_mode #ajaxPageChart .highcharts-point, .dark_mode #ajaxApiChart .highcharts-point {
        stroke: var(--color-block-dark-1);
    }

    .dv2 .tabulator {
        border-top: 1px solid var(--color-table-row-light-1);
        box-shadow: none !important;
        border-radius: initial !important;
        height: 100%;
    }

    .dark_mode .dv2 .tabulator {
        border-top: none !important;
    }

    h1.bot_title {
        margin: 2.7em 0 1em 0;
    }

    .maxy_pa_wrap .contents_header {
        position: fixed;
        top: 40px; /* 상단 네비게이션 바가 있다면 그 높이만큼 조정 */
        left: 0;
        width: 100%;
        background-color: var(--color-bg-light-1); /* 배경색 설정 */
        padding: 10px 20px;
        z-index: 9;
    }

    /* 다크 모드 지원 */
    .dark_mode .maxy_pa_wrap .contents_header {
        background-color: var(--color-bg-dark-1);
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
    }

    /* 고정된 헤더 아래 콘텐츠가 가려지지 않도록 여백 추가 */
    .maxy_pa_wrap .pa_contents_wrap {
        padding-top: 55px; /* contents_header의 높이에 맞게 조정 */
    }

    .top_title {
        font-size: 18px;
        font-weight: 700;
        line-height: 20px;
        margin: .2em 0 .6em 0;
        /*margin: .8em .6em;*/
        color: var(--color-title-light);
    }

    .dark_mode .top_title {
        color: white;
    }
</style>
<!-- 성능 분석 Wrapper -->
<div class="maxy_pa_wrap">
    <div class="contents_header">
        <div class="ctts_h_left">
            <span class="app_icon">A</span>
            <label for="packageNm_a"></label><select id="packageNm_a" class="app_info_select"></select>
            <span class="app_icon">O</span>
            <select id="osType_a" class="app_info_select"></select>
        </div>
        <div class="ctts_h_right">
            <div class="datetime_picker_container">
                <div class="datetime_picker_label">From</div>
                <div class="date_time_wrap improved" id="searchFromDtWrap">
                    <div class="calendar_icon"></div>
                    <input type="text" class="calendar_input" id="searchFromDt" readonly="readonly"
                           placeholder="Select date">
                    <div class="time_box">
                        <input type="text" pattern="[0-9]+" class="time_box_input" maxlength="2" id="searchFromDtHH"
                               value="00">
                        <span class="time_separator">:</span>
                        <input type="text" pattern="[0-9]+" class="time_box_input" maxlength="2" id="searchFromDtmm"
                               value="00">
                    </div>
                </div>
                <div class="datetime_picker_label">To</div>
                <div class="date_time_wrap improved" id="searchToDtWrap">
                    <div class="calendar_icon"></div>
                    <input type="text" class="calendar_input" id="searchToDt" readonly="readonly"
                           placeholder="Select date">
                    <div class="time_box">
                        <input type="text" pattern="[0-9]+" class="time_box_input" maxlength="2" id="searchToDtHH"
                               value="16">
                        <span class="time_separator">:</span>
                        <input type="text" pattern="[0-9]+" class="time_box_input" maxlength="2" id="searchToDtmm"
                               value="15">
                    </div>
                </div>
                <button type="button" class="search_button" id="searchButton" data-t="common.text.search"></button>
            </div>
        </div>
    </div>

    <div>
        <div class="pa_contents_wrap">
            <div class="top_title" data-t="common.text.pageAnalysis"></div>
            <div class="chart_top_wrap">

                <!-- Core Vital -->
                <div class="dv2">
                    <div class="core_vital_wrap chart" aria-label="CoreVital 차트">
                        <div class="core_vital_total_chart_wrap">
                            <div>
                                <h1 class="sub">Core Vital</h1>
                            </div>
                        </div>
                        <div class="core_vital_bar_chart_wrap">
                            <div class="core_vital_bar_chart_text_wrap">
                                <div>
                                    <span class="bold">LCP</span>
                                    <span class="detail">Largest Contentful Paint</span>
                                </div>
                                <div>
                                    <span class="bold">FCP</span>
                                    <span class="detail">First Contentful Paint</span>
                                </div>
                                <div>
                                    <span class="bold">INP</span>
                                    <span class="detail">Interaction to Next Paint</span>
                                </div>
                                <div>
                                    <span class="bold">CLS</span>
                                    <span class="detail">Cumulative Layout Shift</span>
                                </div>
                            </div>
                            <div id="coreVitalChart" class="core-vital-chart-container">
                                <!-- LCP 메트릭 컨테이너 -->
                                <div class="core-vital-metric-container">
                                    <!-- GOOD 영역 배경 바 -->
                                    <div class="lcp-bg-bar-good core-vital-bg-bar core-vital-bg-bar-good" style="width: 0;">
                                    </div>
                                    <!-- NEEDS_IMPROVEMENT 영역 배경 바 -->
                                    <div class="lcp-bg-bar-needs core-vital-bg-bar core-vital-bg-bar-needs" style="width: 0;">
                                    </div>
                                    <!-- POOR 영역 배경 바 -->
                                    <div class="lcp-bg-bar-poor core-vital-bg-bar core-vital-bg-bar-poor" style="width: 0;">
                                    </div>
                                    <!-- 값 바 -->
                                    <div class="lcp-value-bar core-vital-value-bar"></div>
                                </div>

                                <!-- FCP 메트릭 컨테이너 -->
                                <div class="core-vital-metric-container">
                                    <!-- GOOD 영역 배경 바 -->
                                    <div class="fcp-bg-bar-good core-vital-bg-bar core-vital-bg-bar-good" style="width: 0;">
                                    </div>
                                    <!-- NEEDS_IMPROVEMENT 영역 배경 바 -->
                                    <div class="fcp-bg-bar-needs core-vital-bg-bar core-vital-bg-bar-needs" style="width: 0;">
                                    </div>
                                    <!-- POOR 영역 배경 바 -->
                                    <div class="fcp-bg-bar-poor core-vital-bg-bar core-vital-bg-bar-poor" style="width: 0;">
                                    </div>
                                    <!-- 값 바 -->
                                    <div class="fcp-value-bar core-vital-value-bar"></div>
                                </div>

                                <!-- INP 메트릭 컨테이너 -->
                                <div class="core-vital-metric-container">
                                    <!-- GOOD 영역 배경 바 -->
                                    <div class="inp-bg-bar-good core-vital-bg-bar core-vital-bg-bar-good" style="width: 0;">
                                    </div>
                                    <!-- NEEDS_IMPROVEMENT 영역 배경 바 -->
                                    <div class="inp-bg-bar-needs core-vital-bg-bar core-vital-bg-bar-needs" style="width: 0;">
                                    </div>
                                    <!-- POOR 영역 배경 바 -->
                                    <div class="inp-bg-bar-poor core-vital-bg-bar core-vital-bg-bar-poor" style="width: 0;">
                                    </div>
                                    <!-- 값 바 -->
                                    <div class="inp-value-bar core-vital-value-bar"></div>
                                </div>

                                <!-- CLS 메트릭 컨테이너 -->
                                <div class="core-vital-metric-container">
                                    <!-- GOOD 영역 배경 바 -->
                                    <div class="cls-bg-bar-good core-vital-bg-bar core-vital-bg-bar-good" style="width: 0;">
                                    </div>
                                    <!-- NEEDS_IMPROVEMENT 영역 배경 바 -->
                                    <div class="cls-bg-bar-needs core-vital-bg-bar core-vital-bg-bar-needs" style="width: 0;">
                                    </div>
                                    <!-- POOR 영역 배경 바 -->
                                    <div class="cls-bg-bar-poor core-vital-bg-bar core-vital-bg-bar-poor" style="width: 0;">
                                    </div>
                                    <!-- 값 바 -->
                                    <div class="cls-value-bar core-vital-value-bar"></div>
                                </div>
                            </div>
                            <div class="core_vital_bar_chart_text_wrap">
                                <div>
                                    <span class="detail">Avg.</span>
                                    <span class="bold vital_detail_value" id="lcpAvg"></span>
                                </div>
                                <div>
                                    <span class="detail">Avg.</span>
                                    <span class="bold vital_detail_value" id="fcpAvg"></span>
                                </div>
                                <div>
                                    <span class="detail">Avg.</span>
                                    <span class="bold vital_detail_value" id="inpAvg"></span>
                                </div>
                                <div>
                                    <span class="detail">Avg.</span>
                                    <span class="bold vital_detail_value" id="clsAvg"></span>
                                </div>
                            </div>
                        </div>
                        <div class="core_vital_bar_chart_desc_wrap">
                            <div>
                                <div class="circle green"></div><span data-t="dashboard.waterfall.good"></span>
                            </div>
                            <div>
                                <div class="circle yellow"></div><span data-t="dashboard.waterfall.needsImprovement"></span>
                            </div>
                            <div>
                                <div class="circle red"></div><span data-t="dashboard.waterfall.poor"></span>
                            </div>
                        </div>
                        <div class="core_vital_line_chart_wrap">
                            <div>
                                <span class="txt_gray">Loading</span><br><br>
                                <span class="bold">LCP</span>
                                <img class="ic_question lcp" alt="?" src="">
                                <div id="lcpChart" class="core_vital_line_chart"></div>
                            </div>
                            <div>
                                <span class="txt_gray">Loading</span><br><br>
                                <span class="bold">FCP</span>
                                <img class="ic_question fcp" alt="?" src="">
                                <div id="fcpChart" class="core_vital_line_chart"></div>
                            </div>
                            <div>
                                <span class="txt_gray">Interactivity</span><br><br>
                                <span class="bold">INP</span>
                                <img class="ic_question inp" alt="?" src="">
                                <div id="inpChart" class="core_vital_line_chart"></div>
                            </div>
                            <div>
                                <span class="txt_gray">Visual Stability</span><br><br>
                                <span class="bold">CLS</span>
                                <img class="ic_question cls" alt="?" src="">
                                <div id="clsChart" class="core_vital_line_chart"></div>
                            </div>
                        </div>
                    </div>
                    <div class="core_vital_wrap table">
                        <div class="selection_time_wrap">
                            <div>
                                <img class="img_icon_watch" alt="">
                                <span id="coreVitalSelectTime"></span>
                            </div>
                            <button>
                                <img class="img_icon_wide_btn" alt="" id="coreVitalSelectTimeBtn">
                            </button>
                        </div>
                        <div id="coreVitalTable" aria-label="CoreVital 테이블"></div>
                    </div>
                </div>


                <div class="dv2">
                    <div class="ajax_wrap chart page" aria-label="AJAX 차트">
                        <h1 class="sub">Page</h1>
                        <div class="chart-container" id="ajaxPageChart">

                        </div>
                    </div>
                    <div class="ajax_wrap table page" aria-label="AJAX Page 테이블">
                        <div class="selection_time_wrap">
                            <div>
                                <img class="img_icon_watch" alt="">
                                <span id="ajaxPageSelectTime"></span>
                            </div>
                            <button>
                                <img class="img_icon_wide_btn" alt="" id="ajaxPageSelectTimeBtn">
                            </button>
                        </div>
                        <div id="ajaxPageTable"></div>
                    </div>
                </div>

            </div>

            <h1 class="bot_title" data-t="common.text.ajaxAnalysis"></h1>
            <div class="chart_bot_wrap">
                <div class="bot_data_wrap">

                    <div class="dv2">
                        <!-- Error -->
                        <div class="error_wrap chart" aria-label="Error 차트">
                            <div>
                                <h1 class="sub">Network Error</h1>
                            </div>
                            <div id="apiErrorChart"></div>
                        </div>
                        <div class="error_wrap table">
                            <div class="selection_time_wrap">
                                <div>
                                    <img class="img_icon_watch" alt="">
                                    <span id="apiErrorSelectTime"></span>
                                </div>
                                <button>
                                    <img class="img_icon_wide_btn" alt="" id="apiErrorSelectTimeBtn">
                                </button>
                            </div>
                            <div id="apiErrorTable" aria-label="Error 테이블"></div>
                        </div>
                    </div>


                    <div class="dv2">
                        <div class="ajax_wrap chart api" aria-label="AJAX 차트">
                            <h1 class="sub">API</h1>
                            <div class="chart-container" id="ajaxApiChart">

                            </div>
                        </div>
                        <div class="ajax_wrap table api" aria-label="AJAX API 테이블">
                            <div class="selection_time_wrap">
                                <div>
                                    <img class="img_icon_watch" alt="">
                                    <span id="ajaxApiSelectTime"></span>
                                </div>
                                <button>
                                    <img class="img_icon_wide_btn" alt="" id="ajaxApiSelectTimeBtn">
                                </button>
                            </div>
                            <div id="ajaxApiTable"></div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>


    <div class="maxy_popup_common_wrap" id="maxyPopupWrap"></div>
</div>
<%--suppress ES6ConvertVarToLetConst --%>
<script>
    var PA0000 = {
        v: {
            //차트 및 테이블 클래스 객체. 차트 객체 아님 주의
            class: {
                coreVital: null,
                apiError: null,
                ajaxPage: null,
                ajaxApi: null,
                webVitalInstance: null,
                waterfallInstance: null,
                eventTimeLineInstance: null,
                apiHitmap: null,
                pageHitmap: null
            },
            // 요청 별 uuid 를 설정하기 위함
            uuid: {
                pie: null
            },
            time: {
                from: null,
                to: null
            }
        },
        init: {
            event() {
                const {v, func} = PA0000

                // 검색 버튼 클릭 이벤트 등록
                $('#searchButton').on('click', function () {
                    func.cmm.doSearch();
                });

                // Core Vital 탭 클릭 이벤트 등록
                func.addEvent.coreVitalTab()

                // Core Vital 선택시간 새로고침 버튼 클릭
                $('#coreVitalSelectTimeBtn').on('click', function () {
                    // 이미 시간값이 같다면 동작할 필요 없음
                    if (v.time.from === v.class.coreVital.from && v.time.to === v.class.coreVital.to) {
                        return
                    }
                    // class의 선택 시간값 초기화
                    v.class.coreVital.from = v.time.from
                    v.class.coreVital.to = v.time.to

                    // 시간표기
                    $('#coreVitalSelectTime').text(util.timestampToDateTime(v.time.from) + ' ~ ' + util.timestampToDateTime(v.time.to))

                    // 테이블 데이터 재조회
                    func.fetch.coreVital.getVitalListByPage()
                })

                // API Error 선택시간 새로고침 버튼 클릭
                $('#apiErrorSelectTimeBtn').on('click', function () {
                    // 이미 시간값이 같다면 동작할 필요 없음
                    if (v.time.from === v.class.apiError.from && v.time.to === v.class.apiError.to) {
                        return
                    }
                    // class의 선택 시간값 초기화
                    v.class.apiError.from = v.time.from
                    v.class.apiError.to = v.time.to

                    // 시간표기
                    $('#apiErrorSelectTime').text(util.timestampToDateTime(v.time.from) + ' ~ ' + util.timestampToDateTime(v.time.to))

                    // 테이블 데이터 재조회
                    func.fetch.apiError.getApiErrorList()
                })

                // Ajax Page 선택시간 새로고침 버튼 클릭
                $('#ajaxPageSelectTimeBtn').on('click', function () {
                    // 이미 시간값이 같다면 동작할 필요 없음
                    if (v.time.from === v.class.pageHitmap.from && v.time.to === v.class.pageHitmap.to) {
                        return
                    }
                    // class의 선택 시간값 초기화
                    v.class.pageHitmap.from = v.time.from
                    v.class.pageHitmap.to = v.time.to

                    // 시간표기
                    $('#ajaxPageSelectTime').text(util.timestampToDateTime(v.time.from) + ' ~ ' + util.timestampToDateTime(v.time.to))

                    // 테이블 데이터 재조회
                    func.fetch.ajax.getLogListByTime('PAGE')
                })

                // Ajax API 선택시간 새로고침 버튼 클릭
                $('#ajaxApiSelectTimeBtn').on('click', function () {
                    // 이미 시간값이 같다면 동작할 필요 없음
                    if (v.time.from === v.class.apiHitmap.from && v.time.to === v.class.apiHitmap.to) {
                        return
                    }
                    // class의 선택 시간값 초기화
                    v.class.apiHitmap.from = v.time.from
                    v.class.apiHitmap.to = v.time.to

                    // 시간표기
                    $('#ajaxApiSelectTime').text(util.timestampToDateTime(v.time.from) + ' ~ ' + util.timestampToDateTime(v.time.to))

                    // 테이블 데이터 재조회
                    func.fetch.ajax.getLogListByTime('API')
                })
            },

            async created() {
                const {v, func} = PA0000
                updateContent()

                tippy('.img_icon_wide_btn', {
                    content: i18next.tns('common.msg.initSelectTime'),
                    arrow: false,
                    placement: 'bottom',
                    allowHTML: true,
                    theme: 'maxy-tooltip'
                })

                // app info 설정, pIdCb: packageNm_a onChange 콜백함수
                await appInfo.append({
                    pId: 'packageNm_a',
                    oId: 'osType_a',
                    pIdCb: func.addEvent.appInfoPackageNmCb,
                    oIdCb: func.addEvent.appInfoOsTypeCb
                })

                // 상단 search 팝업 생성, type에 따라 search팝업 구성
                await search.load()
                await func.cmm.setSearchType()

                v.class.coreVital = new CoreVital({targetPage: PA0000})

                v.class.apiError = new ApiError({targetPage: PA0000})
                v.class.ajaxPage = new AjaxPageAnalysis({targetPage: PA0000})
                v.class.ajaxApi = new AjaxApiAnalysis({targetPage: PA0000})

                v.class.pageHitmap = new Hitmap('ajaxPageChart', {targetPage: PA0000})
                v.class.apiHitmap = new Hitmap('ajaxApiChart', {targetPage: PA0000})

                // 각 class의 선택시간 초기화
                func.cmm.initClassTime()

                func.fetch.all.allDataFetch()
            }
        },

        func: {
            cmm: {
                // search팝업 초기 세팅
                async setSearchType() {
                    const {v, func} = PA0000

                    // 현재 시간에서 1시간 전을 시작 시간으로 설정
                    const now = new Date();
                    const oneHourAgo = new Date(now.getTime() - 3600000); // 1시간 전

                    // 초기값 설정
                    const fromDate = util.getDateToString(oneHourAgo)            // 시작 날짜 (YYYY-MM-DD)
                    const toDate = util.getDateToString(now)                     // 종료 날짜 (YYYY-MM-DD)
                    const fromHour = ('0' + oneHourAgo.getHours()).slice(-2)     // 시작 시간 (HH 형식)
                    const fromMinute = ('0' + oneHourAgo.getMinutes()).slice(-2) // 시작 분 (mm 형식)
                    const toHour = ('0' + now.getHours()).slice(-2)              // 종료 시간 (HH 형식)
                    const toMinute = ('0' + now.getMinutes()).slice(-2)          // 종료 분 (mm 형식)

                    v.time.from = util.dateStringToTimestamp(fromDate + fromHour + fromMinute, false)
                    v.time.to = util.dateStringToTimestamp(toDate + toHour + toMinute, true)

                    $('#searchFromDtHH').val(fromHour)
                    $('#searchToDtHH').val(toHour)
                    $('#searchFromDtmm').val(fromMinute)
                    $('#searchToDtmm').val(toMinute)

                    // 캘린더 초기화
                    search.v.fromCalendar = calendar.init({
                        id: 'searchFromDt',
                        type: 'single',
                        fn: function (dates) {
                            // 날짜 선택 후 콜백
                            $('#searchFromDt').val(dates[0])
                        },
                        created: async () => {
                            $('#searchFromDt').val(util.timestampToDate(v.time.from))
                        }
                    })

                    search.v.toCalendar = calendar.init({
                        id: 'searchToDt',
                        type: 'single',
                        fn: function (dates) {
                            // 날짜 선택 후 콜백
                            $('#searchToDt').val(dates[0])
                        },
                        created: async () => {
                            $('#searchToDt').val(util.timestampToDate(v.time.to))
                        }
                    })
                },
                // 시간 조회 눌렀을때
                async doSearch() {
                    const {v, func} = PA0000

                    // 시간범위 from to - 시 분
                    const $searchFromDtHH = $('#searchFromDtHH')
                    const $searchToDtHH = $('#searchToDtHH')
                    const $searchFromDtmm = $('#searchFromDtmm')
                    const $searchToDtmm = $('#searchToDtmm')

                    // 시간, 분 값 2자리로 고정
                    $searchFromDtHH.val($searchFromDtHH.val().padStart(2, '0'))
                    $searchToDtHH.val($searchToDtHH.val().padStart(2, '0'))
                    $searchFromDtmm.val($searchFromDtmm.val().padStart(2, '0'))
                    $searchToDtmm.val($searchToDtmm.val().padStart(2, '0'))

                    // 시간 값
                    v.time.from = util.dateStringToTimestamp($('#searchFromDt').val() + $searchFromDtHH.val() + $searchFromDtmm.val(), false)
                    v.time.to = util.dateStringToTimestamp($('#searchToDt').val() + $searchToDtHH.val() + $searchToDtmm.val(), true)

                    func.cmm.allClearData()
                    // 각 class의 선택시간 초기화
                    func.cmm.initClassTime()
                    // 전체 차트 조회
                    func.fetch.all.allDataFetch()
                },
                initClassTime() {
                    const {v} = PA0000

                    // 각 class의 선택 시간값 초기화
                    v.class.coreVital.from = v.time.from
                    v.class.coreVital.to = v.time.to
                    v.class.apiError.from = v.time.from
                    v.class.apiError.to = v.time.to

                    v.class.pageHitmap.from = v.time.from
                    v.class.pageHitmap.to = v.time.to
                    v.class.apiHitmap.from = v.time.from
                    v.class.apiHitmap.to = v.time.to
                },
                allClearData() {
                    const {v} = PA0000

                    v.class.coreVital.clear()
                    v.class.apiError.clear()
                    v.class.pageHitmap.clear()
                    v.class.apiHitmap.clear()
                    v.class.ajaxPage.clear()
                    v.class.ajaxApi.clear()
                }
            },
            search: {},
            draw: {
                coreVital: {
                    tablePopup(e, row) {
                        const {v, v: {class: {coreVital}}} = PA0000
                        let {from, to} = coreVital

                        const params = {
                            'from': from,
                            'to': to,
                            'osType': sessionStorage.getItem('osType'),
                            'appVer': sessionStorage.getItem('appVer') ? sessionStorage.getItem('appVer') : 'A',
                            'serverType': sessionStorage.getItem('serverType'),
                            'packageNm': sessionStorage.getItem('packageNm'),
                            'reqUrl': row.getData().reqUrl,
                            'mxPageId': row.getData().mxPageId,
                            'offsetIndex': 1,
                            'downloadYn': false,
                            'osVer': 'A'
                        }

                        if (util.checkParam(params)) {
                            return
                        }

                        const options = {
                            appendId: 'maxyPopupWrap',
                            id: 'logDetail',
                            param: params,
                            reqUrl: row.getData().reqUrl,
                            data: row.getData(),
                            popupType: 'corevital'
                        }
                        new MaxyPopupLogListWithWaterfall(options)
                    }
                },
                apiError: {
                    tablePopup(e, row) {
                        const {v, v: {class: {apiError}}} = PA0000

                        let {from, to} = apiError

                        const params = {
                            'from': from,
                            'to': to,
                            'osType': sessionStorage.getItem('osType'),
                            'appVer': sessionStorage.getItem('appVer') ? sessionStorage.getItem('appVer') : 'A',
                            'serverType': sessionStorage.getItem('serverType'),
                            'packageNm': sessionStorage.getItem('packageNm'),
                            'reqUrl': row.getData().reqUrl,
                            'statusCode': row.getData().statusCode
                        }

                        if (util.checkParam(params)) {
                            return
                        }

                        const options = {
                            appendId: 'maxyPopupWrap',
                            id: 'apiErrorDetail',
                            param: params
                        }
                        new MaxyPopupApiError(options)
                    }
                },
                ajaxApi: {
                    tablePopup(e, row, time) {
                        const {v, v: {class: {apiHitmap}}} = PA0000

                        let {from, to} = apiHitmap

                        if (from === null || to === null) {
                            ({from, to} = v.time)
                        }

                        const params = {
                            'packageNm': sessionStorage.getItem('packageNm'),
                            'serverType': sessionStorage.getItem('serverType'),
                            'osType': sessionStorage.getItem('osType'),
                            'from': from,
                            'to': to,
                            'reqUrl': row.getData().reqUrl,
                        }

                        if (time) {
                            params.durationFrom = time.durationFrom
                            params.durationTo = time.durationTo
                        }

                        if (util.checkParam(params)) {
                            return
                        }

                        const options = {
                            appendId: 'maxyPopupWrap',
                            id: 'ajaxPageAnalysis',
                            param: params,
                            reqUrl: row.getData().reqUrl,
                            popupType: "API"
                        }
                        new MaxyPopupAnalysisAjaxApi(options)
                    }
                },
                ajaxPage: {
                    tablePopup(e, row, time) {
                        const {v, v: {class: {pageHitmap}}} = PA0000
                        let {from, to} = pageHitmap

                        const params = {
                            'from': from,
                            'to': to,
                            'durationFrom': time.durationFrom,
                            'durationTo': time.durationTo,
                            'osType': sessionStorage.getItem('osType'),
                            'appVer': sessionStorage.getItem('appVer') ? sessionStorage.getItem('appVer') : 'A',
                            'serverType': sessionStorage.getItem('serverType'),
                            'packageNm': sessionStorage.getItem('packageNm'),
                            'reqUrl': row.getData().reqUrl,
                            'mxPageId': row.getData().mxPageId,
                            'offsetIndex': 1,
                            'downloadYn': false,
                            'osVer': 'A'
                        }

                        if (util.checkParam(params)) {
                            return
                        }

                        const options = {
                            appendId: 'maxyPopupWrap',
                            id: 'logDetail',
                            param: params,
                            reqUrl: row.getData().reqUrl,
                            data: row.getData(),
                            popupType: 'page'
                        }
                        new MaxyPopupLogListWithWaterfall(options)
                    }
                },
            },
            fetch: {
                all: {
                    allDataFetch() {
                        const {func} = PA0000

                        // coreVital 차트 및 테이블 데이터 조회
                        func.fetch.coreVital.getCoreVital()
                        func.fetch.coreVital.getVitalListByPage()

                        // apiError 차트 및 테이블 데이터 조회
                        func.fetch.apiError.getApiErrorChart()
                        func.fetch.apiError.getApiErrorList()

                        // ajax 분석 차트 및 테이블 데이터 조회
                        func.fetch.ajax.getApiHitmap()
                        func.fetch.ajax.page.getLogListByTime()
                        func.fetch.ajax.api.getLogListByTime()
                    }
                },
                coreVital: {
                    // core vital 데이터 조회
                    getCoreVital() {
                        const {v} = PA0000
                        const coreVital = v.class.coreVital

                        let {from, to} = v.time

                        const param = {
                            packageNm: $('#packageNm_a').val(),
                            serverType: $('#packageNm_a option:checked').data('server-type'),
                            osType: $('#osType_a').val(),
                            from: from,
                            to: to
                        }

                        cursor.show(false, '.core_vital_wrap.chart')
                        ajaxCall('/pa/0000/v2/getCoreVital.maxy', param, {disableCursor: true})
                            .then((data) => {
                                const {chart, core} = data
                                coreVital.setCoreVitalChartData(core)
                                coreVital.setLineChartData(chart)
                            })
                            .catch(error => {
                                console.log(error.msg)
                            })
                            .finally(() => {
                                cursor.hide('.core_vital_wrap.chart')
                            })
                    },
                    // Page 별 웹 Vitals 집계 목록 조회
                    getVitalListByPage() {
                        const {v, v: {class: {coreVital}}} = PA0000

                        let {from, to} = coreVital

                        const param = {
                            packageNm: $('#packageNm_a').val(),
                            serverType: $('#packageNm_a option:checked').data('server-type'),
                            osType: $('#osType_a').val(),
                            from: from,
                            to: to
                        }

                        // 조회시간 표기
                        $('#coreVitalSelectTime').text(util.timestampToDateTime(from) + ' ~ ' + util.timestampToDateTime(to))
                        // 기본 시간과 table조회시간이 같으면 새로고침 버튼 숨기기
                        /*if (v.time.from === from && v.time.to === to) {
                            $('#coreVitalSelectTimeBtn').hide()
                        } else {
                            $('#coreVitalSelectTimeBtn').show()
                        }*/

                        cursor.show(false, '.core_vital_wrap.table')
                        coreVital.clearTable()
                        ajaxCall('/pa/0000/v2/getVitalListByPage.maxy', param, {disableCursor: true})
                            .then((data) => {
                                coreVital.setTableData(data)
                            })
                            .catch(error => {
                                console.log(error.msg)
                            })
                            .finally(() => {
                                cursor.hide('.core_vital_wrap.table')
                            })
                    }
                },
                apiError: {
                    // API 호출 실패 수치 차트 데이터 조회
                    getApiErrorChart() {
                        const {v} = PA0000
                        const apiError = v.class.apiError

                        let {from, to} = v.time

                        const param = {
                            packageNm: $('#packageNm_a').val(),
                            serverType: $('#packageNm_a option:checked').data('server-type'),
                            osType: $('#osType_a').val(),
                            from: from,
                            to: to
                        }

                        cursor.show(false, '.error_wrap.chart')
                        ajaxCall('/pa/0000/v2/getApiErrorChart.maxy', param, {disableCursor: true})
                            .then((data) => {
                                apiError.setErrorChartData(data)
                            })
                            .catch(error => {
                                console.log(error.msg)
                            })
                            .finally(() => {
                                cursor.hide('.error_wrap.chart')
                            })
                    },
                    // API 호출 실패 상세 목록
                    getApiErrorList() {
                        const {v, v: {class: {apiError}}} = PA0000

                        let {from, to} = apiError

                        const param = {
                            packageNm: $('#packageNm_a').val(),
                            serverType: $('#packageNm_a option:checked').data('server-type'),
                            osType: $('#osType_a').val(),
                            from: from,
                            to: to
                        }

                        // 조회시간 표기
                        $('#apiErrorSelectTime').text(util.timestampToDateTime(from) + ' ~ ' + util.timestampToDateTime(to))
                        // 기본 시간과 table조회시간이 같으면 새로고침 버튼 숨기기
                        /*if (v.time.from === from && v.time.to === to) {
                            $('#apiErrorSelectTimeBtn').hide()
                        } else {
                            $('#apiErrorSelectTimeBtn').show()
                        }*/

                        cursor.show(false, '.error_wrap.table')
                        apiError.clearTable()
                        ajaxCall('/pa/0000/v2/getApiErrorList.maxy', param, {disableCursor: true})
                            .then((data) => {
                                apiError.setTableData(data)
                            })
                            .catch(error => {
                                console.log(error.msg)
                            })
                            .finally(() => {
                                cursor.hide('.error_wrap.table')
                            })
                    },
                },
                ajax: {
                    // 새로운 통합 함수 추가
                    getLogListByTime(type, minTime, maxTime, minDuration, maxDuration) {
                        const {v} = PA0000
                        const ajaxPage = v.class.ajaxPage
                        const ajaxApi = v.class.ajaxApi

                        // 파라미터로 전달받은 시간 범위가 있으면 사용하고, 없으면 기본값 사용
                        let from, to
                        if (minTime && maxTime) {
                            from = minTime
                            to = maxTime
                        } else {
                            // 기존 방식대로 시간 범위 가져오기
                            ({from, to} = v.time)
                        }

                        const param = {
                            packageNm: $('#packageNm_a').val(),
                            serverType: $('#packageNm_a option:checked').data('server-type'),
                            osType: $('#osType_a').val(),
                            from: from,
                            to: to,
                            type: type.toUpperCase() // 'PAGE' 또는 'API'로 변환
                        }

                        if ((minDuration || minDuration === 0) && maxDuration) {
                            param.durationFrom = minDuration
                            param.durationTo = maxDuration
                        }

                        if (type.toUpperCase() === 'PAGE') {
                            // 조회시간 표기
                            $('#ajaxPageSelectTime').text(util.timestampToDateTime(from) + ' ~ ' + util.timestampToDateTime(to))
                            cursor.show(false, '.ajax_wrap.table.page')
                            ajaxPage.clear()
                        } else if (type.toUpperCase() === 'API') {
                            // 조회시간 표기
                            $('#ajaxApiSelectTime').text(util.timestampToDateTime(from) + ' ~ ' + util.timestampToDateTime(to))
                            cursor.show(false, '.ajax_wrap.table.api')
                            ajaxApi.clear()
                        }

                        ajaxCall('/pa/0000/v2/getHitmapLogList.maxy', param, {disableCursor: true})
                            .then((data) => {
                              //  타입에 따라 다른 처리
                                if (type.toUpperCase() === 'PAGE') {
                                    ajaxPage.setTableData(data)
                                } else if (type.toUpperCase() === 'API') {
                                    ajaxApi.setTableData(data)
                                }
                            })
                            .catch(error => {
                                console.log(error.msg)
                            })
                            .finally(() => {
                                if (type.toUpperCase() === 'PAGE') {
                                    cursor.hide('.ajax_wrap.table.page')
                                } else if (type.toUpperCase() === 'API') {
                                    cursor.hide('.ajax_wrap.table.api')
                                }
                            })
                    },
                    getApiHitmap() {
                        const {v} = PA0000
                        const pageHitmap = v.class.pageHitmap
                        const apiHitmap = v.class.apiHitmap

                        let {from, to} = v.time

                        // 'page'와 'api' 타입을 배열로 정의
                        const types = ['page', 'api']

                        // forEach를 사용하여 각 타입별로 API 호출
                        types.forEach(type => {
                            // from과 to의 시간차이로 interval 계산
                            const timeDiffHours = (to - from) / (1000 * 60 * 60);
                            let interval

                            if (timeDiffHours <= 2) { // 2시간 이하 1분
                                interval = 1
                            } else if (timeDiffHours <= 10) { // 10시간 이하 5분
                                interval = 5
                            } else if (timeDiffHours <= 24) { // 24시간 이하 10분
                                interval = 10
                            } else { // 그 이상 30분
                                interval = 30
                            }

                            const param = {
                                packageNm: $('#packageNm_a').val(),
                                serverType: $('#packageNm_a option:checked').data('server-type'),
                                osType: $('#osType_a').val(),
                                from: from,
                                to: to,
                                type: type, // 현재 반복 중인 타입 설정
                                interval: interval // from - to 시간 차이에 따른 interval
                            }

                            if (type === 'page') {
                                cursor.show(false, '.ajax_wrap.chart.page')
                            } else if (type === 'api') {
                                cursor.show(false, '.ajax_wrap.chart.api')
                            }

                            ajaxCall('/pa/0000/v2/getApiHitmap.maxy', param, {disableCursor: true})
                                .then((data) => {
                                  //  타입에 따라 다른 메서드 호출
                                    if (type === 'page') {
                                        pageHitmap.setData(data, interval, type)
                                    }
                                    if (type === 'api') {
                                        apiHitmap.setData(data, interval, type) // 'api' 타입일 때 ajaxApi.setChartData 호출
                                    }
                                })
                                .catch(error => {
                                    console.log(error.msg)
                                })
                                .finally(() => {
                                    if (type === 'page') {
                                        cursor.hide('.ajax_wrap.chart.page')
                                    } else if (type === 'api') {
                                        cursor.hide('.ajax_wrap.chart.api')
                                    }
                                })
                        })
                    },
                    page: {
                        getLogListByTime(minTime, maxTime) {
                            PA0000.func.fetch.ajax.getLogListByTime('PAGE', minTime, maxTime)
                        },
                    },
                    api: {
                        getLogListByTime() {
                            PA0000.func.fetch.ajax.getLogListByTime('API')
                        }
                    }
                }
            },
            get: {},
            set: {},
            addEvent: {
                // Core Vital 탭 클릭 이벤트
                coreVitalTab() {
                    const {v} = PA0000
                },

                // appInfo.js에서 #packageNm_a의 onChange 후 콜백함수
                async appInfoPackageNmCb() {
                    const {func} = PA0000

                    // os type, app ver 초기화
                    sessionStorage.setItem('osType', 'A')
                    sessionStorage.setItem('appVer', 'A')

                    func.cmm.allClearData()
                    func.fetch.all.allDataFetch()
                },

                // appInfo.js에서 #osType_a의 onChange 후 콜백함수
                async appInfoOsTypeCb() {
                    const {func} = PA0000

                    // os type, app ver 초기화
                    sessionStorage.setItem('appVer', 'A')

                    func.cmm.allClearData()
                    func.fetch.all.allDataFetch()
                }
            }
        }
    }

    PA0000.init.created().then(PA0000.init.event)
</script>
