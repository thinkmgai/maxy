<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<style>
    .sm_config_item_wrap .config_header {
        display: flex;
        justify-content: space-between;
    }

    .sm_config_item_wrap .config_header p {
        line-height: 32px;
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

    .sm_config_item_wrap .config_item {
        margin-bottom: 20px;
    }

    .sm_config_item_wrap .config_contents_wrap {
        width: 100%;
        display: grid;
        align-items: center;
        border: 1px solid #E3E5E8;
        border-radius: var(--radius);;
        margin-bottom: 16px;
    }

    .sm_config_item_wrap .config_content {
        display: grid;
        grid-template-columns: 50% 50%;
        align-items: center;
        padding: 18px;
        border-bottom: 1px solid #e3e5e8;
        height: 90px;
    }

    .sm_config_item_wrap .config_content:last-child {
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

    .sm_config_item_wrap .config_list_item .list_item .btn_common:after {
        content: 'Confirm';
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

    .sm_config_item_wrap input[type="checkbox"] + label {
        width: 30px;
        background: url(/images/maxy/toggle-off.svg) no-repeat 0 center /30px;
    }

    .sm_config_item_wrap input[type="checkbox"]:checked + label {
        background-image: url(/images/maxy/toggle-on.svg);
        cursor: pointer;
    }
</style>
<!-- 시스템관리 > 연동 설정 -->
<div class="contents_header">
    <div class="ctts_h_left">
        <h4 data-t="system.title.link"></h4>
    </div>
    <div class="ctts_h_right">
        <label for="packageNm"></label>
        <select class="app_info_select" id="packageNm"></select>
    </div>
</div>

<div class="sm_config_item_wrap current_tab" data-type="SLACK">
    <div class="config_item">
        <div class="border_bottom_purple_wrap config_header">
            <p class="type_text">Slack</p>
            <button class="btn_common btn_save">
                <span data-t="common.btn.save"></span>
                <img class="img_save" alt="">
            </button>
        </div>
        <div class="config_contents_wrap">
            <div class="config_content">
                <label for="token"><i class="circle"></i>Token</label>
                <input id="token" type="text">
            </div>
            <div class="config_content">
                <label for="channel"><i class="circle"></i>Channel</label>
                <input id="channel" type="text">
            </div>
            <div class="config_content">
                <label for="url"><i class="circle"></i>URL</label>
                <input id="url" type="text">
            </div>
        </div>
    </div>

    <div class="config_item">
        <div class="border_bottom_purple_wrap config_header">
            <p class="type_text" data-t="system.link.descPage"></p>
        </div>
        <div class="config_contents_wrap">
            <div class="config_list_item">
                <div class="list_item">
                    <label for="reqUrl" style="width: 100px">Target URL</label>
                    <input id="reqUrl" type="text" class="input_url">
                    <button id="btnConfirmUrl" class="btn_common"></button>
                </div>
                <div class="list_item">
                    <div>
                        <label for="urlFromHour">From</label>
                        <input id="urlFromHour" type="text" class="input_time">
                        <span>H</span>
                    </div>
                    <div>
                        <input id="urlFromMin" type="text" class="input_time">
                        <span>M</span>
                    </div>
                    <div>
                        <span>~</span>
                    </div>
                    <div>
                        <label for="urlToHour">To</label>
                        <input id="urlToHour" type="text" class="input_time">
                        <span>H</span>
                    </div>
                    <div>
                        <input id="urlToMin" type="text" class="input_time">
                        <span>M</span>
                    </div>
                    <div>
                        <label for="urlInterval">Interval</label>
                        <input id="urlInterval" type="text" class="input_time">
                        <span>M</span>
                    </div>
                    <div>
                        <button id="btnAddPage"><img src="<c:url value="/images/maxy/icon-add.svg"/>" alt="+">
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div class="config_contents_wrap" id="pageListWrap"></div>
    </div>
    <div class="config_item">
        <div class="border_bottom_purple_wrap config_header">
            <p class="type_text" data-t="system.link.descKey"></p>
        </div>
        <div class="config_contents_wrap">
            <div class="config_list_item">
                <div class="list_item">
                    <label for="key" style="width: 100px">Target Key</label>
                    <input id="key" type="text" class="input_url">
                </div>
                <div class="list_item">
                    <div>
                        <label for="keyFromHour">From</label>
                        <input id="keyFromHour" type="text" class="input_time">
                        <span>H</span>
                    </div>
                    <div>
                        <input id="keyFromMin" type="text" class="input_time">
                        <span>M</span>
                    </div>
                    <div>
                        <span>~</span>
                    </div>
                    <div>
                        <label for="keyToHour">To</label>
                        <input id="keyToHour" type="text" class="input_time">
                        <span>H</span>
                    </div>
                    <div>
                        <input id="keyToMin" type="text" class="input_time">
                        <span>M</span>
                    </div>
                    <div>
                        <label for="keyInterval">Interval</label>
                        <input id="keyInterval" type="text" class="input_time">
                        <span>M</span>
                    </div>
                    <div>
                        <button id="btnAddKey"><img src="<c:url value="/images/maxy/icon-add.svg"/>" alt="+">
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div class="config_contents_wrap" id="keyListWrap"></div>
    </div>
</div>
<%--suppress ES6ConvertVarToLetConst --%>
<script>
    var SM0700 = {
        v: {},
        init: {
            event() {
                const {func} = SM0700
                const {slack, page, key} = func
                $('#packageNm').on('change', function () {
                    $('.config_list_item input').val('')
                    $('#btnConfirmUrl').removeClass('checked')
                    slack.getData()
                    page.getData()
                    key.getData()

                    // 패키지 변경시 osType, appVer 전체 값으로 초기화
                    sessionStorage.setItem('osType', 'A')
                    sessionStorage.setItem('appVer', 'A')
                })

                // slack 설정 저장
                $('.btn_save').on('click', function () {
                    const type = $('.current_tab').data('type')
                    slack.save(type)
                })

                // page 추가
                $('#btnAddPage').on('click', page.add)

                // target url 검증
                $('#btnConfirmUrl').on('click', page.confirm)

                // target url 변경 시 confirm 다시하도록
                $('#reqUrl').on('change keydown', function () {
                    $('#btnConfirmUrl').removeClass('checked')
                })

                // key 추가
                $('#btnAddKey').on('click', key.add)
            },
            created() {
                const {func} = SM0700
                updateContent()
                const {slack, page, key} = func
                appInfo.append({pId: 'packageNm'}).then(() => {
                    slack.getData()
                    page.getData()
                    key.getData()
                })
            }
        },
        func: {
            cmm: {},
            page: {
                add() {
                    console.log('add')
                    const {func} = SM0700
                    const $reqUrl = $('#reqUrl')
                    const $btnConfirmUrl = $('#btnConfirmUrl')
                    const $interval = $('#urlInterval')
                    const $urlFromHour = $('#urlFromHour')
                    const $urlFromMin = $('#urlFromMin')
                    const $urlToHour = $('#urlToHour')
                    const $urlToMin = $('#urlToMin')

                    if (!$reqUrl.val()) {
                        util.emptyInput($reqUrl)
                        return
                    }

                    if (!$btnConfirmUrl.hasClass('checked')) {
                        util.emptyInput($reqUrl)
                        const msg = i18next.tns('system.link.msg.validationurl')
                        toast(msg)
                        return
                    }

                    const interval = $interval.val()
                    const urlFromHour = $urlFromHour.val()
                    const urlFromMin = $urlFromMin.val()
                    const urlToHour = $urlToHour.val()
                    const urlToMin = $urlToMin.val()

                    try {

                        if (!interval) {
                            util.emptyInput($interval)
                            return
                        }

                        if (isNaN(Number(interval))) {
                            const msg = i18next.tns('system.link.msg.onlynumber')
                            toast(msg)
                            util.emptyInput($interval)
                            return
                        } else {
                            if (Number(interval) < 1) {
                                const msg = i18next.tns('system.link.msg.onlyoneover')
                                toast(msg)
                                util.emptyInput($interval)
                                return
                            }
                        }

                        if (!urlFromHour) {
                            util.emptyInput($urlFromHour)
                            return
                        }

                        if (isNaN(Number(urlFromHour))) {
                            const msg = i18next.tns('system.link.msg.onlytimenumber')
                            toast(msg)
                            util.emptyInput($urlFromHour)
                            return
                        } else {
                            // 숫자 입력은 0 부터 23까지 가능
                            if (!(urlFromHour >= 0 && urlFromHour < 24)) {
                                const msg = i18next.tns('system.link.msg.onlytimemax')
                                toast(msg)
                                util.emptyInput($urlFromHour)
                                return
                            }
                        }

                        if (!urlFromMin) {
                            util.emptyInput($urlFromMin)
                            return
                        }

                        if (isNaN(Number(urlFromMin))) {
                            const msg = i18next.tns('system.link.msg.onlyminutenumber')
                            toast(msg)
                            util.emptyInput($urlFromMin)
                            return
                        } else {
                            // 숫자입력은 0부터 59까지 가능
                            if (!(Number(urlFromMin) >= 0 && Number(urlFromMin) < 60)) {
                                const msg = i18next.tns('system.link.msg.onlyminutemax')
                                toast(msg)
                                util.emptyInput($urlFromMin)
                                return
                            }
                        }

                        if (!urlToHour) {
                            util.emptyInput($urlToHour)
                            return
                        }

                        if (isNaN(Number(urlToHour))) {
                            const msg = i18next.tns('system.link.msg.onlyendtimenumber')
                            toast(msg)
                            util.emptyInput($urlToHour)
                            return
                        } else {
                            // 숫자 입력은 0 부터 23까지 가능
                            if (!(Number(urlToHour) >= 0 && Number(urlToHour) < 24)) {
                                const msg = i18next.tns('system.link.msg.onlyendtimemax')
                                toast(msg)
                                util.emptyInput($urlToHour)
                                return
                            } else {
                                if (Number(urlFromHour) > Number(urlToHour)) {
                                    const msg = i18next.tns('system.link.msg.onlyendtimestarttime')
                                    toast(msg)
                                    util.emptyInput($urlToHour)
                                    return
                                }
                            }
                        }

                        if (!urlToMin) {
                            util.emptyInput($urlToMin)
                            return
                        }

                        if (isNaN(Number(urlToMin))) {
                            const msg = i18next.tns('system.link.msg.onlyendminutenumber')
                            toast(msg)
                            util.emptyInput($urlToMin)
                            return
                        } else {
                            // 숫자입력은 0부터 59까지 가능
                            if (!(Number(urlToMin) >= 0 && Number(urlToMin) < 60)) {
                                const msg = i18next.tns('system.link.msg.onlyendminutemax')
                                toast(msg)
                                util.emptyInput($urlToMin)
                                return
                            } else {

                                if (Number(urlFromHour) > Number(urlToHour)) {
                                    const msg = i18next.tns('system.link.msg.onlyendtimestarttime')
                                    toast(msg)
                                    util.emptyInput(urlToHour)
                                    return
                                } else if (Number(urlFromHour) == Number(urlToHour)) {
                                    if (Number(urlFromMin) >= Number(urlToMin)) {
                                        const msg = i18next.tns('system.link.msg.onlyendtimestarttime')
                                        toast(msg)
                                        util.emptyInput(urlToMin)
                                        return
                                    }
                                }
                            }
                        }

                    } catch (e) {
                        util.emptyInput($interval)
                        util.emptyInput($urlFromHour)
                        util.emptyInput($urlFromMin)
                        util.emptyInput($urlToHour)
                        util.emptyInput($urlToMin)
                        return
                    }

                    const param = {
                        packageNm: $('#packageNm').val(),
                        serverType: $('#packageNm option:checked').data('server-type'),
                        reqUrl: $reqUrl.val(),
                        interval: $interval.val(),
                        insertType: "URL",
                        fromHour: $urlFromHour.val(),
                        fromMin: $urlFromMin.val(),
                        toHour: $urlToHour.val(),
                        toMin: $urlToMin.val()
                    }

                    ajaxCall('/sm/0700/addPageConfig.maxy', param).then(data => {
                        func.page.draw(data)
                        $('.config_list_item input').val('')
                        $('#btnConfirmUrl').removeClass('checked')
                        const msg = i18next.tns('common.msg.success')
                        toast(msg)
                    }).catch(error => {
                        console.log(error)
                        if (error.status === 400) {
                            toast(i18next.tns(error.msg))
                        }
                    })
                },
                confirm() {
                    const $reqUrl = $('#reqUrl')
                    if (!$reqUrl.val()) {
                        util.emptyInput($reqUrl)
                        return
                    }

                    const param = {
                        packageNm: $('#packageNm').val(),
                        serverType: $('#packageNm option:checked').data('server-type'),
                        reqUrl: $reqUrl.val()
                    }

                    const msg = i18next.tns('system.link.msg.unregisterdurl')
                    ajaxCall('/sm/0700/confirmPageUrl.maxy', param).then(data => {
                        const $btnConfirmUrl = $('#btnConfirmUrl')
                        if (data) {
                            $btnConfirmUrl.addClass('checked')
                        } else {
                            $btnConfirmUrl.removeClass('checked')
                            util.emptyInput($reqUrl)
                            toast(msg)
                        }
                    }).catch(error => {
                        console.log(error)
                        $('#btnConfirmUrl').removeClass('checked')
                        util.emptyInput($reqUrl)
                        toast(msg)
                    })
                },
                delete(id) {
                    const {func} = SM0700
                    const param = {
                        id,
                        packageNm: $('#packageNm').val(),
                        serverType: $('#packageNm option:checked').data('server-type'),
                        insertType: 'URL'
                    }
                    ajaxCall('/sm/0700/delPageConfig.maxy', param).then(data => {
                        func.page.draw(data)
                        const msg = i18next.tns('common.msg.delete')
                        toast(msg)
                    }).catch(error => {
                        console.log(error)
                    })
                },
                async draw(param) {
                    const source = await fetch(
                        '/templates/pageList.html')
                        .then(response => response.text())

                    const template = Handlebars.compile(source)

                    const $target = $('#pageListWrap')
                    $target.empty()

                    $target.append(template({data: param}))
                },
                getData() {
                    const {func} = SM0700
                    const param = {
                        type: $('.current_tab').data('type'),
                        packageNm: $('#packageNm').val(),
                        serverType: $('#packageNm option:checked').data('server-type'),
                        insertType: 'URL'
                    }
                    if (util.checkParam(param)) {
                        return;
                    }
                    ajaxCall('/sm/0700/getPageConfig.maxy', param).then(data => {
                        func.page.draw(data)
                    }).catch(error => {
                        console.log(error)
                    })
                }
            },
            key: {
                add() {
                    console.log('key add')
                    const {func} = SM0700
                    const $key = $('#key')
                    const $interval = $('#keyInterval')
                    const $keyFromHour = $('#keyFromHour')
                    const $keyFromMin = $('#keyFromMin')
                    const $keyToHour = $('#keyToHour')
                    const $keyToMin = $('#keyToMin')

                    if (!$key.val()) {
                        util.emptyInput($key)
                        return
                    }

                    const interval = $interval.val()
                    const keyFromHour = $keyFromHour.val()
                    const keyFromMin = $keyFromMin.val()
                    const keyToHour = $keyToHour.val()
                    const keyToMin = $keyToMin.val()

                    try {
                        if (!interval) {
                            util.emptyInput($interval)
                            return
                        }

                        if (isNaN(Number(interval))) {
                            const msg = i18next.tns('system.link.msg.onlynumber')
                            toast(msg)
                            util.emptyInput($interval)
                            return
                        } else {
                            if (Number(interval) < 1) {
                                const msg = i18next.tns('system.link.msg.onlyoneover')
                                toast(msg)
                                util.emptyInput($interval)
                                return
                            }
                        }

                        if (!keyFromHour) {
                            util.emptyInput($keyFromHour)
                            return
                        }

                        if (isNaN(Number(keyFromHour))) {
                            const msg = i18next.tns('system.link.msg.onlytimenumber')
                            toast(msg)
                            util.emptyInput($keyFromHour)
                            return
                        } else {
                            // 숫자 입력은 0 부터 23까지 가능
                            if (!(keyFromHour >= 0 && keyFromHour < 24)) {
                                const msg = i18next.tns('system.link.msg.onlytimemax')
                                toast(msg)
                                util.emptyInput($keyFromHour)
                                return
                            }
                        }

                        if (!keyFromMin) {
                            util.emptyInput($keyFromMin)
                            return
                        }

                        if (isNaN(Number(keyFromMin))) {
                            const msg = i18next.tns('system.link.msg.onlyminutenumber')
                            toast(msg)
                            util.emptyInput($keyFromMin)
                            return
                        } else {
                            // 숫자입력은 0부터 59까지 가능
                            if (!(Number(keyFromMin) >= 0 && Number(keyFromMin) < 60)) {
                                const msg = i18next.tns('system.link.msg.onlyminutemax')
                                toast(msg)
                                util.emptyInput($keyFromMin)
                                return
                            }
                        }

                        if (!keyToHour) {
                            util.emptyInput($keyToHour)
                            return
                        }

                        if (isNaN(Number(keyToHour))) {
                            const msg = i18next.tns('system.link.msg.onlyendtimenumber')
                            toast(msg)
                            util.emptyInput($keyToHour)
                            return
                        } else {
                            // 숫자 입력은 0 부터 23까지 가능
                            if (!(Number(keyToHour) >= 0 && Number(keyToHour) < 24)) {
                                const msg = i18next.tns('system.link.msg.onlyendtimemax')
                                toast(msg)
                                util.emptyInput($keyToHour)
                                return
                            } else {
                                if (Number(keyFromHour) > Number(keyToHour)) {
                                    const msg = i18next.tns('system.link.msg.onlyendtimestarttime')
                                    toast(msg)
                                    util.emptyInput($keyToHour)
                                    return
                                }
                            }
                        }

                        if (!keyToMin) {
                            util.emptyInput($keyToMin)
                            return
                        }

                        if (isNaN(Number(keyToMin))) {
                            const msg = i18next.tns('system.link.msg.onlyendminutenumber')
                            toast(msg)
                            util.emptyInput($keyToMin)
                            return
                        } else {
                            // 숫자입력은 0부터 59까지 가능
                            if (!(Number(keyToMin) >= 0 && Number(keyToMin) < 60)) {
                                const msg = i18next.tns('system.link.msg.onlyendminutemax')
                                toast(msg)
                                util.emptyInput($keyToMin)
                                return
                            } else {

                                if (Number(keyFromHour) > Number(keyToHour)) {
                                    const msg = i18next.tns('system.link.msg.onlyendtimestarttime')
                                    toast(msg)
                                    util.emptyInput(keyToHour)
                                    return
                                } else if (Number(keyFromHour) == Number(keyToHour)) {
                                    if (Number(keyFromMin) >= Number(keyToMin)) {
                                        const msg = i18next.tns('system.link.msg.onlyendtimestarttime')
                                        toast(msg)
                                        util.emptyInput(keyToMin)
                                        return
                                    }
                                }
                            }
                        }

                    } catch (e) {
                        util.emptyInput($interval)
                        util.emptyInput($keyFromHour)
                        util.emptyInput($keyFromMin)
                        util.emptyInput($keyToHour)
                        util.emptyInput($keyToMin)
                        return
                    }

                    const param = {
                        packageNm: $('#packageNm').val(),
                        serverType: $('#packageNm option:checked').data('server-type'),
                        reqUrl: $key.val(),
                        interval: $interval.val(),
                        insertType: "KEY",
                        fromHour: $keyFromHour.val(),
                        fromMin: $keyFromMin.val(),
                        toHour: $keyToHour.val(),
                        toMin: $keyToMin.val()
                    }

                    ajaxCall('/sm/0700/addPageConfig.maxy', param).then(data => {
                        func.key.draw(data)
                        $('.config_list_item input').val('')
                        const msg = i18next.tns('common.msg.success')
                        toast(msg)
                    }).catch(error => {
                        console.log(error)
                        if (error.status === 400) {
                            toast(i18next.tns(error.msg))
                        }
                    })
                },
                delete(id) {
                    const {func} = SM0700
                    const param = {
                        id,
                        packageNm: $('#packageNm').val(),
                        serverType: $('#packageNm option:checked').data('server-type'),
                        insertType: 'KEY'
                    }
                    ajaxCall('/sm/0700/delPageConfig.maxy', param).then(data => {
                        func.key.draw(data)
                        const msg = i18next.tns('common.msg.delete')
                        toast(msg)
                    }).catch(error => {
                        console.log(error)
                    })
                },
                async draw(param) {
                    const source = await fetch(
                        '/templates/keyList.html')
                        .then(response => response.text())

                    const template = Handlebars.compile(source)

                    const $target = $('#keyListWrap')
                    $target.empty()

                    $target.append(template({data: param}))
                },
                getData() {
                    const {func} = SM0700
                    const param = {
                        type: $('.current_tab').data('type'),
                        packageNm: $('#packageNm').val(),
                        serverType: $('#packageNm option:checked').data('server-type'),
                        insertType: 'KEY'
                    }
                    if (util.checkParam(param)) {
                        return;
                    }
                    ajaxCall('/sm/0700/getPageConfig.maxy', param).then(data => {
                        func.key.draw(data)
                    }).catch(error => {
                        console.log(error)
                    })
                }
            },
            slack: {
                save(type) {
                    const {func} = SM0700
                    const param = {
                        type,
                        packageNm: $('#packageNm').val(),
                        serverType: $('#packageNm option:checked').data('server-type'),
                        url: $('#url').val(),
                        token: $('#token').val(),
                        channel: $('#channel').val()
                    }
                    ajaxCall('/sm/0700/modifyIntegrationConfig.maxy', param).then(data => {
                        func.slack.draw(data)
                        const msg = i18next.tns('common.msg.success')
                        toast(msg)
                    }).catch(error => {
                        console.log(error)
                        const msg = i18next.tns('common.msg.serverError')
                        toast(msg)
                    })
                },
                draw(param) {
                    const {url, token, channel} = param
                    $('#url').val(url)
                    $('#token').val(token)
                    $('#channel').val(channel)
                },
                getData() {
                    const {func} = SM0700
                    const param = {
                        type: $('.current_tab').data('type'),
                        packageNm: $('#packageNm').val(),
                        serverType: $('#packageNm option:checked').data('server-type'),
                    }
                    if (util.checkParam(param)) {
                        return;
                    }
                    ajaxCall('/sm/0700/getIntegrationConfig.maxy', param).then(data => {
                        func.slack.draw(data)
                    }).catch(error => {
                        console.log(error)
                    })
                }
            }
        }
    }
    SM0700.init.event()
    SM0700.init.created()
</script>