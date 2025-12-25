class MaxyAccessibility {
    constructor(options) {
        this.id = options.id
        this.title = options.title
        this.comment = options.comment
        this.func = options.func
        this.darkModeYn = sessionStorage.getItem('maxyDarkYn')
    }

    async init() {
        const {id, comment} = this

        const source = await fetch(
            '/components/db/accessibility/accessibility.html'
        ).then(response => response.text())
        const template = Handlebars.compile(source)
        const $target = $('#' + id)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + id
        }

        const fmtTitle = i18next.tns('dashboard.component.title.accessibility')
        $target.empty()
        $target.append(template({id, fmtTitle}))
        tippy('#' + id + ' .ic_question', {
            content: comment,
            placement: 'bottom',
            allowHTML: true,
            arrow: false,
            theme: 'maxy-tooltip'
        })

        this.chart = Highcharts.chart(id + '__chart', {
            chart: {
                zoomType: 'x',
                marginBottom: 73
            },
            legend: {
                layout: 'horizontal',
                align: 'center',
                verticalAlign: 'bottom',
                floating: false,
                itemMarginBottom: -10
            },
            xAxis: [{
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
            }],
            yAxis: [{// Primary yAxis
                labels: {
                    formatter: function () {
                        return util.comma(this.value)
                    },
                    style: {
                        color: 'black'
                    }
                },
                title: {
                    text: ''
                },
                opposite: true
            }],
            plotOptions: {
                series: {
                    turboThreshold: 0,
                    animation: false,
                    boostThreshold: 0,
                    crisp: false, //선명하게 그리기 위해 각점을 반올림하는 옵션, 체감은 안되지만 계산을 줄이는 효과 기대
                    pointInterval: 2, //시간 표현 간격을 조정한다. default는 1, 문자열을 줄여서 성능향상 기대
                },
                column: {
                    stacking: 'normal',
                    borderWidth: 0
                }
            },
            series: []
        })
    }

    addEventListener() {
        const toggle = (t) => {
            $(t).siblings('button').removeClass('on')
            $(t).addClass('on')
        }

        const {id, func} = this

        if (!func) {
            return
        }

        $('#' + id + ' .maxy_component_btn').on('click', function () {
            func($(this).data('date'))
            toggle(this)
        })
    }

    async setData(data) {
        const {chart, darkModeYn} = this
        const {login, dau, noLogin, dauAvg} = data

        const serialize = (data) => {
            if (!data || data.length === 0) {
                return
            }
            const res = []
            const from = new Date(new Date().setHours(0, 0, 0, 0)).getTime()
            const to = new Date().getTime()
            for (let i = 0; i < data.length; i++) {
                if(from <= data[i].key && to >= data[i].key) {
                    res.push([data[i].key, data[i].value])
                }
            }
            return res
        }

        try {
            const dauSeries = serialize(dau)
            const loginSeries = serialize(login)
            const noLoginSeries = serialize(noLogin)
            let dauData = {}
            let loginData = {}
            let noLoginData = {}

            dauData = {
                name: 'DAU',
                type: 'spline',
                data: dauSeries,
                tooltip: {
                    valueSuffix: ''
                },
                zIndex: 3,
                color: darkModeYn === 'N' ? hcColors.stock.line.max.light :  hcColors.stock.line.max.dark,
                lineColor: 'rgba(0, 0, 0, 0)'
            }

            loginData = {
                name: 'Login ',
                type: 'column',
                data: loginSeries,
                tooltip: {
                    valueSuffix: ''
                },
                zIndex: 2,
                color: 'rgba(0, 152, 238, 0.64)'
            }

            noLoginData = {
                name: 'No Login',
                type: 'column',
                data: noLoginSeries,
                tooltip: {
                    valueSuffix: ''
                },
                zIndex: 0,
                color: darkModeYn === 'N' ? '#CFCFE4' : 'rgba(163, 163, 210, 0.7)'
            }

            // series가 없을때만 addSeries , 있을땐 setData
            if (chart.series.length === 0) {
                chart.addSeries(dauData)
                chart.addSeries(loginData)
                chart.addSeries(noLoginData)
            } else {
                chart.series[0].setData(serialize(dau), false)
                chart.series[1].setData(serialize(login), false)
                chart.series[2].setData(serialize(noLogin), false)
            }

            chart.redraw()
        } catch (e) {
            console.log(e)
        }
    }

    draw(param) {
        if (param) {
            this.darkModeYn = param
        }

        const {darkModeYn, chart} = this

        if (!chart || !chart.series) {
            return
        }

        try {
            if (darkModeYn === 'Y') {
                chart.series[0].update({
                    color: hcColors.stock.line.max.dark
                })
                chart.series[1].update({
                    color: 'rgba(0, 152, 238, 0.64)'
                })
                chart.series[2].update({
                    color: 'rgba(163, 163, 210, 0.7)'
                })

            } else {
                chart.series[0].update({
                    color: hcColors.stock.line.max.light
                })
                chart.series[2].update({
                    color: '#CFCFE4'
                })
            }

        } catch (e) {
            console.log(e)
        }
    }

    reset() {
        const {chart} = this
        while (chart.series.length) {
            chart.series[0].remove()
        }
    }
}