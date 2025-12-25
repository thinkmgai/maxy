/*
    종합 분석 > Basic Information > 팝업 (Log, Error, Crash)
*/
class MaxyPopupLogAnalysis {
    constructor(options) {
        this.appendId = options.appendId
        this.id = options.id
        this.title = options.title
        this.data = options.data
        this.baseDate = options.baseDate
        this.func = options.func
        this.selectedRow = null

        if (!this.id || !this.appendId || !this.title) {
            console.log('check parameter')
            return false
        }

        this.setHandlebarsHelper()
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

        const {id, func} = v

        if (!func) {
            return
        }

        $('#' + id + '__popup' + ' .maxy_component_btn').on('click', function () {
            const dateType = $(this).data('date')
            const param = {
                id: id,
                dateType: dateType
            }
            toggle(this)
            v.selectedRow = null

            func(param)
        })
    }

    async init() {
        const {id, title, appendId} = this

        const source = await fetch(
            '/components/db/popup/popup-log-analysis.html')
            .then(response => response.text())

        const template = Handlebars.compile(source)
        const $target = $('#' + appendId)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + appendId
        }
        $target.empty()

        // Error, Crash 팝업에 따라서 아이콘 변경
        let iconClass
        if(title.includes('error')) {
            iconClass = 'icon_error'
        } else if(title.includes('crash')) {
            iconClass = 'icon_crash'
        } else {
            iconClass = 'icon_user'
        }

        $target.append(template({id, title, iconClass}))

