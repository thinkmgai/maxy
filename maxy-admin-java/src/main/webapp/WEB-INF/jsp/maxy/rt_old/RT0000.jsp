<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%--suppress CssUnusedSymbol --%>
<style>
    .calendar_wrap::before {
        content: '';
    }
    @page {
        size: A4 portrait; /*A4*/
        margin: 15px 5px 15px 5px
    }

    @media print {
        .report_group {
            margin-top: 0 !important;
        }

        .tabulator-row , .tabulator-header {
            page-break-inside:avoid;
            page-break-after:auto;
        }

        div {
            -webkit-print-color-adjust:exact;
        }

        .main_header, .left_side_wrap {
            display: none
        }
    }

    .contents_wrap {
        padding: 0;
    }

    .mt16 {
        margin-top: 16px;
    }

    .rt_wrap {
        display: flex;
        height: 100%;
    }

    /* icon */
    .rt_wrap i {
        display: inline-block;
        background-repeat: no-repeat;
    }

    .rt_wrap i.title {
        width: 13px;
        height: 13px;
        background-image: url("/images/maxy/icon-info.svg");
    }

    .rt_wrap i.print {
        width: 18px;
        height: 19px;
        background-image: url('/images/maxy/icon-print.svg');
    }

    .rt_wrap i.csv {
        width: 15px;
        height: 18px;
        background-image: url('/images/maxy/icon-csv-download.svg');
    }

    .rt_wrap i.pdf {
        width: 15px;
        height: 18px;
        background-image: url('/images/maxy/icon-pdf.svg');
    }

    .rt_wrap .left_side_wrap {
        background-color: var(--black-7);
        width: 340px;
        padding: 20px 25px;
    }

    .rt_wrap .right_side_wrap {
        width: 93%;
        background-color: white;
        padding: 20px;
    }

    .rt_wrap .right_side_wrap.auto_height {
        height: calc(100vh - 40px);
        overflow: auto;
    }

    /* left side wrap */
    .rt_wrap .app_info_group {
        display: flex;
        flex-direction: column;
        width: 100%;
        margin-bottom: 8px;
    }

    .rt_wrap .app_info_group .app_info_wrap {
        display: grid;
        gap: 5px;
        grid-template-columns: 30px auto;
        align-items: center;
        width: 100%;
        margin-bottom: 8px;
    }

    .rt_wrap .app_info_wrap label {
        font-size: 13px;
    }

    .rt_wrap .app_info_wrap select {
        border: 1px solid #E1E4E8;
        width: 250px;
        text-align: center;
    }

    .rt_wrap .calendar_wrap {
        margin-bottom: 18px;
    }

    .rt_wrap .btn_wrap {
        margin-top: 16px;
    }

    .rt_wrap .btn_wrap button {
        width: 100%;
    }

    /* right size wrap */
    .rt_wrap .top_header {
        margin-bottom: 48px;
    }

    .rt_wrap .top_header .header_left h5 {
        margin-left: 15px;
        font-weight: 500;
        font-size: 16px;
        width: 100px;
        border-right: 1px solid #C4C4C4;
    }

    .rt_wrap .top_header .header_left .search_filter {
        margin-top: 45px;
        display: flex;
        align-items: center;
    }

    .rt_wrap .top_header .header_left .search_filter .search_text {
        margin-left: 5px;
    }

    .rt_wrap .top_header .header_left .search_filter span {
        font-size: 14px;
    }

    .rt_wrap .top_header .header_left .date_icon {
        content: url(/images/maxy/icon-calendar.svg);
        padding-right: 6px;
        height: 14px;
        font-weight: 500;
    }

    .rt_wrap .top_header .header_left .sub_title {
        color: #7B7B7B;
        margin-left: 15px !important;
    }

    .rt_wrap .top_header .header_right {
        display: flex;
    }

    .rt_wrap .btn_down {
        color: var(--color-common-button-light);
        font-weight: 700;
        background: #FFFFFF;
        border: 1px solid #DDE0E5;
        border-radius: 5px;
        min-width: 140px;
        max-width: 180px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
    }

    .rt_wrap .top_header .header_right i {
        background-repeat: no-repeat;
        width: 18px;
        height: 19px;
        display: inline-block;
        margin-left: 11px;
    }

    .rt_wrap .report_wrap {
        margin-bottom: 54px;
    }

    .rt_wrap .icon_info_box {
        background-color: white;
    }

    .rt_wrap .rt_title_wrap {
        display: flex;
        gap: 6px;
    }

    .rt_wrap .rt_title_wrap > span {
        font-size: var(--font-l-size);
        font-weight: var(--bold);
    }

    .rt_wrap .grid_box_wrap {
        width: 100%;
        height: 85px;
    }

    .rt_wrap .tb_title {
        display: flex;
        margin-bottom: 16px;
        align-items: flex-end;
        justify-content: space-between;
    }

    .rt_wrap .tb_title .left {
        display: flex;
        align-items: center;
    }

    .rt_wrap .tb_title .left h5 {
        margin-left: 6px;
        font-weight: 500;
        font-size: 15px;
    }

    .rt_wrap .tb_title .right .right_wrap {
        display: flex;
        align-items: center;
    }

    .rt_wrap .tb_title .right select {
        width: 256px;
        height: 32px;
        text-align: center;
        border: 1px solid #E1E4E8;
    }

    .rt_wrap .report_table {
        width: 100%;
    }

    .rt_wrap .report_table thead {
        border-bottom: 1px solid #E3E5E8;
    }

    .rt_wrap .report_table thead th {
        font-size: 14px;
        height: 45px;
        font-weight: 500;
    }

    .rt_wrap .report_table tbody tr {
        height: 40px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .rt_wrap .report_table tbody td {
        overflow: hidden;
        height: 18px;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .rt_wrap .report_table tr,
    .rt_wrap .report_table th,
    .rt_wrap .report_table td {
        display: flex;
        justify-content: space-around;
        align-items: center;
        width: 100%;
    }

    .rt_wrap .report_table.border {
        border-spacing: 1px;
    }

    .rt_wrap .report_table.border th {
        border-collapse: collapse;
        border-bottom: 1px solid white;
    }

    .rt_wrap .report_table.border th:not(:last-child) {
        border-right: 1px dashed white;
    }

    .rt_wrap .report_chart_wrap {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        height: 300px;
    }

    .rt_wrap .report_chart_pie {
        position: relative;
    }

    .rt_wrap .round_tab {
        cursor: pointer;
        background: #E6EBF5;
        border-radius: 20px;
        display: flex;
        align-items: center;
        height: 30px;
        padding: 3px;
        margin-right: 30px;
    }

    .rt_wrap .round_tab li {
        color: #848EA0;
        width: 80px;
        line-height: 24px;
        text-align: center;
    }

    .rt_wrap .round_tab li.selected {
        color: #000000;
        background-color: #FFF;
        border-radius: 20px;
        font-weight: var(--bold);
    }

    .rt_wrap .round_tab li:nth-of-type(1).selected {
        animation: moveLeft;
        animation-duration: 0.3s;
    }

    .rt_wrap .round_tab li:nth-of-type(2).selected {
        animation: moveRight;
        animation-duration: 0.3s;
    }

    .rt_wrap .pie_wrap {
        width: 100%;
        margin-top: 20px;
    }

    .rt_wrap .version_wrap {
        display: grid;
        margin-top: 16px;
        gap: 1.5em;
    }

    .rt_wrap .version_wrap .version_box {
        background: #FFFFFF;
        border-radius: var(--radius);
    }

    .rt_wrap .version_header {
        display: flex;
        align-items: center;
        margin-left: 16px;
        margin-bottom: 16px;
        gap: 10px;
    }

    .rt_wrap .version_header > .version_header_separator {
        border-left: 3.5px solid black;
        margin-left: 7px;
        height: 15px;
    }

    .version_header .version {
        font-weight: 500;
        font-size: 14px;
    }

    .rt_wrap .version_wrap .version_box .version_contents .content {
        margin-bottom: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .rt_wrap .version_wrap .content .sub_title {
        color: #4B4B4B;
        font-size: 14px;
        line-height: 20px;
        display: flex;
        align-items: center;
    }

    .rt_wrap .version_wrap .content .sub_title > i {
        margin-right: 5px;
    }

    .rt_wrap .version_wrap .content .sub_value {
        font-size: 14px;
        line-height: 20px;
        font-weight: 500;
    }

    @keyframes moveLeft {
        0% {
            transform: translateX(100%);
        }
        100% {
            transform: translateX(0%);
        }
    }

    @keyframes moveRight {
        0% {
            transform: translateX(-100%);
        }
        100% {
            transform: translateX(0%);
        }
    }

    @media (max-width: 1300px) {
        .rt_wrap .grid_box_wrap {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1em;
            grid-template-rows: repeat(2, 230px);
            align-items: center;
            justify-content: space-between;
            height: auto;
            width: 100%;
        }

        .rt_wrap .usability_wrap {
            display: block;
        }

        .rt_wrap .pie_wrap {
            width: 100%;
            display: block;
            margin-top: 20px;
            text-align: center;
        }

        .rt_pie {
            width: 100%;
        }
    }

    .report_group {
        position: relative;
        width: 297mm;
        min-height: 290mm;
        padding: 1.5em 2em 1.5em 2em;
        margin: 10mm auto;
        border: 1px solid var(--color-border-out-light);
        background: white;
    }

    .vanilla-calendar {
        width: 100%;
    }

    .report_group .report_logo {
        width: 80px;
        position: absolute;
        top: -9px;
        content: url("/images/maxy/maxy_BI_WH_mini.svg")
    }

    .report_group .report_title {
        text-align: center;
        padding-top: 5px;
        font-size: 20px;
        font-weight: 700;
    }

    .separator {
        width: 1px;
        height: 100%;
        border-left: 1px solid var(--color-border-in-light);
    }

    .log_info_box {
        padding: 10px;
        height: 85px;
    }

    .log_info_text_wrap .center_content {
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        gap: 7px;
    }

    .header_right {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
    }

    .no-ellipsis {
        white-space: nowrap !important;
        text-overflow: initial !important;
        overflow: initial !important;
    }

    .report_wrap .report_table_wrap {
        visibility: hidden;
        height: 50px;
        border-radius: var(--radius);
        border: 0;
        box-shadow: 0 0 0 1px #e3e5e8, 0 1px 2px 0 rgba(0, 0, 0, .04);
    }

    .tabulator-placeholder[tabulator-render-mode=virtual] {
        min-height: 100px !important;
    }

    .tabulator .tabulator-tableholder {
        height: auto !important;
    }

    .tabulator .tabulator-header .tabulator-col.tabulator-sortable .tabulator-col-title {
        padding-right: 0;
    }

    .tabulator-row .tabulator-cell {
        justify-content: center;
    }

    .tabulator-row .tabulator-cell[tabulator-field="avgCpuUsage"] {
        justify-content: center;
    }

    .tabulator .tabulator-header .tabulator-col {
        align-items: baseline;
    }

    .tabulator .tabulator-header .tabulator-col.center-align-header {
        align-items: center !important;
    }

    .tabulator-cell.left-align {
        justify-content: start !important;
    }

    .left-align .tabulator-col-content {
        margin-left: 0;
    }

    .right-align .tabulator-col-content {
        margin-left: auto;
    }

    .center-align .tabulator-col-content {
        width: 100%;
        display: flex;
        justify-content: center;
    }

    .tabulator-cell.center-align {
        justify-content: center !important;
    }

    .tabulator-cell.right-align {
        justify-content: end !important;
    }

    .tabulator-cell[tabulator-field="errorMsg"],
    .tabulator-cell[tabulator-field="causeBy"],
    .tabulator-cell[tabulator-field="reqUrl"],
    .tabulator-cell[tabulator-field="deviceModel"] {
        overflow: auto;
    }

    .maxy_cursor_dots {
        z-index: 150;
        position: absolute;
        left: 50%;
        top: 70%;
        transform: translate(-50%, -50%);
    }

    .rt_wrap .status_info,
    .rt_wrap .total_ver_info,
    .rt_wrap .app_ver_info,
    .rt_wrap .loading_summary_info,
    .rt_wrap .loading_top_info,
    .rt_wrap .response_summary_info,
    .rt_wrap .response_top_info,
    .rt_wrap .page_view_info,
    .rt_wrap .error_info,
    .rt_wrap .crash_info,
    .rt_wrap .device_error_info,
    .rt_wrap .device_crash_info {
        position: relative;
    }

    .mt16 .desc {
        color: var(--color-grid-title-light-2);
        margin: 0 3px -20px auto;
    }
</style>
<!-- 보고서 -->
<div class="rt_wrap">
    <%-- left side --%>
    <div class="left_side_wrap">
        <%-- app info wrap --%>
        <div class="app_info_group">
            <div class="app_info_wrap">
                <label for="packageNm" data-t="common.text.app"></label>
                <select id="packageNm"></select>
            </div>
            <div class="app_info_wrap">
                <label for="osType">OS</label>
                <select id="osType"></select>
            </div>
            <div class="app_info_wrap">
                <label for="appVer" data-t="common.text.version"></label>
                <select id="appVer"></select>
            </div>
        </div>
        <%-- calendar --%>
        <div class="calendar_wrap">
            <div id="rtCalendar"></div>
        </div>

        <div class="btn_wrap">
            <button class="btn_common" id="btnSearch" data-t="common.text.search"></button>
        </div>
    </div>
    <%-- right side --%>
    <div class="right_side_wrap enable_scrollbar auto_height" id="reportArea">
        <%-- header --%>
        <div class="header_right">
            <button class="btn_down"
                    id="btnPrint"
                    onclick="RT0000.func.startPrint()">
                <span data-t="common.btn.print"></span>
                <i class="print"></i>
            </button>
            <a
                    class="btn_down"
                    id="btnCsv"
                    target="_blank"
            >
                <span data-t="management.alias.btn.csvDownload"></span>
                <i class="csv"></i>
            </a>
            <a
                    class="btn_down"
                    id="btnErrorCsv"
                    target="_blank"
            >
                <span data-t="management.alias.btn.csvErrorDownload"></span>
                <i class="csv"></i>
            </a>
        </div>
        <%-- report group --%>
        <div class="report_group" id="reportGroupArea">
            <div class="top_header">
                <img class="report_logo" src="" alt="">
                <div class="report_title" data-t="common.text.reportTitle"></div>
                <%-- left wrap--%>
                <div class="header_left">
                    <%-- title --%>
                    <%-- search filter --%>
                    <div class="search_filter">
                        <span class="date_icon"></span>
                        <span class="date" id="dateText"></span>
                        <span class="sub_title" data-t="common.text.target"></span>
                        <span>:</span>
                        <span class="search_text" id="packageNmText"></span>
                        <span class="sub_title">OS:</span>
                        <span class="search_text" id="osTypeText"></span>
                        <span class="sub_title" data-t="common.text.version"></span>
                        <span>:</span>
                        <span class="search_text" id="appVerText"></span>
                    </div>
                </div>
            </div>
            <%-- 기본 정보: Status --%>
            <div class="report_wrap status_info">
                <div class="rt_title_wrap">
                    <img alt="" class="maxy_popup_analysis_icon">
                    <span data-t="common.text.status"></span>
                </div>
                <div class="mt16">
                    <div class="report_table_wrap" id="statusInfo"></div>
                </div>
            </div>

            <%-- 버전별 분석 --%>
            <div class="report_wrap">
                <div class="rt_title_wrap">
                    <img alt="" class="maxy_popup_analysis_icon">
                    <span data-t="common.text.appVersion"></span>
                </div>
                <div class="mt16">
                    <div class="total_ver_info">
                        <div class="version_header mt16">
                            <div class="circle"></div>
                            <div class="version" data-t="common.text.total"></div>
                            <div class="desc">
                                <span>*: </span>
                                <span data-t="dashboard.bi.avg"></span>
                            </div>
                        </div>
                        <div class="report_table_wrap" id="totalVerInfo"></div>
                    </div>

                </div>
            </div>
            <%-- 사용성 분석 --%>
            <div class="report_wrap">
                <div class="rt_title_wrap">
                    <img alt="" class="maxy_popup_analysis_icon">
                    <span data-t="common.text.performance"></span>
                </div>

                <div>
                    <div class="loading_summary_info">
                        <div class="version_header mt16">
                            <div class="circle"></div>
                            <div class="version">
                                <span data-t="common.tableColumn.loadingtime"></span>
                                (<span data-t="common.text.summary"></span>)
                            </div>
                        </div>
                        <div class="report_table_wrap" id="loadingSummaryInfo"></div>
                    </div>

                    <div class="loading_top_info">
                        <div class="version_header mt16">
                            <div class="circle"></div>
                            <div class="version">
                                <span data-t="common.tableColumn.loadingtime"></span>
                                (<span data-t="common.text.top10"></span>)
                            </div>
                        </div>
                        <div class="report_table_wrap" id="loadingTopInfo"></div>
                    </div>

                    <div class="response_summary_info">
                        <div class="version_header mt16">
                            <div class="circle"></div>
                            <div class="version">
                                <span data-t="common.tableColumn.responseTime"></span>
                                (<span data-t="common.text.summary"></span>)
                            </div>
                        </div>
                        <div class="report_table_wrap" id="responseSummaryInfo"></div>
                    </div>

                    <div class="response_top_info">
                        <div class="version_header mt16">
                            <div class="circle"></div>
                            <div class="version">
                                <span data-t="common.tableColumn.responseTime"></span>
                                (<span data-t="common.text.top10"></span>)
                            </div>
                        </div>
                        <div class="report_table_wrap" id="responseTopInfo"></div>
                    </div>

                    <div class="page_view_info">
                        <div class="version_header mt16">
                            <div class="circle"></div>
                            <div class="version">
                                <span data-t="dashboard.bi.pageview"></span>
                                (<span data-t="common.text.top10"></span>)
                            </div>
                            <div class="desc">
                                <span>*: </span>
                                <span data-t="dashboard.bi.avg"></span>
                            </div>
                        </div>
                        <div class="report_table_wrap" id="pageViewInfo"></div>
                    </div>

                    <div class="error_info">
                        <div class="version_header mt16">
                            <div class="circle"></div>
                            <div class="version">
                                <span data-t="dashboard.bi.error"></span>
                                (<span data-t="common.text.top10"></span>)
                            </div>
                        </div>
                        <div class="report_table_wrap" id="errorInfo"></div>
                    </div>

                    <div class="crash_info">
                        <div class="version_header mt16">
                            <div class="circle"></div>
                            <div class="version">
                                <span data-t="dashboard.bi.crash"></span>
                                (<span data-t="common.text.top10"></span>)
                            </div>
                        </div>
                        <div class="report_table_wrap" id="crashInfo"></div>
                    </div>

                    <div class="device_error_info">
                        <div class="version_header mt16">
                            <div class="circle"></div>
                            <div class="version">
                                <span data-t="common.text.deviceTop"></span> <span data-t="dashboard.bi.error"></span>
                            </div>
                        </div>
                        <div class="report_table_wrap" id="deviceErrorInfo"></div>
                    </div>

                    <div class="device_crash_info">
                        <div class="version_header mt16">
                            <div class="circle"></div>
                            <div class="version">
                                <span data-t="common.text.deviceTop"></span> <span data-t="dashboard.bi.crash"></span>
                            </div>
                        </div>
                        <div class="report_table_wrap" id="deviceCrashInfo"></div>
                    </div>

                </div>
            </div>

            <div id="tempPrintDiv">
            </div>
        </div>
        <%--suppress ES6ConvertVarToLetConst, JSPotentiallyInvalidConstructorUsage, JSUnresolvedReference, JSCheckFunctionSignatures --%>
        <script>

            var RT0000 = {
                init: {
                    event() {
                        const {v, func} = RT0000
                        $('.chk_wrap > input[type="checkbox"]').on('change', func.setReportView)
                        $('#btnSearch').on('click', () => {
                            search.save()

                            sessionStorage.setItem('packageNm', $('#packageNm option:selected').val())
                            sessionStorage.setItem('serverType',$('#packageNm option:selected').data('server-type'))
                            sessionStorage.setItem('osType', $('#osType').val())
                            sessionStorage.setItem('appVer', $('#appVer').val())

                            const isValid = func.valid()
                            if (isValid) {
                                $('.report_table_wrap').css('visibility', 'hidden')
                                func.cursorShow()
                                v.types.forEach((type) => {
                                    func.getData(type)
                                })
                            } else {
                                const msg = i18next.tns('common.msg.date30')
                                toast (msg)
                            }
                        })

                        $('#packageNm').on('change', func.settingDownloadParam)
                        $('#osType').on('change', func.settingDownloadParam)
                        $('#appVer').on('change', func.settingDownloadParam)

                    },
                    async created() {
                        const {v, func} = RT0000
                        updateContent()
                        $('.day_night_btn').hide()
                        $('body').removeClass('dark_mode')

                        await calendar.init({
                            id: 'rtCalendar',
                            fn: (dates, date) => {
                                v.date = date
                                func.settingDownloadParam()
                            },
                        }, true)

                        const date = util.getDateToString(util.getDate(-1))
                        v.date = {min: date, max: date}

                        await func.initTable()
                        await appInfo.append({pId: 'packageNm', oId: 'osType', vId: 'appVer'}).then(() => {
                            func.setTopHeader()
                            $('#statusInfo').css('visibility', 'hidden')
                            func.cursorShow()
                            v.types.forEach(type => {
                                func.getData(type)
                            })

                        }).then(() => {
                            // 보고서 화면 새로고침 시 sse 연결 안되어있으면 다시 연결
                            // if (!ML0100.v.sse) {
                            //     ML0100.func.initSSE()
                            // }
                        })
                    }
                },
                v: {
                    table: {},
                    template: {},
                    types: [
                        'STATUS_INFO', 'VERSION_SUMMARY',
                        'LOADING_SUMMARY', 'LOADING_10', 'RESPONSE_SUMMARY',
                        'RESPONSE_10', 'PAGEVIEW_INFO', 'ERROR_INFO',
                        'CRASH_INFO', 'TOP10_DEVICE_ERROR_INFO', 'TOP10_DEVICE_CRASH_INFO'
                    ],
                    tableTypes: [
                        'status_info', 'total_ver_info', 'loading_summary_info',
                        'loading_top_info', 'response_summary_info', 'response_top_info', 'page_view_info',
                        'error_info', 'crash_info', 'device_error_info', 'device_crash_info'
                    ]
                },
                func: {
                    setTopHeader() {
                        const {v} = RT0000
                        const packageNm = $('#packageNm option:selected').text()
                        const osType = $('#osType option:selected').text()
                        const appVer = $('#appVer option:selected').text()

                        $('#dateText').text(v.date.min + ' ~ ' + v.date.max)
                        $('#packageNmText').text(packageNm)
                        $('#osTypeText').text(osType)
                        $('#appVerText').text(appVer)
                    },
                    async setData(type, data) {
                        const {v, func} = RT0000
                        if (!data) {
                            return
                        }

                        switch (type) {
                            case 'STATUS_INFO': {
                                const $target = $('#statusInfo')
                                if (data) {
                                    const {statusInfo} = data
                                    const {avgBasicMap, basicMap} = statusInfo

                                    const statusInfoMap = []
                                    if (basicMap && avgBasicMap) {
                                        const basicMapData = !basicMap ? {} : basicMap
                                        basicMapData.division = 'dashboard.bi.all'
                                        const avgBasicMapData = !avgBasicMap ? {} : avgBasicMap
                                        avgBasicMapData.division = 'dashboard.bi.avg'

                                        statusInfoMap.push(basicMapData)
                                        statusInfoMap.push(avgBasicMapData)
                                    }

                                    v.table.statusInfo.setData(statusInfoMap).then(() => {
                                        func.cursorHide('status_info')
                                        $target.css('visibility', 'visible')
                                        $target.height('auto')
                                    })
                                }
                                break
                            }

                            case 'VERSION_SUMMARY': {
                                const $target = $('#totalVerInfo')

                                v.table.totalVerInfo.setData(data.versionSummary).then(() => {
                                    func.cursorHide('total_ver_info')
                                    $target.css('visibility', 'visible')
                                    $target.height('auto')
                                })

                                break
                            }

                            case 'LOADING_SUMMARY': {
                                const $target = $('#loadingSummaryInfo')

                                v.table.loadingSummaryInfo.setData(data.loadingSummary).then(() => {
                                    func.cursorHide('loading_summary_info')
                                    $target.css('visibility', 'visible')
                                    $target.height('auto')
                                })
                                break
                            }

                            case 'LOADING_10': {
                                const $target = $('#loadingTopInfo')

                                v.table.loadingTopInfo.setData(data.loading10).then(() => {
                                    func.cursorHide('loading_top_info')
                                    $target.css('visibility', 'visible')
                                    $target.height('auto')
                                })
                                break
                            }

                            case 'RESPONSE_SUMMARY': {
                                const $target = $('#responseSummaryInfo')
                                v.table.responseSummaryInfo.setData(data.responseSummary).then(() => {
                                    func.cursorHide('response_summary_info')
                                    $target.css('visibility', 'visible')
                                    $target.height('auto')
                                })
                                break
                            }

                            case 'RESPONSE_10': {
                                const $target = $('#responseTopInfo')
                                v.table.responseTopInfo.setData(data.response10).then(() => {
                                    func.cursorHide('response_top_info')
                                    $target.css('visibility', 'visible')
                                    $target.height('auto')
                                })
                                break
                            }

                            case 'PAGEVIEW_INFO': {
                                const $target = $('#pageViewInfo')

                                v.table.pageViewInfo.setData(data.pageViewInfo).then(() => {
                                    func.cursorHide('page_view_info')
                                    $target.css('visibility', 'visible')
                                    $target.height('auto')
                                })
                                break
                            }

                            case 'ERROR_INFO': {
                                const $target = $('#errorInfo')
                                v.table.errorInfo.setData(data.errorInfo).then(() => {
                                    func.cursorHide('error_info')
                                    $target.css('visibility', 'visible')
                                    $target.height('auto')
                                })

                                break
                            }

                            case 'CRASH_INFO': {
                                const $target = $('#crashInfo')

                                v.table.crashInfo.setData(data.crashInfo).then(() => {
                                    func.cursorHide('crash_info')
                                    $target.css('visibility', 'visible')
                                    $target.height('auto')
                                })
                                break
                            }

                            case 'TOP10_DEVICE_ERROR_INFO': {
                                const $target = $('#deviceErrorInfo')

                                v.table.deviceErrorInfo.setData(data.errorDeviceInfo).then(() => {
                                    func.cursorHide('device_error_info')
                                    $target.css('visibility', 'visible')
                                    $target.height('auto')
                                })

                                break
                            }

                            case 'TOP10_DEVICE_CRASH_INFO': {
                                const $target = $('#deviceCrashInfo')

                                v.table.deviceCrashInfo.setData(data.crashDeviceInfo).then(() => {
                                    func.cursorHide('device_crash_info')
                                    $target.css('visibility', 'visible')
                                    $target.height('auto')
                                })
                                break
                            }
                        }
                    },
                    async initTable() {
                        const {v, func} = RT0000

                        const formatValue = (data, formatFn) => {
                            const val = checkNaN(data)
                            return formatFn(val)
                        }

                        const columnNames = {
                            'date': i18next.tns('common.tableColumn.date'),
                            'install': i18next.tns('common.tableColumn.install'),
                            'revisit': i18next.tns('common.tableColumn.revisit'),
                            'stay': i18next.tns('common.tableColumn.stay'),
                            'error': i18next.tns('dashboard.bi.error'),
                            'crash': i18next.tns('dashboard.bi.crash'),
                            'user': i18next.tns('dashboard.bi.userTooltip'),
                            'loadingTime': i18next.tns('common.tableColumn.loadingtime'),
                            'responseTime': i18next.tns('common.tableColumn.responseTime'),
                            'ver': i18next.tns('common.tableColumn.version'),
                            'rate': i18next.tns('common.tableColumn.rate'),
                            'max': i18next.tns('common.tableColumn.max'),
                            'med': i18next.tns('common.tableColumn.med'),
                            'avg': i18next.tns('common.tableColumn.avg'),
                            'min': i18next.tns('common.tableColumn.min'),
                            'device': i18next.tns('common.text.device'),
                            'pageview': i18next.tns('dashboard.bi.pageview'),
                            'ct': i18next.tns('common.tableColumn.ct'),
                            'pageType': i18next.tns('common.tableColumn.pageType'),
                            'page': i18next.tns('common.tableColumn.page'),
                            'or': i18next.tns('common.tableColumn.or'),
                            'viewer': i18next.tns('dashboard.bi.viewer'),
                            'stayTime': i18next.tns('dashboard.bi.stayTimeEng'),
                            'count': i18next.tns('common.tableColumn.count'),
                            'logClass': i18next.tns('common.tableColumn.logClass'),
                            'logType': i18next.tns('common.tableColumn.logType'),
                            'crashName': i18next.tns('common.tableColumn.crashName'),
                            'causedBy': i18next.tns('common.tableColumn.causedBy'),
                            'version': i18next.tns('common.tableColumn.version')
                        }

                        v.table.statusInfo = await func.setTable('#statusInfo', [
                            {
                                title: "Division",
                                field: "division",
                                cssClass: "left-align",
                                width: "8%",
                                formatter: function (cell) {
                                    return i18next.tns(cell.getValue())
                                }
                            },
                            {
                                title: columnNames.install,
                                field: "installCnt",
                                width: "7%",
                                cssClass: 'right-align',
                                formatter: function (cell) {
                                    return formatValue(Math.round(cell.getValue()), util.comma)
                                }
                            },
                            {
                                title: "iOS",
                                field: "ios",
                                cssClass: "right-align",
                                width: "9%",
                                formatter: function (cell) {
                                    if(cell.getData().division === "dashboard.bi.avg") {
                                        return '-'
                                    }
                                    return formatValue(cell.getValue(), Math.round) + '%'
                                }
                            },
                            {
                                title: "Android",
                                field: "android",
                                cssClass: "right-align",
                                width: "9%",
                                formatter: function (cell) {
                                    if(cell.getData().division === "dashboard.bi.avg") {
                                        return '-'
                                    }
                                    return formatValue(cell.getValue(), Math.round) + '%'
                                }
                            },
                            {
                                title: "DAU",
                                headerHozAlign:"right",
                                field: "dauCnt",
                                width: "10%",
                                cssClass: 'right-align',
                                formatter: function (cell) {
                                    return formatValue(Math.round(cell.getValue()), util.comma)
                                }
                            }, {
                                title: "PV",
                                field: "pageviewCnt",
                                width: "10%",
                                cssClass: 'right-align',
                                formatter: function (cell) {
                                    return formatValue(Math.round(cell.getValue()), util.comma)
                                }
                            }, {
                                title: columnNames.revisit,
                                field: "revisit",
                                width: "8%",
                                cssClass: 'right-align',
                                formatter: function (cell) {
                                    const rowData = cell.getRow().getData()

                                    // 전체인 경우 revisitCnt
                                    if (rowData.division === 'dashboard.bi.all') {
                                        return formatValue(Math.round(cell.getValue()), util.comma)
                                        // 아닌 경우 (평균인 경우) revisit Rate
                                    } else {
                                        const value = cell.getValue()
                                        if (!value) {
                                            return 0 + '%'
                                        }

                                        let rateToFixed2 = value.toFixed(2)
                                        if (rateToFixed2.slice(-2) === '00') {
                                            rateToFixed2 = parseFloat(rateToFixed2.slice(0, -2))
                                        }
                                        return rateToFixed2 + '%'
                                    }

                                }
                            },
                            {
                                title: "Login",
                                headerHozAlign:"right",
                                field: "loginCnt",
                                width: "7%",
                                cssClass: 'right-align',
                                formatter: function (cell) {
                                    return formatValue(Math.round(cell.getValue()), util.comma)
                                }
                            },
                            {
                                title: "Sleep",
                                headerHozAlign:"right",
                                field: "sleepCnt",
                                width: "8%",
                                cssClass: 'right-align',
                                formatter: function (cell) {
                                    return formatValue(Math.round(cell.getValue()), util.comma)
                                }
                            },
                            {
                                title: columnNames.stay,
                                field: "totalStayTime",
                                width: "7%",
                                cssClass: 'right-align',
                                formatter: function (cell) {
                                    const division = cell.getRow().getData().division

                                    if (division === 'dashboard.bi.all') {
                                        return '-'
                                    } else {
                                        return formatValue(Math.round(cell.getValue()), util.convertTime)
                                    }

                                }
                            }, {
                                title: columnNames.error,
                                field: "errorCnt",
                                width: "8%",
                                cssClass: 'right-align',
                                formatter: function (cell) {
                                    return formatValue(Math.round(cell.getValue()), util.comma)
                                }
                            }, {
                                title: columnNames.crash,
                                field: "crashCnt",
                                width: "8%",
                                cssClass: 'right-align',
                                formatter: function (cell) {
                                    return formatValue(Math.round(cell.getValue()), util.comma)
                                }
                            }
                        ])

                        v.table.totalVerInfo = await func.setTable("#totalVerInfo",
                            [
                                {
                                    title: 'OS',
                                    field: "osType",
                                    width: "7%",
                                    cssClass: 'left-align'
                                },
                                {
                                    title: columnNames.version,
                                    field: "appVer",
                                    width: "7%",
                                    cssClass: 'right-align'
                                },
                                {
                                    title: "DAU*",
                                    field: "dauCnt",
                                    width: "11%",
                                    cssClass: 'right-align',
                                    formatter: function (cell) {
                                        return formatValue(Math.round(cell.getValue()), util.comma)
                                    }
                                },
                                {
                                    title: "PV*",
                                    field: "avgPageviewCnt",
                                    width: "9%",
                                    cssClass: 'right-align',
                                    formatter: function (cell) {
                                        return formatValue(Math.round(cell.getValue()), util.comma)
                                    }
                                },
                                {
                                    title: "Loading Time*",
                                    field: "totalLoadingTime",
                                    cssClass: 'right-align',
                                    width: "15%",
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.convertTime)
                                    }
                                },
                                {
                                    title: "Response Time*",
                                    field: "totalResponseTime",
                                    cssClass: 'right-align',
                                    width: "15%",
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.convertTime)
                                    }
                                },
                                {
                                    title: "CPU*",
                                    field: "avgCpuUsage",
                                    width: "8%",
                                    cssClass: 'right-align',
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), Math.round) + '%'
                                    }
                                },
                                {
                                    title: "MEM*",
                                    field: "avgMemUsage",
                                    width: "9%",
                                    cssClass: 'right-align',
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), function (val) {
                                            return util.convertMem('kb', val)
                                        })
                                    }
                                },
                                {
                                    title: columnNames.error,
                                    field: "errorCnt",
                                    width: "9%",
                                    cssClass: 'right-align',
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.comma)
                                    }
                                },
                                {
                                    title: columnNames.crash,
                                    field: "crashCnt",
                                    width: "9%",
                                    cssClass: 'right-align',
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.comma)
                                    }
                                }
                            ])

                        v.table.loadingSummaryInfo = await func.setTable("#loadingSummaryInfo",
                            [
                                {
                                    title: "OS",
                                    field: "osType",
                                    cssClass: 'left-align',
                                    width: "9%",
                                },
                                {
                                    title: columnNames.version,
                                    field: "appVer",
                                    cssClass: 'right-align',
                                    width: "8%",
                                },
                                {
                                    title: "PV",
                                    field: "pageviewCnt",
                                    cssClass: 'right-align',
                                    width: "16%",
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.comma)
                                    }
                                },
                                {
                                    title: "PV Rate",
                                    field: "pageviewCntRate",
                                    cssClass: 'right-align',
                                    width: "15%",
                                    formatter: function (cell) {
                                        if (isNaN(cell.getValue())) {
                                            return '-'
                                        } else {
                                            let rateToFixed2 = cell.getValue().toFixed(2)

                                            if (rateToFixed2.slice(-2) === '00') {
                                                rateToFixed2 = parseFloat(rateToFixed2.slice(0, -2))
                                            }
                                            return rateToFixed2 + '%'
                                        }
                                    }
                                },
                                {
                                    title: columnNames.max,
                                    field: "maxLoadingTime",
                                    width: "17%",
                                    cssClass: 'right-align',
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.convertTime)
                                    }
                                },
                                {
                                    title: columnNames.med,
                                    field: "medLoadingTime",
                                    width: "17%",
                                    cssClass: 'right-align',
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.convertTime)
                                    }
                                },
                                {
                                    title: columnNames.min,
                                    field: "minLoadingTime",
                                    width: "17%",
                                    cssClass: 'right-align',
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.convertTime)
                                    }
                                }
                            ])

                        v.table.loadingTopInfo = await func.setTable("#loadingTopInfo",
                            [
                                {
                                    title: "OS",
                                    field: "osType",
                                    width: "9%",
                                    cssClass: "left-align"
                                },
                                {
                                    title: columnNames.device,
                                    field: "deviceModel",
                                    width: "25%",
                                    cssClass: 'left-align',
                                    formatter: function (cell) {
                                        return getDeviceModel(cell.getValue())
                                    }
                                },
                                {
                                    title: columnNames.user,
                                    field: "useCnt",
                                    width: "7%",
                                    cssClass: 'right-align',
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.comma)
                                    }
                                },
                                {
                                    title: columnNames.rate,
                                    field: "rate",
                                    width: "7%",
                                    cssClass: 'right-align',
                                    formatter: function (cell) {
                                        if (isNaN(cell.getValue())) {
                                            return '-'
                                        } else {
                                            let rateToFixed2 = cell.getValue().toFixed(2)

                                            if (rateToFixed2.slice(-2) === '00') {
                                                rateToFixed2 = parseFloat(rateToFixed2.slice(0, -2))
                                            }
                                            return rateToFixed2 + '%'
                                        }
                                    }
                                },
                                {
                                    title: columnNames.max,
                                    field: "maxLoadingTime",
                                    width: "17%",
                                    cssClass: 'right-align',
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.convertTime)
                                    }
                                },
                                {
                                    title: columnNames.med,
                                    field: "medLoadingTime",
                                    width: "17%",
                                    cssClass: 'right-align',
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.convertTime)
                                    }
                                },
                                {
                                    title: columnNames.min,
                                    field: "minLoadingTime",
                                    width: "17%",
                                    cssClass: 'right-align',
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.convertTime)
                                    }
                                }
                            ])

                        v.table.responseSummaryInfo = await func.setTable("#responseSummaryInfo",
                            [
                                {
                                    title: "OS",
                                    field: "osType",
                                    cssClass: 'left-align',
                                    width: "9%",
                                },
                                {
                                    title: columnNames.version,
                                    field: "appVer",
                                    cssClass: 'right-align',
                                    width: "8%",
                                },
                                {
                                    title: "Call",
                                    field: "call",
                                    cssClass: 'right-align',
                                    width: "16%",
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.comma)
                                    }
                                },
                                {
                                    title: "Call Rate",
                                    field: "responseCallRate",
                                    cssClass: 'right-align',
                                    width: "15%",
                                    formatter: function (cell) {
                                        if (isNaN(cell.getValue())) {
                                            return '-'
                                        } else {
                                            let rateToFixed2 = cell.getValue().toFixed(2)

                                            if (rateToFixed2.slice(-2) === '00') {
                                                rateToFixed2 = parseFloat(rateToFixed2.slice(0, -2))
                                            }
                                            return rateToFixed2 + '%'
                                        }
                                    }
                                },
                                {
                                    title: columnNames.max,
                                    field: "maxResponseTime",
                                    width: "17%",
                                    cssClass: 'right-align',
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.convertTime)
                                    }
                                },
                                {
                                    title: columnNames.avg,
                                    field: "medResponseTime",
                                    width: "17%",
                                    cssClass: 'right-align',
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.convertTime)
                                    }
                                },
                                {
                                    title: columnNames.min,
                                    field: "minResponseTime",
                                    width: "17%",
                                    cssClass: 'right-align',
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.convertTime)
                                    }
                                }
                            ])

                        v.table.responseTopInfo = await func.setTable("#responseTopInfo",
                            [
                                {
                                    title: "OS",
                                    field: "osType",
                                    width: "9%",
                                    cssClass: "left-align"
                                },
                                {
                                    title: columnNames.device,
                                    field: "deviceModel",
                                    width: "25%",
                                    cssClass: 'left-align',
                                    formatter: function (cell) {
                                        return getDeviceModel(cell.getValue())
                                    }
                                },
                                {
                                    title: columnNames.user,
                                    field: "useCnt",
                                    width: "7%",
                                    cssClass: 'right-align',
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.comma)
                                    }
                                },
                                {
                                    title: columnNames.rate,
                                    field: "rate",
                                    width: "7%",
                                    cssClass: 'right-align',
                                    formatter: function (cell) {
                                        if (isNaN(cell.getValue())) {
                                            return '-'
                                        } else {
                                            let rateToFixed2 = cell.getValue().toFixed(2)
                                            if (rateToFixed2.slice(-2) === '00') {
                                                rateToFixed2 = parseFloat(rateToFixed2.slice(0, -2))
                                            }
                                            return rateToFixed2 + '%'
                                        }
                                    }
                                },
                                {
                                    title: columnNames.max,
                                    field: "maxResponseTime",
                                    width: "17%",
                                    cssClass: 'right-align',
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.convertTime)
                                    }
                                },
                                {
                                    title: columnNames.avg,
                                    field: "medResponseTime",
                                    width: "17%",
                                    cssClass: 'right-align',
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.convertTime)
                                    }
                                },
                                {
                                    title: columnNames.min,
                                    field: "minResponseTime",
                                    width: "17%",
                                    cssClass: 'right-align',
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.convertTime)
                                    }
                                }
                            ])

                        v.table.pageViewInfo = await func.setTable("#pageViewInfo",
                            [
                                {
                                    title: columnNames.pageview,
                                    field: "pageviewCnt",
                                    width: "10%",
                                    cssClass: "left-align",
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.comma)
                                    }
                                },
                                {
                                    title: columnNames.page + '(' + columnNames.or + ' ' + 'URL)',
                                    field: "reqUrl",
                                    width: "38%",
                                    cssClass: 'left-align',
                                    tooltip: true,
                                    formatter: cell => {
                                        const packageNm = $('#packageNm').val()
                                        const serverType = $('#packageNm option:checked').data('server-type')
                                        return getPageList(packageNm, serverType, cell.getValue())
                                    }
                                },
                                {
                                    title: columnNames.viewer,
                                    field: "viewerCnt",
                                    width: "10%",
                                    cssClass: 'right-align',
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.comma)
                                    }
                                },
                                {
                                    title: columnNames.stayTime + '*',
                                    field: "totalStayTime",
                                    width: "13%",
                                    cssClass: "right-align",
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.convertTime)
                                    }
                                },
                                {
                                    title: columnNames.loadingTime + '*',
                                    field: "totalLoadingTime",
                                    width: "13%",
                                    cssClass: "right-align",
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.convertTime)
                                    }
                                },
                                {
                                    title: columnNames.error,
                                    field: "errorCnt",
                                    width: "7%",
                                    cssClass: "right-align",
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.comma)
                                    }
                                },
                                {
                                    title: columnNames.crash,
                                    field: "crashCnt",
                                    width: "8%",
                                    cssClass: "right-align",
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.comma)
                                    }
                                }
                            ])

                        v.table.errorInfo = await func.setTable("#errorInfo",
                            [
                                {
                                    title: columnNames.count,
                                    field: "errorCnt",
                                    width: "8%",
                                    cssClass: "left-align",
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.comma)
                                    }
                                },
                                {
                                    title:  columnNames.error,
                                    field: "errorMsg",
                                    width: "63%",
                                    cssClass: "left-align",
                                    tooltip: true
                                },
                                {
                                    title:  columnNames.logClass,
                                    field: "logType",
                                    width: "11%",
                                    cssClass: "left-align"
                                },
                                {
                                    title: columnNames.logType,
                                    field: "logTypeDnm",
                                    width: "8%",
                                    cssClass: "left-align"
                                },
                                {
                                    title: columnNames.rate,
                                    field: "rate",
                                    width: "8%",
                                    cssClass: "right-align",
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), Math.round) + '%'
                                    }
                                }
                            ])

                        v.table.crashInfo = await func.setTable("#crashInfo",
                            [
                                {
                                    title: columnNames.count,
                                    field: "crashCnt",
                                    width: "8%",
                                    cssClass: "left-align",
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.comma)
                                    }
                                },
                                {
                                    title: columnNames.crashName,
                                    field: "crashNm",
                                    width: "26%",
                                    cssClass: 'left-align',
                                    tooltip: true,
                                    formatter: function (cell) {
                                        if (cell.getValue()) {
                                            const crashName = cell.getValue().split(':')
                                            return crashName[0]
                                        } else {
                                            return '-'
                                        }
                                    }
                                },
                                {
                                    title: columnNames.causedBy,
                                    field: "causeBy",
                                    cssClass: 'left-align',
                                    width: "56%",
                                    tooltip: true
                                },
                                {
                                    title: columnNames.rate,
                                    field: "rate",
                                    width: "8%",
                                    cssClass: 'right-align',
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), Math.round) + '%'
                                    }
                                }
                            ])

                        v.table.deviceErrorInfo = await func.setTable("#deviceErrorInfo",
                            [
                                {
                                    title: columnNames.error + ' (' + columnNames.ct + ')',
                                    field: "errorCnt",
                                    width: "13%",
                                    cssClass: "left-align",
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.comma)
                                    }
                                },
                                {
                                    title: columnNames.rate,
                                    field: "errorRate",
                                    width: "13%",
                                    cssClass: 'left-align',
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), Math.round) + '%'
                                    }
                                },
                                {
                                    title: columnNames.device,
                                    field: "deviceModel",
                                    width: "35%",
                                    cssClass: 'left-align',
                                    formatter: function (cell) {
                                        return getDeviceModel(cell.getValue())
                                    }
                                },
                                {
                                    title: "OS",
                                    field: "osType",
                                    width: "12%",
                                    cssClass: 'left-align',
                                },
                                {
                                    title: columnNames.user,
                                    field: "userCnt",
                                    width: "12%",
                                    cssClass: 'right-align',
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.comma)
                                    }
                                },
                                {
                                    title: columnNames.rate,
                                    field: "userRate",
                                    width: "14%",
                                    cssClass: 'right-align',
                                    formatter: function (cell) {
                                        const value = cell.getValue()
                                        if (!value) {
                                            return 0 + '%'
                                        }
                                        return formatValue(cell.getValue(),function() {
                                            return Math.round(cell.getValue() * 10) / 10 + '%'
                                        })
                                    }
                                },
                            ])

                        v.table.deviceCrashInfo = await func.setTable("#deviceCrashInfo",
                            [
                                {
                                    title: columnNames.crash + ' (' + columnNames.ct + ')',
                                    field: "crashCnt",
                                    width: "13%",
                                    cssClass: "left-align",
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.comma)
                                    }
                                },
                                {
                                    title: columnNames.rate,
                                    field: "crashRate",
                                    width: "13%",
                                    cssClass: 'left-align',
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), Math.round) + '%'
                                    }
                                },
                                {
                                    title: columnNames.device,
                                    field: "deviceModel",
                                    cssClass: 'left-align',
                                    width: "35%",
                                    formatter: function (cell) {
                                        return getDeviceModel(cell.getValue())
                                    }
                                },
                                {
                                    title: "OS",
                                    field: "osType",
                                    width: "12%",
                                    cssClass: 'left-align',
                                },
                                {
                                    title: columnNames.user,
                                    field: "userCnt",
                                    width: "12%",
                                    cssClass: 'right-align',
                                    formatter: function (cell) {
                                        return formatValue(cell.getValue(), util.comma)
                                    }
                                },
                                {
                                    title: columnNames.rate,
                                    field: "userRate",
                                    width: "14%",
                                    cssClass: 'right-align',
                                    formatter: function (cell) {
                                        const value = cell.getValue()
                                        if (!value) {
                                            return 0 + '%'
                                        }
                                        return formatValue(cell.getValue(),function() {
                                            return Math.round(cell.getValue() * 10) / 10 + '%'
                                        })
                                    }
                                }
                            ])
                    },
                    async setTable(targetId, columns) {
                        const msg = i18next.tns('common.msg.noData')
                        return new Tabulator(targetId, {
                            layout: "fitDataFill",
                            placeholder: msg,
                            columns: columns
                        });
                    },
                    valid() {
                        const {v} = RT0000
                        const fromDt = v.date.min
                        const toDt = v.date.max

                        const period = util.getDateDiff(toDt, fromDt)

                        return period <= 30;

                    },
                    async getData(type) {
                        const {v, func} = RT0000

                        const fromDt = util.dateToTimestamp(new Date(v.date.min), true)
                        const toDt = util.dateToTimestamp(new Date(v.date.max), false)
                        const diff = util.getDateDiff(v.date.min, v.date.max) + 1

                        const param = {
                            packageNm: $('#packageNm').val(),
                            serverType: $('#packageNm option:checked').data('server-type'),
                            osType: $('#osType').val(),
                            appVer: $('#appVer').val(),
                            fromDt: v.date.min.replace(/-/g, ""),  // "-"를 ""로 치환
                            toDt: v.date.max.replace(/-/g, ""),    // "-"를 ""로 치환
                            searchFromDt: fromDt,
                            searchToDt: toDt,
                            type: type,
                            diff: diff
                        }

                        const today = util.getDateToString()
                        // to dt가 오늘날짜인 경우 accessDate에 오늘날짜 넣어주기 (형식: 20240213)
                        if (today === v.date.max) {
                            param.accessDate = v.date.max.replace(/-/g, '')
                        }
                        if (util.checkParam(param)) {
                            return
                        }

                        ajaxCall('/rt/0000/getReportData.maxy', param, {disableCursor: true})
                            .then(data => {
                                func.setTopHeader()
                                func.setDownloadUrl(param)
                                func.setData(type, data)
                            })
                            .catch(error => {
                                func.setCursorTarget(type)
                                console.log(error)
                            })
                    },
                    startPrint() {
                        const beforePrint = () => {
                            $('.right_side_wrap').removeClass('auto_height')
                            $("#btnPrint").hide()
                            $('#btnCsv').hide()
                            $('#btnErrorCsv').hide()
                        }
                        // 프린트 후, 웹페이지 복구
                        const afterPrint = () => {
                            $('.right_side_wrap').addClass('auto_height')
                            $("#btnPrint").show()
                            $('#btnCsv').show()
                            $('#btnErrorCsv').show()
                        }
                        window.onbeforeprint = beforePrint
                        window.onafterprint = afterPrint
                        window.print()
                    },
                    setCursorTarget(type) {
                        const {func} = RT0000

                        let targetTop = ''
                        let targetBot = ''

                        switch (type) {
                            case 'STATUS_INFO': {
                                targetTop = 'status_info'
                                break
                            }

                            case 'TOTAL_VERSION_INFO': {
                                targetTop = 'total_ver_info'
                                break
                            }

                            case 'PERFORMANCE_INFO': {
                                targetTop = 'loading_summary_info'
                                targetBot = 'response_summary_info'
                                break
                            }

                            case 'DEVICE_PERFORMANCE_INFO': {
                                targetTop = 'loading_top_info'
                                targetBot = 'response_top_info'
                                break
                            }

                            case 'PAGEVIEW_INFO': {
                                targetTop = 'page_view_info'
                                break
                            }

                            case 'ERROR_CRASH_INFO': {
                                targetTop = 'error_info'
                                targetBot = 'crash_info'
                                break
                            }

                            case 'TOP10_DEVICE_INFO': {
                                targetTop = 'device_error_info'
                                targetBot = 'device_crash_info'
                                break
                            }
                        }

                        if (targetTop) {
                            func.cursorHide(targetTop)
                        }

                        if (targetBot) {
                            func.cursorHide(targetBot)
                        }
                    },
                    cursorShow() {
                        const {v} = RT0000
                        const $body = $('body')
                        const $dimmed = $('.cursor_dimmed')

                        // dimmed 있는지 확인
                        if ($dimmed.length === 0) {
                            // dimmed 추가
                            $body.append($('<div class="cursor_dimmed"></div>'))
                        }

                        for (let i = 0; i < v.tableTypes.length; i++) {
                            $('.' + v.tableTypes[i]).append($('<div class="maxy_cursor_dots"><div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div></div>'))
                        }
                    },
                    cursorHide(type) {
                        const targetName = type.toLowerCase()
                        const $dimmed = $('.cursor_dimmed')

                        // dimmed 있는지 확인
                        if ($dimmed.length > 0) {
                            $dimmed.remove()
                        }
                        const $cursor = $('.' + targetName + ' .maxy_cursor_dots')

                        $cursor.remove()
                    },

                    setDownloadUrl(param) {
                        let url = "<c:url value="/rt/0000/downloadReportDataByRDB.maxy?"/>"
                        let errorCrashurl = "<c:url value="/rt/0000/downloadErrorCrashReportData.maxy?"/>"
                        let searchUrl = new URLSearchParams(url.search);

                        searchUrl.append('fromDt', param.fromDt);
                        searchUrl.append('toDt', param.toDt);
                        searchUrl.append('searchFromDt', param.searchFromDt);
                        searchUrl.append('searchToDt', param.searchToDt);
                        searchUrl.append('packageNm', param.packageNm);
                        searchUrl.append('serverType', param.serverType);
                        searchUrl.append('osType', param.osType);
                        searchUrl.append('appVer', param.appVer);
                        searchUrl.append('diff', param.diff);
                        searchUrl.append('locale', localStorage.getItem('lang'));
                        document.getElementById("btnCsv").href = url + searchUrl;
                        document.getElementById("btnErrorCsv").href = errorCrashurl + searchUrl;
                    },

                    settingDownloadParam() {
                        const {v, func} = RT0000
                        const fromDt = util.dateToTimestamp(new Date(v.date.min), true)
                        const toDt = util.dateToTimestamp(new Date(v.date.max), false)

                        const param = {
                            packageNm: $('#packageNm').val(),
                            serverType: $('#packageNm option:checked').data('server-type'),
                            osType: $('#osType').val(),
                            appVer: $('#appVer').val(),
                            fromDt: v.date.min,
                            toDt: v.date.max,
                            searchFromDt: fromDt,
                            searchToDt: toDt,
                        }
                        func.setDownloadUrl(param)
                    }
                }
            }

            RT0000.init.created()
            RT0000.init.event()
        </script>