/*
    종합 분석 > Logmeter > 팝업
    종합 분석 > Device Distribution > 팝업
    종합 분석 > Crashes by version > 팝업
    종합 분석 > Page View > 팝업
    종합 분석 > Favorites > 팝업
 */
class MaxyPopupLogListByUser {
    constructor(options) {
        this.appendId = options.appendId
        this.type = options.logType
        this.title = options.title
        this.id = options.id
        this.deviceModel = options.deviceModel
        this.reqUrl = options.reqUrl
        this.selectedRow = null
        this.popupType = options.popupType
        this.osType = options.osType
        this.appVer = options.appVer
        this.searchFromDt = options.searchFromDt
        this.searchToDt = options.searchToDt
        this.logDetailData = null // #디버깅 가이드

        if (!this.appendId || !this.type || !this.title || !this.id) {
            console.log('check parameter', this)

            return false
        }

        this.init().then(() => {
            this.addEventListener()
            this.openPopup()
        })
    }

    addEventListener() {
        const v = this
        const {id} = v

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

        // 종합분석: Favorites, Page View 팝업
        if (id === 'favorite' || id === 'pageView') {
            // Alias 버튼 show, Page Alias 버튼 클릭시
            $('.btn_alias').show()

            // 변경 전 alias
            const oldAlias = getPageList(sessionStorage.getItem('packageNm'), sessionStorage.getItem('serverType'), v.reqUrl)

            $('#' + id + '__popup .btn_alias').on('click', function () {
                alias.show({
                    reqUrl: String(v.reqUrl),
                    cb: function (){
                        v.cbAliasUpdate(v, oldAlias)
                    }
                })
            })
        }

        // Crash팝업인지 확인하고 디버깅가이드 버튼 추가 #디버깅 가이드
        if (v.type.toUpperCase() === 'CRASH') {
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

    cbAliasUpdate(v, oldAlias) {
        const newAlias = getPageList(sessionStorage.getItem('packageNm'), sessionStorage.getItem('serverType'), v.reqUrl)

        $('#' + v.id + 'fmtTitle').text(newAlias)

        if (DB0100.v.pageview) {
            const chart = DB0100.v.pageview.chart
            const series = chart.series[0].data.filter(s => s.reqUrl === v.reqUrl)

            // 찾은 데이터 포인트가 있으면 업데이트
            if(series.length > 0){
                series.forEach(s => {
                    // 데이터 포인트 업데이트
                    s.update({
                        name: newAlias,  // 새 별칭으로 이름 업데이트
                    })
                })

                // 차트 리드로우 (선택적)
                chart.redraw()
            }
        }

        if (DB0100.v.favorites) {
            const target = DB0100.v.favorites
            const chart = target['$target']
            chart.each(function () {
                // 각 .page_header_title 요소를 개별적으로 순회
                $(this).find('.page_header_title').each(function(idx, element) {
                    const $title = $(this)
                    if ($title.text().trim() === oldAlias) {
                        $title.text(newAlias)
                    }

                    // 툴팁 재생성
                    if (element._tippy) {
                        // 기존 인스턴스 제거
                        element._tippy.destroy();
                        element._tippy = null; // 명시적으로 null 할당
                    }

                    const tooltipContent = $(this).text();

                    // 새로운 tippy 인스턴스 생성
                    tippy(element, {
                        content: tooltipContent,
                        placement: 'bottom',
                        allowHTML: true,
                        arrow: false,
                        theme: 'maxy-tooltip',
                    });
                })
            })
        }
    }

    // 사용자 분석 화면 진입
    getUserFlow() {
        const packageNm = $('#packageNm').val()
        const serverType = $('#packageNm option:checked').data('server-type')
        const deviceId = this.tmpDeviceId
        const logTm = this.tmpLogTm
        const params = {
            deviceId,
            packageNm,
            serverType,
            logTm
        }

        sessionStorage.setItem('ua0400Params', JSON.stringify(params))
        // 사용자 행동분석 버튼을 눌러 사용자 분석 화면으로 이동할 떄는 새창으로 열도록 변경
        const targetUrl = '/ua/0000/goMenuUserAnalysisView.maxy'
        window.open(targetUrl, '_blank')
    }

    async init() {
        const {appendId, title, id, popupType, reqUrl} = this
        const source = await fetch(
            '/components/cmm/popup-log-list-by-user.html')
            .then(response => response.text())

        const template = Handlebars.compile(source)

        const $target = $('#' + appendId)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + appendId
        }
        $target.empty()

        let fmtTitle

        if (title === 'Error') {
            fmtTitle = trl('common.text.errorList')
        } else if (title === 'Crash') {
            fmtTitle = trl('common.text.crashList')
        } else {
            const packageNm = sessionStorage.getItem('packageNm')
            const serverType = sessionStorage.getItem('serverType')
            fmtTitle = getPageList(packageNm, serverType, reqUrl)
        }

        $target.append(template({fmtTitle, id, popupType}))
        const tableId = '#' + id + '__logList'

        const placeholder = trl('common.msg.noData')
        this.table = new Tabulator(tableId, {
            layout: 'fitDataFill',
            placeholder: placeholder,
            rowFormatter: this.rowFormatter.bind(this),
            columns: [],
        });

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

            // 상세 데이터 가져오기
            this.getLogDetail(e, row)
        })

