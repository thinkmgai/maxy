<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>

<style>
    /*.web_perf_wrap {*/
    /*    padding: 0 22vw 0 22vw;*/
    /*}*/

    /*@media screen and (max-height: 816px) {*/
    /*    .web_perf_wrap {*/
    /*        padding: 0 10.5vw 0 10.5vw;*/
    /*    }*/
    /*}*/

    .web_perf_wrap .web_perf_title {
        display: flex;
        align-items: center;
        gap: .5em;
    }

    .web_perf_wrap .ctts_h_left img.icon_web_perf_title {
        content: url("/images/maxy/icon-web-perf-title.svg");
        width: 16px;
    }

    .dark_mode .web_perf_wrap .ctts_h_left img.icon_web_perf_title {
        content: url("/images/maxy/dark-icon-web-perf-title.svg");
    }

    .metric_wrap img.icon_network_list {
        width: 16px;
        content: url("/images/maxy/icon-network-list.svg");
    }

    .dark_mode .metric_wrap img.icon_network_list {
        content: url("/images/maxy/dark-icon-network-list.svg");
    }

    .page_url_wrap img.icon_page_url {
        width: 16px;
        content: url("/images/maxy/icon-page-url.svg");
    }

    .dark_mode  .page_url_wrap img.icon_page_url {
        content: url("/images/maxy/dark-icon-page-url.svg");
    }

    .web_perf_wrap .bold {
        font-weight: bold;
    }

    .web_perf_wrap .core_web_vital_wrap {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        /* justify-content: space-between; */
        gap: 1em;
    }

    .web_perf_wrap .core_web_vital_wrap .core_web_vital {
        gap: 1em;
        display: flex;
        padding: 1.5em 1.8em 1.5em 1.8em;
        background-color: #F7F8FA;
        border-radius: 10px;
        flex-direction: column;
    }

    .dark_mode     .web_perf_wrap .core_web_vital_wrap .core_web_vital {
        background-color: var(--color-table-row-dark-1);
    }

    .web_perf_wrap .core_web_vital_wrap .core_web_vital .top .title {
        color: var(--logo-purple-1);
    }

    .core_web_vital_wrap .core_web_vital .top,  .core_web_vital_wrap .core_web_vital .middle {
        display: flex;
        flex-direction: column;
        gap: .8em;
    }

    .core_web_vital_wrap .core_web_vital .top .value {
        font-weight: 600;
        font-size: 1.9em;
    }

    .core_web_vital.lcp .top .value, .core_web_vital.inp .top .value {
        color: #00A582;
    }

    .dark_mode .core_web_vital.lcp .top .value, .dark_mode .core_web_vital.inp .top .value {
        color: #24F2A7;
    }

    .core_web_vital.cls .top .value {
        color: #F55959;
    }

    .core_web_vital_wrap .core_web_vital .middle .title {
        font-weight: 600;
    }

    .core_web_vital_wrap .core_web_vital .middle .value {
        color: #808080;
        line-height: normal;
    }

    .core_web_vital_wrap .core_web_vital .bot {
        height: 100%;
        display: flex;
    }

    .core_web_vital_wrap .core_web_vital.lcp .bot img.icon_web_perf_lcp {
        content: url("/images/maxy/icon-web-perf-lcp.svg");
        width: 43%
    }

    .dark_mode .core_web_vital_wrap .core_web_vital.lcp .bot img.icon_web_perf_lcp {
        content: url("/images/maxy/dark-icon-web-perf-lcp.svg");
    }

    .core_web_vital_wrap .core_web_vital.inp .bot img.icon_web_perf_inp {
        content: url("/images/maxy/icon-web-perf-inp.svg");
        width: 43%
    }

    .dark_mode .core_web_vital_wrap .core_web_vital.inp .bot img.icon_web_perf_inp {
        content: url("/images/maxy/dark-icon-web-perf-inp.svg");
    }

    .core_web_vital_wrap .core_web_vital.cls .bot img.icon_web_perf_cls {
        content: url("/images/maxy/icon-web-perf-cls.svg");
        width: 43%
    }

    .dark_mode .core_web_vital_wrap .core_web_vital.cls .bot img.icon_web_perf_cls {
        content: url("/images/maxy/dark-icon-web-perf-cls.svg");
    }

    .web_perf_wrap .page_url_wrap, .web_perf_wrap .mt {
        display: flex;
        flex-direction: column;
        gap: 1.2em;
    }

    .web_perf_wrap .mt {
        margin-top: 5em;
    }

    .web_perf_wrap .btn_yn.good {
        background-color: var(--point-green)
    }

    .web_perf_wrap .btn_yn.improve {
        background-color: #FCB500;
    }

    .web_perf_wrap .btn_yn.poor {
        background-color: var(--point-red)
    }

    .web_perf_wrap .btn_yn {
        color: white;
        text-align: center;
    }

    .page_url_wrap .btn_yn {
        width: 70%;
    }

    .metric_wrap .btn_yn {
        width: 50%;
    }

    .metric_wrap img.icon_error_statistics {
        width: 16px;
        content: url("/images/maxy/icon-error-statistics.svg");
    }

    .dark_mode .metric_wrap img.icon_error_statistics {
        content: url("/images/maxy/dark-icon-error-statistics.svg");
    }

    .metric_wrap img.icon_metric_device {
        width: 16px;
        content: url("/images/maxy/icon-metric-device.svg");
    }

    .dark_mode .metric_wrap img.icon_metric_device {
        content: url("/images/maxy/dark-icon-metric-device.svg");
    }

    .metric_wrap img.icon_operation {
        width: 16px;
        content: url("/images/maxy/icon-operation.svg");
    }

    .dark_mode .metric_wrap img.icon_operation {
        content: url("/images/maxy/dark-icon-operation.svg");
    }

    .metric_wrap img.icon_browser {
        width: 16px;
        content: url("/images/maxy/icon-browser.svg");
    }

    .dark_mode .metric_wrap img.icon_browser {
        content: url("/images/maxy/dark-icon-browser.svg");
    }

    .metric_wrap .metric {
        height: 40vh;
        display: grid;
        gap: 1em;
        grid-template-columns: 1fr 2fr;
    }

    .favorite-star {
        content: url("/images/maxy/icon-favorite-star-empty.svg");
    }

    .dark_mode .favorite-star {
        content: url("/images/maxy/dark-icon-favorite-star-empty.svg");
    }

    .favorite-star.filled {
        content: url("/images/maxy/icon-favorite-star-filled.svg");
    }

    .web_perf_wrap .url_search_wrap {
        display: flex;
        align-items: center;
        gap: .5em;
    }

    .web_perf_wrap .url_search_wrap > input {
        width: 260px;
    }

    .dark_mode .web_perf_wrap .url_search_wrap > input {
        background-color: var(--color-block-dark-1);
        border: 1px solid var(--color-block-dark-1);
        color: white;
    }

    .web_perf_wrap .url_search_wrap .icon_search_box {
        content: url("/images/maxy/icon-search-btn-box.svg");
    }

    .dark_mode .web_perf_wrap .url_search_wrap .icon_search_box {
        content: url("/images/maxy/dark-icon-search-btn-box.svg");
    }

    .web_perf_wrap .paging_btn_wrap {
        margin-top: 0;
    }

    .tabulator .tabulator-placeholder {
        height: 100%;
    }

    .dark_mode .highcharts-series-group path {
        stroke: none;
    }

    .dark_mode .web_perf_wrap .btn_yn {
        color: #101010;
    }

    #errorStatisTicsPopup .web_chart_wrap {
        grid-template-rows: minmax(148px, 17%) minmax(300px, 83%);
    }

    .mb-12 {
        margin-bottom: 1.2em;
    }

    .tabulator-cell[tabulator-field="reqUrl"] {
        display: block !important;
        text-overflow: ellipsis;
        height: auto !important;
    }

    /* 1) 헤더 content 전체를 flex 정렬 */
    .tabulator .tabulator-header .tabulator-col .tabulator-col-content {
        display: flex;
        flex-direction: row;     /* 아이콘과 제목 좌우 배치 */
        align-items: center;     /* 세로 중앙 정렬 */
        height: 100%;
        padding: 0 6px;          /* 기본 패딩 유지 */
    }

    /* 2) 제목 부분만 줄바꿈 허용 + 가운데 정렬 */
    .tabulator .tabulator-header .tabulator-col .tabulator-col-title {
        white-space: break-spaces !important;
        text-align: center !important;
        line-height: 1.2 !important;
    }

    /* 3) 아이콘 크기 맞추기 */
    .tabulator .tabulator-header .tabulator-col .tabulator-col-sorter {
        display: flex !important;
        align-items: center !important;
        margin-right: 4px !important; /* 텍스트와 간격 */
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
</style>
<div class="web_perf_wrap">
    <!-- 컨텐츠 헤더 -->
    <div class="contents_header">
        <div class="ctts_h_left">
            <img class="icon_web_perf_title" alt="" src="">
            <span class="bold">Web Performance Analytic / </span>
            <span>Core Web Vital </span>
        </div>

        <div class="ctts_h_right">
            <div class="calendar_wrap">
                <button class="btn_calendar" id="btnFwCalendar"></button>
                <input type="text" id="fwCalendar" class="calendar_input">
            </div>
            <span class="app_icon">A</span>
            <select id="packageNm" class="app_info_select"></select>
        </div>
    </div>

    <div class="mb-12">Total Score *Avg.</div>
    <%-- Web Performance Analytic --%>
    <div class="core_web_vital_wrap">
        <div class="core_web_vital lcp">
            <div class="top">
                <div class="title">Largest Contentful Paint</div>
                <div class="value" id="lcpAvg"></div>
            </div>
            <div class="middle">
                <div class="title">최대 콘텐츠 페인트</div>
                <div class="value">로드 성능을 측정합니다.
                    <br> 성능 측정의 기준을 페이지 별 리소스 구성에 맞출 수 있습니다.
                </div>
            </div>
            <div class="bot" id="coreVitalLcpChart">
                <img class="icon_web_perf_lcp">
            </div>
        </div>
        <div class="core_web_vital inp">
            <div class="top">
                <div class="title">Interaction to Next Paint</div>
                <div class="value" id="inpAvg"></div>
            </div>
            <div class="middle">
                <div class="title">페인팅 상호작용</div>
                <div class="value">요청부터 응답까지의 소요시간을 측정합니다.
                    <br>병목 구간 등 사용자 체감 성능을 파악할 수 있습니다.
                </div>
            </div>
            <div class="bot" id="coreVitalInpChart">
                <img class="icon_web_perf_inp">
            </div>
        </div>
        <div class="core_web_vital cls">
            <div class="top">
                <div class="title">Cumulative Layout Shift</div>
                <div class="value" id="clsAvg"></div>
            </div>
            <div class="middle">
                <div class="title">누적 레이아웃 변경</div>
                <div class="value">시각적 안정성을 측정합니다.
                    <br> 성능 측정의 기준을 UI/UX에 맞출 수 있습니다.
                </div>
            </div>
            <div class="bot" id="coreVitalClsChart">
                <img class="icon_web_perf_cls">
            </div>
        </div>
    </div>

    <%-- Page-Level Performance & Metrics --%>
    <div class="mt page_url_wrap">
        <div class="web_perf_title">
            <img class="icon_page_url" alt="" src="">
            <span class="bold">Page-Level Performance & Metrics</span>
        </div>
        <%-- 검색란 --%>
        <div class="url_search_wrap">
            <img class="favorite-star" id="btnPageFavoriteList" alt="" src="">
            <input autocomplete="off" class="search_value" id="searchValue" tabindex="2" type="text" placeholder="URL을 입력해 주세요.">
            <img alt="" class="icon_search_box" id="doSearch" src="">
        </div>
        <div class="" id="pageList"></div>
        <div class="paging_btn_wrap">
            <button class="btn_move_page tabulator-page"
                    data-type="prev"
                    id="btnPagePrevData"
                    data-t="common.btn.prev"
            ></button>
            <input type="hidden"
                   id="selectSize"
                   value="100">
            <button class="btn_move_page tabulator-page"
                    data-type="next"
                    id="btnPageNextData"
                    data-t="common.btn.next"
            ></button>
        </div>
    </div>

    <%-- Related Analysis Metrics Device Statistics --%>
    <div class="mt metric_wrap">
        <div class="web_perf_title">
            <img class="icon_network_list" alt="" src="">
            <span class="bold">Call-Level Performance & Metrics</span>
        </div>
        <%-- 검색란 --%>
        <div class="url_search_wrap">
            <img class="favorite-star" id="btnNetworkFavoriteList" alt="" src="">
            <input autocomplete="off" class="search_value" id="searchNetworkValue" tabindex="2" type="text" placeholder="URL을 입력해 주세요.">
            <img alt="" class="icon_search_box" id="doSearchNetwork" src="">
        </div>

        <div class="" id="webPerfNetworkList"></div>
        <div class="paging_btn_wrap">
            <button class="btn_move_page tabulator-page"
                    data-type="prev"
                    id="btnApiPrevData"
                    data-t="common.btn.prev"
            ></button>
            <input type="hidden"
                   id="selectSize"
                   value="100">
            <button class="btn_move_page tabulator-page"
                    data-type="next"
                    id="btnApiNextData"
                    data-t="common.btn.next"
            ></button>
        </div>
    </div>

    <div class="mt metric_wrap">
        <div class="web_perf_title">
            <img class="icon_error_statistics" alt="" src="">
            <span class="bold">Error Statistics</span>
        </div>
        <div class="url_search_wrap">
            <img class="favorite-star" id="btnErrorFavoriteList" alt="" src="">
            <input autocomplete="off" class="search_value" id="searchErrorValue" tabindex="2" type="text" placeholder="Res Msg를 입력해 주세요.">
            <img alt="" class="icon_search_box" id="doSearchError" src="">
        </div>
        <div class="" id="webPerfErrorList"></div>
        <div class="paging_btn_wrap">
            <button class="btn_move_page tabulator-page"
                    data-type="prev"
                    id="btnErrorPrevData"
                    data-t="common.btn.prev"
            ></button>
            <input type="hidden"
                   id="selectSize"
                   value="100">
            <button class="btn_move_page tabulator-page"
                    data-type="next"
                    id="btnErrorNextData"
                    data-t="common.btn.next"
            ></button>
        </div>
    </div>

    <%-- Related Analysis Metrics Device Statistics --%>
    <div class="mt metric_wrap">
        <span class="bold">Related Analysis Metrics</span>
        <div class="web_perf_title">
            <img class="icon_metric_device" alt="" src="">
            <span>Device Statistics</span>
        </div>

        <div class="metric">
            <div class="maxy_box" id="platformChart"></div>
            <div class="" id="platformList"></div>
        </div>
    </div>

    <%-- Operating System Statistics --%>
    <div class="mt metric_wrap">
        <div class="web_perf_title">
            <img class="icon_operation" alt="" src="">
            <span>Operating System Statistics</span>
        </div>

        <div class="metric">
            <div class="maxy_box" id="osChart"></div>
            <div class="" id="osList"></div>
        </div>
    </div>

    <div class="mt metric_wrap">
        <div class="web_perf_title">
            <img class="icon_browser" alt="" src="">
            <span>Browser Statistics</span>
        </div>

        <div class="metric">
            <div class="maxy_box" id="browserChart"></div>
            <div class="" id="browserList"></div>
        </div>
    </div>


    <div class="maxy_popup_common_wrap" id="maxyPopupWrap"></div>
    <div class="maxy_popup_common_wrap" id="maxySessionReplayPopupWrap"></div>
</div>

<%--suppress ES6ConvertVarToLetConst --%>
<script>
    var webperf = {
        v: {
            class: {
                coreVital: null,
                page: null,
                metric: null
            },
            // api 호출 시 사용될 시간 값
            time: {
                from: null,
                to: null
            },
            searchValue: {
                page: null,
                network: null,
                error: null
            },
            page: {
                afterKey: [],
                offsetIndex: 1,
                mark: false
            },
            network: {
                afterKey: [],
                offsetIndex: 1,
                mark: false
            },
            error: {
                afterKey: [],
                offsetIndex: 1,
                mark: false
            }
        },
        init: {
            event() {
                const {v, func} = webperf

                const bindFavoriteToggle = (selector, targetKey, fetchCallback) => {
                    $(selector).on('click', function () {
                        const targetState = v[targetKey]
                        const targetClass = v.class[targetKey]

                        if (targetClass && targetClass.selectedRow) {
                            targetClass.selectedRow = null
                        }
                        if (targetState.afterKey) {
                            targetState.afterKey = []
                        }
                        if (typeof targetState.offsetIndex !== 'undefined') {
                            targetState.offsetIndex = 1
                        }

                        targetState.mark = !targetState.mark
                        $(this).toggleClass('filled')
                        fetchCallback()
                    })
                }

                const clickSearchTypeMap = {
                    doSearch: 'page',
                    doSearchNetwork: 'network',
                    doSearchError: 'error'
                }

                $('#doSearch, #doSearchNetwork, #doSearchError').on('click', (e) => {
                    const type = clickSearchTypeMap[$(e.currentTarget).attr('id')]
                    if (type) {
                        func.search(type)
                    }
                })

                const inputSearchTypeMap = {
                    searchValue: 'page',
                    searchNetworkValue: 'network',
                    searchErrorValue: 'error'
                }

                $('#searchValue, #searchNetworkValue, #searchErrorValue').on('keydown', (e) => {
                    if (e.keyCode === 13) {
                        const type = inputSearchTypeMap[e.currentTarget.id]
                        if (type) {
                            func.search(type)
                        }
                    }
                })

                // Page list 페이징 버튼 (이전)
                $('#btnPagePrevData').on('click', function () {
                    const {v, func} = webperf

                    if ($('.cursor_dimmed').length > 0) return

                    if (v.class.page.selectedRow) {
                        v.class.page.selectedRow = null
                    }
                    // table 페이지번호 감소
                    v.page.offsetIndex--

                    // table searchAfter 이전페이지 정보 (현재 페이지의 afterKey 제거)
                    v.page.afterKey.pop()
                    v.page.afterKey.pop()

                    // log table 조회
                    func.fetch.page.getPageList()
                })

                // Page list 페이징 버튼 (다음)
                $('#btnPageNextData').on('click', function () {
                    const {v, func} = webperf
                    if ($('.cursor_dimmed').length > 0) return

                    if (v.class.page.selectedRow) {
                        v.class.page.selectedRow = null
                    }

                    // table 페이지번호 증가
                    v.page.offsetIndex++

                    // log table 조회
                    func.fetch.page.getPageList()
                })

                // Api list 페이징 버튼 (이전)
                $('#btnApiPrevData').on('click', function () {
                    const {v, func} = webperf

                    if ($('.cursor_dimmed').length > 0) return

                    if (v.class.network.selectedRow) {
                        v.class.network.selectedRow = null
                    }
                    // table 페이지번호 감소
                    v.network.offsetIndex--

                    // network searchAfter 이전페이지 정보 (현재 페이지의 afterKey 제거)
                    v.network.afterKey.pop()
                    v.network.afterKey.pop()

                    // log table 조회
                    func.fetch.network.getResponseList()
                })

                // api list 페이징 버튼 (다음)
                $('#btnApiNextData').on('click', function () {
                    const {v, func} = webperf
                    if ($('.cursor_dimmed').length > 0) return

                    if (v.class.network.selectedRow) {
                        v.class.network.selectedRow = null
                    }

                    // table 페이지번호 증가
                    v.network.offsetIndex++

                    // log table 조회
                    func.fetch.network.getResponseList()
                })


                // Error list 페이징 버튼 (이전)
                $('#btnErrorPrevData').on('click', function () {
                    const {v, func} = webperf

                    if ($('.cursor_dimmed').length > 0) return

                    if (v.class.error.selectedRow) {
                        v.class.error.selectedRow = null
                    }
                    // table 페이지번호 감소
                    v.error.offsetIndex--

                    // network searchAfter 이전페이지 정보 (현재 페이지의 afterKey 제거)
                    v.error.afterKey.pop()
                    v.error.afterKey.pop()

                    // log table 조회
                    func.fetch.error.getErrorList()
                })

                // api list 페이징 버튼 (다음)
                $('#btnErrorNextData').on('click', function () {
                    const {v, func} = webperf
                    if ($('.cursor_dimmed').length > 0) return

                    if (v.class.error.selectedRow) {
                        v.class.error.selectedRow = null
                    }

                    // table 페이지번호 증가
                    v.error.offsetIndex++

                    // log table 조회
                    func.fetch.error.getErrorList()
                })
                bindFavoriteToggle('#btnPageFavoriteList', 'page', () => func.fetch.page.getPageList())
                bindFavoriteToggle('#btnNetworkFavoriteList', 'network', () => func.fetch.network.getResponseList())
                bindFavoriteToggle('#btnErrorFavoriteList', 'error', () => func.fetch.error.getErrorList())
            },
            async created() {
                const {v, func} = webperf

                updateContent()
                appInfo.append({
                    pId: 'packageNm',
                    targetPage: 'webperf',
                    pIdCb: func.addEvent.appInfoPackageNmCb}).then(() => {

                })

                // 초기 시간 객체 설정
                await func.set.time()

                // 캘린더 설정
                func.draw.calendar()

                // core vital 객체 생성
                func.draw.coreVital()

                // page url list 객체 생성
                func.draw.page()

                // metric 객체 생성
                func.draw.metric()

                // response list 객체 생성
                func.draw.network()

                // error statistics 객체 생성
                func.draw.error()

                // 데이터 조회
                func.fetch.coreVital.getCoreVital()
                func.fetch.page.getPageList()
                func.fetch.metric.getMetric()
                func.fetch.network.getResponseList()
                func.fetch.error.getErrorList()
            }
        },
        func: {
            search(type) {
                const {v, func} = webperf
                const inputSelectorMap = {
                    page: '#searchValue',
                    network: '#searchNetworkValue',
                    error: '#searchErrorValue'
                }
                const targetClassMap = {
                    page: v.class.page,
                    network: v.class.network,
                    error: v.class.error
                }
                const targetStateMap = {
                    page: v.page,
                    network: v.network,
                    error: v.error
                }

                const inputSelector = inputSelectorMap[type]
                if (!inputSelector) {
                    return
                }

                const searchValue = $(inputSelector).val()

                const targetClass = targetClassMap[type]
                if (targetClass && targetClass.selectedRow) {
                    targetClass.selectedRow = null
                }

                const targetState = targetStateMap[type]
                if (targetState) {
                    targetState.afterKey = []
                    targetState.offsetIndex = 1
                }

                v.searchValue[type] = searchValue

                if (type === 'page') {
                    func.fetch.page.getPageList()
                } else if (type === 'network') {
                    func.fetch.network.getResponseList()
                } else {
                    func.fetch.error.getErrorList()
                }
            },
            addEvent: {
                // appInfo.js에서 #packageNm_a의 onChange 후 콜백함수
                async appInfoPackageNmCb() {
                    const {v, func} = webperf

                    const packageNm = sessionStorage.getItem('packageNm')
                    const serverType = sessionStorage.getItem('serverType')

                    // packageNm의 모든 option을 순회하며 server-type과 value가 모두 일치하는 option 선택
                    $('#packageNm option').each(function () {
                        if ($(this).data('server-type').toString() === serverType && $(this).val() === packageNm) {
                            $(this).prop('selected', true); // 일치하는 항목 선택
                        } else {
                            $(this).prop('selected', false); // 일치하지 않는 항목은 선택 해제
                        }
                    })

                    // 기존 차트, 테이블 모두 초기화
                    func.reset()

                    // 바뀐 날짜로 데이터 조회
                    func.fetch.coreVital.getCoreVital()
                    func.fetch.page.getPageList()
                    func.fetch.metric.getMetric()
                    func.fetch.network.getResponseList()
                    func.fetch.error.getErrorList()

                    if (v.class.page.selectedRow) {
                        v.class.page.selectedRow = null
                    }
                    v.page.afterKey = []
                    v.page.offsetIndex = 1

                    if (v.class.network.selectedRow) {
                        v.class.network.selectedRow = null
                    }
                    v.network.afterKey = []
                    v.network.offsetIndex = 1

                    if (v.class.error.selectedRow) {
                        v.class.error.selectedRow = null
                    }
                    v.error.afterKey = []
                    v.error.offsetIndex = 1
                }
            },
            fetch: {
                coreVital: {
                    // coreVital 값 받아오고 세팅
                    getCoreVital() {
                        const {v} = webperf
                        const {time} = v

                        cursor.show(false, '.core_web_vital_wrap')
                        ajaxCall('/fw/0000/webperf/vital.maxy', {
                            packageNm: $('#packageNm').val(),
                            serverType: $('#packageNm option:checked').data('server-type'),
                            from: time.from,
                            to: time.to
                        }, {disableCursor: true}).then(data => {
                            v.class.coreVital.setData(data)
                        }).catch((error) => {
                            console.log(error)
                        }).finally(() => {
                            cursor.hide('.core_web_vital_wrap')
                        })
                    }
                },
                page: {
                    getPageList() {
                        const {v, func} = webperf
                        const {time} = v

                        const param = {
                            packageNm: $('#packageNm').val(),
                            serverType: $('#packageNm option:checked').data('server-type'),
                            from: time.from,
                            to: time.to,
                            reqUrl: v.searchValue.page,
                            afterKey: (v.page.afterKey.length !== 0) ? v.page.afterKey[v.page.afterKey.length - 1] : '',
                            mark: v.page.mark,
                            type: 'PAGE'
                        }

                        cursor.show(false, '#pageList')
                        ajaxCall('/fw/0000/webperf/pages/aggregate.maxy', param, {disableCursor: true})
                        .then(data => {
                            const {list, afterKey} = data

                            if (v.page.offsetIndex > 1
                                && list.length === 0) {
                                v.page.offsetIndex--
                                $('#btnPageNextData').attr('disabled', true)
                                return
                            }

                            v.class.page.setData(list)

                            if (!list || list.length === 0) {
                                $('#btnPagePrevData').attr('disabled', true)
                                $('#btnPageNextData').attr('disabled', true)
                                return
                            }

                            // afterKey가 있는 경우에만 다음 버튼 활성화
                            func.set.pagination(afterKey, 'page')
                            // param의 afterKey가 빈값이면 이전버튼 비활성화
                            if (param.afterKey === '') {
                                $('#btnPagePrevData').attr('disabled', true)
                            }
                        }).catch((error) => {
                            console.log(error)
                        }).finally(() => {
                            cursor.hide('#pageList')
                        })
                    }
                },
                metric: {
                    getMetric() {
                        const {v} = webperf
                        const {time} = v

                        const target = ['PLATFORM', 'OS', 'BROWSER']

                        // 대문자 key → 실제 table 이름 매핑
                        const map = {
                            PLATFORM: 'platform',
                            OS: 'os',
                            BROWSER: 'browser'
                        }

                        target.forEach(item => {
                            ajaxCall('/fw/0000/webperf/ratio/' + item + '.maxy', {
                                packageNm: $('#packageNm').val(),
                                serverType: $('#packageNm option:checked').data('server-type'),
                                from: time.from,
                                to: time.to
                            }, {disableCursor: true}).then(data => {
                                // 리스트 세팅
                                if (data.list) {
                                    const {list} = data

                                    const tableTarget = map[item] // item에 대응하는 table 이름 매핑
                                    v.class.metric.setTableData(list, tableTarget)
                                }

                                // pie 차트 세팅
                                if (data.ratio) {
                                    const {ratio} = data

                                    const ratioTarget = map[item]
                                    v.class.metric.setChartData(ratio, ratioTarget)
                                }
                            })
                        })
                    }
                },
                network: {
                    getResponseList() {
                        const {v, func} = webperf
                        const {time} = v

                        const param = {
                            packageNm: $('#packageNm').val(),
                            serverType: $('#packageNm option:checked').data('server-type'),
                            from: time.from,
                            to: time.to,
                            reqUrl: v.searchValue.network,
                            type: 'API',
                            afterKey: (v.network.afterKey.length !== 0) ? v.network.afterKey[v.network.afterKey.length - 1] : '',
                            mark: v.network.mark
                        }
                        cursor.show(false, '#webPerfNetworkList')
                        ajaxCall('/fw/0000/webperf/network/aggregate.maxy',param, {disableCursor: true}
                        ).then(data => {
                            const {list, afterKey} = data

                            // 마지막 페이지인 경우를 판단하기 위함 (offsetIndex는 1을 넘었는데 리스트가 없음 -> 마지막 페이지임)
                            if (v.network.offsetIndex > 1
                                && list.length === 0) {
                                v.network.offsetIndex--
                                $('#btnApiNextData').attr('disabled', true)
                                return
                            }
                            v.class.network.setData(list)

                            if (!list || list.length === 0) {
                                $('#btnApiPrevData').attr('disabled', true)
                                $('#btnApiNextData').attr('disabled', true)
                                return
                            }
                            // afterKey가 있는 경우에만 다음 버튼 활성화
                            func.set.pagination(afterKey, 'network')
                            // param의 afterKey가 빈값이면 이전버튼 비활성화
                            if (param.afterKey === '') {
                                $('#btnApiPrevData').attr('disabled', true)
                            }
                        }).catch(error => {
                            console.log(error.msg)
                        }).finally(() => {
                            cursor.hide('#webPerfNetworkList')
                        })
                    }
                },
                error: {
                    getErrorList() {
                        const {v, func} = webperf
                        const {time} = v

                        const param = {
                            packageNm: $('#packageNm').val(),
                            serverType: $('#packageNm option:checked').data('server-type'),
                            from: time.from,
                            to: time.to,
                            resMsg: v.searchValue.error,
                            mark: v.error.mark,
                            afterKey: (v.error.afterKey.length !== 0) ? v.error.afterKey[v.error.afterKey.length - 1] : '',
                        }
                        cursor.show(false, '#webPerfErrorList')
                        ajaxCall('/fw/0000/webperf/error/aggregate.maxy',
                          param,  {disableCursor: true}).then(data => {
                            const {list, afterKey} = data

                            // 마지막 페이지인 경우를 판단하기 위함 (offsetIndex는 1을 넘었는데 리스트가 없음 -> 마지막 페이지임)
                            if (v.error.offsetIndex > 1
                                && list.length === 0) {
                                v.error.offsetIndex--
                                $('#btnErrorNextData').attr('disabled', true)
                                return
                            }
                            v.class.error.setData(list)

                            if (!list || list.length === 0) {
                                $('#btnErrorPrevData').attr('disabled', true)
                                $('#btnErrorNextData').attr('disabled', true)
                                return
                            }
                            // afterKey가 있는 경우에만 다음 버튼 활성화
                            func.set.pagination(afterKey, 'error')

                            // param의 afterKey가 빈값이면 이전버튼 비활성화
                            if (param.afterKey === '') {
                                $('#btnErrorPrevData').attr('disabled', true)
                             }
                        }).catch(error => {
                            console.log(error.msg)
                        }).finally(() => {
                            cursor.hide('#webPerfErrorList')
                        })
                    }
                },
            },
            draw: {
                coreVital() {
                    const {v} = webperf
                    v.class.coreVital = new MaxyFrontCoreVital({
                        id: 'coreVitalChart',
                        targetPage: webperf
                    })
                },
                page() {
                    const {v} = webperf
                    v.class.page = new MaxyFrontWebPerfPage({
                        id: 'webPerfPage',
                        targetPage: webperf
                    })
                },
                metric() {
                    const {v} = webperf
                    v.class.metric = new MaxyFrontWebPerfMetric({
                        id: 'webPerfMetric',
                        targetPage: webperf
                    })
                },
                network() {
                    const {v} = webperf
                    v.class.network = new MaxyFrontWebPerfNetwork({
                        id: 'webPerfNetwork',
                        targetPage: webperf
                    })
                },
                error() {
                    const {v} = webperf
                    v.class.error = new MaxyFrontWebPerfError({
                        id: 'webPerfError',
                        targetPage: webperf
                    })
                },
                // 화면상단 달력 그리기
                calendar() {
                    const {v, func} = webperf
                    const {time} = v

                    v.calendar = calendar.init({
                        id: 'fwCalendar',
                        fn: async (dates, date) => {
                            if (v.class.page.selectedRow) {
                                v.class.page.selectedRow = null
                            }

                            if (v.class.network.selectedRow) {
                                v.class.network.selectedRow = null
                            }

                            if (v.class.error.selectedRow) {
                                v.class.error.selectedRow = null
                            }

                            // 캘린더 설정 시 실행할 함수
                            // time 변수에 from / to 를 timestamp 형식으로 채워넣는다.
                            // from은 min 날짜의 00시00분00.000초
                            const searchFrom = new Date(date.min).setHours(0, 0, 0, 0).valueOf()
                            let searchTo

                            if (util.getDateToString(new Date()) === date.max) {
                                searchTo = new Date().valueOf()
                            } else {
                                searchTo = new Date(date.max).setHours(23, 59, 59, 999).valueOf()
                            }

                            func.reset()

                            // 바뀐 날짜를 날짜 변수에 세팅
                            time.from = searchFrom
                            time.to = searchTo

                            // 바뀐 날짜로 데이터 조회
                            func.fetch.coreVital.getCoreVital()
                            func.fetch.page.getPageList()
                            func.fetch.metric.getMetric()
                            func.fetch.network.getResponseList()
                            func.fetch.error.getErrorList()
                        },
                        created: async () => {
                            $('#fwCalendar').val(util.timestampToDate(time.from) + ' ~ ' + util.timestampToDate(time.to))
                        }
                    })
                },
            },
            set: {
                /**
                 * 시간 설정
                 * @param from 시작 시간. 안넣으면 오늘 일자의 00시 00분 00.000초
                 * @param to 끝 시간. 안넣으면 현재 시간
                 */
                time(from = new Date().setHours(0, 0, 0, 0).valueOf(),
                     to = new Date().valueOf()) {
                    const {v} = webperf
                    v.time.from = Number(from)
                    v.time.to = Number(to)
                },
                /**
                 * 페이징 버튼 활성, 비활성 여부 설정
                 * @param afterKey 값 있으면 다음 버튼 있음, 리스트 호출 시 그대로 넘겨주기.
                 * @param type 'page' | 'network' type이 무엇인지에 따라 버튼 대상이 바뀜
                 */
                pagination(afterKey, type) {
                    const {v} = webperf

                    let $btnNextData
                    let $btnPrevData
                    let offsetIndex
                    let afterKeyTmp

                    if (type === 'page') {
                        $btnNextData = $('#btnPageNextData')
                        $btnPrevData = $('#btnPagePrevData')
                        offsetIndex = v.page.offsetIndex
                        afterKeyTmp = v.page.afterKey
                    } else if (type === 'network') {
                        $btnNextData = $('#btnApiNextData')
                        $btnPrevData = $('#btnApiPrevData')
                        offsetIndex = v.network.offsetIndex
                        afterKeyTmp = v.network.afterKey
                    } else if (type === 'error') {
                        $btnNextData = $('#btnErrorNextData')
                        $btnPrevData = $('#btnErrorPrevData')
                        offsetIndex = v.error.offsetIndex
                        afterKeyTmp = v.error.afterKey
                    }

                    // 이전 버튼 활성화 로직: 첫 페이지가 아니면 항상 활성화
                    if (offsetIndex === 1) {
                        $btnPrevData.attr('disabled', true)
                    } else {
                        $btnPrevData.attr('disabled', false)
                    }

                    // 다음 버튼 활성화 로직: afterKey가 있으면 활성화
                    if (afterKey) {
                        $btnNextData.attr('disabled', false)
                        afterKeyTmp.push(afterKey)
                    } else {
                        $btnNextData.attr('disabled', true)
                        afterKeyTmp.push('') // 더이상 이동한 다음페이지가 없음
                    }
                }
            },
            reset() {
                const {v} = webperf

                $('.search_value').val('')

                // 날짜 바꼈으니 기존 차트, 테이블 모두 초기화
                v.class.coreVital.clear()
                v.class.page.clear()
                v.class.metric.clear()
                v.class.network.clear()
                v.class.error.clear()

                v.page.afterKey = []
                v.page.offsetIndex = 1
                v.page.mark = false
                v.searchValue.page = ''

                v.network.afterKey = []
                v.network.offsetIndex = 1
                v.network.mark = false
                v.searchValue.network = ''

                v.error.afterKey = []
                v.error.offsetIndex = 1
                v.error.mark = false
                v.searchValue.error = ''
            }
        }

    }
    webperf.init.event()
    webperf.init.created()
</script>
