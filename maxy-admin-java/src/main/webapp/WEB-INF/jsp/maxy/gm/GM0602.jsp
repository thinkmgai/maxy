<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ page contentType="text/html;charset=UTF-8" %>
<style>
    .gm_config_group {
        display: grid;
        grid-gap: 16px;
    }

    .gm_header {
        margin-bottom: 16px;
    }

    .gm_header .gm_filter_group .app_info_wrap select:not(:last-child) {
        margin-right: 8px !important;
    }

    .config_input_wrap input[type="text"] {
        width: 180px;
    }
</style>
<%-- 관리 > 알림 설정 --%>
<div class="gm_wrap">
    <div class="gm_header">
        <div class="gm_menu_text_wrap">
            <h4 class="gm_menu_title" data-t="management.title.notificationSetting"></h4>
            <h5 class="gm_menu_desc" data-t="management.title.desc.notificationSetting"></h5>
        </div>
        <div class="gm_filter_group">
            <div class="app_info_wrap">
                <span class="app_icon">A</span>
                <label for="packageNm"></label><select id="packageNm" class="app_info_select"></select>
            </div>
        </div>
    </div>
    <div class="gm_btn_wrap">
        <button id="btnSave" class="btn btn_common save">
            <span data-t="common.btn.save"></span>
            <img class="img_save" alt="">
        </button>
    </div>

    <div class="gm_contents">
        <div class="gm_config_group" id="configGroup"></div>

    </div>
