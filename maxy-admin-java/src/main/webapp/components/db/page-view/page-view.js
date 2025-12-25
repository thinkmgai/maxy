// noinspection JSUnresolvedReference
class MaxyPageView {
    constructor(options) {
        this.id = options.id
        this.func = options.func
        this.title = options.title
        this.comment = options.comment
        this.interval = {}
        this.dateType = ''
        this.list = []      // 버블 크기 정해줄 데이터를 담을 배열
        this.darkModeYn = sessionStorage.getItem('maxyDarkYn')
        this.data = ''
        this.packageNm = ''
        this.serverType = ''

        if (!this.id) {
            console.log('check parameter')
            return false
        }
    }

    async init() {
        const {id, comment} = this

        const source = await fetch(
            '/components/db/page-view/page-view.html')
            .then(response => response.text())
        const template = Handlebars.compile(source)
        const $target = $('#' + id)


        if (!($target.length > 0)) {
            throw 'can\'t find #' + id
        }

        $target.empty()
        const fmtTitle = i18next.tns('dashboard.component.title.pageview')
        $target.append(template({id, title: fmtTitle}))

        tippy('#' + id + ' .ic_question', {
            content: comment,
            placement: 'bottom',
            allowHTML: true,
            arrow: false,
            theme: 'maxy-tooltip'
        })

        this.$target = $target

        Highcharts.setOptions({
            lang: {
                thousandsSep: ','
            }
        });

        this.packageNm = $('#packageNm').val()
        this.serverType = $('#packageNm option:checked').data('server-type')

        this.chart = Highcharts.chart(id + '__chart', {
                chart: {
                    type: 'packedbubble'
                },
                legend: {
                    enabled: false
                },
                colors: [hcColors.pageview.background.normal.light],
                title: {
                    text: '',
                    align: 'left',
                    style: {
                        fontSize: '15px',
                        fontWeight: '600',
                    },
                },
                // 툴팁 세팅
                tooltip: {
                    enabled: true,
                    shared: true,
                    headerFormat: '',
                    formatter: function () {
                        const {point} = this

                        // crash 버블이 아닌 경우
                        if (!point || !point.crash) {
                            try {
                                return point.reqUrl + ' (' + point.value.toLocaleString() + ')'
                                    + '<br>' +
                                    'Error: ' + '<b>' + point.errorCount.toLocaleString() + '</b>'
                            } catch (e) {
                            }
                        }
                        // crash 버블은 crash 데이터만 표시하도록
                        else {
                            return point.reqUrl + ' (' + point.value.toLocaleString() + ')'
                                + '<br>' +
                                'Crash: ' + '<b>' + point.crash.toLocaleString() + '</b>'
                        }
                    }
                },

                plotOptions: {
                    series: {
                        animation: false, // 모든 애니메이션 비활성화
                        turboThreshold: 0 // 대량 데이터 처리 최적화
                    },
                    packedbubble: {
                        // 버블 최대,최소 사이즈
                        layoutAlgorithm: {
                            splitSeries: false,
                            gravitationalConstant: 0.02
                        }
                    }
                },
                yAxis: [{
                    labels: {
                        format: '{value:,.0f}'
                    }
                }],
                series: [
                    {
                        data: [],
                        point: {
                            events: {
                                click: this.openDetailPopup.bind(this)
                            }
                        }
                    }
                ]
            }
        )
    }

    setData(data) {
        const {chart} = this

        try {
            if (data) {
                this.data = data
                this.list = []

                let min, max;

                // crash 버블 생성
                for (let i = 0; i < data.length; i++) {
                    const name = getPageList(this.packageNm, this.serverType, data[i].reqUrl)
                    if (data[i].crashCount > 0) {
                        data.push({
                            'name': name,
                            'value': data[i].value,
                            'crash': data[i].crashCount,
                            'reqUrl': data[i].reqUrl
                        })
                    }
                    this.list.push(data[i].value)

                    // 데이터의 최소, 최대값 구하기
                    min = Math.min(...this.list)
                    max = Math.max(...this.list)

                    data[i].name = name
                    data[i].percentage = Math.floor(data[i].value / max * 100)
                }

                let minSize, maxSize
                if (data.length > 25) {
                    minSize = '80%'
                    maxSize = '180%'
                } else {
                    minSize = '60%'
                    maxSize = '130%'
                }

                chart.update({
                    plotOptions: {
                        packedbubble: {
                            minSize: minSize,
                            maxSize: maxSize,
                            zMin: min,
                            zMax: max,
                            // 버블에 name 표시 조건은 특정 비율보다 클 때만 표시하도록 한다
                            dataLabels: {
                                enabled: true,
                                format: '{point.name}',
                                filter: {
                                    property: 'percentage',
                                    operator: '>=',
                                    value: '5'
                                },
                                style: {
                                    color: '',
                                    textOutline: 'none',
                                    fontWeight: '500'
                                }
                            }
                        }
                    }
                });

                if (chart.series[0]) {
                    chart.series[0].setData(data)
                } else {
                    chart.addSeries({
                        data: data,
                        point: {
                            events: {
                                click: this.openDetailPopup.bind(this)
                            }
                        }
                    }, true)
                }

                this.draw()
            }
        } catch (e) {
            console.log(e)
        }
    }

