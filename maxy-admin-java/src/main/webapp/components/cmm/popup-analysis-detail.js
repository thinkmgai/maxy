/*
    실시간 로그 조회 > 상세 팝업
 */

class MaxyPopupAnalysisDetail {
    constructor(options) {
        this.appendId = options.appendId
        this.id = options.id
        this.param = options.param
        this.title = options.title
        this.avg = options.avg
        this.deviceId = options.deviceId
        this.logDetailData = null

        if (!this.id || !this.appendId || !this.param) {
            console.log('check parameter')
            return false
        }

        this.init().then(() => {
            this.addEventListener()
            this.openPopup()
        })
    }

    addEventListener() {
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

        if (util.isCrash(v.param.logType)) {
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
        const {id, appendId, title} = this

        const source = await fetch(
            '/components/cmm/popup-log-list-for-realtime.html')
            .then(response => response.text())

        const template = Handlebars.compile(source)

        const $target = $('#' + appendId)

        const fmtTitle = title

        if (!($target.length > 0)) {
            throw 'can\'t find #' + appendId
        }
        $target.empty()

        $target.append(template({id, fmtTitle}))

        updateContent()
        const tableTarget = '#' + id + '__logList'

        const columnNames = {
            "time": trl('common.tableColumn.time'),
            "deviceId": trl('common.tableColumn.deviceId'),
            "userId": trl('common.text.userId'),
            "logClass": trl('common.tableColumn.logClass'),
            "logType": trl('common.tableColumn.logType'),
            "appver": trl('common.tableColumn.appVer')
        }

        this.table = new Tabulator(tableTarget, {
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
                    width: "12%",
                    formatter: cell => {
                        return util.ellipsis(cell.getValue(), 18)
                    }
                },
                {
                    title: columnNames.userId,
                    field: "userId",
                    width: "14%",
                    tooltip: util.tooltipFormatter,
                    formatter: idDisplay.getId
                },
                {
                    title: columnNames.logClass,
                    field: "logType",
                    hozAlign: "left",
                    width: "14%",
                    formatter: cell => {
                        return getLogTypeGroup(cell.getValue())
                    }
                },
                {
                    title: columnNames.logType,
                    field: "logType",
                    hozAlign: "left",
                    width: "15%",
                    formatter: cell => {
                        return getLogTypeDetail(cell.getValue())
                    }
                },
                {
                    title: columnNames.appver,
                    field: "appVer",
                    width: "12%"
                },
                {
                    title: 'Run Time',
                    field: "intervaltime",
                    hozAlign: "left",
                    width: "13%",
                    formatter: cell => {
                        return util.convertTime(cell.getValue())
                    },
                },
            ],
        });

