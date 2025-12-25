/*
    종합 분석 > ResponseTime Scatter 팝업
    종합 분석 > ResponseTime Line Chart 팝업
* */
class AnalysisResponseWithMultipleUrlV2Popup {
    constructor(options) {
        this.appendId = options.appendId
        this.id = options.id
        const {paramList, ...rest} = options.data
        this.data = rest
        this.list = paramList
        this.type = options.requestType
        this.responseAvg = ''
        this.uuidList = []
        this.popupType = options.popupType
        this.intervalSort = options.intervalSort

        // 팝업 생성 후
        this.init().then(() => {
            this.addEventListener()
            this.openPopup().then(() => {
                // 슬라이드 팝업 인스턴스 생성
                this.detailPopup = new MaxyPopupAnalysisAjaxApiDetail({
                    id: this.id + '__detail'
                })
            })
        })
    }

    addEventListener() {
        const v = this
        $('.dimmed').on('click', () => {
            const $popup_right_side_wrap = $('#' + v.id + '__popup .popup_right_side_wrap')
            if ($popup_right_side_wrap.hasClass('show')) {
                $popup_right_side_wrap.removeClass('show').addClass('hidden');
                return
            }
            v.closePopup(v)
        })

        tippy('#pDeviceModel', {
            content: trl('common.msg.deviceIdCopy'),
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

        // Page Alias 변경 버튼 클릭시
        $('#' + v.id + '__popup .btn_alias').on('click', function () {
            const pReqUrlText = $('#pReqUrl').text()
            const reqUrl = pReqUrlText ? pReqUrlText : $('#pAliasValue').text()

            alias.show({
                reqUrl: reqUrl,
                cb: function () {
                    alias.callback(v, reqUrl)
                }
            })
        })

        popup.tooltip.loadingTimePopup()
    }

    async openPopup() {
        const {id} = this
        $('.dimmed').show()

        const $target = $('#' + id + '__popup')
        $target.show()

        this.drawTable()
    }

    closePopup(v) {
        const popup = '#' + v.id + '__popup'
        const input = popup + ' input'
        const textarea = popup + ' textarea'
        const span = popup + ' span'
        const $dimmed = $('.dimmed')

        // 팝업 닫을 때 커서가 보이면 없애주도록
        util.removeMaxyCursor()

        $(input, textarea).val('')
        $(span).text('')
        $dimmed.off('click')
        $dimmed.hide()
        $(popup).hide()
    }

    async init() {
        const v = this
        const {id, appendId, popupType} = v
        const source = await fetch(
            '/components/cmm/popup-analysis-response-multiple-url-v2.html')
            .then(response => response.text())

        const template = Handlebars.compile(source)

        const $target = $('#' + appendId)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + appendId
        }
        $target.empty()

        $target.append(template({id, popupType}))

        updateContent()
    }

    drawTable() {
        const v = this
        const {id} = v
        const placeholder = trl('common.msg.noData')
        const tableTarget = '#' + id + '__logList'

        const columnNames = {
            'time': trl('common.tableColumn.time'),
            'deviceId': trl('common.tableColumn.deviceId'),
            'userId': trl('common.text.userId'),
            'timestamp': trl('common.tableColumn.timestamp'),
            'networkStatus': trl('common.tableColumn.networkStatus'),
            'cpuUsage': trl('common.tableColumn.cpuUsage')
        }

        v.table = new Tabulator(tableTarget, {
            placeholder: placeholder,
            layout: "fitDataFill",
            columns: [
                {
                    title: columnNames.time,
                    field: "intervaltime",
                    width: "8%",
                    formatter: cell => {
                        return util.convertTime(cell.getValue(), false, true)
                    }
                },
                {
                    title: "Feeldex",
                    width: "8%",
                    field: "feeldex",
                    formatter: cell => {
                        const value = cell.getValue()
                        if (value === undefined || value < 0) {
                            return '-'
                        } else {
                            return util.getFeeldex(cell.getValue())[0]
                        }
                    },
                    tooltip: function (e, cell) {
                        const feeldexCode = cell.getValue()
                        if (feeldexCode !== undefined || feeldexCode >= 0) {
                            return util.setFeeldexTooltip(e, cell, feeldexCode)
                        }
                    }
                },
                {
                    title: columnNames.deviceId,
                    field: "deviceId",
                    width: "18%",
                    formatter: row => {
                        row.getElement().style.display = 'block'
                        row.getElement().style.textOverflow = 'ellipsis'
                        row.getElement().style.margin = 'auto'
                        return row.getValue()
                    }
                },
                {
                    title: columnNames.userId,
                    field: "userId",
                    width: "10%",
                    formatter: idDisplay.getId
                },
                {
                    title: columnNames.timestamp,
                    field: "logTm",
                    width: "14%",
                    formatter: row => {
                        return util.timestampToDateTimeMs(row.getValue())
                    }
                },
                {
                    title: columnNames.networkStatus,
                    field: "comSensitivity",
                    width: "12%",
                    formatter: cell => {
                        let comSensitivity = cell.getValue()
                        comSensitivity = comSensitivity ? comSensitivity : 0
                        return v.comSensitivityFormat(comSensitivity)
                    }
                },
                {
                    title: "Call",
                    field: "reqUrl",
                    width: "30%",
                },
                {
                    title: "logType",
                    field: "logType",
                    visible: false
                }
            ],
        });

        v.table.on('rowClick', (e, row) => {
            if (this.selectedRow) {
                this.selectedRow.getElement().classList.remove('selected_row')
            }
            row.getElement().classList.add('selected_row')
            this.selectedRow = row

            $('#' + id + '__popup' + ' #pReqUrl').text(row.getData().reqUrl || '-')
            v.getApiDetail(row.getData())
        })

        // 테이블이 모두 만들어지면 list data 조회하도록 수정,
        // ajax 통신의 경우 만들어질때 까지 시간이 있었다면 이 팝업에서는
        // 부모 페이지의 데이터를 가져와서 바로 그리기 때문에 tableBuilt 이벤트 등록이 필요
        v.table.on('tableBuilt', function () {
            v.getListData()
        })
    }

    // 차트 위 상세 데이터 세팅
    getApiDetail(row) {
        const v = this

        const param = {
            packageNm: v.data.packageNm,
            serverType: v.data.serverType,
            osType: v.data.osType,
            deviceId: row.deviceId,
            from: v.data.from,
            to: v.data.to,
            logTm: row.logTm,
            docId: row._id,
            mxPageId: row.mxPageId
        }

        // maxy demo인 경우만 dummyYn을 true로 세팅
        if (param.packageNm === 'maxy') {
            param.dummyYn = true
        }

        cursor.show(false, '#' + v.id + '__popup')
        ajaxCall('/pa/0000/v2/getApiDetail.maxy', param, {disableCursor: true})
            .then((data) => {
                const {
                    detail,
                    hasPageLog,
                } = data

                const $btnPageFlow = $('#btnPageFlow')
                if (hasPageLog) {
                    this.tmpDeviceId = row.deviceId
                    this.logTm = row.logTm
                    $btnPageFlow.show()
                } else {
                    $btnPageFlow.hide()
                }

                v.detailPopup.setDetailData(detail)
                $('#' + v.id + '__popup .popup_right_side_wrap').removeClass('hidden').addClass('show')

                // 펼쳐진 팝업 박스 내 기본정보 세팅
                v.detailPopup.setData(data)

                // 펼쳐진 팝업 박스 내 기본정보 세팅
                const perParam = {
                    packageNm: v.data.packageNm,
                    serverType: v.data.serverType,
                    osType: v.data.osType,
                    reqUrl: row.reqUrl,
                    intervaltime: detail.intervaltime || 0,
                }
                ajaxCall('/pa/0000/v2/getPercentileData.maxy', perParam, {disableCursor: true})
                    .then((perData) => {
                        v.detailPopup.setPercentileChart(perData)
                    })
            })
            .catch(error => {
                console.log(error)
            })
            .finally(() => {
                cursor.hide('#' + v.id + '__popup')
            })
    }

    /**
     * 팝업 상단 list 영역 데이터 요청 함수
     */
    getListData() {
        const v = this
        const {list, id} = v

        try {
            const $countTarget = $('#' + id + '__popup' + ' #count')
            if (!list || list.length === 0) {
                $countTarget.text('(0)')
                return
            }

            $countTarget.text('(' + util.comma(list.length) + ')')

            v.getResponseAvg().then(() => {
                if (!v.responseAvg) {
                    v.responseAvg = 0
                }

                for (let i = 0; i < list.length; i++) {
                    const osType = list[i].osType
                    const intervaltime = list[i].intervaltime

                    list[i].feeldex = util.getFeeldexCode(v.responseAvg, intervaltime, osType)
                }
                if (!v.intervalSort) {
                    list.sort((a, b) => b.logTm - a.logTm)
                }
                // list 그리기
                v.table.setData(list)

                // 첫 행 강제 클릭되게
                //$('#' + id + '__popup' + ' .tabulator-table > div:eq(0)').trigger('click')
            })
        } catch (e) {
            console.log(e)
        }
    }

    getUserFlow() {
        const packageNm = $('#packageNm').val()
        const serverType = $('#packageNm option:checked').data('server-type')
        const deviceId = this.tmpDeviceId
        const logTm = this.logTm
        const params = {
            deviceId,
            packageNm,
            serverType,
            logTm,
        }

        sessionStorage.setItem('ua0400Params', JSON.stringify(params))
        // 사용자 행동분석 버튼을 눌러 사용자 분석 화면으로 이동할 떄는 새창으로 열도록 변경
        const targetUrl = '/ua/0000/goMenuUserAnalysisView.maxy'
        window.open(targetUrl, '_blank')
    }

    comSensitivityFormat(val) {
        const comSensitivityFormatArr = util.convertComSensitivity(val);

        const networkStatusEl = "<span class='network_status " + comSensitivityFormatArr[1] + "'></span>";
        const sttsTxtEl = "<span class='txt'>" + comSensitivityFormatArr[0] + "</span>";

        return networkStatusEl + sttsTxtEl + '';
    }

    async getResponseAvg() {
        const v = this

        const param = {
            'packageNm': $('#packageNm').val(),
            'serverType': $('#packageNm option:checked').data('server-type'),
            'osType': $('#osType').val(),
            'type': 'response',
            'searchFromDt': util.dateToTimestamp(util.getDate(-7), true),
            'searchToDt': new Date().getTime()
        }
        await ajaxCall('/db/0100/getAvgFromLoadingOrResponse.maxy', param, {disableCursor: true})
            .then(data => {
                v.responseAvg = data
            })
    }
}
