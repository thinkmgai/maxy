class MaxyFrontPopupPageDetail {
    constructor(options) {
        this.id = options.id
        this.appendId = options.appendId
        this.deviceId = options.deviceId
        this.feeldex = options.feeldex
        this.topChartId = options.topChartId
        this.botChartId = options.botChartId
        this.appStartTm = options.appStartTm // 세션리플레이 조회시 사용
        this.param = options.param

        this.init().then(() => {
            this.openPopup().then(() => {
                this.initTable()
                this.initChart()

                // 인스턴스는 하나만 생성
                this.webVitalInstance = new MaxyWebVital({
                    opts: [{
                        id: this.id + '__webVital',
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
            })

            this.addEventListener()
        })
    }

    async init() {
        const v = this
        const {id, appendId, popupType, topChartId, botChartId} = v
        const source = await fetch(
            '/components/front/ua/popup/popup-page-detail.html')
            .then(response => response.text())

        const template = Handlebars.compile(source)

        const $target = $('#' + appendId)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + appendId
        }
        $target.empty()

        $target.append(template({id, topChartId, botChartId}))

        updateContent()

        // 초기화 시 기본적으로 stack 탭만 보이게 설정
        this.initDefaultTab()
    }

    initTable() {
        const v = this

        v.historyTable = new Tabulator('#historyList', {
            layout: 'fitDataFill',
            width: '100%',
            height: '100%',
            placeholder: trl('common.msg.noData'),
            initialSort: [
                {
                    column: "logTm", dir: "desc"
                }
            ],
            rowFormatter: function (row) {
                const data = row.getData();
                if([131076, 131077, 4194306, 8388614, 8388613, 524292].includes(data.logType)) {
                    row.getElement().style.color = 'red';
                }
            },
            columns: [
                {
                    title: 'Access Time',
                    field: "logTm",
                    width: "20%",
                    formatter: util.timestampToDateTime
                },
                {
                    title: 'Duration',
                    field: "intervaltime",
                    width: "15%",
                    formatter: cell => {
                        const value = cell.getValue()
                        if (isNaN(value)) {
                            return '-'
                        } else {
                            return cell.getValue().toLocaleString() + 'ms'
                        }
                    }
                },
                {
                    title: 'Action',
                    field: "logType",
                    width: "20%",
                    formatter: cell => {
                        return getLogTypeDetail(cell.getValue())
                    }
                },
                {
                    title: 'Target',
                    field: "reqUrl",
                    width: "45%"
                },
            ]
        })
    }

    initChart() {
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
                name: 'Loading Time',
                type: 'areaspline',
                color: {
                    linearGradient: {x1: 0, x2: 0, y1: 0, y2: 1},
                    stops: darkModeYn === 'Y' ? hcColors.stock.background.dark : hcColors.stock.background.light
                },
                data: []
            }]
        }

        this.chart = Highcharts.chart('performanceChart', chartOptions)
    }

    getDetailData(data) {
        const v = this

        ajaxCall('/mf/0000/dashboard/page/detail.maxy', {
            packageNm: $('#packageNm').val(),
            serverType: $('#packageNm option:checked').data('server-type'),
            from: data.logTm,
            to: data.logTm,
            docId: data.docId
        }).then(data => {
            // 둘 다 있을 때만 우측 팝업 열림
            if (data.detail && data.resources) {
                const param = {
                    pageStartTm : from
                }
                const {detail, resources} = data

                const $target = $('#' + v.id + ' .popup_right_side_wrap')
                $target.find('#reqUrl').text(detail.reqUrl)

                const {resourceInfoData, timingData} = resources

                if (resourceInfoData.length === 0) {
                    toast('분석을 위한 정보가 수집되지 않은 케이스 입니다.')
                    return
                }

                v.datas = resourceInfoData

                const waterfall = {
                    'resource': resourceInfoData,
                    'time': timingData
                }

                v.drawPerformance(resources, param)
                v.drawData(waterfall)

                $target.removeClass('hidden').addClass('show')
            } else {
                toast('분석을 위한 정보가 수집되지 않은 케이스 입니다.')
            }
        })
    }

    drawPerformance(data, params) {
        // this.webVitalInstance.draw(data, params)
        this.webVitalInstance.setData(data, params)
    }

    drawData(data) {
        const v = this
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

    initDefaultTab() {
        // 모든 content div 숨기기
        $('.content_wrap.history, .content_wrap.performance').hide()

        // stack div만 보이게 하기
        $('.content_wrap.performance').show()

        // stack 탭에 selected 클래스 추가 (HTML에서 이미 설정되어 있지만 확실히 하기 위해)
        $('.tab[data-type="performance"]').addClass('selected')
        $('.tab[data-type="history"]').removeClass('selected')
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

        $('.tab').on('click', (e) => {
            v.toggleTab(e)
        })

        $('#btnUserAnalytics').on('click', () => {
            v.getUserFlow()
        })

        $('#btnPageDetail').on('click', () => {
            if (v.pageInfo.wtfFlag === 'N') {
                toast('분석을 위한 정보가 수집되지 않은 케이스 입니다.')
                return
            }
            v.getPageDetail()
        })

        $('#btnSessionReplay').on('click', () => {
            const v = this

            if (!v.pageInfo.maxySessionId || !v.pageInfo.pageStartTm) {
                toast(trl('alert.noSessionData'))
                return
            }

            // 세션 재생 팝업 생성 및 열기
            v.sessionReplayPopup = new MaxySessionReplayPopup({
                appendId: 'maxySessionReplayPopupWrap',
                id: 'mySessionReplay',
                param: {
                    sessionId: v.pageInfo.maxySessionId,
                    //sessionStartTm: v.appStartTm,
                    playStartTm: v.pageInfo.pageStartTm,
                }
            })
        })


        const msg = trl('common.msg.reqUrlCopy')
        tippy('#pageUrl', {
            content: msg,
            arrow: false,
            placement: 'bottom',
            allowHTML: true,
            theme: 'maxy-tooltip'
        });

        $('#pageUrl').off().on('click', function () {
            util.copy($(this).text())
        })
    }

    getUserFlow() {
        const packageNm = $('#packageNm').val()
        const serverType = $('#packageNm option:checked').data('server-type')
        const deviceId = this.deviceId
        const logTm = this.parentLogDate

        const params = {
            packageNm: packageNm,
            serverType: serverType,
            logTm: logTm,
            deviceId: deviceId,
        }

        sessionStorage.setItem('userAnalysisPopupParams', JSON.stringify(params))

        const targetUrl = '/fu/0000/view.maxy?popup=true'
        window.open(targetUrl, '_blank')
    }

    toggleTab(e) {
        const v = this
        const $clickedTab = $(e.target)
        const type = $clickedTab.data('type')

        $('.tab').removeClass('selected')
        $clickedTab.addClass('selected')

        // 모든 탭 내용 숨기기
        $('.history_wrap .content_wrap').hide()

        // 선택된 탭 표시
        const $targetContent = $('.content_wrap.' + type)
        $targetContent.show()

        // DOM이 완전히 렌더링된 다음 redraw 호출 (중요)
       if (type === 'history' && v.historyTable) {
            v.historyTable.redraw(true)
        }
    }

    async openPopup() {
        const {id} = this
        const $target = $('#' + id)

        // 팝업이 이미 열려있으면 중복 실행 방지
        if ($target.is(':visible')) {
            return;
        }

        $('.dimmed').show()

        $target.show()

        this.getUserDetail()
    }

    getUserDetail() {
        const {param} = this

        const {from, to, packageNm, serverType, docId} = param
        ajaxCall('/fu/0000/page.maxy', {
            'packageNm': packageNm,
            'serverType': serverType,
            'docId': docId,
            'from': from,
            'to': to
        }).then(data => {
            this.setDetailData(data)
        })
    }

    setDetailData(data) {
        const {id} = this
        const v = this

        const $target = $('#' + id)

        if ($target.length === 0) {
            console.warn(`setDetailData: 대상 ID(${id})를 찾을 수 없습니다.`)
            return
        }

        const {pageInfo, chartData, events} = data

        v.pageInfo = pageInfo

        let {
            webviewVer,
            platform,
            osType,
            osVer,
            deviceModel,
            timezone,
            userId,
            ip,
            reqUrl,
            status,
            network,
            pageStartTm,
            lcp,
            inp,
            cls,
            feeldex,
            loadingTime
        } = pageInfo


        $target.find('#pageStartTm').text(util.timestampToDateTime(pageStartTm) || '-')
        $target.find('#status').text(status || '-')

        const $feeldex = $target.find('#feeldex');
        if (!isNaN(feeldex)) {
            const feeldexClass = util.getFeeldex(feeldex)
            $feeldex.addClass(feeldexClass[2]);
        } else {
            $feeldex.text('-')
        }

        $target.find('#network').text(network || '-')
        $target.find('#browser').text(deviceModel + ' ' + (webviewVer ?? '') || '-')

        $target.find('#platform').text(platform || '-')
        $target.find('#os').text(
            (osType && osVer) ? `${osType} ${osVer}` : '-'
        )
        $target.find('#deviceModel').text(deviceModel || '-')
        $target.find('#timezone').text(timezone || '-')
        $target.find('#userId').text(userId || '-')
        $target.find('#ip').text(ip || '-')
        $target.find('#reqUrl').text(reqUrl || '-')
        $target.find('#pageUrl').text(reqUrl || '-')

        const $lcp = $target.find('#lcp')
        const $inp = $target.find('#inp')
        const $cls = $target.find('#cls')

        if (isNaN(lcp)) {
            $lcp.text('-'); // LCP 평균값 초기화
        } else {
            // 데이터 형식 변환 (소수점 처리)
            lcp = Number(lcp.toFixed(0))
            // 평균값 텍스트 업데이트 (차트 아래 표시되는 값)
            // LCP가 1초 미만인 경우엔 ms로 표기
            if (lcp < 1000) $lcp.text(lcp + ' ms')
            else $lcp.text(lcp / 1000 + ' s')
        }

        if (isNaN(inp)) {
            $inp.text('-'); // LCP 평균값 초기화
        } else {
            inp = Number(inp.toFixed(0))

            // INP는 항상 ms로 표기 (천 단위 콤마 추가)
            $inp.text(util.comma(inp) + ' ms')
        }

        if (isNaN(cls)) {
            $cls.text('-'); // LCP 평균값 초기화
        } else {
            cls = Number(cls.toFixed(4))
            // CLS는 단위 없이 그대로 표기
            $cls.text(cls)
        }

        if (chartData && !isNaN(loadingTime)) {
            v.setChartData(chartData, loadingTime)
        }
        // session history의 performance 탭
      //  v.performanceTable.setData(pages)

        // session history의 events 탭
        v.historyTable.setData(events)
    }

    setChartData(data, loadingTime) {
        const v = this
        const {
            avg,
            chart,
            count
        } = data


        // --- 안전 처리: avg 또는 loadingTime이 null/undefined면 NaN 방지
        const safeAvg = isNaN(avg) ? null : avg;
        const safeLoading = isNaN(loadingTime) ? null : loadingTime;

        // 두 값이 모두 존재하고 같을 때
        const isSame = safeAvg !== null && safeLoading !== null && safeAvg === safeLoading
        const isCloseRange = !isSame && safeAvg !== null && safeLoading !== null && Math.abs(safeAvg - safeLoading) < 100
        let avgLabelOffsetY = -5
        let loadingLabelOffsetY = -5

        if (isCloseRange) {
            if (safeAvg > safeLoading) {
                avgLabelOffsetY = -18
                loadingLabelOffsetY = 8
            } else {
                avgLabelOffsetY = 8
                loadingLabelOffsetY = -18
            }
        }

        if (safeAvg !== null) {
            $('#chartAvg').text(util.comma(Math.round(safeAvg)));

            if (this.chart?.yAxis?.[0]) {
                // 기존 plotLine 제거
                this.chart.yAxis[0].removePlotLine('avgLine');
                this.chart.yAxis[0].removePlotLine('loadingTimeLine');

                // --- AVG와 LoadingTime이 같은 경우
                if (isSame) {
                    this.chart.yAxis[0].addPlotLine({
                        id: 'avgLine',
                        value: safeAvg,
                        color: '#EEBEBE',
                        width: 1,
                        zIndex: 5,
                        label: {
                            useHTML: true, // HTML 적용 필수!
                            text:
                                `<span class="loading_time_tooltip red">AVG: ${util.comma(Math.round(safeAvg))}ms</span>` +
                                `<br>` +
                                `<span class="loading_time_tooltip green">Loading Time: ${util.comma(Math.round(safeLoading))}ms</span>`,
                            align: 'right',
                            style: {
                                color: '#FF6969' // 기본 텍스트 색 (AVG 앞 부분)
                            },
                            x: -10,
                            y: avgLabelOffsetY
                        }
                    });
                } else {
                    // --- 다를 때: AVG plotLine 추가
                    this.chart.yAxis[0].addPlotLine({
                        id: 'avgLine',
                        value: safeAvg,
                        color: '#EEBEBE',
                        width: 1,
                        zIndex: 5,
                        label: {
                            text: `AVG: ${util.comma(Math.round(safeAvg))}ms`,
                            align: 'right',
                            style: {color: '#FF6969'},
                            x: -10,
                            y: -5
                        }
                    });

                    // --- loadingTime이 다를 때만 추가
                    if (safeLoading !== null) {
                        this.chart.yAxis[0].addPlotLine({
                            id: 'loadingTimeLine',
                            value: safeLoading,
                            color: '#6BB25E',
                            width: 1,
                            zIndex: 5,
                            label: {
                                text: `Loading Time: ${util.comma(Math.round(safeLoading))}ms`,
                                align: 'right',
                                style: {color: '#6BB25E'},
                                x: -10,
                                y: loadingLabelOffsetY
                            }
                        });
                    }
                }
            }
        }

        if (count) {
            $('#count').text(util.comma(count))
        }

        if (v.chart) {
            v.chart.series[0].setData(chart)

            const maxYaxis = v.chart.yAxis[0].max
            if (maxYaxis < loadingTime) {
                v.chart.yAxis[0].update({max: loadingTime + 50})
            } else if (maxYaxis < avg) {
                v.chart.yAxis[0].update({max: avg + 50})
            }
        }
    }

    getPageDetail() {
        const v = this
        const {param} = v
        const {from, to, packageNm, serverType, docId} = param

        ajaxCall('/mf/0000/dashboard/page/detail.maxy', {
            packageNm,
            serverType,
            from,
            to,
            docId
        }).then(data => {
            // 임시
            const param = {
                pageStartTm : from
            }

            const {resources} = data
            const {resourceInfoData, timingData} = resources

            if (resourceInfoData.length === 0) {
                toast('분석을 위한 정보가 수집되지 않은 케이스 입니다.')

                if ($('.popup_right_side_wrap').hasClass('show')) {
                    $('.maxy_popup_gray_bg_wrap.popup_right_side_wrap').removeClass('show').addClass('hidden')
                }
                return
            }

            v.datas = resourceInfoData

            const waterfall = {
                'resource': resourceInfoData,
                'time': timingData
            }

            // v.setDetailData(detail)
            v.drawPerformance(resources, param)
            v.drawData(waterfall)

            $('#' + v.id + ' .popup_right_side_wrap').removeClass('hidden').addClass('show')
        })
    }

    closePopup(v) {
        const popup = '#' + v.id
        const span = popup + ' span'
        const div = popup + ' div'
        const $dimmed = $('.dimmed')
        const $popup = $(popup)

        // v.table.clearData()

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
}
