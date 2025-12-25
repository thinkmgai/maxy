/*
    종합 분석 > Page View > 팝업
    종합 분석 > Favorites > 팝업
 */
class MaxyPopupLogListByPage {
    constructor(options) {
        this.appendId = options.appendId
        this.id = options.id
        this.reqUrl = options.reqUrl
        this.from = options.from
        this.to = options.to
        this.deviceModel = options.deviceModel
        this.logType = options.logType
        this.selectedRow = null
        this.offsetIndex = 0
        this.next = []

        const {appendId, id, logType} = this
        if (logType === 'crash') {
            this.type = 'Crash'
        } else if (logType === 'error') {
            this.type = 'Error'
        } else {
            this.type = 'Log'
        }

        if (!id || !appendId) {
            toast(trl('common.msg.checkParam'))
            return false
        }

        this.init().then(() => {
            this.addEventListener()
            this.openPopup().then(() => {
            })
        })
    }

    addEventListener() {
        const {id} = this
        const v = this
        $('.dimmed').on('click', () => {
            v.closePopup(v)
        })

        // ALL, Error, Crash 토글버튼
        const toggle = (t) => {
            $(t).siblings('button').removeClass('on')
            $(t).addClass('on')
        }

        tippy('#btnPageFlow', {
            content: trl('common.text.userBehavior'),
            arrow: false,
            placement: 'bottom',
            allowHTML: true,
            theme: 'maxy-tooltip'
        })

        tippy('#pDeviceModel', {
            content: trl('common.msg.deviceIdCopy'),
            arrow: false,
            placement: 'bottom',
            allowHTML: true,
            theme: 'maxy-tooltip'
        })

        $('#btnPageFlow').on('click', function () {
            v.getUserFlow()
        })

        $('#pDeviceModel').on('click', function () {
            util.copy(this)
        })

        $('#btnLoadNextData').on('click', function () {
            v.selectedRow = null
            v.getLogList("next")
        })

        $('#btnLoadPrevData').on('click', function () {
            v.selectedRow = null
            v.getLogList("prev")
        })

        // All, Error, Crash 토글 이벤트
        $('#' + id + '__popup' + ' .maxy_component_btn').on('click', function () {
            const dateType = $(this).data('type')

            toggle(this)

            // 페이징값 초기화
            v.offsetIndex = 0
            v.next = []
            v.logType = dateType
            v.selectedRow = null
            v.getLogList()
        })
    }

    async init() {
        const {id, appendId, reqUrl, logType} = this
        const source = await fetch(
            '/components/cmm/popup-log-list-by-page.html')
            .then(response => response.text())

        const template = Handlebars.compile(source)

        const $target = $('#' + appendId)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + appendId
        }
        $target.empty()

        // 페이지명 가져오기
        const packageNm = $('#packageNm').val()
        const serverType = $('#packageNm option:checked').data('server-type')
        const pageNm = getPageList(packageNm, serverType, reqUrl)

        // reqUrl과 매핑된 페이지명이 같으면 pageNm칸 제거
        if (reqUrl === pageNm) {
            $target.append(template({id, pageNm}))
            $('#reqUrl').remove()
            $('#pageNm').css('max-width', '63vw')
        } else {
            $target.append(template({id, reqUrl, pageNm}))

            const $pageNm = $('#pageNm')
            $pageNm.css('max-width', '25vw')
        }

        // Total일 경우에만 토글버튼 show
        if (logType === 'TOTAL') {
            $('.maxy_component_btn_wrap').show()
        } else {
            $('.maxy_component_btn_wrap').hide()
        }

        updateContent()

        const columnNames = {
            "time": trl('common.tableColumn.time'),
            "deviceId": trl('common.tableColumn.deviceId'),
            "userId": trl('common.text.userId'),
            "logClass": trl('common.tableColumn.logClass'),
            "logType": trl('common.tableColumn.logType'),
            "appver": trl('common.tableColumn.appVer'),
        }

