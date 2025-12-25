/*
    성능 분석 > LoadingTime > 팝업
*/
class MaxyPopupLogListWithWaterfall {
    constructor(options) {
        this.appendId = options.appendId
        this.id = options.id
        this.param = options.param
        this.data = options.data
        this.type = ''
        this.selectedRow = null
        this.popupType = options.popupType
        this.uuidList = []

        if (!this.id || !this.appendId || !this.param) {
            console.log('check parameter')
            return false
        }
        // 상태별 색상코드
        this.COLORS = {
            GOOD: '#35DA9E',
            NEEDS_IMPROVEMENT: '#FFC700',
            POOR: '#FF6969'
        }

        // Core Vital별 상태 기준 값, NEEDS_IMPROVEMENT 이상일 경우 POOR
        this.THRESHOLDS = {
            LCP: {GOOD: 2500, NEEDS_IMPROVEMENT: 4000},
            INP: {GOOD: 200, NEEDS_IMPROVEMENT: 500},
            CLS: {GOOD: 0.1, NEEDS_IMPROVEMENT: 0.25},
            FCP: {GOOD: 1800, NEEDS_IMPROVEMENT: 3000},
        }


        this.init().then(() => {
            this.addEventListener()
            popup.open(this.id).then(() => {
                this.drawTable()

                // MaxyWebVital 인스턴스 생성
                this.webVitalInstance = new MaxyWebVital({
                    opts: [{
                        id: this.id + '__webVitalFull',
                        rangeSelectedCallback: (e) => { // rangeSelect 기능 콜백함수, 함수유무로 기능 추가할지 결정
                            const {min, max} = e.detail

                            // min, max 값을 waterfallInstance에 저장
                            this.waterfallInstance.selectedMin = min
                            this.waterfallInstance.selectedMax = max

                            // 현재 탭에 맞는 필터링된 데이터
                            const selectedData = this.waterfallInstance.filterDataByType(min, max) // type이 현재 탭 기준

                            // 필터링 된 데이터 차트 영역에 세팅
                            this.waterfallInstance.setChartData(selectedData, true)
                            // min, max 영역으로 x축 범위 설정
                        }
                    }]
                })
                // newWaterfall 인스턴스 생성
                this.waterfallInstance = new newWaterfall({id: this.id + '__waterfall'})

                // eventTimeLine 인스턴스 생성
                this.eventTimeLineInstance = new MaxyEventTimeLine({id: this.id + '__eventTimeLine'})
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

        // Page Alias 변경 버튼 클릭시
        $('#' + v.id + '__popup .btn_alias').on('click', function () {
            const reqUrl = $('#pReqUrl').text()

            alias.show({
                reqUrl: reqUrl,
                cb: function () {
                    v.cbAliasUpdate(v, reqUrl)
                }
            })
        })

        popup.tooltip.loadingTimePopup()
    }

    async init() {
        const v = this
        const {id, appendId, param, popupType} = v
        const source = await fetch(
            '/components/cmm/popup-log-list-with-waterfall.html')
            .then(response => response.text())

        const template = Handlebars.compile(source)
        const $target = $('#' + appendId)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + appendId
        }
        $target.empty()

        $target.append(template({id}))

        $('#setDeviceModel').text(param.deviceModel)

        const $pReqUrl = $('#' + id + '__popup' + ' #pReqUrl')
        const $pAliasValue = $('#' + id + '__popup' + ' #pAliasValue')

        const packageNm = sessionStorage.getItem('packageNm')
        const serverType = sessionStorage.getItem('serverType')
        const aliasValue = getPageList(packageNm, serverType, param.reqUrl)

        // aliasValue 없는 경우 또는 aliasValue랑 reqUrl이 같은 경우
        if (!aliasValue || aliasValue === param.reqUrl) {
            $pAliasValue.text('')
            $pAliasValue.hide()
            $pReqUrl.css('max-width', '97%')
            $pReqUrl.text(param.reqUrl)
        } else {
            if ($pAliasValue.css('display') === 'none') {
                $pAliasValue.show()
            }
            $pAliasValue.text(aliasValue)
            $pReqUrl.text(param.reqUrl)
        }
    }

    drawTable() {
        const v = this;
        const {id} = v
        const tableTarget = '#' + id + '__logList'

        const columnNames = {
            'time': trl('common.tableColumn.time'),
            'deviceId': trl('common.tableColumn.deviceId'),
            'userId': trl('common.text.userId'),
            'timestamp': trl('common.tableColumn.timestamp'),
            'networkStatus': trl('common.tableColumn.networkStatus')
        }

        v.table = new Tabulator(tableTarget, {
            layout: 'fitDataFill',
            placeholder: trl('common.msg.noData'),
            columns: [
                {
                    title: columnNames.time,
                    field: "loadingTime",
                    hozAlign: "left",
                    width: "8%",
                    formatter: function(cell) {
                        const value = cell.getValue()

                        // wtfFlag가 "N"인 경우 텍스트 색상을 회색으로 설정
                        if(cell.getData().wtfFlag === "N") {
                            return "<span class='no_wtf''>" + popup.dataFormat(value, 'interval') + "</span>";
                        } else {
                            return popup.dataFormat(value, 'interval')
                        }
                    },
                },
                {
                    title: "Feeldex",
                    width: "8%",
                    field: "feeldex",
                    formatter: function (cell) {
                        const value = cell.getValue()
                        return popup.dataFormat(value, 'feeldex')
                    },
                    tooltip: function (e, cell) {
                        const value = cell.getData().feeldex
                        if (value !== undefined || value >= 0) {
                            return util.setFeeldexTooltip(e, cell, value)
                        }
                    }
                },
                {
                    title: columnNames.deviceId,
                    field: "deviceId",
                    hozAlign: "left",
                    width: "22%",
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
                    title: columnNames.timestamp,
                    field: "pageStartTm",
                    hozAlign: "left",
                    width: "14%",
                    formatter: function (cell) {
                        return popup.dataFormat(cell.getValue(), 'date')
                    }
                },
                {
                    title: columnNames.networkStatus,
                    field: "avgComSensitivity",
                    hozAlign: "left",
                    width: "12%",
                    formatter: cell => {
                        const avgComSensitivity = cell.getValue()
                        return popup.dataFormat(avgComSensitivity, 'comSensitivity')
                    }
                },
                {
                    title: 'LCP',
                    field: 'lcp',
                    vertAlign: 'middle',
                    hozAlign: 'center',
                    width: '6%',
                    formatter: (cell) => {
                        const field = cell.getData().lcp
                        if(field === null || field === undefined){
                            return `<span class='btn_yn'>-</span>`
                        }
                        const lcp = Number(field).toFixed(0)
                        const lcpTxt = lcp / 1000 + 's'

                        if (lcp < v.THRESHOLDS.LCP.GOOD) {
                            return `<span class='btn_yn good'>${lcpTxt}</span>`
                        } else if (lcp >= v.THRESHOLDS.LCP.GOOD && lcp < v.THRESHOLDS.LCP.NEEDS_IMPROVEMENT) {
                            return `<span class='btn_yn improve'>${lcpTxt}</span>`
                        } else {
                            return `<span class='btn_yn poor'>${lcpTxt}</span>`
                        }
                    }
                }, {
                    title: 'FCP',
                    field: 'fcp',
                    vertAlign: 'middle',
                    hozAlign: 'center',
                    width: '6%',
                    formatter: (cell) => {
                        const field = cell.getData().fcp
                        if(field === null || field === undefined){
                            return `<span class='btn_yn'>-</span>`
                        }
                        const fcp = Number(field).toFixed(0)
                        const fcpTxt = fcp / 1000 + 's'

                        if (fcp < v.THRESHOLDS.FCP.GOOD) {
                            return `<span class='btn_yn good'>${fcpTxt}</span>`
                        } else if (fcp >= v.THRESHOLDS.FCP.GOOD && fcp < v.THRESHOLDS.FCP.NEEDS_IMPROVEMENT) {
                            return `<span class='btn_yn improve'>${fcpTxt}</span>`
                        } else {
                            return `<span class='btn_yn poor'>${fcpTxt}</span>`
                        }
                    }
                }, {
                    title: 'INP',
                    field: 'inp',
                    vertAlign: 'middle',
                    hozAlign: 'center',
                    width: '6%',
                    formatter: (cell) => {
                        const field = cell.getData().inp
                        if(field === null || field === undefined){
                            return `<span class='btn_yn'>-</span>`
                        }
                        const inp = Number(field).toFixed(0)
                        if (inp < v.THRESHOLDS.INP.GOOD) {
                            return `<span class='btn_yn good'>${inp}ms</span>`
                        } else if (inp >= v.THRESHOLDS.INP.GOOD && inp < v.THRESHOLDS.INP.NEEDS_IMPROVEMENT) {
                            return `<span class='btn_yn improve'>${inp}ms</span>`
                        } else {
                            return `<span class='btn_yn poor'>${inp}ms</span>`
                        }
                    }
                },
                {
                    title: 'CLS',
                    field: 'cls',
                    vertAlign: 'middle',
                    hozAlign: 'center',
                    width: '6%',
                    formatter: (cell) => {
                        const field = cell.getData().cls
                        if(field === null || field === undefined){
                            return `<span class='btn_yn'>-</span>`
                        }
                        const cls = (Number(field) === 0 ? 0 : Number(field).toFixed(4))
                        if (cls < v.THRESHOLDS.CLS.GOOD) {
                            return `<span class='btn_yn good'>${cls}</span>`
                        } else if (cls >= v.THRESHOLDS.CLS.GOOD && cls < v.THRESHOLDS.CLS.NEEDS_IMPROVEMENT) {
                            return `<span class='btn_yn improve'>${cls}</span>`
                        } else {
                            return `<span class='btn_yn poor'>${cls}</span>`
                        }
                    }
                },
                {
                    field: "_id",
                    visible: false
                }
            ],
        })

        v.table.on('rowClick', (e, row) => {
            popup.rowClick(e, row, v, (data) => {
                v.getDetailData(data)
            });
        });

        v.table.on('tableBuilt', function () {
            v.getEndLogList()
        })
    }

    getEndLogList() {
        const v = this
        const {param} = v
        param.type = v.popupType

        cursor.show(false, '#' + v.id + '__popup')
        ajaxCall('/pa/0000/getLoadingTimeDetailList.maxy', param, {disableDimmed: true, disableCursor: true})
            .then(data => {
                this.addLogList(data)
            })
            .catch((e) => {
                console.log(e)
            })
            .finally(() => {
                cursor.hide('#' + v.id + '__popup')
            })
    }

    addLogList(data) {
        const v = this

        try {
            const logList = data.detailList

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

    // 테이블 하단에 상세 데이터 가져오기
    getDetailData(data) {
        const {id} = this

        this.setDetailData(data)

        const v = this

        const packageNm = sessionStorage.getItem('packageNm')
        const serverType = sessionStorage.getItem('serverType')
        const osType = sessionStorage.getItem('osType')

        // 팝업 내 리스트 클릭 시 어떤 데이터를 클릭한지 알 수 있도록 설정해준 고유 id
        const uuid = Math.random()
        // 누를 때 마다 list에 push
        v.uuidList.push(uuid)

        const param = {
            packageNm,
            serverType,
            osType,
            pageStartTm: data.pageStartTm,
            pageEndTm: data.pageEndTm,
            deviceId: data.deviceId,
            appVer: v.param.appVer,
            deviceModel: v.param.deviceModel,
            docId: data._id,
            mxPageId: data.mxPageId,
            uuid,
            logType: data.logType,
        }

        this.to = data.pageEndTm

        const logType = data.logType
        const deviceId = data.deviceId
        const pageStartTm = data.pageStartTm
        const pageEndTm = data.pageEndTm
        const wtfFlag = data.wtfFlag
        const pageType = util.logTypeToPageType(logType)

        cursor.show(false, '#' + v.id + '__popup')
        ajaxCall('/pa/0000/getLoadingDetail.maxy', param,
            {responseHeader: true, disableDimmed: true, disableCursor: true})
            .then(({data, headers}) => {
                // 가장 마지막으로 선택한 list의 uuid와 response header의 uuid가 다르면 detail 데이터 보여주지 않음
                if (v.uuidList[v.uuidList.length - 1] !== Number(headers.uuid)) {
                    return
                }

                const {
                    resourceInfoData,
                    timingData,
                    hasPageLog
                }
                    = data

                v.datas = resourceInfoData

                const $btnPageFlow = $('#btnPageFlow')
                if (hasPageLog) {
                    $btnPageFlow.show()
                } else {
                    $btnPageFlow.hide()
                }

                if (wtfFlag === 'N' && pageType[0] === 'webview') {
                    const msg = trl('common.msg.noDataCollected')
                    toast(msg)
                    $('#' + v.id + '__popup .popup_right_side_wrap').removeClass('show').addClass('hidden')
                    return
                }

                if (pageType[0] === 'webview' || (resourceInfoData && resourceInfoData.length > 0)) {
                    const waterfall = {
                        'resource': resourceInfoData,
                        'time': timingData
                    }
                    this.drawPerformance(data, param)
                    this.drawData(waterfall)

                } else if(pageType[0] === 'native') {
                    const param = {
                        packageNm: packageNm,
                        serverType: serverType,
                        deviceId: deviceId,
                        from: pageStartTm,
                        to: pageEndTm
                    }

                    this.eventTimeLineInstance.callGetLogListByPage(param)
                    $('#' + v.id + '__webVitalFull').hide()
                    $('#' + v.id + '__waterfall').hide()
                    $('#' + v.id + '__eventTimeLine').show()
                    // 이벤트 타임라인이 표시될 때 web_chart_wrap에 no-grid-display 클래스 추가
                    $('#' + v.id + '__popup .web_chart_wrap').addClass('no-grid-display')
                }
                $('#' + v.id + '__popup .popup_right_side_wrap').removeClass('hidden').addClass('show')


            })
            .catch((e) => {
                console.log(e)
            })
            .finally(() => {
                cursor.hide('#' + v.id + '__popup')
            })
    }

    drawPerformance(data, params) {
        this.webVitalInstance.setData(data, params)
    }

    drawData(data) {
        const v = this
        $('#' + v.id + '__eventTimeLine').hide()
        // 이벤트 타임라인이 숨겨질 때 web_chart_wrap에서 no-grid-display 클래스 제거
        $('#' + v.id + '__popup .web_chart_wrap').removeClass('no-grid-display')
        $('#' + v.id + '__webVitalFull').show()
        $('#' + v.id + '__waterfall').show()

        if (!this.waterfallInstance) {
            // newWaterfall 인스턴스 생성
            this.waterfallInstance = new newWaterfall({id: this.id + '__waterfall'})
        }

        if (!this.eventTimeLineInstance) {
            // newWaterfall 인스턴스 생성
            this.eventTimeLineInstance = new MaxyEventTimeLine({id: this.id + '__eventTimeLine'})
        }

        this.waterfallInstance.resetSelectRange()
        this.waterfallInstance.type = 'all'
        this.waterfallInstance.setChartData(data, false)
    }

    setDetailData(data) {
        try {
            const v = this
            const {
                logType,
                deviceModel,
                deviceId,
                appVer,
                osType,
                osVer,
                comType,
                simOperatorNm,
                timezone,
                userId,
                userNm,
                birthDay,
                clientNm,
                clientNo
            } = data

            // 상단에 page type은 param.logType이 없으면 default 값이 web view임
            const $iconLogType = $('.icon_log_type')
            const $logTypeNm = $('#pLogTypeNm')

            if ($iconLogType.hasClass('native')) {
                $iconLogType.removeClass('native')
            } else {
                $iconLogType.removeClass('webview')
            }

            let pageType
            if (logType) {
                pageType = util.logTypeToPageType(logType)
                $iconLogType.addClass(pageType[0])
                $logTypeNm.text(pageType[1])
            } else {
                pageType = 'Web View'
                $iconLogType.addClass('webview')
                $logTypeNm.text(pageType)
            }

            // 상단에 deviceId
            const $pDeviceName = $('#pDeviceName')

            $pDeviceName.off('click')
            $pDeviceName.on('click', () => {
                util.copy(deviceId)
            })

            $('#pDeviceName > span').text(getDeviceModel(deviceModel))

            // 앱 버전
            $('#pAppVer > span').text(appVer)

            // Se osType, osVer
            const $iconOs = $('.icon_os')
            $iconOs.removeClass('ios')
            $iconOs.removeClass('android')

            if (osType === 'iOS') {
                $iconOs.addClass('ios')
            } else {
                $iconOs.addClass('android')
            }
            $('#pOsVer > span').text(osVer)
            $('#pComTypeTxt').text(util.convertComType(comType))
            $('#pSimOperatorNm').text(simOperatorNm ? util.simOperatorNmFormat(simOperatorNm) : '-')
            $('#pTimeZone').text(timezone)

            // userId 있는 경우만 툴팁 표시
            if (!util.isEmpty(userId) && userId !== '-') {
                $('#pUserId').css('display', 'flex')
                $('#pUserIdTxt').text(userId)

                const userInfo = (util.isEmpty(clientNm) ? '-' : clientNm) +
                    ' / ' + (util.isEmpty(userNm) ? '-' : userNm) +
                    ' / ' + (util.isEmpty(userId) ? '-' : userId) +
                    ' / ' + (util.isEmpty(birthDay) ? '-' : birthDay)

                if (v.userInfoTooltip) {
                    v.userInfoTooltip[0].setContent(userInfo)
                } else {
                    v.userInfoTooltip = tippy('#pUserId', {
                        content: userInfo,
                        arrow: false,
                        placement: 'bottom',
                        allowHTML: true,
                        theme: 'maxy-tooltip'
                    })
                }
            } else if (!util.isEmpty(clientNo) && clientNo !== '-') {
                // userId가 없거나 -인데, clientNo가 있고 -가 아닌 경우
                $('#pUserId').css('display', 'flex')
                $('#pUserIdTxt').text(clientNo)

                const userInfo = (util.isEmpty(clientNm) ? '-' : clientNm) +
                    ' / ' + (util.isEmpty(userNm) ? '-' : userNm) +
                    ' / ' + (util.isEmpty(clientNo) ? '-' : clientNo) +
                    ' / ' + (util.isEmpty(birthDay) ? '-' : birthDay)

                if (v.userInfoTooltip) {
                    v.userInfoTooltip[0].setContent(userInfo)
                } else {
                    v.userInfoTooltip = tippy('#pUserId', {
                        content: userInfo,
                        arrow: false,
                        placement: 'bottom',
                        allowHTML: true,
                        theme: 'maxy-tooltip'
                    })
                }
            } else {
                $('#pUserIdTxt').text('')
                $('#pUserId').hide()
            }
        } catch (e) {
            console.error(e)
        }
    }

    // alias 변경 콜백함수
    cbAliasUpdate(v, reqUrl) {
        const newAlias = getPageList(sessionStorage.getItem('packageNm'), sessionStorage.getItem('serverType'), reqUrl, true)

        // 팝업 타이틀 변경
        const $popup = $(`#${v.id}__popup`)
        // 바뀐 alias명으로 세팅
        const $pAliasValue = $popup.find('#pAliasValue')
        if ($pAliasValue.css('display') === 'none') {
            $pAliasValue.show()
        }
        if (!newAlias) {
            $pAliasValue.hide()
        } else {
            $pAliasValue.text(newAlias)
        }
        $popup.find('#pReqUrl').text(reqUrl)

        const $selectedRow = $('#paTable .tabulator-row.tabulator-selected')
        const $target = $selectedRow.children('div').eq(0)

        // 텍스트 노드만 바꾸기
        $target.contents().filter(function() {
            return this.nodeType === 3; // 텍스트 노드
        }).first().replaceWith((newAlias || reqUrl) + ' ')
    }
}