        this.table.on('rowClick', (e, row) => {
            if (this.selectedRow) {
                this.selectedRow.getElement().classList.remove('selected_row')
            }
            row.getElement().classList.add('selected_row')
            this.selectedRow = row
            this.rowData = row.getData()

            this.setDetailData(this.rowData, v)
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

    rowFormatter(row) {
        if (!row.getData().logType) {
            return
        }

        const logType = row.getData().logType;
        const convertedLogType = util.convertByLogType(logType);

        $(row.getCells()[3].getElement()).prepend($("<span>").addClass("bp").addClass(convertedLogType[0]));
        $(row.getCells()[4].getElement()).prepend($("<span>").addClass(convertedLogType[1]));
    }

    getLogDetail() {
        try {
            const v = this
            const param = {
                docId: this.param._id,
                packageNm: this.param.packageNm,
                serverType: this.param.serverType,
                logTm: this.param.logTm,
                deviceId: this.param.deviceId,
                osType: this.param.osType,
                reqUrl: this.param.reqUrl
            }

            ajaxCall('/db/0100/getLogDetail.maxy', param)
                .then(async response => {
                    const $btnPageFlow = $('#btnPageFlow')
                    const {logDetail, pageInfo, hasPageLog} = response

                    if (hasPageLog !== false) {
                        $btnPageFlow.show()
                    } else {
                        $btnPageFlow.hide()
                    }

                    const logList = []
                    logList.push(logDetail)
                    this.table.setData(logList)

                    this.logDetail = logDetail
                    this.pageInfo = pageInfo
                    this.logDetailData = response

                    // 첫 행 강제 클릭되게
                    $("#" + this.id + "__popup" + " .tabulator-table > div:eq(0)").trigger('click')

                    // 위에서 첫 행 강제 클릭이 됐기 때문에 주석처리 함.
                    // this.setDetailData(logDetail, pageInfo)
                })

            // ajaxCall('/db/0100/getMedFromLoadingOrResponse.maxy', param, {disableCursor: true})
            //     .then(response => {
            //         const {result} = response
            //         this.setAvgData(result)
            //     })
        } catch (e) {
            console.log(e)
        }

    }

    async setDetailData(logDetail, v) {
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
                comSensitivity,
                batteryLvl,
                storageTotal,
                storageUsage,
                appBuildNum,
                webviewVer,
                logType,
                timezone,
                comType,
                simOperatorNm,
                contents,
                jtxid,
                ip,
                userId,
                clientNo,
                mappedErrorStack
            } = logDetail

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
            $('#pAppVer').text(util.isEmpty(appVer) ? '-' : appVer)
            // Se osType, osVer
            $('#pOsVerWrap .icon').removeClass('on')
            $('#pOsVerWrap .icon.ic_sm_' + osType.toLowerCase()).addClass('on')
            $('#pOsVer').text(osVer)
            $('#pReqUrl').text(reqUrl)

            idDisplay.apply(userId, clientNo)

            if (util.isEmpty(ip)) {
                $('#networkIp').text('Network')
            } else {
                $('#networkIp').html('Network' + '<span class="text_ip_color">&nbsp;(' + ip + ')</span>')
            }

            const $logTypeNm = $('#pPageType')
            if (logType) {
                const $iconLogType = $('.icon_log_type')

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
                $logTypeNm.text('-')
            }

            await new LogDetail({
                id: 'logDetail',
                logType,
                osType,
                content: resMsg ? resMsg : contents,
                mappedErrorStack: mappedErrorStack || ''
            })

            // const $logDetail = $('#logDetail')
            // const $pLogDetail = $('#pLogDetail')
            //
            // if (resMsg) {
            //     $logDetail.removeClass('no_data')
            //     const isJSONString = util.isJSONString(resMsg)
            //     if (isJSONString) {
            //         $pLogDetail.text(util.beautifyJson(resMsg))
            //         // 아니면 개행만 해줌
            //     } else {
            //         $pLogDetail.text(util.convertToNewlines(resMsg))
            //     }
            // } else {
            //     $logDetail.addClass('no_data')
            // }
            util.setTablePct(util.convertMem('mb', storageUsage))
            this.comSensitivityFormat(comSensitivity)

            // Jennifer TXID가 있으면 resMsg 영역 하단에 TXID 를 추가
            if (jtxid) {
                $('#txidWrap').show()
                $('#txidWrap #ptxid').text('TXID: ' + jtxid)
            } else {
                $('#txidWrap').hide()
            }

            if (util.isCrash(logType)) {
                if (osType === 'iOS') {
                    v.logDetailData.logDetail.resMsg = $('#pMessages').val()
                }
                await v.debugGuide.setData(v.logDetailData)
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

    comSensitivityFormat(val) {
        const comSensitivityFormatArr = util.convertComSensitivity(val)
        const $networkStatus = $('.network_status')

        $networkStatus.removeClass().addClass('network_status')
        $networkStatus.addClass(comSensitivityFormatArr[1])

        $('#pSensitivity').text(comSensitivityFormatArr[0])
    }

    // 팝업 열기 함수
    async openPopup() {
        const {id} = this
        $('.dimmed').show()
        $('#realTimepopupType').hide()

        const $target = $('#' + id + '__popup')
        $target.show()

        await util.sleep(200)

        this.getLogDetail()
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
        const deviceId = this.param.deviceId
        const logTm = this.param.logTm

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
