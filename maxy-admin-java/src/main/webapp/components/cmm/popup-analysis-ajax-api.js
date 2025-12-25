/*
    성능분석 > AJAX 분석 > API 리스트 상세 팝업
 */

class MaxyPopupAnalysisAjaxApi {
    constructor(options) {
        this.appendId = options.appendId
        this.id = options.id
        this.param = options.param
        this.reqUrl = options.reqUrl
        this.selectedRow = null
        this.detailPopup = null
        this.deviceId = null
        this.popupType = options.popupType

        if (!this.id || !this.appendId) {
            console.log('check parameter')
            return false
        }

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

        popup.tooltip.loadingTimePopup()
        // Jennifer 차트 관련 이벤트는 popup-analysis-ajax-api-detail.js로 이동
    }

    // 팝업 열기 함수
    async openPopup() {
        const {id, reqUrl} = this
        $('.dimmed').show()

        const $target = $('#' + id + '__popup')
        $target.show()

        await util.sleep(200)

        const packageNm = sessionStorage.getItem('packageNm')
        const serverType = sessionStorage.getItem('serverType')
        const pageNm = convertAliasWithUrl(packageNm, serverType, reqUrl)
        $('#' + id + '__popup' + ' #pReqUrl').text(pageNm || '-')

        this.getApiListByApiUrl()
    }

    async init() {
        const {id, appendId, popupType} = this

        const source = await fetch(
            '/components/cmm/popup-analysis-ajax-api.html')
            .then(response => response.text())

        const template = Handlebars.compile(source)

        const $target = $('#' + appendId)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + appendId
        }
        $target.empty()

        $target.append(template({id, popupType}))

        updateContent()

        const tableTarget = '#' + id + '__logList'

        const packageNm = sessionStorage.getItem('packageNm')
        const serverType = sessionStorage.getItem('serverType')
        const columnNames = {
            'time': trl('common.tableColumn.time'),
            'deviceId': trl('common.tableColumn.deviceId'),
            'userId': trl('common.text.userId')
        }

        this.table = new Tabulator(tableTarget, {
            layout: 'fitDataFill',
            placeholder: trl('common.msg.noData'),
            initialSort: [
                {
                    column: "logTm", dir: "desc"
                }
            ],
            columns: [
                {
                    title: columnNames.time,
                    headerTooltip: 'Time',
                    field: "intervaltime",
                    hozAlign: "left",
                    width: "9%",
                    formatter: cell => {
                        const value = cell.getValue()
                        if (isNaN(value)) {
                            return '-'
                        } else {
                            return util.comma(value) + ' ms'
                        }
                    }
                },
                {
                    title: 'FeelDex',
                    headerTooltip: 'FeelDex',
                    field: "feeldex",
                    hozAlign: "left",
                    width: "8%",
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
                    headerTooltip: 'Device ID',
                    field: "deviceId",
                    width: "19%",
                    formatter: row => {
                        row.getElement().style.display = 'block'
                        row.getElement().style.textOverflow = 'ellipsis'
                        row.getElement().style.margin = 'auto'
                        return row.getValue()
                    },
                    tooltip: true
                },
                {
                    title: columnNames.userId,
                    headerTooltip: 'User ID',
                    field: "userId",
                    hozAlign: "left",
                    width: "10%",
                    formatter: idDisplay.getId
                },
                {
                    title: 'Start Time',
                    headerTooltip: 'Start Time',
                    field: "logTm",
                    width: "14%",
                    formatter: cell => {
                        const value = cell.getValue()
                        if (value) {
                            return util.timestampToDateTime(value)
                        } else {
                            return '-'
                        }
                    }
                },
                {
                    title: 'Status',
                    headerTooltip: 'Status',
                    field: "statusCode",
                    hozAlign: "left",
                    width: "8%",
                    formatter: (cell) => {
                        const value = cell.getValue()
                        const normal = trl('common.text.normal')
                        if (value === null || value === undefined) {
                            // 하위호환 성공 처리
                            return "<span class='status success'>" + normal + "</span>"
                        } else if (value === '0') {
                            return "<span class='status exception'>" + 'Exception' + "</span>"
                        } else if (value.toString().startsWith('2')) {
                            return "<span class='status success'>" + normal + "</span>"
                        } else {
                            return "<span class='status error'>" + 'Error' + "</span>"
                        }
                    }
                },
                {
                    title: 'Status Code',
                    headerTooltip: 'Status Code',
                    field: "statusCode",
                    hozAlign: "left",
                    width: "10%",
                    formatter: cell => {
                        const value = cell.getValue()
                        if (isNaN(value) || value === '0') {
                            return '-'
                        } else {
                            return value
                        }
                    }
                },
                {
                    title: 'Page URL',
                    headerTooltip: 'Page URL',
                    field: "pageUrl",
                    width: "21%",
                    formatter: cell => {
                        return getPageList(packageNm, serverType, cell.getValue())
                    }
                }
            ],
        });