        // 디버깅 가이드 인스턴스 #디버깅 가이드
        this.debugGuide = new MaxyDebugGuide({
            id: id + '__debugGuide',
        })

        // 소스맵 가이드 인스턴스
        this.logDetailSlide = new MaxyLogDetailSlide({
            id: id + '__logDetailSlide',
        })

        updateContent()
    }

    getLogList() {
        const {
            id,
            type,
            deviceModel,
            osType,
            appVer,
            searchFromDt,
            searchToDt,
            reqUrl
        } = this

        const param = {
            packageNm: $('#packageNm').val(),
            serverType: $('#packageNm option:checked').data('server-type'),
            osType: osType ? osType : $('#osType').val(),
            appVer: appVer ? appVer : $('#appVer').val()
        }

        param.from = searchFromDt
        param.to = searchToDt
        param.requestType = type.toUpperCase()

        if (deviceModel) {
            param.deviceModel = deviceModel
        }
        if (reqUrl) {
            param.reqUrl = reqUrl
        }

        ajaxCall('/db/0100/getCommonLogList.maxy', param, {disableDimmed: true}).then(data => {
            this.addLogList(data)
        }).catch(error => {
            console.log(error)
        })
    }

    addLogList(data) {
        const {id} = this

        const $logDetail = $('#logDetail')
        try {
            const logList = data.logList
            const length = logList.length

            this.drawTable()

            if (!logList || logList.length === 0) {
                $logDetail.addClass('no_data')
                this.setNoData()
                this.table.setData([])
                $('#' + id + '__popup' + ' #count').text('(0)')
                return
            }
            this.table.setData(logList)
            // 첫 행 강제 클릭되게
            $('#' + id + '__popup' + ' .tabulator-table > div:eq(0)').trigger('click')
            $('#' + id + '__popup' + ' #count').text('(' + util.comma(length) + (length >= 500 ? '+' : '') + ')')
        } catch (e) {
            console.log(e)

            $logDetail.addClass('no_data')
            this.setNoData()
            this.table.setData([])
        }
    }

    // error list 인지 crash list인지에 따라 column이 달라짐
    drawTable() {
        const v = this
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

        if (this.type.toLowerCase() === 'error') {
            const errorLogListColumns = [
                {
                    title: columnNames.time,
                    field: "logTm",
                    hozAlign: "left",
                    width: "15%",
                    formatter: util.timestampToDateTimeMs
                },
                {
                    title: columnNames.deviceId,
                    field: "deviceId",
                    hozAlign: "left",
                    width: "21%",
                    tooltip: true
                },
                {
                    title: columnNames.userId,
                    field: "userId",
                    hozAlign: "left",
                    width: "10%",
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
                    width: "13%",
                    formatter: function (cell) {
                        return getLogTypeDetail(cell.getValue())
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
                    title: columnNames.appver,
                    field: "appVer",
                    width: "10%"
                },
                {
                    title: 'Category',
                    field: "logType",
                    width: "10%",
                    formatter: function (cell) {
                        return '<span class="category active">' + util.logTypeToCategory(cell.getValue()) + '</span>'
                    }
                },
            ]
            this.table.setColumns(errorLogListColumns)
        } else if (this.type.toLowerCase() === 'crash') {
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
                    width: "17%",
                    tooltip: true
                },
                {
                    title: columnNames.userId,
                    field: "userId",
                    hozAlign: "left",
                    width: "9%",
                    formatter: idDisplay.getId,
                    tooltip: util.tooltipFormatter
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
                    width: "10%"
                },
                {
                    title: columnNames.crashName,
                    field: "logName",
                    hozAlign: "left",
                    headerSort: false,
                    width: "21%",
                    formatter: function (cell) {
                        const logNameData = this.setLogName(cell);
                        return logNameData ? logNameData.crashName : '-';
                    }.bind(this)
                },
                {
                    title: columnNames.causedBy,
                    field: "logName",
                    hozAlign: "left",
                    width: "22%",
                    headerSort: false,
                    formatter: function (cell) {
                        const logNameData = this.setLogName(cell);
                        return logNameData ? logNameData.caused : '-';
                    }.bind(this)
                },
                {
                    field: "deviceModel",
                    visible: false
                }
            ]
            this.table.setColumns(crashListColumns)
        }
    }

    // 테이블 하단에 상세 데이터 가져오기
    getLogDetail(e, cell) {
        const v = this
        try {
            const deviceId = cell.getData().deviceId
            const logTm = cell.getData().logTm
            const docId = cell.getData()._id
            this.tmpDeviceId = deviceId
            this.tmpLogTm = logTm
            const packageNm = $('#packageNm').val()
            const param = {
                packageNm: packageNm,
                serverType: $('#packageNm option:checked').data('server-type'),
                osType: $('#osType').val(),
                appVer: $('#appVer').val(),
                deviceId: deviceId,
                deviceModel: cell.getData().deviceModel,
                from: logTm,
                requestType: this.type.toUpperCase(),
                docId
            }

            ajaxCall('/db/0100/getLogDetail.maxy', param, {disableDimmed: true}).then(async data => {
                if (Object.keys(data).length === 0) {
                    const $logDetail = $('#logDetail')
                    if (!$logDetail.hasClass('no_data')) {
                        $logDetail.addClass('no_data')
                    }
                    return
                }

                if (v.type.toUpperCase() === 'CRASH') {
                    // #디버깅 가이드
                    this.logDetailData = data
                    await v.debugGuide.setData(v.logDetailData)
                }

                this.setDetailData(data)
            })

            ajaxCall('db/0100/getMedFromLoadingOrResponse.maxy', param, {disableCursor: true}).then(data => {
                this.setAvgData(data.result)
            })
        } catch (e) {
            console.log(e)
            const $logDetail = $('#logDetail')
            if (!$logDetail.hasClass('no_data')) {
                $logDetail.addClass('no_data')
            }
        }
    }

    // 리스트 행 클릭 시 나오는 상세 데이터 넣기
    setDetailData(data) {

        const {pageInfo, hasPageLog, logDetail} = data

        const {
            logTm,
            deviceModel,
            deviceId,
            userId,
            osType,
            osVer,
            memUsage,
            cpuUsage,
            reqUrl,
            pageUrl,
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
            simOperatorNm,
            ip,
            clientNo,
            mappedErrorStack
        } = logDetail

        const {v} = DB0100

        const $deviceModel = $('#pDeviceModel')
        $('#logTm').text(util.isEmpty(logTm) ? '-' : util.timestampToDateTimeMs(logTm))
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

        // userId가 비어있지 않고 '-'가 아니면 userId 사용
        // 그렇지 않으면 clientNo 확인 후 사용, clientNo도 없으면 '-' 사용
        idDisplay.apply(userId, clientNo)

        // Se osType, osVer
        $('#pOsVerWrap .icon').removeClass('on')
        $('#pOsVerWrap .icon.ic_sm_' + osType.toLowerCase()).addClass('on')
        $('#pOsVer').text(osVer)

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

            pageType = util.logTypeToPageType(logType)
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

        const $btnPageFlow = $('#btnPageFlow')
        if (!pageInfo) {
            $('#pLoadingTime').text('-')
            $('#pResponseTime').text('-')

            $btnPageFlow.hide()
        } else {
            $('#pLoadingTime').text(util.convertTime(Math.round(pageInfo.loadingTime), true))
            $('#pResponseTime').text(util.convertTime(Math.round(pageInfo.responseTime), true))

            if (hasPageLog) {
                $btnPageFlow.show()
            } else {
                $btnPageFlow.hide()
            }
        }

        $('#pAppVer').text(util.isEmpty(appVer) ? '-' : appVer)

        new LogDetail({
            id: 'logDetail',
            logType,
            osType,
            content: resMsg ? resMsg : contents,
            mappedErrorStack: mappedErrorStack || ''
        })
        util.setTablePct(util.convertMem('mb', storageUsage))

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

    rowFormatter(row) {
        const {logType} = row.getData()
        if (!logType) {
            return
        }

        // 로그타입에 맞는 아이콘을 리턴받아서 각 셀에 넣어줌
        const icon = util.convertByLogType(logType)

        if (this.type.toLowerCase() !== 'crash') {
            $(row.getCells()[3].getElement()).prepend($("<span>").addClass("bp").addClass(icon[0]))
            $(row.getCells()[4].getElement()).prepend($("<span>").addClass(icon[1]))
        } else {
            $(row.getCells()[5].getElement()).prepend($("<span>").addClass(icon[1]))
        }
    }

    // crash list인 경우 logName의 ":" 을 기준으로 앞은 crash name, 뒤는 caused by에 세팅해준다
    setLogName(cell) {
        const {logName} = cell.getData()
        if (!logName) {
            return '-'
        }

        const parts = logName.split(":");

        return {
            "caused": parts[1],
            "crashName": parts[0]
        }
    }

    formatUserIdColumn(cell) {
        const data = cell.getData();
        if (data.userId && data.userId !== '-') {
            return data.userId
        } else if (data.clientNo && data.clientNo !== '-') {
            return data.clientNo
        } else {
            return '-'
        }
    }

    setNoData() {
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
}