/*
    종합 분석 > Area Distribution > 팝업
 */
class MaxyAreaDistributionList {
    constructor(options) {
        this.id = options.id
        this.appendId = options.appendId
        this.pageNm = options.pageNm
        this.reqUrl = options.title
        this.code = options.code
        this.selectedRow = null
        this.next = 0
        this.logType = options.logType
        this.logDetailData = null

        this.init().then(() => {
            this.addEventListener()
            this.openPopup()
        })
    }

    addEventListener() {
        const {id} = this
        const v = this
        $('.dimmed').on('click', () => {
            // 로그 크게보기 slide popup이 펼쳐져있으면 닫기
            if ($('.popup_right_side_wrap.log_detail_slide').hasClass('show')) {
                v.logDetailSlide.closeSlidePopup()
                return
            }
            // debugging guide nav bar가 펼쳐져있으면 #디버깅 가이드
            if ($('.popup_right_side_wrap.debug_guide_slide').hasClass('show')) {
                $('.maxy_popup_gray_bg_wrap.popup_right_side_wrap.debug_guide_slide').removeClass('show').addClass('hidden')
                return
            }
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

        const $btnLoadPrevData = $('#btnLoadPrevData')
        const $btnLoadNextData = $('#btnLoadNextData')
        $btnLoadPrevData.attr('disabled', true)

        $btnLoadNextData.on('click', function () {
            v.selectedRow = null
            // 현재 next 값
            v.previousNext = v.next

            if ($btnLoadNextData.data('last-page') < v.next) {
                v.next = $btnLoadNextData.data('last-page')
            } else {
                v.next += 50
            }

            v.getMapDetailList()

            if (v.next >= 0) {
                $btnLoadPrevData.attr('disabled', false)
            }
        })

        $btnLoadPrevData.on('click', function () {
            v.selectedRow = null
            v.next -= 50
            v.getMapDetailList()
        })

        // All, Error, Crash 토글 이벤트
        $('#' + id + '__popup' + ' .maxy_component_btn').on('click', function () {
            const dateType = $(this).data('type')

            toggle(this)

            // 페이징값 초기화
            v.selectedRow = null
            v.previousNext = ''
            v.next = 0
            v.logType = dateType

            v.getMapDetailList()
        })

        if (v.logType.toUpperCase() === 'CRASH') {
            const $imgDebugOff = $('.img_debug_off')
            $imgDebugOff.show()

            tippy('.img_debug_off', {
                content: trl('common.text.debugGuide'),
                arrow: false,
                placement: 'bottom',
                allowHTML: true,
                theme: 'maxy-tooltip'
            })

            // 디버깅가이드 버튼
            $imgDebugOff.on('click', async function () {
                if ($(this).prop('disabled') !== true) {
                    $('.maxy_popup_gray_bg_wrap.popup_right_side_wrap.debug_guide_slide').removeClass('hidden').addClass('show')
                } else {
                    toast(trl('common.msg.noDebugDataContent'))
                }
            })
        }

        // Source Map 버튼 툴팁
        tippy('#btnSourceMap', {
            content: i18next.tns('common.btn.bigView'),
            arrow: false,
            placement: 'bottom',
            allowHTML: true,
            theme: 'maxy-tooltip'
        })

        $('#btnSourceMap').on('click', () => {
            // log_detail_contents_wrap의 내용을 가져와서 슬라이드 팝업에 표시
            const $logDetailContents = $('.log_detail_contents_wrap')
            if ($logDetailContents.length > 0) {
                v.logDetailSlide.setData($logDetailContents)
            }
        })
    }

    async init() {
        const v = this
        const {id, appendId, title, pageNm, reqUrl, logType} = v

        const source = await fetch(
            '/components/cmm/popup-log-list-by-page.html')
            .then(response => response.text())
        const template = Handlebars.compile(source)
        const $target = $('#' + appendId)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + appendId
        }

        const popupTitle = pageNm + '/ '
        $target.empty()
        $target.append(template({id, appendId, title, reqUrl}))
        $('#pageNm').text(popupTitle)

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
        v.table = new Tabulator(tableTarget, {
            layout: 'fitDataFill',
            placeholder: trl('common.msg.noData'),
            rowFormatter: this.rowFormatter,
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
                    width: "25%"
                },
                {
                    title: columnNames.userId,
                    field: "userId",
                    hozAlign: "left",
                    width: "14%",
                    formatter: idDisplay.getId,
                    tooltip: util.tooltipFormatter
                },
                {
                    title: columnNames.logClass,
                    field: "logType",
                    hozAlign: "left",
                    width: "14%",
                    formatter: function (cell) {
                        return getLogTypeGroup(cell.getValue())
                    }
                },
                {
                    title: columnNames.logType,
                    field: "logType",
                    hozAlign: "left",
                    width: "14%",
                    formatter: function (cell) {
                        return getLogTypeDetail(cell.getValue())
                    }
                },
                {
                    title: columnNames.appver,
                    field: "appVer",
                    width: "12%"
                },
                {
                    field: "pageUrl",
                    visible: false
                }
            ],
        })

        v.table.on('rowClick', (e, row) => {
            $('#' + id + '__popup' + ' .tabulator-table > div:eq(0)').off('click')

            if (v.selectedRow) {
                v.selectedRow.getElement().classList.remove('selected_row')
            }

            row.getElement().classList.add('selected_row')
            v.selectedRow = row

            const rowData = row.getData()
            v.getLogDetail(rowData)
        })

        v.table.on('tableBuilt', function () {
            v.getMapDetailList()
        })

        // 디버깅 가이드 인스턴스
        this.debugGuide = new MaxyDebugGuide({
            id: id + '__debugGuide',
        })

