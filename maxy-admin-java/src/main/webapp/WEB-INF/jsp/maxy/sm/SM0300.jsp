<%--suppress RequiredAttributes --%>
<%--suppress ELValidationInspection --%>
<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%--suppress CssUnusedSymbol --%>
<style>
    .table_space_between {
        display: flex;
        justify-content: space-between;
        width: 97%;
    }

    .tabulator-row .w95p {
        width: 97% !important;
        text-overflow: ellipsis;
        overflow-x: hidden;
    }

    .tabulator-row .w82 {
        width: 50px !important;
        text-overflow: ellipsis;
        overflow-x: hidden;
        text-align: center;
    }

    .table_space_between span {
        width: 90%;
        overflow-x: hidden;
        text-overflow: ellipsis;
        line-height: 16px;
    }

    .table_space_between .open-new-window {
        height: 100%;
    }

    .btn_play {
        color: var(--logo-purple-2);
        font-size: 24px;
        width: 40px;
    }
</style>
<!-- 시스템관리 > 배치 조회 -->
<div class="contents_header">
    <div class="ctts_h_left">
        <h4 data-t="system.title.batch"></h4>
    </div>
    <div class="ctts_h_right">
        <button type="button" class="btn_common download" id="btnOpenAllHistory">
            <span data-t="system.batch.detail"></span>
            <img class="img_search_b" alt="">
        </button>
        <button class="btn_common download" id="btnFindEndless">
            <span data-t="system.batch.unfinishedInquiry"></span>
            <img class="img_search_b" alt="">
        </button>
    </div>
</div>
<div id="batchInfoTable"></div>
<div class="maxy_popup_vertical" id="endlessListPopup">
    <div class="maxy_popup_header">
        <h5 data-t="system.batch.unfinished"></h5>
        <button class="btn_refresh"></button>
    </div>
    <div class="maxy_popup_content">
        <table id="endlessTable">
            <thead>
            <tr>
                <th data-t="system.batch.item"></th>
                <th data-t="system.batch.start"></th>
                <th></th>
            </tr>
            </thead>
            <tbody></tbody>
        </table>
    </div>
</div>
<div class="popup_dimmed" data-content="dimmed"></div>

