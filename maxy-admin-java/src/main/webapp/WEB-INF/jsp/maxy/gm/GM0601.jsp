<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ page contentType="text/html;charset=UTF-8" %>
<style>
    .gm_header {
        margin-bottom: 16px;
    }

    .gm_header .gm_filter_group .app_info_wrap select:not(:last-child) {
        margin-right: 8px !important;
    }

    .gm_header .gm_filter_group {
        gap: 10px;
    }

    .gm_filter_group .app_info_wrap {
        flex-direction: column;
    }

    .gm_btn_wrap {
        margin-left: auto;
        margin-top: auto;
        gap: 8px;
    }

    .app_info_wrap .app_info_left {
        display: flex;
        align-items: center;
        gap: 8px;
    }

</style>
<%-- 관리 > 알림 목록 --%>
<div class="gm_wrap">
    <div class="gm_header">
        <div class="gm_menu_text_wrap">
            <h4 class="gm_menu_title" data-t="management.title.notificationList"></h4>
            <h5 class="gm_menu_desc" data-t="management.title.desc.notification"></h5>
        </div>

        <div class="gm_btn_wrap">
            <button id="btnDel" class="btn btn_common">
                <span data-t="common.btn.delete"></span>
                <img class="img_delete" alt="">
            </button>
            <button id="btnRead" class="btn btn_common">
                <span data-t="common.btn.read"></span>
                <img class="img_read" alt="">
            </button>
        </div>

    </div>
    <div class="gm_contents">
        <div id="alarmTable"></div>
    </div>

