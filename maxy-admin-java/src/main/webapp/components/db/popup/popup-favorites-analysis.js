/*
   종합 분석 > Favorites > All 팝업
*/
class MaxyPopupFavoritesAnalysis {
    constructor(options) {
        this.appendId = options.appendId
        this.id = options.id
        this.data = options.data
        this.selectedRow = null
        this.dateType = 'DAY'

        // 팝업 생성 후
        this.init().then(() => {
            this.addEventListener()
            this.openPopup()
        })
    }

    addEventListener() {
        const v = this
        $('.dimmed').on('click', () => {
            v.closePopup(v)
        })

        const toggle = (t) => {
            $(t).siblings('button').removeClass('on')
            $(t).addClass('on')
        }

        $('#' + v.id + '__popup' + ' .maxy_component_btn').on('click', function () {
            v.dateType = $(this).data('date')
            v.selectedRow = null
            toggle(this)
            v.getPageViewInfoList(v.dateType)
        })

        $('#favoritesAnalysisChartWrap .type_tab').on('click', this.toggleTab)
    }

    // 선택한 탭에 대한 데이터만 보여준다
    toggleTab(e) {
        const $clickedTab = $(e.target)

        const type = $clickedTab.data('type')
        // tab 선택
        const $tab = $('.type_tab')
        $tab.removeClass('selected')
        $clickedTab.addClass('selected')

        const $target = $('#favoritesAnalysisChartWrap .maxy_box')
        $target.removeClass('hidden')
        $target.hide()
        $('#' + type).show()
    }

    openPopup() {
        const {id} = this
        $('.dimmed').show()

        const $target = $('#' + id + '__popup')
        $target.show()

        this.getPageViewInfoList()
    }

    closePopup(v) {
        const popup = '#' + v.id + '__popup'
        const span = popup + ' span'
        const $dimmed = $('.dimmed')

        v.table.clearData()
        $(span).text('')
        $dimmed.off('click')
        $dimmed.hide()
        $(popup).hide()

        // 팝업 닫을 때 커서가 보이면 없애주도록
        const $cursor = $('.maxy_cursor_dots')
        if ($cursor.css('display') === 'block') {
            cursor.hide()
        }
    }

    async init() {
        const v = this
        const {id, appendId} = v
        const source = await fetch(
            '/components/db/popup/popup-favorites-analysis.html')
            .then(response => response.text())

        const template = Handlebars.compile(source)

        const $target = $('#' + appendId)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + appendId
        }
        $target.empty()
        $target.append(template({id}))

        this.initChart()
        const tableTarget = '#' + id + '__list'

        const columnNames = {
            'page': i18next.tns('common.tableColumn.page'),
            'count': i18next.tns('common.tableColumn.count'),
            'stayTime': i18next.tns('common.tableColumn.avgStayTime'),
            'loadingTime': i18next.tns('common.tableColumn.medLoadingTime'),
            'responseTime': i18next.tns('common.tableColumn.avgResponseTime'),
            'error': i18next.tns('dashboard.bi.error'),
            'crash': i18next.tns('dashboard.bi.crash'),
        }

        this.table = new Tabulator(tableTarget, {
            layout: 'fitDataFill',
            height: '35vh',
            placeholder: i18next.tns('common.msg.noData'),
            initialSort: [
                {
                    column: "count", dir:"desc"
                }
            ],
            columns: [
                {
                    title: columnNames.page,
                    field: "pageNm",
                    width: "24%"
                },
                {
                    title: columnNames.count,
                    field: "count",
                    sorter: "number", // 숫자 정렬 지정
                    width: "13%",
                    formatter: cell => {
                        return util.comma(cell.getValue())
                    }
                },
                {
                    title: columnNames.stayTime,
                    field: "intervaltime",
                    width: "13%",
                    formatter: cell => {
                        return util.convertTime(cell.getValue())
                    }
                },
                {
                    title: columnNames.loadingTime,
                    field: "loadingTime",
                    width: "13%",
                    formatter: cell => {
                        return util.convertTime(cell.getValue())
                    }
                },
                {
                    title: columnNames.responseTime,
                    field: "responseTime",
                    width: "13%",
                    formatter: cell => {
                        return util.convertTime(cell.getValue())
                    }
                },
                {
                    title: columnNames.error,
                    field: "errorCount",
                    width: "11%",
                    formatter: cell => {
                        return util.comma(cell.getValue())
                    }
                },
                {
                    title: columnNames.crash,
                    field: "crashCount",
                    width: "11%",
                    formatter: cell => {
                        return util.comma(cell.getValue())
                    }
                }
            ],
        })

