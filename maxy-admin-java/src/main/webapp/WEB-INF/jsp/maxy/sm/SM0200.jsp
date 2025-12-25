<%--suppress HtmlFormInputWithoutLabel --%>
<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%--suppress CssUnusedSymbol --%>
<title>Audit Log</title>
<style>
    .datetime_picker_container #searchUserId {
        width: 125px;
    }
</style>

<!-- 시스템 관리 > 감사 로그 -->
<div class="contents_header">
    <div class="ctts_h_left">
        <h4 data-t="system.audit.title"></h4>
    </div>
    <div class="ctts_h_right">
        <div class="datetime_picker_container">
            <div class="datetime_picker_label">User ID</div>
            <div class="date_time_wrap" id="searchUserIdWrap">
                <input type="text" class="" id="searchUserId"
                       placeholder="User ID">
            </div>

            <div class="datetime_picker_label">Action</div>
            <div class="date_time_wrap" id="searchActionWrap">
                <select id="searchAction">
                </select>
            </div>

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

<div id="auditLogTable" class="maxy_log_table"></div>

<div class="popup_dimmed" data-content="dimmed"></div>
<jsp:include page="SM0201.jsp"/>
<%--suppress ES6ConvertVarToLetConst --%>
<script>
    var SM0200 = {
        v: {
            time: {
                from: null,
                to: null
            },
            table: {}
        },
        init: {
            event() {
                const {func} = SM0200

                // 조회 버튼 클릭 이벤트 등록
                $('#searchButton').on('click', function () {
                    func.cmm.doSearch();
                })
            },
            async created() {
                const {v, func} = SM0200
                updateContent()

                await func.draw.calendar()
                func.draw.table()

                // searchAction 선택 요소에 옵션 추가
                func.draw.actionOptions()
                func.fetch.getAuditLogList()
            }
        },
        func: {
            cmm: {
                doSearch() {
                    const {v, func} = SM0200

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

                    // 전체 차트 조회
                    func.fetch.getAuditLogList()
                }
            },
            draw: {
                actionOptions() {
                    // 서버에서 전달된 actions 배열 파싱
                    const actionsArray = JSON.parse('${actions}');

                    // select 요소 참조
                    const $searchAction = $('#searchAction');

                    // 기본 옵션 추가 (전체 선택)
                    $searchAction.append('<option value="">전체</option>');

                    // 배열의 각 항목을 옵션으로 추가 (코드와 한글 설명 함께 표시)
                    actionsArray.forEach(action => {
                        $searchAction.append('<option value="' + action + '">' + action + '</option>');
                    });
                },
                async calendar() {
                    const {v} = SM0200

                    // 현재 시간에서 1시간 전을 시작 시간으로 설정
                    const now = new Date();
                    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0); // 오늘 00:00:00

                    // 초기값 설정
                    const fromDate = util.getDateToString(todayStart)            // 시작 날짜 (YYYY-MM-DD)
                    const toDate = util.getDateToString(now)                     // 종료 날짜 (YYYY-MM-DD)
                    const fromHour = '00'                                        // 시작 시간 (00시)
                    const fromMinute = '00'
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
                table() {
                    const {v, func} = SM0200

                    const columnNames = {
                        "time": trl('common.tableColumn.time'),
                        "deviceId": trl('common.tableColumn.deviceId'),
                        "userId": trl('common.text.userId'),
                        "logClass": trl('common.tableColumn.logClass'),
                        "logType": trl('common.tableColumn.logType'),
                    }

                    v.table = new Tabulator("#auditLogTable", {
                        height: 'calc(100vh - 170px)',
                        layout: 'fitDataFill',
                        placeholder: trl('common.msg.noData'),
                        paginationButtonCount: 1,
                        rowFormatter: this.rowFormatter,
                        columns: [
                            {
                                title: columnNames.time,
                                field: "issuedAt",
                                width: "12%"
                            }, {
                                title: columnNames.userId,
                                field: "userId",
                                width: "10%",
                                formatter: cell => {
                                    const value = cell.getValue()
                                    return util.ellipsis(value, 10)
                                }
                            }, {
                                title: 'Session ID',
                                field: "sessionId",
                                width: "10%",
                                formatter: cell => {
                                    const value = cell.getValue()
                                    return util.ellipsis(value, 10)
                                }
                            }, {
                                title: 'Type',
                                field: "action",
                                width: "10%"
                            }, {
                                title: 'Method',
                                field: "method",
                                width: "17%"
                            }, {
                                title: 'URL',
                                field: "url",
                                width: "15%",
                                formatter: cell => {
                                    const value = cell.getValue()
                                    return util.ellipsis(value, 30)
                                }
                            }, {
                                title: 'Message',
                                field: "message",
                                width: "20%"
                            }
                        ],
                    })

                    v.table.on('rowClick', function (e, row) {
                        e.stopPropagation()
                        e.preventDefault()
                        func.draw.showUpdatePopup(e, row)
                    }.bind(this))
                },
                showUpdatePopup(e, cell) {
                    // cell이 존재하는지 확인
                    if (!cell) {
                        console.error('Cell data is missing');
                        return; // 데이터가 없으면 함수 종료
                    }

                    // getData 메소드가 있는지 확인하고 데이터 가져오기
                    const data = typeof cell.getData === 'function' ? cell.getData() : null;

                    if (!data) {
                        console.error('No data available for this row');
                        return; // 데이터가 없으면 함수 종료
                    }

                    // 데이터에서 속성 추출 (기본값 설정)
                    const action = data.action || '';
                    const duration = data.duration || 0;
                    const ip = data.ip || '';
                    const issuedAt = data.issuedAt || '';
                    const message = data.message || data.messsage || ''; // messsage 오타 수정 및 대체
                    const method = data.method || '';
                    const parameter = data.parameter || '';
                    const sessionId = data.sessionId || '';
                    const url = data.url || '';
                    const userId = data.userId || '';

                    const $popup = $('#accessLogPopup');

                    // 팝업이 존재하는지 확인
                    if ($popup.length === 0) {
                        console.error('Popup element not found');
                        return;
                    }

                    // 각 필드에 값 설정 (요소가 존재하는지 확인)
                    $popup.find('#access_time').val(issuedAt);
                    $popup.find('#access_duration').val(duration + 'ms');
                    $popup.find('#access_userId').val(userId);
                    $popup.find('#access_sessionId').val(sessionId);
                    $popup.find('#access_type').val(action);
                    $popup.find('#access_method').val(method);
                    $popup.find('#access_ip').val(ip);
                    $popup.find('#access_url').val(url);
                    $popup.find('#access_param').val(parameter);
                    $popup.find('#access_msg').val(message); // 수정된 변수명 사용
                    // 중복 코드 제거 (parameter 값 설정 중복)

                    $popup.show();

                    const $popup_dimmed = $('.popup_dimmed');
                    $popup_dimmed.show();

                    $popup_dimmed.on('click', SM0201.func.cancelPopup);
                }
            },
            fetch: {
                getAuditLogList() {
                    const {v} = SM0200

                    const param = {
                        userId: $('#searchUserId').val(),
                        action: $('#searchAction').val(),
                        from: v.time.from,
                        to: v.time.to
                    }

                    ajaxCall('/sm/0200/getAuditLogList.maxy', param).then(data => {
                        v.table.setData(data)
                    }).catch(error => {
                        console.error('Error fetching audit log list:', error);
                        v.table.setData([]) // 에러 발생 시 빈 데이터 설정
                    })
                }
            }
        }
    }

    SM0200.init.created()
    SM0200.init.event()
</script>