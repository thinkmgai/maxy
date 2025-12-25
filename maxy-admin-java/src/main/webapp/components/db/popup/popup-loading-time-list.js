/*
    종합 분석 > LoadingTime Line chart > 팝업
*/
class MaxyPopupLoadingTimeList {
    constructor(options) {
        this.appendId = options.appendId
        this.id = options.id
        this.data = options.data
        this.selectedRow = null
        this.uuidList = []
        this.popupType = options.popupType
        this.popupTitle = options.popupTitle

        // 팝업 생성 후
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
            const reqUrl = $('#pReqUrl').text()

            alias.show({
                reqUrl: reqUrl,
                cb: function () {
                    alias.callback(v, reqUrl)
                }
            })
        })

        popup.tooltip.loadingTimePopup()
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

        updateContent()
    }

    drawTable() {
        const v = this
        const tableTarget = '#' + v.id + '__logList'

        const columnNames = {
            'time': trl('common.tableColumn.time'),
            'deviceId': trl('common.tableColumn.deviceId'),
            'userId': trl('common.text.userId'),
            'timestamp': trl('common.tableColumn.timestamp'),
            'networkStatus': trl('common.tableColumn.networkStatus'),
            'cpuUsage': trl('common.tableColumn.cpuUsage')
        }

        const placeholder = trl('common.msg.noData')
        this.table = new Tabulator(tableTarget, {
            layout: 'fitDataFill',
            placeholder: placeholder,
            columns: [
                {
                    title: columnNames.time,
                    field: "loadingTime",
                    width: "8%",
                    formatter: cell => {
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
                    field: "pageEndTm",
                    width: "14%",
                    formatter: cell => {
                        return popup.dataFormat(cell.getValue(), 'date')
                    }
                },
                {
                    title: columnNames.networkStatus,
                    field: "avgComSensitivity",
                    width: "12%",
                    formatter: cell => {
                        const avgComSensitivity = cell.getValue()
                        return popup.dataFormat(avgComSensitivity, 'comSensitivity')
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
        })

        v.table.on('rowClick', (e, row) => {
            popup.rowClick(e, row, v, (data) => {
                v.getDetailData(data)
            })
        })

        v.table.on('tableBuilt', function () {
            v.getLoadingTimeList()
        })
    }

    getLoadingTimeList() {
        const {data, table, id} = this

        ajaxCall('/db/0100/getLoadingTimeList.maxy', data, {disableDimmed: true})
            .then(response => {
                const $countTarget = $("#" + id + "__popup" + " #count")
                if (response.list.length === 0) {
                    $countTarget.text('(0)')
                    return
                }

                const {list} = response
                $countTarget.text('(' + util.comma(list.length) + ')')
                table.setData(list)

                //$('#' + id + '__popup' + ' .tabulator-table > div:eq(0)').trigger('click')
            }).catch(error => {
            console.log(error)
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
            osType: $('#osType').val(),
            deviceId: param.deviceId,
            logTm: v.selectedData.logDate,
            pageStartTm: v.selectedData.pageStartTm,
            pageEndTm: v.selectedData.pageEndTm,
            reqUrl: v.selectedData.reqUrl,
            docId: v.selectedData._id,
            logType: v.selectedData.logType
        }

        ajaxCall('/db/0100/getLoadingDetail.maxy', params, {responseHeader: true, disableDimmed: true})
            .then(({data, headers}) => {
                // 가장 마지막으로 선택한 list의 uuid와 response header의 uuid가 다르면 detail 데이터 보여주지 않음
                if (v.uuidList[v.uuidList.length - 1] !== Number(headers.uuid)) {
                    return
                }

                const {logInfo, hasPageLog} = data

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

                const pageType = util.logTypeToPageType(data.logInfo.logType)
                if(pageType[0] === 'webview'){
                    // 웹뷰일때는 waterfall 차트를 보여줌
                    const {
                        resourceInfoData,
                        timingData
                    } = data

                    v.datas = resourceInfoData

                    const waterfall = {
                        'resource': resourceInfoData,
                        'time': timingData
                    }
                    this.drawData(waterfall)
                } else if(pageType[0] === 'native') {
                    // native화면일 경우 event time line을 보여줌
                    const {logInfo} = data
                    if(typeof logInfo === 'undefined' || logInfo.length === 0) return

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
            serverType
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
        } else {
            $('#pUserIdTxt').text('')
            $('#pUserId').hide()
        }
    }

    drawPerformance(data, params) {
        this.webVitalInstance.setData(data, params)
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
}