/* eslint-disable */

export function initMainWrap() {
  if (typeof window === "undefined") {
    return;
  }

  if (window.DB0100 && window.DB0100.__initialized) {
    return;
  }

        const DB0100 = {
            v: {
                flag: {
                    frf: false, // first receive flag
                    draw: false // component draw
                },
                ws: {},
                components: [],
                componentsKey: new Set().add('BUSINESS_INFO'),
                logmeter: {},
                avg: {},
                base: {},
                gauge: {},
                interval: {},
                dsbRadialCounter: {},
                aibot: {}
            },
            init: {
                // 이벤트 등록
                event() {
                    sessionStorage.setItem('toggleVisible', 'null')

                    const {v, func} = DB0100

                    // 종합분석에서 다른 탭을 open 한 경우
                    if (sessionStorage.getItem('toggleVisible') === 'null') {
                        document.addEventListener("visibilitychange", func.toggleVisible)
                        sessionStorage.setItem('toggleVisible', 1)
                    }

                    // 패키지 명 select 변경 이벤트
                    $('#packageNm, #osType').on('change', () => {
                        v.packageNm = $('#packageNm').val()
                        v.serverType = $('#packageNm option:checked').data('server-type')
                        v.osType = $('#osType').val()

                        sessionStorage.setItem('appVer', "A")

                        func.changeAppInfoCallback()
                    })

                    // 페이지 떠나거나 창을 닫을 때 웹 소켓 종료
                    $(window).on('beforeunload', func.wsDisconnect)

                    $('.dsb_radial_wrap > li').on('click', func.openBiPopup)

                    // 운영 환경이 아닌 개발환경에서는 ai bot 데모 화면이 클릭 이벤트로 발생한다.
                    if (!false) {
                        $('#btnAibot').on('click', func.openAibotDemo)
                    }
                    // 운영 환경에서는 데모 화면이 아니라 메시지를 남긴다.
                    else {
                        // 클릭시 toast
                        // 다음 분석 결과는00시 00분에 제공됩니다.
                        $('#btnAibot').on('click', func.showAibotMessage)
                    }

                    // bi 그래프 애니메이션 사전 작업
                    $('.counter-unit').each(function (i, el) {
                        // canvas id, html 구조가 바뀌면 변경 필요
                        const canvasId = el.parentNode.parentNode.querySelector('canvas').id
                        const dataCntLoc = el.dataset.cntLoc

                        if (v.dsbRadialCounter[canvasId] === undefined) {
                            v.dsbRadialCounter[canvasId] = {}
                        }
                        // .counter-unit
                        v.dsbRadialCounter[canvasId][dataCntLoc] = func.counter(el)
                    })
                },
                // 화면이 켜지고 초기값 세팅하는 함수 모음
                created() {
                    window.debugTs = new Date().getTime()
                    const {v, func} = DB0100
                    updateContent()
                    // 컴포넌트 세팅
                    func.setComponents().then(() => {
                        // 대시보드에선 앱 버전 빼기로 함
                        appInfo.append({pId: 'packageNm', oId: 'osType', vId: '', targetPage: 'DB0100'}).then(() => {
                            if (!ML0100.v.sse) {
                                ML0100.func.initSSE()
                            }
                            search.load().then(() => {
                                // Bi 사용 여부 정보 조회
                                func.initBiUseInfo()
                                // 대시보드 초기화
                                func.initDashboard()

                                v.packageNm = $('#packageNm').val()
                                v.serverType = $('#packageNm option:checked').data('server-type')
                                v.osType = $('#osType').val()
                            })
                        })
                    })

                    sessionStorage.setItem('userNo', '0')

                    // basic information 툴팁추가
                    tippy('.contents_header .ic_question', {
                        content: trl('dashboard.dash-info'),
                        arrow: false,
                        placement: 'bottom',
                        allowHTML: true,
                        theme: 'maxy-tooltip',
                    })
                }
            },
            func: {
                toggleVisible() {
                    const {v, func} = DB0100
                    if (document.visibilityState === 'visible') {
                        // logmeter의 stack 쌓을지 말지 판단하는 변수
                        v.isBack = true
                        if (v.versioncomparison) {
                            v.versioncomparison.getVersionComparisonData()
                            func.startIntervalVersionComparison()
                        }

                        if (v.marketinginsight) {
                            v.marketinginsight.getMarketingInsightData()
                            func.startIntervalMarketingInsight()
                        }

                        func.initWebSocket()
                        $('#btnAibot').show()
                    } else {
                        func.wsDisconnect()
                        func.stopInterval()
                        func.initAibot()

                    }
                },
                // 컴포넌트 순서 세팅
                async setComponents() {
                    const {v, func} = DB0100
                    v.componentsConfig = JSON.parse('{"1":{"optLogmeterCrashWeight":50,"optLogmeterTime":15,"use":true,"name":"Logmeter","chartType":"DYNAMIC","optional":true,"optLogmeterLogWeight":2,"type":"ANALYSIS","optLogmeterErrorWeight":10000,"seq":1,"key":"LOGMETER","order":1},"2":{"optResponsetimescatterSize":1000,"use":true,"name":"Response Time (S)","chartType":"TIME_SERIES","optional":true,"type":"MONITOR","seq":3,"key":"RESPONSE TIME SCATTER","order":2,"optResponsetimescatterRange":1200},"3":{"optLoadingtimescatterSize":1000,"optLoadingtimescatterRange":1200,"use":true,"name":"Loading Time (S)","chartType":"TIME_SERIES","optional":true,"type":"MONITOR","seq":2,"key":"LOADING TIME SCATTER","order":3},"4":{"use":true,"name":"Favorites","chartType":"COMPARISON","optional":true,"type":"ANALYSIS","optFavoritesMaxSize":12,"seq":8,"key":"FAVORITES","order":4},"5":{"use":true,"name":"Marketing Insight","chartType":"TIME_SERIES","optional":true,"type":"MONITOR","seq":16,"key":"MARKETING INSIGHT","order":5},"6":{"use":true,"name":"Version Comparison","chartType":"COMPARISON","optional":true,"type":"ANALYSIS","seq":13,"key":"VERSION COMPARISON","order":6},"7":{"use":true,"name":"Resource Usage","chartType":"COMPARISON","optional":false,"type":"MONITOR","seq":5,"key":"RESOURCE USAGE","order":7},"8":{"use":true,"name":"Area Distribution","chartType":"COMPARISON","optional":false,"type":"MONITOR","seq":10,"key":"AREA DISTRIBUTION","order":8},"968":{"use":false,"name":"Version Conversion","chartType":"COMPARISON","optional":false,"type":"MONITOR","seq":15,"key":"VERSION CONVERSION","order":968},"969":{"use":false,"name":"Crashes by Version","chartType":"TIME_SERIES","optional":false,"type":"MONITOR","seq":14,"key":"CRASHES BY VERSION","order":969},"971":{"use":false,"name":"Response Time (L)","chartType":"TIME_SERIES","optional":false,"type":"MONITOR","seq":12,"key":"RESPONSE TIME LINE","order":971},"972":{"use":false,"name":"Loading Time (L)","chartType":"TIME_SERIES","optional":false,"type":"MONITOR","seq":11,"key":"LOADING TIME LINE","order":972},"974":{"use":false,"name":"Page View","chartType":"COMPARISON","optional":true,"type":"ANALYSIS","seq":9,"key":"PAGE VIEW","optPageviewMaxSize":20,"order":974},"976":{"use":false,"name":"Accessibility","chartType":"TIME_SERIES","optional":false,"type":"ANALYSIS","seq":7,"key":"ACCESSIBILITY","order":976},"977":{"use":false,"name":"Device Distribution","chartType":"COMPARISON","optional":false,"type":"ANALYSIS","seq":6,"key":"DEVICE DISTRIBUTION","order":977},"979":{"optPvequalizerMaxSize":30,"use":false,"name":"PV Equalizer","chartType":"DYNAMIC","optional":true,"type":"ANALYSIS","seq":4,"key":"PV EQUALIZER","order":979}}')

                    let i = 0
                    for (let x in v.componentsConfig) {
                        const config = v.componentsConfig[x]
                        let {key, name, desc, use} = config
                        if (!use) {
                            continue
                        }
                        key = key.toUpperCase().replace(/\s/g, '_')

                        let target = 'bottom'
                        if (i < 4) {
                            target = 'top'
                        }
                        const $target = $('.dash_' + target)
                        const id = 'maxyComponent__' + key
                        $target.append($('<div>', {
                            id,
                            'class': 'maxy_box'
                        }))

                        v.components.push({
                            id,
                            key,
                            'comment': desc,
                            'title': name,
                            'name': key.toLowerCase().replace(/_/g, '')
                        })
                        func.optionMapper(key, config, v)
                        i++
                    }
                },
                optionMapper(type, source, target) {
                    switch (type) {
                        case 'LOGMETER': {
                            target.optLogmeterTime = source.optLogmeterTime
                            target.optLogmeterLogWeight = source.optLogmeterLogWeight
                            target.optLogmeterErrorWeight = source.optLogmeterErrorWeight
                            target.optLogmeterCrashWeight = source.optLogmeterCrashWeight
                            break
                        }
                        case 'FAVORITES': {
                            target.name = type
                            target.optFavoritesMaxSize = source.optFavoritesMaxSize
                            return target
                        }
                        case 'PAGE_VIEW': {
                            target.name = type
                            target.optPageviewMaxSize = source.optPageviewMaxSize
                            return target
                        }
                        case 'PV_EQUALIZER': {
                            target.name = type
                            target.optPvequalizerMaxSize = source.optPvequalizerMaxSize
                            return target
                        }
                        case 'RESPONSE_TIME_SCATTER': {
                            target.name = type
                            target.optResponsetimescatterSize = source.optResponsetimescatterSize
                            target.optResponsetimescatterRange = source.optResponsetimescatterRange
                            return target
                        }
                        case 'LOADING_TIME_SCATTER': {
                            target.name = type
                            target.optLoadingtimescatterSize = source.optLoadingtimescatterSize
                            target.optLoadingtimescatterRange = source.optLoadingtimescatterRange
                            return target
                        }
                        case 'DEVICE_DISTRIBUTION': {
                            target.name = type
                            return target
                        }
                    }
                },
                changeAppInfoCallback() {
                    // 바뀐 os type으로 세션에 저장해준다 (다른 화면에선 os type 저장 로직이 필요 없어서 여기에만 따로 추가함)
                    sessionStorage.setItem('osType', $('#osType').val())
                    location.reload(true)
                },
                setAibotInfo(data) {
                    const {v} = DB0100
                    try {
                        const {type} = data
                        if (!type) {
                            return
                        }
                        const {aibot} = v
                        for (let i = 1; i <= 10; i++) {
                            aibot['roundTime' + i] = data['roundTime' + i]
                        }

                        $('#maxyAibotWrap').fadeIn(500)
                    } catch (e) {
                        console.log(e)
                    }

                },
                // BI 사용여부 정보 세팅
                async initBiUseInfo() {
                    const {func} = DB0100
                    const param = {
                        packageNm: $('#packageNm').val(),
                        serverType: $('#packageNm option:checked').data('server-type')
                    }
                    ajaxCall('/db/0100/getDashboardInfo.maxy', param).then(data => {
                        func.setBiUseInfoData(data)
                        if (data.aibot) {
                            func.setAibotInfo(data.aibot)
                        }
                    }).catch(error => {
                        toast(trl(error.msg), false, 2000)
                    })
                },
                // 대시보드 초기화
                async initDashboard() {
                    const {v, func} = DB0100

                    // bi data 모두 초기화 끝나면
                    func.resetData()
                    // 초기 데이터로 차트 그려주고
                    func.drawBiInfoChart()
                    // 컴포넌트 생성이 끝나면 웹소켓 연결
                    func.createComponents().then(() => {
                        if (v.versioncomparison) {
                            v.versioncomparison.getVersionComparisonData()
                            func.startIntervalVersionComparison()
                        }

                        if (v.marketinginsight) {
                            v.marketinginsight.getMarketingInsightData()
                            func.startIntervalMarketingInsight()
                        }

                        func.initWebSocket()
                    })
                },
                // 더미데이터 세팅
                resetData() {
                    const {v} = DB0100
                    v.base = {
                        gauge: {
                            'appInstallCount': {num: -1, text: '-'},
                            'appDeleteCount': {num: -1, text: '-'},
                            'appIosConnectCount': {num: -1, text: '-'},
                            'appAndroidConnectCount': {num: -1, text: '-'},
                            'appUseCount': {num: -1, text: '-'},
                            'appReconnectCount': {num: -1, text: '-'},
                            'appConnectCount': {num: -1, text: '-'},
                            'appCcuCount': {num: -1, text: '-'},
                            'appSleepUserCount': {num: -1, text: '-'},
                            'appLoginUserCount': {num: -1, text: '-'},
                            'appAvgUseTime': {num: -1, text: '-'},
                            'appLogCount': {num: -1, text: '-'},
                            'appErrorCount': {num: -1, text: '-'},
                            'appCrashCount': {num: -1, text: '-'},
                            'appMauCount': {num: -1, text: '-'},
                        }
                    }
                    v.gauge = {}
                },
                // 상단 BI 게이지 차트 그리기
                drawBiInfoChart() {
                    const {v, func} = DB0100
                    // resetData() 이후에 작동되어야 함
                    const data = v.base.gauge
                    // 그래프 그리기
                    const dataKeys = Object.keys(data)
                    for (let i = 0; i < dataKeys.length; i++) {
                        func.drawArc(dataKeys[i], data[dataKeys[i]])
                    }

                    //다크모드 변환시 그래프 새로 그리기 이벤트 추가
                    $('.day_night_btn').on('click', function () {
                        for (let i = 0; i < dataKeys.length; i++) {
                            func.drawArc(dataKeys[i], data[dataKeys[i]])
                        }
                    })
                },
                openBiPopup() {
                    if (!$(this).hasClass('open')) {
                        return
                    }

                    const {v, func} = DB0100
                    const id = $(this).find('canvas').attr('id')
                    let title, type, summaryTitle, allTitle

                    const dataTypeAll = "all"
                    const dataTypeSeries0 = "series0"
                    const dataTypeSeries1 = "series1"

                    const dataTypeRate = "rate"

                    const dataTypeAvg = "avg";
                    const dataTypeAvgSeries0 = "avgSeries0"
                    const dataTypeAvgSeries1 = "avgSeries1"

                    const dataTypePvPerPerson = "pvPerPerson"

                    const summaryTitleCcu = "CCU"
                    const summaryTitlePcuIos = "iosPcu"
                    const summaryTitlePcuAndroid = "androidPcu"
                    const dataTypeDate = "date"

                    const dataTypeNoLogin = "noLogin"
                    const dataTypeAppAvgAllUser = "appAvgAllUser"

                    const dataTypeSum = 'sum'
                    const dataTypeAvgSum = 'avgSum'
                    const dataTypeSeries0Sum = 'series0Sum'
                    const dataTypeSeries1Sum = 'series1Sum'
                    const dataTypeSeries0Avg = 'series0Avg'
                    const dataTypeSeries1Avg = 'series1Avg'

                    switch (id) {
                        // 설치
                        case 'appInstallCount' :
                            title = 'dashboard.bi.install'
                            type = 4
                            allTitle = [
                                {"title": "dashboard.bi.installSum", "type": dataTypeSum},
                                {"title": "common.text.avg", "type": dataTypeAvgSum},
                                {"title": "iOS", "type": dataTypeSeries0Sum},
                                {"title": "Android", "type": dataTypeSeries1Sum}
                            ]
                            summaryTitle = [
                                {"title": "dashboard.bi.datetime", "type": dataTypeDate},
                                {"title": "dashboard.bi.installCount", "type": dataTypeAll},
                                {"title": "iOS", "type": dataTypeSeries0},
                                {"title": "Android", "type": dataTypeSeries1}
                            ]
                            break
                        case 'appIosConnectCount' :
                            title = 'OS (iOS)'
                            type = 3
                            allTitle = [
                                {"title": "dashboard.bi.all", "type": dataTypeSum},
                                {"title": "iOS", "type": dataTypeSeries0Sum}
                            ]
                            summaryTitle = [
                                {"title": "dashboard.bi.datetime", "type": dataTypeDate},
                                {"title": "dashboard.bi.all", "type": dataTypeAll},
                                {"title": "iOS", "type": dataTypeSeries0}
                            ]
                            break
                        case 'appAndroidConnectCount' :
                            title = 'OS (Android)'
                            type = 3
                            allTitle = [
                                {"title": "dashboard.bi.all", "type": dataTypeSum},
                                {"title": "Android", "type": dataTypeSeries0Sum}
                            ]
                            summaryTitle = [
                                {"title": "dashboard.bi.datetime", "type": dataTypeDate},
                                {"title": "dashboard.bi.all", "type": dataTypeAll},
                                {"title": "Android", "type": dataTypeSeries1}
                            ]
                            break
                        case 'appMauCount' :
                            title = 'dashboard.bi.mauFull'
                            type = 4
                            allTitle = [
                                {"title": "dashboard.bi.all", "type": dataTypeSum},
                                {"title": "iOS", "type": dataTypeSeries0Sum},
                                {"title": "dashboard.bi.iosDailyAvg", "type": dataTypeSeries0Avg},
                                {"title": "Android", "type": dataTypeSeries1Sum},
                                {"title": "dashboard.bi.androidDailyAvg", "type": dataTypeSeries1Avg},
                            ]
                            summaryTitle = [
                                {"title": "dashboard.bi.datetime", "type": dataTypeDate},
                                {"title": "dashboard.bi.all", "type": dataTypeAll},
                                {"title": "iOS", "type": dataTypeSeries0},
                                {"title": "Android", "type": dataTypeSeries1}
                            ]
                            break
                        case 'appConnectCount' :
                            title = 'dashboard.bi.dauFull'
                            type = 4
                            allTitle = [
                                {"title": "dashboard.bi.all", "type": dataTypeSum},
                                {"title": "iOS", "type": dataTypeSeries0Sum},
                                {"title": "dashboard.bi.iosDailyAvg", "type": dataTypeSeries0Avg},
                                {"title": "Android", "type": dataTypeSeries1Sum},
                                {"title": "dashboard.bi.androidDailyAvg", "type": dataTypeSeries1Avg},
                            ]
                            summaryTitle = [
                                {"title": "dashboard.bi.datetime", "type": dataTypeDate},
                                {"title": "dashboard.bi.all", "type": dataTypeAll},
                                {"title": "iOS", "type": dataTypeSeries0},
                                {"title": "Android", "type": dataTypeSeries1}
                            ]
                            break
                        case 'appCcuCount' :
                            title = 'dashboard.bi.ccuFull'
                            type = 6
                            summaryTitle = [
                                {"title": "dashboard.bi.datetime", "type": dataTypeDate},
                                {"title": "dashboard.bi.ccutext", "type": summaryTitleCcu},
                                {"title": "iOS", "type": dataTypeSeries0},
                                {"title": "Android", "type": dataTypeSeries1},
                                {"title": "dashboard.bi.pcuios", "type": summaryTitlePcuIos},
                                {"title": "dashboard.bi.pcuAndroid", "type": summaryTitlePcuAndroid}
                            ]
                            break
                        case 'appUseCount' :
                            title = 'dashboard.bi.pageview'
                            type = 4
                            allTitle = [
                                {"title": "dashboard.bi.pvSum", "type": dataTypeSum},
                                {"title": "dashboard.bi.dailyAvg", "type": dataTypeAvgSeries0},
                                {"title": "dashboard.bi.viewerSum", "type": dataTypeSeries1Sum},
                                {"title": "dashboard.bi.pvPer", "type": dataTypeSeries0Avg},
                            ]
                            summaryTitle = [
                                {"title": "dashboard.bi.datetime", "type": dataTypeDate},
                                {"title": "PV", "type": dataTypeSeries0},
                                {"title": "Viewer", "type": dataTypeSeries1},
                                {"title": "dashboard.bi.pvPer", "type": dataTypePvPerPerson}
                            ]
                            break
                        case 'appReconnectCount' :
                            title = 'dashboard.bi.returnVisit'
                            type = 4
                            allTitle = [
                                {"title": "dashboard.bi.alluser", "type": dataTypeSum},
                                {"title": "dashboard.bi.dailyAvg", "type": dataTypeAvgSeries1},
                                {"title": "dashboard.bi.reconnect", "type": dataTypeSeries1Sum},
                                {"title": "dashboard.bi.revisitRate", "type": dataTypeSeries0Avg}
                            ]
                            summaryTitle = [
                                {"title": "dashboard.bi.datetime", "type": dataTypeDate},
                                {"title": "dashboard.bi.appConnectCount", "type": dataTypeSeries0},
                                {"title": "dashboard.bi.reconnect", "type": dataTypeSeries1},
                                {"title": "dashboard.bi.revisitRate", "type": dataTypeRate}
                            ]
                            break
                        case 'appSleepUserCount' :
                            title = 'dashboard.bi.sleep'
                            type = 4
                            allTitle = [
                                {"title": "dashboard.bi.alluser", "type": dataTypeSum},
                                {"title": "dashboard.bi.dailyAvg", "type": dataTypeAvgSeries1},
                                {"title": "dashboard.bi.sleep", "type": dataTypeSeries1Sum},
                                {"title": "dashboard.bi.sleepRate", "type": dataTypeSeries0Avg}
                            ]
                            summaryTitle = [
                                {"title": "dashboard.bi.datetime", "type": dataTypeDate},
                                {"title": "dashboard.bi.appConnectCount", "type": dataTypeSeries0},
                                {"title": "dashboard.bi.sleep", "type": dataTypeSeries1},
                                {"title": "dashboard.bi.sleepRate", "type": dataTypeRate}
                            ]
                            break
                        case 'appLoginUserCount' :
                            title = 'dashboard.bi.login'
                            type = 5
                            allTitle = [
                                {"title": "dashboard.bi.alluser", "type": dataTypeSum},
                                {"title": "dashboard.bi.dailyAvg", "type": dataTypeSeries1Avg},
                                {"title": "dashboard.bi.login", "type": dataTypeSeries1Sum},
                                {"title": "dashboard.bi.loginRate", "type": dataTypeSeries0Avg}
                            ]
                            summaryTitle = [
                                {"title": "dashboard.bi.datetime", "type": dataTypeDate},
                                {"title": "dashboard.bi.appConnectCount", "type": dataTypeSeries0},
                                {"title": "dashboard.bi.login", "type": dataTypeSeries1},
                                {"title": "dashboard.bi.loginRate", "type": dataTypeRate},
                                {"title": "dashboard.bi.noLogin", "type": dataTypeNoLogin},
                            ]
                            break
                        case 'appAvgUseTime' :
                            title = 'dashboard.bi.staytime'
                            type = 3
                            allTitle = [
                                {"title": "dashboard.bi.alluser", "type": dataTypeSum},
                                {"title": "dashboard.bi.dailyAvg", "type": dataTypeSeries1Avg},
                                {"title": "common.text.stay", "type": dataTypeSeries1Sum}
                            ]
                            summaryTitle = [
                                {"title": "dashboard.bi.datetime", "type": dataTypeDate},
                                {"title": "dashboard.bi.appConnectCount", "type": dataTypeAppAvgAllUser},
                                {"title": "dashboard.bi.staytime", "type": dataTypeSeries0},
                            ]
                            break
                        case 'appLogCount' :
                            title = 'dashboard.bi.log'
                            type = 2
                            allTitle = [
                                {"title": "dashboard.bi.logCollection", "type": dataTypeSum},
                                {"title": "dashboard.bi.dailyAvg", "type": dataTypeSeries0Avg}
                            ]
                            summaryTitle = [
                                {"title": "dashboard.bi.datetime", "type": dataTypeDate},
                                {"title": "dashboard.bi.logCollection", "type": dataTypeSeries0}
                            ]
                            break
                        case 'appErrorCount' :
                            title = 'dashboard.bi.error'
                            break
                        case 'appCrashCount' :
                            title = 'dashboard.bi.crash'
                            break
                    }

                    let funcName
                    if (id === 'appLogCount'
                        || id === 'appErrorCount'
                        || id === 'appCrashCount') {
                        funcName = func.getLogTrendInfo
                    } else {
                        funcName = func.getBiDetailInfo
                    }

                    if (id === 'appErrorCount' || id === 'appCrashCount') {
                        v.logAnalysisDetail = new MaxyPopupLogAnalysis({
                            id: id,
                            title: title,
                            appendId: 'maxyPopupWrap',
                            func: funcName
                        })
                    } else if (id === 'appCcuCount') {
                        v.ccuDetail = new MaxyPopupCcuDetail({
                            id: id,
                            title: title,
                            summaryTitle: summaryTitle,
                            type: type,
                            appendId: 'maxyPopupWrap',
                            func: funcName
                        })
                    } else {
                        v.biDetail = new MaxyPopupBiAnalysis({
                            id: id,
                            title: title,
                            summaryTitle: summaryTitle,
                            type: type,
                            allTitle: allTitle,
                            appendId: 'maxyBiPopupWrap',
                            func: funcName
                        })
                    }

                    if (id !== 'appErrorCount'
                        && id !== 'appCrashCount'
                        && id !== 'appCcuCount') {
                        v.biDetail.init().then(() => {
                            if (id === 'appLogCount') {
                                func.getLogTrendInfo(id)
                            } else {
                                func.getBiDetailInfo(id)
                            }
                        })
                    } else if (id !== 'appCcuCount') {
                        v.logAnalysisDetail.init().then(() => {
                            func.getLogTrendInfo(id)
                        })
                    } else {
                        v.ccuDetail.init().then(() => {
                            func.getBiDetailInfo(id)
                        })
                    }
                },
                async getBiDetailInfo(key, date) {
                    const {v} = DB0100

                    const param = {
                        packageNm: $('#packageNm').val(),
                        serverType: $('#packageNm option:checked').data('server-type'),
                        osType: $('#osType').val()
                    }

                    if (key === 'appCcuCount') {
                        param.type = key
                    }
                    // bi popup 캘린더에서 날짜를 변경하지 않은 경우 date가 없음
                    if (!date && key !== 'appMauCount' && key !== 'appCcuCount') {
                        // default 시간은 일주일 전 ~ 하루 전
                        param.from = util.dateToTimestamp(util.getDate(-7), true)
                        param.to = util.dateToTimestamp(util.getDate(-1), false)
                    } else if (key === 'appMauCount') {
                        param.from = util.dateToTimestamp(util.getDate(-365), true)
                        param.to = util.dateToTimestamp(util.getDate(-1), false)
                    } else if (!date && key === 'appCcuCount') {
                        param.from = util.dateToTimestamp(util.getDate(0), true)
                        param.to = new Date().getTime()
                    } else if (date) {
                        param.from = date.from
                        param.to = date.to
                    }

                    await ajaxCall('/db/0100/getBiDetail.maxy', param, {disableCursor: true}).then(data => {
                        if (!data || data.length <= 0) {
                            return
                        }

                        // ccu 차트인 경우
                        if (key === 'appCcuCount') {
                            try {
                                v.ccuDetail.data = data
                                v.ccuDetail.drawChart()
                            } catch (e) {
                                console.log(e)
                            }
                        } else {
                            const biDetailArray = Object.entries(data)
                            v.biDetail.getDataByType(key, biDetailArray)
                        }

                    }).catch((e) => {
                        console.log(e)
                    })
                },
                async getLogTrendInfo(key, date, type) {
                    const {v} = DB0100

                    let logTrendType
                    if (typeof key === 'string') {
                        if (key === 'appLogCount') {
                            logTrendType = 'LOG'
                        } else if (key === 'appErrorCount') {
                            logTrendType = 'ERROR'
                        } else if (key === 'appCrashCount') {
                            logTrendType = 'CRASH'
                        }
                    }

                    const param = {
                        packageNm: $('#packageNm').val(),
                        serverType: $('#packageNm option:checked').data('server-type'),
                        osType: $('#osType').val(),
                        logTrendType: logTrendType
                    }

                    if (type) {
                        param.type = type
                    }

                    // bi popup 캘린더에서 날짜를 변경하지 않은 경우 date가 없음
                    if (!date || Object.keys(date).length === 0) {
                        // default 시간은 일주일 전 ~ 하루 전
                        param.from = util.dateToTimestamp(util.getDate(-7), true)
                        param.to = util.dateToTimestamp(util.getDate(-1), false)
                    } else {
                        param.from = date.from
                        param.to = date.to
                    }

                    await ajaxCall('/db/0100/getLogTrendInfo.maxy', param).then(data => {
                        const {chartList, info} = data

                        let listData = []

                        let logSum = 0
                        let logAvg = 0

                        let result
                        if (chartList && chartList.length > 0) {
                            result = chartList.map(item => [item.key, item.value])
                            const keys = chartList.map(item => item.key)

                            // 기간
                            let period = keys.length
                            for (let i = 0; i < chartList.length; i++) {
                                if (logTrendType === 'LOG') {
                                    // 로그 총 합
                                    logSum += chartList[i].value
                                    // 로그 총 합을 기간으로 나눈 값 (평균)
                                    logAvg = Math.floor(logSum / period)
                                }
                            }
                        }

                        if (param.type && info && info.length > 0) {
                            listData = info
                        }

                        if (logTrendType === 'LOG') {
                            for (let i = 0; i < v.biDetail.summaryTitle.length; i++) {
                                const type = v.biDetail.summaryTitle[i].type
                                let val

                                if (type === 'all') {
                                    val = util.comma(logSum)
                                } else if (type === 'avg') {
                                    val = util.comma(logAvg)
                                }
                                $("[data-bitype='" + type + "']").text(val)
                            }

                            $("[data-bitype='sum']").text(util.comma(logSum))
                            $("[data-bitype='series0Avg']").text(util.comma(logAvg))
                        }

                        // LOG인 경우 기존 bi detail 팝업과 동일
                        if (logTrendType === 'LOG') {
                            v.biDetail.data = result
                            v.biDetail.keys = ['appLogCount']
                            v.biDetail.drawChart(key, result)
                        } else {
                            // Error, Crash인 경우 팝업이 다름
                            v.logAnalysisDetail.data = result
                            v.logAnalysisDetail.keys = [key]

                            // Error, Crash 데이터 계산 및 표시 추가
                            let dataSum = 0
                            let dataAvg = 0

                            if (chartList && chartList.length > 0) {
                                // 기간
                                let period = chartList.length
                                for (let i = 0; i < chartList.length; i++) {
                                    // 총 합
                                    dataSum += chartList[i].value
                                }
                                // 평균 계산
                                dataAvg = Math.floor(dataSum / period)
                            }

                            if (!param.type) {
                                $("[data-bitype='sum']").text(util.comma(dataSum))
                                $("[data-bitype='avg']").text(util.comma(dataAvg))
                            }

                            // 맨 처음 팝업 열 때는 chart만 그림
                            if (!param.type) {
                                v.logAnalysisDetail.drawChart(key, result)
                                // 맨 처음에 팝업 열고 highchart에 setData 되면 맨 마지막 series를 강제 클릭시켜서 해당 날짜의 list만 받아와서 넣어줌
                            } else {
                                v.logAnalysisDetail.drawTable(listData)
                            }
                        }

                    }).catch((e) => {
                        console.log(e)
                    })
                },
                // BiInfo 차트 그리기
                drawArc(key, data) {
                    const {func, v} = DB0100

                    // 다크모드 체크
                    const isDark = $("body").hasClass("dark_mode")
                    let el = key
                    let {num, value, text} = data

                    const canvas = document.getElementById(el)
                    const $el = $('#' + el)
                    if (!canvas) {
                        return
                    }
                    canvas.width = 100
                    canvas.height = 100
                    const ctx = canvas.getContext('2d')
                    const radian = Math.PI / 180

                    // ctx 초기화 (지우기)
                    ctx.clearRect(0, 0, canvas.width, canvas.height)

                    // 밑 바탕 그리기
                    ctx.beginPath()
                    ctx.arc(50, 50, 40, radian * 135, radian * 45, false)

                    if (isDark) {
                        ctx.strokeStyle = '#313233'
                    } else {
                        ctx.strokeStyle = '#ECEEF2'
                    }
                    ctx.lineWidth = 8
                    ctx.lineCap = 'round'
                    ctx.stroke()
                    ctx.closePath()

                    // @@bi 애니메이션 적용@@
                    if (typeof text === 'undefined') text = '-'
                    // 기존에 있던 값, (각 bi그래프에서 div.counter의 data-cnt-values 값)
                    const orgValue = $el.siblings('.counter')[0].getAttribute('data-cnt-values')

                    // bi 비활성화 등으로 undefined값이 계속 들어오면 애니메이션 없이 '-'
                    // orgValue 값도 비교해줘야 제일 처음 들어온 ws인지 구분할 수 있음, 제일 처음일때는 빈칸으로(디자인이 깔끔해보임)
                    if (text === '-' && orgValue === '-') {
                        // data-cnt-js="prev", data-cnt-js="current", data-cnt-js="next"의 값을 모두 -로 만들기
                        $el.siblings('.counter').find('[data-cnt-loc="0"]').children().each(function () {
                            $(this).text('-')
                        })

                        // 기존값과 다른 값이 들어와서 애니메이션을 줘야할때, 자료형이 섞여있어서 !=로
                    } else if (text !== '-' && orgValue != text) {
                        text = text.toString()
                        let textArr, css
                        // 문자열을 하나씩 잘라서 array로 변환, ms값은 하나의 단어로 묶어줌
                        if (text.indexOf('ms') > -1) {
                            textArr = Array.from(text.split('ms')[0])
                            textArr.push('ms')
                        } else {
                            textArr = Array.from(text)
                        }

                        const $counter = $el.siblings('.counter')
                        // true면 count-unit show/hide 변경 필요, 변경될 글자의 수 != show인 .counter-unit의 개수
                        const changeDisplay = (textArr.length !== $counter.children('.counter-unit:not(:hidden)').length)

                        // 기존값이 - 에서 다른값으로 바뀔땐 애니메이션 없음
                        if (orgValue === '-') {
                        } else if (el === 'appAvgUseTime') {
                            // 시간 비교
                            if (util.reConvertTime(orgValue) > util.reConvertTime(text) || util.reConvertTime(text) === 0) {
                                css = 'is-changing-down'
                            } else {
                                css = 'is-changing-up'
                            }
                        } else {
                            // 숫자 비교
                            if (util.reconvertNum(orgValue) > util.reconvertNum(text) || util.reconvertNum(text) === 0) {
                                css = 'is-changing-down'
                            } else {
                                css = 'is-changing-up'
                            }
                        }

                        $counter.children('.counter-unit').each(function (i, eachEl) {
                            // 자리수 증가나 감소가 있다면 .counter-unit을 show 또는 hide하며 애니메이션
                            if (changeDisplay) {
                                if (textArr.length - 1 < i) {
                                    eachEl.style.display = 'none'
                                } else {
                                    eachEl.style.display = 'block'
                                    v.dsbRadialCounter[el][i].update(textArr[i], css)
                                }
                            } else {
                                // 자리수 변경이 없다면 동일 자리의 숫자값이 변경됐는지 확인하고 애니메이션
                                if (textArr[i] !== $counter.children('.counter-unit')[i].getAttribute('data-cnt-value')) {
                                    v.dsbRadialCounter[el][i].update(textArr[i], css)
                                }
                            }
                        })
                    }

                    // 변경된 값 data-cnt-values에 저장
                    $el.siblings('.counter')[0].setAttribute('data-cnt-values', text)

                    // 값이 정상 범위 내에 있는 경우만 그림
                    if (num >= 0 && num <= 100) {
                        // p 상위의 li 에 disabled 클래스 삭제
                        $el.parent().removeClass('disabled')
                        $el.parent().addClass('open')

                        let pct = num  // 0 - 100
                        let deg = 135 // 0퍼센트 라디안

                        // ios, android 는 그래프 내 점 그리지 않음
                        if (key !== 'appIosConnectCount'
                            && key !== 'appAndroidConnectCount'
                            && key !== 'appCcuCount') {
                            //그래프의 점 그리기
                            //라디안 계산
                            if (!(pct >= 0)) {
                                pct = 0
                            }
                            if (pct !== 0) {
                                deg = deg + (pct * 2.7)
                                if (deg > 359) {
                                    deg = deg - 360
                                }
                            }
                            ctx.beginPath()
                            // 0퍼센트(135,135), 50퍼센트(270,270), 100퍼센트(45,45)
                            ctx.arc(50, 50, 40, radian * deg, radian * (deg + 1), false)
                            if (isDark) {
                                ctx.strokeStyle = '#6560FF' // dark mode
                            } else {
                                ctx.strokeStyle = '#7277FF'
                            }
                            ctx.lineWidth = 14
                            ctx.lineCap = 'round'
                            ctx.stroke()
                            ctx.closePath()
                        }

                        func.addTooltip(canvas, pct, value, key)

                    } else {
                        // 정상 범위 밖의 값인 경우 disabled 클래스 추가
                        $el.parent().removeClass('open')
                        $el.parent().addClass('disabled')
                    }
                },
                counter(el) {
                    // .is-changing-up, .is-changing-down으로
                    // current를 prev 또는 next 요소와 자리를 바꾸는 애니메이션으로 숫자 증감을 표현
                    let current = el.querySelector('[data-cnt-js="current"]'),
                        prev = el.querySelector('[data-cnt-js="prev"]'),
                        next = el.querySelector('[data-cnt-js="next"]'),
                        timeout;

                    function update(value, css) {
                        if (typeof value === 'undefined') value = ''

                        // .data-cnt-loc의 data-cnt-value값 변경, (낱개 자리수끼리 값 변경 여부에 따라 애니메이션)
                        el.dataset.cntValue = value

                        // 처음 시작시 자연스러운 모션을 위해..
                        if (prev.innerHTML === '' && next.innerHTML === '') {
                            current.innerHTML = value
                        }
                        prev.innerHTML = value
                        next.innerHTML = value

                        // ms 값은 작은 text로
                        if (value === 'ms') {
                            prev.classList.add('sm-text')
                            next.classList.add('sm-text')
                        } else {
                            prev.classList.remove('sm-text')
                            next.classList.remove('sm-text')
                        }

                        // 애니메이션 주기
                        el.classList.add(css)

                        window.clearTimeout(timeout)
                        timeout = window.setTimeout(function () {
                            current.innerHTML = next.innerHTML
                            // ms 값은 작은 text로
                            if (value === 'ms') current.classList.add('sm-text')
                            else current.classList.remove('sm-text')

                            el.classList.remove(css)
                        }, 210) // 애니메이션 속도
                    }

                    return {
                        update: update
                    };
                },
                addTooltip(target, pct, value, key) {
                    const {v} = DB0100

                    let valueUnit = ''

                    /* 툴팁 문구
                    *   설치: 건수: 40 / 전일 대비: 15%
                    *   OS: 건수: 22,512/ 비율: 80%
                    *   MAU: 건수: 22,172/ 전일 대비: 80%
                    *   DAU: 건수: 28,121/ 전일 대비: 55%
                    *   PV: 건수: 596,811/ 전일 대비: 55%
                    *   재방문: 건수: 2,614/ 전일 대비: 100%
                    *   휴면: 건수: 707/ 전일 대비: 100%
                    *   로그인: 건수: 17,000/ 전일 대비: 58%
                    *   체류시간: 체류 시간: 3m/ 전일 대비: 100%
                    *   로그: 건수: 17,000/ 전일 대비: 100%
                    * */

                    // 기본 텍스트는 '건수'
                    let valueText = trl('dashboard.bi.val') + ': '
                    // 체류시간인 경우만 건수 -> 체류 시간 문구 사용
                    if (key === 'appAvgUseTime') {
                        valueText = trl('dashboard.bi.stayTime') + ': '
                    }

                    // 기본 텍스트는 '전일 대비'
                    let pctText = trl('dashboard.bi.pct') + ': '
                    // OS 점유율 인 경우만 전일 대비 -> 비율 문구 사용
                    // MAU인 경우 전일 대비 -> 전월 대비
                    if (key === 'appIosConnectCount'
                        || key === 'appAndroidConnectCount') {
                        pctText = trl('dashboard.bi.rate') + ': '
                    } else if (key === 'appMauCount') {
                        pctText = trl('dashboard.bi.previousMonth') + ': '
                    }

                    // 기본 값은 comma만 적용, 체류시간인 경우 시간 변환 함수 사용
                    let formattedValue = util.comma(value)
                    if (key === 'appAvgUseTime') {
                        formattedValue = util.convertTime(value, false, false, false)
                    }
                    const valText = !isNaN(value) ? valueText + '<b>' + formattedValue + '</b>' : ''
                    const tooltip = target.id + 'Tooltip'

                    let content
                    if (key !== 'appCcuCount') {
                        content = valText + '<br>' + pctText + '<b>' + pct + '%</b>'
                    } else {
                        content = valText
                    }

                    if (v[tooltip]) {
                        v[tooltip].setContent(content)
                    } else {
                        v[tooltip] = tippy(target.parentNode, {
                            content: content,
                            arrow: false,
                            placement: 'bottom',
                            allowHTML: true,
                            theme: 'maxy-tooltip',
                            followCursor: true
                        })
                    }
                },
                // 어제자 BiInfo 데이터 세팅
                setBiInfoBaseData(param) {
                    const {v} = DB0100
                    v.gauge = param
                },
                setPageViewData(data) {
                    const {v} = DB0100
                    if (v.pageview) {
                        v.pageview.setData(data)
                    }
                },
                setPageViewEqualizerData(data) {
                    const {v} = DB0100
                    if (v.pvequalizer) {
                        const shuffledData = [...data].sort(() => Math.random() - 0.5)
                        v.pvequalizer.draw(shuffledData)
                    }
                },
                setAccessibilityData(data) {
                    const {v} = DB0100
                    if (v.accessibility) {
                        v.accessibility.setData(data)
                    }
                },
                async setResourceUsage(data) {
                    const {v} = DB0100
                    if (v.resourceusage) {
                        v.resourceusage.draw(data)
                    }
                },
                setIntervalTimeScatter(data, type) {
                    const {v} = DB0100
                    if (type === 'loading') {
                        if (!v.loadingTimeScatter
                            || v.loadingTimeScatter[0]?.pageEndTm !== data[0].pageEndTm) {
                            // data 임시 저장
                            v.loadingTimeScatter = data
                            v.loadingtimescatter.setData(data)
                        }
                    } else if (type === 'response') {
                        if (!v.responseTimeScatter
                            || v.responseTimeScatter[0]?.logTm !== data[0].logTm) {
                            // data 임시 저장
                            v.responseTimeScatter = data;
                            v.responsetimescatter.setData(data)
                        }
                    }
                },
                setFavoritesData(param) {
                    const {v} = DB0100

                    if (!param || param.length === 0) {
                        let $pageAnalysisWrap = $('#maxyComponent__FAVORITES__chart')
                        $('.btn_favorites_all').hide()
                        $pageAnalysisWrap.addClass('no_data')
                        return
                    }

                    const paramData = []
                    for (const x of param) {
                        const {
                            count,
                            intervaltime,
                            loadingTime,
                            responseTime,
                            errorCount,
                            crashCount,
                            logType,
                            reqUrl
                        } = x

                        const tmp = {
                            reqUrl: reqUrl,
                            count,
                            logType: logType ? logType : '',
                            contents: [
                                {
                                    key: 'common.text.loadingTime',
                                    value: util.convertTime(Math.floor(loadingTime))
                                }, {
                                    key: 'common.text.responseTime',
                                    value: util.convertTime(Math.floor(responseTime))
                                }, {
                                    key: 'common.text.stayTime',
                                    value: util.convertTime(Math.floor(intervaltime))
                                }, {
                                    key: 'Error',
                                    value: errorCount,
                                    type: 'error'
                                }, {
                                    key: 'Crash',
                                    value: crashCount,
                                    type: 'crash'
                                }
                            ]
                        }

                        paramData.push(tmp)
                    }

                    if (v.favorites) {
                        v.favorites.draw(paramData)
                    }
                },
                setUseInfoByLocation(data) {
                    const {v, func} = DB0100

                    if (v.areadistribution) {
                        const $areaOption = $('#areaOption');
                        const hasData = Object.values(data).length > 0;

                        hasData ? $areaOption.show() : $areaOption.hide();

                        if (hasData && (!v.areaDistribution || func.compareAreaValues(Object.values(v.areaDistribution), Object.values(data)).length > 0)) {
                            v.areaDistribution = data;
                            v.areadistribution.setData(data)
                        }
                    }
                },
                setCrashesByVersion(data) {
                    const {v} = DB0100
                    if (v.crashesbyversion) {
                        v.crashesbyversion.setData(data)
                    }
                },
                setVersionConversion(data) {
                    const {v} = DB0100
                    if (v.versionconversion) {
                        v.versionconversion.setData(data)
                    }
                },
                // BiInfo 사용 여부 세팅
                async setBiUseInfoData(param) {
                    const {v} = DB0100
                    const allKeys = Object.keys(param)
                    const result = []
                    allKeys.forEach(key => {
                        const value = param[key]
                        if (value === 'Y' || value === 'N') {
                            result.push({key, value})
                        }
                    })
                    v.biUseInfo = result
                },
                // biInfo 사용 여부의 key 와 biInfo 의 key 가 다르기 때문에 두 가지를 매핑 하는 함수
                biInfoMapper(param) {
                    const {v} = DB0100
                    const data = param
                    if (!v.biUseInfo) {
                        return data
                    }
                    v.biUseInfo.forEach(info => {
                        if (info.value === 'N') {
                            switch (info.key) {
                                case 'installUseYn':
                                    data['appInstallCount'] = -1
                                    break
                                case 'deleteUseYn':
                                    data['appDeleteCount'] = -1
                                    break
                                case 'iosuserUseYn':
                                    data['appIosConnectCount'] = -1
                                    break
                                case 'anduserUseYn':
                                    data['appAndroidConnectCount'] = -1
                                    break
                                case 'iosRateUseYn':
                                    break
                                case 'andRateUseYn':
                                    break
                                case 'userUseYn':
                                    data['appConnectCount'] = -1
                                    break
                                case 'runUseYn':
                                    data['appUseCount'] = -1
                                    break
                                case 'reconnectUseYn':
                                    data['appReconnectCount'] = -1
                                    break
                                case 'sleepUseYn':
                                    data['appSleepUserCount'] = -1
                                    break
                                case 'loginUseYn':
                                    data['appLoginUserCount'] = -1
                                    break
                                case 'intervaltimeUseYn':
                                    data['appAvgUseTime'] = -1
                                    break
                                case 'logUseYn':
                                    data['appLogCount'] = -1
                                    break
                                case 'errorUseYn':
                                    data['appErrorCount'] = -1
                                    break
                                case 'crashUseYn':
                                    data['appCrashCount'] = -1
                                    break
                                case 'mauCountUseYn':
                                    data['appMauCount'] = -1
                                    break
                                case 'ccuCountUseYn':
                                    data['appCcuCount'] = -1
                                    break
                            }
                        } else {
                            // 사용여부 Y 인데 데이터 없는 경우 0으로 처리
                            switch (info.key) {
                                case 'installUseYn':
                                    if (data['appInstallCount'] === undefined) data['appInstallCount'] = 0
                                    break
                                case 'deleteUseYn':
                                    if (data['appDeleteCount'] === undefined) data['appDeleteCount'] = 0
                                    break
                                case 'iosuserUseYn':
                                    if (data['appIosConnectCount'] === undefined) data['appIosConnectCount'] = 0
                                    break
                                case 'anduserUseYn':
                                    if (data['appAndroidConnectCount'] === undefined) data['appAndroidConnectCount'] = 0
                                    break
                                case 'iosRateUseYn':
                                    break
                                case 'andRateUseYn':
                                    break
                                case 'userUseYn':
                                    if (data['appConnectCount'] === undefined) data['appConnectCount'] = 0
                                    break
                                case 'runUseYn':
                                    if (data['appUseCount'] === undefined) data['appUseCount'] = 0
                                    break
                                case 'reconnectUseYn':
                                    if (data['appReconnectCount'] === undefined) data['appReconnectCount'] = 0
                                    break
                                case 'sleepUseYn':
                                    if (data['appSleepUserCount'] === undefined) data['appSleepUserCount'] = 0
                                    break
                                case 'loginUseYn':
                                    if (data['appLoginUserCount'] === undefined) data['appLoginUserCount'] = 0
                                    break
                                case 'intervaltimeUseYn':
                                    if (data['appAvgUseTime'] === undefined) data['appAvgUseTime'] = 0
                                    break
                                case 'logUseYn':
                                    if (data['appLogCount'] === undefined) data['appLogCount'] = 0
                                    break
                                case 'errorUseYn':
                                    if (data['appErrorCount'] === undefined) data['appErrorCount'] = 0
                                    break
                                case 'crashUseYn':
                                    if (data['appCrashCount'] === undefined) data['appCrashCount'] = 0
                                    break
                                case 'mauCountUseYn':
                                    if (data['appMauCount'] === undefined) data['appMauCount'] = 0
                                    break
                                case 'ccuCountUseYn':
                                    if (data['appCcuCount'] === undefined) data['appCcuCount'] = 0
                                    break
                            }
                        }
                    })

                    return data
                },
                // biInfo 그리기
                setBiInfoChart(param) {
                    const {v, func} = DB0100
                    const data = func.biInfoMapper(param)

                    Object.keys(data).forEach(key => {
                        const value = data[key]
                        const option = {}

                        if (value >= 0) {
                            option.value = value

                            const biInfo = v.gauge

                            let biValue = 0
                            if (biInfo !== undefined && biInfo[key] !== undefined) {
                                biValue = biInfo[key]
                            }

                            // text 세팅
                            if (key === 'appAvgUseTime') {
                                // 시간은 h / m 을 붙임
                                option.text = util.convertTime(value)
                            } else if (key === 'appAndroidConnectCount'
                                || key === 'appIosConnectCount'
                            ) {
                                option.text = util.percent(value, data['appConnectCount'])
                            } else if (key === 'appReconnectCount') {
                                option.text = value > biValue && biValue === 0 ? 100 : util.percent(value, biValue)
                            } else {
                                // 1000 건, 100만건 단위의 k, m 을 붙임
                                option.text = util.convertNum(value)
                            }

                            // percent 세팅
                            if (key === 'appAndroidConnectCount' || key === 'appIosConnectCount') {
                                option.num = util.percent(value, data['appConnectCount'])
                            } else if (value === 0 && biValue === 0) {
                                // 전일자와 오늘 데이터가 모두 0이면 퍼센트를 0으로 고정
                                option.num = 0
                            }else if (v.gauge === undefined || !v.gauge[key]) {
                                // 값이 0이거나 없으면 퍼센트를 100으로 고정
                                option.num = 100
                            } else {
                                option.num = util.percent(value, biValue)
                            }
                            // 전일자 데이터 대비 화살표 세팅
                            if (key === 'appUseCount'
                                || key === 'appConnectCount'
                                || key === 'appMauCount') {
                                const $imgArrow = $('#' + key + 'Tri.img_arrow')

                                try {
                                    if (value > biValue) {
                                        $imgArrow.removeClass('arrow_up')
                                        $imgArrow.addClass('arrow_up')
                                    } else {
                                        $imgArrow.removeClass('arrow_up')
                                    }
                                } catch (e) {
                                    $imgArrow.removeClass('arrow_up')
                                    $imgArrow.addClass('arrow_up')
                                }
                            }
                        }

                        // 게이지 그래프 그리기
                        func.drawArc(key, option)
                    })
                },
                // 화면 그리는 시간, 응답 시간 차트 그리기
                setIntervalDataToChart(param, type) {
                    const {v} = DB0100

                    if (v[type]) {
                        v[type].setData(param)
                    }
                },
                // 장치 분석 데이터 세팅
                async setDeviceDistributionData(param) {
                    const {v} = DB0100

                    if (v.devicedistribution) {
                        v.devicedistribution.setData(param)
                    }
                },
                setLogmeterBaseData(param) {
                    const {v} = DB0100
                    try {
                        v.avg.error = param.error
                        v.avg.crash = param.crash
                    } catch (e) {
                        console.error(e)
                    }
                },
                // Logmeter 의 Error, Crash 스택 그리기
                setLogmeterStack(param) {
                    const {v} = DB0100
                    const count = {
                        error: param.appErrorCount,
                        crash: param.appCrashCount,
                        avg: {
                            ...v.avg
                        }
                    }

                    if (count.error === 0 && count.crash === 0) {
                        v.logmeter.reset()
                    }

                    v.logmeter.addStackTooltip(count)
                    v.logmeter.drawStack(count)
                },
                setLogmeterBullets(data) {
                    const {v, func} = DB0100
                    if (data.includes('1') || data.includes('2')) {
                        // error 또는 crash가 있을 때는 throttle을 적용하지 않음
                        v.logmeter.addData(data)
                    } else {
                        // 0만 있을 때 throttle을 적용
                        func.addDataToLogmeterChart(data)
                    }
                },
                // Logmeter 데이터 추가 (throttle 적용 / `logmeterThrottle`ms 안에 여러개 들어오는 경우 그려지지 않음)
                addDataToLogmeterChart: util.throttle((param) => {
                    const {v} = DB0100
                    if (param) {
                        v.logmeter.addData(param)
                    }
                }, 10),
                startIntervalVersionComparison() {
                    const {v} = DB0100
                    v.interval.versionComparison = setInterval(() => {
                        v.versioncomparison.getVersionComparisonData()
                    }, 60 * 60 * 1000)
                },
                startIntervalMarketingInsight() {
                    const {v} = DB0100
                    v.interval.marketinginsight = setInterval(() => {
                        v.marketinginsight.getMarketingInsightData()
                    }, 60 * 60 * 1000)
                },
                // ajax interval 중지
                stopInterval() {
                    const {v} = DB0100
                    const {interval} = v

                    if (v.logmeter) {
                        v.logmeter.reset()
                    }
                    if (v.resourceusage) {
                        v.resourceusage.reset()
                    }
                    if (v.accessibility) {
                        v.accessibility.reset()
                    }
                    if (v.loadingtimescatter) {
                        v.loadingTimeScatter = null
                        v.loadingtimescatter.reset()
                    }
                    if (v.responsetimescatter) {
                        v.responseTimeScatter = null
                        v.responsetimescatter.reset()
                    }
                    if (v.devicedistribution) {
                        v.devicedistribution.reset()
                    }
                    if (v.pvequalizer) {
                        v.pvequalizer.reset(true)
                    }
                    if (v.favorites) {
                        v.favorites.reset(true)
                    }
                    if (v.pageview) {
                        v.pageview.reset()
                    }
                    if (v.areadistribution) {
                        v.areaDistribution = null
                        v.areadistribution.reset()
                    }
                    if (v.loadingtimeline) {
                        v.loadingTimeLine = null
                        v.loadingtimeline.reset()
                    }
                    if (v.responsetimeline) {
                        v.responseTimeLine = null
                        v.responsetimeline.reset()
                    }
                    if (interval.versionComparison) {
                        clearInterval(interval.versionComparison)
                        interval.versionComparison = null
                    }
                    if (v.versioncomparison) {
                        v.versioncomparison.reset()
                    }
                    if (v.crashesbyversion) {
                        v.crashesbyversion.reset()
                    }
                    if (v.versionconversion) {
                        v.versionconversion.reset()
                    }
                    if (v.marketinginsight) {
                        v.marketinginsight.reset()
                    }
                    if (interval.marketinginsight) {
                        clearInterval(interval.marketinginsight)
                        interval.marketinginsight = null
                    }
                },
                // 컴포넌트 생성
                async createComponents() {
                    const {v} = DB0100
                    const componentPromises = []

                    for (const x in v.components) {
                        try {
                            const component = v.components[x]
                            const {id, key, name, title} = component

                            const createComponent = async () => {
                                const comment = i18next.t([
                                    'component',
                                    'desc',
                                    key.trim().replace(/_/g, '').toLowerCase()
                                ].join('.'), {'ns': 'dashboard'})
                                v.componentsKey.add(key)

                                // 생성된 컴포넌트 인스턴스를 저장할 변수 선언
                                let instance

                                try {
                                    switch (key) {
                                        case 'LOGMETER':
                                            instance = new MaxyLogmeter({
                                                id, comment, title,
                                                time: v.optLogmeterTime,
                                                weight: {
                                                    logWeight: v.optLogmeterLogWeight,
                                                    errorWeight: v.optLogmeterErrorWeight,
                                                    crashWeight: v.optLogmeterCrashWeight
                                                }
                                            })
                                            // 초기화 메서드를 비동기로 호출하고 대기
                                            await instance.getTemplates()
                                            // template 가져오면 좌측 error, crash stack 추가
                                            instance.addStackChart()
                                            // 우측 real time 격자 만들기
                                            instance.makeRealTimeChart()
                                            break
                                        case 'RESPONSE_TIME_LINE':
                                        case 'LOADING_TIME_LINE':
                                            instance = new MaxyRenderTime({
                                                id, title, comment
                                            });
                                            await instance.init()
                                            break
                                        case 'RESOURCE_USAGE':
                                            instance = new MaxyResourceUsage({id, title, comment})
                                            await instance.init()
                                            instance.addEventListener()
                                            break
                                        case 'FAVORITES':
                                            instance = new MaxyPageAnalysis({id, title, comment})
                                            await instance.init()
                                            window.addEventListener('resize', () => instance.setRedrawEvent())
                                            break
                                        case 'DEVICE_DISTRIBUTION':
                                            instance = new MaxyDeviceAnalysis({id, title, comment});
                                            await instance.init()
                                            instance.addEventListener()
                                            break
                                        case 'ACCESSIBILITY':
                                            instance = new MaxyAccessibility({id, title, comment});
                                            await instance.init()
                                            instance.addEventListener()
                                            break
                                        case 'PAGE_VIEW':
                                            instance = new MaxyPageView({id, title, comment});
                                            await instance.init()
                                            break
                                        case 'LOADING_TIME_SCATTER':
                                            instance = new MaxyIntervalScatter({
                                                id,
                                                title,
                                                comment,
                                                type: 'loading',
                                                limit: v.optLoadingtimescatterRange
                                            });
                                            await instance.init()
                                            break
                                        case 'RESPONSE_TIME_SCATTER':
                                            instance = new MaxyIntervalScatter({
                                                id,
                                                title,
                                                comment,
                                                type: 'response',
                                                limit: v.optResponsetimescatterRange
                                            });
                                            await instance.init()
                                            break
                                        case 'PV_EQUALIZER':
                                            instance = new MaxyPageViewEqualizer({id, title, comment});
                                            await instance.init()
                                            await instance.getTemplate()
                                            instance.setButtonEvent()
                                            break
                                        case 'AREA_DISTRIBUTION':
                                            instance = new MaxyAreaDistribution({id, title, comment});
                                            await instance.init()
                                            break
                                        case 'CRASHES_BY_VERSION':
                                            instance = new MaxyCrashesByVersion({id, title, comment});
                                            await instance.init()
                                            instance.addEventListener()
                                            break
                                        case 'VERSION_COMPARISON':
                                            instance = new MaxyVersionComparison({id, title, comment});
                                            await instance.init()
                                            instance.addEventListener()
                                            break
                                        case 'VERSION_CONVERSION':
                                            instance = new MaxyVersionConversion({id, title, comment});
                                            await instance.init()
                                            instance.addEventListener()
                                            break
                                        case 'MARKETING_INSIGHT':
                                            instance = new MaxyMarketingInsight({id, title, comment});
                                            await instance.init()
                                            instance.addEventListener()
                                            break
                                    }

                                    // 생성된 컴포넌트 인스턴스를 저장
                                    v[name] = instance
                                } catch (e) {
                                    console.log(e)
                                }
                            }

                            // 각 createComponent 함수의 Promise를 배열에 추가
                            componentPromises.push(createComponent().catch(console.error))

                        } catch (e) {
                            console.error(e)
                        }
                    }

                    // componentsPromises 배열 내 모든 Promise가 끝날 때 까지 대기
                    await Promise.all(componentPromises)
                },
                // 소켓에서 데이터 수신하여 분류
                receiveData(param) {
                    const {v, func} = DB0100

                    const data = JSON.parse(param)
                    const {
                        biInfo,
                        biYdaInfo,
                        rt,
                        logmeterAvg,
                        intervalInfo,
                        loadingTimeScatter,
                        responseTimeScatter,
                        pvEqualizer,
                        pageView,
                        deviceDistribution,
                        resourceUsage,
                        accessibility,
                        favorites,
                        loadingTimeLine,
                        responseTimeLine,
                        areaDistribution,
                        crashesByVersion,
                        versionConversion
                    } = data

                    // 어제 일자 bi info 를 먼저 세팅 한다. (setBiInfo 위에 있어야 한다.)
                    if (biYdaInfo) {
                        try {
                            func.setBiInfoBaseData(biYdaInfo)
                        } catch (e) {
                            console.log(e)
                        }
                    }

                    // bi info 를 어제 일자 데이터를 기반으로 그린다.
                    if (biInfo) {
                        try {
                            func.setLogmeterStack(biInfo)
                            func.setBiInfoChart(biInfo)
                        } catch (e) {
                            console.log(e)
                        }
                    }

                    if (rt) {
                        try {
                            func.setLogmeterBullets(rt)
                        } catch (e) {
                            console.log(e)
                        }
                    }

                    if (logmeterAvg) {
                        try {
                            func.setLogmeterBaseData(logmeterAvg)
                        } catch (e) {
                            console.log(e)
                        }
                    }

                    if (intervalInfo) {
                        try {
                            func.setIntervalDataToChart(intervalInfo)
                        } catch (e) {
                            console.log(e)
                        }
                    }

                    if (resourceUsage) {
                        try {
                            func.setResourceUsage(resourceUsage)
                        } catch (e) {
                            console.log(e)
                        }
                    }

                    if (deviceDistribution) {
                        try {
                            func.setDeviceDistributionData(deviceDistribution)
                        } catch (e) {
                            console.log(e)
                        }
                    }

                    try {
                        if (loadingTimeScatter?.length) {
                            func.setIntervalTimeScatter(loadingTimeScatter, 'loading');
                        }
                    } catch (e) {
                        console.log(e)
                    }

                    try {
                        if (responseTimeScatter?.length) {
                            func.setIntervalTimeScatter(responseTimeScatter, 'response');
                        }
                    } catch (e) {
                        console.log(e)
                    }

                    try {
                        if (pvEqualizer && Object.keys(pvEqualizer).length > 0) {
                            func.setPageViewEqualizerData(pvEqualizer)
                        }
                    } catch (e) {
                        console.log(e)
                    }

                    try {
                        if (pageView && pageView.length > 0) {
                            func.setPageViewData(pageView)
                        }
                    } catch (e) {
                        console.log(e)
                    }

                    try {
                        if (favorites && Object.keys(favorites).length > 0) {
                            func.setFavoritesData(favorites)
                        }
                    } catch (e) {
                        console.log(e)
                    }

                    try {
                        if (accessibility) {
                            func.setAccessibilityData(accessibility)
                        }
                    } catch (e) {
                        console.log(e)
                    }

                    try {
                        if (areaDistribution) {
                            func.setUseInfoByLocation(areaDistribution);
                        }
                    } catch (e) {
                        console.log(e)
                    }

                    try {
                        if (responseTimeLine && Object.keys(responseTimeLine).length > 0) {
                            // key값 (시간)을 배열로 변환
                            const responseTimeLineKeys = Object.keys(responseTimeLine)

                            if (!v.responseTimeLine) {
                                v.responseTimeLine = responseTimeLine
                                func.setIntervalDataToChart(v.responseTimeLine, 'responsetimeline')
                            } else if (responseTimeLineKeys.length > 0) {
                                const length = Object.keys(v.responseTimeLine).length
                                if (Object.keys(v.responseTimeLine)[length - 1] < responseTimeLineKeys[0]) {
                                    v.responseTimeLine = responseTimeLine
                                    func.setIntervalDataToChart(v.responseTimeLine, 'responsetimeline')
                                }
                            }
                        }
                    } catch (e) {
                        console.log(e)
                    }
                    try {
                        if (loadingTimeLine && Object.keys(loadingTimeLine).length > 0) {
                            // key값 (시간)을 배열로 변환
                            const loadingTimeLineKeys = Object.keys(loadingTimeLine)

                            if (!v.loadingTimeLine) {
                                v.loadingTimeLine = loadingTimeLine
                                func.setIntervalDataToChart(v.loadingTimeLine, 'loadingtimeline')
                            } else if (loadingTimeLineKeys.length > 0) {
                                const length = Object.keys(v.loadingTimeLine).length
                                if (Object.keys(v.loadingTimeLine)[length - 1] < loadingTimeLineKeys[0]) {
                                    v.loadingTimeLine = loadingTimeLine
                                    func.setIntervalDataToChart(v.loadingTimeLine, 'loadingtimeline')
                                }
                            }

                        }
                    } catch (e) {
                        console.log(e)
                    }
                    if (crashesByVersion) {
                        try {
                            func.setCrashesByVersion(crashesByVersion)
                        } catch (e) {
                            console.log(e)
                        }
                    }
                    if (versionConversion) {
                        try {
                            func.setVersionConversion(versionConversion)
                        } catch (e) {
                            console.log(e)
                        }
                    }
                },
                // map component 기존 데이터와 새로운 데이터를 비교하여 바뀐게 있는지 체크
                compareAreaValues(prevValues, currentValues) {
                    if (!prevValues.length || !currentValues.length) {
                        return
                    }

                    let differences = []

                    for (let i = 0; i < prevValues.length; i++) {
                        let prevObj = prevValues[i]
                        let currentObj = currentValues[i]

                        // 'dau' 값 비교
                        if (prevObj.dau !== currentObj.dau) {
                            differences.push({index: i, field: 'dau', value1: prevObj.dau, value2: currentObj.dau})
                        }

                        // 'error' 값 비교
                        if (prevObj.error !== currentObj.error) {
                            differences.push({index: i, field: 'error', value1: prevObj.error, value2: currentObj.error})
                        }

                        // 'crash' 값 비교 (두 배열 중 하나에 'crash' 값이 없을 수도 있으므로 체크)
                        if (prevObj.crash !== currentObj.crash) {
                            differences.push({index: i, field: 'crash', value1: prevObj.crash, value2: currentObj.crash})
                        }
                    }

                    return differences
                },
                // 웹 소켓 중지 함수
                wsDisconnect() {
                    const {v} = DB0100
                    v.ws.close()
                    console.log('Disconnected WebSocket')
                },
                // 웹 소켓 접속
                initWebSocket() {
                    const {v, func} = DB0100
                    v.ws = new WebSocket('wss://maxy.thinkm.co.kr:8443/ws')

                    // Websocket 이 open 된 이후부터 data 받아오도록
                    v.ws.onopen = () => {
                        func.startGetData()
                    }

                    if (v.ws.readyState === WebSocket.CONNECTING) {
                        // 메시지 수신 시작
                        v.ws.onmessage = msg => {
                            if (!v.flag.frf) {
                                console.log('receive duration: ' + (new Date().getTime() - window.debugTs) + 'ms')
                                v.flag.frf = true
                            }
                            try {
                                func.receiveData(msg.data)
                            } catch (e) {
                                console.log(e)
                            }
                        }
                    } else {
                        console.log('WebSocket is not Connected')
                    }

                    v.ws.onClose = event => {
                        if (event.wasClean) {
                            console.log('Connection Clean Close: ' + event.code)
                        } else {
                            console.log('Connection Abnormal Close: ' + event.code)
                        }
                    }

                    v.ws.onerror = error => {
                        console.error(error)
                    }
                },
                // 웹 소켓으로부터 데이터 수신 시작하도록 함
                async startGetData() {
                    const {v, func} = DB0100

                    // await util.sleep(500)
                    const packageNm = $('#packageNm').val()
                    const serverType = $('#packageNm option:selected').data('server-type')
                    const osType = $('#osType').val()

                    const components = func.getWsChartOption()

                    if (v.ws.readyState === WebSocket.OPEN) {
                        var ts = new Date().getTime() - window.debugTs
                        console.log(`packageNm: ${packageNm}, serverType: ${serverType}, osType: ${osType}, duration: ` + ts + 'ms')
                        v.ws.send(JSON.stringify({
                            packageNm,
                            serverType,
                            osType,
                            components,
                        }))
                    } else {
                        console.log('Websocket is not opened')
                    }
                },
                // web socket 에 전달할 컴포넌트별 옵션 넣어주기
                getWsChartOption() {
                    const {v, func} = DB0100
                    // web socket에 전달할 컴포넌트별 옵션 넣어주기
                    const components = []

                    for (let i in v.componentsConfig) {
                        // 컴포넌트별 옵션 정보가 들어있는 객체
                        const config = v.componentsConfig[i]

                        let {key, use} = config
                        if (!use) {
                            continue
                        }

                        key = key.toUpperCase().replace(/\s/g, '_')

                        // 컴포넌트별 옵션을 리턴받아 저장할 객체
                        const componentsObj = {}

                        // {name: key, option: ~~~} 형태로 리턴 받음
                        const componentOption = func.setWsChartOption(key, config, componentsObj)
                        // 객체를 배열에 push 해줌
                        if (componentOption !== undefined) {
                            components.push(componentOption)
                        }
                    }

                    // bi usage info는 따로 추가
                    components.push({name: 'BI_INFO'})
                    components.push({name: 'BI_YDA_INFO'})
                    components.push({name: 'LOGMETER_AVG'})
                    return components
                },
                setWsChartOption(key, config, target) {
                    switch (key) {
                        case 'FAVORITES': {
                            target.name = key
                            target.size = config.optFavoritesMaxSize
                            return target
                        }
                        case 'PAGEVIEW': {
                            target.name = key
                            target.size = config.optPageviewMaxSize
                            return target
                        }
                        case 'PV_EQUALIZER': {
                            target.name = key
                            target.size = config.optPvequalizerMaxSize
                            return target
                        }
                        case 'RESPONSE_TIME_SCATTER': {
                            target.name = key
                            target.size = config.optResponsetimescatterSize
                            return target
                        }
                        case 'LOADING_TIME_SCATTER': {
                            target.name = key
                            target.size = config.optLoadingtimescatterSize
                            return target
                        }
                        case 'PAGE_VIEW': {
                            target.name = key
                            target.size = config.optPageviewMaxSize
                            return target
                        }
                        default : {
                            target.name = key
                            return target
                        }
                    }
                },
                showAibotMessage() {
                    const {v} = DB0100
                    try {
                        const now = new Date();
                        const nowHHmm = now.getHours().toString().padStart(2, '0')
                            + now.getMinutes().toString().padStart(2, '0');

                        const sortedTimes = Object.values(v.aibot)
                            .filter(t => typeof t === 'string' && /^\d{3,4}$/.test(t)) // 문자열이면서 숫자 형식만 통과
                            .map(t => t.padStart(4, '0'))
                            .sort((a, b) => a.localeCompare(b));

                        const nextTime = sortedTimes.find(time => time > nowHHmm);
                        const formattedTime = nextTime ? `${nextTime.slice(0, 2)}:${nextTime.slice(2)}` : null
                        // null 인 경우에 대한 문자열
                        const msg = formattedTime == null ? trl('aibot.ds_next_no') : trl('aibot.ds_next', formattedTime)
                        toast(msg, false, 1500)
                    } catch (e) {
                        console.log(e)
                    }
                },
                openAibotDemo() {
                    const param = {
                        ...util.getAppInfo('#packageNm')
                    }
                    ajaxCall('/gm/0901/getBotList.maxy', param).then(data => {
                        if (data.length === 0 || !data) {
                            toast('Data is being processed')
                            return
                        }
                        // 챗봇 알림창 열기
                        const options = {
                            id: 'maxyAibot',
                            appendId: 'maxyAiBotPopupWrap',
                            packageNm: param.packageNm,
                            data
                        }

                        ML0100.v.sse.maxyAibot = new MaxyAibot(options)
                    }).catch(error => {
                        toast(error.msg)
                    })

                },
                initAibot() {

                    if (ML0100.v.sse.maxyAibot) {
                        const maxyAibot = ML0100.v.sse.maxyAibot
                        if (maxyAibot.aibotSwiper) {
                            maxyAibot.aibotSwiper.destroy(true, true) // Swiper 인스턴스 완전 제거
                            maxyAibot.aibotSwiper = null
                        }
                        if (maxyAibot.firstNextSlideTimeout) {
                            clearTimeout(maxyAibot.firstNextSlideTimeout)
                            maxyAibot.firstNextSlideTimeout = null
                        }
                        if (maxyAibot.typingTimeout) {
                            clearTimeout(maxyAibot.typingTimeout)
                            maxyAibot.typingTimeout = null
                        }
                        if (maxyAibot.data) {
                            maxyAibot.data = null
                        }
                    }

                    const $aibotDimmed = $('.aibot_dimmed')
                    if ($aibotDimmed.css('display') !== 'none') {
                        $aibotDimmed.hide()
                    }
                    $('#iconAibot').hide()
                    $('#maxyAibot__popup').hide()
                }
        }
    }
    window.DB0100 = DB0100;
    DB0100.__initialized = true;
    DB0100.init.event();
    DB0100.init.created();
}
