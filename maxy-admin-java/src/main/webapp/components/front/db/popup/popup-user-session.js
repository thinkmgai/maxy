class MaxyFrontPopupUserSession {
    constructor(options) {
        this.id = options.id
        this.appendId = options.appendId
        this.deviceId = options.deviceId
        this.feeldex = options.feeldex
        this.topChartId = options.topChartId
        this.botChartId = options.botChartId

        // Core Vital별 상태 기준 값, NEEDS_IMPROVEMENT 이상일 경우 POOR
        this.THRESHOLDS = {
            LCP: {GOOD: 2500, NEEDS_IMPROVEMENT: 4000},
            INP: {GOOD: 200, NEEDS_IMPROVEMENT: 500},
            CLS: {GOOD: 0.1, NEEDS_IMPROVEMENT: 0.25},
            FCP: {GOOD: 1800, NEEDS_IMPROVEMENT: 3000},
        }

        this.init().then(() => {
            this.getUserDetail().then(() => {
                this.initTable()

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
            '/components/front/db/popup/popup-user-session.html')
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

        v.performanceTable = new Tabulator('#performanceList', {
            layout: 'fitDataFill',
            width: '100%',
            height: '100%',
            placeholder: trl('common.msg.noData'),
            columns: [
                {
                    title: 'Access Time',
                    field: "pageStartTm",
                    width: "20%",
                    formatter: util.timestampToDateTime
                },
                {
                    title: 'Loading',
                    field: "loadingTime",
                    width: "15%",
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
                    title: 'Load Page',
                    field: "reqUrl",
                    width: "34%",
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
                    title: 'LCP',
                    field: "lcp",
                    width: "9%",
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
                    title: 'INP',
                    field: "inp",
                    width: "9%",
                    formatter: (cell) => {
                        const inpValue = cell.getData().inp

                        if (inpValue === '') {
                            return `<span class='btn_yn none'>-</span>`
                        }

                        // 소수점 없이 정수로 만들고, 천 단위 구분 적용
                        const inp = util.comma(Number(inpValue).toFixed(0))

                        if (inpValue < v.THRESHOLDS.INP.GOOD) {
                            return `<span class='btn_yn good'>${inp}ms</span>`
                        } else if (inpValue >= v.THRESHOLDS.INP.GOOD && inpValue < v.THRESHOLDS.INP.NEEDS_IMPROVEMENT) {
                            return `<span class='btn_yn improve'>${inp}ms</span>`
                        } else {
                            return `<span class='btn_yn poor'>${inp}ms</span>`
                        }
                    }
                },
                {
                    title: 'CLS',
                    field: "cls",
                    width: "9%",
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
                }
            ]
        })

        v.performanceTable.on('rowClick', (e, row) => {
            popup.rowClick(e, row, v, (data) => {
                const rowData = row.getData()
                if (rowData.wtfFlag === 'N') {
                    toast('분석을 위한 정보가 수집되지 않은 케이스 입니다.')
                    return
                }
                v.getDetailData(data)
            });
        })

        v.historyTable = new Tabulator('#historyList', {
            layout: 'fitDataFill',
            width: '100%',
            height: '100%',
            placeholder: trl('common.msg.noData'),
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
                            return popup.dataFormat(value, 'interval')
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

    getDetailData(data) {
        const v = this

        ajaxCall('/mf/0000/dashboard/page/detail.maxy', {
            packageNm: $('#packageNm').val(),
            serverType: $('#packageNm option:checked').data('server-type'),
            from: data.pageStartTm,
            to: data.pageEndTm,
            docId: data.docId
        }).then(res => {
            if (res.detail && res.resources) {
                const {detail, resources} = res

                const {
                    packageNm,
                    serverType,
                    deviceId,
                    pageStartTm,
                    pageEndTm,
                    reqUrl
                } = detail

                // btnPageFlow 클릭해서 사용자분석 화면으로 이동 시 필요한 값들임.
                const from = pageStartTm
                const to = pageEndTm
                const mxPageId = data.mxPageId

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

                const $target = $('#' + v.id + ' .popup_right_side_wrap')
                $target.find('#reqUrl').text(reqUrl)

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

                v.drawPerformance(resources, param)
                v.drawData(waterfall)

                $target.removeClass('hidden').addClass('show')
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

        $('#btnPageFlow').on('click', () => {
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

    getPageFlow() {
        const {userFlowParam} = this

        sessionStorage.setItem('userAnalysisPopupParams', JSON.stringify(userFlowParam))

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
        $('.content_wrap.performance, .content_wrap.history').hide()

        // 선택된 탭 표시
        const $targetContent = $('.content_wrap.' + type)
        $targetContent.show()

        // DOM이 완전히 렌더링된 다음 redraw 호출 (중요)
        if (type === 'performance' && v.performanceTable) {
            v.performanceTable.redraw(true)
        } else if (type === 'history' && v.historyTable) {
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
    }

    async getUserDetail() {
        const {deviceId} = this

        ajaxCall('/mf/0000/dashboard/session/detail.maxy', {
            'packageNm': $('#packageNm').val(),
            'serverType': $('#packageNm option:checked').data('server-type'),
            'deviceId': deviceId,
            'from': util.dateToTimestamp(new Date(), true),
            'to': new Date().getTime()
        }).then(data => {
            this.openPopup().then(() => {
                this.setDetailData(data)
            })
        }).catch(e => {
            toast('분석을 위한 정보가 수집되지 않은 케이스 입니다.')
            console.error(e)
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

        const {detail, vital, pages, events} = data

        const {
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
            parentLogDate
        } = detail

        // user analysis 팝업 화면으로 이동할 때 필요한 시간 값.
        this.parentLogDate = parentLogDate

        $target.find('#parentLogDate').text(util.timestampToDateTime(parentLogDate) || '-')
        $target.find('#status').text(status || '-')

        const maxyDarkYn = sessionStorage.getItem('maxyDarkYn')
        let imageFiles = []

        if (maxyDarkYn === 'Y') {
            // Feeldex 이미지 설정
            imageFiles = {
                'bad': '/images/maxy/dark-feeldex-bad.svg',
                'good': '/images/maxy/dark-feeldex-good.svg',
                'normal': '/images/maxy/dark-feeldex-normal.svg',
                'very-bad': '/images/maxy/dark-feeldex-very-bad.svg',
                'very-good': '/images/maxy/dark-feeldex-very-good.svg',
                'feeldex-default': '/images/maxy/feeldex-default.svg'
            }
        } else {
            imageFiles = {
                'bad': '/images/maxy/feeldex-bad.svg',
                'good': '/images/maxy/feeldex-good.svg',
                'normal': '/images/maxy/feeldex-normal.svg',
                'very-bad': '/images/maxy/feeldex-very-bad.svg',
                'very-good': '/images/maxy/feeldex-very-good.svg',
                'feeldex-default': '/images/maxy/feeldex-default.svg'
            }
        }

        const $feeldex = $target.find('#feeldex');
        if (v.feeldex !== undefined && v.feeldex !== null && imageFiles[v.feeldex]) {
            $feeldex.html(`<img src="${imageFiles[v.feeldex]}" alt="feeldex" style="height: 20px; vertical-align: middle;">`);
        } else {
            $feeldex.text('-');
        }

        const browser = deviceModel
            ? deviceModel + (webviewVer ? ' ' + webviewVer : '')
            : '-'
        $target.find('#network').text(network || '-')
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

        // detail 하단 vital
        let {
            lcp,
            inp,
            cls
        } = vital

        // 데이터 형식 변환 (소수점 처리)
        lcp = Number(lcp.toFixed(0))
        inp = Number(inp.toFixed(0))
        cls = Number(cls.toFixed(4))

        // 평균값 텍스트 업데이트 (차트 아래 표시되는 값)
        // LCP가 1초 미만인 경우엔 ms로 표기
        if (lcp < 1000)  $target.find('#lcp').text(lcp + ' ms' || '-')
        else $target.find('#lcp').text(lcp / 1000 + ' s')

        // INP는 항상 ms로 표기 (천 단위 콤마 추가)
        $target.find('#inp').text(util.comma(inp) + ' ms' || '-')

        // CLS는 단위 없이 그대로 표기
        $target.find('#cls').text(cls || '-')

        // session history의 performance 탭
        v.performanceTable.setData(pages)

        // session history의 events 탭
        v.historyTable.setData(events)
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
