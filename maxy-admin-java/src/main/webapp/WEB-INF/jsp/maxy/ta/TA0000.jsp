<%--suppress HtmlFormInputWithoutLabel --%>
<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%--suppress CssUnusedSymbol --%>
<style>
    .contents_area {
        display: flex;
        flex-direction: column;
        gap: 1em;
    }

    .graph_wrap {
        display: grid;
        grid-template-columns: 350px auto;
        border-bottom-left-radius: var(--radius);
        border-bottom-right-radius: var(--radius);
        border: 0;
        box-shadow: 0 0 0 1px #e3e5e8, 0 1px 2px 0 rgba(0, 0, 0, .04);
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        overflow: hidden;
    }

    .dark_mode .graph_wrap {
        box-shadow: none;
    }

    .graph_wrap .highcharts-axis-line {
        display: none;
    }

    .content_tab_wrap {
        display: flex;
        justify-content: space-between;
    }

    .content_tab_wrap .content_tabs {
        display: flex;
        gap: 3px;
    }

    .content_tab_wrap .content_tabs .content_tab {
        width: 85px;
    }

    .content_tab_wrap button.select_all_type {
        box-shadow: 0 0 0 1px #e3e5e8, 0 1px 2px 0 rgba(0, 0, 0, .04);
        border-radius: 7px 7px 0 0;
        width: 65px;
        height: 28px;
        align-items: center;
        background: white url("/images/maxy/icon-list.svg") no-repeat center center;
    }

    .dark_mode .content_tab_wrap button.select_all_type {
        box-shadow: var(--color-block-dark-1);
        background: var(--color-block-dark-1) url("/images/maxy/icon-list.svg") no-repeat center center;
    }

    .paging_btn_wrap {
        margin: 0;
    }

    #packageNm {
        display: none;
    }
</style>
<!-- 로그분석 -->
<div>
    <div class="contents_header">
        <div class="ctts_h_left">
            <span class="app_icon">A</span>
            <select id="packageNm_a" class="app_info_select"></select>
            <span class="app_icon">O</span>
            <select id="osType_a" class="app_info_select"></select>
        </div>
        <div class="ctts_h_right">
            <div class="calendar_wrap">
                <button class="btn_calendar" id="btnTaCalendar"></button>
                <input type="text" id="taCalendar" class="calendar_input">
            </div>
        </div>
    </div>

    <!-- 타임라인 그래프 -->
    <div class="time_line">
        <img class="timestamp" alt="">
        <div class="time_graph">
            <ul class="graph_box" id="timeLineWrap">
                <li><span class="time_no">1</span></li>
                <li></li>
                <li></li>
                <li></li>
                <li></li>
                <li><span class="time_no">6</span></li>
                <li></li>
                <li></li>
                <li></li>
                <li></li>
                <li></li>
                <li><span class="time_no">12</span></li>
                <li></li>
                <li></li>
                <li></li>
                <li></li>
                <li></li>
                <li><span class="time_no">18</span></li>
                <li></li>
                <li></li>
                <li></li>
                <li></li>
                <li></li>
                <li><span class="time_no">24</span></li>
            </ul>
        </div>
    </div>

    <div class="contents_area">
        <div>
            <div class="content_tab_wrap">
                <div class="content_tabs">
                    <div class="content_tab" id="contentTab__error" data-type="error" data-t="dashboard.bi.error"></div>
                    <div class="content_tab" id="contentTab__crash" data-type="crash" data-t="dashboard.bi.crash"></div>
                    <div class="content_tab" id="contentTab__page" data-type="page">PV</div>
                </div>
                <div>
                    <button class="select_all_type" id="btnGoAllLogWindow"></button>
                </div>
            </div>
            <!-- 그래프 영역 -->
            <div class="graph_wrap">
                <div class="left">
                    <div id="countChart"></div>
                </div>
                <div class="right">
                    <div id="histogramChart"></div>
                </div>
            </div>
        </div>

        <!-- 공통 로그 테이블 -->
        <div>
            <div id="logTable" class="maxy_log_table"></div>
        </div>

        <div class="paging_btn_wrap">
            <button class="btn_move_page tabulator-page"
                    data-type="prev"
                    id="btnLoadPrevData"
                    data-t="common.btn.prev"
            ></button>
            <input type="hidden"
                   id="selectSize"
                   value="100">
            <button class="btn_move_page tabulator-page"
                    data-type="next"
                    id="btnLoadNextData"
                    data-t="common.btn.next"
            ></button>
        </div>
    </div>
    <div class="maxy_popup_common_wrap" id="maxyPopupWrap"></div>
