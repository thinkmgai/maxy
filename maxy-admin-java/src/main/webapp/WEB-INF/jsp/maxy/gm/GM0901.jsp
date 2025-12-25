<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<title>AI Bot Mgmt.</title>

<style>
    .gm_header .gm_filter_group .app_info_wrap select:not(:last-child) {
        margin-right: 0;
    }

    .gm_contents .history_wrap {
        width: 100%;
        height: calc(100vh - 180px);
        display: grid;
        grid-template-columns: 3fr 1fr;
        gap: 1em;
    }

    .gm_contents .history_wrap .history_contents_wrap {
        background-color: #F7F8FA;
        padding: 2em;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 2em;
    }

    .history_contents_wrap .group_header {
        display: flex;
        justify-content: space-between;
        line-height: 20px;
        height: 20px;
        padding-left: 2.5em;
        background-repeat: no-repeat;
        background-image: url(/images/maxy/icon-ai-mgt.svg);
        font-weight: bold;
    }

    .history_contents_wrap .group_header .btn_aibot_copy {
        margin-top: -5px;
        height: 30px;
        background-size: 30px;
        width: 30px;
        background-image: url(/images/maxy/icon-copy.svg);
    }

    .gm_contents .history_wrap .history_contents_group {
        display: flex;
        gap: 1.5em;
        border: 1px solid var(--color-border-out-light);
        border-radius: var(--radius);
        padding: 1.5em;
        flex-direction: column;
        background-color: white;
    }

    .gm_contents .history_wrap .history_contents_group .history_footer {
        display: flex;
        justify-content: center;
        gap: 1em;
        align-items: center;
    }

    .history_wrap .history_content {
        padding-left: 2.5em;
        line-height: normal;
    }

    .gm_contents .history_wrap .history_group_wrap {
        overflow-y: scroll;
        display: flex;
        flex-direction: column;
        gap: 1em;
    }

    .gm_contents .history_wrap .history_group_wrap .item_card {
        background-image: url(/images/maxy/icon-ai-analysis.svg);
        background-position: 5% 50%;
        background-repeat: no-repeat;
        display: flex;
        gap: 1em;
        flex-direction: column;
        justify-content: center;
        width: 100%;
        height: 75px;
        border: 1px solid var(--color-border-in-light);
        border-radius: 7px;
        padding: 1em 1em 1em 4em;
        cursor: pointer;
    }

    .history_group_wrap .item_card.active {
        border: 1px solid #0089f9 !important;
        background-color: #F1F9FF !important;
    }

    .history_group_wrap .item_card .item_content {
        font-size: 15px;
    }

    .gm_contents .gm_btn_wrap {
        margin-bottom: 1em;
        margin-top: -2em;
    }

    /*  Popup  */
    #popupBotConfig.popup_common {
        display: none;
        position: absolute;
        right: 27px;
        left: auto;
        top: 120px;
        transform: none;
        margin: 0;
        padding: 0;
        z-index: 15;
    }

    #popupBotConfig.popup_common hr {
        background: #DCDCDC;
        height: 1px;
        border: 0;
    }

    #popupBotConfig.popup_common .img_setting {
        content: url("/images/maxy/icon-setting-header.svg");
    }

    #popupBotConfig.popup_common .popup_header {
        padding: 1.5em;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    #popupBotConfig.popup_common .popup_header .title_wrap {
        display: flex;
        align-items: center;
        gap: 1em;
    }

    #popupBotConfig.popup_common .popup_header h3 {
        line-height: 28px;
        height: 24px;
        font-size: var(--font-l-size);
        font-weight: var(--bold);
    }

    #popupBotConfig.popup_common .popup_contents {
        padding: 1em 1.5em;
        display: flex;
    }

    #popupBotConfig.popup_common .popup_contents.flex_column {
        flex-direction: column;
        gap: .8em;
    }

    #popupBotConfig.popup_common .popup_contents .round_select_wrap {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    #popupBotConfig.popup_common .popup_contents.round_wrap {
        background-color: var(--color-block-light-1);
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1em;
        width: 100%;
    }

    #popupBotConfig.popup_common .popup_contents .round_item {
        display: flex;
        align-items: center;
        font-size: 13px;
        justify-content: space-between;
    }

    #popupBotConfig.popup_common .popup_contents .round_item input[type="text"] {
        width: 37px;
        height: 32px;
    }

    #popupBotConfig.popup_common .popup_contents .round_item .icon_clock {
        width: 19px;
        height: 19px;
        content: url(/images/maxy/icon-time.svg);
    }

    #popupBotConfig .popup_contents.flex_column .round_select_tip {
        color: #FF7272;
        margin-left: auto;
    }

    #popupBotConfig .popup_contents.ai_type {
        display: grid;
        gap: 2%;
        grid-template-columns: 49% 49%;
        padding-left: 1.5em;
    }

    #popupBotConfig .popup_contents.ai_type > div {
        display: flex;
        align-items: center;
    }

    #popupBotConfig .ai_type input[type="checkbox"] + label {
        padding-right: .5em;
        background-image: url(/images/maxy/icon-check-circle-off.svg);
    }

    #popupBotConfig .ai_type input[type="checkbox"]:checked + label {
        background-image: url(/images/maxy/icon-check-circle-on.svg);
    }

    #popupBotConfig .popup_contents.footer {
        justify-content: end;
    }

    #popupBotConfig .popup_contents.footer > .btn_common {
        background-color: var(--logo-purple-1);
        color: white;
    }

    .history_group_wrap .item_header {
        color: #A7ADBA;
        font-weight: bold;
    }

    .btn_common .img_btn_setting {
        content: url(/images/maxy/icon-btn-setting.svg);
    }

    .history_contents_wrap .aibot_no_data {
        height: 100%;
        text-align: center;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .history_content .highlight {
        line-height: 22px;
        background: rgba(135, 131, 120, .15);
        color: #EB5757;
        border-radius: 4px;
        padding: 0.2em 0.4em;
    }
</style>
<%-- 관리 > AI Bot 관리 --%>
<div class="gm_header">
    <div class="gm_menu_text_wrap">
        <h4 class="gm_menu_title" data-t="menu.management.aibotmgmt"></h4>
        <h5 class="gm_menu_desc" data-t="management.title.desc.aibot"></h5>
    </div>
    <div class="gm_filter_group">
        <div class="app_info_wrap">
            <label for="packageNm" class="app_icon">A</label>
            <select id="packageNm" class="app_info_select"></select>
        </div>
    </div>
</div>

<div class="gm_contents">
    <div class="gm_btn_wrap">
        <button class="btn_common" id="btnOption">
            <span data-t="management.aibot.text.option"></span>
            <img class="img_btn_setting">
        </button>
    </div>
    <div class="history_wrap">
        <div class="history_contents_wrap"></div>
        <div class="history_group_wrap"></div>
    </div>
</div>

<div class="popup_common" id="popupBotConfig" data-id="">
    <div class="popup_header">
        <div class="title_wrap">
            <img class="img_setting">
            <h3 data-t="management.aibot.popup.title"></h3>
        </div>
        <div class="toggle_wrap">
            <input type="checkbox" class="toggle" id="useToggle" value="N"/>
            <label for="useToggle"></label>
        </div>
    </div>
    <hr/>
    <div class="popup_contents flex_column">
        <div class="round_select_wrap">
            <div data-t="management.aibot.popup.option"></div>
            <div>
                <label>
                    <select id="selectExecutionCycle">
                        <option>1</option>
                        <option>2</option>
                        <option>3</option>
                        <option>4</option>
                        <option>5</option>
                        <option>6</option>
                        <option>7</option>
                        <option>8</option>
                        <option>9</option>
                        <option>10</option>
                    </select>
                </label>회
            </div>
        </div>
        <div class="round_select_tip" data-t="management.aibot.popup.tip"></div>
    </div>
    <div class="popup_contents round_wrap" id="roundWrap">

    </div>
    <div class="popup_contents ai_type">
        <div>
            <input id="typePerf" type="checkbox" name="aiType" checked data-type="PERF"><label for="typePerf"></label>
            <label for="typePerf" data-t="management.aibot.popup.aiperform"></label>
        </div>
        <div>
            <input id="typeUsage" type="checkbox" name="aiType" checked data-type="USAGE"><label
                for="typeUsage"></label>
            <label for="typeUsage" data-t="management.aibot.popup.aiusability"></label>
        </div>

    </div>
    <div class="popup_contents footer">
        <button class="btn_common" id="btnOptionSave" data-t="common.btn.save"></button>
    </div>
</div>

<%--suppress ES6ConvertVarToLetConst --%>
<script>
    var GM0901 = {
        v: {},
        init: {
            event() {
                const {func} = GM0901
                // AI Bot 옵션 팝업 열기
                $('#btnOption').on('click', func.popup.openConfig)
                // AI Bot 옵션 저장 버튼 클릭
                $('#btnOptionSave').on('click', func.popup.save)
                // AI Bot 실행 주기 Select box change 이벤트
                $('#selectExecutionCycle').on('change', function () {
                    // select box 값에 따라 round time 개수를 늘려준다
                    const count = Number($('#selectExecutionCycle option:selected').val())

                    // 현재 round time 갯수
                    const currentCount = $('#roundWrap > .round_item').length
                    func.draw.timeWrap(count, currentCount)
                })
                // dimmed 클릭시 옵션 팝업 닫기
                $('.dimmed').on('click', func.popup.closeConfig)
                // useToggle 상태에 따른 aiType 변경
                $('#useToggle').on('change', func.popup.changeAiType)
                $('.ai_type input[name="aiType"]').on('change', func.popup.setUseCheck)
            },

            created() {
                const {func} = GM0901
                // 다국어 업데이트
                updateContent()

                // 앱 정보 추가
                appInfo.append({pId: 'packageNm'}).then(() => {
                    // 그룹 데이터 조회
                    func.fetch.getGroupData()

                    // 앱 정보 변경되면 그룹 데이터 조회
                    $('#packageNm').on('change', function () {
                        func.fetch.getGroupData()
                        // 패키지 변경시 osType, appVer 전체 값으로 초기화
                        sessionStorage.setItem('osType', 'A')
                        sessionStorage.setItem('appVer', 'A')
                    })
                })
            }
        },

        func: {
            // 팝업 관련 함수
            popup: {
                // use toggle 값에 따른 aiType 체크 여부 설정
                changeAiType(e) {
                    $('.ai_type input[name="aiType"]').prop('checked', e.target.checked)
                },
                // 옵션 팝업 열기
                openConfig() {
                    const {func} = GM0901
                    func.fetch.getBotConfig()
                    //  $('#selectExecutionCycle').trigger('change')
                    $('.dimmed').show()
                    $('#popupBotConfig').show()
                },
                // 옵션 팝업 닫기
                closeConfig() {
                    $('#selectExecutionCycle option:eq(0)').prop('selected', true)
                    $('#roundWrap').empty()
                    $('.dimmed').hide()
                    const $popup = $('#popupBotConfig')
                    $popup.hide()
                    $popup.data('id', '')
                },
                // 팝업 하단의 checkbox 상태에 따른 useToggle 버튼의 checked 여부 설정
                setUseCheck() {
                    const checked = $('input[name="aiType"]:checked')
                    $('#useToggle').prop('checked', checked && checked.length > 0)
                },
                // 옵션 정보를 옵션 팝업에 세팅
                set(data) {
                    const {func} = GM0901;
                    const {id = 0, roundInfo = 1, type} = data || {};

                    const $aiType = $('input[name="aiType"]')
                    if (!id) {
                        // id 가 없는 경우 ai type 은 모두 해제가 기본
                        $aiType.prop('checked', false);
                    }

                    $('#popupBotConfig').data('id', id);

                    // 실행주기 세팅 및 항목 생성
                    $('#selectExecutionCycle').val(roundInfo);
                    func.draw.timeWrap(roundInfo, 0);

                    if (data && Object.keys(data).length > 0) {
                        // 실행주기 데이터 세팅
                        Array.from({length: roundInfo}, (_, i) => {
                            const roundTime = data['roundTime' + (i + 1)];

                            if (roundTime) {
                                $('#execHour__' + (i + 1)).val(roundTime.substring(0, 2));
                                $('#execMin__' + (i + 1)).val(roundTime.substring(2, 4));
                            }
                        })

                        // aiType 체크박스 세팅
                        $aiType.prop('checked', false);
                        type.split(',').forEach(function (t) {
                            $('input[name="aiType"][data-type="' + t + '"]').prop('checked', true);
                        });
                    }

                    // useToggle input setting
                    func.popup.setUseCheck()
                },
                // 옵션 저장
                save() {
                    const {func} = GM0901
                    const param = {}

                    // id 값 세팅
                    // id 가 있으면 update, 없으면 insert 하기 때문에 중요함
                    const id = $('#popupBotConfig').data('id')
                    if (id) {
                        param['id'] = id
                    }

                    // 실행 주기 수를 roundInfo 에 저장
                    param['roundInfo'] = $('#selectExecutionCycle option:selected').val()

                    // roundWrap 을 순회하면서 순서에 맞게 roundTime 을 세팅
                    let i = 1
                    $('#roundWrap .round_item').each(function () {
                        const roundInfo = $(this).data('roundInfo')
                        // hh와 mm 값 가져오기
                        let hh = $('#execHour__' + roundInfo).val();
                        let mm = $('#execMin__' + roundInfo).val();
                        // 숫자로 변환 후 유효성 검사
                        hh = Math.min(Math.max(parseInt(hh || "0", 10), 0), 23).toString().padStart(2, '0');
                        mm = Math.min(Math.max(parseInt(mm || "0", 10), 0), 59).toString().padStart(2, '0');
                        // 결과
                        param['roundTime' + i] = hh + mm
                        i++
                    })

                    // 선택된 AI Bot 집계 유형 추가 `TYPE1,TYPE2`
                    param['type'] = $('input[name="aiType"]:checked').map(function () {
                        return $(this).data('type');
                    }).get().join(',');

                    // 앱 정보 세팅
                    const {packageNm, serverType} = util.getAppInfo('#packageNm')
                    param['packageNm'] = packageNm
                    param['serverType'] = serverType

                    // save 실행
                    func.fetch.saveBotConfig(param)
                }
            },
            draw: {
                // history 영역 초기화
                resetHistoryArea() {
                    $('.history_contents_wrap').empty()
                    $('.history_group_wrap').empty()
                },
                historyList(data, occurDate) {
                    const $wrap = $('.history_contents_wrap')
                    $wrap.empty()
                    if (!data || data.length === 0 || !occurDate) {
                        toast(trl('common.msg.incorrect'))
                        return
                    }
                    const date = String(occurDate)

                    // Object.entries로 JSON 객체를 순회하고 Map으로 변환
                    const resultMap = new Map(
                        Object.entries(data).sort((a, b) => {
                            // 키 값(roundTime)을 내림차순(desc) 정렬
                            return b[0].localeCompare(a[0])
                        })
                    )

                    for (let x of resultMap.keys()) {
                        const $historyContentsGroup = $('<div>', {
                            'class': 'history_contents_group'
                        })
                        const $groupHeader = $('<div>', {
                            'class': 'group_header',
                            'text': date.slice(0, 4) + '-' + date.slice(4, 6) + '-' + date.slice(6)
                                + ' ' + x.slice(0, 2) + ':' + x.slice(2, 4)
                        })
                        $groupHeader.append('<span class="btn_aibot_copy"></span>')
                        $historyContentsGroup.append($groupHeader)
                        for (const x2 of resultMap.get(x)) {
                            const {msg, parameter} = x2
                            const paramObj = JSON.parse(parameter)
                            const $msg = $('<div>', {
                                'html': '- ' + trl(msg, paramObj),
                                'class': 'history_content'
                            })
                            $historyContentsGroup.append($msg)
                        }
                        $wrap.append($historyContentsGroup)
                    }

                    const $btnCopy = $('.btn_aibot_copy')
                    $btnCopy.off('click').on('click', function (e) {
                        e.preventDefault()
                        util.copy(this.closest('.history_contents_group').innerText)
                    })
                },
                groupList(data) {
                    const {func} = GM0901
                    const $wrap = $('.history_group_wrap')
                    $wrap.empty()
                    if (!data || data.length === 0) {
                        return
                    }
                    let i = 0
                    for (const x of data) {
                        const {occurDate, groupCount} = x
                        const occurDateText = occurDate.slice(0, 4) + '-' + occurDate.slice(4, 6) + '-' + occurDate.slice(6)
                        const $header = $('<div>', {
                            'text': occurDateText,
                            'class': 'item_header'
                        })
                        const $count = $('<div>', {
                            'text': trl('aibot.card.count_result', groupCount),
                            'class': 'item_content'
                        })
                        const $item = $('<div>', {
                            'data-occur-date': occurDate,
                            'class': 'item_card'
                        })
                        $item.append($header)
                        $item.append($count)
                        $wrap.append($item)
                        if (i === 0) {
                            $('.item_card').addClass('active')
                            i++
                        }
                    }
                    const $card = $('.item_card')
                    $card.off('click').on('click', function (e) {
                        $card.each(function () {
                            $card.removeClass('active')
                        })
                        e.preventDefault()
                        $(this).addClass('active')
                        func.fetch.getHistoryData($(this).data('occur-date'))
                    })
                },
                timeWrap(count, currentCount) {
                    const $target = $('#roundWrap')
                    let appendCount

                    // 현재 갯수에서 늘리는 경우
                    if (count >= currentCount) {
                        appendCount = count > currentCount ? count - currentCount : count

                        for (let i = 0; i < appendCount; i++) {
                            const defaultHour = (i + currentCount + 1).toString().padStart(2, '0');
                            $target.append(
                                '<div class="round_item" data-round-info="' + (i + currentCount + 1) + '">'
                                + '<div>' + (i + currentCount + 1) + '회 차</div>'
                                + '<input type="text" class="round_hour" id="execHour__' + (i + currentCount + 1) + '" value="' + defaultHour + '"> '
                                + ': <input type="text" class="round_min" id="execMin__' + (i + currentCount + 1) + '" value="00">'
                                + '<img class="icon_clock" alt="">'
                                + '</div>'
                            )
                        }
                    }
                    // 현재 갯수에서 줄이는 경우
                    else if (count < currentCount) {
                        appendCount = currentCount - count

                        for (let i = 0; i < appendCount; i++) {
                            $target.find('.round_item:last-child').remove();
                        }
                    }

                    // Hour와 Minute 입력 이벤트 처리
                    $('.round_hour, .round_min').off('input').on('input', function () {
                        const max = $(this).hasClass('round_hour') ? 23 : 59;
                        let val = parseInt($(this).val(), 10);
                        $(this).val((isNaN(val) ? 0 : Math.min(Math.max(val, 0), max)).toString().padStart(2, '0'));
                    });
                }
            },
            fetch: {
                getGroupData() {
                    const {func} = GM0901
                    const {packageNm, serverType} = util.getAppInfo('#packageNm')
                    const param = {
                        packageNm, serverType
                    }
                    ajaxCall('/gm/0901/getBotGroupList.maxy', param).then(data => {
                        func.draw.resetHistoryArea()
                        func.draw.groupList(data)
                        if (data && data.length > 0) {
                            const {occurDate} = data[0]
                            func.fetch.getHistoryData(occurDate)
                        } else {
                            $('.history_contents_wrap').append('<div class="aibot_no_data">Data is being processed</div>')
                        }
                    }).catch(error => {
                        console.log(error)
                        toast(trl(error.msg))
                    })
                },
                getHistoryData(occurDate) {
                    const {func} = GM0901
                    const {packageNm, serverType} = util.getAppInfo('#packageNm')
                    if (!occurDate) {
                        toast(trl('common.msg.incorrect'))
                        return
                    }
                    const param = {
                        packageNm,
                        serverType,
                        occurDate: occurDate
                    }
                    ajaxCall('/gm/0901/getBotList.maxy', param).then(data => {
                        func.draw.historyList(data, occurDate)
                    }).catch(error => {
                        console.log(error)
                        toast(trl(error.msg))
                    })
                },
                getBotConfig() {
                    const {func} = GM0901
                    const {packageNm, serverType} = util.getAppInfo('#packageNm')
                    const param = {packageNm, serverType}
                    ajaxCall('/gm/0901/getBotConfig.maxy', param).then(data => {
                        func.popup.set(data)
                    }).catch(error => {
                        console.log(error)
                        toast(trl(error.msg))
                    })
                },
                saveBotConfig(param) {
                    const {func} = GM0901
                    ajaxCall('/gm/0901/saveBotConfig.maxy', param).then(() => {
                        func.popup.closeConfig()
                        toast(trl('common.msg.success'))
                    }).catch(error => {
                        console.log(error)
                        toast(trl(error.msg))
                    })
                }
            }
        }
    }
    GM0901.init.event()
    GM0901.init.created()
</script>
