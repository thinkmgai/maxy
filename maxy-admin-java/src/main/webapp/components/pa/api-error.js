class ApiError {
    constructor(props) {
        this.id = props.id
        this.chart = null
        this.table = null
        this.targetPage = props.targetPage
        this.from = null
        this.to = null

        this.create().then(() => {
            //this.setData()
        })
    }

    async create() {
        const v = this

        this.chart = Highcharts.chart('apiErrorChart', {
            apiErrorInstance: this, // API Error 인스턴스 참조 추가
            chart: {
                zoomType: 'x',
                zooming: {
                    mouseWheel: {
                        enabled: false
                    }
                },
                events: {
                    selection: function (event) {
                        v.from = Math.round(event.xAxis[0].min)
                        v.to = Math.round(event.xAxis[0].max)

                        // TODO : 지금은 interval이 5분 고정인데 시간차에 따라 interval이 동적으로 변하면 수정해야함
                        // 선택한 max시간값과 차트 xAxis의 max시간이 같으면 interval만큼 더해주기
                        const toDate = util.timestampToDate(v.to)
                        const toHHmm = util.timestampToHourMin(v.to, 'HHmm')
                        const dataMaxDate = util.timestampToDate(event.xAxis[0].axis.dataMax)
                        const dataMaxHHmm = util.timestampToHourMin(event.xAxis[0].axis.dataMax, 'HHmm')

                        if (toDate === dataMaxDate && toHHmm === dataMaxHHmm) {
                            v.to += 5 * 60 * 1000 - 1 // 4분 59.999초
                        }

                        // 외부에서 인스턴스에 접근할 수 있도록 설정
                        const apiErrorInstance = this.options.apiErrorInstance

                        // 선택된 범위를 CoreVital 인스턴스에 저장하고 데이터 갱신 함수 호출
                        if (apiErrorInstance) {
                            apiErrorInstance.updateSelectedRange()
                        }

                        return false // 선택 이벤트를 방지하려면 false를 반환합니다.
                    }
                }
            },
            xAxis: [{
                type: 'datetime',
                labels: {
                    formatter: function () {
                        return Highcharts.dateFormat('%H:%M', this.value);
                    }
                },
                crosshair: true
            }],
            plotOptions: {
                series: {
                    label: {
                        connectorAllowed: false
                    },
                }
            },
            series: [{
                name: '3XX',
                data: []
            }, {
                name: '4XX',
                data: []
            }, {
                name: '5XX',
                data: []
            }],
            responsive: {
                rules: [{
                    condition: {
                        maxWidth: 500
                    },
                    chartOptions: {
                        legend: {
                            layout: 'horizontal',
                            align: 'center',
                            verticalAlign: 'bottom'
                        }
                    }
                }]
            }
        })

        const packageNm = sessionStorage.getItem('packageNm')
        const serverType = sessionStorage.getItem('serverType')

        this.table = new Tabulator("#apiErrorTable", {
            selectableRows: 1,
            layout: 'fitDataFill',
            placeholder: 'Data is being processed',
            // rowFormatter: this.rowFormatter,
            columns: [
                {
                    title: 'Request URL',
                    field: 'reqUrl',
                    width: "60%",
                    formatter: (cell) => {
                        return getPageList(packageNm, serverType, cell.getValue())
                    }
                },
                {
                    title: 'Error Count',
                    field: 'count',
                    width: '15%',
                    vertAlign: 'middle',
                    hozAlign: 'center',
                    formatter: cell => {
                        return util.comma(cell.getValue())
                    }
                },
                {
                    title: 'Status',
                    field: 'statusCode',
                    width: '12%',
                    vertAlign: 'middle',
                    hozAlign: 'center',
                    formatter: cell => {
                        return cell.getValue() > 0 ? cell.getValue() : '-'
                    }
                }, {
                    title: 'Ratio',
                    field: 'ratio',
                    width: '12%',
                    vertAlign: 'middle',
                    hozAlign: 'center',
                    formatter: cell => {
                        const value = cell.getValue().toFixed(2);
                        // 소수점이 .00으로 끝나면 정수부분만 표시
                        return value.endsWith('.00') ? value.substring(0, value.length - 3) + '%' : value + '%';
                    }
                },

            ]
        })

        this.table.on('rowClick', PA0000.func.draw.apiError.tablePopup.bind(this))
    }

    setErrorChartData(data) {
        const v = this

        if (data.length === 0) return

        const redirectError = data['3xx'] ?? []
        const clientError = data['4xx'] ?? []
        const serverError = data['5xx'] ?? []

        v.chart.series[0].setData(redirectError)
        v.chart.series[1].setData(clientError)
        v.chart.series[2].setData(serverError)
    }

    setTableData(data) {
        // api error 차트 데이터 설정
        const v = this

        // 테이블에 데이터 설정
        v.table.setData(data)
    }

    /**
     * 차트 데이터 초기화
     */
    clear() {
        const v = this

        v.chart.series.forEach(series => {
            series.setData([])
        })

        if (v.table.rowManager.renderer) {
            v.table.clearData()
        }
    }

    clearTable() {
        const v = this
        if (v.table.rowManager.renderer) {
            v.table.clearData()
        }
    }

    updateSelectedRange() {
        // 타겟 페이지의 getApiErrorList 함수 호출
        if (this.targetPage && this.targetPage.func && this.targetPage.func.fetch &&
            this.targetPage.func.fetch.apiError && this.targetPage.func.fetch.apiError.getApiErrorList) {

            this.targetPage.func.fetch.apiError.getApiErrorList()
        }
    }
}