</div>
<script>
    var GM0601 = {
        v: {},
        init: {
            event() {
                $('#btnRead').on('click', () => GM0601.func.setStatus('R'))
                $('#btnDel').on('click', () => GM0601.func.setStatus('D'))
            },
            created() {
                updateContent()
                GM0601.func.createTable()
                GM0601.func.getData()
            }
        },
        func: {
            getSelectedItem() {
                const checked = GM0601.v.table.getSelectedData()
                const list = []
                for (let i = 0; i < checked.length; i++) {
                    list.push(Number(checked[i].seq))
                }

                if (list.length < 1) {
                    const msg = i18next.tns('common.msg.noSelect')
                    modal.show({
                        id: 'noCheckedModal',
                        msg: msg
                    })
                    return
                }

                return list
            },
            async setStatus(status) {
                const {func} = GM0601
                // seq list 가져오기
                const seqList = func.getSelectedItem()
                if (!seqList) {
                    return
                }
                if (seqList.length > 0) {
                    const lang = localStorage.getItem('lang')
                    let msg

                    // 알림 삭제
                    if (status === 'D') {
                        if (lang === 'ko' || lang === 'ja') {
                            msg = seqList.length + i18next.tns('common.msg.countdelete')
                        } else if (lang === 'en') {
                            msg =  i18next.tns('common.msg.countdelete') + seqList.length + ' items?'
                        }
                    }
                    // 알림 상태 변경 (안 읽음 -> 읽음)
                    else if (status === 'R') {
                        msg = i18next.tns('management.notification.msg.statusread')
                    }

                    modal.show({
                        id: 'modifyAlarmStatus',
                        msg: msg,
                        confirm: true,
                        fn: () => {
                            func.modifyAlarmStatus(seqList, status)
                        }
                    })
                } else {

                }

            },
            async modifyAlarmStatus(seqList, status) {
                const {func} = GM0601
                const date = func.getDate()

                const param = {
                    searchFromDt: date.from,
                    searchToDt: date.to,
                    alimSt: status,
                    seqList
                }
                if (param.seqList === undefined
                    || param.seqList == null
                    || param.seqList.length === 0) {
                    return
                }
                await ajaxCall('/gm/0601/modifyAlarmStatus.maxy', param)
                    .then(data => {
                        let msg
                        if (status === 'D') {
                            msg = i18next.tns('common.msg.delete')
                            toast(msg)
                        } else if (status === 'R') {
                            msg = i18next.tns('management.notification.msg.changestatus')
                            toast(msg)
                        }

                        GM0601.func.setData(data)
                    })
                    .catch(error => {
                        toast(i18next.tns(error.msg))
                    })
            },
            setData(data) {
                const alarmList = data.alarmList
                if (alarmList) {
                    GM0601.v.table.setData(alarmList)
                }
            },
            createTable() {
                const dateTimeFormat = (date) => {
                    if (date) {
                        return util.datetimeFormat(date.getValue())
                    } else {
                        return '-'
                    }
                }

                const alimCdFormat = (val) => {
                    let alimCd = val.getValue()
                    if (alimCd) {
                        alimCd = alimCd.toLowerCase()

                        if (alimCd.includes('cpu')
                            || alimCd.includes('mem')
                            || alimCd.includes('com')) {
                            const alimType = i18next.tns('management.notification.type.resource')
                            return '<span>' + alimType + '</span>'
                        } else if (alimCd.includes('err')) {
                            return '<span>Error</span>'
                        } else if (alimCd.includes('crs')) {
                            return '<span>Crash</span>'
                        } else if (alimCd.includes('res')
                            || alimCd.includes('lod')) {
                            const alimType = i18next.tns('management.notification.type.app')
                            return '<span>' + alimType + '</span>'
                        }
                    } else {
                        return '-'
                    }
                }

                const notifyFormat = (row) => {
                    const rowData = row.getData()
                    if (rowData) {
                        const alimCd = rowData.alimCd.toLowerCase()
                        const contents = rowData.contents

                        let [standard, over] = contents.split(':')

                        // 기준 데이터가 들어있음
                        standard = Math.floor(standard)
                        // 실제 발생한 데이터가 들어있음
                        over = Math.floor(over)

                        const fmtOver = GM0601.func.dataFormat(alimCd, standard, over)

                        const ns = 'alarm.' + alimCd
                        // Example: 'alarm.cpu가 임계치를 초과하였습니다.'
                        const alimDetail = i18next.tns(ns)
                        // '기준'
                        const standardText = i18next.tns('alarm.standard')
                        // '초과'
                        const occurrenceText = i18next.tns('alarm.occurrence')

                        // Example: '(기준: 100, 발생: 105)'
                        const countText = ' (' + standardText + ': ' + fmtOver.standard + ', ' + occurrenceText + ': ' + fmtOver.over + ')'

                        return alimDetail + ' ' + countText
                    }
                }

                const appNameFormat = function (cell) {
                    const appNm = util.getAppName(cell)
                    if (appNm) {
                        const serverNm = i18next.tns('common.' + getServerNm(cell.getData().serverType))

                        return appNm + ' (' + serverNm + ')'
                    } else {
                        return '-'
                    }
                }

                const placeholder = i18next.tns('common.msg.noData')

                const columnNames = {
                    'time': i18next.tns('common.tableColumn.time'),
                    'app': i18next.tns('common.text.app'),
                    'classify': i18next.tns('common.tableColumn.classify'),
                    'notification': i18next.tns('common.tableColumn.notification'),
                    'status': i18next.tns('common.text.status')
                }

                GM0601.v.table = new Tabulator('#alarmTable', {
                    height: 'calc(100vh - 170px)',
                    layout: 'fitDataFill',
                    columnHeaderVertAlign: 'middle',
                    placeholder: placeholder,
                    rowFormatter: notifyFormat,
                    columns: [
                        {
                            formatter: "rowSelection",
                            titleFormatter: "rowSelection",
                            hozAlign: 'center',
                            vertAlign: 'middle',
                            headerSort: false,
                            width: "5%"
                        },
                        {
                            title: columnNames.time,
                            field: 'alimDt',
                            width: '12%',
                            formatter: dateTimeFormat,
                        },
                        {
                            title:  columnNames.app,
                            field: 'packageNm',
                            width: '14%',
                            formatter: appNameFormat
                        },
                        {
                            title: columnNames.classify,
                            hozAlign: "center",
                            field: 'alimCd',
                            width: '16%',
                            formatter: alimCdFormat
                        }, {
                            title:  columnNames.notification,
                            field: 'contents',
                            width: '44%',
                            vertAlign: 'middle',
                            formatter: notifyFormat
                        }, {
                            title:  columnNames.status,
                            field: 'alimSt',
                            width: '7%',
                            hozAlign: 'center',
                            vertAlign: 'middle',
                            formatter: (d) => {
                                const v = d.getValue()
                                switch (v) {
                                    case 'R':
                                        const read = i18next.tns('management.notification.text.read')
                                        return '<span class="btn_yn">' + read + '</span>'
                                    case 'N':
                                        const unread = i18next.tns('management.notification.text.unread')
                                        return '<span class="btn_yn read">' + unread + '</span>'
                                    default:
                                        return '<span class="btn_yn off">' + v + '</span>'
                                }
                            },
                        }
                    ]
                })
            },
            dataFormat(alimCd, standard, over) {
                try {
                    switch (alimCd) {
                        // error, crash인 경우
                        case 'err':
                        case 'crs':
                            over = util.comma(over)
                            break
                        // cpu 사용량인 경우
                        case 'cpu':
                            standard = standard + '%'
                            over = over + '%'
                            break
                        // memory 사용량인 경우
                        case 'mem':
                            standard = util.convertMem('kb', standard)
                            over =  util.convertMem('kb', over)
                            break
                        // loading time, response time인 경우
                        case 'lod':
                        case 'res':
                            standard = util.comma(standard) + 'ms'
                            over = util.comma(over) + 'ms'
                            break
                        // comsensitivity (통신감도)인 경우
                        case 'com':
                            standard = util.convertComSensitivity(standard)
                            standard = standard[0]

                            over = util.convertComSensitivity(over)
                            over = over[0]
                            break
                    }
                    return {standard, over}
                } catch (e) {
                    console.log(e)
                }
            },
            async getData() {
                const {func} = GM0601
                await ajaxCall('/gm/0601/getAlarmList.maxy', {})
                    .then(data => {
                        func.setData(data)
                    })
                    .catch(error => {
                        toast(i18next.tns(error.msg))
                    })
            },
            getDate() {
                const {v} = GM0601
                const today = util.getDateToString()
                v.from = today
                v.to = today

                // from 날짜의 00:00:00으로 설정
                // to 날짜의 23:59:59으로 설정
                const fromDate = v.from + ' 00:00:00'
                const toDate = v.to + ' 23:59:59'

                // 서버에 보내기 위해 timestamp 로 변환
                const fromDateTimestamp = util.dateToTimestamp(new Date(fromDate), true)
                const toDateTimestamp = new Date(toDate).getTime()

                return {
                    from: fromDateTimestamp,
                    to: toDateTimestamp
                };
            }
        }
    }
    GM0601.init.event()
    GM0601.init.created()
</script>