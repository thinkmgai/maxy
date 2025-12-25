/*
    종합 분석 > PV Equalizer 팝업
    로그 분석 > PV > 팝업
 */
class MaxyPopUpPvList {
    constructor(options) {
        this.appendId = options.appendId
        this.id = options.id
        this.title = options.title
        this.param = options.param
        this.selectedRow = null
        this.popupType = options.popupType
        this.isDashboard = options.isDashboard
        this.from = null
        this.to = null

        this.init().then(() => {
            this.addEventListener()
            this.openPopup().then(() => {
                if (this.param.data) {
                    const view = this.param.data.view ? util.comma(this.param.data.view) : 0
                    const viewer = this.param.data.viewer ? util.comma(this.param.data.viewer) : 0
                    $('#pPageView').text(': ' + view)
                    $('#pViewer').text(': ' + viewer)

                }
            })
        })
    }

    addEventListener() {
        const v = this
        v.offsetIndex = 0
        v.lastTime = []
        v.lastId = []

        $('.dimmed').on('click', () => {
            v.closePopup(v)
        })

        tippy('#btnPageFlow', {
            content: i18next.tns('common.text.userBehavior'),
            arrow: false,
            placement: 'bottom',
            allowHTML: true,
            theme: 'maxy-tooltip'
        })

        $('#btnPageFlow').on('click', function () {
            v.getUserFlow()
        })

        $('.btn_move_page').on('click', function () {
            v.btnType = $(this)[0].dataset.t
            v.getLogTableData()
            v.selectedRow = null
        })

        // Page Alias 버튼 클릭시
        $('#' + v.id + '__popup .btn_alias').on('click', function () {
            const reqUrl = v.param.data.reqUrl

            // 변경전 alias
            const oldAlias = getPageList(sessionStorage.getItem('packageNm'), sessionStorage.getItem('serverType'), reqUrl)

            alias.show({
                reqUrl: reqUrl,
                cb: function () {
                    v.cbAliasUpdate(v, reqUrl, oldAlias)
                }
            })
        })

        this.setTooltip()
    }

