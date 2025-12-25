<%@ page contentType="text/html;charset=UTF-8" %>
<style>
    .gm_header {
        margin-bottom: 30px;
    }

    .gm_contents .menu_tab {
        height: 38px;
        border-bottom: 1px solid var(--color-border-out-light);
        text-align: center;
        grid-template-columns: repeat(13, 1fr);
        display: grid;
        margin-bottom: 8px;
    }

    .gm_contents .menu_tab > button {
        color: #A7ADBA;
    }

    .gm_contents .menu_tab > button.selected {
        color: var(--logo-purple-1);
        border-bottom: 3px solid var(--logo-purple-1);
    }

    .gm_contents .external, .gm_contents .history {
        display: none;
    }

    .gm_contents .desc {
        margin-bottom: 1em;
        margin-top: 2em;
        display: flex;
        align-items: center;
    }

    table {
        background-color: white;
        width: 100%;
        height: 100%;
        display: block;
    }

    table thead {
        display: block;
    }

    table thead tr {
        display: grid;
        grid-template-columns: 24% 15% 15% 14% 21% 11%;
        width: 100%;
        border-bottom: 1px solid #f5f6f7;
        position: sticky;
        top: 0;
    }

    table tbody tr:last-child {
        border-bottom: none;
    }

    table thead tr th {
        padding: 15px;
        color: var(--color-grid-title-light-2);
        font-size: 14px;
        font-weight: 400;
        text-align: left;
        vertical-align: middle;
        display: flex;
        align-items: center;
    }

    table tbody {
        display: block;
    }

    table tbody tr {
        display: grid;
        width: 100%;
        grid-template-columns: 24% 15% 15% 14% 21% 11%;
        border-bottom: 1px solid #f5f6f7;
        align-items: center;
    }

    table tbody tr td {
        padding: 15px;
    }

    .ft-14 {
        font-size: 14px;
    }

    .sub_title {
        font-weight: 600;
        color: #5C656A;
        font-size: 15px;
    }

    .ft-12 {
        font-size: 12px
    }

    .external .channel_wrap {
        display: flex;
        gap: 2em;
    }

    .external .channel_wrap .channel_item {
        display: flex;
        flex-direction: column;
        gap: .6em;
        align-items: center;
    }

    .sm_config_item_wrap label {
        display: flex;
        color: #3D3D3D;
        font-size: 14px;
        font-weight: 700;
        height: 20px;
        vertical-align: bottom;
        align-items: center;
    }

    .sm_config_item_wrap .circle {
        margin-right: 10px;
    }

    .sm_config_item_wrap .config_contents_wrap {
        width: 100%;
        border-radius: var(--radius);;
        margin-bottom: 16px;
    }

    .sm_config_item_wrap .config_content {
        display: grid;
        grid-template-columns: 25% auto;
        align-items: center;
        border-bottom: 1px solid #e3e5e8;
        padding-bottom: 16px;
    }

    .sm_config_item_wrap .config_content:last-child {
        padding-top: 16px;
        border-bottom: none;
    }

    .sm_config_item_wrap .config_list_item {
        display: flex;
        justify-content: space-between;
        padding: 16px;
        gap: 30px;
    }

    .sm_config_item_wrap .config_list_item .list_item {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .sm_config_item_wrap .config_list_item .list_item:first-child {
        width: 50%;
    }

    .sm_config_item_wrap .config_list_item .list_item:last-child {
        width: 49%;
        display: flex;
        justify-content: space-between;
    }

    .sm_config_item_wrap .config_list_item label + input[type="text"] {
        width: 100px;
    }

    .sm_config_item_wrap .config_list_item .list_item > div {
        display: flex;
        align-items: center;
        gap: 10px;
        justify-content: flex-end;
    }

    .sm_config_item_wrap .config_list_item .list_item .btn_common {
        font-size: 14px;
        width: 75px;
    }

    .sm_config_item_wrap .config_list_item .list_item .btn_common.checked {
        background-image: url("/images/maxy/icon-mark-check.svg");
        background-repeat: no-repeat;
        background-position: center;
    }

    .sm_config_item_wrap .config_list_item .list_item .btn_common.checked:after {
        content: '';
    }

    .sm_config_item_wrap .config_list_item .input_url {
        width: 100% !important;
    }

    .sm_config_item_wrap .config_list_item .input_time {
        width: 100% !important;
    }

     .channel_item input[type="radio"] + label {
        width: 15px;
        background: url(/images/maxy/icon-check-circle-off.svg) no-repeat 0 center /15px;
    }

     .channel_item input[type="radio"]:checked + label {
        background-image: url(/images/maxy/icon-check-circle-on.svg);
        cursor: pointer;
    }

    .sm_config_item_wrap .config_header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .channel_item .icon_slack {
        background: url(/images/maxy/icon-slack.svg) no-repeat center /60px;
    }

    .channel_item .icon_kakao {
        background: url(/images/maxy/icon-kakao.svg) no-repeat center /60px;
    }

    .channel_item .icon_sms {
        background: url(/images/maxy/icon-sms.svg) no-repeat center /60px;
    }

    .channel_item > div {
        width: 60px;
        height: 60px;
    }

    .config_content_full {
        grid-template-columns: 1fr;
        height: auto;
        align-items: flex-start;
    }

    .target_desc_table {
        border: 1px solid #E3E5E8;
        border-radius: var(--radius);
        overflow: hidden;
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        min-height: 0;
    }

    .target_desc_table .table_body {
        max-height: 300px;
        overflow-y: auto;
    }

    .target_desc_table .table_head,
    .target_desc_table .table_row {
        gap: .5em;
        display: grid;
        grid-template-columns: 24% 58% 15%;
        align-items: center;
        padding: 12px;
    }

    .target_desc_table .table_head {
        background: #f8f9fb;
        color: #5C656A;
        font-weight: 600;
        font-size: 14px;
        border-bottom: 1px solid #e3e5e8;
    }

    .target_desc_table .table_row {
        font-size: 14px;
        color: #3D3D3D;
        border-bottom: 1px solid #e3e5e8;
    }

    .target_desc_table .table_row span {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .target_desc_table .table_row span:nth-of-type(1) {
        max-width: 175px;
    }

    .target_desc_table .table_row span:nth-of-type(2) {
        max-width: 400px;
    }

    .target_desc_table .table_row:last-child {
        border-bottom: none;
    }

    .target_desc_table .table_row .btn_remove {
        background: url(/images/maxy/icon-delete.svg) no-repeat center /15px;
        width: 70px;
        height: 19px;
    }

    .target_desc_table .table_row.input_row {
        background: #fbfbfc;
    }

    .target_desc_table .table_row.input_row input {
        width: 100%;
    }

    .target_desc_table .table_row .btn_add_target {
        width: 100%;
    }

    .table_body .empty {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #808080;
    }

    /* external 영역 높이 고정 및 우측 리스트 스크롤 전용 처리 */
    #externalTable {
        display: grid;
        height: 100%;
    }

    .external_dv_wrap {
        gap: 2%;
        display: flex;
        align-items: flex-start;
    }

    .external_dv_wrap > .config_contents_wrap,
    .external_dv_wrap > div {
        flex: 1 1 48%;
        display: flex;
        flex-direction: column;
        min-height: 0; /* ★ 이게 없으면 계속 늘어남 */
    }

    .ml-auto {
        margin-left: auto;
    }

    .purple.ft-12.ml-auto {
        margin-right: 1em;
    }

    .btn_common:disabled {
        border: 1px solid #e3e5e8;
    }

    #alarmTable tbody tr.use_n {
        color: var(--color-readonly);
    }

    .external .external_contents_wrap {
        display: grid;
        grid-template-rows: 165px auto;
        height: 100%; /* ★ 중요 */
    }

    .btn_common.delete {
        margin-left: auto;
        margin-right: .7em;
    }
