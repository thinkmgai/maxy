class MaxyTodayUseChart {
    constructor(options) {
        this.id = options.id
        this.size = options.size
        this.data = options.data

        if (!this.id || !this.size || !this.data) {
            console.log('check parameter')
            return false
        }

        
        this.init().then(() => {
        })
    }

    async init() {
        const {id, size, data} = this

        const $target = $('#' + id)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + id
        }
        $target.empty()

        if (size.height) {
            $target.css('height', size.height)
        }
        if (size.width) {
            $target.css('width', size.width)
        }
        if (data) {
            this.draw(data)
        }
    }

    draw(data) {
        this.data = data;
        const totalData = {
            "total": [
                ['일반', data.series[1].data[0]],
                ['vip', data.series[1].data[1]],
                ['활성', data.series[1].data[2]],
                ['비활성', data.series[1].data[3]]
            ]
        }

        const todayData = {
            "total": [
                ['일반', data.series[0].data[0]],
                ['vip', data.series[0].data[1]],
                ['활성', data.series[0].data[2]],
                ['비활성', data.series[0].data[3]]
            ]
        }

        Highcharts.chart('todayUseChart', {
            credits: {
              enabled: false
            },
            chart: {
                type: 'column',
            },
            title: {
                text: 'TodayUseChart',
                align: 'left'
            },

            xAxis: {
                categories: data.categories
            },

            yAxis: {
                visible: true,
                title: {
                    text: ""
                }
            },

            exporting: {
                enabled: false
            },

            colors: ['#E4E4E4', '#8B8FFF'],

            tooltip: {
                enabled: true
            },

            legend: {
                layout: 'horizontal',
                align: 'right',
                verticalAlign: 'top',
                floating: false,
                backgroundColor:
                    Highcharts.defaultOptions.legend.backgroundColor || // theme
                    'rgba(255,255,255,0.25)'
            },

            plotOptions: {
                series: {
                    grouping: false,
                    borderWidth: 0,
                    dataLabels: {
                        enabled: true,
                    },
                    pointWidth: 15
                },
                column: {
                    dataLabels: {
                        enabled: true,
                        style: {
                            fontWeight: '0',
                            textShadow: false,
                            textOutline: false
                        },
                    }
                }
            },
            series: [{
                pointPlacement: 0,
                name: "전체",
                data: totalData["total"].slice()
            }, {
                name: "금일",
                data: todayData["total"].slice()
            }]
        });

    }
}