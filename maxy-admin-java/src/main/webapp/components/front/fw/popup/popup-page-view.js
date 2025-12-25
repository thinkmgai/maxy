class MaxyFrontPopupPageView {
    constructor(options) {
        this.id = options.id
        this.appendId = options.appendId
        this.type = options.type
        this.from = options.from
        this.to = options.to
        this.logType = options.logType
        this.topChartId = options.topChartId
        this.botChartId = options.botChartId
        this.title = options.title
        this.searchType = options.searchType
        this.searchValue = options.searchValue
        this.selectedRow = null

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
                this.drawTable()

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
        const {
            id,
            appendId,
            type,
            from,
            to,
            logType,
            topChartId,
            botChartId,
            searchValue,
            title
        } = v

        const source = await fetch(
            '/components/front/fw/popup/popup-page-view.html')
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
        $target.append(template({id, type, period, logType, topChartId, botChartId, searchValue, title}))

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
                            return "<span class='no_wtf'>" + popup.dataFormat(value, 'interval') + "</span>";
                        } else {
                            return popup.dataFormat(value, 'interval')
                        }
                    }
                },
                {
                    title: 'Start Time',
                    field: "pageStartTm",
                    width: "16%",
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
                    title: columnNames.lcp,
                    field: "lcp",
                    width: "12%",
                    formatter: (cell) => {
                        if (cell.getData().lcp === '') {
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
                        if (cell.getData().fcp === '') {
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
                        if (cell.getData().cls === '') {
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
                    title: 'Feeldex',
                    field: "feeldex",
                    width: "10%",
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
                    title: 'Stay Time',
                    field: "intervaltime",
                    width: "14%",
                    formatter: cell => {
                        const value = cell.getValue()
                        if (isNaN(value)) {
                            return '-'
                        } else {
                            return util.convertTime(value, false, false, true)
                        }
                    }
                },
                {
                    title: '',
                    field: '',
                    width: '1%',
                    hozAlign: 'right',
                    headerSort: false,
                    formatter: (cell) => {
                        const rowData = cell.getRow().getData()
                        const isFavorite = rowData.mark || false // 서버에서 즐겨찾기 상태를 받아온다고 가정

                        return `<button class="icon_session_replay"></button>`
                    },
                    cellClick: async (e, cell) => {
                        e.stopPropagation() // 행 클릭 이벤트 방지
                        e.preventDefault() // 기본 동작 방지

                        const row = cell.getRow()
                        const data = row.getData()

                        if(!data.maxySessionId || !data.pageStartTm || !data.intervaltime) {
                            toast(trl('alert.noSessionData'))
                            return
                        }

                        v.handleSessionReplay(data)

                        return false // 이벤트 전파 완전 차단
                    }
                }
            ]
        })

        v.table.on('rowClick', (e, row) => {
            if (this.selectedRow) {
                this.selectedRow.getElement().classList.remove('selected_row')
            }
            row.getElement().classList.add('selected_row')
            this.selectedRow = row

            // 세션 리플레이 버튼 클릭인지 확인
            if (e.target && e.target.classList.contains('icon_session_replay')) {
                return // 세션 리플레이 버튼 클릭 시 rowClick 이벤트 무시
            }

            const rowData = row.getData()
            if (rowData.wtfFlag === 'N') {
                toast('분석을 위한 정보가 수집되지 않은 케이스 입니다.')
                return
            }

            v.getDetailData(rowData)

        })

        v.table.on('tableBuilt', function () {
            v.getListData()
        })
    }

    getListData() {
        const {from, to, searchType, searchValue} = this

        const param = {
            packageNm: $('#packageNm').val(),
            serverType: $('#packageNm option:checked').data('server-type'),
            from,
            to,
            searchType,
            searchValue
        }

        ajaxCall('/fw/0000/webperf/pages/raw.maxy', param).then(data => {
            // 테이블에 데이터 설정
            this.table.setData(data.data)
            this.updateSummaryInfo(data)
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

                // 임시
                const param = {
                    pageStartTm: pageStartTm
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
            const {id} = this

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

        if (data.length > 0) {
            // Average Loading time
            $('#avg').text(util.comma(Math.round(avg)))
            // 사용자 수
            $('#user').text(util.comma(totalHits))
        } else {
            $('#avg').text('-')
            $('#user').text('-')
        }
    }

    getPageFlow() {
        const {userFlowParam} = this

        sessionStorage.setItem('userAnalysisPopupParams', JSON.stringify(userFlowParam))

        const targetUrl = '/fu/0000/view.maxy?popup=true'
        window.open(targetUrl, '_blank')
    }

    handleSessionReplay(rowData) {
        try {
            // 세션 리플레이에 필요한 파라미터 설정
            const maxySessionId = rowData.maxySessionId
            const pageStartTm = rowData.pageStartTm
            const intervaltime = rowData.intervaltime || 0

            new MaxySessionReplayPopup({
                appendId: 'maxySessionReplayPopupWrap',
                id: 'mySessionReplay',
                param: {
                    sessionId: maxySessionId,
                    playStartTm: pageStartTm,
                    //intervaltime: Number(intervaltime) + 10000
                }
            })
        } catch (error) {
            console.error('세션 리플레이 실행 중 오류:', error)
            toast('세션 리플레이를 실행할 수 없습니다.')
        }
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