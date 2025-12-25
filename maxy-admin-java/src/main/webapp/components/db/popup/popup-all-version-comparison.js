// noinspection JSUnresolvedReference
class MaxyPopUpAllVersionComparison {
    constructor(options) {
        this.appendId = options.appendId
        this.id = options.id
        this.selectedRow = null
        this.dateType = 'DAY'

        this.init().then(() => {
            this.addEventListener()
            this.openPopup()
            this.drawTable()
        })
    }

    addEventListener() {
        const {id} = this
        const v = this

        $('.dimmed').on('click', () => {
            v.closePopup(v)
        })

        const toggle = (t) => {
            $(t).siblings('button').removeClass('on')
            $(t).addClass('on')
        }

        $('#' + id + '__popup' + ' .maxy_component_btn').on('click', function () {
            v.selectedRow = null
            const dateType = this.getAttribute('data-date')
            toggle(this)
            cursor.show()
            v.getAllVersionComparisonData(dateType)
        })

        $('#allVersionChartWrap .type_tab').on('click', this.toggleTab)
    }

    // 선택한 탭에 대한 데이터만 보여준다
    toggleTab(e) {
        const v = this
        const $clickedTab = $(e.target)

        const type = $clickedTab.data('type')
        // tab 선택
        const $tab = $('.type_tab')
        $tab.removeClass('selected')
        $clickedTab.addClass('selected')

        const $target = $('#allVersionChartWrap .maxy_box')
        $target.removeClass('hidden')
        $target.hide()
        $('#' + type).show()
    }

    async init() {
        const {id, appendId} = this
        const source = await fetch(
            '/components/db/popup/popup-all-version-comparison.html')
            .then(response => response.text())

        const template = Handlebars.compile(source)

        const $target = $('#' + appendId)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + appendId
        }

        $target.empty()
        $target.append(template({id}))

