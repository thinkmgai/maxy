<%--suppress ALL --%>
<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%--suppress CssUnusedSymbol --%>
<style>
    .tabulator-row .w82 {
        width: 50px !important;
        text-overflow: ellipsis;
        overflow-x: hidden;
        text-align: center;
    }

    .popup_package {
        width: 720px;
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
    }

    .popup_package .popup_contents_wrap {
        display: grid;
        grid-template-columns: 60% 37%;
        gap: 1em;
    }

    .popup_package .popup_contents_wrap .popup_input_wrap {
        width: 100%;
    }

    .popup_package .popup_input_wrap .reg_role_option_wrap {
        justify-content: right;
        gap: 3em !important;
    }

    .popup_package .popup_footer {
        display: flex;
        justify-content: space-between;
    }

    .popup_package .popup_footer .btn_wrapper {
        display: flex;
        gap: 1em;
    }

    .popup_package .popup_footer .btn_wrapper .btn_delete {
        border: 1px solid var(--point-red) !important;
        color: var(--point-red) !important;
    }

    .tabulator .tabulator-header .tabulator-col .tabulator-col-content {
        display: flex;
        flex-direction: row;
        align-items: center;
        height: 100%;
        padding: 0 6px;
    }

    .tabulator .tabulator-header .tabulator-col .tabulator-col-title {
        white-space: break-spaces !important;
        text-align: center !important;
        line-height: 1.2 !important;
    }
</style>
<!-- 시스템 관리 > 패키지 설정 -->
<div class="contents_header">
    <div class="ctts_h_left">
        <h4 data-t="system.package.settings"></h4>
    </div>
    <div class="ctts_h_right">
        <button type="button" class="btn_common download" id="btnRegApp">
            <span data-t="system.package.reg"></span>
            <img class="img_entry" alt=""/>
        </button>
    </div>
</div>
<div id="appTable"></div>