</style>
<%-- 관리 > Log Description --%>
<div class="gm_wrap">
    <div class="gm_header">
        <div class="gm_menu_text_wrap">
            <h4 class="gm_menu_title" data-t="menu.management.notificationsetting"></h4>
            <h5 class="gm_menu_desc" data-t="management.title.desc.notificationSetting"></h5>
        </div>
        <div class="gm_menu_button_wrap mt_auto">
            <span class="app_icon">A</span>
            <select id="packageNm" class="app_info_select"></select>
        </div>
    </div>
    <div class="gm_contents">
        <div class="menu_tab">
            <button id="btnAll" class="selected" data-type="setting">알림</button>
            <button data-type="external">외부 연동</button>
            <button data-type="history">알림 이력</button>
        </div>
        <div class="setting">
            <div class="desc">
                <div class="ft-14 sub_title">알림 항목 설정</div>
                <div class="purple ft-12 ml-auto">※ 모든 알림 항목은 하루를 기준으로 설정됩니다.</div>
                <button class="btn_common opposite" id="btnAlertSave" disabled>저장</button>
            </div>
            <div class="maxy_box">
                <table class="alarm-table" id="alarmTable">
                    <thead>
                    <tr>
                        <th>항목</th>
                        <th>임계치</th>
                        <th>추가 조건</th>
                        <th>지속 시간</th>
                    </tr>
                    </thead>
                    <tbody>
                    </tbody>
                </table>
            </div>
        </div>
        <div class="external">
            <div class="external_contents_wrap">
                <div>
                    <div class="desc">
                        <div class="ft-14 sub_title">연동 채널 (3)</div>
                    </div>
                    <div class="channel_wrap">
                        <div class="channel_item">
                            <div class="icon_slack"></div>
                            <input type="radio" id="slack" name="channel" data-type="slack" data-label="Slack" checked><label for="slack"></label>
                        </div>
                        <div class="channel_item">
                            <div class="icon_kakao"></div>
                            <input type="radio" id="kakaoTalk" name="channel" data-type="kakao" data-label="KaKao"><label for="kakaoTalk"></label>
                        </div>
                        <div class="channel_item">
                            <div class="icon_sms"></div>
                            <input type="radio" id="sms" name="channel" data-type="sms" data-label="SMS"><label for="sms"></label>
                        </div>
                    </div>
                </div>
                <div id="externalTable">
                    <div class="desc">
                        <div class="ft-14 sub_title">연동 설정</div>
                    </div>
                    <div class="sm_config_item_wrap current_tab" data-type="slack">
                        <div class="config_item">
                            <div class="border_bottom_purple_wrap config_header">
                                <p class="type_text">Slack</p>
                                <button class="btn_common delete" id="btnExternalDelete" data-t="common.btn.delete">삭제</button>
                                <button class="btn_common opposite" id="btnExternalSave">
                                    <span data-t="common.btn.save"></span>
                                </button>

                            </div>
                            <div class="external_dv_wrap">
                                <div class="config_contents_wrap">
                                    <div class="config_content">
                                        <label for="url">URL</label>
                                        <input id="url" type="text">
                                    </div>
                                    <div class="config_content">
                                        <label for="token">Token</label>
                                        <input id="token" type="text">
                                    </div>
                                </div>
                                <div>
                                    <div class="config_content_full">
                                        <!-- 여기에 target list 추가 -->
                                        <div class="target_desc_table">
                                            <div class="table_head">
                                                <span>Target</span>
                                                <span>Desc</span>
                                                <span>Action</span>
                                            </div>
                                            <div class="table_body enable_scrollbar" id="targetDescList"></div>
                                            <div class="table_row input_row">
                                                <input id="targetInput" type="text" placeholder="예: hong">
                                                <input id="descInput" type="text" placeholder="예: Error 발생 시 알림">
                                                <button type="button" class="btn_common btn_add_target" id="btnAddTarget">추가</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="history">
            <div id="historyTable"></div>
        </div>
    </div>
    <div class="maxy_popup_common_wrap" id="maxyPopupWrap"></div>