        const tableTarget = '#' + id + '__logList'
        this.table = new Tabulator(tableTarget, {
            layout: 'fitDataFill',
            placeholder: trl('common.msg.noData'),
            rowFormatter: this.rowFormatter.bind(this),
            columns: [
                {
                    title: columnNames.time,
                    field: "logTm",
                    hozAlign: "left",
                    width: "17%",
                    formatter: util.timestampToDateTimeMs
                },
                {
                    title: columnNames.deviceId,
                    field: "deviceId",
                    hozAlign: "left",
                    width: "10%",
                    tooltip: true
                },
                {
                    title: columnNames.userId,
                    field: "userId",
                    hozAlign: "left",
                    width: "10%",
                    tooltip: util.tooltipFormatter
                },
                {
                    title: columnNames.logClass,
                    field: "logType",
                    hozAlign: "left",
                    width: "14%",
                    formatter: function (cell) {
                        let value = cell.getValue()
                        if (value) {
                            return getLogTypeGroup(value)
                        } else {
                            return '-'
                        }
                    }
                },
                {
                    title: columnNames.logType,
                    field: "logType",
                    hozAlign: "left",
                    width: "14%",
                    formatter: function (cell) {
                        let value = cell.getValue()
                        if (value) {
                            return getLogTypeDetail(value)
                        } else {
                            return '-'
                        }
                    }
                },
                {
                    title: 'OS',
                    field: "osType",
                    width: "6%",
                    formatter: function (cell) {
                        return util.convertOsIcon(cell.getValue())
                    }
                },
                {
                    title: 'App Version',
                    field: "appVer",
                    width: "13%"
                },
                {
                    title: 'Category',
                    field: "logType",
                    width: "11%",
                    formatter: function (cell) {
                        return '<span class="category active">' + util.logTypeToCategory(cell.getValue()) + '</span>'
                    }
                },
                {
                    field: "deviceModel",
                    visible: false
                }
            ],
        });