    draw(param) {
        try {
            if (param) {
                this.darkModeYn = param
            }

            let {chart, darkModeYn} = this

            if (!chart || !chart.series) {
                return
            }

            // error 수에 따라 버블 투명도 설정
            const points = chart.series[0].points

            points.forEach((point) => {
                // error, crash 없는 버블 (파란색 버블)
                if (point.errorCount === 0) {
                    if (darkModeYn === 'Y') {
                        point.update({
                            radius: 50,
                            marker: {
                                lineColor: hcColors.pageview.line.normal.dark
                            },
                            color: hcColors.pageview.background.normal.dark,
                        })
                    } else {
                        point.update({
                            marker: {
                                lineColor: hcColors.pageview.line.normal.light
                            },
                            color: hcColors.pageview.background.normal.light,
                        })
                    }
                }
                // errorCount 있는 버블 (노란색)
                if (point.errorCount > 0
                    && point.crash === undefined) {
                    if (darkModeYn === 'Y') {
                        point.update({
                            radius: 50,
                            marker: {
                                lineColor: hcColors.pageview.line.error.dark
                            },
                            color: hcColors.pageview.background.error.dark,
                        })
                    } else {
                        point.update({
                            marker: {
                                lineColor: hcColors.pageview.line.error.light
                            },
                            color: hcColors.pageview.background.error.light
                        })
                    }
                }

                // crash가 있으면 버블을 핑크로 변경
                if (point.crash > 0) {
                    if (darkModeYn === 'Y') {
                        point.update({
                            radius: 50,
                            marker: {
                                lineColor: hcColors.pageview.line.crash.dark
                            },
                            color: hcColors.pageview.background.crash.dark,
                        });
                    } else {
                        point.update({
                            marker: {
                                lineColor: hcColors.pageview.line.crash.light
                            },
                            color: hcColors.pageview.background.crash.light
                        });
                    }
                }
            })
            //this.refresh(darkModeYn)
        } catch (e) {
            console.log(e)
        }
    }

    refresh(darkModeYn) {
        try {
            let params

            if (darkModeYn === 'Y') {
                params = {
                    lineColor: hcColors.pageview.line.normal.dark,
                    radius: 50,
                    backgroundColor: [hcColors.pageview.background.normal.dark],
                    fontColor: hcColors["dark-font"]
                }

            } else {
                params = {
                    lineColor: hcColors.pageview.line.normal.light,
                    backgroundColor: [hcColors.pageview.background.normal.light],
                    fontColor: hcColors["day-font"]
                }
            }
            params.target = this.chart
            this.chartUpdate(params)
        } catch (e) {
            console.log(e)
        }
    }

    chartUpdate(params) {
        try {
            params.target.update(
                {
                    marker: {
                        lineColor: params.lineColor,
                        radius: params.radius
                    },
                    colors: params.backgroundColor,
                    plotOptions: {
                        packedbubble: {
                            dataLabels: {
                                style: {
                                    color: params.fontColor
                                }
                            }
                        }
                    }
                });
        } catch (e) {
            console.log(e)
        }
    }


    // 버블 클릭 시 팝업 열기
    openDetailPopup(data) {
        const {point} = data
        const {crash, errorCount, name, reqUrl} = point

        if (!errorCount && !crash) {
            toast(trl('dashboard.msg.errorNcrashPopup'))
            return
        }
        const options = {
            appendId: 'maxyPopupWrap',
            id: 'pageView',
            title: name,
            reqUrl: reqUrl,
            dateType: 'D',
            to: new Date().getTime(),
            logType: crash ? 'crash' : 'error',
            'popupType': 'Page View'
        }

        new MaxyPopupLogListByUser(options)
    }

    reset() {
        const {chart} = this
        while (chart.series.length) {
            chart.series[0].remove()
        }
    }
}