// noinspection JSUnresolvedReference
class MaxyPopupCrashesByVersion {
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
            console.log(dateType)
            toggle(this)
            cursor.show()
            v.getAllCrashesByVersionData(dateType)
        })

        $('#' + id + 'ChartWrap' + ' .type_tab').on('click', this.toggleTab)
    }

    // 선택한 탭에 대한 데이터만 보여준다
    toggleTab(e) {
        const {id} = this
        const $clickedTab = $(e.target)

        const type = $clickedTab.data('type')
        // tab 선택
        const $tab = $('.type_tab')
        $tab.removeClass('selected')
        $clickedTab.addClass('selected')

        const $target = $('#' + id + 'ChartWrap' + ' .maxy_box')
        $target.removeClass('hidden')
        $target.hide()
        $('#' + type).show()
    }

    async init() {
        const {id, appendId} = this
        const source = await fetch(
            '/components/db/popup/popup-crashes-by-version.html')
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

        this.chart = Highcharts.chart(id + 'ChartWrap', {
            chart: {
                type: 'column',
            },
            legend: {
                layout: 'horizontal',
                align: 'center',
                verticalAlign: 'bottom',
                floating: false,
                itemMarginBottom: 3
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
                },
                crosshair: true
            },
            yAxis: [{
                min: 0,
                labels: {
                    format: '{value:,.0f}'
                },
                title: {
                    text: ''
                },
                allowDecimals: false // Y축 값이 정수로만 표시됨
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
            series: [
                {
                    name: 'Crash',
                    color: '#ff6969',
                    data: []
                }
            ]
        })
    }

    drawTable() {
        this.table = new Tabulator('#crashesList', {
            height: '35vh',
            layout: 'fitDataFill',
            placeholder: i18next.tns('common.msg.noData'),
            columns: [
                {
                    title: 'OS',
                    field: "osType",
                    width: "20%",
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
                    width: "19%",
                    formatter: function(cell) {
                        if (!cell.getValue()) {
                            return '-'
                        } else {
                            return cell.getValue()
                        }
                    }
                },
                {
                    title: 'User',
                    field: "user",
                    hozAlign: "left",
                    width: "20%",
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
                    field: "crashCount",
                    hozAlign: "left",
                    width: "20%",
                    formatter: function(cell) {
                        if (!cell.getValue()) {
                            return '-'
                        } else {
                            return util.comma(cell.getValue())
                        }
                    }
                },
                {
                    title: 'Crash Rate (%)',
                    field: "crashRate",
                    hozAlign: "left",
                    width: "20%",
                    formatter: function(cell) {
                        if (!cell.getValue()) {
                            return '-'
                        } else {
                            return cell.getValue() + '%'
                        }
                    }
                }
            ]
        });

        this.table.on('rowClick', (e, row) => {
            if (this.selectedRow) {
                this.selectedRow.getElement().classList.remove('selected_row')
            }

            row.getElement().classList.add('selected_row')
            this.selectedRow = row

            const rowData = row.getData()
            const dateType = $('#' + this.id + '__popup' + ' .maxy_component_btn.on').data('date')

            const param = {
                packageNm: $('#packageNm').val(),
                serverType: $('#packageNm option:checked').data('server-type'),
                osType: rowData.osType,
                dateType: dateType === undefined ? 'DAY' : dateType,
                appVer: rowData.appVer
            }

            ajaxCall('/db/0100/getAllCrashesByVersionRowData.maxy', param, {disableDimmed: true})
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
            this.chart.series[0].setData(data)
        } catch (e) {

        }
    }

    getAllCrashesByVersionData(dateType) {
        try {
            const {id} = this
            const param = {
                packageNm: $('#packageNm').val(),
                serverType: $('#packageNm option:checked').data('server-type'),
                osType: $('#osType').val(),
                dateType: dateType === undefined ? 'DAY' : dateType
            }

            if (util.checkParam(param)) {
                return
            }

            ajaxCall('/db/0100/getAllCrashesByVersionData.maxy', param,
                {disableDimmed: true}).then(data => {
                cursor.hide()

                const length = data.length
                $('#listCnt').text('(' + util.comma(length) + ')')
                this.table.setData(data)
                $('#' + id + '__popup' + ' .tabulator-table > div:eq(0)').trigger('click')
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

        this.getAllCrashesByVersionData()
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