class MaxyFrontAreaDistribution {
    constructor(options) {
        this.id = options.id
        this.title = options.title
        this.comment = options.comment ? options.comment : ''
        this.dataKey = 'user'
        this.dataValue = 'User'
    }

    addEventListener() {
        const v = this
        // 콤보박스 값 변경 시 선택한 값에 대한 차트 보여줘야 함
        $('#areaOption').on('change', function () {
            v.dataValue = $(this).val()
            v.dataKey = $(this).find('option:checked').data('type')

            v.setData()
        })
    }

    async init() {
        const {id, title} = this

        const source = await fetch(
            '/components/front/db/area/area.html'
        ).then(response => response.text())
        const template = Handlebars.compile(source)
        const $target = $('#' + id)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + id
        }

        $target.empty()
        $target.append(template({id, title}))

        const comment = trl('dashboard.component.desc.frontareadistribution')
        tippy('#' + id + ' .ic_question', {
            content: comment,
            placement: 'bottom',
            allowHTML: true,
            arrow: false,
            theme: 'maxy-tooltip'
        })

        const topology = await fetch(
            '/components/db/area-distribution/kr-all.topo.json'
        ).then(response => response.json())

        this.chart = Highcharts.mapChart(id + '__chart', {
            chart: {
                map: topology,
            },
            legend: {
                enabled: false // 범례 숨기기
            },
            mapNavigation: {
                enabled: false,
                buttonOptions: {
                    verticalAlign: 'bottom'
                }
            },
            colorAxis: {
                min: 0
            },
            series: []
        })
    }

    setData(param) {
        const {chart} = this

        try {
            if (!chart) {
                return
            }

            if (!param) {
                param = this.data
            }

            this.data = param

            const objToArray = Object.entries(param)

            if (objToArray.length === 0) {
                return
            }

            let totalValue = 0
            let data = []

            // 전체 데이터 갯수 구하기
            for (let i = 0; i < objToArray.length; i++) {
                const values = objToArray[i][1]
                const value = values[this.dataKey] || 0
                totalValue += value
            }

            for (let i = 0; i < objToArray.length; i++) {
                const region = objToArray[i][0] // 각 지역 코드
                const values = objToArray[i][1]

                const value = values[this.dataKey] || 0 // 각 지역별 데이터

                let percent = totalValue === 0 ?
                    0 : ((value / totalValue) * 100).toFixed(2) // 전체 데이터 대비 해당 지역 데이터가 몇 % 차지하는지

                if (percent !== 0) {
                    if (percent.split('.')[1] === '00') {
                        percent = percent.slice(0, -3)
                    }
                }

                // xValue, yValue는 툴팁에 표시할 x, y 값을 정해줄 변수임
                // type이 dau면 x가 error, y가 crash가 됨
                let xValue, yValue
                if (this.dataKey === 'loading') {
                    xValue = values.response || 0
                    yValue = values.user || 0
                } else if (this.dataKey === 'response') {
                    xValue = values.loading || 0
                    yValue = values.user || 0
                } else if (this.dataKey === 'user') {
                    xValue = values.loading || 0
                    yValue = values.response || 0
                }

                // percent = percent === '0.00' ? '0' : percent
                const tmpData = {
                    'hc-key': region, // 지역 키
                    'value': value, // 해당 타입별 데이터
                    'x': xValue,
                    'y': yValue,
                    'z': percent,
                    'error': values.error, // error, crash 는 지도 클릭 시 팝업 열 지 여부를 판단하기 위해 넣음
                    'crash': values.crash,
                }
                data.push(tmpData)
            }

            this.draw(data)
        } catch (e) {
            console.log(e)
        }
    }

    draw(data) {
        const {chart, dataValue, dataKey} = this
        // 만들어진 데이터 차트에 세팅

        const seriesData = {
            name: dataValue,
            data: data,
            point: {
                events: {
                    click: (event) => this.openPopup(event.point)
                }
            }
        }

        if (chart.series.length === 0) {
            chart.addSeries(seriesData)

        } else {
            chart.series[0].setData(data)
        }

        // 선택한 데이터 타입명으로 name 변경
        chart.series[0].update({
            name: dataValue
        })

        // 데이터 타입별 색상 변경
        let minColor, maxColor, xName, yName
        if (dataKey === 'loading') {
            minColor = 'rgba(195,202,255,0.4)'
            maxColor = '#4258ff'
            xName = 'Response'
            yName = 'User'
        } else if (dataKey === 'response') {
            minColor = 'rgba(226,209,255,0.4)'
            maxColor = '#7f5cff'
            xName = 'Loading'
            yName = 'User'
        } else if (dataKey === 'user') {
            minColor = 'rgba(120,213,151,0.5)'
            maxColor = '#009333'
            xName = 'Loading'
            yName = 'Response'
        }

        // 설정된 색상 적용
        chart.colorAxis[0].update({
            minColor: minColor,
            maxColor: maxColor
        }, true)

        chart.update({
            mapNavigation: {
                enabled: true
            },
            tooltip: {
                useHTML: true,
                formatter: function () {
                    const locationCode = this.point['hc-key']
                    const areaName = trl('dashboard.area.' + locationCode)

                    let user, loading, response

                    // 단위 추가 함수
                    const formatValue = (value, type) => {
                        const formattedValue = value.toLocaleString()
                        return type === 'user' ? formattedValue : formattedValue + 'ms'
                    }

                    if (dataKey === 'response') {
                        user = formatValue(this.point.y, 'user')
                        loading = formatValue(this.point.x, 'loading')
                        response = formatValue(this.point.value, 'response')
                    } else if (dataKey === 'loading') {
                        user = formatValue(this.point.y, 'user')
                        loading = formatValue(this.point.value, 'loading')
                        response = formatValue(this.point.x, 'response')
                    } else if (dataKey === 'user') {
                        user = formatValue(this.point.value, 'user')
                        loading = formatValue(this.point.x, 'loading')
                        response = formatValue(this.point.y, 'response')
                    }

                    return '<span class="area_tooltip_name">' + areaName + '</span><br/>' +
                        '<span class="area_tooltip user">User: <span>' + user + '</span></span><br/>' +
                        '<span class="area_tooltip loading">Loading: <span>' + loading + '</span></span><br/>' +
                        '<span class="area_tooltip response">Response: <span>' + response + '</span></span>'
                }
            }
        })

        chart.redraw()
    }

    openPopup(point) {
        const v = this
        const locationCode = point['hc-key']

        let type

        // 상세 팝업 내 콤보박스에 넣어줄 지역코드 배열
        const krKeys = Object.keys(v.data).filter(key => key.startsWith("kr-"));
        if (v.dataKey === 'loading') {
            type = 'Page Loading'
        } else if (v.dataKey === 'response') {
            type = 'Response Time'
        } else {
            type = 'User'
        }

        const options = {
            appendId: 'maxyPopupWrap',
            id: v.dataKey + 'AreaPopup',
            from: util.dateToTimestamp(util.getDate(0), true),
            to: new Date().getTime(),
            type: type,
            logType: v.dataKey === 'response' ? 'ajax area' : 'page area',
            topChartId: v.dataKey === 'response' ? 'responseDetail' : 'webVital',
            botChartId: v.dataKey === 'response' ? 'responseChart' : 'waterfall',
            locationCode: locationCode,
            krKeys: krKeys
        }

        if (v.dataKey === 'response') {
            new MaxyFrontPopupAjaxResponse(options)
        } else if (v.dataKey === 'loading') {
            new MaxyFrontPopupPageLoading(options)
        } else {
            new MaxyFrontPopupAreaPerformance(options)
        }
    }

    reset() {
        const {chart} = this
        while (chart.series.length) {
            chart.series[0].remove()
        }
    }
}