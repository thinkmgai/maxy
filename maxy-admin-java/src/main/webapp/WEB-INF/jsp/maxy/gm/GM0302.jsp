<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ page contentType="text/html;charset=UTF-8" %>
<%--suppress CssUnusedSymbol --%>
<style>
    .gm_contents {
        width: 100%;
        border-radius: var(--radius);
    }

    .gm_contents .gm_grid_wrap {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1.2em;
        margin-bottom: 1.6em;
    }

    .gm_grid_wrap .gm_grid {
        position: relative;
        padding: 1.2em 1em 1.2em 1em;
        width: 100%;
        height: 25em;
        display: grid;
        grid-template-rows: 15% 70%;
        border-radius: var(--radius);
        border: 1px solid #e3e5e8;
    }

    .setting_popup {
        position: fixed;
    }

    .setting_popup .maxy_popup_header {
        display: flex;
        margin-bottom: 1.5em;
    }

    .setting_popup .popup_input_wrap {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.5em;
        gap: 1em;
    }

    .setting_popup .popup_input_wrap input {
        width: 100%;
        padding-right: 26px;
    }

    .setting_popup .popup_input_wrap .inner_wrap {
        display: flex;
        align-items: center;
    }

    .setting_popup .popup_input_wrap .txt_prefix {
        width: 100px;
    }

    .setting_popup .popup_input_wrap .txt_postfix {
        width: 150px;
    }

    .setting_popup .popup_input_wrap .txt_postfix.short {
        width: 15px;
    }

    .setting_popup .popup_middle_wrap {
        margin-bottom: 1.5em;
        display: flex;
        gap: .5em;
        flex-direction: column;
    }

    .setting_popup .popup_middle_wrap h3 {
        font-weight: 600;
        font-size: 16px;
    }

    .setting_popup .txt_tip {
        margin-bottom: 1em;
        font-size: 11px;
    }

    .gm_popup_preview {
        width: 485px !important;
        height: 400px !important;
        overflow: hidden;
    }

    .gm_popup_preview .preview_wrap {
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: hidden;
        height: calc(100% - 24px);
    }

    .gm_popup_preview .preview_wrap img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
</style>

<%-- 관리 > Components --%>
<div class="components_popup_wrap" id="componentsPopupWrap"></div>
<div class="gm_wrap">
    <div class="gm_header">
        <div class="gm_menu_text_wrap">
            <h4 class="gm_menu_title" data-t="menu.management.components"></h4>
            <h5 class="gm_menu_desc" data-t="management.title.desc.components"></h5>
        </div>

        <div class="gm_btn_wrap mt_auto">
            <button id="btnSave" class="btn_common">
                <span data-t="common.btn.save"></span>
                <img class="img_save" alt="">
            </button>
        </div>
    </div>

    <div class="gm_contents">
        <div class="gm_grid_wrap" id="componentsWrap"></div>
    </div>
</div>
<div class="maxy_popup_common gm_popup_preview">
    <div>
        <h4>Preview</h4>
    </div>
    <div class="preview_wrap">
        <img src="" alt="">
    </div>
