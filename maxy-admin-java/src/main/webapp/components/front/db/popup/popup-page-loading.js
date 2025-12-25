class MaxyFrontPopupPageLoading {
    constructor(options) {
        this.id = options.id
        this.appendId = options.appendId
        this.type = options.type
        this.from = options.from
        this.to = options.to
        this.logType = options.logType
        this.topChartId = options.topChartId
        this.botChartId = options.botChartId

        // 이 두개는 area 차트에서 팝업 열었을 때만 있음.
        this.locationCode = options.locationCode
        this.krKeys = options.krKeys

        // yFrom, yTo 는 scatter 차트에서 팝업 열었을 때만 있음.
        this.yFrom = options.yFrom
        this.yTo = options.yTo

        // Core Vital별 상태 기준 값, NEEDS_IMPROVEMENT 이상일 경우 POOR
        this.THRESHOLDS = {
            LCP: {GOOD: 2500, NEEDS_IMPROVEMENT: 4000},
            INP: {GOOD: 200, NEEDS_IMPROVEMENT: 500},
            CLS: {GOOD: 0.1, NEEDS_IMPROVEMENT: 0.25},
            FCP: {GOOD: 1800, NEEDS_IMPROVEMENT: 3000},
        }

        this.init().then(() => {
            this.addEventListener()
            this.openPopup().then(() => {
                this.setLocationCode()
                this.drawTable()
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
        })
    }

    async init() {
        const v = this
        const {id, appendId, type, from, to, logType, topChartId, botChartId, locationCode} = v
        const source = await fetch(
            '/components/front/db/popup/popup-page-ajax-detail.html')
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

    addEventListener() {
        const v = this
        $('.dimmed').on('click', () => {
            if ($('.popup_right_side_wrap').hasClass('show')) {
                $('.maxy_popup_gray_bg_wrap.popup_right_side_wrap').removeClass('show').addClass('hidden')
                return
            }
            v.closePopup(v)
        })

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

    initChart() {
        const v = this
        const {id} = v

        this.chart = Highcharts.chart(id + '_chart', {
            chart: {
                type: 'column',
            },
            legend: {
                enabled: false
            },
            xAxis: {
                type: 'datetime',
                dateTimeLabelFormats: {
                    second: '%H:%M',
                    minute: '%H:%M',
                    hour: '%H:%M',
                },
                crosshair: true
            },
            yAxis: [{
                min: 0,
                title: {
                    text: ''
                },
                labels: {
                    formatter: function () {
                        try {
                            return util.convertNum(this.value);
                        } catch (e) {
                            console.error('Y축 라벨 포맷 오류:', e)
                            return this.value;
                        }
                    }
                }
            }],
            plotOptions: {
                column: {
                    pointPadding: 0,
                    borderWidth: 0
                }
            },
            series: [{
                events: {
                    click: function (e) {
                        $('#' + v.id +  ' .popup_right_side_wrap').removeClass('show').addClass('hidden')
                        v.selectedRow = null

                        // 시작 시간값
                        const from = e.point.category
                        // 5분(300,000ms)을 더한 종료 시간값
                        const thirtyMinutesInMs = 30 * 60 * 1000; // 30분
                        const to = from + thirtyMinutesInMs - 1; // 29분 59.999

                        v.from = from
                        v.to = to
                        v.updateDateTime(from, to)
                        v.getListData(true)
                    }
                },
                name: 'Page Loading',
                data: [],
                color: '#7277ff'
            }]
        })
    }

    updateDateTime(from, to) {
        if (from && to) {
            const fromDate = util.timestampToDateTime(from)
            const toDate = util.timestampToDateTime(to)

            const period = fromDate + ' ~ ' + toDate
            $('[data-type="time"]').text(period)
        }
    }

    drawTable() {
        const v = this
        const tableTarget = '#' + v.id + '_list'

        const columnNames = {
            'time': trl('common.tableColumn.time'),
            'lcp': 'LCP',
            'fcp': 'FCP',
            'inp': 'INP',
            'cls': 'CLS',
            'pageUrl': trl('common.text.pageUrl')
        }

        v.table = new Tabulator(tableTarget, {
            layout: 'fitDataFill',
            height: '100%',
            placeholder: trl('common.msg.noData'),
            columns: [
                {
                    title: columnNames.time,
                    field: "loadingTime",
                    width: "9%",
                    formatter: function(cell) {
                        const value = cell.getValue()

                        // wtfFlag가 "N"인 경우 텍스트 색상을 회색으로 설정
                        if(cell.getData().wtfFlag === "N") {
                            return "<span class='no_wtf''>" + popup.dataFormat(value, 'interval') + "</span>";
                        } else {
                            return popup.dataFormat(value, 'interval')
                        }
                    }
                },
                {
                    title: columnNames.lcp,
                    field: "lcp",
                    width: "12%",
                    formatter: (cell) => {
                        if(cell.getData().lcp === ''){
                            return `<span class='btn_yn none'>-</span>`
                        }
                        const lcp = Number(cell.getData().lcp).toFixed(0)
                        const lcpTxt = lcp / 1000 + 's'

                        if (lcp < v.THRESHOLDS.LCP.GOOD) {
                            return `<span class='btn_yn good'>${lcpTxt}</span>`
                        } else if (lcp >= v.THRESHOLDS.LCP.GOOD && lcp < v.THRESHOLDS.LCP.NEEDS_IMPROVEMENT) {
                            return `<span class='btn_yn improve'>${lcpTxt}</span>`
                        } else {
                            return `<span class='btn_yn poor'>${lcpTxt}</span>`
                        }
                    }
                },
                {
                    title: columnNames.fcp,
                    field: "fcp",
                    width: "12%",
                    formatter: (cell) => {
                        if(cell.getData().fcp === ''){
                            return `<span class='btn_yn none'>-</span>`
                        }
                        const fcp = Number(cell.getData().fcp).toFixed(0)
                        const fcpTxt = fcp / 1000 + 's'

                        if (fcp < v.THRESHOLDS.FCP.GOOD) {
                            return `<span class='btn_yn good'>${fcpTxt}</span>`
                        } else if (fcp >= v.THRESHOLDS.FCP.GOOD && fcp < v.THRESHOLDS.FCP.NEEDS_IMPROVEMENT) {
                            return `<span class='btn_yn improve'>${fcpTxt}</span>`
                        } else {
                            return `<span class='btn_yn poor'>${fcpTxt}</span>`
                        }
                    }
                },
                {
                    title: columnNames.inp,
                    field: "inp",
                    width: "12%",
                    formatter: (cell) => {
                        if(cell.getData().inp === ''){
                            return `<span class='btn_yn none'>-</span>`
                        }
                        const inpVal = Number(cell.getData().inp)
                        const inp = inpVal.toFixed(0)
                        const formatted = util.comma(inp)

                        if (inpVal < v.THRESHOLDS.INP.GOOD) {
                            return `<span class='btn_yn good'>${formatted}ms</span>`
                        } else if (inpVal >= v.THRESHOLDS.INP.GOOD && inpVal < v.THRESHOLDS.INP.NEEDS_IMPROVEMENT) {
                            return `<span class='btn_yn improve'>${formatted}ms</span>`
                        } else {
                            return `<span class='btn_yn poor'>${formatted}ms</span>`
                        }
                    }
                },
                {
                    title: columnNames.cls,
                    field: "cls",
                    width: "12%",
                    formatter: (cell) => {
                        if(cell.getData().cls === ''){
                            return `<span class='btn_yn none'>-</span>`
                        }
                        const cls = (Number(cell.getData().cls) === 0 ? 0 : Number(cell.getData().cls).toFixed(4))
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
                    title: columnNames.pageUrl,
                    field: "reqUrl",
                    width: "42%",
                    formatter: cell => {
                        const value = cell.getValue()

                        if (!value) {
                            return '-'
                        } else {
                            return value
                        }
                    }
                },
            ]
        })

        v.table.on('rowClick', (e, row) => {
            popup.rowClick(e, row, v, (data) => {
                const rowData = row.getData()
                if (rowData.wtfFlag === 'N') {
                    toast('분석을 위한 정보가 수집되지 않은 케이스 입니다.')
                    return
                }

                v.getDetailData(data)
            });
        })

        v.table.on('tableBuilt', function () {
            v.getListData()
        })
    }

    /**
     * 페이지 뷰 정보 리스트 조회
     * @param {string} [isClick] - 상단 차트 막대기 선택 여부 (true면 yFrom ,yTo 제거)
     */
    getListData(isClick) {
        const {from, to, locationCode, yFrom, yTo} = this

        const param =  {
            packageNm: $('#packageNm').val(),
            serverType: $('#packageNm option:checked').data('server-type'),
            from: from,
            to: to
        }

        if (yFrom && yTo && !isClick) {
            param.yFrom = yFrom
            param.yTo = yTo
        }

        // 초기 호출: getListData()
        // 기본 locationCode 사용
        if (locationCode) {
            param.locationCode = locationCode
        }

        ajaxCall('/mf/0000/dashboard/page/list.maxy', param).then(res => {
            // 테이블에 데이터 설정
            const {data, chartData} = res
            this.table.setData(data)
            this.chart.series[0].setData(chartData.chart)
            this.updateSummaryInfo(res)
        })
    }

    getDetailData(data) {
        const v = this

        ajaxCall('/mf/0000/dashboard/page/detail.maxy', {
            packageNm: $('#packageNm').val(),
            serverType: $('#packageNm option:checked').data('server-type'),
            from: v.from,
            to: v.to,
            docId: data.docId
        }).then(res => {
            // 둘 다 있을 때만 우측 팝업 열림
            if (res.detail && res.resources) {
                const {detail, resources} = res

                const {
                    packageNm,
                    serverType,
                    deviceId,
                    pageStartTm,
                    pageEndTm,
                    mxPageId
                } = detail

                // btnPageFlow 클릭해서 사용자분석 화면으로 이동 시 필요한 값들임.
                const from = pageStartTm
                const to = pageEndTm

                // ajax response, loading time 팝업에선 사용자 분석 이동할 때 mxPageId 필요.
                this.userFlowParam = {
                    packageNm,
                    serverType,
                    deviceId,
                    from,
                    to,
                    mxPageId
                }

                // 사용자 행동분석 이동 버튼 (userFlowParam 모두 저장되고 show)
                $('#btnPageFlow').show()

                const param = {
                    pageStartTm : from
                }

                const {resourceInfoData, timingData} = resources

                if (resourceInfoData.length === 0) {
                    toast('분석을 위한 정보가 수집되지 않은 케이스 입니다.')
                    $('#' + v.id +  ' .popup_right_side_wrap').removeClass('show').addClass('hidden')
                    return
                }

                v.datas = resourceInfoData

                const waterfall = {
                    'resource': resourceInfoData,
                    'time': timingData
                }

                v.setDetailData(detail)
                v.drawPerformance(resources, param)
                v.drawData(waterfall)

                $('#' + v.id + ' .popup_right_side_wrap').removeClass('hidden').addClass('show')
            } else {
                toast('분석을 위한 정보가 수집되지 않은 케이스 입니다.')
            }
        })
    }

    setDetailData(detail) {
        try {
            const { id } = this

            if (!detail || typeof detail !== 'object') {
                console.warn('setDetailData: detail 데이터가 유효하지 않습니다.', detail)
                return
            }

            const {
                webviewVer,
                platform,
                osType,
                osVer,
                deviceModel,
                timezone,
                userId,
                ip,
                reqUrl
            } = detail

            const $target = $('#' + id)

            if ($target.length === 0) {
                console.warn(`setDetailData: 대상 ID(${id})를 찾을 수 없습니다.`)
                return
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
        } catch (e) {
            console.error('setDetailData 실행 중 오류 발생:', e)
        }
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

    drawPerformance(data, params) {
        // this.webVitalInstance.draw(data, params)
        this.webVitalInstance.setData(data, params)
    }

    // 상단 요약 정보 업데이트
    updateSummaryInfo(datas) {
        const {avg, data, totalHits} = datas

        const $user = $('#user')
        if (data.length > 0) {
            // Average Loading time
            $('#avg').text(Math.round(avg))
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

    setLocationCode() {
        const v = this
        const {locationCode, krKeys} = v

        if (this.locationCode) {
            const $select = $('#locationSelect')
            $select.show()

            // 기존 옵션 제거 (필요하면)
            $select.empty()

            krKeys.forEach(key => {
                const text = trl('dashboard.area.' + key)
                const isSelected = key === locationCode ? 'selected' : ''
                $select.append(`<option value="${key}" ${isSelected}>${text}</option>`)
            })

            // select 변경 이벤트
            $select.on('change', function() {
                // 선택돼있던 행 초기화
                if (v.selectedRow) {
                    v.selectedRow = null
                }
                 // 선택한 option의 value
                v.locationCode = $(this).val()
                v.getListData()          // 선택된 값으로 데이터 호출
            })
        } else {
            $('#locationSelect').hide()
        }
    }

    getPageFlow() {
        const {userFlowParam} = this

        sessionStorage.setItem('userAnalysisPopupParams', JSON.stringify(userFlowParam))

        const targetUrl = '/fu/0000/view.maxy?popup=true'
        window.open(targetUrl, '_blank')
    }

    closePopup(v) {
        const popup = '#' + v.id
        const span = popup + ' span'
        const div = popup + ' div'
        const $dimmed = $('.dimmed')
        const $popup = $(popup)

        v.table.clearData()

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