        this.chart = Highcharts.chart(id + 'GraphWrap', {
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
                dateTimeLabelFormats: {
                    day: '%Y-%m-%d',  // 기본적으로 일자를 표시
                },
                crosshair: true
            },
            yAxis: [{
                min: 0,
                title: {
                    text: ''
                }
            }],
            tooltip: {
                valueSuffix: ''
            },
            plotOptions: {
                column: {
                    pointPadding: 0.2,
                    borderWidth: 0
                }
            },
            series: []
        })

        this.initCalendar()
        this.table = new Tabulator('#' + id + 'LogList', {
            layout: 'fitDataFill',
            height: '30vh',
            placeholder: i18next.tns('common.msg.noData'),
            columns: []
        })

        this.table.on('rowClick', (e, row) => {
            if (this.selectedRow) {
                this.selectedRow.getElement().classList.remove('selected_row')
            }
            row.getElement().classList.add('selected_row')
            this.selectedRow = row

            const rowData = row.getData()
            const $target = $('#' + id + 'Detail')

            // error는 필드명이 msg로 crash는 crashNm와 causeBy로 내려옴
            if (typeof rowData.msg !== 'undefined'){
                $target.val(rowData.msg)
            }else if (rowData.causeBy !== ''){
                // causeBy 앞에 ' '이 붙어있음
                $target.val(rowData.crashNm + '\n' + rowData.causeBy.toString().trim())
            }else{
                $target.val(rowData.crashNm)
            }
        })

        updateContent()
        this.addEventListener()
        this.openPopup()
    }

    initCalendar() {
        const {id, func} = this

        try {
            // 하루 전 날짜
            this.toDate = util.getDate(-1)
            // 파라미터로 쓸 날짜, 화면에 보여질 날짜는 yyyy/mm/dd 형식이고, calendar에 checkedDate는 yyyy-mm-dd 형식으로 보내야 인식가능
            const calendarToDate = util.getDateToString(this.toDate)
            this.toDate = util.getDateToString(this.toDate)

            // 일주일 전 날짜
            this.fromDate = util.getDate(-7)
            // 파라미터로 쓸 날짜, 화면에 보여질 날짜는 yyyy/mm/dd 형식이고, calendar에 checkedDate는 yyyy-mm-dd 형식으로 보내야 인식가능
            const calendarFromDate = util.getDateToString(this.fromDate)
            this.fromDate = util.getDateToString(this.fromDate)

            // 캘린더 객체를 변수에 저장하여 나중에 사용
            const calendarInstance = calendar.init({
                id: id + 'Calendar',
                checkedDate: [calendarFromDate + ':' + calendarToDate],
                fn: (dates, date) => {
                    if (dates.length > 1) {
                        this.fromDate = dates[0]
                        this.toDate = dates[dates.length - 1]
                    } else {
                        this.fromDate = dates[0]
                        this.toDate = dates[0]
                    }

                    // 30일 이상은 조회 안됨
                    const period = util.getDateDiff(this.toDate, this.fromDate)

                    if (period > 30) {
                        toast(trl('common.msg.date30'))
                    } else {
                        // 서버에 보낼 땐 타임스탬프로 변환
                        const from = util.dateToTimestamp(new Date(this.fromDate), true)
                        const to = util.dateToTimestamp(new Date(this.toDate), false)

                        const dateParam = {from, to}
                        //  DB0100.func.getBiDetailInfo(id, dateParam)
                        func(id, dateParam)
                    }

                },
                created: () => {
                    /* 디폴트는 어제 -7일 ~ 어제 날짜
                        최대 30일까지 선택 가능
                    */
                    // 하루 전 날짜
                    const $calendar = $('#' + id + 'Calendar')
                    $calendar.val(this.fromDate + ' ~ ' + this.toDate)
                    $calendar.siblings('.btn_calendar').unbind('click').bind('click', function(){
                        $calendar.trigger('click')
                    })
                }
            })
        } catch (e) {
            console.log(e)
        }
    }

    setHandlebarsHelper() {
        Handlebars.registerHelper('getTitle', (title) => {
            const tnsNm = i18next.tns(title)

            if (tnsNm) {
                return tnsNm
            } else {
                return title
            }
        })
    }

    // highchart 그려주기
    drawChart(key, result) {
        try {
            const v = this
            if (v.chart) {
                v.initTextArea()
                // 기존 시리즈 제거
                while (v.chart.series.length) {
                    v.selectedRow = null
                    v.chart.series[0].remove()
                }

                const option = {
                    name: '', color: ''
                }
                if (key === 'appErrorCount') {
                    option.name = 'Error'
                    option.color = '#FFA800'
                } else {
                    option.name = 'Crash'
                    option.color = '#FF6969'
                }

                v.chart.addSeries({
                    name: option.name, // 동적 이름 설정
                    color: option.color,
                    data: result,    // 추출된 배열 전달
                    point: {
                        events: {
                            click: function () {
                                v.selectedRow = null
                                v.updateChart(this)
                            }
                        }
                    }
                })

                const seriesData = v.chart.series[0].data
                if (seriesData && seriesData.length > 0) {
                    const length = seriesData.length
                    v.updateChart(seriesData[length - 1])
                } else {
                    v.table.setData([])
                }
            }
        } catch (e) {
            console.log(e)
        }

    }

    updateChart(target) {
        const {id, func} = this

        if (this.selectedRow) {
            this.selectedRow = null
        }

        // 선택한 막대의 from (timestamp)
        const from = target.x
        // 선택한 막대의 from To dateString
        const fromDate = util.timestampToDate(from)
        // fromDate로 to 구하기 (timestamp 변환 / 23:59:59.999)
        const to = util.dateToTimestamp(new Date(fromDate), false)

        const type = 'info'
        // 막대 클릭 시 해당 막대의 날짜 (from, to)를 param에 전달하여 해당 날짜에 맞는 log list만 받아오도록 호출
        func(id, {from: from, to: to}, type)
    }

    // highchart 하단 리스트 그려주기
    drawTable(list) {
        const {title, id} = this
        const v = this
        try {
            const columnName = {
                'count': i18next.tns('common.tableColumn.count'),
                'errorType': i18next.tns('common.tableColumn.errorType'),
                'rate': i18next.tns('common.tableColumn.rate'),
                'causedName': i18next.tns('common.tableColumn.causedName'),
                'causedBy': i18next.tns('common.tableColumn.causedBy'),
            }
            let columns

            if (title.includes('error')) {
                columns = [
                    {
                        title: columnName.count,
                        field: "count",
                        width: "10%",
                        formatter: function (cell) {
                            if (cell.getValue()) {
                                return util.comma(cell.getValue())
                            } else {
                                return 0
                            }
                        },
                        headerTooltip: "Count"
                    },
                    {
                        title: columnName.errorType,
                        field: "msg",
                        width: "75%"
                    },
                    {
                        title: "",
                        width: "4%",
                        headerSort: false
                    },
                    {
                        title: columnName.rate,
                        field: "rate",
                        width: "8%",
                        formatter: function (cell) {
                            if (cell.getValue()) {
                                return v.getInteger(cell.getValue())
                            } else {
                                return 0 + '%'
                            }
                        },
                        headerTooltip: "Rate"
                    }
                ]
            } else if (title.includes('crash')) {
                columns = [
                    {
                        title: columnName.count,
                        field: "count",
                        width: "9%",
                        formatter: function (cell) {
                            if (cell.getValue()) {
                                return util.comma(cell.getValue())
                            } else {
                                return 0
                            }
                        },
                        headerTooltip: "Count"
                    },
                    {
                        title: columnName.causedName,
                        field: "crashNm",
                        width: '24%'
                    },
                    {
                        title: columnName.causedBy,
                        field: "causeBy",
                        width: "54%"
                    },
                    {
                        title: columnName.rate,
                        field: "rate",
                        width: "10%",
                        formatter: function (cell) {
                            if (cell.getValue()) {
                                return v.getInteger(cell.getValue())
                            } else {
                                return 0 + '%'
                            }
                        },
                        headerTooltip: "Rate",
                        hozAlign: "left",
                    }
                ]
            }

            this.table.setColumns(columns)

            if (list && list.length > 0) {
                this.table.setData(list)

                // 첫 행 클릭되게
                $('#' + id + '__popup' + ' .tabulator-table > div:eq(0)').trigger('click')
            }

        } catch (e) {
            console.log(e)
        }

    }

    getInteger(data) {
        try {
            let displayRate = Math.round(data)
            displayRate = displayRate + '%'
            return displayRate
        } catch (e) {

        }
    }

    async openPopup() {
        const {id} = this
        $('.dimmed').show()

        const $target = $('#' + id + '__popup')
        $target.addClass('show')

        await util.sleep(200)
    }

    initTextArea() {
        const {id} = this
        const popup = '#' + id + '__popup'
        const textarea = popup + ' textarea'
        $(textarea).val('')
    }

    closePopup(v) {
        const popup = '#' + v.id + '__popup'
        const span = popup + ' span'
        const div = popup + ' div'
        const $dimmed = $('.dimmed')
        const $popup = $(popup)

        v.table.clearData()
        v.chart.destroy({keepContainer: true})
        $(span).text('')
        $(div).text('')

        $dimmed.off('click')
        $dimmed.hide()
        $popup.removeClass('show').addClass('hidden')

        // 팝업 닫을 때 커서가 보이면 없애주도록
        const $cursor = $('.maxy_cursor_dots')
        if ($cursor.css('display') === 'block') {
            cursor.hide()
        }
    }
}