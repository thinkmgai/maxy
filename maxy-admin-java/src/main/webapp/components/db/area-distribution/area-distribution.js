class MaxyAreaDistribution {
    constructor(options) {
        this.id = options.id
        this.title = options.title
        this.comment = options.comment ? options.comment : ''
        this.dataKey = 'dau'
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
        const {id, title, comment} = this

        const source = await fetch(
            '/components/db/area-distribution/area-distribution.html'
        ).then(response => response.text())
        const template = Handlebars.compile(source)
        const $target = $('#' + id)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + id
        }

        $target.empty()
        $target.append(template({id, title}))
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
                map: topology
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
                if (this.dataKey === 'dau') {
                    xValue = values.error || 0
                    yValue = values.crash || 0
                } else if (this.dataKey === 'error') {
                    xValue = values.dau || 0
                    yValue = values.crash || 0
                } else if (this.dataKey === 'crash') {
                    xValue = values.dau || 0
                    yValue = values.error || 0
                }

                // percent = percent === '0.00' ? '0' : percent
                const tmpData = {
                    'hc-key': region, // 지역 키
                    'value': value, // 해당 타입별 데이터
                    'x': xValue,
                    'y': yValue,
                    'z': percent,
                    'error': values.error || 0, // error, crash 는 지도 클릭 시 팝업 열 지 여부를 판단하기 위해 넣음
                    'crash': values.crash || 0,
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
                    click: this.openPopup
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
        if (dataKey === 'dau') {
            minColor = '#E0E4FF'
            maxColor = '#0829FF'
            xName = 'Error'
            yName = 'Crash'
        } else if (dataKey === 'error') {
            minColor = '#F0ECDF'
            maxColor = '#FFAE00'
            xName = 'User'
            yName = 'Crash'
        } else if (dataKey === 'crash') {
            minColor = '#EDE0E0'
            maxColor = '#FF4646'
            xName = 'User'
            yName = 'Error'
        }

        // 설정된 색상 적용
        chart.colorAxis[0].update({
            minColor: minColor,
            maxColor: maxColor
        }, true)

        const tooltipName = dataKey.toLowerCase()
        const tooltipXname = xName.toLowerCase()
        const tooltipYname = yName.toLowerCase()

        chart.update({
            mapNavigation: {
                enabled: true
            },
            tooltip: {
                useHTML: true,
                formatter: function () {
                    const areaCode = this.point['hc-key']
                    const areaName = trl('dashboard.area.' + areaCode)

                    return '<span class="area_tooltip_name">' + areaName + '</span><br/>' +
                        '<span class="area_tooltip ' + tooltipName + '">' + dataValue + ': ' + this.point.value.toLocaleString() + ' (' + this.point.z + '%' + ')' + '</span></br>' +
                        '<span class="area_tooltip ' + tooltipXname + '">' + xName + ': ' + this.point.x.toLocaleString() + '</span><br/>' +
                        '<span class="area_tooltip ' + tooltipYname + '">' + yName + ': ' + this.point.y.toLocaleString() + '<br/>'
                }
            }
        })

        chart.redraw()
    }

    openPopup() {
        const areaCode = this['hc-key']
        const areaName = trl('dashboard.area.' + areaCode)
        const logType = $('#areaOption').find(':selected').data('type')

        if ('error' !== logType && 'crash' !== logType) {
            // error ,crash 가 아닌경우 toast
            toast(trl('dashboard.msg.noerrorNcrash'))
            return
        }

        const options = {
            id: 'useInfoByLocation',
            appendId: 'maxyPopupWrap',
            pageNm: 'Area Distribution',
            title: areaName,
            code: this['hc-key'],
            logType: logType,
        }

        if (('error' !== logType && 'crash' !== logType)
            || this['options'][logType] === 0) {
            // 데이터 없는 경우에 대한 toast
            toast(trl('dashboard.msg.errorNcrashPopup'))
            return
        }

        // 에러 / 크래시 둘 중 하나가 있는 경우에만 팝업 open
        new MaxyAreaDistributionList(options)
    }

    reset() {
        const {chart} = this
        while (chart.series.length) {
            chart.series[0].remove()
        }
    }
}