    async init() {
        const v = this
        const {id, param, appendId, popupType} = this
        const source = await fetch(
            '/components/cmm/popup-pv-list.html')
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
        const reqUrl = param.data.reqUrl
        const pageNm = getPageList(packageNm, serverType, reqUrl, true)

        // reqUrl과 매핑된 페이지명이 같으면 pageNm칸 제거
        if (pageNm === '') {
            $('#title').remove()
            $target.append(template({id, reqUrl, popupType}))
        } else {
            $target.append(template({id, reqUrl, pageNm, popupType}))
        }

        updateContent()
        const columnNames = {
            "time": i18next.tns('common.tableColumn.time'),
            "deviceId": i18next.tns('common.tableColumn.deviceId'),
            "userId": i18next.tns('common.text.userId'),
            "stayTime": i18next.tns('dashboard.bi.stayTimeEng'),
            "loadingTime": i18next.tns('common.tableColumn.loadingtime'),
        }

        const tableTarget = '#' + id + '__logList'
        this.table = new Tabulator(tableTarget, {
            layout: 'fitDataFill',
            placeholder: i18next.tns('common.msg.noData'),
            columns: [
                {
                    title: columnNames.time,
                    field: "logDate",
                    hozAlign: "left",
                    width: "15%",
                    formatter: util.timestampToDateTimeMs
                },
                {
                    title: columnNames.deviceId,
                    field: "deviceId",
                    hozAlign: "left",
                    width: "30%"
                },
                {
                    title: columnNames.userId,
                    field: "userId",
                    hozAlign: "left",
                    width: "17%",
                    formatter: idDisplay.getId
                },
                {
                    title: columnNames.stayTime,
                    field: "intervaltime",
                    hozAlign: "left",
                    width: "19%",
                    formatter: cell => {
                        return util.convertTime(Math.floor(cell.getValue()))
                    }
                },
                {
                    title: columnNames.loadingTime,
                    field: "loadingTime",
                    hozAlign: "left",
                    width: "18%",
                    formatter: cell => {
                        return util.convertTime(Math.floor(cell.getValue()))
                    }
                },
            ],
        });

        this.table.on('rowClick', (e, row) => {
            if (this.selectedRow && typeof this.selectedRow.getElement().classList !== 'undefined') {
                this.selectedRow.getElement().classList.remove('selected_row')
            }
            row.getElement().classList.add('selected_row')
            this.selectedRow = row
            this.rowData = row.getData()
            this.existsPageLog(this.rowData)
            this.setDetailData(this.rowData)
        })

        this.chart = Highcharts.chart(id + '__logChart', {
            instance: this, // CoreVital 인스턴스 참조 추가
            chart: {
                zoomType: 'x',
                events: {
                    selection: function (event) {
                        // 페이징 처리값 초기화
                        v.lastTime = []
                        v.lastId = []
                        v.offsetIndex = 0

                        v.from = Math.round(event.xAxis[0].min)
                        v.to = Math.round(event.xAxis[0].max)

                        v.getLogTableData()

                        return false // 선택 이벤트를 방지하려면 false를 반환합니다.
                    }
                }
            },
            xAxis: [{
                type: 'datetime',
                labels: {
                    formatter: function () {
                        return Highcharts.dateFormat('%H:%M', this.value);
                    }
                },
                crosshair: true
            }],
            yAxis: [{
                labels: {
                    formatter: function () {
                        if (this.value < 1000) return this.value + 'ms'
                        else return this.value / 1000 + 's'
                    }
                },
                title: {
                    text: 'Stay Time'
                },
            }, {
                labels: {
                    formatter: function () {
                        if (this.value < 1000) return this.value + 'ms'
                        else return this.value / 1000 + 's'
                    }
                },
                title: {
                    text: 'Loading Time'
                },
                opposite: true // 두 번째 yAxis를 오른쪽에 배치
            }],
            tooltip: {
                useHTML: true, // HTML을 사용하여 툴팁을 렌더링
                shared: true,
                formatter: function () {
                    const stayTime = (this.points[0].y < 1000) ? this.points[0].y + 'ms' : this.points[0].y / 1000 + 's'
                    const loadingTime = (this.points[1].y < 1000) ? this.points[1].y + 'ms' : this.points[1].y / 1000 + 's'

                    let tooltip = `
                            <span class="tooltip_title">
                                ${util.timestampToDate(this.x)} ${util.timestampToHourMin(this.x, 'HH:mm')}
                            </span><br/><br/>
                        `;

                    tooltip += `
                            <span class="tooltip-circle" style="background-color: ${this.points[0].color}"></span>
                            <span class="tooltip_content">Stay Time: <b>${stayTime}</b></span><br/>
                            <span class="tooltip-circle" style="background-color: ${this.points[1].color}"></span>
                            <span class="tooltip_content">Loading Time: <b>${loadingTime}</b></span>
                        `;
                    return tooltip;
                }
            },
            boost: {
                useGPUTranslations: true,
                usePreAllocated: true
            },
            plotOptions: {
                series: {
                    animation: false,
                    crisp: false,
                },
            },
            series: [{
                name: 'Stay Time',
                yAxis: 0 // 첫 번째 yAxis 사용
            }, {
                name: 'Loading Time',
                yAxis: 1 // 두 번째 yAxis 사용
            }]
        })
    }

    getLogChart() {
        const v = this;
        const {param} = this

        const params = {
            packageNm: $('#packageNm').val(),
            serverType: $('#packageNm option:checked').data('server-type'),
            osType: $('#osType').val(),
            appVer: !param.appVer ? 'A' : param.appVer,
            reqUrl: param.data.reqUrl,
            searchType: param.searchType,
            searchValue: param.searchValue
        }

        // pv equalizer에서 팝업 여는 경우
        if (param.data.dateType) {
            params.from = util.dateToTimestamp(util.getDate(0), true) // 오늘날짜 0시
            params.to = Date.now()
            // 그 외의 경우
        } else {
            params.from = param.from
            params.to = param.to
        }

        v.from = params.from
        v.to = params.to

        ajaxCall('/db/0100/getPageViewerChartByReqUrl.maxy', params, {disableDimmed: true})
            .then(data => {
                this.chart.series[0].setData((data.intervaltime || []))
                this.chart.series[1].setData((data.loadingTime || []))

                // 페이징 처리값 초기화
                v.lastTime = []
                v.lastId = []
                v.offsetIndex = 0

                this.getLogTableData()
            }).catch((e) => {
            console.log(e)
        })
    }

