class MaxyRenderTime {
    constructor(options) {
        this.id = options.id
        this.title = options.title
        this.size = options.size
        this.comment = options.comment ? options.comment : ''
        this.darkModeYn = sessionStorage.getItem('maxyDarkYn')
    }

    async init() {
        const v = this
        const {id, title, comment} = v

        const source = await fetch(
            '/components/db/rendering-time/rendering-time.html'
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


        this.seriesName = id.toLowerCase().includes('loading') ? 'Med' : 'Avg'

        const chartOptions = {
            chart: {
                zoomType: 'x',
                marginBottom: 73,
                events: {
                    selection: function (e) {
                        e.preventDefault()
                        v.selectPointsByDrag(e, this)
                    }
                }
            },
            legend: {
                layout: 'horizontal',
                align: 'center',
                verticalAlign: 'bottom',
                floating: false,
                itemMarginBottom: -10
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
                crosshair: true
            },
            yAxis: [{
                type: 'logarithmic',
                custom: {
                    allowNegativeLog: true // 0이 들어왔을때를 위한 custom
                },
                min: 0,
                labels: {
                    formatter: function () {
                        return util.convertTime(this.value)
                    },
                    style: {
                        color: 'black'
                    }
                },
                title: {
                    text: ''
                },
                opposite: true,
            }, { // Secondary yAxis
                title: {text: ''}
            }, { // Tertiary yAxis
                title: {text: ''}
            }],
            plotOptions: {
                spline: {
                    marker: {
                        enabled: true,
                        radius: 4,
                        symbol: 'circle'
                    }
                },
                areaspline: {
                    marker: {
                        enabled: false,
                        radius: 0,
                        states: {
                            hover: {
                                enabled: true
                            }
                        }
                    }
                }
            },
            tooltip: {
                pointFormatter: function () {
                    return `${this.series.name}: <b>${util.convertTime(this.y)}</b><br/>`
                }
            },
            series: []
        }

        this.chart = Highcharts.chart(id + '__chart', chartOptions)
    }

    setData(data) {
        let { chart, darkModeYn, seriesName } = this

        if (!chart || !chart.series) {
            return
        }

        if (!data || Object.keys(data).length === 0) {
            return
        }

        const medSeries = []
        const maxSeries = []
        const minSeries = []

        Object.keys(data).forEach(key => {
            const { med, max, min, avg } = data[key]
            const medOrAvgTime = seriesName === 'Med' ? med : avg
            const maxTime = max === 0 ? 0 : max
            const minTime = min === 0 ? 0 : min

            medSeries.push({
                x: +key,
                y: medOrAvgTime
            })

            maxSeries.push({
                x: +key,
                y: maxTime
            })

            minSeries.push({
                x: +key,
                y: minTime
            })
        })

        medSeries.sort((b, a) => b.x - a.x)
        maxSeries.sort((b, a) => b.x - a.x)
        minSeries.sort((b, a) => b.x - a.x)

        const medData = {
            name: seriesName,
            type: 'areaspline',
            data: medSeries,
            color: {
                linearGradient: {x1: 0, x2: 0, y1: 0, y2: 1},
                stops: darkModeYn === 'Y' ? hcColors.stock.background.dark : hcColors.stock.background.light
            }
        }

        const maxData = {
            name: 'Max',
            type: 'spline',
            data: maxSeries,
            color: darkModeYn === 'Y' ? hcColors.stock.line.max.dark : hcColors.stock.line.max.light
        }

        const minData = {
            name: 'Min',
            type: 'spline',
            data: minSeries,
            color: darkModeYn === 'Y' ? hcColors.stock.line.min.dark : hcColors.stock.line.min.light
        }

        // series가 없을때만 addSeries , 있을땐 setData
        if (chart.series.length === 0) {
            chart.addSeries(medData)
            chart.addSeries(maxData)
            chart.addSeries(minData)
        } else {
            chart.series[0].setData(medSeries, false)
            chart.series[1].setData(maxSeries, false)
            chart.series[2].setData(minSeries, false)
        }

        chart.redraw()
    }

    draw(param) {
        if (param) {
            this.darkModeYn = param
        }
        const {chart, darkModeYn} = this

        if (!chart) {
            return
        }

        if (darkModeYn === 'Y') {
            chart.series[0].update({
                color: {
                    stops: hcColors.stock.background.dark
                }
            })
            chart.series[1].update({
                color: hcColors.stock.line.max.dark
            })
            chart.series[2].update({
                color: hcColors.stock.line.min.dark
            })
        } else {
            chart.series[0].update({
                color: {
                    stops: hcColors.stock.background.light
                }
            })
            chart.series[1].update({
                color: hcColors.stock.line.max.light
            })
            chart.series[2].update({
                color: hcColors.stock.line.min.light
            })
        }
    }

    selectPointsByDrag(e, t) {
        const {id} = this

        if (!e.xAxis || !e.yAxis || !t.series) {
            console.log('no')
            return
        }
        const x = e.xAxis[0], y = e.yAxis[0]
        const {min, max} = x


        const param = {
            packageNm: $('#packageNm').val(),
            serverType: $('#packageNm option:checked').data('server-type'),
            osType: $('#osType').val(),
            from: Math.round(min),
            to: Math.round(max)
        }

        let name = id.includes('RESPONSE') ? 'responseTimeLine' : 'loadingTimeLine'
        let popupType = id.includes('RESPONSE') ? 'Response Time' : 'Loading Time'

        if (param.from && param.to) {
            const options = {
                appendId: 'maxyPopupWrap',
                id: name + 'Popup',
                popupType,
                popupTitle: 'Profiling',
                intervalSort: true,
                data: param
            }
            if (name === 'loadingTimeLine') {
                new MaxyPopupLoadingTimeList(options)
            } else if (name === 'responseTimeLine') {
                ajaxCall('/db/0100/getResponseTimeList.maxy', param, {disableDimmed: true})
                    .then(response => {
                        const {list} = response
                        if(list.length > 0) {
                            options.data.paramList = list
                            new AnalysisResponseWithMultipleUrlV2Popup(options)
                        }else {
                            toast(i18next.tns('dashboard.msg.warnPopup'))
                        }
                    }).catch(error => {
                    console.log(error)
                })
            }
        }

        // don't zoom
        // return false
    }

    reset() {
        const {chart} = this
        while (chart.series.length) {
            chart.series[0].remove()
        }
    }

    destroyChart() {
        const {chart} = this
        chart.destroy({keepContainer: true})
        $('#' + this.id).empty()
    }
}