<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%-- 로그 분석 > 실시간 로그 조회 새창 열기 --%>
<html>
<body>
<head>
    <title data-t="common.text.realTimeLog"></title>
</head>
<jsp:include page="../common/import.jsp"/>
<jsp:include page="../common/import-components.jsp"/>
<jsp:include page="../common/commonScript.jsp"/>
<jsp:include page="../common/sessionHandler.jsp"/>
<input type="hidden" id="h_ToDt">
<input type="hidden" id="h_FromDt">
<style>
    .contents_wrap {
        padding: 27px;
    }

    #searchToDt {
        display: none;
    }

    .contents_header {
        white-space: nowrap;
    }

    .tabulator-page {
        line-height: 26px;
        display: inline-block;
        margin: 0;
        padding: 0 10px;
        border: 1px solid var(--black-2);
        border-radius: 0;
        background: var(--black-9);
        height: 28px;
        min-width: 32px;
        color: var(--black-2);
    }

    .dimmed {
        left: 0 !important;
        width: 100vw !important;
        height: 100%;
        margin-top: -40px;
    }

    .refresh-page {
        height: 28px;
    }

    .tabulator-cell[tabulator-field="reqUrl"], .tabulator-cell[tabulator-field="resMsg"] {
        display: block !important;
        text-overflow: ellipsis;
        height: auto !important;
    }

    .search_wrap .date_time_wrap_wrap {
        width: 50% !important;
    }

    .tabulator .tabulator-header .tabulator-col.tabulator-sortable .tabulator-col-title {
        padding-right: 0;
    }

    .showLog {
        cursor: pointer;
    }

    .checkBox_wrap {
        grid-column: 1 / 3; /* 첫 번째 열에서 세 번째 열 전까지 차지 */
        height: 200px;
        overflow-y: auto;
    }

    .checkBoxDiv {
        margin-top: 16px;
        text-align: center;
        display: grid;
        grid-template-columns: calc(50% - 8px) calc(50% - 7px);
        justify-content: center;
        align-items: center;
        gap: 15px;
        width: 100%;
    }

    .searchCheckBox {
        font-family: 'Pretendard', sans-serif;
        height: var(--box-height);
        padding-left: var(--left-padding);
        border: 1px solid var(--color-border-in-light);
        border-radius: var(--radius);
        outline: none;
        appearance: none;
    }

    .checkBox_wrap input[type="checkbox"] + label {
        padding: 5px 0 5px 20px !important;
    }

    .title {
        margin-top: 10px;
    }
</style>
<header class="main_header">
    <div class="h_left">
        <span class="logo_img">
            <img class="maxy_logo_dk" alt="">
        </span>
    </div>
    <div class="h_right">
        <span id="showSearchPopupWrapper">
            <button id="btnShowSearchPopup"
                    class="default_btn"
            ></button>
        </span>
        <button class="default_btn day_night_btn dark"></button>
    </div>
</header>
<body>
<section class="main_wrap">

    <!-- 본문 -->
    <article class="contents_wrap new_window">
        <!-- 컨텐츠 헤더 -->
        <div class="contents_header">
            <div class="ctts_h_left">
                <h4 data-t="common.text.realTimeLog"></h4>
                <div class="search_filter_comp">
                    <span class="datetime" id="searchTextDate"></span>
                </div>
            </div>
            <div class="ctts_h_right">
                <c:if test="${prod ne true}">
                    <span id="showError" class="btn_common download showLog" data-type="error">Error</span>
                    <span id="showCrash" class="btn_common download showLog" data-type="crash">Crash</span>
                    <span id="showPageView" class="btn_common download showLog" data-type="pv">PageView</span>
                </c:if>
                <a
                        href=""
                        class="btn_common download"
                        id="downloadResult"
                        target="_blank">
                    <span data-t="common.btn.searchDownload"></span>
                    <img class="img_download" alt="">
                </a>
                <img src="<c:url value="/images/maxy/icon-circle-refresh.svg"/>" alt="refresh" class="refresh-page">
            </div>
        </div>

        <div id="logTable" class="maxy_log_table"></div>
        <div class="paging_btn_wrap">
            <button class="btn_move_page tabulator-page" id="btnLoadPrevData" data-t="common.btn.prev"></button>
            <button class="btn_move_page tabulator-page" id="btnLoadNextData" data-t="common.btn.next"></button>
        </div>
    </article>
    <!-- 본문 -->