    getLogTableData() {
        const v = this;
        const {param} = this

        const params = {
            packageNm: $('#packageNm').val(),
            serverType: $('#packageNm option:checked').data('server-type'),
            osType: $('#osType').val(),
            appVer: !param.appVer ? 'A' : param.appVer,
            reqUrl: param.data.reqUrl,
            from: v.from,
            to: v.to,
            searchType: param.searchType,
            searchValue: param.searchValue
        }

        if (v.btnType === "common.btn.next") {
            v.offsetIndex++
            params.lastLogTm = v.lastTime[v.lastTime.length - 1]
            params.lastDeviceId = v.lastId[v.lastId.length - 1]

            v.btnType = ''
        } else if (v.btnType === "common.btn.prev") {
            v.offsetIndex--
            v.lastTime.pop()
            v.lastId.pop()
            v.lastTime.pop()
            v.lastId.pop()
            params.lastLogTm = v.lastTime[v.lastTime.length - 1]
            params.lastDeviceId = v.lastId[v.lastId.length - 1]

            v.btnType = ''
        }

        ajaxCall('/db/0100/getPageViewerListByReqUrl.maxy', params, {disableDimmed: true})
            .then(data => {
                const logList = data.list
                const $listCountTarget = $('#' + v.id + '__popup' + ' #count')
                if (logList.length === 0) {
                    $listCountTarget.text('(0)')
                    this.table.setData([])

                    const $btnPageFlow = $('#btnPageFlow')
                    $btnPageFlow.hide()

                    $('#btnLoadData').attr('disabled', true);
                    $('#btnLoadDatas').attr('disabled', true);

                    // 데이터가 없을 경우 빈 객체로 setDetailData 호출하여 초기화
                    this.setDetailData({})
                    return
                }

                $listCountTarget.text('(' + util.comma(logList.length) + (logList.length >= 500 ? '+' : '') + ')')

                v.lastTime.push(logList[logList.length - 1].logDate)
                v.lastId.push(logList[logList.length - 1].deviceId)

                if (logList.length < 500) {
                    $('#btnLoadDatas').attr('disabled', true);
                } else {
                    $('#btnLoadDatas').attr('disabled', false);
                }

                if (v.offsetIndex === 0) {
                    $('#btnLoadData').attr('disabled', true);
                } else {
                    $('#btnLoadData').attr('disabled', false);
                }

                this.table.setData(logList)

                // 첫 행 강제 클릭되게
                $("#" + v.id + "__popup" + " .tabulator-table > div:eq(0)").trigger('click')
            }).catch((e) => {
            console.log(e)
        })
    }

    existsPageLog(row) {
        const params = {
            'packageNm': $('#packageNm').val(),
            'serverType': $('#packageNm option:checked').data('server-type'),
            'osType': $('#osType').val(),
            'deviceId': row.deviceId,
            'logTm': row.logDate
        }
        ajaxCall('/db/0100/existsPageLog.maxy', params, {disableDimmed: true})
            .then(data => {
                const {hasPageLog} = data
                const $btnPageFlow = $('#btnPageFlow')
                if (hasPageLog) {
                    $btnPageFlow.show()
                } else {
                    $btnPageFlow.hide()
                }
            }).catch((e) => {
            console.log(e)
        })
    }