</div>
<%--suppress ES6ConvertVarToLetConst --%>
<script>
    var GM0302 = {
        v: {
            componentList: {},
            popup: {},
            componentsConfigObj: {}
        },
        init: {
            event() {
                const {func} = GM0302
                $('#btnSave').on('click', function () {
                    func.setParams('save')
                })
            },
            created() {
                const {func} = GM0302
                updateContent()
                func.setHandlebars()
                func.getData()
            }
        },
        func: {
            getData() {
                const {func} = GM0302
                ajaxCall('/gm/0302/getChartConfig.maxy', {}).then(data => {
                    func.setData(data)
                }).catch(() => {
                    toast(trl('common.msg.serverError'))
                })
            },
            setData(data) {
                const {v, func} = GM0302
                const dataArr = Object.values(data)
                // 리스트를 모두 그린 후에 이벤트 추가
                func.drawList(dataArr).then(() => {
                    func.handleDragAndDrop()
                    func.setTooltip()
                    const optionArr = dataArr.filter(f => f.optional ? f : null)
                    const idArr = []
                    for (let x of optionArr) {
                        const id = x.key.toLowerCase().replaceAll(' ', '')
                        idArr.push(id)
                        v.componentsConfigObj[id] = {}
                        for (let y of Object.keys(x)) {
                            if (y.startsWith('opt')) {
                                // 컴포넌트 별 option 넣기
                                v.componentsConfigObj[id][y] = x[y]
                            }
                        }
                    }
                    func.setOptionPopup(idArr)
                    $('.chart_setting').off('click').on('click', func.openPopup)
                    $('.dimmed').off('click').on('click', function () {
                        func.closePopup()
                        func.closePreview()
                    })
                    $('.gm_preview img').off('click').on('click', func.openPreview)
                })
            },
            openPreview(e) {
                const {func} = GM0302
                const $this = $(this)
                console.log($this.data('type'))
                $('.gm_popup_preview img').attr('src', '/images/maxy/preview/preview-' + $this.data('type') + '.png')
                $('.dimmed').fadeIn(300)
                $('.gm_popup_preview').fadeIn(300).off('click').on('click', func.closePreview)
            },
            closePreview() {
                $('.gm_popup_preview').fadeOut(200)
                $('.dimmed').hide()
            },
            setOptionPopup(data) {
                const {v} = GM0302
                data.forEach(id => {
                    const $gmGrid = $('#' + id)

                    const options = {
                        id,
                        name: $gmGrid.data('name'),
                        appendId: 'componentsPopupWrap',
                        type: null,
                        param: {},
                        txt: {},
                        desc: trl('management.components.desc.' + id)
                    }
                    switch (id) {
                        case 'logmeter' : {
                            v.popup[id] = new PopupSettingLogmeter(options)
                            break
                        }
                        case 'versioncomparison' : {
                            v.popup[id] = new MaxyPopupVersionComparison(options)
                            break
                        }
                        case 'responsetimescatter' : {
                            options.param.type = 'optResponsetimescatterRange'
                            options.type = 'response'
                            v.popup[id] = new PopupSettingScatter(options)
                            break
                        }
                        case 'loadingtimescatter' : {
                            options.param.type = 'optLoadingtimescatterRange'
                            options.type = 'loading'
                            v.popup[id] = new PopupSettingScatter(options)
                            break
                        }
                        case 'pvequalizer' : {
                            options.param.type = 'optPvequalizerMaxSize'
                            v.popup[id] = new PopupSettingMaxSize(options)
                            break
                        }
                        case 'pageview' : {
                            options.param.type = 'optPageviewMaxSize'
                            v.popup[id] = new PopupSettingMaxSize(options)
                            break
                        }
                        case 'favorites'   : {
                            options.param.type = 'optFavoritesMaxSize'
                            v.popup[id] = new PopupSettingMaxSize(options)
                            break
                        }
                        case 'marketinginsight'   : {
                            v.popup[id] = new PopupSettingMarketingInsight(options)
                            break
                        }
                        default: {
                            return
                        }
                    }
                })
            },
            async drawList(data) {
                if (data) {
                    try {
                        const source = await fetch('/templates/componentList.html')
                            .then(response => response.text())
                        const template = Handlebars.compile(source)

                        const componentList = template({componentList: data})
                        $('#componentsWrap').html(componentList)
                    } catch (e) {

                    }
                }
            },
            async saveData() {
                const param = GM0302.v.componentList

                let validMsg = ''
                // Marketing Insight 컴포넌트가 포함되어 있는지 확인
                const hasMarketingInsight = Object.values(param).includes(16);
                if (hasMarketingInsight) {
                    await ajaxCall('/gm/0302/getMarketingInsightConfig.maxy',
                        {
                            'packageNm': sessionStorage.getItem('packageNm'),
                            'serverType': sessionStorage.getItem('serverType'),
                            'userNo': Number(sessionStorage.getItem('userNo'))
                        },
                        {disableCursor: true}
                    ).then(data => {
                        if (data['preUrl'] === '' || data['reqUrl'] === '') {
                            validMsg = trl('dashboard.msg.noSetMarketingInsight')
                        }
                    }).catch(error => {
                        console.log(error)
                        toast(trl(error.msg))
                    })
                }

                // Version Comparison 컴포넌트가 포함되어 있는지 확인
                const hasVersionComparison = Object.values(param).includes(13);
                if (hasVersionComparison) {
                    await ajaxCall('/gm/0302/getComponentConfig.maxy',
                        {
                            'packageNm': sessionStorage.getItem('packageNm'),
                            'serverType': sessionStorage.getItem('serverType'),
                            'type': 'versioncomparison'
                        },
                        {disableCursor: true}
                    ).then(data => {
                        const {optAppVerA, optAppVerB, optOsTypeA, optOsTypeB} = data
                        if(util.isEmpty(optAppVerA) || util.isEmpty(optAppVerB) || util.isEmpty(optOsTypeA) || util.isEmpty(optOsTypeB)) {
                            validMsg = trl('dashboard.msg.noSetVersionComparison')
                        }
                    })
                }

                if (validMsg !== '') {
                    toast(validMsg)
                    return
                }

                ajaxCall('/gm/0302/modifyChartConfig.maxy', param)
                    .then(data => {
                        const msg = trl('common.msg.success')
                        toast(msg)
                        GM0302.func.setData(data)
                    })
                    .catch(() => {
                        const msg = trl('common.msg.serverError')
                        toast(msg)
                    })

            },
            setHandlebars() {
                Handlebars.registerHelper('nameFormat', name => {
                    if (name) {
                        return name.replace(/\s+/g, '').replace(/(\w)(\w*)/g, function (_, firstChar, restOfString) {
                            return firstChar.toLowerCase() + restOfString.toLowerCase();
                        });
                    }
                })

                Handlebars.registerHelper('getName', key => {
                    if (key) {
                        key = key.replace(/\s+/g, '').toLowerCase();
                        return trl('dashboard.component.title.' + key)
                    }
                })

                Handlebars.registerHelper('isChecked', use => {
                    // seq가 0이 아닌경우는 check 처리
                    if (use) {
                        return 'checked'
                    }
                })

                Handlebars.registerHelper('chartTypeFormat', (chartType) => {
                    let str
                    if (chartType) {
                        str = chartType.toLowerCase()
                        str = str.replace(/\b[a-z]/g, char => char.toUpperCase())

                        if (str.includes('_')) {
                            str = str.replace('_', ' ')
                        }
                    }
                    return str
                })


                Handlebars.registerHelper('typeFormat', (type) => {
                    let str = ''
                    const control = trl('common.text.control')
                    const analysis = trl('common.text.analysis')
                    if (type) {
                        if (type === 'ANALYSIS') {
                            str = '<div class="chart_analysis">' + analysis + '</div>'
                        } else if (type === 'MONITOR') {
                            str = '<div class="chart_monitor">' + control + '</div>'
                        }
                    }
                    return new Handlebars.SafeString(str)
                })

                Handlebars.registerHelper('isOptional', (optional, name) => {
                    let str
                    let imgId
                    if (optional) {
                        imgId = name.toLowerCase().replace(/ /g, "")
                        str = '<img class="chart_setting" alt="" data-key="' + imgId + '" id="' + imgId + 'Setting' + '">'
                    } else {
                        str = ''
                    }
                    return new Handlebars.SafeString(str)
                })

                Handlebars.registerHelper('optionFormat', (data) => {
                    const key = data.key.toLowerCase().replace(/ /g, "")
                    try {
                        if (key === 'logmeter') {
                            if (data.optLogmeterCrashWeight) {
                                const optLogmeterTime = data.optLogmeterTime;
                                const optLogmeterCrashWeight = data.optLogmeterCrashWeight;
                                const optLogmeterErrorWeight = data.optLogmeterErrorWeight;
                                const optLogmeterLogWeight = data.optLogmeterLogWeight;
                                return new Handlebars.SafeString('data-opt-logmeter-crash-weight=' + optLogmeterCrashWeight
                                    + ' data-opt-logmeter-time=' + optLogmeterTime
                                    + ' data-opt-logmeter-error-weight=' + optLogmeterErrorWeight
                                    + ' data-opt-logmeter-log-weight=' + optLogmeterLogWeight);
                            }
                        }
                        if (key === 'favorites') {
                            if (data.optFavoritesMaxSize) {
                                const optFavoritesMaxSize = data.optFavoritesMaxSize;
                                return new Handlebars.SafeString('data-opt-max-size=' + optFavoritesMaxSize);
                            }
                        }
                        if (key === 'pageview') {
                            if (data.optPageviewMaxSize) {
                                const optPageviewMaxSize = data.optPageviewMaxSize;
                                return new Handlebars.SafeString('data-opt-max-size=' + optPageviewMaxSize);
                            }
                        }
                        if (key === 'pvequalizer') {
                            if (data.optPvequalizerMaxSize) {
                                const optPvequalizerMaxSize = data.optPvequalizerMaxSize;
                                return new Handlebars.SafeString('data-opt-max-size=' + optPvequalizerMaxSize);
                            }
                        }
                        if (key === 'responsetimescatter') {
                            if (data.optResponsetimescatterRange) {
                                const optResponsetimescatterRange = data.optResponsetimescatterRange

                                return new Handlebars.SafeString('data-opt-responsetime-scatter-range=' + optResponsetimescatterRange)
                            }
                        }
                        if (key === 'loadingtimescatter') {
                            if (data.optLoadingtimescatterRange) {
                                const optLoadingtimescatterRange = data.optLoadingtimescatterRange

                                return new Handlebars.SafeString('data-opt-loadingtime-scatter-range=' + optLoadingtimescatterRange)
                            }
                        }
                    } catch (error) {
                        toast(trl(error.msg))
                    }
                });
            },
            handleDragAndDrop() {
                $('.gm_grid_wrap').sortable({
                    // logmeter 요소는 드래그 되지 않음
                    items: '> div:not(#logmeter)',
                    cursor: 'move',
                    opacity: 0.5,
                    connectWith: '.maxy_gm_wrap',
                    animation: 50,
                    // 드래그가 시작됐을 때 발생하는 이벤트
                    start: function (event, ui) {
                        ui.item.addClass('dragging');
                    },
                    // 드래그가 끝났을 때 발생하는 이벤트
                    stop: function (event, ui) {
                        ui.item.removeClass('dragging');
                    },
                    update: function () {
                        GM0302.func.setParams()
                    }
                });
            },
            // 툴팁 추가
            setTooltip() {
                $('.gm_grid_wrap .gm_grid').each(function () {
                    const id = $(this).attr('id')
                    const target = '#' + id + ' .ic_question'

                    tippy(target, {
                        content: trl('management.components.desc.' + id),
                        arrow: false,
                        placement: 'bottom',
                        allowHTML: true,
                        theme: 'maxy-tooltip'
                    })
                })
            },
            setParams(type) {
                const afterList = $('#componentsWrap .gm_grid').map(function () {
                    const id = $(this).attr('id');
                    let seq
                    // logmeter은 항상 첫번째에 고정
                    if (id === 'logmeter') {
                        seq = $(this).data('seq')
                    } else {
                        // 토글이 off 상태면 seq를 0으로 변경
                        const isChecked = $(this).find('input[type="checkbox"]').is(":checked")
                        seq = !isChecked ? 0 : $(this).data('seq')
                    }
                    return {name: id, seq: seq};
                }).get();

                // seq 0인건 맨뒤로 보내기 (사용 안하는 컴포넌트가 8번이고 사용하는 컴포넌트가 9번인 경우 9번이 저장이 안되는 현상을 해결하기 위한 코드
                // seq가 0이 아닌 항목과 seq가 0인 항목을 분리
                const nonZeroSeqItems = afterList.filter(item => item.seq !== 0)
                const zeroSeqItems = afterList.filter(item => item.seq === 0)

                // 두 배열을 합치고 seq가 0인 항목을 맨 뒤로 보내기
                const sortedAfterList = nonZeroSeqItems.concat(zeroSeqItems)

                const param = {};
                const keyPrefix = 'component';

                for (let i = 0; i < sortedAfterList.length; i++) {
                    // compontents1 : 1, components2: 3 , ~~ 이런 형식으로 저장됨
                    const propName = keyPrefix + (i + 1);
                    param[propName] = sortedAfterList[i].seq;
                }

                // 선택한 값이 8개 초과이면 저장하지 않음
                const positiveValues = Object.values(param).filter(value => value > 0);
                if (positiveValues.length > 8) {
                    toast(trl('management.components.msg.componentsMax'))
                    return
                }

                GM0302.v.componentList = param
                // 저장 버튼을 누른 경우만 서버 통신
                if (type) {
                    GM0302.func.saveData()
                }
            },
            openPopup() {
                const {v} = GM0302
                const i = $(this).data('key')
                v.popup[i].open(v.componentsConfigObj[i])
            },
            closePopup() {
                const {} = GM0302
                $('.dimmed').hide()
                $('.maxy_popup_common').hide()
                $('.popup_common.setting_popup').hide()
                $('.popup_common.setting_popup input').val('')
            }
        }
    }
    GM0302.init.event()
    GM0302.init.created()
</script>