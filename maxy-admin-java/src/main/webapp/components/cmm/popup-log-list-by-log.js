/*
    실시간 로그 조회 > 상단 Error / Crash / PV 팝업
*/
class MaxyPopupLogList {
    constructor(options) {
        this.appendId = options.appendId
        this.type = options.logType
        this.title = options.title
        this.id = options.id
        this.deviceModel = options.deviceModel
        this.selectedRow = null

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

        tippy('#pDeviceModel', {
            content: trl('common.msg.deviceIdCopy'),
            arrow: false,
            placement: 'bottom',
            allowHTML: true,
            theme: 'maxy-tooltip'
        })

        tippy('#btnPageFlow', {
            content: trl('common.text.userBehavior'),
            arrow: false,
            placement: 'bottom',
            allowHTML: true,
            theme: 'maxy-tooltip'
        })

        $('#pDeviceModel').on('click', function () {
            util.copy(this)
        })

        $('#btnPageFlow').on('click', function () {
            v.getUserFlow()
        })
    }


    async init() {
        const {appendId, title, id, type} = this
        const source = await fetch(
            '/components/cmm/popup-log-list-by-log.html')
            .then(response => response.text())

        const template = Handlebars.compile(source)

        const $target = $('#' + appendId)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + appendId
        }
        $target.empty()

        let fmtTitle

        if (title === 'error') {
            fmtTitle = trl('common.text.errorList')
        } else if (title === 'crash') {
            fmtTitle = trl('common.text.crashList')
        } else if (title === 'pv') {
            fmtTitle = 'PageFlow'
        }

        $target.append(template({fmtTitle, id}))
        const tableId = '#' + id + '__logList'

        const placeholder = trl('common.msg.noData')

        const tableOptions = {
            layout: 'fitDataFill',
            placeholder: placeholder,
            columns:
                [],
        }

        // error list인 경우 rowformatter 적용
        if (this.type === 'error' || this.type === 'pv') {
            tableOptions.rowFormatter = this.rowFormatter.bind(this)
        }

        this.table = new Tabulator(tableId, tableOptions)

        this.table.on('rowClick', (e, row) => {
            // 선택된 행이 있으면 selected_row class를 제거
            if (this.selectedRow) {
                this.selectedRow.getElement().classList.remove('selected_row')
            }
            // 선택한 행의 배경색 변경
            row.getElement().classList.add('selected_row')
            this.selectedRow = row

            // 행 클릭 시 마다 loading ,response med 값 - 처리
            $('#pLoadingTimeAvg').text('-')
            $('#pResponseTimeAvg').text('-')

            // 행 클릭 시 마다 logdetail scroll 최상단으로 이동
            $('#pLogDetail').scrollTop(0)

            // 상세 데이터 가져오기
            this.getLogDetail(e, row)
        })

