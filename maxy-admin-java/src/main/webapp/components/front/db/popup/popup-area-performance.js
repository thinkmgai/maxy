class MaxyFrontPopupAreaPerformance {
    constructor(options) {
        this.id = options.id
        this.appendId = options.appendId
        this.type = options.type
        this.from = options.from
        this.to = options.to
        this.logType = options.logType
        this.locationCode = options.locationCode
        this.krKeys = options.krKeys

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
                this.initTable()
            })
        })
    }

    async init() {
        const v = this
        const {id, appendId, type, from, to, logType} = v
        const source = await fetch(
            '/components/front/db/popup/popup-area-performance.html')
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
        $target.append(template({id, type, period, logType}))

        updateContent()

        // 초기화 시 기본적으로 stack 탭만 보이게 설정
        this.initDefaultTab()
        this.setCombobox()
    }

    setCombobox() {
        const {krKeys, locationCode} = this
        const $select = $('#locationSelect')

        // 기존 옵션 제거 (필요하면)
        $select.empty()

        krKeys.forEach(key => {
            const text = trl('dashboard.area.' + key)
            const isSelected = key === locationCode ? 'selected' : ''
            $select.append(`<option value="${key}" ${isSelected}>${text}</option>`)
        })
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
                    title: 'Load Page',
                    field: "reqUrl",
                    width: "34%"
                },
                {
                    title: 'LCP',
                    field: "lcp",
                    width: "9%",
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
                }
            ]
        })

        v.historyTable = new Tabulator('#historyList', {
            layout: 'fitDataFill',
            width: '100%',
            height: '100%',
            placeholder: trl('common.msg.noData'),
            initialSort: [
                {column: "logTm", dir: "desc"}, // 시간순으로 정렬
            ],
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

        // select 변경 이벤트
        $('.location_select').on('change', function () {
            // 선택돼있던 행 초기화
            if (v.selectedRow) {
                v.selectedRow = null
            }
            const selectedValue = $(this).val() // 선택한 option의 value
            v.getListData(selectedValue)          // 선택된 값으로 데이터 호출
        })
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

        if (type === 'performance' && v.performanceTable) {
            v.performanceTable.redraw(true)
        } else if (type === 'history' && v.historyTable) {
            v.historyTable.redraw(true)
        }

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


        v.table = new Tabulator(tableTarget, {
            layout: 'fitDataFill',
            height: '100%',
            placeholder: trl('common.msg.noData'),
            columns: [
                {
                    title: 'User ID',
                    field: "userId",
                    width: "12%",
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
                    title: 'Platform',
                    field: "platform",
                    width: "12%",
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
                    title: 'IP',
                    field: "ip",
                    width: "14%",
                    formatter: cell => {
                        const value = cell.getValue();

                        if (!value) {
                            return '-'
                        } else {
                            return value
                        }
                    }
                },
                {
                    title: 'Access',
                    field: "appStartTm",
                    width: "16%",
                    formatter: cell => {
                        const value = cell.getValue();

                        if (!value) {
                            return '-'
                        } else {
                            return isNaN(value) ? '-' :  util.timestampToDateTime(value)
                        }
                    }
                },
                {
                    title: 'End',
                    field: "appEndTm",
                    width: "16%",
                    formatter: cell => {
                        const value = cell.getValue();

                        if (!value) {
                            return '-'
                        } else {
                            return isNaN(value) ? '-' :  util.timestampToDateTime(value)
                        }
                    }
                },
                {
                    title: 'Stay Time',
                    field: "usingTime",
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
                    title: 'Count',
                    field: "accessCnt",
                    width: "10%",
                    formatter: cell => {
                        const value = cell.getValue();
                        if (!value) {
                            return '-'
                        } else {
                            return isNaN(value) ? '-' : util.comma(value)
                        }

                    }
                },
            ]
        });

        v.table.on('rowClick', (e, row) => {
            popup.rowClick(e, row, v, (data) => {
                v.getDetailData(data)
            });
        })

        v.table.on('tableBuilt', function () {
            v.getListData()
        })
    }

    getListData(selectedCode) {
        const {from, to, locationCode} = this

        const param = {
            packageNm: $('#packageNm').val(),
            serverType: $('#packageNm option:checked').data('server-type'),
            from: from,
            to: to,
            locationCode: locationCode
        }

        // 콤보박스에서 지역 변경한경우 변경한 지역코드 넣어줌
        if (selectedCode) {
            param.locationCode = selectedCode
        }

        ajaxCall('/mf/0000/dashboard/user/list.maxy', param).then(data => {
            const {avg, totalHits} = data
            // 테이블에 데이터 설정
            this.table.setData(data.data)
            this.updateSummaryInfo(avg, totalHits)
        })
    }

    getDetailData(data) {
        const v = this

        ajaxCall('/mf/0000/dashboard/session/detail.maxy', {
            packageNm: $('#packageNm').val(),
            serverType: $('#packageNm option:checked').data('server-type'),
            from: v.from,
            to: v.to,
            deviceId: data.deviceId
        }).then(data => {
            $('#' + v.id + ' .popup_right_side_wrap').removeClass('hidden').addClass('show')

            $('#btnPageFlow').show()
            this.setDetailData(data)
        }).catch(err => {
            toast('분석을 위한 정보가 수집되지 않은 케이스 입니다.')
            return
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

        $target.find('#parentLogDate').text(util.timestampToDateTime(parentLogDate) || '-')
        $target.find('#status').text(status || '-')

        // Feeldex 이미지 설정
        const imageFiles = {
            'bad': '/images/maxy/feeldex-bad.svg',
            'good': '/images/maxy/feeldex-good.svg',
            'normal': '/images/maxy/feeldex-normal.svg',
            'very-bad': '/images/maxy/feeldex-very-bad.svg',
            'very-good': '/images/maxy/feeldex-very-good.svg',
            'feeldex-default': '/images/maxy/feeldex-default.svg'
            }
        ;

        $target.find('#network').text(network || '-')

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

        // detail 하단 vital
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
        if (lcp < 1000) $target.find('#lcp').text(lcp + ' ms' || '-')
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


    // 상단 요약 정보 업데이트
    updateSummaryInfo(avg, totalHits) {
        if (avg && totalHits) {
            // Average Loading time
            let tmpAvg = Math.round(avg)
            $('#avg').text(util.comma(tmpAvg))
            // 사용자 수
            $('#user').text(util.comma(totalHits))
        } else {
            $('#avg').text('-')
            $('#user').text('-')
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
