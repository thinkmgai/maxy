/*
    사용자 분석 > 팝업
 */
class MaxyPopupUserAnalysisWithList {
    constructor(options) {
        this.appendId = options.appendId
        this.id = options.id
        this.param = options.param
        this.title = options.title
        this.selectedRow = null
        this.currentOpened = null
        this.timeout = null
        this.reqUrl = options.reqUrl
        this.waterfallInstance = null
        this.uuidList = []
        this.maxySessionId = null
        this.logTm = null

        if (!this.id || !this.appendId || !this.param) {
            console.log('check parameter')
            return false
        }

        this.expand = {
            waterfall: () => this.waterfall(),
            event: () => this.event()
        }

        this.init().then(() => {
            this.addEventListener()

            popup.open(this.id).then(() => {
                // 인스턴스를 생성하고 초기화 및 이벤트 리스너 설정이 완료될 때까지 기다림
                const webVitalPromise = new Promise(resolve => {
                    this.webVitalInstance = new MaxyWebVital({
                        opts: [{
                            id: this.id + '__webVitalFull',
                            rangeSelectedCallback: (e) => {
                                const {min, max} = e.detail

                                // min, max 값을 waterfallInstance에 저장
                                this.waterfallInstance.selectedMin = min
                                this.waterfallInstance.selectedMax = max

                                // 현재 탭에 맞는 필터링된 데이터
                                const selectedData = this.waterfallInstance.filterDataByType(min, max)

                                // 필터링 된 데이터 차트 영역에 세팅
                                this.waterfallInstance.setChartData(selectedData, true)
                            }
                        }]
                    })

                    // init()과 addEventListener()가 모두 완료될 때까지 기다림
                    this.webVitalInstance.init().then(() => {
                        // addEventListener가 완료된 후 resolve
                        setTimeout(resolve, 100) // 이벤트 리스너가 등록될 시간을 확보
                    })
                })

                const waterfallPromise = new Promise(resolve => {
                    this.waterfallInstance = new newWaterfall({id: this.id + '__waterfall'});
                    this.waterfallInstance.init().then(() => {
                        // addEventListener가 완료된 후 resolve
                        setTimeout(resolve, 100) // 이벤트 리스너가 등록될 시간을 확보
                    })
                })

                const eventTimeLinePromise = new Promise(resolve => {
                    this.eventTimeLineInstance = new MaxyEventTimeLine({id: this.id + '__eventTimeLine'})
                    this.eventTimeLineInstance.init().then(resolve) // 이 인스턴스는 크로스헤어 동기화와 관련이 없음
                })

                // 모든 인스턴스가 초기화 및 이벤트 리스너 설정을 완료한 후에 getEndLogList() 호출
                Promise.all([webVitalPromise, waterfallPromise, eventTimeLinePromise])
                    .then(() => {
                        // 추가적인 안전장치: 전역 변수가 설정되었는지 확인
                        if (window.webVitalInstance && window.waterfallInstance) {
                            // 크로스헤어 동기화를 다시 설정
                            ChartSyncUtils.setupCrosshairSync(
                                Object.values(window.webVitalInstance.charts),
                                () => {
                                    const waterfallChart = window.waterfallInstance ? [window.waterfallInstance.waterfallChart] : []
                                    return [...waterfallChart, ...Object.values(window.webVitalInstance.charts)]
                                }
                            )

                            ChartSyncUtils.setupCrosshairSync(
                                window.waterfallInstance.waterfallChart,
                                () => {
                                    const webVitalCharts = window.webVitalInstance ? Object.values(window.webVitalInstance.charts) : []
                                    return [...webVitalCharts, window.waterfallInstance.waterfallChart]
                                }
                            )
                        }

                        this.getEndLogList()

                        // eventTimeLine 부터 보여주기
                        this.currentOpened = 'event'
                        this.expand.event()
                    });
            })
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

            popup.close(v)
        })

        tippy('#pDeviceModel', {
            content: i18next.tns('common.msg.deviceIdCopy'),
            arrow: false,
            placement: 'bottom',
            allowHTML: true,
            theme: 'maxy-tooltip'
        })

        $('#pDeviceModel').on('click', function () {
            util.copy(this)
        })

        $('#btnGraphicOpen').on('click', function () {
            const $graphicWrap = $('.user_flow_graphic_wrap')

            // 펼치기: hidden을 제거하고 show 추가
            $graphicWrap.removeClass('hidden').addClass('show')
        });

        $('#btnGraphicClose').on('click', function () {
            const $graphicWrap = $('.user_flow_graphic_wrap')

            // 접기: show를 제거하고 hidden 추가
            $graphicWrap.removeClass('show').addClass('hidden')
        });

        const $btnExpand = $('.btn_expand')
        // 보기 버튼 클릭 시 현재 오픈된 타입 저장
        $btnExpand.on('click', function () {
            v.currentOpened = $(this).data('type')
        })

        // waterfall 보기 버튼
        $('#btnOpenWaterfall').on('click', v.expand.waterfall)
        // event 보기 버튼
        $('#btnOpenEvent').on('click', v.expand.event)

        // 마우스 오버 시 해당 타입 보기
        $btnExpand.on('mouseover', function () {
            // util.debounce(v.expand[$(this).data('type')], 500, v)()
            v.expand[$(this).data('type')]()
        })
        // 마우스 오버 해제 시 클릭된(기존) 항목 보기
        $btnExpand.on('mouseout', function () {
            if (v.currentOpened) {
                v.expand[v.currentOpened]()
            } else {
                console.log($(this).data('type') + ' current opened is ' + v.currentOpened)
            }
        })

        // Page Alias 버튼 클릭시
        $('#' + id + '__popup .btn_alias').on('click', function () {
            // 변경전 alias
            const oldAlias = getPageList(sessionStorage.getItem('packageNm'), sessionStorage.getItem('serverType'), v.reqUrl)

            alias.show({
                reqUrl: String(v.reqUrl),
                cb: function () {
                    const newAlias = getPageList(sessionStorage.getItem('packageNm'), sessionStorage.getItem('serverType'), v.reqUrl)
                    // 팝업 타이틀 변경
                    $('#' + id + 'title').text(newAlias)

                    // Flow 타이틀 변경
                    $("#appFlowChart .content_title").filter(function () {
                        return $(this).text().includes(oldAlias);
                    }).text(newAlias);

                    // Flow 내부 data속성 변경
                    $('#appFlowChart [data-alias-value="' + oldAlias + '"]').attr('data-alias-value', newAlias)
                }
            })
        })

        // Tabulator 검색창 엔터
        const $tableFilter = $('#' + id + '__tableFilter')
        $tableFilter.find('input').on('keydown', function (e) {
            if (e.key === 'Enter') {
                v.tableFilter()
            }
        })

        // Tabulator 검색 버튼 클릭
        $tableFilter.find('input').on('change', function () {
            v.tableFilter()
        })

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

    /**
     * waterfall / event expand 처리 함수
     * waterfall on
     */
    waterfall() {
        $('.btn_expand').removeClass('on')
        $('.btn_expand.icon_expand_bottom').addClass('on')
        $('.event_time_wrap').hide()
        $('.web_chart_wrap').show()
    }

    /**
     * waterfall / event expand 처리 함수
     * event on
     */
    event() {
        $('.btn_expand').removeClass('on')
        $('.btn_expand.icon_expand_top').addClass('on')
        $('.web_chart_wrap').hide()
        $('.event_time_wrap').show()
    }

    async init() {
        const v = this
        const {id, appendId} = v
        const source = await fetch(
            '/components/cmm/popup-user-analysis-with-list.html')
            .then(response => response.text())

        const template = Handlebars.compile(source)

        const $target = $('#' + appendId)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + appendId
        }
        $target.empty()

        const title = getPageList(sessionStorage.getItem('packageNm'), sessionStorage.getItem('serverType'), v.reqUrl)
        $target.append(template({id, title}))

        // 다국어 텍스트 적용
        updateContent()

        const tableTarget = '#' + id + '__logList'

        const columnNames = {
            "time": i18next.tns('common.tableColumn.time'),
            "reqUrl": i18next.tns('common.tableColumn.reqUrl'),
            "resMsg": i18next.tns('common.tableColumn.resMsg'),
            "logClass": i18next.tns('common.tableColumn.logClass'),
            "logType": i18next.tns('common.tableColumn.logType'),
            "runTime": i18next.tns('common.tableColumn.runTime')
        }

        this.table = new Tabulator(tableTarget, {
            layout: 'fitDataFill',
            placeholder: i18next.tns('common.msg.noData'),
            rowFormatter: this.rowFormatter,
            columns: [
                {
                    title: columnNames.time,
                    field: "logTm",
                    hozAlign: "left",
                    width: "15%",
                    formatter: util.timestampToDateTimeMs
                },
                {
                    title: columnNames.reqUrl,
                    field: "reqUrl",
                    hozAlign: "left",
                    width: "24%",
                    formatter: cell => {
                        return (util.isEmpty(cell.getValue()) ? "-" : cell.getValue())
                    }
                },
                {
                    title: columnNames.resMsg,
                    field: "resMsg",
                    width: "20%",
                    formatter: cell => {
                        const value = cell.getValue();
                        if (util.isEmpty(value)) {
                            return "-";
                        } else {
                            // HTML 태그 이스케이프 처리
                            return value.replace(/&/g, '&amp;')
                                .replace(/</g, '&lt;')
                                .replace(/>/g, '&gt;')
                                .replace(/"/g, '&quot;')
                                .replace(/'/g, '&#039;');
                        }
                    }
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
                    width: "16%",
                    formatter: cell => {
                        return getLogTypeDetail(cell.getValue())
                    }
                },
                {
                    title: columnNames.runTime,
                    field: "intervaltime",
                    width: "11%",
                    formatter: cell => {
                        const value = cell.getValue()
                        if (isNaN(value)) {
                            return '-'
                        } else {
                            return cell.getValue().toLocaleString() + 'ms'
                        }
                    }
                },
            ],
        });

        this.table.on('rowClick', function (e, row) {
            if (this.selectedRow) {
                this.selectedRow.getElement().classList.remove('selected_row')
            }
            row.getElement().classList.add('selected_row')
            this.selectedRow = row
            const data = row.getData()
            v.getLogDetail(data)
        })

        // 소스맵 가이드 인스턴스
        this.logDetailSlide = new MaxyLogDetailSlide({
            id: id + '__logDetailSlide',
        })
    }

    getEndLogList() {
        const v = this

        const $logDetail = $('#logDetail')

        try {
            const packageNm = $('#packageNm').val()
            const serverType = $('#packageNm option:checked').data('server-type')

            // 팝업 내 리스트 클릭 시 어떤 데이터를 클릭한지 알 수 있도록 설정해준 고유 id
            const uuid = Math.random()
            // 누를 때 마다 list에 push
            v.uuidList.push(uuid)

            const waterfallParam = {
                packageNm,
                serverType,
                uuid,
                reqUrl: v.reqUrl,
                osType: v.param.osType,
                deviceId: v.param.searchValue,
                pageStartTm: v.param.searchFromDt,
                pageEndTm: v.param.searchToDt,
                docId: v.param.docId,
                logType: v.param.logType,
                logTm: v.param.searchFromDt,
                mxPageId: v.param.mxPageId,
            }

            const $waterfallGraph = $('#uaWaterfall')
            $waterfallGraph.removeClass('no_data')

            ajaxCall('/db/0100/getLoadingDetail.maxy', waterfallParam, {responseHeader: true})
                .then(({data, headers}) => {
                    // 가장 마지막으로 선택한 list의 uuid와 response header의 uuid가 다르면 detail 데이터 보여주지 않음
                    if (v.uuidList[v.uuidList.length - 1] !== Number(headers.uuid)) {
                        return
                    }

                    // 웹뷰일때는 waterfall 차트를 보여줌
                    const {
                        resourceInfoData,
                        timingData,
                        logInfo
                    } = data

                    v.datas = resourceInfoData

                    // logInfo 데이터가 있는 경우만 상단 정보 기입
                    // if (Object.keys(logInfo).length > 0) {
                    //     this.setDetailData(logInfo)
                    // }

                    const waterfall = {
                        'resource': resourceInfoData,
                        'time': timingData
                    }

                    this.drawPerformance(data, waterfallParam)
                    this.drawData(waterfall)
                }).catch(error => {
                console.log(error)
            })

            v.param.from = v.param.searchFromDt
            v.param.to = v.param.searchToDt
            v.param.deviceId = v.param.searchValue
            v.param.reqUrl = v.reqUrl

            ajaxCall('/ua/0000/getPageInfo.maxy', v.param, {disableCursor: true}).then(data => {
                const {pageInfo, med} = data
                this.setAvgData(med)

                if (pageInfo) {
                    const {loadingTime, responseTime} = pageInfo
                    $('#pLoadingTime').text(util.convertTime(Math.round(loadingTime), true))
                    $('#pResponseTime').text(util.convertTime(Math.round(responseTime), true))
                } else {
                    $('#pLoadingTime').text("-")
                    $('#pResponseTime').text("-")
                }
            })
            ajaxCall('/ua/0000/getLogListByPage.maxy', v.param, {disableCursor: true}).then(data => {

                const {logList} = data

                $logDetail.removeClass('no_data')

                const $countTarget = $("#" + v.id + "__popup" + " #count")
                if (!logList || logList.length === 0) {
                    $countTarget.text('(0)')
                    $logDetail.addClass('no_data')
                    return
                }

                $countTarget.text('(' + util.comma(logList.length) + ')')

                // filter 검색조건으로 사용할 필드
                logList.map(item => {
                    item.logClass = getLogTypeGroup(item.logType)
                    item.logTypeDetail = getLogTypeDetail(item.logType)
                })

                // 테이블에 데이터 넣기
                this.table.setData(logList)
                // Event Time Line 그려주기
                this.eventTimeLineInstance.setData(logList)

                // 첫 행 강제 클릭되게
                $("#" + v.id + "__popup" + " .tabulator-table > div:eq(0)").trigger('click')
            }).catch(error => {
                console.log(error)
            })
        } catch (e) {
            $logDetail.addClass('no_data')
        }
    }

    drawData(data) {
        const v = this

        //newWaterfall은 이렇게 쓰세요
        if (!this.waterfallInstance) {
            // newWaterfall 인스턴스 생성
            this.waterfallInstance = new newWaterfall({id: this.id})
        } else {
            this.waterfallInstance.waterfallChart.series[0].setData([])
            this.waterfallInstance.waterfallChart.series[1].setData([])
        }

        // 차트 업데이트
        this.waterfallInstance.resetSelectRange()
        this.waterfallInstance.type = 'all'
        this.waterfallInstance.setChartData(data, false)
    }

    drawPerformance(data, params) {
        // this.webVitalInstance.draw(data, params)
        this.webVitalInstance.setData(data, params)
    }

    // 테이블 하단에 상세 데이터 가져오기
    getLogDetail(row) {
        const params = {
            logTm: row.logTm,
            deviceId: row.deviceId,
            logType: row.logType,
            memUsage: row.memUsage,
            cpuUsage: row.cpuUsage,
            packageNm: row.packageNm,
            serverType: row.serverType,
            osType: row.osType,
            appVer: row.appVer,
            deviceModel: row.deviceModel,
            flowOrder: this.param.flowOrder,
            reqUrl: row.aliasValue,
            docId: row._id
        }
        if (!params.cpuUsage || params.cpuUsage === 0 || params.cpuUsage === '0') {
            params.cpuUsage = '0.0'
        }

        ajaxCall('/db/0100/getLogDetail.maxy', params)
            .then(response => {
                const {logDetail, pageInfo} = response
                this.setDetailData(logDetail, pageInfo)
            }).catch((e) => {
            console.log(e)
        })
    }

    // 리스트 행 클릭 시 나오는 상세 데이터 넣기
    setDetailData(data, pageInfo) {
        try {
            const {
                packageNm,
                serverType,
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
                pageUrl,
                simOperatorNm,
                jtxid,
                ip,
                userId,
                clientNo,
                maxySessionId,
                logTm,
                mappedErrorStack
            } = data

            this.maxySessionId = maxySessionId
            this.logTm = logTm

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

            // userId가 비어있지 않고 '-'가 아니면 userId 사용
            // 그렇지 않으면 clientNo 확인 후 사용, clientNo도 없으면 '-' 사용
            idDisplay.apply(userId, clientNo)

            // Se osType, osVer
            $('#pOsVerWrap .icon').removeClass('on')
            $('#pOsVerWrap .icon.ic_sm_' + osType.toLowerCase()).addClass('on')
            $('#pOsVer').text(osVer)

            if (util.isEmpty(ip)) {
                $('#networkIp').text('Network')
            } else {
                $('#networkIp').html('Network'
                    + '<span class="text_ip_color">&nbsp;(' + ip + ')</span>')
            }

            const $reqUrl = $('#pReqUrl')
            if (pageUrl) {
                const pageNm = getPageList(packageNm, serverType, pageUrl)
                if (reqUrl) {
                    $reqUrl.val(pageNm && !'null' === pageNm ? pageNm + ' : [' + reqUrl + ']' : reqUrl)
                } else {
                    $reqUrl.val(pageNm)
                }
            } else if (reqUrl) {
                $reqUrl.val('[' + reqUrl + ']')
            } else {
                $reqUrl.val('-')
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

            new LogDetail({
                id: 'logDetail',
                logType,
                osType,
                content: resMsg ? resMsg : contents,
                mappedErrorStack: mappedErrorStack || ''
            })

            util.setTablePct(util.convertMem('mb', storageUsage))
            this.comSensitivityFormat(comSensitivity)

            // Jennifer TXID가 있으면 resMsg 영역 하단에 TXID 를 추가
            if (jtxid) {
                $('#txidWrap').show()
                $('#txidWrap #ptxid').text('TXID: ' + jtxid)
            } else {
                $('#txidWrap').hide()
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
                $pLoadingTimeAvg.text(util.convertTime(Math.round(loadingTime), true, false, false))
            }

            if (responseTime) {
                $pResponseTimeAvg.text(util.convertTime(Math.round(responseTime), true, false, false))
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
        if (!row.getData().logType) {
            return
        }

        const logType = row.getData().logType;
        const convertedLogType = util.convertByLogType(logType);

        $(row.getCells()[3].getElement()).prepend($("<span>").addClass("bp").addClass(convertedLogType[0]));
        $(row.getCells()[4].getElement()).prepend($("<span>").addClass(convertedLogType[1]));
    }

    comSensitivityFormat(val) {
        const comSensitivityFormatArr = util.convertComSensitivity(val)
        const $networkStatus = $('.network_status')

        $networkStatus.removeClass().addClass('network_status')
        $networkStatus.addClass(comSensitivityFormatArr[1])

        $('#tSensitivity').text(comSensitivityFormatArr[0])
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

    // Tabulator 검색 필터
    tableFilter() {
        const v = this
        const {id} = v

        const $tableFilter = $('#' + id + '__tableFilter')

        const searchKey = $tableFilter.find('select').val()
        const searchValue = $tableFilter.find('input').val().trim()

        if (searchValue === '') {
            v.table.clearFilter()
        } else {
            v.table.setFilter(searchKey, 'like', searchValue)
        }
    }
}