        updateContent()
    }

    getLogList() {
        const {type} = this
        const param = {
            packageNm: $('#packageNm').val(),
            serverType: $('#packageNm option:checked').data('server-type'),
            logType: type
        }

        ajaxCall('/ta/0000/getLatestLogList.maxy', param, {disableDimmed: true})
            .then(data => {
                this.addLogList(data)
            }).catch(error => {
            console.log(error)
        })
    }

    addLogList(data) {
        const $logDetail = $('#logDetail')
        try {
            const logList = data.logList
            const length = logList.length

            this.drawTable()

            $logDetail.removeClass('no_data')

            if (!logList || length === 0) {
                $logDetail.addClass('no_data')
                this.setNoData()
                this.table.setData([])
                $('#' + this.id + '__popup' + ' #count').text('(0)')
            } else {
                this.table.setData(logList)
                $('#' + this.id + '__popup' + ' #count').text('(' + util.comma(length) + (length >= 500 ? '+' : '') + ')')
                // 첫 행 강제 클릭되게
                $('#' + this.id + '__popup' + ' .tabulator-table > div:eq(0)').trigger('click')
            }


        } catch (e) {
            console.log(e)

            $logDetail.addClass('no_data')
            this.setNoData()
            this.table.setData([])
        }
    }

    // error list 인지 crash list인지에 따라 column이 달라짐
    drawTable() {
        const columnNames = {
            "time": trl('common.tableColumn.time'),
            "deviceId": trl('common.tableColumn.deviceId'),
            "userId": trl('common.text.userId'),
            "logClass": trl('common.tableColumn.logClass'),
            "logType": trl('common.tableColumn.logType'),
            "crashName": trl('common.tableColumn.crashName'),
            "causedBy": trl('common.tableColumn.causedBy'),
            "appver": trl('common.tableColumn.appVer')
        }

        if (this.type === 'error') {
            const errorLogListColumns = [
                {
                    title: columnNames.time,
                    field: "logTm",
                    hozAlign: "left",
                    width: "13%",
                    formatter: util.timestampToDateTimeMs
                },
                {
                    title: columnNames.deviceId,
                    field: "deviceId",
                    hozAlign: "left",
                    width: "23%"
                },
                {
                    title: columnNames.userId,
                    field: "userId",
                    hozAlign: "left",
                    width: "10%",
                    tooltip: util.tooltipFormatter,
                    formatter: idDisplay.getId
                },
                {
                    title: columnNames.logClass,
                    field: "logType",
                    hozAlign: "left",
                    width: "14%",
                    formatter: function (cell) {
                        let value = cell.getValue()
                        if (!value) {
                            return '-'
                        } else {
                            return getLogTypeGroup(value)
                        }
                    }
                },
                {
                    title: columnNames.logType,
                    field: "logType",
                    width: "14%",
                    formatter: function (cell) {
                        let value = cell.getValue()
                        if (!value) {
                            return '-'
                        } else {
                            return getLogTypeDetail(value)
                        }
                    }
                },
                {
                    title: 'Run Time',
                    field: "intervaltime",
                    width: "12%",
                    formatter: cell => {
                        const value = cell.getValue()
                        if (isNaN(value)) {
                            return '-'
                        } else {
                            return cell.getValue().toLocaleString() + 'ms'
                        }
                    }
                },
                {
                    title: columnNames.appver,
                    field: "appVer",
                    width: "10%"
                }
            ]
            this.table.setColumns(errorLogListColumns)
        } else if (this.type === 'pv') {
            const pageFlowColumns = [
                {
                    title: columnNames.time,
                    field: "pageStartTm",
                    hozAlign: "left",
                    width: "13%",
                    formatter: util.timestampToDateTimeMs
                },
                {
                    title: columnNames.deviceId,
                    field: "deviceId",
                    hozAlign: "left",
                    width: "23%"
                },
                {
                    title: columnNames.userId,
                    field: "userId",
                    hozAlign: "left",
                    width: "10%",
                    tooltip: util.tooltipFormatter,
                    formatter: idDisplay.getId
                },
                {
                    title: columnNames.logClass,
                    field: "logType",
                    hozAlign: "left",
                    width: "14%",
                    formatter: function (cell) {
                        let value = cell.getValue()
                        if (!value) {
                            return '-'
                        } else {
                            return getLogTypeGroup(value)
                        }
                    }
                },
                {
                    title: columnNames.logType,
                    field: "logType",
                    width: "14%",
                    formatter: function (cell) {
                        let value = cell.getValue()
                        if (!value) {
                            return '-'
                        } else {
                            return getLogTypeDetail(value)
                        }
                    }
                },
                {
                    title: 'Run Time',
                    field: "intervaltime",
                    width: "12%",
                    formatter: function (cell) {
                        let value = cell.getValue()
                        if (isNaN(value)) {
                            return '-'
                        } else {
                            return value.toLocaleString() + 'ms'
                        }
                    }
                },
                {
                    title: columnNames.appver,
                    field: "appVer",
                    width: "10%"
                }
            ]
            this.table.setColumns(pageFlowColumns)
        } else if (this.type === 'crash') {
            const crashListColumns = [
                {
                    title: columnNames.time,
                    field: "logTm",
                    hozAlign: "left",
                    width: "14%",
                    formatter: util.timestampToDateTimeMs
                },
                {
                    title: columnNames.deviceId,
                    field: "deviceId",
                    hozAlign: "left",
                    width: "22%"
                },
                {
                    title: columnNames.userId,
                    field: "userId",
                    hozAlign: "left",
                    width: "10%",
                    formatter: idDisplay.getId
                },
                {
                    title: 'Run Time',
                    field: "intervaltime",
                    width: "13%",
                    formatter: function (cell) {
                        let value = cell.getValue()
                        if (value === undefined) {
                            return '-'
                        } else {
                            return value.toLocaleString() + 'ms'
                        }
                    }
                },
                {
                    title: columnNames.crashName,
                    field: "logName",
                    hozAlign: "left",
                    headerSort: false,
                    width: "19%",
                    formatter: function (cell) {
                        const logNameData = this.setLogName(cell)
                        return logNameData ? logNameData.crashName : '-';
                    }.bind(this)
                },
                {
                    title: columnNames.causedBy,
                    field: "logName",
                    hozAlign: "left",
                    width: "19%",
                    headerSort: false,
                    formatter: function (cell) {
                        const logNameData = this.setLogName(cell)
                        return logNameData ? logNameData.caused : '-';
                    }.bind(this)
                }
            ]
            this.table.setColumns(crashListColumns)
        }
    }

    rowFormatter(row) {
        if (!row.getData().logType) {
            return
        }

        // 로그타입에 맞는 아이콘을 리턴받아서 각 셀에 넣어줌
        const logType = row.getData().logType;
        const convertedLogType = util.convertByLogType(logType);

        $(row.getCells()[3].getElement()).prepend($("<span>").addClass("bp").addClass(convertedLogType[0]));
        $(row.getCells()[4].getElement()).prepend($("<span>").addClass(convertedLogType[1]));
    }

    // 팝업 열기 함수
    async openPopup() {
        const {id} = this
        const $target = $('#' + id + '__popup')
        $target.show()
        $('.dimmed').show()
        await util.sleep(200)

        this.getLogList()
    }

    // 팝업 닫기 함수
    closePopup(v) {
        const popup = '#' + v.id + '__popup'
        const input = popup + ' input'
        const textarea = popup + ' textarea'
        const span = popup + ' span'

        util.removeMaxyCursor()
        v.table.clearData()
        $(input, textarea).val('')
        $(span).text('')
        const $dimmed = $('.dimmed')
        $dimmed.off('click')
        $dimmed.hide()
        $(popup).hide()
    }

    setLogName(cell) {
        const logName = cell.getData().logName
        if (!logName) {
            return '-'
        }

        const parts = logName.split(":");

        return {
            "caused": parts[1],
            "crashName": parts[0]
        }
    }

    setNoData() {
        const popup = '#' + this.id + '__popup'
        const textClass = popup + ' .txt'
        $(textClass).text('-')
    }

    getLogDetail(e, row) {
        const detail = JSON.stringify(row.getData())
        $('#' + this.id + '__popup' + ' #pLogDetail').text(util.beautifyJson(detail))
    }
}