</div>
<script>
    var GM0602 = {
        v: {template: {}},
        init: {
            event() {
                // 패키지 명 select 변경 이벤트
                $('#packageNm').on('change', () => {
                    GM0602.func.getData()
                    // 패키지 변경시 osType, appVer 전체 값으로 초기화
                    sessionStorage.setItem('osType', 'A')
                    sessionStorage.setItem('appVer', 'A')
                })

                $('#btnSave').on('click', GM0602.func.save)
            },
            created() {
                updateContent()
                GM0602.func.setHandlebarsHelper()
                appInfo.append({pId: 'packageNm'}).then(() => {
                    GM0602.func.getData()
                })
            }
        },
        func: {
            setHandlebarsHelper() {
                Handlebars.registerHelper('isProgress', function (options) {
                    const v = this
                    if ('Y' === v.progress) {
                        return options.fn(v)
                    } else {
                        return options.inverse(v)
                    }
                })

                Handlebars.registerHelper('isUse', function (options) {
                    const v = this
                    if ('Y' === v.use) {
                        return options.fn(v)
                    } else {
                        return options.inverse(v)
                    }
                })

                Handlebars.registerHelper('setProgressWidth', function (data) {
                    return Math.round(150 * data / 100)
                })

                Handlebars.registerHelper('isRadioChecked', function (currentValue, targetValue) {
                    return currentValue === targetValue ? "checked" : "";
                })

                Handlebars.registerHelper('setLang', function (val) {
                    return i18next.tns('management.notification.title.duplicate')
                })
            },
            save() {
                const packageNm = $('#packageNm').val()
                const serverType = $('#packageNm option:checked').data('server-type')
                const $std = $('.config_input_wrap .config_input')
                const $use = $('.btn_use')
                const networkVal = $('#network').val()
                const $dupl = $('.duplication_check_wrap input[type="radio"]')
                const obj = {}

                for (let i = 0; i < $std.length; i++) {
                    const stdEl = $std[i]
                    const stdElId = stdEl.id
                    const val = Number($(stdEl).val())
                    if (Number.isInteger(val)) {
                        obj[stdEl.id] = val
                    } else {
                        const msg = i18next.tns('common.msg.number')
                        toast(msg)
                        util.emptyInput($(stdEl))
                        return
                    }

                    const targetName = $('#' + stdElId).parents('.config_contents_wrap_wrap').find('.config_name_wrap').text()

                    const lang = localStorage.getItem('lang')
                    let msg


                    if ((stdElId === 'errorAlimStd' ||
                            stdElId === 'cpuAlimStd' ||
                            stdElId === 'memAlimStd' ||
                            stdElId === 'installYdaAlimStd' ||
                            stdElId === 'loginYdaAlimStd' ||
                            stdElId === 'dauYdaAlimStd' ||
                            stdElId === 'pvYdaAlimStd' ||
                            stdElId === 'errorYdaAlimStd' ||
                            stdElId === 'crashYdaAlimStd')
                        && (val < 10 || val > 100)) {
                        if (lang === 'ko' || lang === 'ja') {
                            msg = targetName + i18next.tns('management.notification.msg.minmaxall')
                        } else if (lang === 'en') {
                            msg = i18next.tns('management.notification.msg.minmaxall') + targetName
                        }
                        toast(msg)
                        return
                    }

                    if (stdElId === 'crashAlimStd' && (val < 1 || val > 100)) {
                        if (lang === 'ko' || lang === 'ja') {
                            msg = targetName + i18next.tns('management.notification.msg.minmaxcrashalim')
                        } else if (lang === 'en') {
                            msg = i18next.tns('management.notification.msg.minmaxcrashalim') + targetName
                        }
                        toast(msg)
                        return
                    }

                    if ((stdElId === 'pageloadingAlimStd' ||
                            stdElId === 'responseAlimStd')
                        && (val < 500 || val > 3000)) {
                        if (lang === 'ko' || lang === 'ja') {
                            msg = targetName + i18next.tns('management.notification.msg.minmaxperformance')
                        } else if (lang === 'en') {
                            msg = i18next.tns('management.notification.msg.minmaxperformance') + targetName
                        }
                        toast(msg)
                        return
                    }

                    const useEl = $use[i]
                    if (useEl.classList.contains('on')) {
                        obj[useEl.id] = 'Y'
                    } else {
                        obj[useEl.id] = 'N'
                    }
                }

                for (let i = 0; i < $dupl.length; i++) {
                    const duplEl = $dupl[i]
                    const duplChecked = $(duplEl).is(':checked')
                    const duplElName = duplEl.name

                    if (duplChecked) {
                        obj[duplElName] = $(duplEl).val()
                    }
                }

                obj.packageNm = packageNm
                obj.serverType = serverType
                obj.comSensitivityAlimStd = networkVal

                ajaxCall('/gm/0602/modifyAlarmConfig.maxy', obj)
                    .then(data => {
                        const msg = i18next.tns('common.msg.success')
                        toast(msg)
                        GM0602.func.setData(data)
                    }).catch(error => {
                    toast(i18next.tns(error.msg))
                })
            },
            async setData(data) {
                const d = data.alarmConfig
                const items = [
                    [
                        {
                            type: 'errorAlimStd',
                            typeText: i18next.tns('management.notification.type.error'),
                            std: d.errorAlimStd,
                            use: d.errorUseYn,
                            useText: 'errorUseYn',
                            desc: i18next.tns('management.notification.title.error'),
                            tipText: i18next.tns('management.notification.tip.error'),
                            exampleText: i18next.tns('management.notification.ex.error'),
                            duplYn: d.errorDuplYn,
                            duplText: 'errorDuplYn'
                        }
                    ],
                    [
                        {
                            type: 'crashAlimStd',
                            typeText: i18next.tns('management.notification.type.crash'),
                            std: d.crashAlimStd,
                            use: d.crashUseYn,
                            useText: 'crashUseYn',
                            desc: i18next.tns('management.notification.title.crash'),
                            tipText: i18next.tns('management.notification.tip.crash'),
                            exampleText: i18next.tns('management.notification.ex.crash'),
                            duplYn: d.crashDuplYn,
                            duplText: 'crashDuplYn'
                        }
                    ],
                    [
                        {
                            type: 'cpuAlimStd',
                            typeText: i18next.tns('management.notification.type.resource'),
                            std: d.cpuAlimStd,
                            use: d.cpuUseYn,
                            useText: 'cpuUseYn',
                            desc: i18next.tns('management.notification.title.cpu'),
                            tipText: i18next.tns('management.notification.tip.pct'),
                            exampleText: i18next.tns('management.notification.ex.cpu'),
                            duplYn: d.cpuDuplYn,
                            duplText: 'cpuDuplYn'
                        },
                        {
                            type: 'memAlimStd',
                            typeText: i18next.tns('management.notification.type.resource'),
                            std: d.memAlimStd,
                            use: d.memUseYn,
                            useText: 'memUseYn',
                            desc: i18next.tns('management.notification.title.memory'),
                            tipText: i18next.tns('management.notification.tip.memory'),
                            exampleText: i18next.tns('management.notification.ex.memory'),
                            duplYn: d.memDuplYn,
                            duplText: 'memDuplYn'
                        },
                        {
                            type: 'comSensitivityAlimStd',
                            typeText: i18next.tns('management.notification.type.resource'),
                            std: d.comSensitivityAlimStd,
                            use: d.comSensitivityUseYn,
                            useText: 'comSensitivityUseYn',
                            desc: i18next.tns('management.notification.title.network'),
                            tipText: i18next.tns('management.notification.tip.comSensitivity'),
                            exampleText: i18next.tns('management.notification.ex.comSensitivity'),
                            note: i18next.tns('management.notification.msg.ios'),
                            optionYn: 'Y',
                            duplYn: d.comSensitivityDuplYn,
                            duplText: 'comSensitivityDuplYn'
                        }
                    ],
                    [
                        {
                            type: 'pageloadingAlimStd',
                            typeText: i18next.tns('management.notification.type.app'),
                            std: d.pageloadingAlimStd,
                            use: d.pageloadingUseYn,
                            useText: 'pageloadingUseYn',
                            desc: i18next.tns('management.notification.title.loadingTime'),
                            tipText: i18next.tns('management.notification.tip.time'),
                            exampleText: i18next.tns('management.notification.ex.loadingTime'),
                            duplYn: d.pageloadingDuplYn,
                            duplText: 'pageloadingDuplYn'
                        },
                        {
                            type: 'responseAlimStd',
                            typeText: i18next.tns('management.notification.type.usability'),
                            std: d.responseAlimStd,
                            use: d.responseUseYn,
                            useText: 'responseUseYn',
                            desc: i18next.tns('management.notification.title.responseTime'),
                            tipText: i18next.tns('management.notification.tip.time'),
                            exampleText: i18next.tns('management.notification.ex.responseTime'),
                            duplYn: d.responseDuplYn,
                            duplText: 'responseDuplYn'
                        }
                    ],
                    [
                        {
                            type: 'installYdaAlimStd',
                            typeText: i18next.tns('management.notification.type.usability'),
                            std: d.installYdaAlimStd,
                            use: d.installYdaUseYn,
                            useText: 'installYdaUseYn',
                            desc: i18next.tns('management.notification.title.install'),
                            tipText: i18next.tns('management.notification.tip.pct'),
                            exampleText: i18next.tns('management.notification.ex.install'),
                            duplYn: d.installYdaDuplYn,
                            duplText: 'installYdaDuplYn'
                        },
                        {
                            type: 'loginYdaAlimStd',
                            typeText: i18next.tns('management.notification.type.usability'),
                            std: d.loginYdaAlimStd,
                            use: d.loginYdaUseYn,
                            useText: 'loginYdaUseYn',
                            desc: i18next.tns('management.notification.title.login'),
                            tipText: i18next.tns('management.notification.tip.pct'),
                            exampleText: i18next.tns('management.notification.ex.login'),
                            duplYn: d.loginYdaDuplYn,
                            duplText: 'loginYdaDuplYn'
                        },
                        {
                            type: 'dauYdaAlimStd',
                            typeText: i18next.tns('management.notification.type.usability'),
                            std: d.dauYdaAlimStd,
                            use: d.dauYdaUseYn,
                            useText: 'dauYdaUseYn',
                            desc: i18next.tns('management.notification.title.dau'),
                            tipText: i18next.tns('management.notification.tip.pct'),
                            exampleText: i18next.tns('management.notification.ex.dau'),
                            duplYn: d.dauYdaDuplYn,
                            duplText: 'dauYdaDuplYn'
                        },
                        {
                            type: 'pvYdaAlimStd',
                            typeText: i18next.tns('management.notification.type.usability'),
                            std: d.pvYdaAlimStd,
                            use: d.pvYdaUseYn,
                            useText: 'pvYdaUseYn',
                            desc: i18next.tns('management.notification.title.pv'),
                            tipText: i18next.tns('management.notification.tip.pct'),
                            exampleText: i18next.tns('management.notification.ex.pv'),
                            duplYn: d.pvYdaDuplYn,
                            duplText: 'pvYdaDuplYn'
                        },
                        {
                            type: 'errorYdaAlimStd',
                            typeText: i18next.tns('management.notification.type.usability'),
                            std: d.errorYdaAlimStd,
                            use: d.errorYdaUseYn,
                            useText: 'errorYdaUseYn',
                            desc: i18next.tns('management.notification.title.errorPct'),
                            tipText: i18next.tns('management.notification.tip.pct'),
                            exampleText: i18next.tns('management.notification.ex.errorRatio'),
                            duplYn: d.errorYdaDuplYn,
                            duplText: 'errorYdaDuplYn'
                        },
                        {
                            type: 'crashYdaAlimStd',
                            typeText: i18next.tns('management.notification.type.usability'),
                            std: d.crashYdaAlimStd,
                            use: d.crashYdaUseYn,
                            useText: 'crashYdaUseYn',
                            desc: i18next.tns('management.notification.title.crashPct'),
                            tipText: i18next.tns('management.notification.tip.pct'),
                            exampleText: i18next.tns('management.notification.ex.crashRatio'),
                            duplYn: d.crashYdaDuplYn,
                            duplText: 'crashYdaDuplYn'
                        }
                    ]
                ]

                // 템플릿에 데이터 넣어 추가
                const $configGroup = $('#configGroup')
                $configGroup.empty()

                // 템플릿 가져오기
                const source = await fetch('/templates/alarmConfig.html')
                    .then(response => response.text())
                const template = Handlebars.compile(source)
                const alarmConFigList = template(items)
                // 템플릿에 리스트 넣기
                $configGroup.append(alarmConFigList)

                // 네트워크 감도 체크
                $('#network').val(data.alarmConfig.comSensitivityAlimStd)
                // 버튼 이벤트 등록
                $('.btn_use').on('click', function (e) {
                    e.preventDefault()
                    const v = $(this)
                    if (v.hasClass('on')) {
                        v.removeClass('on')
                    } else {
                        v.addClass('on')
                    }
                })
            },
            async getData() {
                const param = {
                    packageNm: $('#packageNm').val(),
                    serverType: $('#packageNm option:checked').data('server-type')
                }

                if (util.checkParam(param)) {
                    return;
                }

                await ajaxCall('/gm/0602/getAlarmConfig.maxy', param)
                    .then(data => {
                        GM0602.func.setData(data)
                    })
                    .catch(error => {
                        toast(i18next.tns(error.msg))
                    })
            }
        }
    }
    GM0602.init.event()
    GM0602.init.created()
</script>