<div class="popup_common popup_package" id="popupAppInfo">
    <h4 id="popupHeader" data-t="system.package.reg"></h4>
    <div class="popup_contents_wrap">
        <ul class="popup_input_wrap">
            <li>
                <label for="packageNm">App ID</label>
                <input id="packageNm" type="text">
            </li>
            <li>
                <label for="serverType">Server Type</label>
                <select id="serverType"></select>
            </li>
            <li>
                <label for="displayNm">App Name</label>
                <input id="displayNm" type="text">
            </li>
            <li>
                <label for="logBundleUnit">Log Bundle Unit</label>
                <input id="logBundleUnit" type="number" value="10" min="1" max="500" step="1">
            </li>
            <li>
                <label for="logPeriod">Log Period (sec)</label>
                <input id="logPeriod" type="number" value="10" min="1" max="600" step="1">
            </li>
            <li>
                <label for="pageLogPeriod">Page Log Period (min)</label>
                <input id="pageLogPeriod" type="number" value="10" min="0" max="10" step="1">
            </li>
            <li <c:if test="${mode != 'all' && mode != 'front'}">style="display: none;"</c:if>>
                <label for="sessionLogPeriod">Session Log Period (sec)</label>
                <input id="sessionLogPeriod" type="number" value="4" min="1" max="10" step="1">
            </li>
            <li>
                <label for="loggingRate">Logging Rate (%)</label>
                <input id="loggingRate" type="number" value="100" min="0" max="100" step="1">
            </li>
            <li>
                <label for="order">Sort order</label>
                <input id="order" type="number" value="0" min="0" max="1000" step="1">
            </li>
        </ul>
        <ul class="popup_input_wrap">
            <li class="input_radio_wrap">
                <label>Use</label>
                <div class="reg_role_option_wrap">
                    <input id="useY"
                           type="radio"
                           name="useYn"
                           value="Y"
                           checked
                    >
                    <label for="useY">ON</label>
                    <input id="useN"
                           type="radio"
                           name="useYn"
                           value="N"
                    >
                    <label for="useN">OFF</label>
                </div>
            </li>
            <li class="input_radio_wrap">
                <label>Monitoring</label>
                <div class="reg_role_option_wrap">
                    <input id="monitoringY"
                           type="radio"
                           name="monitoringYn"
                           value="Y"
                           checked
                    >
                    <label for="monitoringY">ON</label>
                    <input id="monitoringN"
                           type="radio"
                           name="monitoringYn"
                           value="N"
                    >
                    <label for="monitoringN">OFF</label>
                </div>
            </li>
            <li class="input_radio_wrap">
                <label>Zip</label>
                <div class="reg_role_option_wrap">
                    <input id="zipY"
                           type="radio"
                           name="zipYn"
                           value="Y"
                           checked
                    >
                    <label for="zipY">ON</label>
                    <input id="zipN"
                           type="radio"
                           name="zipYn"
                           value="N"
                    >
                    <label for="zipN">OFF</label>
                </div>
            </li>
            <li class="input_radio_wrap">
                <label>Network Full Response Message</label>
                <div class="reg_role_option_wrap">
                    <input id="fullMsgY"
                           type="radio"
                           name="fullMsgYn"
                           value="Y"
                    >
                    <label for="fullMsgY">ON</label>
                    <input id="fullMsgN"
                           type="radio"
                           name="fullMsgYn"
                           value="N"
                           checked
                    >
                    <label for="fullMsgN">OFF</label>
                </div>
            </li>
            <li class="input_radio_wrap">
                <label>Network Full Request Message</label>
                <div class="reg_role_option_wrap">
                    <input id="fullReqMsgY"
                           type="radio"
                           name="fullReqMsgYn"
                           value="Y"
                    >
                    <label for="fullReqMsgY">ON</label>
                    <input id="fullReqMsgN"
                           type="radio"
                           name="fullReqMsgYn"
                           value="N"
                           checked
                    >
                    <label for="fullReqMsgN">OFF</label>
                </div>
            </li>
            <li class="input_radio_wrap">
                <label>Client Info</label>
                <div class="reg_role_option_wrap">
                    <input id="infoY"
                           type="radio"
                           name="infoYn"
                           value="Y"
                    >
                    <label for="infoY">ON</label>
                    <input id="infoN"
                           type="radio"
                           name="infoYn"
                           value="N"
                           checked
                    >
                    <label for="infoN">OFF</label>
                </div>
            </li>

            <li class="input_radio_wrap"
                <c:if test="${!integration}">style="display: none;"</c:if>
            >
                <label>Integration Dashboard</label>
                <div class="reg_role_option_wrap">
                    <input id="integrationY"
                           type="radio"
                           name="integrationYn"
                           value="Y"
                    >
                    <label for="integrationY">ON</label>
                    <input id="integrationN"
                           type="radio"
                           name="integrationYn"
                           value="N"
                           checked
                    >
                    <label for="integrationN">OFF</label>
                </div>
            </li>
            <li class="input_radio_wrap"
                <c:if test="${mode != 'all'}">style="display: none;"</c:if>
            >
                <label>Front</label>
                <div class="reg_role_option_wrap">
                    <input id="appType1"
                           type="radio"
                           name="appType"
                           value="1"
                    >
                    <label for="appType1">ON</label>
                    <input id="appType0"
                           type="radio"
                           name="appType"
                           value="0"
                           checked
                    >
                    <label for="appType0">OFF</label>
                </div>
            </li>
            <li class="input_radio_wrap"
                <c:if test="${mode != 'all' && mode != 'front'}">style="display: none;"</c:if>
            >
                <label>Session Replay</label>
                <div class="reg_role_option_wrap">
                    <input id="sReplayY"
                           type="radio"
                           name="sReplayYn"
                           value="Y"
                    >
                    <label for="sReplayY">ON</label>
                    <input id="sReplayN"
                           type="radio"
                           name="sReplayYn"
                           value="N"
                           checked
                    >
                    <label for="sReplayN">OFF</label>
                </div>
            </li>
        </ul>
    </div>
    <div class="popup_footer">
        <div class="btn_wrapper">
            <button class="btn_common btn_delete" id="btnDelete" data-t="common.btn.delete"></button>
        </div>

        <div class="btn_wrapper">
            <button class="btn_common opposite" id="btnSave" data-t="common.btn.save"></button>
        </div>
    </div>