        this.table.on('rowClick', (e, row) => {
            $('#' + id + '__popup' + ' .tabulator-table > div:eq(0)').off('click')

            if (this.selectedRow) {
                this.selectedRow.getElement().classList.remove('selected_row')
            }

            row.getElement().classList.add('selected_row')
            this.selectedRow = row
            // 행 클릭 시 마다 loading ,response med 값 - 처리
            $('#pLoadingTimeAvg').text('-')
            $('#pResponseTimeAvg').text('-')

            const rowData = row.getData()
            this.getLogDetail(rowData)
        })
    }

    getLogList(type) {
        const v = this
        const {reqUrl, deviceModel, logType, from, to, id} = this

        try {
            const $reqUrl = $('#reqUrl')
            const $pageNm = $('#pageNm')
            let pageNmWidth = $pageNm.width()

            if ($reqUrl.css('display') !== 'none') {
                // #reqUrl의 max-width 설정
                $reqUrl.css('max-width', `calc(63vw - ${pageNmWidth}px)`)
            }

            const {packageNm, serverType} = util.getAppInfo('#packageNm')
            const params = {
                packageNm, serverType,
                osType: $('#osType').val(),
                info: true,
                requestType: logType.toUpperCase(),
                offsetIndex: this.offsetIndex
            }

            if (reqUrl) {
                params.reqUrl = reqUrl
            } else if (deviceModel) {
                params.deviceModel = deviceModel
            }

            if (from) {
                params.from = from
            }
            if (to) {
                params.to = to
                params.toDt = to
            }

            if (type === "prev") {
                this.offsetIndex--
            } else {
                this.offsetIndex++
            }

            params.offsetIndex = this.offsetIndex

            // 이전 페이지 눌렀을때
            if (type === 'prev') {
                // 다음페이지가 있다면 v.next를 2개를 지움
                // 다음페이지가 없다면 1개만 지움 (getCommonLogList.maxy 호출후 다음페이지가 없으면 v.next에 쌓는 값이 없음)
                if ($('#btnLoadNextData').prop('disabled') !== true) {
                    v.next.pop()
                }
                v.next.pop()
            }

            if (v.next.length !== 0) {
                params.lastLogTm = v.next[v.next.length - 1].lastLogTm
                params.lastId = v.next[v.next.length - 1].lastId
            }

            ajaxCall('/db/0100/getCommonLogList.maxy', params,
                {disableDimmed: true}).then(response => {
                // 로그 목록 세팅
                const {logList, searchAfter} = response
                const $logDetail = $('#logDetail')

                if (!logList || logList.length === 0) {
                    $logDetail.addClass('no_data')
                    this.setNodata()

                    $('#btnLoadPrevData').attr('disabled', true)
                    $('#btnLoadNextData').attr('disabled', true)
                } else {
                    $logDetail.removeClass('no_data')
                    // 테이블에 데이터 넣기
                    this.table.setData(logList).then(() => {
                        // 첫 행 강제 클릭되게
                        $('#' + id + '__popup' + ' .tabulator-table > div:eq(0)').trigger('click')

                        const $btnLoadPrevData = $('#btnLoadPrevData')
                        const $btnLoadNextData = $('#btnLoadNextData')

                        // 첫번째 페이지일 경우, 이전 버튼 비활성 처리
                        if (v.offsetIndex <= 1) {
                            $btnLoadPrevData.attr('disabled', true)
                            $btnLoadNextData.attr('disabled', false)
                        } else {
                            // 마지막 페이지 여부에 따라 다음 버튼 상태 설정
                            $btnLoadPrevData.attr('disabled', false)
                            // 첫 페이지 여부에 따라 이전 버튼 상태 설정
                            $btnLoadNextData.attr('disabled', false)
                        }

                        // searchAfter가 있을때만 값을 넣는다! searchAfter가 없다는 건 마지막 페이지라는 뜻임.
                        if (searchAfter) {
                            v.next.push({
                                'lastLogTm': searchAfter[0],
                                'lastId': searchAfter[1]
                            })
                        } else {
                            // 다음 페이지가 없으면 버튼 disabled
                            $btnLoadNextData.attr('disabled', true)
                        }

                        // 이전 버튼을 눌렀을 경우
                        if (type === 'prev') {
                            // 첫 페이지가 아니면 (2,3,4~~ n번째 페이지면) 다음 버튼 활성화
                            if (v.offsetIndex >= 1) {
                                $btnLoadNextData.attr('disabled', false)
                            } else if (v.offsetIndex <= 1) {
                                // 첫 페이지면 이전버튼 비활성화
                                $btnLoadPrevData.attr('disabled', true)
                            }
                        }
                    })
                }
            }).catch((e) => {
                console.log(e)
            })
        } catch (e) {
            console.log(e)
        }
    }

    // 테이블 하단에 상세 데이터 가져오기
    getLogDetail(row) {
        const $btnPageFlow = $('#btnPageFlow')

        try {
            const param = {
                packageNm: $('#packageNm').val(),
                serverType: $('#packageNm option:checked').data('server-type'),
                osType: $('#osType').val(),
                deviceId: row.deviceId,
                reqUrl: row.reqUrl,
                from: row.logTm,
                to: row.logTm,
                logType: row.logType,
                requestType: row.logType === 2097152 ? "CRASH" : this.logType.toUpperCase(),
                deviceModel: row.deviceModel,
                docId: row._id
            }

            this.tmpDeviceId = param.deviceId
            this.logTm = param.from

            ajaxCall('/db/0100/getLogDetail.maxy', param, {disableDimmed: true}).then(response => {
                const {logDetail, pageInfo, hasPageLog} = response

                if (hasPageLog) {
                    $btnPageFlow.show()
                } else {
                    $btnPageFlow.hide()
                }
                if (Object.keys(logDetail).length === 0) {
                    const $logDetail = $('#logDetail')
                    if (!$logDetail.hasClass('no_data')) {
                        $logDetail.addClass('no_data')
                    }
                    return
                }
                this.setDetailData(logDetail, pageInfo)
            }).catch(error => {
                console.log(error)
            })

            ajaxCall('/db/0100/getMedFromLoadingOrResponse.maxy', param, {disableDimmed: true}).then(response => {
                this.setAvgData(response.result)
            }).catch(error => {
                console.log(error)
            })
        } catch (e) {
            console.log(e)
        }
    }

    // 리스트 행 클릭 시 나오는 상세 데이터 넣기
    setDetailData(logDetail, pageInfo) {
        const {v} = DB0100
        try {
            const {
                deviceModel,
                deviceId,
                osType,
                osVer,
                memUsage,
                cpuUsage,
                reqUrl,
                appVer,
                resMsg,
                content,
                comSensitivity,
                batteryLvl,
                storageTotal,
                storageUsage,
                appBuildNum,
                webviewVer,
                packageNm,
                serverType,
                logType,
                timezone,
                pageUrl,
                comType,
                contents,
                userId,
                simOperatorNm,
                ip
            } = logDetail

            if (pageInfo) {
                const {loadingTime, responseTime} = pageInfo
                $('#pLoadingTime').text(util.isEmpty(loadingTime) ? '-' : util.convertTime(Math.round(loadingTime), true))
                $('#pResponseTime').text(util.isEmpty(responseTime) ? '-' : util.convertTime(Math.round(responseTime), true))
            } else {
                $('#pLoadingTime').text('-')
                $('#pResponseTime').text('-')
            }

            const $deviceModel = $('#pDeviceModel')
            if (!deviceModel || !deviceId) {
                $deviceModel.text('-')
            } else {
                if (getDeviceModel(deviceModel) !== deviceModel) {
                    $deviceModel.text(deviceModel + ' / ' + getDeviceModel(deviceModel))
                } else {
                    $deviceModel.text(deviceModel)
                }
            }
            $deviceModel.val(util.isEmpty(deviceId) ? '-' : deviceId)
            util.comSensitivityFormat(comSensitivity)
            $('#pLocation').text(util.isEmpty(timezone) ? '-' : timezone)
            $('#pSimOperatorNm').text(util.isEmpty(simOperatorNm) ? '-' : util.simOperatorNmFormat(simOperatorNm))
            $('#pComType').text(util.isEmpty(comType) ? '-' : util.convertComType(comType))
            $('#pWebviewVer').text(util.isEmpty(webviewVer) ? '-' : webviewVer)
            $('#pAppBuildNum').text(util.isEmpty(appBuildNum) ? '-' : appBuildNum)
            $('#pBatteryUsage').attr('data-pct', util.isEmpty(batteryLvl) ? '0' : batteryLvl)
            $('#pMemUsage').text(util.isEmpty(memUsage) ? '-' : util.convertMem('kb', memUsage))
            $('#pCpuUsage').attr('data-pct', util.isEmpty(cpuUsage) ? '0' : cpuUsage)
            $('#pStorageUsage').text(util.isEmpty(storageUsage) ? '-' : util.convertMem('mb', storageTotal) + ' (' + util.percent(storageUsage, storageTotal) + '%' + ')')

            if (util.isEmpty(ip)) {
                $('#networkIp').text('Network')
            } else {
                $('#networkIp').html('Network'
                    + '<span class="text_ip_color">&nbsp;(' + ip + ')</span>')
            }

            // Se osType, osVer
            $('#pOsVerWrap .icon').removeClass('on')
            $('#pOsVerWrap .icon.ic_sm_' + osType.toLowerCase()).addClass('on')
            $('#pOsVer').text(osVer)
            $('#pAppVer').text(util.isEmpty(appVer) ? '-' : appVer)

            $('#pUserId').text(util.isEmpty(userId) ? '-' : userId)

            const $logTypeNm = $('#pPageType')
            const $iconLogType = $('.icon_log_type')
            let pageType

            if (logType) {
                let logTypeNm

                if ($iconLogType.hasClass('native')) {
                    $iconLogType.removeClass('native')
                } else if ($iconLogType.hasClass('webview')) {
                    $iconLogType.removeClass('webview')
                }

                const pageType = util.logTypeToPageType(logType)
                $iconLogType.addClass(pageType[0])
                logTypeNm = pageType[1]
                $logTypeNm.text(logTypeNm)
            } else {
                pageType = 'Web View'
                $iconLogType.addClass('webview')
                $logTypeNm.text(pageType)
            }

            const $reqUrl = $('#pReqUrl')
            if (pageUrl) {
                const pageNm = getPageList(v.packageNm, v.serverType, pageUrl)
                if (reqUrl) {
                    $reqUrl.val(pageNm ? pageNm + ' : [' + reqUrl + ']' : reqUrl)
                } else {
                    $reqUrl.val(pageNm)
                }
            } else if (reqUrl) {
                $reqUrl.val('[' + reqUrl + ']')
            } else {
                $reqUrl.val('-')
            }

            new LogDetail({
                id: 'logDetail',
                logType,
                osType,
                content: resMsg ? resMsg : contents
            })
            util.setTablePct(util.convertMem('mb', storageUsage))
        } catch (e) {
            console.log(e)
        }
    }

    setAvgData(data) {
        try {
            const $pLoadingTimeAvg = $('#pLoadingTimeAvg')
            const $pResponseTimeAvg = $('#pResponseTimeAvg')

            const {loadingTime, responseTime} = data

            if (loadingTime) {
                $pLoadingTimeAvg.text(util.convertTime(Math.round(loadingTime), true))
            }

            if (responseTime) {
                $pResponseTimeAvg.text(util.convertTime(Math.round(responseTime), true))
            }

            if (!loadingTime) {
                $pLoadingTimeAvg.text('-')
            }

            if (!responseTime) {
                $pResponseTimeAvg.text('-')
            }

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

    rowFormatter(row) {
        const {logType} = row.getData()
        if (!logType) {
            return
        }

        // 로그타입에 맞는 아이콘을 리턴받아서 각 셀에 넣어줌
        const icon = util.convertByLogType(logType)

        $(row.getCells()[3].getElement()).prepend($("<span>").addClass("bp").addClass(icon[0]))
        $(row.getCells()[4].getElement()).prepend($("<span>").addClass(icon[1]))
    }

    setNodata() {
        const popup = '#' + this.id + '__popup'
        const textClass = popup + ' .txt'
        $(textClass).text('-')
    }

    // 팝업 열기 함수
    async openPopup() {
        const {id} = this
        $('.dimmed').show()

        const $target = $('#' + id + '__popup')
        $target.show()

        await util.sleep(100)

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
}