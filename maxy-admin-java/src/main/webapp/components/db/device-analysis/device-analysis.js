'use strict'

class MaxyDeviceAnalysis {
    constructor(options) {
        this.id = options.id
        this.size = options.size
        this.title = options.title
        this.comment = options.comment
        this.darkModeYn = sessionStorage.getItem('maxyDarkYn')
        this.chartTypes = ['error', 'crash'] // 차트 종류
        this.seriesVisible = {} // 차트 종류, 시리즈별 visible 상태

        this.func = options.func
        if (!this.id) {
            console.log('please check parameter')
            return false
        }
    }

    async init() {
        const {id, data, comment, chartTypes} = this
        const source = await fetch(
            '/components/db/device-analysis/device-analysis.html')
            .then(response => response.text())
        const template = Handlebars.compile(source)
        const $target = $('#' + id)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + id
        }

        const fmtTitle = i18next.tns('dashboard.component.title.devicedistribution')
        $target.empty()
        $target.append(template({id, data, fmtTitle}))

        tippy('#' + id + ' .ic_question', {
            content: comment,
            placement: 'bottom',
            allowHTML: true,
            arrow: false,
            theme: 'maxy-tooltip'
        })

        this.$target = $target

        chartTypes.forEach(type => {
            this.seriesVisible[type] = {} // 차트별 visible 상태 초기 설정

            this[type + 'Chart']
                = Highcharts.chart('bubble_' + type + 'Chart', {
                chart: {
                    type: 'bubble',
                    zoomType: 'xy',
                    marginBottom: 87
                },
                legend: {
                    layout: 'horizontal',
                    align: 'center',
                    verticalAlign: 'bottom',
                    floating: false,
                    itemMarginBottom: 3
                },
                xAxis: [{
                    labels: {
                        formatter: function () {
                            return util.comma(this.value)
                        }
                    }
                }],
                yAxis: [{
                    startOnTick: true,
                    endOnTick: true,
                    title: {
                        text: ''
                    },
                    labels: {
                        format: '{value} %',
                        formatter: function () {
                            return Math.floor(this.value) + ' %';
                        }
                    }
                }],
                tooltip: {
                    enabled: true,
                    shared: true,
                    headerFormat: '',
                    formatter: function () {
                        const {point} = this

                        const errorText = i18next.tns('dashboard.bi.error')
                        const avgText = i18next.tns('dashboard.bi.avgTooltip')
                        const crashText = i18next.tns('dashboard.bi.crash')

                        if (!point || point.type === 'error') {
                            try {
                                const x = util.comma(point.x)
                                const y = (point.y % 1 === 0 ? point.y : point.y.toFixed(1)) + '%'
                                const avg = util.comma(Math.round(point.avg))

                                return point.deviceName + ' (' + y + ')'
                                    + '<br>' +
                                    errorText + ': ' + '<b>' + x + '</b>'
                                    + '<br>' +
                                    avgText + ': ' + '<b>' + avg + '</b>'
                            } catch (e) {

                            }
                        } else {
                            const x = util.comma(point.x)
                            const y = (point.y % 1 === 0 ? point.y : point.y.toFixed(1)) + '%'
                            const avg = util.comma(Math.round(point.avg))

                            return point.deviceName + ' (' + y + ')'
                                + '<br>' +
                                crashText + ': ' + '<b>' + x + '</b>'
                                + '<br>' +
                                avgText + ': ' + '<b>' + avg + '</b>'
                        }

                    }
                },
                plotOptions: {
                    series: {
                        turboThreshold: 0,
                        animation: false,
                        boostThreshold: 0,
                        crisp: false, //선명하게 그리기 위해 각점을 반올림하는 옵션, 체감은 안되지만 계산을 줄이는 효과 기대
                        pointInterval: 2, //시간 표현 간격을 조정한다. default는 1, 문자열을 줄여서 성능향상 기대
                    },
                    bubble: {
                        minSize: '10%',
                        maxSize: '17%'
                    }
                },
                series: []
            })
        })
    }

    addEventListener() {
        const {id} = this
        const v = this
        const $container = $('#' + id)
        const $btnTab = $('#' + id + ' .btn_tab')
        const $clickBtnTab = $('#' + id + ' .btn_tab.on')
        v.btnType = $clickBtnTab[0].innerText

        $btnTab.on('click', function () {
            const tab = $(this).data('tab')
            $('#' + id + ' .btn_tab').addClass('on')

            $(this).siblings('#' + id + ' .btn_tab').removeClass('on')

            v.btnType = $clickBtnTab[0].innerText

            const $maxyComponentItemWrap = $container.find('.maxy_component_item_wrap')
            $maxyComponentItemWrap.addClass('hidden')
            $('#' + tab).removeClass('hidden')

            v.typeDeviceModelList = [];
            for (const item of v.deviceModelList) {
                if (tab === 'bubbleError') {
                    if (item.errorCount) {
                        v.typeDeviceModelList.push(item)
                    }
                    v.btnType = 'Error'
                } else if (tab === 'bubbleCrash') {
                    if (item.crashCount) {
                        v.typeDeviceModelList.push(item)
                    }
                    v.btnType = 'Crash'
                }
            }
        })

        // 전체 Data 팝업 열기
        $('#showAllAnalysis').on('click', function () {
            v.getAllData()
        })
    }

    setData(data) {
        const {chartTypes} = this
        const v = this

        try {
            const baseDeviceInfo = data.baseDeviceInfo
            const totalCountInfo = data.totalCountInfo || {}
            const errorTotalCount = isNaN(totalCountInfo.errorTotalCount) ? 0 : totalCountInfo.errorTotalCount
            const crashTotalCount = isNaN(totalCountInfo.crashTotalCount) ? 0 : totalCountInfo.crashTotalCount

            const point = {
                events: {
                    click: function () {
                        let type
                        let popupType
                        // error 팝업, crash 팝업 구분
                        if (this.type === 'error') {
                            type = 'error'
                            popupType = 'Error'
                        } else if (this.type === 'crash') {
                            type = 'crash'
                            popupType = 'Crash'
                        }

                        const options = {
                            appendId: 'maxyPopupWrap',
                            id: 'deviceAnalysisPopup',
                            title: popupType,
                            deviceModel: this.deviceModel,
                            logType: type.toUpperCase(),
                            popupType: 'Device Distribution'
                        }

                        if (this.error === 0 || this.crash === 0) {
                            return
                        }

                        new MaxyPopupLogListByUser(options)
                    }
                }
            }

            if (
                !baseDeviceInfo
                || baseDeviceInfo.length === 0
            ) {
                return
            }

            const osMap = {
                androidError: [],
                iosError: [],
                androidCrash: [],
                iosCrash: [],
            }

            v.deviceModelList = []

            if (baseDeviceInfo && Object.keys(baseDeviceInfo).length > 0) {
                for (let key of Object.keys(baseDeviceInfo)) {
                    const obj = baseDeviceInfo[key]
                    const osType = obj.osType.toLowerCase()
                    const logType = obj.type
                    const errorCount = isNaN(obj.errorCount) ? 0 : obj.errorCount
                    const crashCount = isNaN(obj.crashCount) ? 0 : obj.crashCount

                    const pct = logType === 'error' ? (errorCount / errorTotalCount) * 100 :
                        logType === 'crash' ? (crashCount / crashTotalCount) * 100 : 0

                    const avg = isNaN(obj[logType + 'Avg']) ? 0 : obj[logType + 'Avg'].toFixed(2)

                    const tmpLogType = logType.charAt(0).toUpperCase() + logType.slice(1)
                    const dataType = osType + tmpLogType // ex) iosError, androidError
                    const objDevice = {
                        deviceModel: obj.deviceModel,
                        errorCount: errorCount,
                        crashCount: crashCount
                    }

                    obj[logType + 'Pct'] = pct

                    if (obj[logType + 'Count'] !== 0) {

                        // device model 리스트에 push함
                        v.deviceModelList.push(objDevice)
                        v.typeDeviceModelList = v.deviceModelList

                        // all 버튼 보이기
                        $('#showAllAnalysis').show()

                        osMap[dataType].push({
                            x: obj[logType + 'Count'],
                            y: obj[logType + 'Pct'],
                            z: obj[logType + 'Count'],
                            avg: avg,
                            deviceModel: obj['deviceModel'],
                            deviceName: getDeviceModel(obj['deviceModel']),
                            type: obj['type']
                        })
                    }
                }
            }

            chartTypes.forEach((type) => {
                // 기존에 series가 있으면 모두 비우고 add 하도록 함
                const chart = this[type + 'Chart']
                for(let i=0; i<chart.series.length; i++){
                    // 현재 시리즈의 visible 상태 저장
                    this.seriesVisible[type][chart.series[i].name] = chart.series[i].visible
                }
            })

            /**
             * series 생성 공통 함수
             * @param name series 명
             * @param data 차트에 표시해줄 데이터
             * @param fillColor 차트 배경 색상 (ios/android 별로 다름)
             * @param lineColor 차트 테두리 색상 (ios/android 별로 다름)
             * @param type 차트 종류 (error/crash)
             * @return Object
             */
            const createSeries = (name, data, fillColor, lineColor, type) => {
                // 처음 그릴땐 true, 이후엔 옵션값
                if (typeof this.seriesVisible[type][name] === "undefined") this.seriesVisible[type][name] = true

                return {
                    name: name,
                    data: data,
                    point: point,
                    marker: {
                        fillColor: {
                            radialGradient: {cx: 0.4, cy: 0.3, r: 0.7},
                            stops: fillColor
                        },
                        lineColor: lineColor
                    },
                    visible: this.seriesVisible[type][name] // 숨김처리 됐던 시리즈를 저장했다가 다시 그려줄때 설정
                }
            }

            const aosErrorSeries = createSeries('Android', osMap.androidError, hcColors.device.android.fillColor, hcColors.device.android.lineColor, 'error')
            const aosCrashSeries = createSeries('Android', osMap.androidCrash, hcColors.device.android.fillColor, hcColors.device.android.lineColor, 'crash')
            const iosErrorSeries = createSeries('iOS', osMap.iosError, hcColors.device.ios.fillColor, hcColors.device.ios.lineColor, 'error')
            const iosCrashSeries = createSeries('iOS', osMap.iosCrash, hcColors.device.ios.fillColor, hcColors.device.ios.lineColor, 'crash')

            const osType = $('#osType').val()

            chartTypes.forEach((type) => {
                // 기존에 series가 있으면 모두 비우고 add 하도록 함
                const chart = this[type + 'Chart']

                while (chart.series.length) {
                    chart.series[0].remove()
                }

                if (type === 'error' && osType === 'A') {
                    if (osMap.androidError.length > 0) {
                        chart.addSeries(aosErrorSeries)
                    }
                    if (osMap.iosError.length > 0) {
                        chart.addSeries(iosErrorSeries)
                    }

                } else if (type === 'error' && osType === 'Android') {
                    if (osMap.androidError.length > 0) {
                        chart.addSeries(aosErrorSeries)
                    }
                } else if (type === 'error' && osType === 'iOS') {
                    if (osMap.iosError.length > 0) {
                        chart.addSeries(iosErrorSeries)
                    }
                } else if (type === 'crash' && osType === 'Android') {
                    if (osMap.androidCrash.length > 0) {
                        chart.addSeries(aosCrashSeries)
                    }
                } else if (type === 'crash' && osType === 'iOS') {
                    if (osMap.iosCrash.length > 0) {
                        chart.addSeries(iosCrashSeries)
                    }
                } else if (type === 'crash' && osType === 'A') {
                    if (osMap.iosCrash.length > 0) {
                        chart.addSeries(iosCrashSeries)
                    }
                    if (osMap.androidCrash.length > 0) {
                        chart.addSeries(aosCrashSeries)
                    }
                }
            })

            this.draw()
        } catch (e) {
            console.log(e)
        }
    }

    reset() {
        const {chartTypes} = this

        chartTypes.forEach((type) => {
            const chart = this[type + 'Chart']

            while (chart && chart.series && chart.series.length > 0) {
                // 현재 시리즈의 visible 상태 저장
                this.seriesVisible[type][chart.series[0].name] = chart.series[0].visible
                chart.series[0].remove()
            }
        })
    }

    draw(param) {
        if (param) {
            this.darkModeYn = param
        }
        let {errorChart, crashChart, darkModeYn} = this

        if (!errorChart || !errorChart.series || !crashChart || !crashChart.series) {
            return
        }

        this.refresh(darkModeYn)
    }

    refresh(darkModeYn) {
        let params

        if (darkModeYn === 'Y') {
            params = {
                radius: 50,
                backgroundColor: [hcColors.pageview.background.normal.dark],
                fontColor: hcColors["dark-font"]
            }

        } else {
            params = {
                backgroundColor: [hcColors.pageview.background.normal.light],
                fontColor: hcColors["day-font"]
            }
        }
        params.target = this.chart
    }

    getAllData() {
        const v = this;
        const btnType = v.btnType
        const deviceList = []
        if (btnType === 'Error') {
            for (const item of v.typeDeviceModelList) {
                if (item.errorCount) {
                    deviceList.push(item)
                }
            }
        } else {
            for (const item of v.typeDeviceModelList) {
                if (item.crashCount) {
                    deviceList.push(item)
                }
            }
        }
        const options = {
            appendId: 'maxyPopupWrap',
            id: 'analysis',
            deviceList: deviceList,
            btnType: v.btnType
        }
        new MaxyPopUpUsageList(options)
    }
}