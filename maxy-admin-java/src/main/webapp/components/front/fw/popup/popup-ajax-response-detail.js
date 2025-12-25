class MaxyFrontPopupFwAjaxResponse {
    constructor(options) {
        this.id = options.id
        this.appendId = options.appendId
        this.type = options.type
        this.from = options.from
        this.to = options.to
        this.logType = options.logType
        this.topChartId = options.topChartId
        this.botChartId = options.botChartId
        this.reqUrl = options.reqUrl

        this.init().then(() => {
            this.addEventListener()
            this.openPopup().then(() => {
                this.drawTable()
                this.initChart()
            })
        })
    }

    async init() {
        const v = this
        const {id, appendId, type, from, to, logType, topChartId, botChartId} = v
        const source = await fetch(
            '/components/front/fw/popup/popup-ajax-response-detail.html')
            .then(response => response.text())

        const template = Handlebars.compile(source)

        const $target = $('#' + appendId)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + appendId
        }
        $target.empty()

        const fromDate = util.timestampToDateTime(from)
        const toDate = util.timestampToDateTime(to)

        const period = fromDate + ' ~ ' + toDate
        $target.append(template({id, type, period, logType, topChartId, botChartId}))

        updateContent()
    }

    drawTable() {
        const v = this
        const tableTarget = '#' + v.id + '_list'

        const columnNames = {
            'time': trl('common.tableColumn.time'),
            'starttime': trl('common.tableColumn.startTime'),
            'status': trl('common.text.status'),
            'statuscode': trl('common.tableColumn.statusCode'),
            'call': trl('common.tableColumn.call')
        }

        v.table = new Tabulator(tableTarget, {
            layout: 'fitDataFill',
            height: '100%',
            placeholder: trl('common.msg.noData'),
            columns: [
                {
                    title: columnNames.time,
                    field: "intervaltime",
                    width: "10%",
                    formatter: cell => {
                        const value = cell.getValue()

                        if (isNaN(value)) {
                            return '-'
                        } else {
                            return popup.dataFormat(value, 'interval')
                        }
                    }
                },
                {
                    title: 'Start Time',
                    field: "logTm",
                    width: "15%",
                    formatter: cell => {
                        const value = cell.getValue()
                        if (value) {
                            return util.timestampToDateTime(value)
                        } else {
                            return '-'
                        }
                    }
                },
                {
                    title: 'User ID',
                    field: "userId",
                    width: "10%",
                    formatter: cell => {
                        const value = cell.getValue()

                        if (!value) {
                            return '-'
                        } else {
                            return value
                        }
                    }
                },
                {
                    title: columnNames.status,
                    field: "statusCode",
                    width: "10%",
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
                    title: columnNames.statuscode,
                    field: "statusCode",
                    width: "13%",
                    formatter: cell => {
                        const value = cell.getValue()
                        if (isNaN(value) || value === '0') {
                            return '-'
                        } else {
                            return value
                        }
                    }
                },
                {
                    title: columnNames.call,
                    field: "reqUrl",
                    width: "41%",
                    formatter: cell => {
                        const value = cell.getValue()

                        if (!value) {
                            return '-'
                        } else {
                            return value
                        }
                    }
                }
            ]
        })

        v.table.on('rowClick', (e, row) => {
            popup.rowClick(e, row, v, (data) => {
                v.getDetailData(data)
            });
        })

        v.table.on('tableBuilt', function () {
            v.getListData()
        })
    }

    initChart() {
        const v = this

        const darkModeYn = sessionStorage.getItem('maxyDarkYn')
        const chartOptions = {
            chart: {
                zoomType: 'x',
                marginBottom: 73
            },
            legend: {
                enabled: false
            },
            xAxis: {
                type: 'datetime',
                dateTimeLabelFormats: {
                    millisecond: '%H:%M:%S',
                    second: '%H:%M:%S',
                    minute: '%H:%M:%S',
                    hour: '%H:%M:%S',
                    day: '%H:%M:%S',
                    week: '%H:%M:%S',
                    month: '%H:%M:%S',
                    year: '%H:%M:%S'
                },
                crosshair: true
            },
            yAxis: [{
                custom: {
                    allowNegativeLog: true // 0이 들어왔을때를 위한 custom
                },
                min: 0,
                labels: {
                    formatter: function () {
                        return util.convertTime(this.value, false, false, false)
                    },
                    style: {
                        color: 'black'
                    }
                },
                title: {
                    text: ''
                },
            }, { // Secondary yAxis
                title: {text: ''}
            }, { // Tertiary yAxis
                title: {text: ''}
            }],
            plotOptions: {
                areaspline: {
                    marker: {
                        enabled: false,
                        states: {
                            hover: {
                                enabled: true
                            }
                        }
                    }
                }
            },
            tooltip: {
                pointFormatter: function () {
                    return `${this.series.name}: <b>${util.convertTime(this.y, false, false, false)}</b><br/>`
                }
            },
            series: [{
                name: 'Response',
                type: 'areaspline',
                color: {
                    linearGradient: {x1: 0, x2: 0, y1: 0, y2: 1},
                    stops: darkModeYn === 'Y' ? hcColors.stock.background.dark : hcColors.stock.background.light
                },
                data: []
            }]
        }

        this.chart = Highcharts.chart(v.botChartId, chartOptions)

        const commonOptions = {
            boost: {
                enabled: true, // 대량 데이터 처리 시 성능 향상
                useGPUTranslations: true
            },
            plotOptions: {
                series: {
                    animation: false, // 모든 애니메이션 비활성화
                    turboThreshold: 0 // 대량 데이터 처리 최적화
                }
            },
            tooltip: {
                enabled: true,
                style: {zIndex: 99999},
                shared: false
            },
        }

        const elapsedTime = trl('common.text.elapsedTime')
        const reqWaitingTime = trl('common.text.reqWaitingTime')
        const downloadTime = trl('common.text.downloadTime')

        // time chart 생성
        this.timeChart = Highcharts.chart(v.botChartId + '__timeChart',
            Highcharts.merge(commonOptions, {
                chart: {
                    type: 'xrange',
                    spacingRight: 20 // 오른쪽 여유 공간 확보
                },
                exporting: {
                    enabled: false
                },
                title: null,
                legend: {
                    enabled: false
                },
                xAxis: [{
                    type: 'datetime',
                    lineWidth: 0,
                    tickLength: 0,
                    labels: {enabled: false},
                    crosshair: {
                        enabled: true,
                        snap: false,
                        zIndex: 4
                    },
                    animation: false
                }],
                tooltip: {
                    headerFormat: '',
                    enabled: true,
                    formatter: function () {
                        let tooltip = `<div class="tooltip_waterfall">`
                        if (this.point) {
                            const duration = util.comma(this.point.x2 - this.point.x) + 'ms'
                            if (this.point.y === 0) {
                                tooltip += `<div>${elapsedTime}: <b>${duration}</b></div>`
                            } else if (this.point.y === 1) {
                                tooltip += `<div>${reqWaitingTime}: <b>${duration}</b></div>`
                            } else if (this.point.y === 2) {
                                tooltip += `<div>${downloadTime}: <b>${duration}</b></div>`
                            }
                            tooltip += `</div>`;
                        }
                        return tooltip;
                    }
                },
                plotOptions: {
                    series: {
                        animation: false,
                        turboThreshold: 0,
                        pointPadding: 0,
                        groupPadding: 0,
                        borderWidth: 0,
                        states: {
                            inactive: {
                                enabled: false  // ✅ 흐려지는 효과 제거!
                            }
                        }
                    }
                },
                series: [
                    {
                        type: 'xrange',
                        borderRadius: 2,
                        minPointLength: 3,
                        data: []
                    }
                ]
            })
        )

        // jennifer data chart 생성
        this.jenniferChart = Highcharts.chart(v.botChartId + '__jenniferChart',
            Highcharts.merge(commonOptions, {
                chart: {
                    type: 'xrange',
                    height: '100%',
                    spacingRight: 20 // 오른쪽 여유 공간 확보
                },
                exporting: {
                    enabled: false
                },
                title: null,
                legend: {
                    enabled: false
                },
                xAxis: [{
                    type: 'datetime',
                    lineWidth: 0,
                    tickLength: 0,
                    labels: {enabled: false},
                    crosshair: {
                        enabled: true,
                        snap: false,
                        zIndex: 4
                    },
                    animation: false
                }],
                tooltip: {
                    enabled: true,
                    formatter: function () {
                        let tooltip = `<div class="tooltip_waterfall">`
                        if (this.point) {
                            const duration = util.comma(this.point.x2 - this.point.x) + 'ms'
                            if (this.point.y === 0) {
                                tooltip += `<div>WAS: <b>${duration}</b></div>`
                            } else if (this.point.y === 1) {
                                tooltip += `<div>Network: <b>${duration}</b></div>`
                            } else if (this.point.y === 2) {
                                tooltip += `<div>SQL Fetch: <b>${duration}</b></div>`
                            } else if (this.point.y === 3) {
                                tooltip += `<div>External: <b>${duration}</b></div>`
                            }
                            tooltip += `</div>`
                        }
                        return tooltip
                    }
                },
                plotOptions: {
                    series: {
                        animation: false,
                        turboThreshold: 0,
                        pointPadding: 0,
                        groupPadding: 0,
                        borderWidth: 0,
                        states: {
                            inactive: {
                                enabled: false  // ✅ 흐려지는 효과 제거!
                            }
                        }
                    }
                },
                series: [
                    {
                        type: 'xrange',
                        borderRadius: 2,
                        minPointLength: 3,
                        data: []
                    }
                ]
            })
        )
    }


    /**
     * 리스트 조회
     */
    getListData() {
        const {
            from,
            to,
            reqUrl
        } = this

        const param =  {
            packageNm: $('#packageNm').val(),
            serverType: $('#packageNm option:checked').data('server-type'),
            from: from,
            to: to
        }

        // 웹 성능분석 - Call Level Performance List 행 클릭 시 reqUrl 넣어주기
        if (reqUrl) {
            param.reqUrl = reqUrl
        }

        ajaxCall('/fw/0000/webperf/network/raw.maxy ', param).then(res => {
            // 테이블에 데이터 설정
            const {data} = res
            this.table.setData(data)

            this.updateSummaryInfo(res)
        })
    }

    getDetailData(data) {
        const v = this

        ajaxCall('/mf/0000/dashboard/network/detail.maxy', {
            packageNm: $('#packageNm').val(),
            serverType: $('#packageNm option:checked').data('server-type'),
            from: v.from,
            to: v.to,
            docId: data.docId,
        }).then(res => {
            const {detail, chartData, jenniferInfo, hasPage} = res

            // btnPageFlow 클릭해서 사용자분석 화면으로 이동 시 필요한 값들임.
            const packageNm = $('#packageNm').val()
            const serverType = $('#packageNm option:checked').data('server-type')
            const deviceId = detail.deviceId
            const logTm = detail.logTm
            const mxPageId = detail.mxPageId

            // ajax response, loading time 팝업에선 사용자 분석 이동할 때 mxPageId 필요.
            this.userFlowParam = {
                packageNm,
                serverType,
                deviceId,
                logTm,
                mxPageId
            }

            const $btnPageFlow =  $('#btnPageFlow')
            if (hasPage) {
                $btnPageFlow.show()
            } else {
                if ($btnPageFlow.is(':visible')) {
                    $btnPageFlow.hide()
                }
            }

            v.setDetailData(detail)
            v.setChartData(chartData, detail, jenniferInfo)
            $('#' + v.id + ' .popup_right_side_wrap').removeClass('hidden').addClass('show')
        })
    }

    addEventListener() {
        const v = this
        $('.dimmed').on('click', () => {
            if ($('.popup_right_side_wrap').hasClass('show')) {
                $('.maxy_popup_gray_bg_wrap.popup_right_side_wrap').removeClass('show').addClass('hidden')
                return
            }
            v.closePopup(v)
        })

        // 공통 유틸리티 사용
        // 두 차트 객체를 배열로 직접 전달
        ChartSyncUtils.setupCrosshairSync(
            [this.timeChart, this.jenniferChart], // 소스 차트 (두 차트 모두 이벤트 소스로 설정)
            () => {
                // 동기화할 차트 배열 반환
                return [this.timeChart, this.jenniferChart];
            }
        )

        // Jennifer 차트 열기 버튼 이벤트
        $('#' + v.botChartId + '__jennifer' + ' #btnJnfOpen').on('click', function () {
            // 제니퍼 차트 영역 펼치기
            const $jenniferChartWrap = $('#' + v.id + '__jenniferChartWrap')
            $jenniferChartWrap.removeClass('collapse').addClass('expand')

            // 알람 메시지 숨기기
            $('#' + v.id + ' .jennifer_alarm_wrap').hide();
        });

        // Jennifer 차트 닫기 버튼 이벤트
        $('#' + this.botChartId + '__jennifer' + ' #btnJnfClose').on('click', function () {
            // 제니퍼 차트 영역 접기
            const $jenniferChartWrap = $('#' + v.id + '__jenniferChartWrap')
            $jenniferChartWrap.removeClass('expand').addClass('collapse')

            // 알람 메시지는 애니메이션이 끝난 후에 보이도록 설정
            setTimeout(function () {
                $('#' + v.id + ' .jennifer_alarm_wrap').show()
            }, 300); // transition 시간과 동일하게 설정
        });

        $('#btnPageFlow').on('click', function () {
            v.getPageFlow()
        })

        tippy('#btnPageFlow', {
            content: trl('common.text.userBehavior'),
            arrow: false,
            placement: 'bottom',
            allowHTML: true,
            theme: 'maxy-tooltip'
        })

        const text = trl('common.msg.resMsgCopy')
        tippy('#resMsg', {
            content: text,
            arrow: false,
            placement: 'bottom',
            allowHTML: true,
            theme: 'maxy-tooltip'
        });

        $('#resMsg').off().on('click', function () {
            util.copy($(this).text())
        })

        const msg = trl('common.msg.targetUrlCopy')
        tippy('#reqUrl', {
            content: msg,
            arrow: false,
            placement: 'bottom',
            allowHTML: true,
            theme: 'maxy-tooltip'
        });

        $('#reqUrl').off().on('click', function () {
            util.copy($(this).text())
        })
    }

    async openPopup() {
        const {id} = this
        $('.dimmed').show()

        const $target = $('#' + id)
        $target.show()
    }

    closePopup(v) {
        const popup = '#' + v.id
        const span = popup + ' span'
        const div = popup + ' div'
        const $dimmed = $('.dimmed')
        const $popup = $(popup)

        //  v.table.clearData()
        //   v.chart.destroy({keepContainer: true})
        $(span).text('')
        $(div).text('')

        $dimmed.off('click')
        $dimmed.hide()
        $popup.hide()

        // 팝업 닫을 때 커서가 보이면 없애주도록
        const $cursor = $('.maxy_cursor_dots')
        if ($cursor.css('display') === 'block') {
            cursor.hide()
        }
    }

    // 상단 요약 정보 업데이트
    updateSummaryInfo(datas) {
        const {avg, data, totalHits} = datas

        const $user = $('#user')
        if (data.length > 0) {
            // Average Loading time
            $('#avg').text(util.comma(Math.round(avg)))
            // 데이터 수
            if (totalHits >= 10000) {
                $user.text(util.comma(totalHits) + '+')
            } else {
                $user.text(util.comma(totalHits))
            }
        } else {
            $('#avg').text('-')
            $user.text('-')
        }
    }

    setDetailData(detail) {
        try {
            const { id } = this

            if (!detail || typeof detail !== 'object') {
                console.warn('setDetailData: detail 데이터가 유효하지 않습니다.', detail)
                return
            }

            const {
                platform,
                osType,
                osVer,
                deviceModel,
                timezone,
                userId,
                ip,
                reqUrl,
                intervaltime,
                logTm,
                requestSize,
                responseSize,
                statusCode,
                webviewVer,
                resMsg,
                logType,
                txid
            } = detail

            const $target = $('#' + id)

            if ($target.length === 0) {
                console.warn(`setDetailData: 대상 ID(${id})를 찾을 수 없습니다.`)
                return
            }

            const startTime = util.timestampToDateTimeMs(logTm - intervaltime)

            const $statusElement = $target.find('.maxy_popup_title_wrap .status')
            $statusElement.removeClass('success error exception')

            const normal = trl('common.text.normal')
            const hasValidStatusCode = statusCode !== null && statusCode !== undefined && statusCode !== ''

            if (statusCode === null || statusCode === undefined) {
                $statusElement.text(normal).addClass('success')
            } else if (statusCode === '0') {
                $statusElement.text('Exception').addClass('exception')
            } else if (statusCode.toString().startsWith('2')) {
                const displayText = hasValidStatusCode ? `${normal} (${statusCode})` : normal
                $statusElement.text(displayText).addClass('success')
            } else {
                const displayText = hasValidStatusCode ? `Error (${statusCode})` : 'Error'
                $statusElement.text(displayText).addClass('error')
            }

            const browser = deviceModel
                ? deviceModel + (webviewVer ? ' ' + webviewVer : '')
                : '-'
            $target.find('#browser').text(browser)
            $target.find('#platform').text(platform || '-')
            $target.find('#os').text(
                (osType && osVer) ? `${osType} ${osVer}` : '-'
            )
            $target.find('#deviceModel').text(deviceModel || '-')
            $target.find('#timezone').text(timezone || '-')
            $target.find('#userId').text(userId || '-')
            $target.find('#ip').text(ip || '-')
            $target.find('#reqUrl').text(reqUrl || '-')
            $target.find('#resMsg').text(resMsg || '-')
            $target.find('#logType').text(getLogTypeGroup(logType) + ' ' + getLogTypeDetail(logType) || '-')
            $target.find('#intervalTime').text(util.comma(intervaltime) + 'ms' || '-')
            $target.find('#startTime').text(startTime || '-')
            $target.find('#endTime').text(util.timestampToDateTimeMs(logTm) || '-')
            $target.find('#reqSize').text(util.convertFileSize(requestSize) || '-')
            $target.find('#resSize').text(util.convertFileSize(responseSize) || '-')
            $target.find('#txid').text(txid || '-')
        } catch (e) {
            console.error('setDetailData 실행 중 오류 발생:', e)
        }
    }

    setChartData(chartData, detail, jenniferInfo) {
        const {chart, avg, count} = chartData
        const {intervaltime} = detail

        if (avg) {
            // 차트에 평균값을 빨간 수평선으로 표시
            if (this.chart && this.chart.yAxis && this.chart.yAxis[0]) {
                // 기존 plotLine 제거 (있다면)
                this.chart.yAxis[0].removePlotLine('avgLine')

                // 새로운 평균선 plotLine 추가
                this.chart.yAxis[0].addPlotLine({
                    id: 'avgLine',
                    value: avg,
                    color: '#EEBEBE', // 빨간색
                    width: 1,
                    zIndex: 5,
                    label: {
                        text: `AVG: ${Math.round(avg)}ms`,
                        align: 'right',
                        style: {
                            color: '#FF6969'
                        },
                        x: -10,
                        y: -5
                    }
                })
            }
        }

        if (count) {
            $('#count').text(util.comma(count))
        }

        if (this.chart) {
            this.chart.series[0].setData(chart)
        }

        if (this.timeChart) {
            this.updateChart(detail)
        }

        if (this.jenniferChart) {
            if (jenniferInfo && Object.keys(jenniferInfo).length > 0) {

                this.updateJenniferChart(jenniferInfo, intervaltime)
            } else {
                // yAxis 항목에 시간 표시를 '-'로 업데이트
                $('#' + this.id + '__jenniferChartWrap .yaxis:eq(0) .duration').text('-')
                $('#' + this.id + '__jenniferChartWrap .yaxis:eq(1) .duration').text('-')
                $('#' + this.id + '__jenniferChartWrap .yaxis:eq(2) .duration').text('-')
                $('#' + this.id + '__jenniferChartWrap .yaxis:eq(3) .duration').text('-')

                // 하이차트에 "데이터 없음" 표시를 위한 빈 객체 전달
                this.updateJenniferChart({
                    responseTime: 0,
                    externalcallTime: 0,
                    sqlTime: 0,
                    fetchTime: 0,
                    noData: true  // 데이터 없음 표시를 위한 플래그
                }, intervaltime)
            }
        }
    }

    updateChart(detail) {
        try {
            // 총 시간이 없으면 기본값 설정
            const total = detail.intervaltime || 0

            // 각 단계별 시간 계산 (더미 데이터)
            const waitingTime = detail.waitTime || 0 // 요청 대기 시간 (30%)
            const downloadTime = detail.downloadTime || 0 // 다운로드 시간 (70%)

            // 시작 시간을 0으로 설정
            const startPoint = 0

            // 각 단계별 시작 및 종료 시간 계산
            const waitingStart = startPoint
            const waitingEnd = waitingStart + waitingTime
            const downloadStart = waitingEnd
            const downloadEnd = downloadStart + downloadTime

            // 행 높이 및 차트 높이 설정
            const rowHeight = 30 // 한 줄당 높이 (px)
            const categories = ['경과 시간', '요청 대기 시간', '다운로드 시간']
            const totalHeight = Math.max(categories.length * rowHeight, 90) // 최소 높이 90px 보장

            // 차트 데이터 생성
            const chartData = [
                // 경과 시간 (전체 시간)
                {
                    x: startPoint,
                    x2: total,  // downloadEnd 대신 total 사용
                    y: 0,
                    color: total - startPoint === 0 ? 'transparent' : '#4285F499'
                },
                // 요청 대기 시간
                {
                    x: waitingStart,
                    x2: waitingEnd,
                    y: 1,
                    color: waitingEnd - waitingStart === 0 ? 'transparent' : '#FBBC0599'
                },
                // 다운로드 시간
                {
                    x: downloadStart,
                    x2: downloadEnd,
                    y: 2,
                    color: downloadEnd - downloadStart === 0 ? 'transparent' : '#34A85399'
                }
            ];

            // 차트 업데이트 옵션
            const chartUpdateOptions = {
                chart: {
                    height: totalHeight,
                    scrollablePlotArea: {
                        minHeight: totalHeight
                    }
                },
                xAxis: {
                    min: 0,
                    max: total
                },
                yAxis: {
                    reversed: true,
                    staticScale: rowHeight, // 고정 높이 설정
                    labels: {enabled: false},
                    categories: categories,
                    gridLineWidth: 1
                },
                plotOptions: {
                    series: {
                        pointWidth: rowHeight - 5, // 행 높이보다 약간 작게 설정
                        grouping: false
                    }
                },
                series: [{
                    data: chartData
                }]
            };

            // 차트 업데이트
            if (this.timeChart) {
                this.timeChart.update(chartUpdateOptions, true, false, false)
            }

            // yAxis 항목에 시간 표시 업데이트
            $('#' + this.botChartId + '__time' + ' .yaxis:eq(0) .duration').text(util.comma(total) + 'ms')
            $('#' + this.botChartId + '__time' + ' .yaxis:eq(1) .duration').text(util.comma(waitingTime) + 'ms')
            $('#' + this.botChartId + '__time' + ' .yaxis:eq(2) .duration').text(util.comma(downloadTime) + 'ms')
        } catch (e) {
            console.log(e)
        }
    }

    updateJenniferChart(data, intervaltime, isDummyYn) {
        try {
            // 데이터가 없는 경우 "데이터 없음" 메시지 표시
            if (data.noData) {
                // 차트 업데이트 옵션 - 데이터 없음 표시
                const noDataOptions = {
                    chart: {
                        height: 120,
                        scrollablePlotArea: {
                            minHeight: 120
                        }
                    },
                    series: [{
                        data: []  // 빈 데이터 배열
                    }]
                }

                // 차트 업데이트
                if (this.jenniferChart) {
                    this.jenniferChart.update(noDataOptions, true, false, false)
                }

                return  // 여기서 함수 종료
            }

            // 데이터 객체에서 필요한 값 추출
            const totalTime = intervaltime || 1000

            const jenniferResponseTime = data.responseTime || 0
            const externalTime = data.externalcallTime || 0
            const sqlTime = data.sqlTime || 0
            const fetchTime = data.fetchTime || 0

            let txid
            if (data.txid) {
                txid = data.txid
            } else if (data.jtxid) {
                txid = data.jtxid
            } else {
                txid = '-'
            }

            // jennifer.js 참고하여 계산
            const sqlFetchTime = Math.max(0, sqlTime + fetchTime)
            const networkTime = Math.max(0, totalTime - jenniferResponseTime)
            const wasTime = Math.max(0, totalTime - (networkTime + externalTime + sqlFetchTime))

            // 시작 시간을 0으로 설정
            const startPoint = 0

            // 각 단계별 시작 및 종료 시간 계산
            let currentPosition = startPoint

            // WAS 시간
            const wasStart = currentPosition
            const wasEnd = wasStart + wasTime
            currentPosition = wasEnd

            // Network 시간
            const networkStart = currentPosition
            const networkEnd = networkStart + networkTime
            currentPosition = networkEnd

            // SQL Fetch 시간
            const sqlFetchStart = currentPosition
            const sqlFetchEnd = sqlFetchStart + sqlFetchTime
            currentPosition = sqlFetchEnd

            // External 시간
            const externalStart = currentPosition
            const externalEnd = externalStart + externalTime

            // 행 높이 및 차트 높이 설정
            const rowHeight = 30 // 한 줄당 높이 (px)
            // 전체 시간 카테고리 제거
            const categories = ['WAS 시간', 'Network 시간', 'SQL Fetch 시간', 'External 시간']
            const totalHeight = Math.max(categories.length * rowHeight, 120) // 최소 높이 조정

            // 차트 데이터 생성 - 전체 시간 항목 제거
            const chartData = [
                // WAS 시간
                {
                    x: wasStart,
                    x2: wasEnd,
                    y: 0, // y 값 조정 (0부터 시작)
                    color: wasTime === 0 ? 'rgba(154, 170, 216, 0.1)' : '#9587ff99' // 0ms일 경우 투명하게 설정
                },
                // Network 시간
                {
                    x: networkStart,
                    x2: networkEnd,
                    y: 1, // y 값 조정
                    color: networkTime === 0 ? 'rgba(255, 211, 132, 0.1)' : '#4FCFA099' // 0ms일 경우 투명하게 설정
                },
                // SQL Fetch 시간
                {
                    x: sqlFetchStart,
                    x2: sqlFetchEnd,
                    y: 2, // y 값 조정
                    color: sqlFetchTime === 0 ? 'rgba(171, 133, 212, 0.1)' : '#FFD74A99' // 0ms일 경우 투명하게 설정
                },
                // External 시간
                {
                    x: externalStart,
                    x2: externalEnd,
                    y: 3, // y 값 조정
                    color: externalTime === 0 ? 'rgba(179, 207, 149, 0.1)' : '#DFDCFF99' // 0ms일 경우 투명하게 설정
                },
            ];

            // 차트 업데이트 옵션
            const chartUpdateOptions = {
                chart: {
                    height: totalHeight,
                    scrollablePlotArea: {
                        minHeight: totalHeight
                    }
                },
                xAxis: {
                    min: 0,
                    max: totalTime
                },
                yAxis: {
                    reversed: true,
                    staticScale: rowHeight, // 고정 높이 설정
                    labels: {enabled: false},
                    categories: categories,
                    gridLineWidth: 1
                },
                plotOptions: {
                    series: {
                        pointWidth: rowHeight - 5, // 행 높이보다 약간 작게 설정
                        grouping: false
                    }
                },
                series: [{
                    data: chartData
                }]
            };

            // 차트 업데이트
            if (this.jenniferChart) {
                this.jenniferChart.update(chartUpdateOptions, true, false, false)
            }

            if (isDummyYn) {
                $('#' + this.id + '__jenniferChartWrap' + ' #txid').text(txid || '-')
            }
            // yAxis 항목에 시간 표시 업데이트 - 전체 시간 항목 제거
            $('#' + this.id + '__jenniferChartWrap' + ' .yaxis:eq(0) .duration').text(util.comma(wasTime) + 'ms')
            $('#' + this.id + '__jenniferChartWrap' + ' .yaxis:eq(1) .duration').text(util.comma(networkTime) + 'ms')
            $('#' + this.id + '__jenniferChartWrap' + ' .yaxis:eq(2) .duration').text(util.comma(sqlFetchTime) + 'ms')
            $('#' + this.id + '__jenniferChartWrap' + ' .yaxis:eq(3) .duration').text(util.comma(externalTime) + 'ms')
        } catch (e) {
            console.log(e)
        }
    }

    getPageFlow() {
        const {userFlowParam} = this

        sessionStorage.setItem('userAnalysisPopupParams', JSON.stringify(userFlowParam))

        const targetUrl = '/fu/0000/view.maxy?popup=true'
        window.open(targetUrl, '_blank')
    }
}