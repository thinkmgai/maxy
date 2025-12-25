/*
    종합 분석 > LoadingTime Scatter > 팝업
 */
class AnalysisLoadingWithMultipleUrlPopup {
    constructor(options) {
        this.appendId = options.appendId
        this.id = options.id
        this.data = options.data
        this.type = options.requestType
        this.selectedData = ''
        this.uuidList = []
        this.popupType = options.popupType
        this.popupTitle = options.popupTitle
        this.intervalSort = options.intervalSort
        this.limit = options.limit

        // 팝업 생성 후
        this.init().then(() => {
            this.addEventListener()
            popup.open(this.id).then(() => {
                this.drawTable()

                // 인스턴스는 하나만 생성
                this.webVitalInstance = new MaxyWebVital({
                    opts: [{
                            id: this.id + '__webVitalFull',
                            rangeSelectedCallback: (e) => { // rangeSelect 기능 콜백함수, 함수유무로 기능 추가할지 결정
                                const {min, max} = e.detail

                                // min, max 값을 waterfallInstance에 저장
                                this.waterfallInstance.selectedMin = min
                                this.waterfallInstance.selectedMax = max

                                // 현재 탭에 맞는 필터링된 데이터
                                let selectedData = this.waterfallInstance.filterDataByType(min, max) // type이 현재 탭 기준

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
            const pReqUrlText = $('#pReqUrl').text()
            const reqUrl = pReqUrlText ? pReqUrlText : $('#pAliasValue').text()

            alias.show({
                reqUrl: reqUrl,
                cb: function () {
                    alias.callback(v, reqUrl)
                }
            })
        })

        // 하단 펼치기 버튼
        /*$('#' + v.id + '__popup' + ' .btn_popup_right_side.open').on('click', async function () {
            // 펼치기: hidden을 제거하고 show 추가
            $('.popup_right_side_wrap').removeClass('hidden').addClass('show')
        })*/

        // 펼친 화면 접기 버튼
        /*$('#' + v.id + '__popup' + ' .btn_popup_right_side.close').on('click', function () {
            $('#' + v.id + '__popup' + '.popup_right_side_wrap').removeClass('show').addClass('hidden');
        })*/
    }

    async init() {
        const v = this
        const {id, appendId, popupType, popupTitle} = v
        const source = await fetch(
            '/components/cmm/popup-analysis-loading-multiple-url.html')
            .then(response => response.text())

        const template = Handlebars.compile(source)

        const $target = $('#' + appendId)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + appendId
        }
        $target.empty()
        $target.append(template({id, popupType, popupTitle}))
    }

    drawTable() {
        try {
            const v = this
            const tableTarget = '#' + v.id + '__logList'
            const placeholder = trl('common.msg.noData')

            const columnNames = {
                'time': trl('common.tableColumn.time'),
                'deviceId': trl('common.tableColumn.deviceId'),
                'userId': trl('common.text.userId'),
                'timestamp': trl('common.tableColumn.timestamp'),
                'networkStatus': trl('common.tableColumn.networkStatus'),
                'cpuUsage': trl('common.tableColumn.cpuUsage'),
                'pageUrl': trl('common.text.pageUrl')
            }

            v.table = new Tabulator(tableTarget, {
                layout: 'fitDataFill',
                placeholder: placeholder,
                columns: [
                    {
                        title: columnNames.time,
                        field: "intervaltime",
                        width: "8%",
                        // formatter: popup.dataFormat.time
                        formatter: cell => {
                            if (cell.getValue() >= this.limit) {
                                cell.getElement().style.color = 'red'
                            }
                            const value = cell.getValue()
                            return popup.dataFormat(value, 'interval')
                        }
                    },
                    {
                        title: "Feeldex",
                        width: "8%",
                        field: "feeldex",
                        formatter: cell => {
                            const value = cell.getValue()
                            return popup.dataFormat(value, 'feeldex')
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
                        hozAlign: "left",
                        width: "10%",
                        formatter: idDisplay.getId
                    },
                    {
                        title: columnNames.timestamp,
                        field: "pageStartTm", // 25.04.15 loading time 팝업 내 테이블의 Time Stamp값을 pageEndTm이 아닌 pageStartTm으로 수정하라고 요청받음
                        width: "14%",
                        formatter: cell => {
                            return popup.dataFormat(cell.getValue(), 'date')
                        }
                    },
                    {
                        title: columnNames.networkStatus,
                        field: "avgComSensitivity",
                        width: "12%%",
                        formatter: cell => {
                            const avgComSensitivity = cell.getValue()
                            return popup.dataFormat(avgComSensitivity, 'comSensitivity')
                        }
                    },
                    {
                        title: columnNames.pageUrl,
                        field: "reqUrl",
                        width: "30%",
                    },
                    {
                        title: "logType",
                        field: "logType",
                        visible: false
                    }
                ],
            })

            v.table.on('rowClick', (e, row) => {
                // row 클릭 시 waterfallInstance의 type 초기화 ('all')
                v.waterfallInstance.type = 'all'

                popup.rowClick(e, row, v, (data) => {
                    v.getDetailData(data)
                });
            })

            v.table.on('tableBuilt', function () {
                v.getListData()
            })
        } catch (e) {
            console.log(e)
        }
    }


    /**
     * 팝업 상단 list 영역 데이터 요청 함수
     */
    getListData() {
        // 리스트 데이터 없으면 no_data, 그래프 높이 조정, 버튼 이벤트 off하기
        const $logDetailGraph = $('#loadingTimePopup__logDetail')

        try {
            const v = this
            const {data, id} = v

            let {paramList} = data

            if (!paramList || paramList.length === 0) {
                $('.graph_title button').off('click')
                return
            }

            v.getLoadingTimeAvg().then(() => {
                // paramList에서 wtfFlag가 "Y" 인 값만 list에 넣어주기
                const filteredParamList = paramList

                const length = filteredParamList.length
                const $countTarget = $('#' + id + '__popup' + ' #count')

                // 데이터 없으면 no data 문구 보여주고 리턴
                if (length === 0) {
                    $countTarget.text('(0)')
                    return
                }

                for (let i = 0; i < filteredParamList.length; i++) {
                    const osType = filteredParamList[i].osType
                    const intervaltime = filteredParamList[i].intervaltime

                    filteredParamList[i].feeldex = util.getFeeldexCode(v.loadingAvg, intervaltime, osType)
                }
                // 리스트 갯수 보여주기
                $countTarget.text('(' + util.comma(length) + ')')

                if (!v.intervalSort) {
                    // logtm으로 정렬
                    filteredParamList.sort((a, b) => b.logTm - a.logTm)
                }

                v.table.setData(filteredParamList).then(() => {
                    this.setTooltip()
                    // 첫 행 강제 클릭되게
                    //$('#' + id + '__popup' + ' .tabulator-table > div:eq(0)').trigger('click')
                })
            })
        } catch (e) {
            console.log(e)
            const subtitleHeight = $('.maxy_popup_sub_title').height() + 40 + 'px'
            $logDetailGraph.css('height', 'calc(61vh - ' + subtitleHeight + ')')
        }
    }

    setTooltip() {
        const tooltipTxt = [
            trl('common.msg.deviceIdCopy'),
            trl('common.text.appVersion'),
            trl('common.text.osVersion'),
            trl('common.text.networkType'),
            trl('common.text.carrier'),
            trl('common.text.location'),
            trl('common.tableColumn.pageType')
        ]

        // 상단 타이틀 옆 회색 아이콘에 툴팁 추가
        $('.sub_title_wrap .sub_title:not(#pUserId)').each(function (idx) {
            const id = $(this).attr('id')
            tippy('#' + id, {
                content: tooltipTxt[idx],
                arrow: false,
                placement: 'bottom',
                allowHTML: true,
                theme: 'maxy-tooltip'
            })
        })

        tippy('#btnPageFlow', {
            content: trl('common.text.userBehavior'),
            arrow: false,
            placement: 'bottom',
            allowHTML: true,
            theme: 'maxy-tooltip'
        })
    }

    /**
     * 팝업 하단 상세 데이터 요청 함수
     * @param param 클릭한 데이터
     */
    getDetailData(param) {
        // 상단에 page type은 param.logType이 없으면 default 값이 web view임
        const $iconLogType = $('.icon_log_type')
        const $logTypeNm = $('#pLogTypeNm')

        if ($iconLogType.hasClass('native')) {
            $iconLogType.removeClass('native')
        } else {
            $iconLogType.removeClass('webview')
        }

        let pageType
        if (param.logType) {
            pageType = util.logTypeToPageType(param.logType)
            $iconLogType.addClass(pageType[0])
            $logTypeNm.text(pageType[1])
        } else {
            pageType = 'Web View'
            $iconLogType.addClass('webview')
            $logTypeNm.text(pageType)
        }

        const v = this

        const packageNm = $('#packageNm').val()
        const serverType = $('#packageNm option:checked').data('server-type')

        // 팝업 내 리스트 클릭 시 어떤 데이터를 클릭한지 알 수 있도록 설정해준 고유 id
        const uuid = Math.random()
        // 누를 때 마다 list에 push
        v.uuidList.push(uuid)

        const params = {
            packageNm,
            serverType,
            uuid,
            logTm: v.selectedData.logTm,
            reqUrl: v.selectedData.reqUrl,
            pageStartTm: param.pageStartTm,
            pageEndTm: param.pageEndTm,
            deviceModel: param.deviceModel,
            osType: $('#osType').val(),
            deviceId: param.deviceId,
            docId: v.selectedData._id,
            mxPageId: v.selectedData.mxPageId,
            logType: v.selectedData.logType
        }

        console.log(params)

        ajaxCall('/db/0100/getLoadingDetail.maxy', params, {responseHeader: true})
            .then(({data, headers}) => {
                // 가장 마지막으로 선택한 list의 uuid와 response header의 uuid가 다르면 detail 데이터 보여주지 않음
                if (v.uuidList[v.uuidList.length - 1] !== Number(headers.uuid)) {
                    return
                }

                const {
                    logInfo,
                    hasPageLog,
                    resourceInfoData,
                    timingData
                } = data

                // logInfo 데이터가 있는 경우만 상단 정보 기입
                if (Object.keys(logInfo).length > 0) {
                    this.setDetailData(logInfo)
                }

                const $btnPageFlow = $('#btnPageFlow')
                if (hasPageLog) {
                    $btnPageFlow.show()
                } else {
                    $btnPageFlow.hide()
                }

                const pageType = util.logTypeToPageType(logInfo.logType)

                if(pageType[0] === 'webview'
                    || (resourceInfoData &&
                        resourceInfoData.length > 0)) {
                    // 웹뷰일때는 waterfall 차트를 보여줌
                    $('#' + v.id + '__eventTimeLine').hide()
                    v.datas = resourceInfoData

                    const waterfall = {
                        'resource': resourceInfoData,
                        'time': timingData
                    }

                    this.drawData(waterfall)

                } else if(pageType[0] === 'native') {
                    // native화면일 경우 event time line을 보여줌
                    if(typeof logInfo === 'undefined'
                        || logInfo.length === 0) return

                    const param = {
                        packageNm: logInfo.packageNm,
                        serverType: logInfo.serverType,
                        deviceId: logInfo.deviceId,
                        from: logInfo.pageStartTm,
                        to: logInfo.pageEndTm
                    }

                    this.eventTimeLineInstance.callGetLogListByPage(param)
                    $('#' + v.id + '__eventTimeLine').show()
                    $('#' + v.id + '__waterfall').hide()
                }

                this.drawPerformance(data, params)
                $('#' + v.id + '__popup .popup_right_side_wrap').removeClass('hidden').addClass('show')
            }).catch((e) => {
            console.log(e)
        })
    }

    setDetailData(logInfo) {
        const v = this

        const {
            aliasValue,
            reqUrl,
            deviceModel,
            appVer,
            osType,
            osVer,
            comType,
            simOperatorNm,
            timezone,
            birthDay,
            userId,
            userNm,
            clientNm,
            deviceId,
            packageNm,
            serverType,
            clientNo
        } = logInfo

        const $pDeviceName = $('#pDeviceName')

        $pDeviceName.off('click')
        $pDeviceName.on('click', () => {
            util.copy(deviceId)
        })

        $('#pDeviceName > span').text(getDeviceModel(deviceModel))
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

        const aliasText = getPageList(packageNm, serverType, aliasValue)
        const $pReqUrl = $('#pReqUrl')
        const $pAliasValue = $('#pAliasValue')
        const $btnAlias = $('#' + v.id + '__popup .btn_alias')
        // aliasValue가 없거나 reqUrl과 같으면 aliasValue 숨김 처리 (reqUrl만 보여주고 최대 넓이를 97%로 설정)
        if (!aliasText || aliasText === reqUrl) {
            $pAliasValue.text('')
            $pAliasValue.hide()
            $pReqUrl.css('max-width', '97%')
            $pReqUrl.text(reqUrl)
            // alias 수정 팝업 버튼 보이게
            $btnAlias.show()
        } else {
            if ($pAliasValue.css('display') === 'none') {
                $pAliasValue.show()
            }
            $pAliasValue.text(aliasText)
            $pReqUrl.text(reqUrl)
            $btnAlias.show()
        }

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
    }

    drawData(data) {
        const v = this
        $('#' + v.id + '__eventTimeLine').hide()
        $('#' + v.id + '__waterfall').show()

        //newWaterfall은 이렇게 쓰세요
        if (!this.waterfallInstance) {
            // newWaterfall 인스턴스 생성
            this.waterfallInstance = new newWaterfall({id: this.id})
        }

        this.waterfallInstance.waterfallChart.series[0].setData([])
        this.waterfallInstance.waterfallChart.series[1].setData([])

        // 차트 업데이트
        this.waterfallInstance.resetSelectRange()
        this.waterfallInstance.type = 'all'
        this.waterfallInstance.setChartData(data, false)
    }

    drawPerformance(data, params) {
        // this.webVitalInstance.draw(data, params)
        this.webVitalInstance.setData(data, params)
    }

    async getLoadingTimeAvg() {
        const v = this

        const param = {
            'packageNm': $('#packageNm').val(),
            'serverType': $('#packageNm option:checked').data('server-type'),
            'osType': $('#osType').val(),
            'type': 'loading',
            'searchFromDt': util.dateToTimestamp(util.getDate(-7), true),
            'searchToDt': new Date().getTime()
        }

        await ajaxCall('/db/0100/getAvgFromLoadingOrResponse.maxy', param, {disableCursor: true})
            .then(data => {
                v.loadingAvg = data
            }).catch((e) => {
                console.log(e)
            })
    }
}
