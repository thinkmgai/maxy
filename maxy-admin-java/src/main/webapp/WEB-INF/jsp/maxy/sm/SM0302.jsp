<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%-- 시스템관리 > 배치 조회 > 배치 상세 새창 열기 --%>
<html>
<body>
<head>
    <title>Batch History</title>
</head>
<jsp:include page="../common/import.jsp"/>
<jsp:include page="../common/commonScript.jsp"/>
<jsp:include page="../common/sessionHandler.jsp"/>
<style>
    .popup_bottom li > div {
        width: 200px;
    }

    .popup_bottom li p {
        display: flex;
        justify-content: space-between;
    }

    #btnSearchOff {
        margin-top: 10px;
    }

    .dimmed {
        left: 0 !important;
        width: 100vw !important;
    }

    #btnShowUserInfo {
        display: none;
    }

    .tabulator-cell[tabulator-field="returnMsg"] {
        display: inline-block !important;
        text-overflow: ellipsis;
    }

    .batch-detail-dimmed {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.6);
        z-index: 98;
    }

    .popup_batch_detail {
        position: fixed;
        top: 5vh;
        left: 50%;
        transform: translateX(-50%);
        width: 90vw;
        height: 90vh;
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 15px 40px rgba(0, 0, 0, 0.25);
        display: none;
        flex-direction: column;
        z-index: 99;
        padding: 24px;
    }

    .popup_batch_detail .popup_header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 16px;
        border-bottom: 1px solid #ececec;
    }

    .popup_batch_detail .popup_header h5 {
        font-size: 20px;
        font-weight: 600;
        margin: 0;
    }

    .popup_batch_detail .popup_body {
        flex: 1;
        display: flex;
        flex-direction: column;
        padding-top: 16px;
    }

    .batch-detail-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 14px 24px;
    }

    .batch-detail-grid .item {
        display: flex;
        flex-direction: column;
    }

    .batch-detail-grid .label {
        font-size: 12px;
        color: #6f7684;
        margin-bottom: 6px;
        letter-spacing: 0.5px;
        text-transform: uppercase;
    }

    .batch-detail-grid .value {
        font-size: 16px;
        color: #111;
        word-break: break-all;
    }

    .batch-message-area {
        margin-top: 24px;
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 200px;
        height: 72vh;
    }

    .batch-message-area .label {
        font-size: 12px;
        color: #6f7684;
        margin-bottom: 8px;
        letter-spacing: 0.5px;
        text-transform: uppercase;
    }

    .batch-message-box {
        flex: 1;
        border: 1px solid #e1e3e8;
        border-radius: 10px;
        background: #f8f9fc;
        padding: 20px;
        overflow: auto;
        white-space: pre-wrap;
        font-size: 14px;
        line-height: 1.6;
        color: #2c2c2c;
        height: 100%;
        max-height: 650px;
    }

    .btn_popup_close {
        background: none;
        border: none;
        font-size: 22px;
        cursor: pointer;
        color: #9ca3af;
        transition: color 0.2s;
    }

    .btn_popup_close:hover {
        color: #4b5563;
    }
</style>
<header class="main_header">
    <div class="h_left">
        <span class="logo_img">
            <img class="maxy_logo_dk" alt="">
        </span>
    </div>
    <div class="h_right"></div>
</header>
<body>
<section class="main_wrap">
    <!-- 본문 -->
    <article class="contents_wrap new_window">
        <!-- 컨텐츠 헤더 -->
        <div class="contents_header">
            <div class="ctts_h_left">
                <h4>Batch History</h4>
            </div>
            <div class="ctts_h_right">
                <div class="calendar_wrap">
                    <button class="btn_calendar" id="btncalendar"></button>
                    <input type="text" id="calendar" class="calendar_input">
                </div>
            </div>
        </div>

        <div id="batchHistoryList"></div>
    </article>
</section>
<div id="batchDetailDimmed" class="batch-detail-dimmed"></div>
<div id="popupBatchDetail" class="popup_batch_detail">
    <div class="popup_header">
        <h5>Batch Detail</h5>
        <button type="button" class="btn_popup_close" id="btnCloseBatchDetail">&times;</button>
    </div>
    <div class="popup_body">
        <div class="batch-detail-grid">
            <div class="item">
                <span class="label">Run Id</span>
                <span class="value" id="detailBatchRunId"></span>
            </div>
            <div class="item">
                <span class="label">Start Time</span>
                <span class="value" id="detailStartDt"></span>
            </div>
            <div class="item">
                <span class="label">End Time</span>
                <span class="value" id="detailEndDt"></span>
            </div>
            <div class="item">
                <span class="label">Run Time</span>
                <span class="value" id="detailInterval"></span>
            </div>
            <div class="item">
                <span class="label">Parameter 1</span>
                <span class="value" id="detailParameterStart"></span>
            </div>
            <div class="item">
                <span class="label">Parameter 2</span>
                <span class="value" id="detailParameterEnd"></span>
            </div>
        </div>
        <div class="batch-message-area">
            <span class="label">Message</span>
            <div class="batch-message-box" id="detailReturnMsg"></div>
        </div>
    </div>