<jsp:include page="SM0301.jsp"/>
<%--suppress ES6ConvertVarToLetConst --%>
<script>
    var SM0300 = {
        table: '',
        // 전역 변수 모음
        v: {
            tooltip: {
                cycle: null
            },
            updateParam: {
                updateLogNm: '',
                updateLogDescription: ''
            },
            table: ''
        },
        // 초기화 함수 모음
        init: {
            // 버튼 이벤트 등록
            event() {
                const {func} = SM0300
                $('#searchOptionText').on('click', function () {
                    $('#searchPopup').show()
                    $('.dimmed').show()
                })

                $('#insertMaxyBatch').on('click', function () {
                    func.showInsertPopup()
                })

                $('#upd__cycle').off('input').on('input', function (e) {
                    const value = $(this).val();
                    const parsed = func.cronParser(value)
                    console.log('입력 값 변경:', value, parsed);
                    $('#cycleDescTxt').text(parsed)
                })

                $('#btnOpenAllHistory').on('click', function () {
                    func.openBatchHistory()
                })

                $('#btnFindEndless').on('click', func.openEndlessListPopup)

                $('#endlessListPopup .btn_refresh').on('click', func.getEndlessList)
            },

            // 화면이 켜지고 초기값 세팅하는 함수 모음
            created() {
                const {v, func} = SM0300
                updateContent()

                func.drawTable()
                func.getBatchJobList()

                // 크론 표현식 안내
                const desc = 'Quartz cron: sec min hour day month weekday (use ? in day or weekday). E.g. 0 10 0 * * ?'
                if (v.tooltip.cycle) {
                    v.tooltip.cycle.setContent(desc)
                } else {
                    v.tooltip.cycle = tippy('#upd__cycle', {
                        content: desc,
                        arrow: false,
                        placement: 'bottom',
                        allowHTML: true,
                        theme: 'maxy-tooltip',
                        followCursor: true
                    })
                }
            },
        },
        // 일반 함수 모음
        func: {
            showUpdatePopup(e, cell) {
                const {v, func} = SM0300
                const data = cell.getData()
                const {
                    id,
                    jobName,
                    jobNameDesc,
                    parameters,
                    description,
                    cronExpression,
                    useYn,
                } = cell.getData()

                const $popup = $('#batchUpdatePopup')

                $popup.data('id', id)

                $popup.find('#upd__jobName').val(jobName)
                $popup.find('#upd__jobNameDesc').val(jobNameDesc)
                $popup.find('#upd__description').val(description)
                $popup.find('#upd__cycle').val(cronExpression)

                const parsedCycle = func.cronParser(cronExpression)
                $popup.find('#cycleDescTxt').text(parsedCycle)

                try {
                    const j = JSON.parse(parameters)
                    const $parameterList = $('#upd__parameterList')
                    $parameterList.empty()
                    for (let key in j) {
                        const val = j[key]
                        const $li = $('<li class="parameter_list_item">'
                            + '<label class="parameter_list_key_label">Key</label>'
                            + '<input type="text" class="parameter_list_key" value="' + key + '">'
                            + '<label class="parameter_list_value_label">Value</label>'
                            + '<div></div>'
                            + '<input type="text" class="parameter_list_value" value="' + val + '">'
                            + '<button class="btn_delete_param"">'
                            + '<img src="/images/maxy/icon/icon-circle-minus.svg" width="19px" height="19px"/>'
                            + '</button>'
                            + '</li>')

                        // - 버튼에 삭제 이벤트 추가
                        $li.find('.btn_delete_param').on('click', function () {
                            $(this).closest('li').remove();
                        });

                        $parameterList.append($li)
                    }

                    const $btnPlus = $('<li class="btn_plus_param">'
                        + '<button class="" id="btnPlusParam">'
                        + '<img src="/images/maxy/icon-plus.svg" width="14px" height="14px"/>'
                        + '</button>'
                        + '</li>')

                    $parameterList.append($btnPlus)
                    $('.btn_plus_param').off('click').on('click', function () {
                        const $li = $('<li class="parameter_list_item">'
                            + '<label class="parameter_list_key_label">Key</label>'
                            + '<input type="text" class="parameter_list_key">'
                            + '<label class="parameter_list_value_label">Value</label>'
                            + '<div></div>'
                            + '<input type="text" class="parameter_list_value">'
                            + '<button class="btn_delete_param"">'
                            + '<img src="/images/maxy/icon/icon-circle-minus.svg" width="19px" height="19px"/>'
                            + '</button>'
                            + '</li>')
                        // - 버튼에 삭제 이벤트 추가
                        $li.find('.btn_delete_param').on('click', function () {
                            $(this).closest('li').remove();
                        });
                        $btnPlus.before($li)
                    })
                } catch (e) {
                    console.log(e)
                }

                $('#updBatchYn').prop('checked', (useYn === 'Y'))

                $popup.show()

                const $popup_dimmed = $('.popup_dimmed')
                $popup_dimmed.show()

                $('#batchBtnUpdate').unbind('click').bind('click', function () {
                    func.doUpdate(data)
                })

                $('#btnBatchDelete').unbind('click').bind('click', function () {
                    func.delete(data)
                })

                $('#batchBtnUpdateCancel').on('click', SM0301.func.cancelPopup)
                $popup_dimmed.on('click', SM0301.func.cancelPopup)
            },
            runBatch(id, batchType) {
                // runBatch
                const {func} = SM0300

                let type, msg
                if (batchType !== 1) {
                    type = 'stop'
                    msg = 'executeStop'
                } else {
                    type = 'run'
                    msg = 'execute'
                }

                ajaxCall('/sm/0400/' + type + 'Batch.maxy', {id}).then(data => {
                    toast(trl('system.batch.msg.' + msg))
                    func.getBatchJobList(data)
                }).catch(error => {
                    console.log(error)
                    toast(trl(error.msg))
                })
            },

            doUpdate(data) {
                const {func} = SM0300

                const {id: exId} = data

                // 팝업 내의 데이터를 변수로 만듬
                const $popup = $('#batchUpdatePopup')
                const id = $popup.data('id')
                const jobNameDesc = $popup.find('#upd__jobNameDesc').val()
                const description = $popup.find('#upd__description').val()
                const cronExpression = $popup.find('#upd__cycle').val()
                const useYn = $('#updBatchYn').prop('checked') ? 'Y' : 'N'

                // 파라미터 객체 가져오기
                const parameters = {}
                $('#upd__parameterList').find('li').each(function () {
                    const $li = $(this)
                    const key = $li.find('.parameter_list_key').val()
                    const value = $li.find('.parameter_list_value').val()

                    if (key) {
                        parameters[key] = value
                    }
                })

                const params = {
                    id, jobNameDesc, description,
                    cronExpression, useYn, parameters
                }

                // 데이터 검증
                const validationResult = func.validateParams(params)
                if (!validationResult.valid) {
                    toast(validationResult.message)
                    return
                }

                // parameters 는 stringify 해서 db에 넣는다.
                params.parameters = JSON.stringify(params.parameters)

                // 팝업 데이터와 param id 와 다른 경우가 있을 수는 없지만, 그래도 변조 위험때문에 넣음
                if (Number(exId) !== Number(id)) {
                    toast('Wrong Data. Please refresh page.')
                    return
                }

                ajaxCall('/sm/0400/updateBatchJobs.maxy', params).then(data => {
                    toast(trl('common.msg.modify'))
                    SM0301.func.cancelPopup()
                    func.getBatchJobList(data)
                }).catch(error => {
                    console.log(error)
                    toast(trl(error.msg))
                })

            },
            validateParams(params) {
                const {func} = SM0300
                if (typeof params.id !== 'number' || params.id < 0) {
                    return {valid: false, message: 'Invalid Data. Please refresh page.'};
                }

                if (!params.jobNameDesc
                    || typeof params.jobNameDesc !== 'string'
                    || params.jobNameDesc.trim().length === 0) {
                    util.emptyInput($('#upd__jobNameDesc'));
                    return {valid: false, message: 'Job Name Description is required.'};
                }

                if (params.jobNameDesc.length > 255) {
                    util.emptyInput($('#upd__jobNameDesc'));
                    return {valid: false, message: 'Job Name Description is too long.'};
                }

                if (params.description && params.description.length > 255) {
                    util.emptyInput($('#upd__description'));
                    return {valid: false, message: 'Description is too long.'};
                }

                if (!params.cronExpression || params.cronExpression.trim().length === 0) {
                    util.emptyInput($('#upd__cycle'));
                    return {valid: false, message: 'Cron Expression is required.'};
                }

                if (!func.isValidCron(params.cronExpression)) {
                    util.emptyInput($('#upd__cycle'));
                    return {valid: false, message: 'Invalid Cron Expression.'};
                }

                if (typeof params.parameters !== 'object' || Array.isArray(params.parameters)) {
                    return {valid: false, message: 'parameters is required.'};
                }

                for (const key in params.parameters) {
                    if (typeof key !== 'string' || key.trim().length === 0) {
                        return {valid: false, message: 'parameters key must not be empty.'};
                    }
                }

                return {valid: true};
            },
            isValidCron(cron) {
                if (typeof cron !== 'string') {
                    return false;
                }

                const parts = cron.trim().split(/\s+/);
                if (parts.length < 6 || parts.length > 7) {
                    return false;
                }

                // 필드 매핑
                const [sec, min, hour, day, month, weekday, year] = parts;

                // 정규식 정의 (Quartz 규칙에 맞춰 강화됨)
                const validators = [
                    /^(\*|[0-5]?\d|([0-5]?\d-[0-5]?\d))(\/\d+)?$/,          // 초 (0-59)
                    /^(\*|[0-5]?\d|([0-5]?\d-[0-5]?\d))(\/\d+)?$/,          // 분 (0-59)
                    /^(\*|[01]?\d|2[0-3]|([01]?\d-2[0-3]))(\/\d+)?$/,       // 시 (0-23)
                    /^(\*|\?|L|LW|\d{1,2})([WC#L]?\d*)?$/,                  // 일 (1-31 or 특수문자)
                    /^(\*|0?[1-9]|1[0-2]|JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(-\d+)?$/, // 월
                    /^(\*|\?|[0-7]|SUN|MON|TUE|WED|THU|FRI|SAT)([-#]?\d*)?$/, // 요일
                    /^(\*|\d{4})?$/                                         // 연도 (옵션)
                ];

                for (let i = 0; i < parts.length; i++) {
                    if (!validators[i].test(parts[i])) {
                        return false;
                    }
                }

                // day와 weekday 중 하나는 반드시 "?"
                const dayField = day;
                const weekdayField = weekday;

                const isDayWildcard = dayField === '?';
                const isWeekdayWildcard = weekdayField === '?';

                if (!(isDayWildcard ^ isWeekdayWildcard)) {
                    // XOR 조건: 둘 중 하나만 ?여야 함
                    return false;
                }

                return true;
            },

            delete(data) {
                const {func} = SM0300
                const s = prompt(trl('system.batch.msg.deleteWarning'), '')

                if (s === null) {
                    return
                }
                const lang = localStorage.getItem('lang')

                if (s === '삭제에 동의합니다.' && lang === 'ko'
                    || s === 'I agree to deletion' && lang === 'en'
                    || s === '削除に同意します' && lang === 'ja') {
                    const params = {
                        id: data.id,
                    }

                    if (!params.id) {
                        toast(trl('system.batch.msg.invalidParam'))
                    }
                    ajaxCall('/sm/0400/deleteBatchJob.maxy', params).then(data => {
                        toast(trl('common.msg.delete'))
                        SM0301.func.cancelPopup()
                        func.getBatchJobList(data)
                    }).catch(error => {
                        console.log(error)
                        toast(trl(error.msg))
                    })
                } else {
                    toast(trl('system.batch.msg.stringdifferent'))
                }
            },
            // batch history 새창 열기
            openBatchHistory(data) {
                let id = null
                if (data) {
                    id = data.id
                }
                const darkMode = $('body').hasClass('dark_mode')

                const param = id !== undefined && id !== null && id !== '' ? 'id=' + id : ''
                window.open('/sm/0400/goBatchHistory.maxy?' + param
                    + (darkMode ? '&darkYn=' + darkMode : ''), '_blank')
            },
            // 리스트 가져오는 api 호출 함수
            getBatchJobList() {
                const {func} = SM0300
                ajaxCall('/sm/0400/getBatchJobList.maxy', {}).then(data => {
                    func.setData(data)
                }).catch(error => {
                    console.log(error)
                    toast(trl(error.msg))
                })
            },
            rowFormatter(row) {
                const {func} = SM0300
                const el = row.getElement()
                const data = row.getData()
                el.querySelectorAll('.open-new-window').forEach((btn) => {
                    $(btn).off().on('click', function (e) {
                        e.stopPropagation()
                        e.preventDefault()
                        func.openBatchHistory(data)
                    })
                })

                el.querySelectorAll('.btn_play').forEach((btn) => {
                    $(btn).off().on('click', function (e) {
                        e.stopPropagation()
                        e.preventDefault()
                        if (data.batchYn === 'Y') {
                            func.runBatch(data.id, 1)
                        } else {
                            toast(trl('system.batch.msg.executeUnable'))
                            func.runBatch(data.id, 2)
                        }
                    })
                })
            },
            cronParser(cronExpr) {
                if (typeof cronExpr !== 'string') return cronExpr;

                var parts = cronExpr.trim().split(/\s+/);
                if (parts.length < 6) return cronExpr;

                var sec = parts[0];
                var min = parts[1];
                var hour = parts[2];
                var day = parts[3];
                var month = parts[4];
                var weekday = parts[5];

                try {
                    // Every N seconds
                    if (sec.indexOf('*/') === 0 && min === '*' && hour === '*') {
                        return 'Every ' + sec.slice(2) + ' seconds';
                    }

                    // Every N minutes
                    if (min.indexOf('*/') === 0 && hour === '*' && day === '*' && month === '*' && (weekday === '?' || weekday === '*')) {
                        return 'Every ' + min.slice(2) + ' minutes';
                    }

                    // Every N hours
                    if (hour.indexOf('*/') === 0 && day === '*' && month === '*' && (weekday === '?' || weekday === '*')) {
                        return 'Every ' + hour.slice(2) + ' hours';
                    }

                    // Every day at HH:mm
                    if (sec === '0' && /^\d+$/.test(min) && /^\d+$/.test(hour) && day === '*' && month === '*' && (weekday === '?' || weekday === '*')) {
                        return 'Every day at ' + pad(hour) + ':' + pad(min);
                    }

                    // Every week on weekday at HH:mm
                    if (sec === '0' && /^\d+$/.test(min) && /^\d+$/.test(hour) && day === '?' && weekday !== '?' && weekday !== '*') {
                        return 'Every week on ' + weekday + ' at ' + pad(hour) + ':' + pad(min);
                    }

                    // Every month on day N at HH:mm
                    if (sec === '0' && /^\d+$/.test(min) && /^\d+$/.test(hour) && /^\d+$/.test(day) && month === '*' && (weekday === '?' || weekday === '*')) {
                        return 'Every month on day ' + day + ' at ' + pad(hour) + ':' + pad(min);
                    }

                } catch (e) {
                    console.log('cronParser error:', e);
                }

                return cronExpr;

                function pad(val) {
                    val = String(val);
                    return val.length === 1 ? '0' + val : val;
                }
            },
            drawTable() {
                const {v, func} = SM0300
                // 새 창 아이콘
                const openIcon = function (cell) {
                    return '<div class="table_space_between">'
                        + '<span>' + cell.getValue() + '</span>'
                        + '<img src="/images/maxy/icon-open-window.svg" alt="iconModify" class="open-new-window"/>'
                        + '</div>'
                }

                // 사용 여부에 따른 ON/OFF 처리
                const useYn = function (cell) {
                    if (cell.getValue() === 'Y') {
                        return "<span class='btn_yn use w82'>ON</span>"
                    } else if (cell.getValue() === 'N') {
                        return "<span class='btn_yn off w82'>OFF</span>"
                    }
                }

                // 실행 아이콘
                const play = function (cell) {
                    return '<span class="btn_play">' + (cell.getValue() === 'N' ? '■' : '▶') + '</span>'
                }

                const paramParserTooltip = function (e, cell) {
                    return paramParser(cell).replace(/;/g, '<br>')
                }

                const paramParser = function (cell) {
                    const val = cell.getValue()
                    if (val === null || val === undefined || val === '') {
                        return ''
                    }
                    try {
                        const j = JSON.parse(val)
                        let str = ''
                        for (let key in j) {
                            str += key + ': ' + j[key] + '; '
                        }
                        return str
                    } catch (e) {
                        console.log(e)
                        return ''
                    }
                }

                v.table = new Tabulator('#batchInfoTable', {
                    height: 'calc(100vh - 145px)',
                    layout: 'fitDataFill',
                    placeholder: trl('common.msg.noData'),
                    rowFormatter: this.rowFormatter,
                    columns: [
                        {
                            title: 'Job Name',
                            field: "jobNameDesc",
                            vertAlign: 'middle',
                            headerTooltip: "Job Name",
                            width: '20%',
                            formatter: openIcon,
                        },
                        {
                            title: 'Description',
                            field: "description",
                            vertAlign: 'middle',
                            formatter: cell => {
                                return '<span class="w95p">' + cell.getValue() + '</span>'
                            },
                            headerTooltip: "Description",
                            width: '30%',
                            tooltip: true
                        },
                        {
                            title: 'Cycle',
                            field: "cronExpression",
                            vertAlign: 'middle',
                            width: '13%',
                            headerTooltip: "Cycle",
                            formatter: cell => {
                                return func.cronParser(cell.getValue())
                            },
                        },
                        {
                            title: 'Options',
                            field: "parameters",
                            vertAlign: 'middle',
                            width: '12%',
                            headerTooltip: "Options",
                            tooltip: paramParserTooltip,
                            formatter: cell => {
                                return '<span class="w95p">' + paramParser(cell) + '</span>'
                            },
                        },
                        {
                            title: 'Use',
                            field: "useYn",
                            vertAlign: 'middle',
                            width: '7%',
                            headerTooltip: "Use Status",
                            formatter: useYn
                        },
                        {
                            title: 'Last Run',
                            field: "lastRun",
                            vertAlign: 'middle',
                            width: '11%',
                            formatter: cell => {
                                return util.datetimeFormat(cell.getValue())
                            }
                        },
                        {
                            title: 'Run',
                            field: "batchYn",
                            vertAlign: 'middle',
                            width: '6%',
                            tooltip: function (e, cell) {
                                console.log(cell.getValue())
                                return cell.getValue() === 'N'
                                    ? trl('system.batch.text.executeStop')
                                    : trl('system.batch.text.execute')
                            },
                            formatter: play,
                        },
                        {field: "id", visible: false},
                    ],
                })
                v.table.on('rowClick', function (e, row) {
                    e.stopPropagation()
                    e.preventDefault()
                    this.showUpdatePopup(e, row)
                }.bind(this))
            },
            setData(data) {
                const {v} = SM0300
                if (data) {
                    v.table.replaceData(data)
                }
            },

            openEndlessListPopup() {
                const {func} = SM0300

                $('#endlessListPopup').show()
                const $dimmed = $('.dimmed')
                $dimmed.show()
                $dimmed.on('click', func.closeEndlessListPopup)

                func.getEndlessList()
            },
            closeEndlessListPopup() {
                $('#endlessListPopup').hide()
                const $dimmed = $('.dimmed')
                $dimmed.off('click')
                $dimmed.hide()
            },

            getEndlessList() {
                const {func} = SM0300
                ajaxCall('/sm/0400/findEndlessBatchHistory.maxy', {}).then(data => {
                    const {endlessHistoryList} = data

                    func.drawEndlessTable(endlessHistoryList)
                }).catch(error => {
                    console.log(error)
                    toast(trl(error.msg))
                })
            },

            drawEndlessTable(param) {
                const {func} = SM0300
                const $tbody = $('#endlessTable tbody')
                $tbody.empty()
                if (param.length === 0) {
                    const $tr = $('<tr>')
                    $tr.append($('<td>', {
                        text: trl('system.batch.msg.nounfinished')
                    }))

                    $tbody.append($tr)
                    return
                }
                for (let x of param) {
                    const {batchRunId, batchNm, startDt} = x
                    const $tr = $('<tr>')
                    $tr.append($('<td>', {
                        text: batchNm
                    }))
                    $tr.append($('<td>', {
                        text: util.datetimeFormat(startDt)
                    }))
                    const $btnWrap = $('<td>')
                    $btnWrap.append($('<button>', {
                        id: batchRunId,
                        'class': 'btn_delete'
                    }))
                    $tr.append($btnWrap)

                    $tbody.append($tr)
                }
                $('.btn_delete').on('click', (e) => {
                    func.deleteBatchById(e.target.id)
                })
            },
            deleteBatchById(id) {
                const {func} = SM0300
                if (!id) {
                    console.log('no id')
                    return
                }
                ajaxCall('/sm/0400/deleteMaxyBatchHistory.maxy', {'batchRunIds': id}).then(func.getEndlessList).catch(error => {
                    console.log(error)
                    toast(trl(error.msg))
                })
            }
        }
    }

    SM0300.init.created()
    SM0300.init.event()
</script>