</div>

<%--suppress ES6ConvertVarToLetConst --%>
<script>
    var TA0000 = {
        // 로그 분석에서 사용할 전용 변수 모음
        v: {
            //차트 및 테이블 클래스 객체. 차트 객체 아님 주의
            chart: {
                // log count 게이지 차트
                count: null,
                // log histogram 차트
                histogram: null,
                // 로그 목록 테이블
                table: null,
            },
            // 로그 분석 내에서 공통으로 사용할 시간 객체. timestamp 로 형식을 통일 한다
            time: {
                // histogram navigator 설정 시작 시간
                from: null,
                // histogram navigator 설정 끝 시간
                to: null,
                // histogram 차트 조회 시작 시간 (search 시간)
                searchFrom: null,
                // histogram 차트 조회 끝 시간 (search 시간)
                searchTo: null,
                // histogram 차트 조회 끝 시간의 초
                // 현재로 조회한 경우 현재의 초 단위, 현재가 아니라면 59.999
                searchToSecond: null
            },
            // 요청 별 uuid 를 설정하기 위함
            uuid: {
                count: null,
                histogram: null,
                table: null
            },
            // log table 페이징 전용 변수 모음
            page: {
                size: 50,
                // getLogList.maxy 호출시 table 페이지번호
                offsetIndex: 1,
                // getLogList.maxy 호출시 table searchAfter 정보
                lastId: [],
                lastLogTm: [],
                // table 조회할때 v.time.from 과 to 대신 다른 시간범위를 사용한다면
                // 이값으로 table 조회 (histogramChart series click event)
                // table clear시 초기화됨
                from: null,
                to: null
            },
            count: {
                Total: null,
                YDA: null
            }
        },
        // 초기화 함수 모음
        init: {
            // 버튼 이벤트 등록
            event() {
                const {func} = TA0000

                func.addEvent.tab() // 탭이동 관련 이벤트
                func.addEvent.tablePageMove() // log table page prev, next 버튼 이벤트
                func.addEvent.goAllLogWindow() // 실시간 로그조회 새창 띄우기
                func.addEvent.tooltip()
            },
            // 화면이 켜지고 초기값 세팅하는 함수 모음
            async created() {
                const {func} = TA0000
                // 다국어 설정
                updateContent()

                // tab 초기 설정
                await func.set.tab()

                // app info 설정, pIdCb: packageNm_a onChange 콜백함수, oIdCb: osType_a onChange 콜백함수
                await appInfo.append({
                    pId: 'packageNm_a',
                    oId: 'osType_a',
                    pIdCb: func.addEvent.appInfoPackageNmCb,
                    oIdCb: func.addEvent.appInfoOsTypeCb
                })

                // 초기 시간 객체 설정
                await func.set.time()
                await func.set.searchTime()

                // 상단 search 팝업 생성, type에 따라 search팝업 구성
                await search.load()
                await func.search.setSearchType()

                // 캘린더 설정
                func.draw.calendar()

                // timeline 세팅 하기
                func.set.timeline()

                // log count 차트 그리기
                func.draw.count()
                // log histogram 차트 그리기
                func.draw.histogram()
                // log table 그리기
                func.draw.table()

                // log histogram 조회
                // count와 table은 histogram.setData 안에서 조회해줌
                func.fetch.histogram()
            }
        },
        // 함수 모음
        func: {
            cmm: {
                /**
                 * histogram 조회 범위에 따른 적절한 interval 값 반환
                 * @returns {string}
                 */
                calculateHistogramInterval(from, to) {
                    const hoursDiff = Math.floor(util.getHoursDiff(from, to))

                    // 하루 조회 시 1분 간격
                    if (hoursDiff <= 24) {
                        return "1m"
                    } else if (hoursDiff > 24 && hoursDiff <= 72) { // 하루 ~ 3일까지 5분 간격
                        return "5m"
                    } else if (hoursDiff > 72 && hoursDiff <= 144) { // 3일 ~ 6일까지 10분 간격
                        return "10m"
                    } else if (hoursDiff > 144) { // 6일 이상은 1시간 간격
                        return "1h"
                    }
                },
                /**
                 * getLogCount.maxy API에 필요한 param 구성
                 * @returns {timestamp, timestamp, timestamp, timestamp}
                 */
                calculateDateRanges(fromDt, toDt) {
                    const {v} = TA0000

                    const startOfDay = (date) => new Date(date.setHours(0, 0, 0, 0)).getTime(); // 00:00:00.000 타임스탬프
                    const endOfDay = (date) => new Date(date.setHours(23, 59, 59, 999)).getTime(); // 23:59:59.999 타임스탬프

                    const totalFrom = fromDt.setHours(0, 0, 0, 0)
                    let totalTo = ''
                    if(toDt.toDateString() === new Date().toDateString()){
                        totalTo = toDt.getTime()
                    }else{
                        totalTo = toDt.setHours(23, 59, 59, 999)
                    }

                    const yesterday = fromDt.setDate(fromDt.getDate() - 1)
                    let yesterdayFrom = startOfDay(new Date(yesterday))
                    let yesterdayTo = endOfDay(new Date(yesterday))

                    // yesterdayFrom: from 이 속해 있는 날짜의 어제 일자의 00시 00분 00.000초의 timestamp
                    // yesterdayTo: to 가 속해 있는 날짜의 어제 일자의 23시 59분 59.999초의 timestamp
                    // totalFrom: from 이 속해 있는 날짜의 00시 00분 00.000초의 timestamp
                    // totalTo: to 가 오늘이면 오늘의 현재시간, 오늘이 아니라면 to 가 속해 있는 날짜의 23시 59분 59.999초의 timestamp
                    return {yesterdayFrom, yesterdayTo, totalFrom, totalTo};
                },
                /**
                 * 검색 팝업에서 날짜 바꾼 경우 바뀐 날짜가 화면의 캘린더에 세팅되도록 하는 함수
                 */
                updateCalendar() {
                    const {v} = TA0000
                    const {time} = v

                    // 화면 오른쪽 상단 날짜표기
                    $('#taCalendar').val(util.timestampToDate(time.searchFrom) + ' ~ ' + util.timestampToDate(time.searchTo))

                    const minDate = new Date(time.searchFrom)
                    const maxDate = new Date(time.searchTo)

                    // 기존 선택된 날짜 배열 초기화
                    v.calendar.settings.selected.dates = []
                    v.calendar.selectedDates = []

                    // minDate부터 maxDate까지 반복하면서 배열에 날짜 추가
                    let currentDate = new Date(minDate) // minDate를 복사
                    while (currentDate <= maxDate) {
                        // 날짜 형식을 'YYYY-MM-DD'로 변환하여 배열에 추가
                        v.calendar.settings.selected.dates.push(util.getDateToString(currentDate))
                        v.calendar.selectedDates.push(util.getDateToString(currentDate))
                        currentDate.setDate(currentDate.getDate() + 1) // 하루씩 더함
                    }

                    // 달력 ui 업데이트
                    v.calendar.update({year: true, month: true, dates: true})
                },
                updateSearchCalendar() {
                    const {v} = TA0000
                    const {time} = v

                    // 현재 설정된 시간 객체를 기반으로 어제, 전체 시간값 생성
                    const fromDate = util.timestampToDate(time.searchFrom)
                    const toDate = util.timestampToDate(time.searchTo)
                    const today = util.getDateToString(0)

                    $('#searchFromDt').val(fromDate)
                    $('#searchToDt').val(toDate)

                    search.v.fromCalendar.settings.selected.dates = []
                    search.v.toCalendar.settings.selected.dates = []
                    search.v.fromCalendar.settings.selected.dates.push(fromDate)
                    search.v.toCalendar.settings.selected.dates.push(toDate)

                    // 오늘이 아니면 00:00~23:59, 오늘이면 현재시간에 맞춰서
                    if (fromDate !== today) {
                        $('#searchFromDtHH').val('00')
                        $('#searchFromDtmm').val('00')
                        search.v.fromHour = '00'
                        search.v.fromMinute = '00'
                    }
                    if (toDate !== today) {
                        $('#searchToDtHH').val('23')
                        $('#searchToDtmm').val('59')
                        search.v.toHour = '23'
                        search.v.toMinute = '59'
                    } else if (toDate === today) {
                        const now = new Date()
                        let hours = now.getHours()
                        let minutes = now.getMinutes()
                        if (hours < 10) {
                            hours = '0' + hours
                        }
                        if (minutes < 10) {
                            minutes = '0' + minutes
                        }
                        search.v.toHour = hours
                        search.v.toMinute = minutes
                    }

                    // 검색창의 캘린더 update
                    search.v.fromCalendar.update({year: true, month: true, dates: true})
                    search.v.toCalendar.update({year: true, month: true, dates: true})
                }
            },
            search: {
                // search팝업을 tab type에 따라 검색조건 구성
                async setSearchType() {
                    const {func} = TA0000
                    // 현재 보고 있는 탭 상태 가져오기
                    const type = func.get.tab()
                    // 기본 검색 구성
                    let searchType = ['fromDttm', 'toDttm', 'appInfo', 'osType', 'appVer']

                    // 탭에 따라 조회조건 select박스 구성
                    if (type === "page") {
                        searchType.push('textType9')
                    } else if (type === "error") {
                        searchType.push('textType3')
                    } else if (type === "crash") {
                        searchType.push('textType5')
                    }

                    // search 팝업 만들기
                    await search.append({
                        keyword: true,
                        menuNm: 'TA0000',
                        type: searchType,
                        data: {},
                        func: function () {
                            return search.valid(func.search.doSearch)
                        }
                    })

                    // search팝업의 osType, appVer select태그 세션값으로 세팅
                    func.search.settingAppInfo()
                },
                // search팝업에서 검색 눌렀을때
                async doSearch() {
                    const {v, func} = TA0000

                    // search 팝업 안의 from to - 시 분
                    const $searchFromDtHH = $('#searchFromDtHH')
                    const $searchToDtHH = $('#searchToDtHH')
                    const $searchFromDtmm = $('#searchFromDtmm')
                    const $searchToDtmm = $('#searchToDtmm')

                    // 시간, 분 값 2자리로 고정
                    $searchFromDtHH.val($searchFromDtHH.val().padStart(2, '0'))
                    $searchToDtHH.val($searchToDtHH.val().padStart(2, '0'))
                    $searchFromDtmm.val($searchFromDtmm.val().padStart(2, '0'))
                    $searchToDtmm.val($searchToDtmm.val().padStart(2, '0'))

                    // 검색한 osType, appVer 세션에 저장
                    sessionStorage.setItem('osType', $('#osType').val())
                    sessionStorage.setItem('appVer', $('#appVer').val())

                    let $popup = $('#realTime__popup')
                    if (v.type === 'page') {
                        $popup = $('#pageView__popup')
                    }
                    if ($popup.css('display') === 'block') {
                        $popup.hide()
                        $('.dimmed').hide()
                    }

                    // search팝업에서 선택한 osType을 밖에 있는 osType select박스에서도 선택시켜줌
                    $('#osType_a option').each(function () {
                        if ($(this).val() === sessionStorage.getItem('osType')) {
                            $(this).prop('selected', true); // 일치하는 항목 선택
                        } else {
                            $(this).prop('selected', false); // 일치하지 않는 항목은 선택 해제
                        }
                    })

                    v.chart.count.clear()
                    v.chart.table.clear()
                    v.chart.histogram.clear()

                    // search팝업의 시간 값
                    const searchFrom = util.dateStringToTimestamp($('#searchFromDt').val() + $searchFromDtHH.val() + $searchFromDtmm.val())
                    const searchTo = util.dateStringToTimestamp($('#searchToDt').val() + $searchToDtHH.val() + $searchToDtmm.val())

                    // 설정되어있던 histogram min, max값이 새로 검색하는 시간범위 이내가 아니면 초기화
                    if (v.time.searchFrom < searchFrom || v.time.searchTo > searchTo) {
                        v.chart.histogram.clearUserRange()
                    }

                    // search팝업의 값으로 로그 분석 객체에 시간 설정
                    v.time.searchFrom = searchFrom
                    v.time.searchTo = searchTo

                    // 달력 표시 갱신
                    // time.searchFrom, time.searchTo 갱신후 해줘야함
                    await func.cmm.updateCalendar()
                    // 설정시간으로 histogram 재조회
                    func.fetch.histogram()
                    // search 설정정보 저장
                    search.save()
                },
                // search팝업의 osType, appVer select태그 세션값으로 세팅
                settingAppInfo() {
                    const $osType = $('#osType')
                    const $appVer = $('#appVer')

                    $osType.val(sessionStorage.getItem('osType')).prop("selected", true)
                    $appVer.val(sessionStorage.getItem('appVer')).prop("selected", true)
                },
            },
            // 화면 그리기 함수 모음
            draw: {
                // log count 차트 그리기
                count() {
                    const {v} = TA0000
                    v.chart.count = new CountChart({id: 'countChart', targetPage: TA0000})
                },
                // histogram 차트 그리기
                histogram() {
                    const {v} = TA0000
                    v.chart.histogram = new HistogramChart({id: 'histogramChart', targetPage: TA0000})
                },
                // log table 그리기
                table() {
                    const {v} = TA0000
                    v.chart.table = new LogTable({id: 'logTable', targetPage: TA0000})
                },
                // 화면상단 달력 그리기
                calendar() {
                    const {v, func} = TA0000
                    const {time} = v
                    v.calendar = calendar.init({
                        id: 'taCalendar',
                        fn: async (dates, date) => {
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

                            v.chart.count.clear()
                            v.chart.table.clear()
                            v.chart.histogram.clear()

                            // 설정되어있던 histogram min, max값이 새로 검색하는 시간범위 이내가 아니면 초기화
                            if (v.time.searchFrom < searchFrom || v.time.searchTo > searchTo) {
                                v.chart.histogram.clearUserRange()
                            }

                            time.searchFrom = searchFrom
                            time.searchTo = searchTo

                            // search 팝업 달력범위 세팅
                            await func.cmm.updateSearchCalendar()

                            // log histogram 조회
                            func.fetch.histogram()
                        },
                        created: async () => {
                            $('#taCalendar').val(util.timestampToDate(time.searchFrom) + ' ~ ' + util.timestampToDate(time.searchTo))
                        }
                    })
                },
            },
            // 데이터 요청 함수 모음
            fetch: {
                count() {
                    const {v, func} = TA0000
                    // 현재 보고 있는 탭 상태 가져오기
                    const type = func.get.tab()

                    // 요청 uuid 세팅
                    v.uuid.count = util.uuid()
                    // 현재 설정된 앱 정보 객체 가져오기
                    const {packageNm, serverType, osType} = util.getAppInfo('#packageNm_a', '#osType_a')
                    const appVer = sessionStorage.getItem('appVer')

                    // 현재 설정된 시간 객체 가져오기
                    const {from, to} = v.time
                    // 현재 설정된 시간 객체를 기반으로 어제, 전체 시간값 생성
                    const rangeFromDt = new Date(v.time.searchFrom)
                    const rangeToDt = new Date(v.time.searchTo)
                    const {
                        totalFrom,
                        totalTo,
                        yesterdayFrom,
                        yesterdayTo
                    } = func.cmm.calculateDateRanges(rangeFromDt, rangeToDt)

                    const param = {
                        // 앱 정보
                        packageNm, serverType, osType, appVer,
                        // 시간 정보
                        from, to,
                        // 어제 시간 정보
                        yesterdayFrom, yesterdayTo,
                        // 전체 시간 정보
                        totalFrom, totalTo,
                        // 로그 타입 (error, crash, page)
                        type,
                        // uuid
                        uuid: v.uuid.count,
                        // 검색창 내용
                        'searchKey': $('#textType').val(),
                        'searchValue': $('#searchText').val()
                    }
                    ajaxCall('/ta/0000/getLogCount.maxy', param, {
                        responseHeader: true,
                        disableCursor: true
                    }).then(({data, headers}) => {
                        if (!valid.uuid(v.uuid.count, headers)) {
                            return
                        }

                        // type : error, crash, page
                        let type = sessionStorage.getItem('la-tab');
                        if(type === "page") type += "View"

                        v.count.Total = data[type + 'Total'] // Total Count
                        v.count.YDA = data[type + 'YDA'] // Yesterday

                        // log count 데이터 세팅
                        func.set.count(data)
                    }).catch(e => {
                        console.log(e)
                    })
                },
                histogram() {
                    const {v, func} = TA0000
                    // 현재 보고 있는 탭 상태 가져오기
                    const type = func.get.tab()

                    // 요청 uuid 세팅
                    v.uuid.histogram = util.uuid()
                    // 현재 설정된 앱 정보 객체 가져오기
                    const {packageNm, serverType, osType} = util.getAppInfo('#packageNm_a', '#osType_a')
                    const appVer = sessionStorage.getItem('appVer')

                    // 현재 설정된 시간 객체 가져오기
                    // search팝업에서 선택한 시간
                    const from = util.dateStringToTimestamp($('#searchFromDt').val() + $('#searchFromDtHH').val() + $('#searchFromDtmm').val())
                    let to = util.dateStringToTimestamp($('#searchToDt').val() + $('#searchToDtHH').val() + $('#searchToDtmm').val())
                    // to 값이 현재라면 지금 초 단위를 to로 치환, 초 값을 변수에 저장
                    // 현재가 아니면 59.999초를 더해줌
                    const now = new Date().getTime()
                    if (now - to < 60000) {
                        v.time.searchToSecond = now - to
                        to = now
                    } else {
                        v.time.searchToSecond = 59999
                        to += 59999
                    }

                    const param = {
                        // 앱 정보
                        packageNm, serverType, osType, appVer,
                        // 시간 정보
                        from, to,
                        // 로그 타입 (error, crash, page)
                        type,
                        // uuid
                        uuid: v.uuid.histogram,
                        // interval 설정
                        interval: func.cmm.calculateHistogramInterval(from, to),
                        // 검색창 내용
                        'searchKey': $('#textType').val(),
                        'searchValue': $('#searchText').val()
                    }
                    ajaxCall('/ta/0000/getChartData.maxy', param, {
                        responseHeader: true,
                        disableCursor: true
                    }).then(({data, headers}) => {
                        if (!valid.uuid(v.uuid.histogram, headers)) {
                            return
                        }
                        // histogram 데이터 세팅
                        func.set.histogram(data, param)
                    }).catch(e => {
                        console.log(e)
                    })
                },
                table(searchFrom, searchTo) {
                    const {v, func} = TA0000
                    // 현재 보고 있는 탭 상태 가져오기
                    const type = func.get.tab()
                    // 요청 uuid 세팅
                    v.uuid.table = util.uuid()
                    // 현재 설정된 앱 정보 객체 가져오기
                    const {packageNm, serverType, osType} = util.getAppInfo('#packageNm_a', '#osType_a')
                    const appVer = sessionStorage.getItem('appVer')

                    // 지정한 시간범위가 있다면 그 시간범위로 (histogramChart series click event)
                    if (typeof searchFrom !== 'undefined' && typeof searchTo !== 'undefined') {
                        v.page.from = searchFrom
                        v.page.to = searchTo
                    }

                    // histogram 에서 설정된 시간 객체 가져오기
                    let {from, to} = v.time
                    // 지정한 시간범위가 있다면 그 시간범위로 (histogramChart series click event)
                    if (v.page.from !== null && v.page.to !== null) {
                        from = v.page.from
                        to = v.page.to
                    }

                    const param = {
                        // 앱 정보
                        packageNm, serverType, osType, appVer,
                        // 시간 정보
                        from, to,
                        // 로그 타입 (error, crash, page)
                        type,
                        // 페이징 사이즈 (필수값)
                        size: v.page.size,
                        // uuid
                        uuid: v.uuid.table,
                        // 페이징 정보
                        offsetIndex: v.page.offsetIndex,
                        lastId: (v.page.lastId.length !== 0) ? v.page.lastId[v.page.lastId.length - 1] : '',
                        lastLogTm: (v.page.lastLogTm.length !== 0) ? v.page.lastLogTm[v.page.lastLogTm.length - 1] : '',
                        // 검색창 내용
                        'searchKey': $('#textType').val(),
                        'searchValue': $('#searchText').val()
                    }

                    cursor.show(false, '#logTable')
                    ajaxCall('/ta/0000/getLogList.maxy', param, {
                        responseHeader: true,
                        disableCursor: true
                    }).then(({data, headers}) => {
                        if (!valid.uuid(v.uuid.table, headers)) {
                            return
                        }
                        const {logList, lastId, lastLogTm} = data

                        // page Prev 버튼 활성/비활성
                        if (v.page.offsetIndex === 1) $('#btnLoadPrevData').attr('disabled', true);
                        else $('#btnLoadPrevData').attr('disabled', false);

                        // page Next 버튼 활성/비활성
                        if (logList.length < v.page.size) $('#btnLoadNextData').attr('disabled', true);
                        else $('#btnLoadNextData').attr('disabled', false);

                        v.page.lastId.push(lastId)
                        v.page.lastLogTm.push(lastLogTm)

                        v.chart.table.setTime(param.from, param.to)
                        // log list 데이터 세팅
                        func.set.table(logList)
                    }).catch(e => {
                        console.log(e)
                    })
                }
            },
            get: {
                tab() {
                    return $('.content_tab.selected').data('type')
                },
                time() {
                    const {v} = TA0000
                    return {from: v.time.from, to: v.time.to}
                },
            },
            set: {
                /**
                 * 로그 분석 객체에 시간 설정
                 * @param from 시작 시간. 안넣으면 오늘 일자의 00시 00분 00.000초
                 * @param to 끝 시간. 안넣으면 현재 시간
                 */
                time(from = new Date().setHours(0, 0, 0, 0).valueOf(),
                     to = new Date().valueOf()) {
                    const {v} = TA0000
                    v.time.from = Number(from)
                    v.time.to = Number(to)
                },
                /**
                 * histogram 차트 조회 시간 설정 (search 팝업 시간)
                 * @param from 시작 시간. 안넣으면 오늘 일자의 00시 00분 00.000초
                 * @param to 끝 시간. 안넣으면 현재 시간
                 */
                searchTime(from = new Date().setHours(0, 0, 0, 0).valueOf(),
                           to = new Date().valueOf()) {
                    const {v} = TA0000
                    v.time.searchFrom = Number(from)
                    v.time.searchTo = Number(to)
                },
                timeline() {
                    const {v} = TA0000
                    util.initTimeBox(null, v.time)
                },
                tab(type = null) {
                    // type이 null 또는 'null'이면 세션에서 저장된 tab 정보를 가져옴
                    if (!type || type === 'null') {
                        const savedTab = sessionStorage.getItem('la-tab');
                        type = savedTab && savedTab !== 'null' ? savedTab : 'error'; // 저장된 값이 없으면 기본값 'error'
                    }

                    sessionStorage.setItem('la-tab', type);

                    // tab 정보 세팅
                    const $tabs = $('.content_tab');
                    $tabs.removeClass('selected');
                    $tabs.filter('[data-type="' + type + '"]').addClass('selected');
                },
                count(data) {
                    const {v} = TA0000
                    v.chart.count.setData(data)
                },
                histogram(data, param) {
                    const {v} = TA0000
                    v.chart.histogram.setData(data, param)
                },
                table(data) {
                    const {v} = TA0000
                    v.chart.table.setData(data)
                    cursor.hide('#logTable')
                }
            },
            addEvent: {
                // appInfo.js에서 #packageNm_a의 onChange 후 콜백함수
                async appInfoPackageNmCb() {
                    const {v, func} = TA0000

                    sessionStorage.setItem('osType', 'A')
                    sessionStorage.setItem('appVer', 'A')

                    v.chart.count.clear()
                    v.chart.table.clear()
                    v.chart.histogram.clear()

                    const packageNm = sessionStorage.getItem('packageNm')
                    const serverType = sessionStorage.getItem('serverType')
                    const osType = sessionStorage.getItem('osType')
                    const appVer = sessionStorage.getItem('appVer')

                    // packageNm의 모든 option을 순회하며 server-type과 value가 모두 일치하는 option 선택
                    $('#packageNm option').each(function () {
                        if ($(this).data('server-type').toString() === serverType && $(this).val() === packageNm) {
                            $(this).prop('selected', true); // 일치하는 항목 선택
                        } else {
                            $(this).prop('selected', false); // 일치하지 않는 항목은 선택 해제
                        }
                    });

                    await appInfo.setOsType($('#osType'), packageNm, serverType)

                    $('#osType option').each(function () {
                        if ($(this).val() === osType) {
                            $(this).prop('selected', true); // 일치하는 항목 선택
                        } else {
                            $(this).prop('selected', false); // 일치하지 않는 항목은 선택 해제
                        }
                    });

                    await appInfo.setAppVer($('#appVer'), packageNm, serverType, osType)

                    $('#appVer option').each(function () {
                        if ($(this).val() === appVer) {
                            $(this).prop('selected', true); // 일치하는 항목 선택
                        } else {
                            $(this).prop('selected', false); // 일치하지 않는 항목은 선택 해제
                        }
                    });

                    func.fetch.histogram()
                },
                // appInfo.js에서 #osType_a의 onChange 후 콜백함수
                async appInfoOsTypeCb() {
                    const {v, func} = TA0000

                    sessionStorage.setItem('appVer', 'A')

                    v.chart.count.clear()
                    v.chart.table.clear()
                    v.chart.histogram.clear()

                    const packageNm = sessionStorage.getItem('packageNm')
                    const serverType = sessionStorage.getItem('serverType')
                    const osType = sessionStorage.getItem('osType')
                    const appVer = sessionStorage.getItem('appVer')

                    $('#osType option').each(function () {
                        if ($(this).val() === osType) {
                            $(this).prop('selected', true); // 일치하는 항목 선택
                        } else {
                            $(this).prop('selected', false); // 일치하지 않는 항목은 선택 해제
                        }
                    });

                    await appInfo.setAppVer($('#appVer'), packageNm, serverType, osType)

                    $('#appVer option').each(function () {
                        if ($(this).val() === appVer) {
                            $(this).prop('selected', true); // 일치하는 항목 선택
                        } else {
                            $(this).prop('selected', false); // 일치하지 않는 항목은 선택 해제
                        }
                    });

                    func.fetch.histogram()
                },
                tab() {
                    const {v, func} = TA0000
                    const {time} = v
                    $('.content_tab').on('click', async function () {
                        func.set.tab($(this).data('type'))

                        v.chart.count.clear()
                        v.chart.table.clear()
                        v.chart.histogram.clear()

                        await func.search.setSearchType()
                        // search 팝업 달력범위 세팅
                        await func.cmm.updateSearchCalendar()

                        // search팝업에서 시간값은 유지
                        const fromHour = util.timestampToHourMin(time.searchFrom, 'HHmm').substring(0, 2)
                        const toHour = util.timestampToHourMin(time.searchTo, 'HHmm').substring(0, 2)
                        const fromMin = util.timestampToHourMin(time.searchFrom, 'HHmm').substring(2, 4)
                        const toMin = util.timestampToHourMin(time.searchTo, 'HHmm').substring(2, 4)

                        $('#searchFromDtHH').val(fromHour)
                        $('#searchFromDtmm').val(fromMin)
                        $('#searchToDtHH').val(toHour)
                        $('#searchToDtmm').val(toMin)

                        // log histogram 조회
                        func.fetch.histogram()
                    })
                },
                // log table 페이지 이동 event
                tablePageMove() {
                    const {v, func} = TA0000

                    $('#btnLoadPrevData').on('click', function () {
                        if ($('.cursor_dimmed').length > 0) return
                        // table 페이지번호 감소
                        v.page.offsetIndex--;

                        // table searchAfter 이전페이지 정보
                        v.page.lastId.pop()
                        v.page.lastId.pop()
                        v.page.lastLogTm.pop()
                        v.page.lastLogTm.pop()

                        // log table 조회
                        func.fetch.table()
                    })

                    $('#btnLoadNextData').on('click', function () {
                        if ($('.cursor_dimmed').length > 0) return
                        // table 페이지번호 증가
                        v.page.offsetIndex++

                        // log table 조회
                        func.fetch.table()
                    })
                },
                goAllLogWindow() {
                    $('#btnGoAllLogWindow').on('click', function () {
                        const targetUrl = '/ta/0000/goTotalLogView.maxy'
                        window.open(targetUrl, '_blank')
                    })
                },
                tooltip() {
                    const content = trl('common.text.realTimeLog')
                    tippy('#btnGoAllLogWindow', {
                        content: content,
                        arrow: false,
                        placement: 'bottom',
                        allowHTML: true,
                        theme: 'maxy-tooltip'
                    })
                }
            },
        }
    }
    TA0000.init.event()
    TA0000.init.created()
</script>
