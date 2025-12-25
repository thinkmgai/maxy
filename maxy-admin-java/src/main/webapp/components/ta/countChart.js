class CountChart {
    constructor(props) {
        this.id = props.id
        this.chart = null
        this.rd1 = 112
        this.rd2 = this.rd1 - 20
        this.targetPage = props.targetPage

        this.create()
    }

    create() {
        const darkYn = sessionStorage.getItem('maxyDarkYn')

        this.chart = Highcharts.chart(this.id, {
            chart: {
                type: 'solidgauge',
                height: '80%',
                events: {
                    load: function () {
                        // 차트 그려줄때 로딩바 켜주기
                        util.chartLoading(this, true)
                    },
                    // 도넛그래프 가운데 today, total 표시
                    render: function () {
                        let chart = this,
                            centerX = (chart.plotWidth + 20) / 2,
                            centerY = (chart.plotHeight - 10) / 2,
                            text = '';

                        if (!chart.customLabel) {
                            const labelColor = darkYn === 'Y' ? 'white' : 'black'
                            chart.customLabel = chart.renderer
                                .text(text, centerX, centerY)
                                .css({
                                    color: labelColor,
                                    fontSize: '23px',
                                    fontWeight: 'bold',
                                    textAnchor: 'middle'
                                })
                                .add();
                        } else {
                            chart.customLabel.attr({
                                text: text,
                                x: centerX,
                                y: centerY
                            });
                        }
                    }
                }
            },
            tooltip: {
                shape: 'square',
                enabled: true,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderColor: 'black',
                borderRadius: 5,
                borderWidth: 0,
                positioner: function (labelWidth, labelHeight, point) {
                    const {plotX, plotY} = point

                    return {
                        x: (plotX - 50) + (labelWidth / 2),
                        y: plotY + (labelHeight * 2)
                    };
                }
            },
            pane: {
                startAngle: 0,
                endAngle: 360,
                background: [{
                    outerRadius: this.rd2 + '%',
                    innerRadius: this.rd1 + '%',
                    backgroundColor: Highcharts.color('#000')
                        .setOpacity(0.05)
                        .get(),
                    borderWidth: 0
                }]
            },
            yAxis: {
                min: 0,
                max: 100,
                lineWidth: 0,
                tickPositions: []
            },
            plotOptions: {
                solidgauge: {
                    dataLabels: {
                        enabled: false
                    },
                    linecap: 'round',
                    stickyTracking: false,
                    rounded: true
                }
            },
            series: [{
                name: '전 일 대비'
            }]
        })
    }

    setData(data) {
        const {chart, targetPage} = this
        // type : error, crash, page
        let type = sessionStorage.getItem('la-tab');
        if(type === "page") type += "View"
        // from, to가 하루이상 차이날 경우 차트색상 없애기
        const rangeFromDt = new Date(targetPage.v.time.searchFrom).getTime()
        const rangeToDt = new Date(targetPage.v.time.searchTo).getTime()
        const diff = Math.floor(util.getDateDiff(rangeFromDt, rangeToDt))

        const today = data[type] // Today
        const yda = data[type + 'YDA'] // Yesterday
        const total = data[type + 'Total'] // Total Count
        const pct = util.percent(today, yda) // 어제대비 오늘 비율

        const option = {
            pct: pct,
            today: util.comma(today),
            yda: util.comma(yda),
            total: util.comma(total)
        }

        let colorY;
        if (type === "error") {
            option.title = 'Error'
            colorY = 'rgb(252,199,0)'
        } else if (type === "crash") {
            option.title = 'Crash'
            colorY = 'rgb(255,105,105)'
        } else {
            option.title = 'Page View'
            colorY = 'rgb(114,119,255)'
        }

        const diffColor = Highcharts.color('#000').setOpacity(0.03).get()

        // from,to가 하루 이상이면 차트색상 #000
        const dataPoint = {
            color: diff === 0 ? colorY : diffColor,
            radius: this.rd1 + '%',
            innerRadius: this.rd2 + '%',
            y: diff === 0 ? option.pct : 100,
            option
        }

        // from,to가 하루 이상이면 true, 아니면 false
        chart.update({
            tooltip: {
                enabled: diff === 0
            }
        }, false)

        chart.series[0].update({
            data: [dataPoint],
            tooltip: {
                pointFormat:
                    '<div style="text-align: center; font-size: 13px;">Today: {point.y}%' + '</div>'
                    + '<br>'
                    + '<div style="text-align: center;">Yesterday: {point.option.yda}' + '</div>'
            },
        }, false)

        this.redraw()
    }

    redraw() {
        const {chart} = this
        // type : error, crash, page
        const type = sessionStorage.getItem('la-tab');
        const darkYn = sessionStorage.getItem('maxyDarkYn')
        const countColor = darkYn === 'Y' ? '#fff' : '#000'
        const paneColor = darkYn === 'Y' ? '#ffffff' : 'rgba(0,0,0,0.05)'

        let typeLabel, labelColor
        if(type === "error"){
            typeLabel = 'Error'
            labelColor = '#FFC700'
        }else if(type === "crash"){
            typeLabel = 'Crash'
            labelColor = '#FF6969'
        }else{
            typeLabel = 'PV'
            labelColor = '#7277FF'
        }

        chart.pane[0].options.background[0].backgroundColor = Highcharts.color(paneColor).setOpacity(0.05).get();
        chart.update(chart.options, true) // 변경 즉시 차트 다시 그림

        const today = chart.series[0].data[0].option.today
        const total = chart.series[0].data[0].option.total

        // tooltip 만들어주기
        chart.customLabel.attr('text',
            '<span style="font-size: 22px;">' + typeLabel + '</span><br/>' +
            '<span style="font-size: 22px; color:' + countColor + ';">' + today.toLocaleString() + '</span><br/>' +
            '<span style="font-size: 17px; color:' + countColor + ';">(' + total.toLocaleString() + ')</span>'
        )

        chart.customLabel.css({
            fill: labelColor,
            color: labelColor,
            fontSize: '28px',
            fontWeight: 'bold',
            textAnchor: 'middle'
        });

        // 로딩바 꺼주기
        util.chartLoading(chart, false)
    }

    /**
     * 차트 데이터 초기화
     */
    clear() {
        //util.chartLoading(this.chart, true)
        this.chart.series[0].setData([])
    }
}