        this.initChart()
        updateContent()
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
                    type: 'datetime', labels: {
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

            if(type === 'issue'){
                chartOption.yAxis= [{
                    labels: {
                        format: '{value:,.0f}'
                    },
                    title: {
                        text: 'DAU'
                    },
                    allowDecimals: false // 소수점 없는 정수로만 표시
                },
                {
                    labels: {
                        format: '{value:,.0f}'
                    },
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
            } else if(type === 'performance') {
                chartOption.yAxis= [{
                    labels: {
                        formatter: function () {
                            return util.convertTime(this.value, false, false, false)
                        },
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


    drawTable() {
        this.table = new Tabulator('#allVersionList', {
            height: '35vh',
            layout: 'fitDataFill',
            placeholder: i18next.tns('common.msg.noData'),
            columns: [
                {
                    title: 'OS',
                    field: "osType",
                    width: "11%",
                    formatter: function(cell) {
                        if (!cell.getValue()) {
                            return '-'
                        } else {
                            return cell.getValue()
                        }
                    }
                },
                {
                    title: i18next.tns('common.tableColumn.version'),
                    field: "appVer",
                    width: "10%",
                    formatter: function(cell) {
                        if (!cell.getValue()) {
                            return '-'
                        } else {
                            return cell.getValue()
                        }
                    }
                },
                {
                    title: i18next.tns('common.tableColumn.install'),
                    field: "install",
                    hozAlign: "left",
                    width: "10%",
                    formatter: function(cell) {
                        if (!cell.getValue()) {
                            return '-'
                        } else {
                            return util.comma(cell.getValue())
                        }
                    }
                },
                {
                    title: 'DAU',
                    field: "dau",
                    hozAlign: "left",
                    width: "12%",
                    formatter: function(cell) {
                        if (!cell.getValue()) {
                            return '-'
                        } else {
                            return util.comma(cell.getValue())
                        }
                    }
                },
                {
                    title: i18next.tns('dashboard.bi.error'),
                    field: "error",
                    hozAlign: "left",
                    width: "11%",
                    formatter: function(cell) {
                        if (!cell.getValue()) {
                            return '-'
                        } else {
                            return util.comma(cell.getValue())
                        }
                    }
                },
                {
                    title: i18next.tns('dashboard.bi.crash'),
                    field: "crash",
                    hozAlign: "left",
                    width: "11%",
                    formatter: function(cell) {
                        if (!cell.getValue()) {
                            return '-'
                        } else {
                            return util.comma(cell.getValue())
                        }
                    }
                },
                {
                    title: i18next.tns('common.tableColumn.medLoadingTime'),
                    field: "loadingTime",
                    hozAlign: "left",
                    width: "17%",
                    formatter: function(cell) {
                        const value = cell.getValue()
                        return util.convertTime(value, false, false, false)
                    }
                },
                {
                    title: i18next.tns('common.tableColumn.avgResponseTime'),
                    field: "responseTime",
                    hozAlign: "left",
                    width: "17%",
                    formatter: function(cell) {
                        const value = cell.getValue()
                        return util.convertTime(value, false, false, false)
                    }
                },
            ]
        });

        this.table.on('rowClick', (e, row) => {
            if (this.selectedRow) {
                this.selectedRow.getElement().classList.remove('selected_row')
            }

            row.getElement().classList.add('selected_row')
            this.selectedRow = row

            const rowData = row.getData()
            const dateType = $('#allVersion__popup' + ' .maxy_component_btn.on').data('date')

            const param = {
                packageNm: $('#packageNm').val(),
                serverType: $('#packageNm option:checked').data('server-type'),
                osType: rowData.osType,
                dateType: dateType === undefined ? 'DAY' : dateType,
                appVer: rowData.appVer
            }

            ajaxCall('/db/0100/getAllVersionComparisonRowData.maxy', param, {disableDimmed: true})
                .then(data => {
                    cursor.hide()
                    this.setChartData(data)
                }).catch(error => {
                console.error(error)
            })
        })
    }

    // 차트에 데이터 세팅 및 series 색 변경, series 이름 변경
    setChartData(data) {
        try {
            this.issueChart.update({
                series: [
                    {
                        name: 'DAU'
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

            this.issueChart.series[0].setData(data.user)
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

    getAllVersionComparisonData(dateType) {
        const v = this

        try {
            // 날짜 파라미터는 어제 00:00 ~ 어제 23:59로 !!
            const yesterday = util.getDate(-1)
            const from = util.dateToTimestamp(util.getDate(-1), true)
            const to = util.dateToTimestamp(util.getDate(-1), false)

            let month = yesterday.getMonth() + 1
            if (month < 10) {
                month = util.padding(month)
            }

            let yesterdayDate = yesterday.getDate()
            if (yesterdayDate < 10) {
                yesterdayDate = util.padding(yesterdayDate)
            }

            // accessDate는 yyyymmdd 형식
            const accessDate = '' + yesterday.getFullYear() + month + yesterdayDate

            const param = {
                packageNm: $('#packageNm').val(),
                serverType: $('#packageNm option:checked').data('server-type'),
                osType: $('#osType').val(),
                from,
                to,
                dateType: dateType === undefined ? 'DAY' : dateType,
                accessDate
            }

            if (util.checkParam(param)) {
                return
            }

            ajaxCall('/db/0100/getAllVersionComparisonData.maxy', param,
                {disableDimmed: true}).then(data => {
                cursor.hide()
                const {allVersionData} = data

                const length = allVersionData.length
                $('#listCnt').text('(' + util.comma(length) + ')')
                this.table.setData(allVersionData)
                console.log('dd')
                $('#' + v.id + '__popup' + ' .tabulator-table > div:eq(0)').trigger('click')
            }).catch(error => {
                toast(i18next.tns(error.msg))
            })
        } catch (e) {

        }
    }

    // 팝업 열기 함수
    async openPopup() {
        const {id} = this
        $('.dimmed').show()

        const $target = $('#' + id + '__popup')
        $target.show()

        await util.sleep(200)

        this.getAllVersionComparisonData()
    }

    // 팝업 닫기 함수
    closePopup(v) {
        const popup = '#' + v.id + '__popup'
        const input = popup + ' input'
        const textarea = popup + ' textarea'
        const span = popup + ' span'
        const $dimmed = $('.dimmed')

        util.removeMaxyCursor()
        v.table.clearData()
        $(input, textarea).val('')
        $(span).text('')

        $dimmed.off('click')
        $dimmed.hide()
        $(popup).hide()
    }
}