        // 소스맵 가이드 인스턴스
        this.logDetailSlide = new MaxyLogDetailSlide({
            id: id + '__logDetailSlide',
        })
    }

    getMapDetailList() {
        let {id, table, code, next, previousNext, logType} = this

        try {
            const params = {
                packageNm: $('#packageNm').val(),
                serverType: $('#packageNm option:checked').data('server-type'),
                osType: $('#osType').val(),
                locationCode: code,
                next: next,
                requestType: logType.toUpperCase()
            }

            ajaxCall('/db/0100/getAreaDetailList.maxy', params, {disableDimmed: true})
                .then(response => {
                    const $btnLoadNextData = $('#btnLoadNextData')
                    if (response.length === 0) {
                        this.next = previousNext

                        if (this.next === 0) {
                            $('#btnLoadPrevData').attr('disabled', true)
                        }

                        $btnLoadNextData.attr('disabled', true)
                        $btnLoadNextData.attr('data-last-page', this.next)
                        return
                    } else if (response.length < 50) {
                        $btnLoadNextData.attr('disabled', true)
                        $btnLoadNextData.attr('data-last-page', this.next)
                    } else {
                        $btnLoadNextData.attr('disabled', false)
                    }
                    table.setData(response)

                    // 첫 행 강제 클릭되게
                    $('#' + id + '__popup' + ' .tabulator-table > div:eq(0)').trigger('click')
                })

        } catch (e) {
            console.log(e)
        }
    }

    getLogDetail(data) {
        const v = this
        const $btnPageFlow = $('#btnPageFlow')
        const {
            packageNm,
            serverType,
            osType,
            deviceId,
            logTm,
            logType,
            deviceModel,
            _id
        } = data

        const detailParam = {
            requestType: logType === 2097152 ? 'CRASH' : 'ERROR',
            docId: _id
        }

        const avgParam = {
            ...detailParam,
            packageNm,
            serverType,
            osType,
            deviceId,
            from: logTm,
            deviceModel,
        }


        ajaxCall('/db/0100/getLogDetail.maxy', detailParam, {disableCursor: true, disableDimmed: true})
            .then(async response => {
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
                    this.setNodata()
                    return
                }

                if (v.logType.toUpperCase() === 'CRASH') {
                    // #디버깅 가이드
                    this.logDetailData = response
                    await v.debugGuide.setData(v.logDetailData)
                }

                this.setDetailData(logDetail, pageInfo)

                ajaxCall('/db/0100/getMedFromLoadingOrResponse.maxy', avgParam, {
                    disableCursor: true,
                    disableDimmed: true
                })
                    .then(response => {
                        this.setAvgData(response.result)
                    }).catch(error => {
                    console.log(error)
                })

            }).catch(e => {
            console.log(e)
            const $logDetail = $('#logDetail')
            if (!$logDetail.hasClass('no_data')) {
                $logDetail.addClass('no_data')
            }
            this.setNodata()
        })
    }

    // 리스트 행 클릭 시 나오는 상세 데이터 넣기
    async setDetailData(logDetail, pageInfo) {
        try {
            const {next} = this
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
                comSensitivity,
                batteryLvl,
                storageTotal,
                storageUsage,
                appBuildNum,
                webviewVer,
                logType,
                timezone,
                comType,
                contents,
                userId,
                simOperatorNm,
                clientNo,
                mappedErrorStack
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
            $('#pReqUrl').text(reqUrl)

            // Se osType, osVer
            $('#pOsVerWrap .icon').removeClass('on')
            $('#pOsVerWrap .icon.ic_sm_' + osType.toLowerCase()).addClass('on')
            $('#pOsVer').text(osVer)
            $('#pAppVer').text(util.isEmpty(appVer) ? '-' : appVer)

            // userId가 비어있지 않고 '-'가 아니면 userId 사용
            // 그렇지 않으면 clientNo 확인 후 사용, clientNo도 없으면 '-' 사용
            idDisplay.apply(userId, clientNo)

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
            await new LogDetail({
                id: 'logDetail',
                logType,
                osType,
                content: resMsg ? resMsg : contents,
                mappedErrorStack: mappedErrorStack || ''
            })
            util.setTablePct(util.convertMem('mb', storageUsage))

            if (next === 0) {
                $('#btnLoadPrevData').attr('disabled', true)
            }

            // Source Map Guide 슬라이드 팝업이 열려있다면 내용 업데이트
            if (this.logDetailSlide && this.logDetailSlide.isSlidePopupOpen()) {
                // DOM이 업데이트된 후 실행하기 위해 setTimeout 사용
                setTimeout(() => {
                    const $logDetailContents = $('.log_detail_contents_wrap')
                    if ($logDetailContents.length > 0) {
                        this.logDetailSlide.updateContentIfOpen($logDetailContents)
                    }
                }, 100)
            }
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

    setNodata() {
        const popup = '#' + this.id + '__popup'
        const txt = popup + ' .txt'
        const bar = popup + ' .pct_txt'
        const textarea = popup + ' textarea'

        $(textarea).val('')
        $(txt).text('-')
        $(bar).text('-')
        $('#pBatteryUsage').data('pct', 0)
        $('.mini_progress_wrap .bar').width('0')
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

    getUserFlow() {
        const v = this
        const {selectedRow} = v

        const rowData = selectedRow.getData()
        const deviceId = rowData.deviceId
        const logTm = rowData.logTm
        const packageNm = $('#packageNm').val()
        const serverType = $('#packageNm option:checked').data('server-type')

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

    async openPopup() {
        const {id} = this
        $('.dimmed').show()

        const $target = $('#' + id + '__popup')
        $target.show()

        await util.sleep(200)
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