// noinspection JSUnresolvedReference
class MaxyPopUserList {
    constructor(options) {
        this.appendId = options.appendId
        this.id = options.id
        this.searchFromDt = options.searchFromDt
        this.searchToDt = options.searchToDt
        this.fromDate = options.fromDateHHmm
        this.toDate = options.toDateHHmm

        this.init().then(() => {
            this.addEventListener()
            this.openPopup()
            this.drawTable()
        })
    }

    addEventListener() {
        const v = this

        $('.dimmed').on('click', () => {
            v.closePopup(v)
        })
    }

    async init() {
        const {id, appendId, fromDate, toDate} = this
        const source = await fetch(
            '/components/ua/popup/popup-user-list-by-time.html')
            .then(response => response.text())

        const template = Handlebars.compile(source)

        const $target = $('#' + appendId)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + appendId
        }
        $target.empty()

        const date = fromDate + ' ~ ' + toDate.substring(0, toDate.lastIndexOf(':'))
        $target.append(template({id, date}))
    }

    drawTable() {
        const v = this

        const columnNames = {
            'deviceId': i18next.tns('common.tableColumn.deviceId'),
            'userId': i18next.tns('common.text.userId'),
            'stayTime': i18next.tns('dashboard.bi.stayTimeEng')
        }

        const btnFormatter = () => {
            return ' <img class="img_search_p" alt="">'
        }

        // 선택한 행의 deviceId를 searchValue에 넣어주고 해당 deviceId에 대한 page flow를 조회한다.
        const setDeviceId = (e, cell) => {
            const searchFromDt = v.searchFromDt
            const searchToDt = v.searchToDt
            const searchValue = cell.getData().deviceId
            const param = {
                searchFromDt,
                searchToDt,
                searchValue
            }
            $('#searchValue').val(searchValue)

            v.getUserFlow(param)
        }

        v.table = new Tabulator('#' + v.id, {
            height: 'calc(100% - 40px)',
            layout: 'fitDataFill',
            placeholder: i18next.tns('common.msg.noData'),
            columns: [
                {
                    title: 'Access Time',
                    field: "pageStartTm",
                    width: "20%",
                    formatter: util.timestampToDateTime
                },
                {
                    title: columnNames.deviceId,
                    field: "deviceId",
                    width: "35%"
                },
                {
                    title: columnNames.stayTime,
                    field: "totalIntervalTime",
                    width: "15%",
                    formatter: cell => {
                        return util.convertTime(cell.getValue(), true, false, false)
                    }
                },
                {
                    title: columnNames.userId,
                    field: "userId",
                    width: "15%",
                    formatter: function (cell) {
                        const userIdArr = cell.getData().userId
                        const clientNo = cell.getData().clientNo
                        // userIdArr의 length가 1이면서 userId가 "-"인 경우
                        if (userIdArr.length === 1 && userIdArr[0].key === "-") {
                            // clientNo가 비어있는지 확인하고 비어있으면 "-"를 아니라면 clientNo 사용
                            return !clientNo || clientNo.trim() === "" ? "-" : clientNo
                        }
                        // userId가 1개면 + 텍스트 추가 하지 않음
                        return userIdArr.length === 1
                            ? userIdArr[0].key
                            : userIdArr[0].key + '<span class="userIdCount">' + "+" + (userIdArr.length - 1) + '</span>'
                    },
                    tooltip: function (e, cell) {
                        const userIdArr = cell.getData().userId
                        const arr = []
                        // userIdArr의 length가 1이면서 userId가 "-"인 경우 툴팁 표시 안함
                        if (userIdArr.length === 1 && userIdArr[0].key === "-") {
                            return ""
                        }

                        // userIdArr에서 화면에 표시되는 첫 번째 id는 툴팁 내용에서 제외
                        for (const item of userIdArr.slice(1, userIdArr.length)) {
                            if (item.key !== "-") {
                                arr.push(item.key)
                            }
                        }

                        return arr.join(", ")
                    }
                },
                {
                    title: '',
                    width: "5%",
                    headerSort: false,
                    formatter: btnFormatter,
                    cellClick: setDeviceId
                }
            ]
        })

        updateContent()
        this.getTotalUserList()
    }

    getTotalUserList() {
        const {searchFromDt, searchToDt, table, id} = this
        const param = {
            packageNm: $('#packageNm').val(),
            serverType: $('#packageNm option:checked').data('server-type'),
            searchFromDt,
            searchToDt
        }

        if (util.checkParam(param)) {
            return
        }

        // device page flow list에 있는 사용자 리스트를 가져온다.
        ajaxCall('/ua/0000/getTotalUserList.maxy', param)
            .then(data => {
                try {
                    cursor.hide()
                    const {totalUserList} = data

                    const $countTarget = $("#" + id + "__popup" + " #count")
                    const length = totalUserList.length

                    if (isNaN(length)) {
                        $countTarget.text('(0)')
                    } else {
                        $countTarget.text('(' + util.comma(length) + ')')
                    }

                    table.setData(totalUserList)
                } catch {
                    console.log(e)
                }

            }).catch(error => {
            console.error(error)
            cursor.hide()
        })
    }

    getUserFlow(param) {
        // 현재 팝업 닫아주고 device 세팅 후 데이터 조회
        this.closePopup(this)
        document.getElementById('searchKey').value = 'deviceId'

        $('#doSearch').trigger('click', [param])
    }

    // 팝업 열기 함수
    async openPopup() {
        const {id} = this
        $('.dimmed').show()

        const $target = $('#' + id + '__popup')
        $target.show()

        await util.sleep(200)
    }

    makeTooltipInfo(arr1, arr) {
        tippy('.userIdCount', {
            content: comment,
            placement: 'bottom',
            allowHTML: true,
            arrow: false,
            theme: 'maxy-tooltip'
        })
    }

    // 팝업 닫기 함수
    closePopup(v) {
        const popup = '#' + v.id + '__popup'
        const input = popup + ' input'
        const textarea = popup + ' textarea'
        const span = popup + ' span'
        const $dimmed = $('.dimmed')

        v.table.clearData()
        $(input, textarea).val('')
        $(span).text('')

        $dimmed.off('click')
        $dimmed.hide()
        $(popup).hide()
    }
}