class MaxyResourceUsage {
    constructor(options) {
        this.id = options.id
        this.title = options.title
        this.comment = options.comment
        this.func = options.func
        this.colors = ['#009ff9', '#7277ff', '#35da9e', '#FFC700', '#FF6969', '#00b39c']
    }

    async init() {
        const {id, comment} = this

        const source = await fetch(
            '/components/db/resource-usage/resource-usage.html'
        ).then(response => response.text())
        const template = Handlebars.compile(source)
        const $target = $('#' + id)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + id
        }

        const fmtTitle = i18next.tns('dashboard.component.title.resourceusage')
        $target.empty()
        $target.append(template({id, fmtTitle}))
        updateContent()
        tippy('#' + id + ' .ic_question', {
            content: comment,
            placement: 'bottom',
            allowHTML: true,
            arrow: false,
            theme: 'maxy-tooltip'
        })

        const types = ['cpu', 'mem']
        types.forEach(type => {
            this[type + 'Chart']
                = Highcharts.chart('ruItem__' + type + '__' + id + '__chart', {
                chart: {
                    zoomType: 'x',
                    marginBottom: 87
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
                yAxis: [{
                    labels: {
                        style: {
                            color: 'black'
                        }
                    },
                    title: {
                        text: ''
                    },
                    opposite: true
                }, {
                    gridLineWidth: 0,
                    title: {
                        text: '',
                        style: {
                            color: 'black'
                        }
                    },
                    labels: {
                        style: {
                            color: 'black'
                        }
                    }
                }],
                legend: {
                    layout: 'horizontal',
                    align: 'center',
                    verticalAlign: 'bottom',
                    floating: false,
                    itemMarginTop: 10,
                    itemMarginBottom: -10,
                },
                plotOptions: {
                    series: {
                        turboThreshold: 0,
                        animation: false,
                        boostThreshold: 0,
                        crisp: false, //선명하게 그리기 위해 각점을 반올림하는 옵션, 체감은 안되지만 계산을 줄이는 효과 기대
                        pointInterval: 2, //시간 표현 간격을 조정한다. default는 1, 문자열을 줄여서 성능향상 기대
                    },
                },
                series: []
            })

            if (type === 'cpu') {
                this[type + 'Chart'].update({
                    yAxis: [{
                        labels: {
                            format: '{value}%',
                            style: {
                                color: 'black'
                            }
                        },
                        title: {
                            text: ''
                        },
                        opposite: true
                    }, {
                        gridLineWidth: 0,
                        title: {
                            text: '',
                            style: {
                                color: 'black'
                            }
                        },
                        labels: {
                            style: {
                                color: 'black'
                            }
                        }
                    }],
                    tooltip: {
                        formatter: function() {
                            if (this.points && this.points.length) {
                                return this.points.map(point =>
                                    `<span style="color:${point.color}">\u25CF</span> ${point.series.name}: <b>${point.y}%</b><br/>`
                                ).join('')
                            } else {
                                return `<span style="color:${this.color}">\u25CF</span> ${this.series.name}: <b>${this.y}%</b>`
                            }
                        }
                    }
                })
            } else if (type === 'mem') {
                this[type + 'Chart'].update({
                    yAxis: [{
                        labels: {
                            formatter: function () {
                                return util.convertMem('kb', this.value)
                            },
                            style: {
                                color: 'black'
                            }
                        },
                        title: {
                            text: ''
                        },
                        opposite: true
                    }, {
                        gridLineWidth: 0,
                        title: {
                            text: '',
                            style: {
                                color: 'black'
                            }
                        },
                        labels: {
                            style: {
                                color: 'black'
                            }
                        }
                    }],
                    tooltip: {
                        formatter: function () {
                            // kb를 mb로 변환하여 툴팁에 보여줌
                            if (this.points && this.points.length) {
                                return this.points.map(point =>
                                    `<span style="color:${point.color}">\u25CF</span> ${point.series.name}: <b>${util.convertMem('kb', point.y)}</b><br/>`
                                ).join('')
                            } else {
                                return `<span style="color:${this.color}">\u25CF</span> ${this.series.name}: <b>${util.convertMem('kb', this.y)}</b>`
                            }
                        }

                    },
                })
            }
        })
    }

    addEventListener() {
        const { id } = this
        const v = this
        const $container = $('#' + id)
        const $showAllResource = $('#showAllResource')

        $container.on('click', '.btn_tab', function () {
            const $this = $(this)
            const tab = $this.data('tab')

            const $btnTabs = $container.find('.btn_tab')
            $btnTabs.addClass('on')
            $this.siblings('.btn_tab').removeClass('on')

            const $maxyComponentItemWrap = $container.find('.maxy_component_item_wrap')
            $maxyComponentItemWrap.addClass('hidden')
            $('#' + tab).removeClass('hidden')
            v.draw()
        })

        $showAllResource.on('click', function () {
            v.getAllData()
        })
    }

    draw(data) {
        const v = this

        try {
            if (data) {
                this.data = data
            } else {
                data = this.data
            }

            v.deviceModelList = []

            // cpu 또는 mem이 undefined일 때도 안전하게 처리
            const cpuList = data?.cpu || []
            const memList = data?.mem || []

            if (cpuList.length === 0 && memList.length === 0) {
                return
            }

            for (const device of data.cpu) {
                v.deviceModelList.push(device.deviceModel)
            }

            for (let key of Object.keys(data)) {
                const obj = data[key]
                const models = []
                const values = []
                for (let d of obj) {
                    models.push(getDeviceModel(d.deviceModel))
                    values.push(d.values)
                }
                // this에 cpuChart, memChart가 없는 경우
                const chart = this[key + 'Chart']
                if (!chart) {
                    console.log('no')
                    return
                }
                while (chart.series.length) {
                    chart.series[0].remove()
                }
                for (let i = 0; i < models.length; i++) {
                    chart.addSeries({
                        name: models[i],
                        data: values[i],
                        type: 'spline',
                        color: this.colors[i]
                    }, true)
                }

                $('#showAllResource').show()
            }
        } catch (e) {
            console.log(e)
        }
    }

    reset() {
        const types = ['cpu', 'mem']
        types.forEach(type => {
            const chart = this[type + 'Chart']
            while (chart.series.length) {
                chart.series[0].remove()
            }
        })
    }

    getAllData() {
        const v = this;
        const options = {
            appendId: 'maxyPopupWrap',
            id: 'resource',
            deviceList: v.deviceModelList

        }
        new MaxyPopUpUsageList(options)
    }
}