</div>
<div class="maxy_popup_common_wrap" id="maxyAppMgPopupWrap"></div>

<%--suppress ES6ConvertVarToLetConst --%>
<script>
    var SM0400 = {
        v: {
            table: {},
            isIntegration: false,
            mode: null
        },
        init: {
            // 이벤트 바인딩 초기화
            event() {
                const {func} = SM0400
                $('.dimmed').on('click', func.popup.hide)
                $("#btnSave").on('click', func.fetch.save)
                $("#btnDelete").on('click', func.popup.delete)
                $('#btnRegApp').on('click', function() {
                    func.popup.open({}, 'reg')
                })
            },
            // 화면 초기 세팅
            created() {
                const {v, func} = SM0400

                // 통합대시보드 사용 여부 ('false', 'true) -> 앱 설정 팝업에서 필요함
                v.isIntegration = '${integration}'
                // mode ('all', 'front', 'maxy') -> 앱 설정 팝업에서 필요함
                v.mode = '${mode}'
                updateContent()
                func.draw.setServerType()
                func.draw.table().then(func.fetch.getAppList)
            }
        },
        func: {
            util: {
                // 서버 유형 텍스트 변환
                convertServerType(cell) {
                    return trl('common.' + getServerNm(cell.getData().serverType))
                },
                // Y/N 버튼 렌더링
                makeUseButton(str) {
                    return str === 'Y'
                        ? '<span class="btn_yn use w82">ON</span>'
                        : '<span class="btn_yn off w82">OFF</span>'
                },
                // 삭제 확인 텍스트 비교
                confirmDelete(str) {
                    const confirmText = trl('system.package.msg.deleteConfirm')
                    return str === confirmText
                },
                // 폼 유효성 검사 및 파라미터 구성
                valid() {
                    const {func} = SM0400;
                    const $packageNm = $("#packageNm");
                    const $serverType = $("#serverType");
                    const $displayNm = $("#displayNm");
                    const $loggingRate = $("#loggingRate");
                    const $logBundleUnit = $("#logBundleUnit");
                    const $logPeriod = $("#logPeriod");
                    const $pageLogPeriod = $("#pageLogPeriod");
                    const $sessionLogPeriod = $("#sessionLogPeriod");
                    const $order = $("#order");

                    const param = {
                        packageNm: $packageNm.val()?.trim(),
                        serverType: parseInt($serverType.val(), 10),
                        displayNm: $displayNm.val()?.trim(),
                        useYn: $('input[name="useYn"]:checked').val(),
                        monitoringYn: $('input[name="monitoringYn"]:checked').val(),
                        zipYn: $('input[name="zipYn"]:checked').val(),
                        fullMsgYn: $('input[name="fullMsgYn"]:checked').val(),
                        fullReqMsgYn: $('input[name="fullReqMsgYn"]:checked').val(),
                        infoYn: $('input[name="infoYn"]:checked').val(),
                        integrationYn: $('input[name="integrationYn"]:checked').val(),
                        appType: $('input[name="appType"]:checked').val(),
                        sReplayYn: $('input[name="sReplayYn"]:checked').val(),
                        loggingRate: parseInt($loggingRate.val(), 10),
                        logBundleUnit: parseInt($logBundleUnit.val(), 10),
                        logPeriod: parseInt($logPeriod.val(), 10),
                        pageLogPeriod: parseInt($pageLogPeriod.val(), 10),
                        sessionLogPeriod: parseInt($sessionLogPeriod.val(), 10),
                        order: parseInt($order.val(), 10)
                    };

                    // packageNm 형식 체크
                    const packageNmRegex = /^[a-zA-Z0-9._-]{1,100}$/;
                    if (!param.packageNm || !packageNmRegex.test(param.packageNm)) {
                        toast(trl('system.package.msg.packageName'));
                        util.emptyInput($packageNm);
                        return {status: false, param: null};
                    }

                    // serverType 허용값 확인
                    if (![0, 1, 2].includes(param.serverType)) {
                        toast(trl('system.batch.msg.invalidParam'));
                        util.emptyInput($serverType);
                        return {status: false, param: null};
                    }

                    // displayNm 길이 제한
                    if (!param.displayNm || param.displayNm.length > 100) {
                        toast(trl('system.package.msg.displayName'));
                        util.emptyInput($displayNm);
                        return {status: false, param: null};
                    }

                    // Y/N 필드 체크
                    const ynFields = ['useYn', 'monitoringYn', 'zipYn', 'fullMsgYn', 'fullReqMsgYn', 'infoYn', 'integrationYn', 'sReplayYn'];
                    for (const field of ynFields) {
                        const value = param[field];
                        if (!['Y', 'N'].includes(value)) {
                            toast(`$\{trl('system.batch.msg.invalidParam')}`);
                            return {status: false, param: null};
                        }
                    }

                    // logBundleUnit 범위 체크
                    if (isNaN(param.logBundleUnit)
                        || param.logBundleUnit < 10
                        || param.logBundleUnit > 500) {
                        toast(trl('system.package.msg.valid.numberrange', [10, 500]));
                        util.emptyInput($logBundleUnit);
                        return {status: false, param: null};
                    }
                    // logPeriod 범위 체크
                    if (isNaN(param.logPeriod)
                        || param.logPeriod < 1
                        || param.logPeriod > 120) {
                        toast(trl('system.package.msg.valid.numberrange', [1, 120]));
                        util.emptyInput($logPeriod);
                        return {status: false, param: null};
                    }
                    // pageLogPeriod 범위 체크
                    if (isNaN(param.pageLogPeriod)
                        || param.pageLogPeriod < 0
                        || param.pageLogPeriod > 10) {
                        toast(trl('system.package.msg.valid.numberrange', [0, 10]));
                        util.emptyInput($pageLogPeriod);
                        return {status: false, param: null};
                    }
                    // sessionLogPeriod 범위 체크
                    if (isNaN(param.sessionLogPeriod)
                        || param.sessionLogPeriod < 1
                        || param.sessionLogPeriod > 10) {
                        toast(trl('system.package.msg.valid.numberrange', [1, 10]));
                        util.emptyInput($sessionLogPeriod);
                        return {status: false, param: null};
                    }

                    // loggingRate 범위 체크
                    if (isNaN(param.loggingRate) || param.loggingRate < 0 || param.loggingRate > 100) {
                        toast(trl('system.package.msg.valid.numberrange', [0, 100]));
                        util.emptyInput($loggingRate);
                        return {status: false, param: null};
                    }

                    // order 범위 체크
                    if (isNaN(param.order) || param.order < 0 || param.order > 999) {
                        toast(trl('system.package.msg.valid.numberrange', [0, 999]));
                        util.emptyInput($order);
                        return {status: false, param: null};
                    }

                    return {param, status: true};
                }
            },
            draw: {
                // 서버 유형 셀렉트박스 렌더링
                setServerType() {
                    const $serverType = $("#serverType")
                    $serverType.empty()
                    let option = ''
                    $.each(JSON.parse('${serverType}'), (i, val) => {
                        const desc = trl('common.' + val.desc)
                        option += '<option value="' + val.code + '">' + desc + '</option>'
                    })
                    $serverType.append(option)

                    // ServerType
                    // 개발 기본설정 : log Bundle Unit : 10, log Period :  10
                    // 품질/운영 기본설정 : log Bundle Unit : 100, log Period :  30
                    $serverType.on('change', function () {
                        console.log($('#serverType option:selected').val())
                        if ($('#serverType option:selected').val() === '0') {
                            $('#logBundleUnit').val('10')
                            $('#logPeriod').val('10')
                        } else {
                            $('#logBundleUnit').val('100')
                            $('#logPeriod').val('30')
                        }
                    })
                },
                // Tabulator 테이블 초기화
                async table() {
                    const {v, func} = SM0400

                    const isFront = '${mode}' !== 'maxy';
                    const column = {
                        'title': isFront ? 'Front' : 'Zip',
                        'field': isFront ? 'appType' : 'zipYn',
                        'headerTooltip': isFront ? 'Front or MAXY' : 'Whether to Compress log',
                        'formatter': (cell) => {
                            const v = cell.getValue();
                            const display = isFront ? (v === '1' ? 'Y' : 'N') : v;
                            return func.util.makeUseButton(display);
                        },
                    }

                    v.table = new Tabulator("#appTable", {
                        height: 'calc(100vh - 145px)',
                        layout: "fitDataFill",
                        placeholder: trl('common.msg.noData'),
                        columns: [
                            // 테이블 컬럼 정의
                            {
                                title: 'App ID',
                                field: "packageNm",
                                vertAlign: 'middle',
                                headerTooltip: 'App ID',
                                tooltip: true,
                                width: '15%'
                            },
                            {
                                title: 'Server',
                                field: "serverType",
                                vertAlign: 'middle',
                                width: '9%',
                                headerTooltip: 'Server Type',
                                formatter: func.util.convertServerType
                            },
                            {
                                title: 'App Name',
                                field: "displayNm",
                                vertAlign: 'middle',
                                headerTooltip: 'App Name',
                                tooltip: true,
                                width: '17%'
                            },
                            {
                                title: 'Use',
                                field: "useYn",
                                vertAlign: 'middle',
                                width: '7%',
                                headerTooltip: 'Whether to use',
                                formatter: cell => func.util.makeUseButton(cell.getValue())
                            },
                            {
                                title: 'Monitoring',
                                field: "monitoringYn",
                                vertAlign: 'middle',
                                width: '10%',
                                headerTooltip: 'Whether to Monitoring',
                                formatter: cell => func.util.makeUseButton(cell.getValue())
                            },
                            {
                                title: 'Logging Rate',
                                field: "loggingRate",
                                vertAlign: 'middle',
                                width: '9%',
                                headerTooltip: 'Logging Rate',
                                formatter: cell => cell.getValue() + '%'
                            },
                            {
                                title: 'Logging Unit',
                                field: "logBundleUnit",
                                vertAlign: 'middle',
                                width: '8%',
                                headerTooltip: 'Logging Unit',
                                formatter: cell => cell.getValue() + ' (logs)'
                            },
                            {
                                title: 'Logging Period',
                                field: "logPeriod",
                                vertAlign: 'middle',
                                width: '10%',
                                headerTooltip: 'Logging Period',
                                formatter: cell => cell.getValue() + ' sec'
                            },
                            {
                                title: 'Page Log Period',
                                field: "pageLogPeriod",
                                vertAlign: 'middle',
                                width: '13%',
                                headerTooltip: 'Page Log Period',
                                formatter: cell => cell.getValue() + ' min'
                            },
                            {
                                title: 'Order',
                                field: "order",
                                vertAlign: 'middle',
                                headerTooltip: 'Sort order',
                                visible: false
                            }
                        ],
                    })

                    v.table.on("rowClick", (e, row) => {
                        func.popup.open(row.getData(), 'update')
                    })
                }
            },
            popup: {
                // 등록/수정 팝업 열기
                open(data, type) {
                    const {v} = SM0400
                    const {isIntegration, mode} = v
                    const serverType = '${serverType}'
                    // data는 수정 팝업일 경우에만 있고 등록일 때는 {} 임.
                    new MaxyPopupAppManagement({
                        appendId: 'maxyAppMgPopupWrap',
                        id: 'appModifyOrReg',
                        data,
                        type,
                        isIntegration,
                        mode,
                        serverType
                    })
                },
                // 팝업 닫기 및 초기화
                hide() {
                    $('.popup_package').hide()
                    $('.popup_package input[type="text"]').val('')
                    $(".popup_package #serverType").val(0).prop('selected', true)
                    $('.popup_package #order').val(0)
                    $('.popup_package #loggingRate').val(100)
                    $('.popup_package #logBundleUnit').val(10)
                    $('.popup_package #logPeriod').val(60)
                    $('.popup_package #pageLogPeriod').val(10)
                    $('.popup_package #sessionLogPeriod').val(4)
                    $('.popup_package input[name="useYn"]:input[value="Y"]').prop('checked', true)
                    $('.popup_package input[name="monitoringYn"]:input[value="Y"]').prop('checked', true)
                    $('.popup_package input[name="zipYn"]:input[value="Y"]').prop('checked', true)
                    $('.popup_package input[name="fullMsgYn"]:input[value="N"]').prop('checked', true)
                    $('.popup_package input[name="fullReqMsgYn"]:input[value="N"]').prop('checked', true)
                    $('.popup_package input[name="infoYn"]:input[value="N"]').prop('checked', true)
                    $('.popup_package input[name="integrationYn"]:input[value="N"]').prop('checked', true)
                    $('.popup_package input[name="appType"]:input[value="0"]').prop('checked', true)
                    $('.popup_package input[name="sReplayYn"]:input[value="N"]').prop('checked', true)
                    $('.dimmed').hide()
                },
                // 삭제 확인 및 삭제 호출
                delete() {
                    const {func} = SM0400
                    const s = prompt(trl('system.package.msg.deleteWarning'), '')
                    if (func.util.confirmDelete(s)) {
                        func.fetch.delete()
                    }
                }
            },
            fetch: {
                // App 목록 조회
                getAppList() {
                    const {v} = SM0400
                    ajaxCall('/sm/0500/getAppInfoList.maxy', {}).then(data => {
                        v.table.replaceData(data)
                    }).catch(error => {
                        console.log(error)
                    })
                },
                // App 저장
                save() {
                    const {v, func} = SM0400
                    const packageNm = $('#packageNm').val()
                    const serverType = $('#serverType').val()
                    if (!packageNm || !serverType) {
                        toast(trl('system.batch.msg.invalidParam'))
                        return
                    }

                    const {param, status} = func.util.valid()
                    if (!status) return

                    param.type = $('#btnSave').data('type')

                    if ('${mode}' === 'maxy') {
                        param.appType = 0
                    } else if ('${mode}' === 'front') {
                        param.appType = 1
                    }

                    ajaxCall('/sm/0500/saveAppInfo.maxy', param).then(data => {
                        v.table.replaceData(data)
                        toast(trl('system.package.msg.save'), true)
                        func.popup.hide()
                        getSessionInfo()
                    }).catch(error => {
                        console.log(error)
                        toast(trl(error.msg))
                    })
                },
                // App 삭제
                delete() {
                    const {v, func} = SM0400
                    const packageNm = $('#packageNm').val()
                    const serverType = $('#serverType').val()
                    if (!packageNm || !serverType) {
                        toast(trl('system.batch.msg.invalidParam'))
                        return
                    }

                    const param = {packageNm, serverType}
                    param.appType = (sessionStorage.getItem('maxyMode') || '') === 'front' ? 1 : 0

                    ajaxCall('/sm/0500/deleteAppInfo.maxy', param).then(data => {
                        v.table.replaceData(data)
                        toast(trl('system.package.msg.delete'), true)
                        func.popup.hide()
                        getSessionInfo()
                    }).catch(error => {
                        console.log(error)
                        toast(trl(error.msg))
                    })
                }
            }
        }
    }

    SM0400.init.created()
    SM0400.init.event()
</script>