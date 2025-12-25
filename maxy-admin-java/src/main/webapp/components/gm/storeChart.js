class MaxyStoreChart {
    constructor(options) {
        this.id = options.id
        this.title = options.title
        this.type = options.type
        this.size = options.size
        this.data = options.data
        this.comment = options.comment ? options.comment : ''

        if (!this.id) {
            console.log('check parameter')
            return false
        }

        this.init().then(function () {
        })
    }

    async init() {
        const {id, title, size, data, type} = this
        const $target = $('#' + id)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + id
        }
        $target.empty()

        Highcharts.stockChart(id, {
            chart: {
                zoomType: 'x'
            },
            rangeSelector: {
                x: 1500,
                y: -10,
                buttons: [
                    {
                        type: 'week',
                        count: 1,
                        text: '1w',
                    }, {
                        type: 'week',
                        count: 2,
                        text: '2w',
                    }, {
                        type: 'week',
                        count: 3,
                        text: '3w',
                    },
                ],
                inputEnabled: false,
                selected: 2,
            },
            time: {
                useUTC: false
            },
            plotOptions: {
                series: {
                    pointWidth: 15
                }
            },
            tooltip: {
                shared: true
            },
            legend: {
                enabled: true,
                layout: 'horizontal',
                align: 'center',
                verticalAlign: 'bottom',
                floating: false,
                itemMarginTop: 15,
                itemMarginBottom: -15,
            },
            series: [{
                name: '실행',
                type: 'column',
                data: data.connectChartData,
                color: {
                    linearGradient: {x1: 0, x2: 0, y1: 0, y2: 1},
                    stops: [
                        [0, 'rgba(187, 204, 197, 1)'],
                        [0.7, 'rgba(207, 225, 218, 1)']
                    ]
                }
            }, {
                name: '휴면',
                type: 'column',
                data: data.sleepChartData,
                color: {
                    linearGradient: {x1: 0, x2: 0, y1: 0, y2: 1},
                    stops: [
                        [0, 'rgba(248, 216, 102, 1)'],
                        [0.7, 'rgba(255, 240, 192, 1)']
                    ]
                }
            }, {
                name: '삭제',
                type: 'column',
                data: data.deleteChartData,
                color: {
                    linearGradient: {x1: 0, x2: 0, y1: 0, y2: 1},
                    stops: [
                        [0, 'rgba(255, 105, 105, 1)'],
                        [0.7, 'rgba(255, 180, 180, 1)']
                    ]
                }
            }, {
                name: '정상',
                type: 'spline',
                data: data.normalChartData,
                color: 'rgba(0, 159, 249, 1)'
            }],
            // export 관련
            exporting: {
                enabled: false
            },
        });
    }

    draw(data) {

    }

    run() {

    }
}