    // 리스트 행 클릭 시 나오는 상세 데이터 넣기
    setDetailData(data) {
        const v = this
        // 03/04 - clientNm 필요 !!!
        const {
            deviceModel = '-',
            deviceId = '-',
            osType = '-',
            osVer = '-',
            avgStorageUsage = 0,
            comType = '-',
            avgCpuUsage = 0,
            avgComSensitivity = 0,
            avgMemUsage = 0,
            appVer = '-',
            birthDay = '-',
            userNm = '-',
            userId = '-',
            clientNm = '-',
            clientNo = '-'
        } = data

        let pMemUsage = !avgMemUsage ? 0 : avgMemUsage
        let pStorageUsage = !avgStorageUsage ? 0 : avgStorageUsage

        const tmpOsType = osType.toLowerCase()
        if (tmpOsType === "ios" || tmpOsType === 'mac') {
            $('#iconOsVer').attr('class', 'icon_os ios')
        } else {
            $('#iconOsVer').attr('class', 'icon_os android')
        }

        // userId 있는 경우만 툴팁 표시
        if (!util.isEmpty(userId) && userId !== '-') {
            $('#userId').css('display', 'flex')
            $('#logInfo__userId').text(userId)

            const userInfo = (util.isEmpty(clientNm) ? '-' : clientNm) +
                ' / ' + (util.isEmpty(userNm) ? '-' : userNm) +
                ' / ' + (util.isEmpty(userId) ? '-' : userId) +
                ' / ' + (util.isEmpty(birthDay) ? '-' : birthDay)

            if (v.userInfoTooltip) {
                v.userInfoTooltip[0].setContent(userInfo)
            } else {
                v.userInfoTooltip = tippy('#userId', {
                    content: userInfo,
                    arrow: false,
                    placement: 'bottom',
                    allowHTML: true,
                    theme: 'maxy-tooltip'
                })
            }
        } else if (!util.isEmpty(clientNo) && clientNo !== '-') {
            // userId가 없거나 -인데, clientNo가 있고 -가 아닌 경우
            $('#userId').css('display', 'flex')
            $('#logInfo__userId').text(clientNo)

            const userInfo = (util.isEmpty(clientNm) ? '-' : clientNm) +
                ' / ' + (util.isEmpty(userNm) ? '-' : userNm) +
                ' / ' + (util.isEmpty(clientNo) ? '-' : clientNo) +
                ' / ' + (util.isEmpty(birthDay) ? '-' : birthDay)

            if (v.userInfoTooltip) {
                v.userInfoTooltip[0].setContent(userInfo)
            } else {
                v.userInfoTooltip = tippy('#userId', {
                    content: userInfo,
                    arrow: false,
                    placement: 'bottom',
                    allowHTML: true,
                    theme: 'maxy-tooltip'
                })
            }
        } else {
            $('#logInfo__userId').text('')
            $('#userId').hide()
        }

        // device id 복사용
        const $deviceModel = $('#deviceModel')
        $deviceModel.off('click')
        $deviceModel.on('click', () => {
            util.copy(deviceId)
        })
        $('#logInfo__deviceModel').text(getDeviceModel(deviceModel))
        $('#logInfo__appVer').text(appVer)
        $('#logInfo__osVer').text(osVer)
        $('#logInfo__comType').text(util.convertComType(comType))
        $('#logInfo__memUsage').text(util.convertMem('kb', pMemUsage))
        $('#logInfo__cpuUsage').text(avgCpuUsage + '%')

        if (avgMemUsage === 0 && avgStorageUsage === 0) {
            util.setTablePct('-', '-')
        } else {
            util.setTablePct(util.convertMem('kb', avgMemUsage), util.convertMem('mb', avgStorageUsage))
        }

        if (avgComSensitivity === 0) {
            const $networkStatus = $('.network_status')
            $networkStatus.removeClass().addClass('network_status')
            $('#logInfo__comSensitivity').text('-')
        } else {
            this.comSensitivityFormat(avgComSensitivity)
        }
    }

    comSensitivityFormat(val) {
        const comSensitivityFormatArr = util.convertComSensitivity(val)
        const $networkStatus = $('.network_status')

        $networkStatus.removeClass().addClass('network_status')
        $networkStatus.addClass(comSensitivityFormatArr[1])

        $('#logInfo__comSensitivity').text(comSensitivityFormatArr[0])
    }

    // 팝업 열기 함수
    async openPopup() {
        const {id} = this
        $('.dimmed').show()

        const $target = $('#' + id + '__popup')
        $target.show()

        await util.sleep(200)

        this.getLogChart()
    }

    // 팝업 닫기 함수
    closePopup(v) {
        const popup = '#' + v.id + '__popup'
        const span = popup + ' span'
        const $dimmed = $('.dimmed')

        v.table.clearData()
        $(span).text('')
        v.offsetIndex = 0
        v.lastTime = []
        v.lastId = []
        v.btnType = ''

        util.removeMaxyCursor()
        $dimmed.off('click')
        $dimmed.hide()
        $(popup).hide()
    }

    getUserFlow() {
        const {rowData} = this
        const packageNm = $('#packageNm').val()
        const serverType = $('#packageNm option:checked').data('server-type')
        const deviceId = rowData.deviceId
        const logTm = rowData.logDate

        const params = {
            deviceId,
            packageNm,
            serverType,
            logTm
        }

        sessionStorage.setItem('ua0400Params', JSON.stringify(params))
        // 사용자 행동분석 버튼을 눌러 사용자 분석 화면으로 이동할 떄는 새창으로 열도록 변경
        const targetUrl = '/ua/0000/goMenuUserAnalysisView.maxy'
        //  const targetUrl = '/ua/0000/goUserAnalysisView.maxy'
        window.open(targetUrl, '_blank')
    }

