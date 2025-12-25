'use strict'

class MaxyCrashesByVersion {
    constructor(options) {
        this.id = options.id
        this.size = options.size
        this.title = options.title
        this.comment = options.comment

        if (!this.id) {
            console.log('please check parameter')
            return false
        }
    }

    async init() {
        const {id, data, comment} = this
        const source = await fetch(
            '/components/db/crashes-by-version/crashes-by-version.html')
            .then(response => response.text())
        const template = Handlebars.compile(source)
        const $target = $('#' + id)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + id
        }

        const fmtTitle = i18next.tns('dashboard.component.title.crashesbyversion')
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

        const types = ['android', 'ios']

        types.forEach(type => {
            this[type + 'Crash']
                = Highcharts.chart(type + 'Crash', {
                chart: {
                    type: 'column',
                    zoomType: 'x',
                    marginBottom: 87
                },
                legend: {
                    layout: 'horizontal',
                    align: 'center',
                    verticalAlign: 'bottom',
                    floating: false,
                    itemMarginBottom: 3
                },
                xAxis: {
                    type: 'datetime',
                    dateTimeLabelFormats: {
                        millisecond: '%H:%M:%S',
                        second: '%H:%M:%S',
                        minute: '%H:%M:%S',
                        hour: '%H:%M:%S',
                        day: '%H:%M:%S',
                        week: '%H:%M:%S',
                        month: '%H:%M:%S',
                        year: '%H:%M:%S'
                    },
                    labels: {
                        format: '{value:%H:%M}' // x축 형식을 직접 설정
                    },
                    crosshair: true
                },
                yAxis: {
                    min: 0,
                    title: {
                        text: ''
                    },
                    allowDecimals: false // Y축 값이 정수로만 표시됨
                },
                plotOptions: {
                    series: {
                        turboThreshold: 0,
                        animation: false,
                        boostThreshold: 0,
                        crisp: false, //선명하게 그리기 위해 각점을 반올림하는 옵션, 체감은 안되지만 계산을 줄이는 효과 기대
                        pointInterval: 2, //시간 표현 간격을 조정한다. default는 1, 문자열을 줄여서 성능향상 기대
                    }
                },
                series: []
            })
        })
    }

    openPopup() {

        const splitTextAndVersion = (str) => {
            const match = str.match(/^([a-zA-Z]+)\s([\d\.]+)/)
            if (match) {
                return {
                    osType: match[1],   // 영어 부분
                    appVer: match[2] // 숫자 부분
                }
            }
            return null // 매칭되지 않으면 null 반환
        }

        const getSearchToDt = (searchFromDt) => {
            const oneHourMinusOneMs = (60 * 60 * 1000) - 1 // 1시간 - 1밀리초 (09:59:59.999)

            return searchFromDt + oneHourMinusOneMs
        }

        const result = splitTextAndVersion(this.series.name)

        const options = {
            id: 'crashesByVersion',
            appendId: 'maxyPopupWrap',
            logType: 'crash',
            popupType: this.series.name,
            title: 'Crash',
            osType: result.osType,
            appVer: result.appVer,
            searchFromDt: this.x,
            searchToDt: getSearchToDt(this.x)
        }

        new MaxyPopupLogListByUser(options)
    }

    addEventListener() {
        const {id} = this
        const v = this
        const $container = $('#' + id)
        const $btnTab = $('#' + id + ' .btn_tab')
        const osType = $('#osType').val()
        const $maxyComponentItemWrap = $container.find('.maxy_component_item_wrap')

        $maxyComponentItemWrap.addClass('hidden')

        if(osType === 'iOS') {
            $($btnTab[1]).addClass('on');
            $('#iosCrashWrap').removeClass('hidden')
        } else {
            $($btnTab[0]).addClass('on');
            $('#androidCrashWrap').removeClass('hidden')
        }

        const $clickBtnTab = $('#' + id + ' .btn_tab.on')
        v.btnType = $clickBtnTab[0].innerText

        $btnTab.on('click', function () {
            const tab = $(this).data('tab') + 'Wrap'
            $('#' + id + ' .btn_tab').addClass('on')

            $(this).siblings('#' + id + ' .btn_tab').removeClass('on')

            v.btnType = $clickBtnTab[0].innerText

            $maxyComponentItemWrap.addClass('hidden')
            $('#' + tab).removeClass('hidden')
        })

        // All 버튼 클릭시
        $('#' + id + ' .maxy_component_btn').off('click').on('click', function () {
            // All 팝업 열기
            new MaxyPopupCrashesByVersion({
                appendId: 'maxyPopupWrap', id: 'crashesByVersion'
            })
        })
    }

    setData(data) {
        const v = this
        try {
            const chartTypes = ['ios', 'android']

            chartTypes.forEach(type => {
                while (this[type + 'Crash'].series.length) {
                    this[type + 'Crash'].series[0].remove()
                }
            })

            /*  데이터를 형식에 맞게 변환
               x축: 시간
               y축: crash count
               series 최대 3개
           */

            // os type별로 묶여있으므로 key length만큼 반복하여 데이터 추출하기
            const osTypes = Object.keys(data)
            if (!osTypes
                || !osTypes.some(type => !util.isEmpty(type))) {
                return
            }

            osTypes.forEach(os => {
                let seriesName = os === 'android' ? 'Android' : 'iOS'

                const entries = data[os] // os에 해당하는 데이터 배열
                const keys = Object.keys(entries) // 앱 버전 키 가져오기 (1, 1.5 등)

                keys.forEach((key, idx) => {
                    const versionData = entries[key] // 각 버전에 해당하는 데이터

                    // [timestamp, crashCount] 배열 생성
                    const crashData = versionData.map(entry => [Number(entry.date), entry.crashCount])
                    // chartType에 맞는 시리즈 추가
                    this[os + 'Crash'].addSeries({
                        name: seriesName + ' ' + key,
                        data: crashData, // [timestamp, crashCount] 데이터 사용
                        color: hcColors.multiBar[idx],
                        point: {
                            events: {
                                click: v.openPopup
                            }
                        }
                    })
                })
            })
        } catch (e) {
            console.log(e)
        }
    }

    reset() {
        const { androidCrash, iosCrash } = this

        const charts = [androidCrash, iosCrash]

        charts.forEach(chart => {
            while (chart && chart.series && chart.series.length > 0) {
                chart.series[0].remove()
            }
        });
    }
}