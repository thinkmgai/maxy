class MaxyFrontWebPerfMetric {
    constructor(props) {
        this.id = props.id
        this.targetPage = props.targetPage
        this.from = null
        this.to = null
        this.target = ['platform', 'os', 'browser']
        this.table = {}
        this.chart = {}

        // Core Vital별 상태 기준 값, NEEDS_IMPROVEMENT 이상일 경우 POOR
        this.THRESHOLDS = {
            LCP: {GOOD: 2500, NEEDS_IMPROVEMENT: 4000},
            INP: {GOOD: 200, NEEDS_IMPROVEMENT: 500},
            CLS: {GOOD: 0.1, NEEDS_IMPROVEMENT: 0.25},
            FCP: {GOOD: 1800, NEEDS_IMPROVEMENT: 3000},
        }

        this.create().then(() => {
        })
    }

    async create() {
        const v = this

        v.initChart()
        v.initTable()
    }

    initChart() {
        const v = this
        const {target} = v

        // v.chart 객체 초기화
        v.chart = {}

        // target 배열을 반복하여 각각의 차트 생성
        target.forEach(chartTarget => {
            const chartId = `${chartTarget}Chart`

            // 해당 ID가 실제 DOM에 있는지 확인 (없으면 건너뜀)
            if (!$(`#${chartId}`).length) {
                console.warn(`#${chartId} 요소가 존재하지 않습니다.`)
                return
            }

            v.chart[chartTarget] = Highcharts.chart(chartId, {
                chart: {
                    plotBackgroundColor: null,
                    plotBorderWidth: null,
                    plotShadow: false,
                    type: 'pie'
                },
                title: {
                    text: ''
                },
                tooltip: {
                    headerFormat: '',
                    pointFormat: '{point.name}: <b>{point.y:,.0f} ({point.percentage:.1f}%)</b>'
                },
                accessibility: {
                    point: {
                        valueSuffix: '%'
                    }
                },
                colors: hcColors.pie.background.light,
                plotOptions: {
                    pie: {
                        allowPointSelect: true,
                        cursor: 'pointer',
                        dataLabels: {
                            enabled: false
                        },
                        showInLegend: true
                    }
                },
                series: [{
                    name: chartTarget.charAt(0).toUpperCase() + chartTarget.slice(1),
                    colorByPoint: true,
                    data: []
                }]
            })
        })
    }

    initTable() {
        const v = this
        const {target} = v

        target.forEach(item => {
            const selector = `#${item}List`

            // 해당 ID가 실제 DOM에 있는지 확인 (없으면 건너뜀)
            if (!$(selector).length) {
                console.warn(`${selector} 요소가 존재하지 않습니다.`)
                return
            }

            v.table[item] = new Tabulator(selector, {
                selectableRows: 1,
                height: '40vh',
                renderVertical: "basic",
                layout: 'fitDataFill',
                placeholder: 'Data is being processed',
                columns: [
                    {
                        title: 'Name',
                        field: 'name',
                        width: '25%',
                        formatter: (cell) => {
                            const data = cell.getData()
                            const name = data.name
                            const version = data.version

                            // name과 version 둘 다 없을 때
                            if (!name && !version) return '-'

                            // name만 있을 때
                            if (name && !version) return name

                            // name과 version 둘 다 있을 때
                            return `${name} ${version}`
                        }
                    },
                    {
                        title: 'View',
                        field: 'count',
                        width: '21%',
                        cssClass: "right-align",
                        formatter: cell => {
                            const value = cell.getValue()

                            if (!value) {
                                return '-'
                            } else {
                                return util.comma(value)
                            }
                        }
                    },
                    {
                        title: 'LCP',
                        field: 'lcp',
                        vertAlign: 'middle',
                        hozAlign: 'center',
                        width: '16%',
                        cssClass: "right-align",
                        formatter: (cell) => {
                            if(cell.getData().lcp === ''){
                                return `<span class='btn_yn none'>-</span>`
                            }
                            const lcp = Number(cell.getData().lcp).toFixed(0)
                            const lcpTxt = lcp / 1000 + 's'

                            if (lcp < v.THRESHOLDS.LCP.GOOD) {
                                return `<span class='btn_yn good'>${lcpTxt}</span>`
                            } else if (lcp >= v.THRESHOLDS.LCP.GOOD && lcp < v.THRESHOLDS.LCP.NEEDS_IMPROVEMENT) {
                                return `<span class='btn_yn improve'>${lcpTxt}</span>`
                            } else {
                                return `<span class='btn_yn poor'>${lcpTxt}</span>`
                            }
                        }
                    },
                    {
                        title: 'INP',
                        field: 'inp',
                        vertAlign: 'middle',
                        hozAlign: 'center',
                        width: '16%',
                        cssClass: "right-align",
                        formatter: (cell) => {
                            if(cell.getData().inp === ''){
                                return `<span class='btn_yn none'>-</span>`
                            }
                            const inp = Number(cell.getData().inp).toFixed(0)
                            if (inp < v.THRESHOLDS.INP.GOOD) {
                                return `<span class='btn_yn good'>${inp}ms</span>`
                            } else if (inp >= v.THRESHOLDS.INP.GOOD && inp < v.THRESHOLDS.INP.NEEDS_IMPROVEMENT) {
                                return `<span class='btn_yn improve'>${inp}ms</span>`
                            } else {
                                return `<span class='btn_yn poor'>${inp}ms</span>`
                            }
                        }
                    },
                    {
                        title: 'CLS',
                        field: 'cls',
                        vertAlign: 'middle',
                        hozAlign: 'center',
                        width: '16%',
                        cssClass: "right-align",
                        formatter: (cell) => {
                            if(cell.getData().cls === ''){
                                return `<span class='btn_yn none'>-</span>`
                            }
                            const cls = (Number(cell.getData().cls) === 0 ? 0 : Number(cell.getData().cls).toFixed(4))
                            if (cls < v.THRESHOLDS.CLS.GOOD) {
                                return `<span class='btn_yn good'>${cls}</span>`
                            } else if (cls >= v.THRESHOLDS.CLS.GOOD && cls < v.THRESHOLDS.CLS.NEEDS_IMPROVEMENT) {
                                return `<span class='btn_yn improve'>${cls}</span>`
                            } else {
                                return `<span class='btn_yn poor'>${cls}</span>`
                            }
                        }
                    },
                ]
            })

            v.table[item].on('rowClick', (e, row) => {

                // 다른 테이블의 선택된 행 초기화
                v.target.forEach(otherItem => {
                    if (otherItem !== item && v.table[otherItem]) {
                        // Tabulator의 선택 해제
                        v.table[otherItem].deselectRow();

                        // 기존 selectedRow가 있으면 클래스 제거
                        if (v.table[otherItem].selectedRow) {
                            v.table[otherItem].selectedRow.getElement().classList.remove('selected_row')
                        }

                        // selectedRow와 selectedData 초기화
                        v.table[otherItem].selectedRow = null
                        v.table[otherItem].selectedData = null
                    }
                })

                // 현재 테이블의 이전 선택 해제
                if (v.table[item].selectedRow) {
                    v.table[item].selectedRow.getElement().classList.remove('selected_row')
                }

                // 새로운 선택 적용
                row.getElement().classList.add('selected_row')
                v.table[item].selectedRow = row
                v.table[item].selectedData = row.getData()

                v.getList(e, v.table[item].selectedData)
            })
        })
    }

    setTableData(data, target) {
        const v = this

        if (data) {
            // target 값으로 v.table의 속성에 동적 접근
            const tableInstance = v.table[target]
            // 테이블 선택행 초기화
            v.table[target].selectedRow = null

            if (tableInstance) {
                tableInstance.setData(data)
            } else {
                console.warn(`v.table.${target} 이(가) 존재하지 않습니다.`)
            }
        }
    }

    setChartData(data, target) {
        const v = this

        if (data && data.length > 0) {
            const chartInstance = v.chart[target]

            // highcharts의 pie차트 데이터 형식에 맞게 변환 (count -> y)
            if (chartInstance) {
                const chartData = data.map(item => ({
                    name: item.name,
                    y: item.count
                }))

                chartInstance.series[0].setData(chartData)
            }
        }
    }

    getList(e, data) {
        const v = this
        const {targetPage} = v
        const {time} = targetPage.v
        const {from, to} = time

        let parentId = e.target.closest('[id]')?.id.replace(/List$/, '')
        let title

        if (parentId === 'os') {
            parentId = parentId + 'Type'
            title = 'OS'
        } else if (parentId === 'browser') {
            parentId = 'deviceModel'
            title = 'Browser'
        } else if (parentId === 'platform') {
            title = 'Platform'
        }

        const options = {
            appendId: 'maxyPopupWrap',
            id: parentId + 'Popup',
            type: 'Page View',
            from: from,
            to: to,
            logType: 'page',
            topChartId:'webVital',
            botChartId: 'waterfall',
            title: title,
            searchType: parentId,
            searchValue: data.name,
        }

        new MaxyFrontPopupPageView(options)
    }

    /**
     * 차트 데이터 초기화
     * 모든 차트와 테이블의 데이터를 초기 상태로 리셋
     */
    clear() {
        const v = this

        const {target, table, chart} = v

        target.forEach(item => {
            try {
                // 테이블 초기화
                if (table[item]) {
                    if (table[item].rowManager.renderer) {
                        table[item].clearData()
                    }
                } else {
                    toast('오류가 발생하였습니다.')
                }
            } catch (e) {
                console.log(e)
                toast('오류가 발생하였습니다.')
            }

            try {
                // 차트 초기화
                if (chart[item]) {
                    if (chart[item].series[0]) {
                        chart[item].series[0].setData([])
                    } else {
                        toast('오류가 발생하였습니다.')
                    }
                }
            } catch (e) {
                console.log(e)
                toast('오류가 발생하였습니다.')
            }
        })
    }

    clearTable() {
        const v = this
        if (v.table.rowManager.renderer) {
            v.table.clearData()
        }
    }

}