</div>
</body>
<script>
    var SM0302 = {
        v: {
            id: '',
            table: '',
            time: {
                from: new Date().setHours(0, 0, 0, 0),
                to: new Date()
            }
        },
        init: {
            event() {
                const {func} = SM0302
                $('#btnCloseBatchDetail').on('click', func.popup.close)
                $('#batchDetailDimmed').on('click', func.popup.close)
            },

            created() {
                const {func} = SM0302
                updateContent()
                func.getParamFromPath()
                func.draw.calendar()
                func.draw.table().then(func.fetch.history)
            },
        },

        func: {
            draw: {
                // 화면상단 달력 그리기
                calendar() {
                    const {v, func} = SM0302
                    const {time} = v
                    v.calendar = calendar.init({
                        id: 'calendar',
                        fn: async (dates, date) => {
                            // 캘린더 설정 시 실행할 함수
                            // time 변수에 from / to 를 timestamp 형식으로 채워넣는다.
                            // from은 min 날짜의 00시00분00.000초
                            const from = new Date(date.min).setHours(0, 0, 0, 0)
                            let to

                            if (util.getDateToString(new Date()) === date.max) {
                                to = new Date()
                            } else {
                                to = new Date(date.max).setHours(23, 59, 59, 999)
                            }

                            time.from = from.valueOf()
                            time.to = to.valueOf()

                            func.fetch.history()
                        },
                        created: async () => {
                            $('#calendar').val(util.timestampToDate(time.from) + ' ~ ' + util.timestampToDate(time.to))
                        }
                    })
                },
                async table() {
                    const {v, func} = SM0302
                    v.table = new Tabulator('#batchHistoryList', {
                        height: 'calc(100vh - 160px)',
                        placeholder: trl('common.msg.noData'),
                        layout: 'fitDataFill',
                        columns: [
                            {
                                title: 'Run Id',
                                field: 'batchRunId',
                                width: '7%',
                            },
                            {
                                title: 'Batch Name',
                                field: 'batchNm',
                                width: '15%'
                            },
                            {
                                title: 'Start Time',
                                field: 'startDt',
                                width: '10%',
                                formatter: cell => {
                                    return util.datetimeFormat(cell.getValue())
                                }
                            },
                            {
                                title: 'End Time',
                                field: 'endDt',
                                width: '10%',
                                formatter: cell => {
                                    return util.datetimeFormat(cell.getValue())
                                }
                            },
                            {
                                title: 'Run Time',
                                field: 'intervaltime',
                                width: '7%',
                                formatter: cell => {
                                    if (!cell.getValue() || cell.getValue() === null) {
                                        return ''
                                    } else {
                                        return util.comma(cell.getValue()) + 'sec'
                                    }

                                }
                            },
                            {
                                title: 'Message',
                                field: 'returnMsg',
                                tooltip: function (e, cell) {
                                    let tooltipText = cell.getValue()
                                    return tooltipText.replace(/\n/g, "<br>");
                                },
                                width: '30%'
                            },
                            {
                                title: 'Parameter 1',
                                field: 'parameterStartDt',
                                width: '10%'
                            },
                            {
                                title: 'Parameter 2',
                                field: 'parameterEndDt',
                                width: '10%'
                            }
                        ],
                    });
                    v.table.on('rowClick', (e, row) => {
                        func.popup.open(row.getData())
                    });
                }
            },
            fetch: {
                history() {
                    const {v} = SM0302

                    const params = {
                        'id': v.id,
                        'from': util.getDateTimeToString(new Date(v.time.from), true),
                        'to': util.getDateTimeToString(new Date(v.time.to), true)
                    }

                    ajaxCall('/sm/0400/getBatchHistory.maxy', params).then(data => {
                        v.table.replaceData(data)
                    }).catch(error => {
                        console.log(error)
                        toast(error.msg)
                    })
                }
            },
            popup: {
                open(data = {}) {
                    const popup = SM0302.func.popup
                    $('#detailBatchRunId').text(popup.safe(data.batchRunId))
                    $('#detailStartDt').text(popup.formatDate(data.startDt))
                    $('#detailEndDt').text(popup.formatDate(data.endDt))
                    $('#detailInterval').text(popup.formatRunTime(data.intervaltime))
                    $('#detailParameterStart').text(popup.safe(data.parameterStartDt))
                    $('#detailParameterEnd').text(popup.safe(data.parameterEndDt))
                    $('#detailReturnMsg').text(data.returnMsg || '')

                    $('#popupBatchDetail').fadeIn(150)
                    $('#batchDetailDimmed').fadeIn(150)
                },
                close() {
                    $('#popupBatchDetail').fadeOut(150)
                    $('#batchDetailDimmed').fadeOut(150)
                },
                safe(value) {
                    if (value === null || value === undefined || value === '') {
                        return '-'
                    }
                    return value
                },
                formatDate(value) {
                    if (!value) {
                        return '-'
                    }
                    try {
                        return util.datetimeFormat(value)
                    } catch (e) {
                        console.warn('날짜 포맷팅 실패', e)
                        return value
                    }
                },
                formatRunTime(value) {
                    if (value === null || value === undefined || value === '') {
                        return '-'
                    }
                    return util.comma(value) + ' sec'
                }
            },

            getParamFromPath() {
                const {v} = SM0302
                const urlSearchParams = new URLSearchParams(window.location.search);
                const queryParams = Object.fromEntries(urlSearchParams.entries());
                v.id = queryParams.id
            }
        }
    }

    SM0302.init.created();
    SM0302.init.event();
</script>
</html>