</div>
<%--suppress ES6ConvertVarToLetConst --%>
<script>
    var GM1101 = {
        v: {
            table: null,
            alertConfigList: [],
            targetDescList: []
        },
        init: {
            // 이벤트 초기화 (중복 바인딩 방지)
            unbindEvents() {
                $(document).off('click.gm1101AlarmTable')
                $(document).off('click.gm1101TargetRemove')
            },
            event() {
                const {func} = GM1101
                const $channelInputs = $('.channel_wrap input[name="channel"]')

                // 기존 이벤트 제거
                this.unbindEvents()

                $('#packageNm').on('change', function () {
                    // 패키지 변경시 osType, appVer 전체 값으로 초기화
                    sessionStorage.setItem('osType', 'A')
                    sessionStorage.setItem('appVer', 'A')

                    func.fetch.getAlertConfig()
                    func.fetch.getAlertHistoryList()
                    func.fetch.getAlertSendConfig()
                })

                $('#btnAlertSave').on('click', function () {
                    func.fetch.saveAlertConfig()
                })

                // 알림 / 외부연동 / 알림이력 탭 클릭 이벤트
                $('.gm_contents .menu_tab').on('click', 'button', function () {
                    const type = $(this).data('type')
                    const $contents = $('.gm_contents')
                    const $sections = $contents.children('.setting, .external, .history')

                    $(this).siblings('button').removeClass('selected')
                    $(this).addClass('selected')

                    // setting 탭의 선택된 row 해제
                    $contents.find('.setting tr.selected').removeClass('selected')

                    // 모든 섹션 숨김 후 선택 섹션만 표시 (external은 grid)
                    $sections.hide().removeClass('show')

                        $contents.children('.' + type).show()

                })

                // 외부 연동 > SMS / KAKAO / SLACK change 이벤트
                $channelInputs.on('change', function () {
                    const type = $(this).data('type')
                    const label = $(this).data('label')

                    func.draw.resetExternalForm()
                    func.draw.updateChannelTab(type, label)
                })

                const $defaultChannel = $channelInputs.filter(':checked')
                if ($defaultChannel.length) {
                    func.draw.updateChannelTab($defaultChannel.data('type'), $defaultChannel.data('label'))
                }

                // 알림 이력 > 타겟 추가
                $('#btnAddTarget').on('click', function () {
                    func.draw.addTargetDesc()
                })

                // 알림 이력 > 타겟 삭제
                $(document).off('click.gm1101TargetRemove').on('click.gm1101TargetRemove', '.target_desc_table .btn_remove', function () {
                    const idx = $(this).data('idx')
                    func.draw.removeTargetDesc(idx)
                })

                // 알림 항목 설정 테이블 행 클릭 시 팝업 오픈 이벤트
                // 네임스페이스를 사용하여 이벤트 중복 방지
                $(document).off('click.gm1101AlarmTable').on('click.gm1101AlarmTable', '#alarmTable tbody tr', function () {
                    const {v} = GM1101
                    const {alertConfigList} = v

                    const idx = Number($(this).data('idx'))
                    const rowData = alertConfigList[idx]

                    if (!rowData) return

                    // 기존 선택된 row 해제
                    $('#alarmTable tbody tr.selected').removeClass('selected')

                    $(this).addClass('selected')
                    v.popup.openPopup(rowData)
                })

                $('#btnExternalSave').on('click', function() {
                    const validation = func.cmm.valid()

                    if (validation) {
                        func.fetch.saveAlertSendConfig()
                    }
                   // func.fetch.saveAlertSendConfig()
                })

                $('#btnExternalDelete').on('click', function() {
                    func.fetch.deleteAlertSendConfig()
                })
            },
            created() {
                const {func} = GM1101
                updateContent()
                func.draw.historyTable()
                appInfo.append({ pId: 'packageNm' }).then(() => {
                    func.fetch.getAlertConfig()
                    func.fetch.getAlertSendConfig()
                })
                func.draw.renderTargetDescList()
            }
        },
        func: {
            cmm: {
                escapeHtml(text) {
                    return $('<div>').text(text || '').html()
                },
                valid() {
                    const sendUrl = $('#url').val()

                   if (!sendUrl) {
                        toast('URL은 필수 입력값 입니다.')
                        return false
                    } else {
                        return true
                    }
                }
            },
            draw: {
                updateChannelTab(type, label) {
                    if (!type || !label) return

                    const $configWrap = $('.sm_config_item_wrap')

                    $configWrap.attr('data-type', type)
                    $configWrap.find('.type_text').text(label)
                },
                resetExternalForm() {
                    const {v, func} = GM1101

                    $('#token').val('')
                    $('#channel').val('')
                    $('#url').val('')
                    $('#targetInput').val('')
                    $('#descInput').val('')

                    v.targetDescList = []
                    func.draw.renderTargetDescList()
                },
                addTargetDesc() {
                    const {v, func} = GM1101

                    const $targetInput = $('#targetInput')
                    const $descInput = $('#descInput')

                    const packageNm = $('#packageNm').val()
                    const serverType = $('#packageNm option:checked').data('server-type')
                    const sendType = $('input[name="channel"]:checked').attr('id').toUpperCase()
                    const target = $targetInput.val().trim()
                    const description = $descInput.val().trim()

                    if (!target || !description) {
                        toast('Target과 Desc를 모두 입력하세요.')
                        return
                    }

                    // 중복 Target 방지
                    const hasDuplicate = v.targetDescList.some(item => (item.target || '').trim() === target)
                    if (hasDuplicate) {
                        toast('이미 등록된 Target 입니다.')
                        return
                    }

                    v.targetDescList.push({packageNm, serverType, sendType, target, description})
                    $targetInput.val('')
                    $descInput.val('')

                    func.draw.renderTargetDescList()
                },
                removeTargetDesc(idx) {
                    const {v, func} = GM1101

                    if (idx === undefined || idx === null) return
                    v.targetDescList.splice(idx, 1)
                    func.draw.renderTargetDescList()
                },
                renderTargetDescList() {
                    const {v, func} = GM1101
                    const $list = $('#targetDescList')

                    $list.empty()

                    if (!v.targetDescList.length) {
                        $list.hide()
                        return
                    }

                    $list.show()

                    v.targetDescList.forEach((item, idx) => {
                        const row = '<div class="table_row">' +
                            '<span>' + func.cmm.escapeHtml(item.target) + '</span>' +
                            '<span>' + func.cmm.escapeHtml(item.description) + '</span>' +
                            '<button type="button" class="btn_remove" data-idx="' + idx + '"></button>' +
                            '</div>'

                        $list.append(row)
                    })
                },
                historyTable() {
                    const {v, func} = GM1101

                    v.alertHistoryTable = new Tabulator('#historyTable', {
                        layout: 'fitDataFill',
                        height: 'calc(100vh - 230px)',
                        placeholder: trl('common.msg.noData'),
                        columns: [
                            {
                                title: 'Reg Dt.',
                                field: "regDt",
                                width: "15%",
                                formatter: cell => {
                                    const value = cell.getValue()

                                    if (!value) {
                                        return '-'
                                    } else {
                                        return util.datetimeFormat(value)
                                    }
                                }
                            },
                            {
                                title: 'Target',
                                field: 'target',
                                width: '10%'
                            },
                            {
                                title: 'Alert Type',
                                field: "alertDesc",
                                width: "12%",
                                formatter: cell => {
                                    const value = cell.getValue()

                                    if (!value) {
                                        return '-'
                                    } else {
                                        return value
                                    }
                                }
                            },
                            {
                                title: 'Result',
                                field: 'result',
                                width: '10%',
                                formatter: cell => {
                                    const value = cell.getValue()

                                    if (value === 'F') {
                                        return '실패'
                                    } else {
                                        return '성공'
                                    }
                                }
                            },
                            {
                                title: 'Message',
                                field: "message",
                                width: "51%",
                                formatter: (cell) => {
                                    const value = cell.getValue()

                                    if (!value) {
                                        return '-'
                                    }

                                    return value.replace(/\d+/g, num => util.comma(num))
                                }
                            }
                        ]
                    });

                    v.alertHistoryTable.on('tableBuilt', function () {
                        func.fetch.getAlertHistoryList()
                    })
                },
                setAlertConfig(data) {
                    const {v, func} = GM1101
                    v.alertConfigList = data || []

                    const $tbody = $('#alarmTable tbody')
                    $tbody.empty()

                    data.forEach((el, idx) => {
                        const limitValue = el.limitValue != null ? el.limitValue : 0
                        const targetPostfix = el.targetPostfix || '-'
                        const optional = el.optional || '-'
                        const alertPeriod = el.alertPeriod != null ? el.alertPeriod : 0
                        const userYn = el.useYn === 1 ? 'use_y' : 'use_n'

                        const rowHtml =
                            '<tr data-idx="' + idx + '" class="' + userYn + '">' +
                            '<td>' + (el.targetDesc || '-') + '</td>' +
                            '<td>' + util.comma(limitValue) + targetPostfix + '</td>' +
                            '<td>' + optional + '</td>' +
                            '<td>' + (el.limitOvertime || '-') + '분' + '</td>' +
                            '</tr>'

                        $tbody.append(rowHtml)
                    })

                    // popup 객체는 한 번만 생성.
                    if (!v.popup) {
                        v.popup = new MaxyPopupAlarmSetting(
                            {
                                id: 'alarmSetting',
                                appendId: 'maxyPopupWrap',
                                func: func.fetch.getParamData
                            })
                    }
                    v.popup.closePopup()
                }
            },
            fetch: {
                getDummyData() {
                    const {func} = GM1101
                    const dummyAlarmList = [
                        {
                            targetDesc: 'Error 발생',
                            limitValue: '10',
                            targetPostfix: '건',
                            optional: '-',
                            limitOvertime: '1'
                        },
                        {
                            targetDesc: '최대 Error',
                            limitValue: '100',
                            targetPostfix: '건',
                            optional: '-',
                            limitOvertime: '1'
                        },
                        {
                            targetDesc: 'crash 발생',
                            limitValue: '10',
                            targetPostfix: '건',
                            optional: '-',
                            limitOvertime: '1'
                        },
                        {
                            targetDesc: '최대 Crash',
                            limitValue: '100',
                            targetPostfix: '건',
                            optional: '-',
                            limitOvertime: '1'
                        },
                        {
                            targetDesc: '페이지 로딩 시간',
                            limitValue: '1500',
                            targetPostfix: 'ms',
                            optional: '100건 이상',
                            limitOvertime: '10'
                        },
                        {
                            targetDesc: 'AJAX 응답 시간',
                            limitValue: '1500',
                            targetPostfix: 'ms',
                            optional: '100건 이상',
                            limitOvertime: '1'
                        }
                    ]

                    func.draw.setAlertConfig(dummyAlarmList)
                },
                getAlertConfig() {
                    const {func} = GM1101

                    const param = {
                        packageNm: $('#packageNm').val(),
                        serverType: $('#packageNm option:checked').data('server-type')
                    }

                    ajaxCall('/gm/1101/getAlertConfig.maxy', param).then(data => {
                        if (data && data.length > 0) {
                            func.draw.setAlertConfig(data)
                        } else if (data === undefined || data === null || data.length === 0) {
                            func.fetch.getDummyData()
                        }
                    }).catch(error => {
                        console.log(error)
                    })
                },
                getParamData(data) {
                    // 팝업에서 바꾼 값 받아오기
                    const {v, func} = GM1101

                    try {
                        // 값 받아왔으면 저장버튼 활성화
                        $('#btnAlertSave').removeAttr('disabled')
                        const idx = v.alertConfigList.findIndex(item => item.target === data.target)
                        if (idx !== -1) {
                            v.alertConfigList[idx] = data
                        }

                        func.draw.setAlertConfig(v.alertConfigList)
                    } catch (e) {
                        console.log(e)
                    }
                },
                saveAlertConfig() {
                    const {v} = GM1101

                    ajaxCall('/gm/1101/saveAlertConfig.maxy', v.alertConfigList, {json: true}).then(() => {
                        const msg = trl('common.msg.success')
                        toast(msg)

                        v.popup.closePopup()
                    }).catch(error => {
                        toast(trl(error.msg))
                    })
                },
                getAlertHistoryList() {
                    const {v} = GM1101

                    const param = {
                        packageNm: $('#packageNm').val(),
                        serverType: $('#packageNm option:checked').data('server-type'),
                    }

                    ajaxCall('/gm/1101/getAlertHistoryList.maxy', param).then(data => {
                        v.alertHistoryTable.setData(data)
                    }).catch(error => {
                        toast(trl(error.msg))
                    })
                },
                getAlertSendConfig() {
                    const {v, func} = GM1101

                    const $packageNm = $('#packageNm')
                    const serverType = $packageNm.find('option:checked').data('server-type')
                    const sendType = $('input[name="channel"]:checked').attr('id').toUpperCase()

                    const param = {
                        packageNm: $packageNm.val(),
                        serverType,
                        sendType // 'SLACK', 'KAKAOTALK', 'SMS'
                    }

                    ajaxCall('/gm/1101/getAlertSendConfig.maxy', param).then((data) => {
                        const { config, targets } = data || {};

                        // config 처리 (있을 때만)
                        if (config) {
                            const { token, sendUrl } = config;
                            $('#token').val(token || '');
                            $('#url').val(sendUrl || '');
                        } else {
                            $('#token').val('');
                            $('#url').val('');
                        }

                        // targets 처리 (있을 때 / 없을 때)
                        if (targets && targets.length > 0) {
                            v.targetDescList = targets.map(t => ({
                                packageNm: $packageNm.val(),
                                serverType,
                                sendType,
                                target: t.target,
                                description: t.description
                            }));
                        } else {
                            v.targetDescList = [];
                        }

                        // 렌더링은 한 번만
                        func.draw.renderTargetDescList();
                    }).catch(error => {
                        console.log(error)
                        toast(trl(error.msg))
                    })
                },
                saveAlertSendConfig() {
                    const {v} = GM1101

                    const $packageNm = $('#packageNm')
                    const serverType = $packageNm.find('option:checked').data('server-type')
                    const sendType = $('input[name="channel"]:checked').attr('id').toUpperCase()
                    const token = $('#token').val()
                    const sendUrl = $('#url').val()

                    const param = {
                        packageNm: $packageNm.val(),
                        serverType,
                        sendType, // 'SLACK', 'KAKAOTALK', 'SMS'
                        sendUrl,
                        token,
                        accountId: $('#accountId').val() || null,
                        accountPw: $('#accountPw').val() || null,
                        useYn: 1,
                        targets: v.targetDescList
                    }

                    ajaxCall('/gm/1101/saveAlertSendConfig.maxy', param, {json: true}).then(() => {
                        const msg = trl('common.msg.success')
                        toast(msg)
                        // 저장 버튼 상태 변경
                        // $('.btn_save').addClass('checked')
                        // 설정 목록 새로고침
                        //this.getAlertSendConfig()
                    }).catch(error => {
                        console.log(error)
                        toast(trl(error.msg))
                    })
                },
                deleteAlertSendConfig() {
                    const $packageNm = $('#packageNm')
                    const serverType = $packageNm.find('option:checked').data('server-type')
                    const sendType = $('input[name="channel"]:checked').attr('id').toUpperCase()

                    const param = {
                        packageNm: $packageNm.val(),
                        serverType,
                        sendType // 'SLACK', 'KAKAOTALK', 'SMS'
                    }

                    ajaxCall('/gm/1101/deleteAlertSendConfig.maxy', param).then(() => {
                        const msg = trl('common.msg.delete')
                        toast(msg)
                    }).catch(error => {
                        console.log(error)
                        toast(trl(error.msg))
                    })
                }
            }
        }
    } // end GM1101
    GM1101.init.event()
    GM1101.init.created()
</script>
