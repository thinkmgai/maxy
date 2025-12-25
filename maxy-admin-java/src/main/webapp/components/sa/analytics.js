// noinspection JSUnresolvedReference
class MaxyAnalysisChart {
    constructor(options) {
        this.id = options.id
        this.title = options.title
        this.type = options.type
        this.size = options.size
        this.data = options.data

        if (!this.id) {
            console.log('check parameter')
            return false
        }

        this.init().then(function() {

        })
    }

    async init() {
        const {id} = this
        const $target = $('#' + id)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + id
        }

        $target.empty()

        this.chart = Highcharts.chart(id, {
            chart: {
                // height: '200vh',
                type: 'line'
            },
            title: {
                text: ''
            },
            tooltip: {
                enabled: true,
                shared: true,
                pointFormat: 'User Rating: <b>{point.y:,.2f}</b><br/>'
            },
            xAxis: {
                type: 'datetime',
                labels: {
                    format: '{value:%Y-%m-%d}' // 'yyyy-MM' 형식으로 표시
                }
            },
            yAxis: {
                title: {
                    text: ''
                }
            },
            plotOptions: {
                line: {
                    dataLabels: {
                        enabled: false
                    },
                    enableMouseTracking: true
                }
            },
            series: [{
                name: 'User Rating',
                data: []
            }]
        });

    }

    setData(data) {
        const {chart} = this
        // 데이터가 없는 경우
        if (!data) {
            chart.series[0].setData([])
            return
        }

        const seriesData = []
        for(const item of data) {
            const id = item.id;
            seriesData.push({
                year: id.substring(0, 4),   // 0부터 4번째 글자까지 (년도)
                month: id.substring(5, 7),  // 5번째부터 7번째 글자까지 (월)
                date: id.substring(8, 10),  // 8번째부터 10번째 글자까지 (일)
                value: Number(item.user_rating).toFixed(2)
            });
        }

        const chartData = seriesData.map(item => [new Date(item.year, item.month - 1, item.date).getTime(), parseFloat(item.value)]);

        chart.series[0].setData(chartData)
    }
}