    setTooltip() {
        const tooltipTxt = [
            i18next.tns('common.msg.deviceIdCopy'),
            i18next.tns('common.text.appVersion'),
            i18next.tns('common.text.osVersion'),
            i18next.tns('common.text.networkPerform'),
            i18next.tns('common.text.cpuUsage'),
            i18next.tns('common.text.memoryUsage'),
        ]

        $('.device_info_wrap .device_info').not(':last-child').each(function (idx) {
            const id = $(this).attr('id')
            tippy('#' + id, {
                content: tooltipTxt[idx],
                arrow: false,
                placement: 'bottom',
                allowHTML: true,
                theme: 'maxy-tooltip'
            })
        })
    }

    cbAliasUpdate(v, reqUrl, oldAlias) {
        const newAlias = getPageList(sessionStorage.getItem('packageNm'), sessionStorage.getItem('serverType'), reqUrl, true);

        // 팝업 타이틀 변경
        const $popup = $(`#${v.id}__popup`);
        $popup.find('#title').text(newAlias)
        $popup.find('#reqUrl').text(reqUrl)

        const $pAliasValue = $popup.find('#title')
        if ($pAliasValue.css('display') === 'none') {
            $pAliasValue.show()
        }
        if (!newAlias) {
            $pAliasValue.hide()
        } else {
            $popup.find('#title').text(newAlias)
        }
        $popup.find('#reqUrl').text(reqUrl)

        if (v.isDashboard) {
            // 종합분석 > PV equalizer
            $('.page_view_equalizer_wrap').each(function (idx, element) {
                const $title = $(this).find('.title');
                const $tippyTarget = $(this).find('.pb_stack_wrap');

                if ($title.text() === oldAlias) {
                    $title.text(newAlias)

                    // 툴팁 재생성
                    if ($tippyTarget[0] && $tippyTarget[0]._tippy) {
                        // 기존 인스턴스 제거
                        $tippyTarget[0]._tippy.destroy();
                        $tippyTarget[0]._tippy = null; // 명시적으로 null 할당
                    }

                    // 툴팁 내용 설정
                    const reqUrl = $tippyTarget.data('req-url');
                    const value = $tippyTarget.data('value');
                    const userCount = $tippyTarget.data('user-count');
                    const avg = (value === 0 || userCount === 0) ? 0 : Math.floor(value / userCount);

                    // 툴팁 내용 생성
                    const userText = i18next.tns('dashboard.bi.userTooltip');
                    const avgText = i18next.tns('dashboard.bi.avgTooltip');
                    const tooltipContent = `${newAlias}<br>${userText}: <b>${util.comma(userCount)}</b><br>${avgText}: <b>${avg}</b>`;

                    // 새로운 tippy 인스턴스 생성
                    tippy($tippyTarget[0], {
                        content: tooltipContent,
                        placement: 'bottom',
                        allowHTML: true,
                        arrow: false,
                        theme: 'maxy-tooltip',
                        followCursor: true
                    })
                }
            })
        } else {
            // 로그분석 > PV 테이블 > Page Name 항목을 바꾼 alias명으로 변경
            const $selectedRow = $('#logTable .tabulator-row.tabulator-selected')
            const $flexCenter = $selectedRow.children('div').eq(1).find('.flex_center')

            // 지정된 alias가 없을 경우
            if (newAlias === '') {
                const $targetDiv = $selectedRow.children('div').eq(1)
                $targetDiv.html('-')
                return
            }

            if ($flexCenter.length > 0) {
                // $flexCenter가 존재하는 경우 (기존 로직)
                // 텍스트 노드만 바꾸기 (btn_copy는 그대로 유지)
                $flexCenter.contents().filter(function () {
                    return this.nodeType === 3; // 텍스트 노드
                }).first().replaceWith(newAlias + ' ')

                // 버튼 data-str 속성 변경
                $flexCenter.find('.btn_copy').attr('data-str', newAlias)

                $flexCenter.find('.btn_copy').off('click')
                $flexCenter.find('.btn_copy').on('click', function (e) {
                    e.stopPropagation()
                    e.preventDefault()
                    util.copy(e.currentTarget.dataset.str)
                })
            } else {
                // $flexCenter가 존재하지 않는 경우
                // $selectedRow의 eq(1)의 div에 btn_copy 추가
                const $targetDiv = $selectedRow.children('div').eq(1)

                // 기존 내용을 newAlias로 변경하고 btn_copy 버튼 추가
                $targetDiv.html(`<button class="btn_copy" data-str="${newAlias}"></button>${newAlias}`)

                $targetDiv.find('.btn_copy').on('click', function (e) {
                    e.stopPropagation()
                    e.preventDefault()
                    util.copy($(e.target).data('str'))
                })
            }
        }
    }

}