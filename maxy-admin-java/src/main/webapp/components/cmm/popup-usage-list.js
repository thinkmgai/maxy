// noinspection JSUnresolvedReference
/*
    종합 분석 > Device Distribution > All 팝업
    종합 분석 > Resource Usage > All 팝업
 */
class MaxyPopUpUsageList {
    constructor(options) {
        this.appendId = options.appendId
        this.id = options.id
        this.title = options.title
        this.param = options.param
        this.data = options.data
        this.deviceList = options.deviceList
        this.selectedRow = null

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
            v.getLogList(dateType)
        })
    }

    async init() {
        const {id, appendId} = this
        const source = await fetch(
            '/components/cmm/popup-usage-list.html')
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

        if (id === 'analysis') {
            this.chart = Highcharts.chart(id + 'Chart', {
                chart: {
                    type: 'column',
                    //zoomType: 'x'
                },
                legend: {
                    layout: 'horizontal',
                    align: 'center',
                    verticalAlign: 'bottom',
                    floating: false,
                    itemMarginBottom: 3
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
                    },
                    crosshair: true
                },
                yAxis: [
                    {
                        labels: {
                            format: '{value:,.0f}'
                        },
                        title: {
                            text: i18next.tns('dashboard.bi.userTooltip') // user
                        },
                        allowDecimals: false // 소수점 없는 정수로만 표시
                    },
                    {
                        labels: {
                            format: '{value:,.0f}'
                        },
                        title: {
                            text: i18next.tns('dashboard.bi.error') + ' / ' + i18next.tns('dashboard.bi.crash') // error / crash
                        },
                        opposite: true, // 차트의 오른쪽에 표시
                        allowDecimals: false // 소수점 없는 정수로만 표시
                    }],
                tooltip: {
                    shared: true,
                },
                plotOptions: {
                    column: {
                        pointPadding: 0.2,
                        borderWidth: 0
                    }
                },
                series: [
                    {
                        yAxis: 0,
                        data: []
                    },
                    {
                        yAxis: 1,
                        data: []
                    },
                    {
                        yAxis: 1,
                        data: []
                    }
                ]
            })
        } else if (id === 'resource') {
            this.chart = Highcharts.chart(id + 'Chart', {
                chart: {
                    zoomType: 'x',
                    marginBottom: 87
                },
                xAxis: [{
                    type: 'datetime',
                    labels: {
                        formatter: function () {
                            // 예시: '2025/01'로 표시
                            const dateType = $('#' + id + '__popup' + ' .maxy_component_btn.on').data('date')
                            if (dateType === 'DAY') {
                                return Highcharts.dateFormat('%H:%M', this.value)
                            } else {
                                return Highcharts.dateFormat('%Y-%m-%d', this.value)
                            }

                        }
                    },
                    crosshair: true
                }],
                yAxis: [
                    {
                        labels: {
                            format: '{value}%',
                            style: {
                                color: 'black'
                            }
                        },
                        title: {
                            text: ''
                        }
                    },
                    {
                        labels: {
                            formatter: function () {
                                return util.convertMem('kb', this.value)
                            },
                            style: {
                                color: 'black'
                            }
                        },
                        title: {
                            text: ''
                        },
                        opposite: true
                    }],
                legend: {
                    layout: 'horizontal',
                    align: 'center',
                    verticalAlign: 'bottom',
                    floating: false,
                    itemMarginTop: 10,
                    itemMarginBottom: -10,
                },
                plotOptions: {
                    series: {
                        turboThreshold: 0,
                        animation: false,
                        boostThreshold: 0,
                        crisp: false, //선명하게 그리기 위해 각점을 반올림하는 옵션, 체감은 안되지만 계산을 줄이는 효과 기대
                        pointInterval: 2, //시간 표현 간격을 조정한다. default는 1, 문자열을 줄여서 성능향상 기대
                    },
                },
                tooltip: {
                    shared: true, // 여러 시리즈의 값을 공유하여 표시
                    formatter: function () {
                        const dateType = $('#' + id + '__popup' + ' .maxy_component_btn.on').data('date')
                        let time

                        if (this.points && this.points.length) {
                            if (dateType === 'DAY') {
                                time = util.timestampToHourMin(this.x, 'HH:mm')
                            } else {
                                time = util.timestampToDate(this.x)
                            }

                            return `${time}<br/>` + // this.x 추가
                                this.points.map((point, idx) => {
                                    // 🔹 조건: chartType이 'performance'이면 util.convertTime() 사용
                                    const value = idx === 0 ? point.y + '%' : util.convertMem('kb', point.y)

                                    return `<span style="color:${point.color}">\u25CF</span>
                                            ${point.series.name}: <b>${value}</b><br/>`
                                }).join('')
                        }
                    }

                },
                series: [
                    {yAxis: 0, data: []},
                    {yAxis: 1, data: []}
                ]
            })
        }
    }

    drawTable() {
        const {id} = this
        const v = this;
        this.table = new Tabulator('#usageList', {
            rowFormatter: function (row) {
                let data = row.getData();

                if (id === 'analysis') {
                    if (data.osType === "Android") {
                        row.getElement().classList.add('analysis_one')
                    } else if (data.osType === "iOS") {
                        row.getElement().classList.add('analysis_two')
                    }
                } else if (id === 'resource') {
                    if (data.deviceModel === v.deviceList[0]) {
                        row.getElement().classList.add('resource_one')
                    } else if (data.deviceModel === v.deviceList[1]) {
                        row.getElement().classList.add('resource_two')
                    } else if (data.deviceModel === v.deviceList[2]) {
                        row.getElement().classList.add('resource_three')
                    } else if (data.deviceModel === v.deviceList[3]) {
                        row.getElement().classList.add('resource_four')
                    } else if (data.deviceModel === v.deviceList[4]) {
                        row.getElement().classList.add('resource_five')
                    } else if (data.deviceModel === v.deviceList[5]) {
                        row.getElement().classList.add('resource_six')
                    }
                }

            },
            height: '35vh',
            layout: 'fitDataFill',
            placeholder: i18next.tns('common.msg.noData'),
            columns: []
        });

        // 리스트 클릭 이벤트
        this.table.on('rowClick', (e, row) => {
            // 클릭한 행의 배경색 지우기
            if (this.selectedRow) {
                this.selectedRow.getElement().classList.remove('selected_row')
            }
            // 클릭한 행에 배경색 채우기
            row.getElement().classList.add('selected_row')
            this.selectedRow = row

            const rowData = row.getData()

            // 날짜 타입 가져오기 (DAY / WEEK / MONTH)
            const dateType = $('#' + id + '__popup' + ' .maxy_component_btn.on').data('date')
            const param = {
                packageNm: $('#packageNm').val(),
                serverType: $('#packageNm option:checked').data('server-type'),
                osType: rowData.osType,
                dateType: dateType === undefined ? 'DAY' : dateType,
                deviceModel: rowData.deviceModel
            }

            let url = ''
            if (id === 'analysis') url = '/db/0100/getAllAnalysisRowData.maxy'
            else if (id === 'resource') url = '/db/0100/getResourcePopupRowData.maxy'

            ajaxCall(url, param, {disableDimmed: true})
                .then(data => {
                    cursor.hide()

                    if (id === 'analysis') {
                        let seriesColor
                        if (param.osType === 'Android') {
                            seriesColor = '#2CAFFE'
                        } else {
                            seriesColor = '#544FC5'
                        }

                        this.chart.update({
                            series: [
                                {
                                    name: i18next.tns('dashboard.bi.userTooltip'), //user
                                    color: seriesColor,
                                    data: data.result.user
                                },
                                {
                                    name: i18next.tns('dashboard.bi.error'), //error
                                    color: '#FFA700',
                                    data: data.result.error
                                },
                                {
                                    name: i18next.tns('dashboard.bi.crash'), //crash
                                    color: '#FF6969',
                                    data: data.result.crash
                                }
                            ]
                        })
                    } else if (id === 'resource') {
                        this.chart.update({
                            series: [
                                {
                                    name: i18next.tns('common.text.cpuUsage'), //cpu 사용량
                                    data: data.result.cpu
                                },
                                {
                                    name: i18next.tns('common.text.memoryUsage'), // memory 사용량
                                    data: data.result.memory
                                }
                            ]
                        })
                    }
                }).catch(error => {
                console.error(error)
            })
        })
    }

    getLogList(dateType) {
        let requestType;
        const v = this;

        if (v.id === 'resource') {
            requestType = 'RESOURCE_USAGE'
        } else if (v.id === 'analysis') {
            requestType = 'DEVICE_DISTRIBUTION'
        }

        const param = {
            packageNm: $('#packageNm').val(),
            serverType: $('#packageNm option:checked').data('server-type'),
            osType: $('#osType').val(),
            requestType: requestType,
            dateType: dateType === undefined ? 'DAY' : dateType,
            checkAll: true
        }

        if (util.checkParam(param)) {
            return;
        }

        if (v.id === 'analysis') {
            ajaxCall('/db/0100/getAllAnalysisData.maxy', param, {disableDimmed: true})
                .then(data => {
                    cursor.hide()

                    const analysisData = data.result
                    if (analysisData) {
                        try {
                            const {deviceInfo, errorCrashTotalInfo, allUseCount, totalUserCount} = analysisData

                            if (deviceInfo) {
                                v.listCnt = isNaN(deviceInfo.length) ? 0 : deviceInfo.length
                                $('#listCnt').text('(' + util.comma(v.listCnt) + ')')

                                const {errorTotalInfo, crashTotalInfo} = errorCrashTotalInfo

                                v.errorTotalCount = isNaN(errorTotalInfo) ? 0 : errorTotalInfo
                                v.crashTotalCount = isNaN(crashTotalInfo) ? 0 : crashTotalInfo
                                v.totalLogCount = isNaN(allUseCount) ? 0 : allUseCount
                                v.totalUser = isNaN(totalUserCount) ? 0 : totalUserCount

                                this.makeTable(deviceInfo)
                            }
                        } catch (e) {
                            console.log(e)
                        }
                    }
                }).catch(error => {
                console.error(error)
            })
        } else if (v.id === 'resource') {
            ajaxCall('/db/0100/getResourcePopupData.maxy', param, {disableDimmed: true})
                .then(data => {
                    cursor.hide()

                    const result = data.result
                    if (result) {
                        try {
                            const {popupData, totalData} = result

                            if (popupData) {
                                v.listCnt = isNaN(popupData.length) ? 0 : popupData.length
                                $('#listCnt').text('(' + util.comma(v.listCnt) + ')')

                                const {totalCount, totalLogCount} = totalData
                                v.totalCount = isNaN(totalCount) ? 0 : totalCount
                                v.totalLogCount = isNaN(totalLogCount) ? 0 : totalLogCount

                                popupData.sort(function (a, b) {
                                    return b.count - a.count
                                })
                                this.makeTable(popupData)
                            }
                        } catch (e) {
                            console.log(e)
                        }

                    }

                }).catch(error => {
                console.error(error)
            })
        }
    }

    // 팝업 열기 함수
    async openPopup() {
        const {id} = this
        $('.dimmed').show()

        const $target = $('#' + id + '__popup')
        $target.show()

        await util.sleep(200)

        this.getLogList()
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

    makeTable(data) {
        const {id} = this
        const v = this

        const columnNames = {
            "deviceModel": i18next.tns('common.tableColumn.deviceModel'),
            "user": i18next.tns('dashboard.bi.userTooltip'),
            "userId": i18next.tns('common.text.userId'),
            "userRate": i18next.tns('common.tableColumn.userRate'),
            "usageVolume": i18next.tns('common.tableColumn.usageVolume'),
            "error": i18next.tns('dashboard.bi.error'),
            "crash": i18next.tns('dashboard.bi.crash'),
            "errorRate": i18next.tns('common.tableColumn.errorRate'),
            "crashRate": i18next.tns('common.tableColumn.crashRate'),
            "cpuUsage": i18next.tns('common.text.cpuUsage'),
            "memoryUsage": i18next.tns('common.text.memoryUsage'),
        }

        if (id === 'analysis') {
            const analysisColumn = [
                {
                    title: "OS",
                    field: "osType",
                    hozAlign: "left",
                    width: "10%",
                },
                {
                    title: columnNames.deviceModel,
                    field: "deviceModel",
                    hozAlign: "left",
                    width: "20%",
                    formatter: function (cell) {
                        return getDeviceModel(cell.getValue())
                    }
                },
                {
                    title: columnNames.user,
                    field: "userCount",
                    hozAlign: "left",
                    width: "10%",
                    headerSortTristate: true,
                    formatter: function (row) {
                        let rowData = row.getData()
                        return rowData.userCount.toLocaleString()
                    }
                },
                {
                    title: columnNames.userRate,
                    field: "userCount",
                    hozAlign: "left",
                    width: "14%",
                    formatter: function (row) {
                        let rowData = row.getData()
                        return (v.checkNaN((rowData.userCount / v.totalUser)) * 100).toFixed(1).replace(/\.0$/, '') + '%'
                    }
                },
                {
                    title: columnNames.error,
                    field: "errorCount",
                    hozAlign: "left",
                    width: "10%",
                    formatter: function (row) {
                        let rowData = row.getData()
                        return rowData.errorCount.toLocaleString()
                    }
                },
                {
                    title: columnNames.errorRate,
                    field: "errorCount",
                    hozAlign: "left",
                    width: "11%",
                    formatter: function (row) {
                        let rowData = row.getData()
                        return (v.checkNaN((rowData.errorCount / v.errorTotalCount)) * 100).toFixed(1).replace(/\.0$/, '') + '%'
                    }
                },
                {
                    title: columnNames.crash,
                    field: "crashCount",
                    hozAlign: "left",
                    width: "10%",
                    formatter: function (row) {
                        let rowData = row.getData()
                        return rowData.crashCount.toLocaleString()
                    }
                },
                {
                    title: columnNames.crashRate,
                    field: "crashCount",
                    hozAlign: "left",
                    width: "11%",
                    formatter: function (row) {
                        let rowData = row.getData()
                        return (v.checkNaN((rowData.crashCount / v.crashTotalCount)) * 100).toFixed(1).replace(/\.0$/, '') + '%'
                    }
                },
            ]
            this.table.setColumns(analysisColumn)
            this.table.setData(data)
        } else if (id === 'resource') {
            const resourceColumn = [
                {
                    title: "OS",
                    field: "osType",
                    hozAlign: "left",
                    width: "10%",
                },
                {
                    title: columnNames.deviceModel,
                    field: "deviceModel",
                    hozAlign: "left",
                    width: "20%",
                    formatter: function (cell) {
                        return getDeviceModel(cell.getValue())
                    }
                },
                {
                    title: columnNames.user,
                    field: "count",
                    hozAlign: "left",
                    width: "16%",
                    formatter: function (row) {
                        let rowData = row.getData()
                        return rowData.count.toLocaleString()
                    }
                },
                {
                    title: columnNames.userRate,
                    field: "usageCount",
                    hozAlign: "left",
                    width: "16%",
                    formatter: function (row) {
                        let rowData = row.getData()
                        return (v.checkNaN((rowData.count / v.totalCount)) * 100).toFixed(1).replace(/\.0$/, '') + '%';
                    }
                },
                {
                    title: columnNames.cpuUsage,
                    field: "cpuUsage",
                    hozAlign: "left",
                    width: "18%",
                    formatter: function (row) {
                        let rowData = row.getData()
                        if (rowData.osType === "Android") {
                            return Math.round(rowData.cpuUsage * 10) / 10.0 + '%'
                        } else {
                            return Math.round(rowData.cpuUsage * 10) / 10.0 + '%'
                        }
                    }
                },
                {
                    title: columnNames.memoryUsage,
                    field: "memUsage",
                    hozAlign: "left",
                    width: "18%",
                    formatter: function (row) {
                        let rowData = row.getData()
                        if (rowData.osType === "Android") {
                            return util.convertMem('kb', rowData.memUsage)
                        } else {
                            return util.convertMem('kb', rowData.memUsage)
                        }
                    }
                }
            ]
            this.table.setColumns(resourceColumn)
            this.table.setData(data)
            this.table.setSort("count", "desc")
        }

        // 첫 행 강제 클릭되게
        $("#" + id + "__popup" + " .tabulator-table > div:eq(0)").trigger('click')
    }

    checkNaN(val) {
        return isNaN(val) ? '0.0' : isFinite(val) ? val : '100.0';
    }
}