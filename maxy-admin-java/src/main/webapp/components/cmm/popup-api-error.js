/*
    성능 분석 > API Error > 팝업
*/
class MaxyPopupApiError {
    constructor(options) {
        this.appendId = options.appendId
        this.id = options.id
        this.param = options.param

        if (!this.id || !this.appendId || !this.param) {
            console.log('check parameter')
            return false
        }

        this.init().then(() => {
            this.addEventListener()
            popup.open(this.id).then(() => {
                this.drawTable()

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
            popup.close(v)
        })

        $('#btnPageFlow').on('click', function () {
            const {selectedData} = v
            popup.goUserFlowPage(selectedData)
        })

        popup.tooltip.loadingTimePopup()
    }

    async init() {
        const v = this
        const {id, appendId, param} = v
        const source = await fetch(
            '/components/cmm/popup-api-error.html')
            .then(response => response.text())

        const template = Handlebars.compile(source)
        const $target = $('#' + appendId)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + appendId
        }
        $target.empty()

        $target.append(template({id, popupType: 'Error'}))

        const $pReqUrl = $('#' + id + '__popup' + ' #pReqUrl')
        const $pAliasValue = $('#' + id + '__popup' + ' #pAliasValue')

        const fromDt = util.timestampToDateTime(param.from)
        const toDt = util.timestampToDateTime(param.to)
        $('#' + id + '__popup' + ' #pSearchTm').text(fromDt + ' ~ ' + toDt)

        const packageNm = param.packageNm
        const serverType = param.serverType
        const aliasValue = getPageList(packageNm, serverType, param.reqUrl)

        // aliasValue 없는 경우 또는 aliasValue랑 reqUrl이 같은 경우
        if (!aliasValue || aliasValue === param.reqUrl) {
            $pReqUrl.hide()
            $pAliasValue.css('max-width', '100%')
            $pAliasValue.text(param.reqUrl)
        } else {
            if ($pReqUrl.css('display') === 'none') {
                $pReqUrl.show()
            }
            $pAliasValue.text(aliasValue)
            $pAliasValue.css('max-width', '20vw')
            $pReqUrl.text(param.reqUrl)
        }
    }

    drawTable() {
        const v = this;
        const {id, param} = v
        const {packageNm, serverType} = param
        const tableTarget = '#' + id + '__apiErrorList'

        const columnNames = {
            'time': trl('common.tableColumn.time'),
            'deviceId': trl('common.tableColumn.deviceId'),
            'userId': trl('common.text.userId'),
            'statusCode': trl('common.tableColumn.statusCode'),
            'errorType': trl('common.tableColumn.errorType'),
            'reqMsg': trl('common.tableColumn.reqMsg'),
            'dataType': trl('common.tableColumn.dataType'),
        }

        v.table = new Tabulator(tableTarget, {
            layout: 'fitDataFill',
            placeholder: trl('common.msg.noData'),
            columns: [
                {
                    title: columnNames.time,
                    field: "logTm",
                    hozAlign: "left",
                    width: "15%",
                    formatter: cell => {
                        return util.timestampToDateTime(cell.getValue())
                    }
                },
                {
                    title: columnNames.deviceId,
                    field: "deviceId",
                    hozAlign: "left",
                    width: "14%",
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
                    field: "userId",
                    hozAlign: "left",
                    width: "10%",
                    formatter: idDisplay.getId
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
                    title: columnNames.statusCode,
                    width: "15%",
                    field: "statusCode",
                    formatter: cell => {
                        return cell.getValue() > 0 ? cell.getValue() : '-'
                    }
                },
                {
                    title: 'Page URL',
                    field: "pageUrl",
                    hozAlign: "left",
                    width: "26%",
                    tooltip: true,
                    formatter: (cell) => {
                        return getPageList(packageNm, serverType, cell.getValue())
                    }
                },
                {
                    title: columnNames.dataType,
                    field: "logType",
                    vertAlign: 'middle',
                    hozAlign: 'center',
                    width: "11%",
                    formatter: (cell) => {
                        const logType = cell.getValue()
                        if (logType >= 0x00080000 && logType <= 0x00080005) {
                            return `<span class='status green'>Native</span>`
                        } else {
                            return `<span class='status yellow'>JS</span>`
                        }
                    }
                }
            ],
        })

        v.table.on('rowClick', (e, row) => {
            popup.rowClick(e, row, v, (data) => {
                v.getApiDetail(data)
            });
        });

        v.table.on('tableBuilt', function () {
            v.getListData()
        })
    }

    getListData() {
        const v = this
        const {param} = v

        cursor.show(false, '#' + v.id + '__popup')
        ajaxCall('/pa/0000/v2/getErrorListByApiUrl.maxy', param, {disableCursor: true})
            .then((data) => {
                this.setTableData(data)
            })
            .catch(error => {
                console.log(error.msg)
            })
            .finally(() => {
                cursor.hide('#' + v.id + '__popup')
            })
    }

    getApiDetail(row) {
        const v = this

        cursor.show(false, '#' + v.id + '__popup')

        const {
            osType,
            deviceId,
            deviceModel,
            comType,
            _id,
            logTm,
            simOperatorNm,
            mxPageId
        } = row

        const param = {
            packageNm: $('#packageNm_a').val(),
            serverType: $('#packageNm_a option:checked').data('server-type'),
            osType: osType,
            deviceId: deviceId,
            from: this.param.from,
            to: this.param.to,
            logTm: logTm,
            docId: _id,
            mxPageId: mxPageId
        }
        // maxy demo인 경우만 dummyYn을 true로 세팅
        if (sessionStorage.getItem('packageNm') === 'maxy') {
            param.dummyYn = true
        }

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

                // 팝업 상단에 기본 정보 세팅
                v.detailPopup.setDetailData(detail)
                // 슬라이드 팝업 펼치기
                $('#' + v.id + '__popup .popup_right_side_wrap').removeClass('hidden').addClass('show')

                // 펼쳐진 팝업 박스 내 기본정보 세팅
                v.detailPopup.setData(data)

                // 팝업 상단 Response Time 게이지바 세팅
                const perParam = {
                    packageNm: param.packageNm,
                    serverType: param.serverType,
                    osType: param.osType,
                    reqUrl: v.param.reqUrl,
                    intervaltime: detail.intervaltime || 0,
                }
                ajaxCall('/pa/0000/v2/getPercentileData.maxy', perParam, {disableCursor: true})
                    .then((perData) => {
                        v.detailPopup.setPercentileChart(perData)
                    })
            })
            .catch(error => {
                console.log(error.msg)
            })
            .finally(() => {
                cursor.hide('#' + v.id + '__popup')
            })
    }

    setTableData(data) {
        const v = this

        try {
            const logList = data

            const $countTarget = $('#' + v.id + '__popup' + ' #count')

            // 테이블에 데이터 넣기
            this.table.setData(logList)
            const $logDetailGraph = $('#logDetail__logDetail')
            $logDetailGraph.removeClass('no_data')

            if (logList.length === 0 || !logList) {
                $logDetailGraph.addClass('no_data')
                $countTarget.text('0')
                $('.graph_title button').off('click')
                return
            }

            $countTarget.text('(' + util.comma(logList.length) + ')')
        } catch (e) {
            console.log(e)
        }

    }
}