        this.table.on('rowClick', (e, row) => {
            if (this.selectedRow) {
                this.selectedRow.getElement().classList.remove('selected_row')
            }

            row.getElement().classList.add('selected_row')
            this.selectedRow = row

            const rowData = row.getData()
            const dateType = $('#' + id + '__popup' + ' .maxy_component_btn.on').data('date')
            const param = {
                packageNm: $('#packageNm').val(),
                serverType: $('#packageNm option:checked').data('server-type'),
                osType: $('#osType').val(),
                dateType: dateType === undefined ? 'DAY' : dateType,
                reqUrl: rowData.reqUrl
            }

            ajaxCall('/db/0100/getFavoritesRowInfo.maxy', param, {disableDimmed: true})
                .then(data => {
                    cursor.hide()

                    this.setChartData(data)
                }).catch(error => {
                console.error(error)
            })
        })

        updateContent()
    }

    // 차트에 데이터 세팅 및 series 색 변경, series 이름 변경
    setChartData(data) {
        try {
            this.issueChart.update({
                series: [
                    {
                        name: 'Count'
                    },
                    {
                        name: 'Error',
                        color: '#FFC700'
                    },
                    {
                        name: 'Crash',
                        color: '#FF6969'
                    }
                ]
            })

            this.issueChart.series[0].setData(data.count)
            this.issueChart.series[1].setData(data.error)
            this.issueChart.series[2].setData(data.crash)

            this.performanceChart.update({
                series: [
                    {name: 'Loading Time (MED)'},
                    {name: 'Response Time (Avg.)'}
                ]
            })

            if (this.performanceChart.series.length > 2) {
                this.performanceChart.series[2].remove()
            }

            this.performanceChart.series[0].setData(data.loadingTime)
            this.performanceChart.series[1].setData(data.responseTime)
        } catch (e) {

        }
    }

    initChart() {
        const {id} = this

        const chartTypes = ['issue', 'performance']

        // chart 객체 생성
        chartTypes.forEach(type => {
            let chartOption = {
                chart: {
                    type: 'column'
                },
                legend: {
                    layout: 'horizontal', align: 'center', verticalAlign: 'bottom', floating: false, itemMarginBottom: 3
                },
                xAxis: {
                    type: 'datetime',
                    labels: {
                        formatter: function () {
                            // 예시: '2025/01'로 표시
                            const dateType = $('#' + id + '__popup' + ' .maxy_component_btn.on').data('date')
                            if (dateType === 'DAY') {
                                return Highcharts.dateFormat('%H:%M', this.value)
                            } else {
                                return Highcharts.dateFormat('%Y-%m-%d', this.value);
                            }

                        }
                    }, // tickInterval: 24 * 3600 * 1000, // 하루 간격 (밀리초 단위)
                    crosshair: true
                },
                tooltip: {
                    formatter: function () {
                        try {
                            const dateType = $('#' + id + '__popup' + ' .maxy_component_btn.on').data('date')
                            const chartType = $('#' + id + 'ChartWrap' + ' .type_tab.selected').data('type')
                            let time

                            if (this.points && this.points.length) {
                                if (dateType === 'DAY') {
                                    time = util.timestampToHourMin(this.x, 'HH:mm')
                                } else {
                                    time = util.timestampToDate(this.x)
                                }

                                return `${time}<br/>` + // this.x 추가
                                    this.points.map(point => {
                                        // 🔹 조건: chartType이 'performance'이면 util.convertTime() 사용
                                        const value = chartType === 'performance' ? util.convertTime(+point.y) : util.comma(+point.y)

                                        return `<span style="color:${point.color}">\u25CF</span> 
                                            ${point.series.name}: <b>${value}</b><br/>`
                                    }).join('')
                            } else {
                                // 🔹 `time`이 없을 수도 있으므로 `this.x`로 설정
                                if (dateType === 'DAY') {
                                    time = util.timestampToHourMin(this.x, 'HH:mm')
                                } else {
                                    time = util.timestampToDate(this.x)
                                }

                                // 🔹 chartType 체크 후 변환 처리
                                const value = chartType === 'performance' ? util.convertTime(+this.y) : util.comma(+this.y)

                                return `${time}<br/>` + // this.x 추가
                                    `<span style="color:${this.color}">\u25CF</span> ${this.series.name}: <b>${value}</b>`
                            }
                        } catch (e) {

                        }
                    }
                },
                plotOptions: {
                    column: {
                        pointPadding: 0.2, borderWidth: 0
                    }
                }
            }

            if (type === 'issue') {
                chartOption.yAxis = [{
                    labels: {
                        format: '{value:,.0f}',
                    },
                    title: {
                        text: 'Count'
                    },
                    allowDecimals: false // 소수점 없는 정수로만 표시
                }, {
                    title: {
                        text: 'Error / Crash'
                    },
                    opposite: true, // 차트의 오른쪽에 표시
                    allowDecimals: false // 소수점 없는 정수로만 표시
                }]
                chartOption.series = [
                    {
                        name: 'Count',
                        yAxis: 0,
                        data: []
                    },
                    {
                        name: 'Error',
                        color: '#FFC700',
                        yAxis: 1,
                        data: []
                    },
                    {
                        name: 'Crash',
                        color: '#FF6969',
                        yAxis: 1,
                        data: []
                    }
                ]
            } else if (type === 'performance') {
                chartOption.yAxis = [{
                    labels: {
                        formatter: function () {
                            return util.convertTime(this.value, true, false, false)
                        }
                    }
                }]
                chartOption.series = [
                    {
                        data: []
                    },
                    {
                        data: []
                    }
                ]
            }

            this[type + 'Chart'] = Highcharts.chart(type, chartOption)
        })
    }

    // 리스트 가져오기
    getPageViewInfoList(dateType) {
        const v = this

        const param = {
            packageNm: $('#packageNm').val(),
            serverType: $('#packageNm option:checked').data('server-type'),
            osType: $('#osType').val(),
            dateType: v.dateType
        }

        if (dateType) {
            param.dateType = dateType
        }

        ajaxCall('/db/0100/getFavoritesInfoList.maxy', param, {disableDimmed: true})
            .then(data => {
                if (data.length > 0) {
                    const length = data.length
                    $('#listCnt').text(' (' + util.comma(length) + (length >= 500 ? '+' : '') + ')')
                    const list = v.addPageNmToList(data)
                    v.table.setData(list)

                    $('#' + v.id + '__popup' + ' .tabulator-table > div:eq(0)').trigger('click')
                }
                // 차트 데이터 조회
            })
            .catch((e) => {
                console.log(e)
            })
    }

    addPageNmToList(data) {
        if (!data) {
            return
        }

        const newList = [...data]
        const packageNm = $('#packageNm').val()
        const serverType = $('#packageNm option:checked').data('server-type')

        newList.forEach((item) => {
            item.pageNm = getPageList(packageNm, serverType, item.reqUrl)
        });

        return newList
    }
}