</section>
<input type="hidden" id="lastLogTm" value=""/>
<input type="hidden" id="lastLogType" value=""/>
<input type="hidden" id="lastDeviceId" value=""/>

<!-- 마스크-->
<div class="dimmed" data-content="dimmed"></div>
<div class="search_dimmed" data-content="dimmed"></div>
<div class="account_dimmed" data-content="dimmed"></div>
<div class="calendar_dimmed" data-content="dimmed"></div>
</body>
<div class="maxy_popup_common_wrap" id="maxyPopupWrap"></div>
<div class="maxy_popup_common_Log_wrap" id="maxyLogPopupWrap"></div>
<script>
    var TA0001 = {
        v: {
            // 검색 매개 변수 저장용. 페이지 이동시에도 동일한 검색 결과를 바탕으로 이동해야 함
            searchParam: {},
            table: {},
            pageSize: 1000,
            offsetIndex: 0,
            size: 1000,
            moreCnt: 1,
            listSize: '',
            lastTime: [],
            lastId: [],
            lastType: [],
            searchOffset: 0,
            selectedRow: null,
            logTypeInfo: '',
            logTypeArr: [],
            act: 0 // slide 트리거 위함
        },
        init: {
            event() {
                const {v, func} = TA0001
                $('#searchFromDt').on('change', function () {
                    $('#searchToDt').val($(this).val())
                })

                $('#setDownloadUrl').on('click',)

                $('.search_filter_comp').on('click', search.toggle)

                $('#btnLoadNextData').on('click', function () {
                    func.getLogList()
                })

                $('#btnLoadPrevData').on('click', function () {
                    func.getPrevLogList()
                })

                $('#btnLoadMoreData').on('click', function () {
                    func.getLogList()
                })

                $('#resetSearch').on('click', function () {
                    search.reset()
                })

                $('.refresh-page').on('click', function () {
                    v.offsetIndex = 0
                    func.searchNow()
                    func.setSearchText()
                    func.getLogList()
                })

                $('#btnShowSearchPopup').on('click', function () {
                    $('.search_wrap').show()
                    $('.dimmed').show()
                    $('.calendar_dimmed').show()
                })

                // $('.showLog').on('click', function (e) {
                //     e.stopPropagation(); // 이벤트 버블링 방지
                //     console.log('showLog clicked:', e);
                //     func.openLogPopup($(this).text())
                // })
                $('.showLog').on("click", function (e) {
                    func.openLogPopup(e)
                })

                // $('.showLog').unbind('click').bind('click', function () {
                //     func.openLogPopup(this); // this 바인딩을 유지하면서 openLogPopup 호출
                // })

                // esc로 팝업닫기
                popup.escClose()
            },
            created() {
                const {v, func} = TA0001
                if (!sessionStorage.getItem('mrefresh')) {
                    sessionStorage.removeItem('textType')
                    sessionStorage.removeItem('searchText')
                    sessionStorage.setItem('mrefresh', true)
                }
                func.setHandlebars()
                i18next.changeLanguage(getLang()).then(() => {
                    search.append({
                        keyword: true,
                        menuNm: 'TA0001',
                        type: [
                            'fromDttm',
                            'toDttm',
                            'appInfo',
                            //'appVer',
                            //'osType',
                            'textType8',
                            // 'userType1'
                            'checkAppVer'
                        ],
                        func: function () {
                            return search.valid(func.doSearch)
                        }
                    }).then(() => {
                        search.load().then(() => {
                            func.searchNow()
                            func.getLogList()
                            func.setSearchText()
                            func.drawTable()
                            v.size = 1000
                            const $logTypeNm = $('.tabulator-cell[tabulator-field="logTypeNm"]')
                            if ($logTypeNm.text() === "Http") {
                                $logTypeNm.css({"color": "red"})
                            }
                        })
                    })
                })

            }
        },
        func: {
            searchNow() {
                const today = new Date()
                const searchDate = new Date($('#searchFromDt').val()).setHours(0, 0, 0, 0)
                if (new Date().setHours(0, 0, 0, 0) === searchDate) {
                    let hours = today.getHours()
                    let minutes = today.getMinutes()
                    if (minutes < 10) {
                        minutes = '0' + minutes
                    }
                    if (hours < 10) {
                        hours = '0' + hours
                    }
                    $('#searchToDtHH').val(hours)
                    $('#searchToDtmm').val(minutes)
                }
            },
            setHandlebars() {
                Handlebars.registerHelper('downYn', resourceDown => {
                    return !resourceDown ? 'error_row' : ''
                })

                Handlebars.registerHelper('timeCut', duration => {
                    return duration ? Number(duration).toFixed(2) + ' ms' : '-'
                })

                Handlebars.registerHelper('status', resourceDown => {
                    return resourceDown ? '성공' : '실패'
                })

                Handlebars.registerHelper('emptyCheck', v => {
                    return v ? v : '-'
                })

                Handlebars.registerHelper('convertSize', v => {
                    return v ? util.convertFileSize(v) : '-'
                })
            },
            setDownloadUrl(param) {
                const {v} = TA0001
                let url = "<c:url value="/ta/0000/downloadRealtimeLog.maxy?"/>"
                let searchUrl = new URLSearchParams(url.search);

                searchUrl.append('from', param.from);
                searchUrl.append('to', param.to);
                // searchUrl.append('searchVipYn', param.searchVipYn);
                searchUrl.append('searchKey', param.searchKey);
                searchUrl.append('searchValue', param.searchValue);
                searchUrl.append('searchLogType', param.searchLogType);
                //searchUrl.append('osType', param.osType);
                //searchUrl.append('appVer', param.appVer);
                searchUrl.append('osVerListStr', JSON.stringify(param.osVerList));
                searchUrl.append('packageNm', param.packageNm);
                searchUrl.append('serverType', param.serverType);
                searchUrl.append('offsetIndex', v.offsetIndex);
                searchUrl.append('size', v.pageSize);
                searchUrl.append('downloadYn', 'true');
                searchUrl.append('locale', localStorage.getItem('lang'));
                searchUrl.append('searchLogClass', param.searchLogClass);
                searchUrl.append('lastLogTm', v.lastTime[v.lastTime.length - 1]);
                searchUrl.append('lastLogType', v.lastType[v.lastType.length - 1]);
                searchUrl.append('lastDeviceId', v.lastId[v.lastId.length - 1]);

                document.getElementById("downloadResult").href = url + searchUrl;

            },
            isValid() {
                const {func} = TA0001
                const date = new Date()
                const hours = date.getHours()
                const minutes = date.getMinutes()
                const today = util.getDateToString()

                // 시간 입력 값 확인
                const searchFromDt = $('#searchFromDt').val()
                const $searchFromDtHH = $('#searchFromDtHH')
                const $searchToDtHH = $('#searchToDtHH')
                const $searchFromDtmm = $('#searchFromDtmm')
                const $searchToDtmm = $('#searchToDtmm')

                // 종료 시간이 현재 시간보다 큰 경우
                if (today === searchFromDt) {
                    if (hours < Number($searchToDtHH.val()) || hours < Number($searchFromDtHH.val())) {
                        const msg = i18next.tns('common.msg.nowtime')
                        toast(msg)
                        return -1
                    } else if (hours === Number($searchToDtHH.val()) && minutes < Number($searchToDtmm.val())) {
                        const msg = i18next.tns('common.msg.nowtime')
                        toast(msg)
                        return -1
                    }
                }
                // 시작 시간(시)이 종료 시간(시)보다 큰 경우
                if (Number($searchFromDtHH.val()) > Number($searchToDtHH.val())) {
                    const msg = i18next.tns('system.link.msg.onlyendtimestarttime')
                    toast(msg)
                    return -1
                }
                // 시작 시간(시)은 같고 시작 시간(분)보다 종료 시간(분)이 큰 경우
                if (Number($searchFromDtHH.val()) === Number($searchToDtHH.val())
                    && Number($searchFromDtmm.val()) > Number($searchToDtmm.val())) {

                    const msg = i18next.tns('common.msg.invalid.minute')
                    toast(msg)
                    return -1
                }
                if (Number($searchFromDtmm.val()) > 59 || Number($searchToDtmm.val()) > 59) {
                    const msg = i18next.tns('common.msg.maxminute')
                    toast(msg)
                    return -1
                }
                func.doSearch()
            },
            doSearch() {
                const {v, func} = TA0001
                $("#lastLogTm").val('')
                $("#lastLogType").val('')
                $("#lastDeviceId").val('')
                v.offsetIndex = 0
                v.pageSize = 1000
                v.moreCnt = 1
                v.searchOffset = 0
                search.save()
                func.getLogList()
            },
            // 검색 버튼 이벤트 함수 수정
            setSearchText() {
                let optionText = ''
                let $selected = ''
                const searchFromDt = $('#searchFromDt').val()
                const searchFromDttm = $('#searchFromDtHH').val() + ':' + $('#searchFromDtmm').val()
                const searchToDttm = $('#searchToDtHH').val() + ':' + $('#searchToDtmm').val()
                $('#searchTextDate').text(searchFromDt + ' '
                    + searchFromDttm + ' ~ ' + searchToDttm)

                if ($('#presetList').val() === '') {
                    $selected = $('.search_filter select > option:selected').not('#presetList option:selected')
                } else {
                    $selected = $('.search_filter select > option:selected')
                }

                for (let i = 0; i < $selected.length; i++) {
                    const option = $($selected[i]).text()
                    if (option) {
                        optionText += ' | ' + option
                    }
                }
                $('#searchOptionText').text(optionText)
            },
            parseDate() {
                const {v} = TA0001
                const fromDt = $('#searchFromDt').val()
                const fromTm = $('#searchFromDtHH').val() + ':' + $('#searchFromDtmm').val()
                const toTm = $('#searchToDtHH').val() + ':' + $('#searchToDtmm').val()
                const date = fromDt.split('-')

                v.searchParam.fromDt = fromDt + ' ' + fromTm + ':00.000'
                v.searchParam.toDt = fromDt + ' ' + toTm + ':59.999'

                v.searchParam.from = new Date(v.searchParam.fromDt).getTime()
                v.searchParam.to = new Date(v.searchParam.toDt).getTime()

                v.searchParam.year = date[0]
                v.searchParam.month = date[1]
                v.searchParam.day = date[2]
            },
            // 리스트 가져오는 api 호출 함수
            getLogList(pageIndex) {
                const {v, func} = TA0001
                func.parseDate()
                v.offsetIndex++;

                // 체크된 osType, appVer 값
                const osVerArr = []
                $('.check_app_ver_wrap .os_type_detail input[type="checkbox"]:checked').each(function () {
                    osVerArr.push({
                        'osType': $(this).data('ostype'),
                        'appVer': String($(this).data('appver'))
                    })
                })

                // 페이지 번호와 검색 파라미터를 항상 들고 가져옴
                const params = {
                    'pageIndex': pageIndex,
                    'from': v.searchParam.from,
                    'to': v.searchParam.to,
                    'searchKey': $('#textType').val(),
                    'searchValue': $('#searchText').val(),
                    //'osType': $('#osType').val(),
                    'searchVipYn': $('#userType').val(),
                    'searchLogType': v.logTypeArr,
                    'serverType': $('#packageNm option:checked').data('server-type'),
                    'packageNm': $('#packageNm').val(),   // packageNm
                    //'appVer': $('#appVer').val(),
                    'osVerList': osVerArr,
                    'size': 1000,
                    'offsetIndex': v.offsetIndex,
                    'lastLogTm': $('#lastLogTm').val(),
                    'lastLogType': $('#lastLogType').val(),
                    'lastDeviceId': $('#lastDeviceId').val(),
                    'downloadYn': false
                }

                if (util.checkParam(params)) {
                    return;
                }

                const ckBoxes = document.querySelectorAll('.log_type_group_wrap input[type="checkbox"]')
                const checkedCkBoxes = document.querySelectorAll('.log_type_group_wrap input[type="checkbox"]:checked')

                // 모든 체크박스가 체크되어있으면 searchLogType 빈값으로 보내기
                if (ckBoxes.length !== 0 && ckBoxes.length === checkedCkBoxes.length) {
                    params.searchLogType = []
                }

                ajaxCall('/ta/0000/getRealTimeLogList.maxy', params, {json: true})
                    .then(data => {
                        v.selectedRow = null
                        if (v.offsetIndex >= 1) {
                            v.lastTime.push($('#lastLogTm').val());
                            v.lastId.push($('#lastDeviceId').val());
                            v.lastType.push($('#lastLogType').val());
                        }

                        func.setButtonDisabled()
                        func.setSearchText()

                        /*ML0100.v.tmpLogData = undefined;*/
                        if (data.logList != null) {
                            if (data.logList.length < 1000) {
                                $('#btnLoadNextData').attr('disabled', true);
                            } else {
                                $('#btnLoadNextData').attr('disabled', false);
                            }
                            v.listSize = data.logList.length;
                            func.makeList(data)
                            func.setDownloadUrl(params)

                            $('#lastLogTm').val(data.lastLogTm)
                            $('#lastLogType').val(data.lastLogType)
                            $('#lastDeviceId').val(data.lastDeviceId)
                        } else {
                            v.table.replaceData("")
                        }
                    })
                    .catch(error => {
                        search.hide()
                        console.log(error)
                        const msg = i18next.tns('common.msg.noData')
                        const config = {
                            id: 'serverErrorModal',
                            msg: msg
                        }
                        modal.show(config)
                    })

                const $realTimePopup = $('#realTime__popup')
                const $searchPopup = $('#searchPopup')
                if ($realTimePopup.css('display') !== 'none') {
                    $realTimePopup.hide()
                    $('.dimmed').hide()
                }
                if ($searchPopup.css('display') !== 'none') {
                    $searchPopup.hide()
                    $('.search_dimmed').hide()
                }
            },
            getPrevLogList(pageIndex) {
                const {v, func} = TA0001
                v.lastTime.pop();
                v.lastId.pop();
                v.lastType.pop();
                v.offsetIndex--;

                func.parseDate()

                // 체크된 osType, appVer 값
                const osVerArr = []
                $('.check_app_ver_wrap .os_type_detail input[type="checkbox"]:checked').each(function () {
                    osVerArr.push({
                        'osType': $(this).data('ostype'),
                        'appVer': String($(this).data('appver'))
                    })
                })

                // 페이지 번호와 검색 파라미터를 항상 들고 가져옴
                const params = {
                    'pageIndex': pageIndex,
                    'from': v.searchParam.from,
                    'to': v.searchParam.to,
                    'searchKey': $('#textType').val(),
                    'searchValue': $('#searchText').val(),
                    //'osType': $('#osType').val(),
                    'searchVipYn': $('#userType').val(),
                    'searchLogType': v.logTypeArr,
                    'serverType': $('#packageNm option:checked').data('server-type'), // serverType
                    'packageNm': $('#packageNm').val(),   // packageNm
                    //'appVer': $('#appVer').val(),
                    'osVerList': osVerArr,
                    'size': 1000,
                    'offsetIndex': v.offsetIndex,
                    'lastLogTm': v.lastTime[v.lastTime.length - 1],
                    'lastLogType': v.lastType[v.lastType.length - 1],
                    'lastDeviceId': v.lastId[v.lastId.length - 1],
                    'downloadYn': false
                }

                const ckBoxes = document.querySelectorAll('.log_type_group_wrap input[type="checkbox"]')
                const checkedCkBoxes = document.querySelectorAll('.log_type_group_wrap input[type="checkbox"]:checked')

                // 모든 체크박스가 체크되어있으면 searchLogType 빈값으로 보내기
                if (ckBoxes.length !== 0 && ckBoxes.length === checkedCkBoxes.length) {
                    params.searchLogType = []
                }

                ajaxCall('/ta/0000/getRealTimeLogList.maxy', params, {json: true})
                    .then(data => {
                        v.selectedRow = null
                        func.setButtonDisabled()
                        if (data.logList != null) {
                            if (data.logList.length < 1000) {
                                $('#btnLoadNextData').attr('disabled', true);
                            } else {
                                $('#btnLoadNextData').attr('disabled', false);
                            }
                            v.listSize = data.logList.length;
                            func.makeList(data)
                            func.setDownloadUrl(params)
                            $('#lastLogTm').val(data.lastLogTm)
                            $('#lastLogType').val(data.lastLogType)
                            $('#lastDeviceId').val(data.lastDeviceId)
                        } else {
                            v.table.replaceData("");
                        }
                    })
                    .catch(error => {
                        search.hide()
                        const msg = i18next.tns('common.msg.serverError')
                        const config = {
                            id: 'serverErrorModal',
                            msg: msg
                        }
                        modal.show(config)
                    })
                $("#searchPopup").hide();
                $(".dimmed").hide();
            },
            drawTable() {
                const {v, func} = TA0001
                const loginYn = function (cell) {
                    if (cell.getData().loginYn === 'Y') {
                        return "<span class='btn_yn use'>YES</span>"
                    } else if (cell.getData().loginYn === 'N') {
                        return "<span class='btn_yn off'>NO</span>"
                    }
                }

                const columnNames = {
                    "time": i18next.tns('common.tableColumn.time'),
                    "deviceId": i18next.tns('common.tableColumn.deviceId'),
                    "userId": i18next.tns('common.text.userId'),
                    "logClass": i18next.tns('common.tableColumn.logClass'),
                    "logType": i18next.tns('common.tableColumn.logType'),
                    "runTime": i18next.tns('common.tableColumn.runTime'),
                    "call": i18next.tns('common.tableColumn.call'),
                    "return": i18next.tns('common.tableColumn.return'),
                    "osType": i18next.tns('common.tableColumn.ostype'),
                    "osVer": i18next.tns('common.tableColumn.osVer'),
                    "appVer": i18next.tns('common.tableColumn.appVer'),
                    "login": i18next.tns('common.tableColumn.login'),
                    "deviceModel": i18next.tns('common.tableColumn.deviceModel')
                }

                v.table = new Tabulator("#logTable", {
                    height: 'calc(100vh - 190px)',
                    layout: 'fitDataFill',
                    placeholder: i18next.tns('common.msg.noData'),
                    paginationButtonCount: 1,
                    rowFormatter: this.rowFormatter,
                    columns: [
                        {
                            title: columnNames.time,
                            field: "logTm",
                            width: "10%",
                            formatter: util.timestampToDateTimeMs
                        }, {
                            title: columnNames.deviceId,
                            field: "deviceId",
                            width: "20%"
                        }, {
                            title: columnNames.userId,
                            field: "userId",
                            width: "6%",
                            tooltip: util.tooltipFormatter,
                            formatter: idDisplay.getId
                        }, {
                            title: columnNames.logClass,
                            field: "logType",
                            width: "8%",
                            formatter: function (cell) {
                                let value = getLogTypeGroup(cell.getValue())
                                if (value === "Group") {
                                    return "<span style='color:#1E82FF; font-weight:bold;'>" + value
                                        + "</span>";
                                } else {
                                    return value;
                                }
                            }
                        }, {
                            title: columnNames.logType,
                            field: "logType",
                            width: "9%",
                            formatter: cell => {
                                return getLogTypeDetail(cell.getValue())
                            }
                        }, {
                            title: columnNames.runTime,
                            field: "intervaltime",
                            width: "6%",
                            headerTooltip: "Run Time",
                            formatter: cell => {
                                return cell.getValue().toLocaleString() + ' ms'
                            }
                        }, {
                            title: columnNames.call,
                            field: "reqUrl",
                            width: "11%",
                            tooltip: true
                        }, {
                            title: columnNames.return,
                            field: "resMsg",
                            width: "5%",
                            tooltip: true,
                        }, {
                            title: "logType",
                            field: "logType",
                            visible: false
                        }, {
                            title: columnNames.deviceModel,
                            field: "deviceModel",
                            width: "8%",
                            formatter: function (cell) {
                                return getDeviceModel(cell.getValue())
                            }
                        }, {
                            title: columnNames.osVer,
                            field: "osVer",
                            width: "6%",
                            headerTooltip: "OS Version"
                        }, {
                            title: columnNames.appVer,
                            field: "appVer",
                            width: "6%",
                            headerTooltip: "App Version"
                        },
                        {
                            title: columnNames.login,
                            field: "loginYn",
                            width: "4%",
                            headerTooltip: "Log In",
                            formatter: loginYn
                        },
                        {title: "deviceId", field: "deviceId", visible: false},
                        {title: "packageNm", field: "packageNm", visible: false},
                        {title: "serverType", field: "serverType", visible: false},
                    ],
                });

                v.table.on('rowClick', function (e, row) {
                    if (v.selectedRow) {
                        v.selectedRow.getElement().classList.remove('selected_row')
                    }

                    row.getElement().classList.add('selected_row')
                    v.selectedRow = row

                    func.getDeviceDetail(e, row)
                });

            },
            logListClick(e, row) {
                if (this.selectedRow) {
                    this.selectedRow.getElement().classList.remove('selected_row')
                }

                row.getElement().classList.add('selected_row')
                this.selectedRow = row

                this.getDeviceDetail(e, row)
            },

            getDeviceDetail(e, row) {
                const {func} = TA0001
                func.parseDate()

                const params = {
                    deviceId,
                    logType,
                    memUsage,
                    cpuUsage,
                    packageNm,
                    serverType,
                    appVer,
                    reqUrl,
                    from: logTm,
                    aliasValue,
                    _id: _id
                } = row.getData()

                const options = {
                    appendId: 'maxyPopupWrap',
                    id: 'realTime',
                    param: params,
                    deviceId: deviceId,
                    menu: false,
                    mem: TA0001,
                    type: "button",
                    title: reqUrl ? reqUrl : '-'
                }

                new MaxyPopupAnalysisDetail(options)
            },

            makeList(data) {
                const {v} = TA0001
                const {logList} = data
                v.table.clearSort()
                if (logList.length === 0) {
                    v.table.setData(logList)
                } else {
                    if (logList) {
                        if (v.offsetIndex > 0) {
                            v.table.replaceData(logList)
                            v.table.setPageSize(v.pageSize)
                        } else {
                            v.table.replaceData(logList)
                        }
                    }
                }
            },

            loadMoreData() {
                const {v, func} = TA0001
                const addSize = 1000
                v.pageSize += 1000
                v.size = 1000
                v.offsetIndex += Number(v.listSize)

                func.getLogList(1)
            },
            // 결과메시지 팝업 show
            async showLogDetailText(data) {
                let resMsg = data.resMsg
                if (resMsg) {
                    const $logDetailText = $("#logDetailText")
                    const $logDetailTable = $("#logDetailTable")
                    const showTable = () => {
                        $logDetailText.hide()
                        $logDetailTable.show()
                    }
                    const showTextArea = (msg) => {
                        $logDetailText.text(msg)
                        $logDetailTable.hide()
                        $logDetailText.show()
                    }
                    try {
                        resMsg = JSON.parse(resMsg)
                        if (data.logTypeNm === 'Web Navigation'
                            && data.logTypeDnm === 'Resource down') {
                            $logDetailTable.append(await TA0001.func.makeJsonToTable(resMsg))
                            showTable()
                        } else {
                            showTextArea(JSON.stringify(resMsg, null, '\t'))
                        }
                    } catch (e) {
                        showTextArea(resMsg)
                    }
                    $("#allLogDetailPopup").show();
                    $(".dimmed").show();
                }
            },
            // json 데이터를 table 로 만들어 return
            async makeJsonToTable(param) {
                const source = await fetch('/templates/logDetailTable.html')
                    .then(response => response.text())
                const template = Handlebars.compile(source)
                return template({dataList: param})
            },
            showReqUrl(data) {
                $("#setReqUrl").text(data.reqUrl);
                $("#reqUrlPopup").show();
                $(".dimmed").show();
            },

            setButtonDisabled() {
                if (TA0001.v.offsetIndex === 1) {
                    $('#btnLoadPrevData').attr("disabled", true);
                } else {
                    $('#btnLoadPrevData').attr("disabled", false);
                }
            },

            searchById(param) {
                const {v, func} = TA0001
                $('#searchText').val(param.deviceId);
                v.offsetIndex = 0;
                func.getLogList()
            },

            logTypeFormat(row) {
                if (row.getData().logTypeDnm === row.getData().logTypeNm) {
                    return '-'
                } else {
                    return row.getData().logTypeDnm;
                }
            },

            rowFormatter(row) {
                try {
                    if (!row.getData().logType) {
                        return
                    }

                    const logType = row.getData().logType;
                    const convertedLogType = util.convertByLogType(logType);

                    $(row.getCells()[3].getElement()).prepend($("<span>").addClass("bp").addClass(convertedLogType[0]));
                    $(row.getCells()[4].getElement()).prepend($("<span>").addClass(convertedLogType[1]));
                } catch (e) {
                }
            },

            goPageFlow() {
                const targetUrl = '/ua/0000/goUserAnalysisView.maxy'
                window.open(targetUrl, '_blank')
            },

            openLogPopup(e) {
                try {
                    const $clickedTab = $(e.target)
                    let dataTypeValue = $clickedTab.data('type')

                    const options = {
                        appendId: 'maxyLogPopupWrap',
                        id: 'logType',
                        logType: dataTypeValue,
                        title: dataTypeValue
                    }

                    new MaxyPopupLogList(options)
                } catch (e) {
                    console.log(e)
                }
            }
        }
    }

    TA0001.init.event()
    TA0001.init.created()
</script>
</html>