        this.table.on('rowClick', (e, row) => {
            if (this.selectedRow) {
                this.selectedRow.getElement().classList.remove('selected_row')
            }
            row.getElement().classList.add('selected_row')
            this.selectedRow = row
            this.rowData = row.getData()
            this.logTm = this.rowData.logTm
            this.deviceId = this.rowData.deviceId

            this.getApiDetail(this.rowData)

        })
    }

    getApiListByApiUrl() {
        const v = this

        try {
            const param = {
                packageNm: this.param.packageNm,
                serverType: this.param.serverType,
                osType: this.param.osType,
                from: this.param.from,
                to: this.param.to,
                reqUrl: this.param.reqUrl,
                durationFrom: this.param.durationFrom || '',
                durationTo: this.param.durationTo || '',
                mxPageId: this.param.mxPageId || '',
            }

            cursor.show(false, '#' + v.id + '__popup')
            ajaxCall('/pa/0000/v2/getApiListByApiUrl.maxy', param)
                .then((data) => {
                    const length = data.length
                    $('#' + v.id + '__popup' + ' #count').text('(' + util.comma(length) + ')')
                    v.setTableData(data)
                })
                .catch(error => {
                    console.log(error.msg)
                })
                .finally(() => {
                    cursor.hide('#' + v.id + '__popup')
                })

        } catch (e) {
            console.log(e)
        }
    }

    setTableData(data) {
        const v = this
        v.table.setData(data)
    }

    getApiDetail(row) {
        const v = this

        const param = {
            packageNm: v.param.packageNm,
            serverType: v.param.serverType,
            osType: v.param.osType,
            deviceId: row.deviceId,
            from: v.param.from,
            to: v.param.to,
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
                    $btnPageFlow.show()
                } else {
                    $btnPageFlow.hide()
                }

                v.detailPopup.setDetailData(detail)
                $('#' + v.id + '__popup .popup_right_side_wrap').removeClass('hidden').addClass('show')

                // 펼쳐진 팝업 박스 내 기본정보 세팅
                v.detailPopup.setData(data)

                // 팝업 상단 Response Time 게이지바 세팅
                const perParam = {
                    packageNm: v.param.packageNm,
                    serverType: v.param.serverType,
                    osType: v.param.osType,
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

    // 팝업 닫기 함수
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

    getUserFlow() {
        const packageNm = $('#packageNm').val()
        const serverType = $('#packageNm option:checked').data('server-type')
        const deviceId = this.deviceId
        const logTm = this.logTm

        const params = {
            deviceId,
            packageNm,
            serverType,
            logTm
        }

        sessionStorage.setItem('ua0400Params', JSON.stringify(params))

        const targetUrl = '/ua/0000/goMenuUserAnalysisView.maxy'
        window.open(targetUrl, '_blank')
    }


}
