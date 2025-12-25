class MaxyWordCloudChart {
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

        this.init().then(function () {
        })
    }

    async init() {
        const {id, data} = this
        const $target = $('#' + id)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + id
        }

        $target.empty()

        Highcharts.chart(id, {
            accessibility: {
                screenReaderSection: {
                    beforeChartFormat: '<h5>{chartTitle}</h5>' +
                        '<div>{chartSubtitle}</div>' +
                        '<div>{chartLongdesc}</div>' +
                        '<div>{viewTableButton}</div>'
                }
            },
            series: [{
                type: 'wordcloud',
                data,
                name: '빈도'
            }],
            tooltip: {
                headerFormat: '<span style="font-size: 16px"><b>{point.key}</b></span><br>'
            }
        });

    }

    draw(data) {

    }

    run() {

    }
}