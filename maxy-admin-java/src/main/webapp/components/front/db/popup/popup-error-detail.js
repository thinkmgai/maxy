class MaxyFrontPopupError {
    constructor(options) {
        this.id = options.id
        this.appendId = options.appendId
        this.from = options.from
        this.to = options.to
        this.selectedRow = null
        this.sessionEvents = null
        this.resMsg = options.resMsg

        this.detail = {}

        // SourceMapHandler 인스턴스 생성
        this.sourceMapHandler = new SourceMapHandler();

        this.init().then(() => {
            this.addEventListener()
            this.openPopup()
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

        $('#readFlag').on('click', () => {
            const {detail} = v
            const $readFlag = $('#readFlag')

            let read
            if ($readFlag.hasClass('on')) {
                read = false
            } else {
                read = true
            }
            ajaxCall('/mf/0000/dashboard/error/detail/mark.maxy', {
                'packageNm': detail.packageNm,
                'serverType': detail.serverType,
                'hash': detail.hash,
                'read': read
            }).then(data => {
                const {readFlag, readAt} = data
                if (readFlag) {
                    $readFlag.toggleClass('on')
                } else {
                    $readFlag.removeClass('on')
                }

                if (readAt) {
                    $('#readAt').text(util.timestampToDateTime(readAt))
                } else {
                    $('#readAt').text('')
                }

            })
        })

        $('#btnSessionReplay').on('click', () => {
            const v = this

            if (v.sessionEvents === null || (v.sessionEvents || '').length === 0) {
                toast(trl('alert.noSessionData'))
                return
            }

            if (!v.sessionEvents[0].maxySessionId || !v.sessionEvents[0].logTm) {
                toast(trl('alert.noSessionData'))
                return
            }

            // 세션 재생 팝업 생성 및 열기
            v.sessionReplayPopup = new MaxySessionReplayPopup({
                appendId: 'maxySessionReplayPopupWrap',
                id: 'mySessionReplay',
                param: {
                    sessionId: v.sessionEvents[0].maxySessionId,
                    //sessionStartTm: v.sessionEvents[0].logTm,
                    errorLogTm: v.detail.logTm,
                    playStartTm: v.detail.logTm,
                }
            })
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

    toggleTab(e) {
        const $clickedTab = $(e.target)
        const type = $clickedTab.data('type')

        // 모든 탭에서 selected 클래스 제거
        $('.tab').removeClass('selected')

        // 클릭한 탭에 selected 클래스 추가
        $clickedTab.addClass('selected')

        // 모든 content div 숨기기
        $('.content_wrap.stack, .content_wrap.session').hide()

        // 선택한 타입에 해당하는 div만 표시
        $('.content_wrap.' + type).show()
    }

    async init() {
        const {id, appendId, from, to} = this

        const source = await fetch(
            '/components/front/db/popup/popup-error-detail.html')
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

        $target.append(template({id, period}))

        // error-stack.html 템플릿도 로드
        const stackSource = await fetch('/components/front/db/popup/error-stack.html')
            .then(response => response.text())
        this.stackTemplate = Handlebars.compile(stackSource)

        updateContent()
        this.drawTable()
        this.initChart()

        // 초기화 시 기본적으로 stack 탭만 보이게 설정
        this.initDefaultTab()
    }

    initDefaultTab() {
        // 모든 content div 숨기기
        $('.content_wrap.stack, .content_wrap.session').hide()

        // stack div만 보이게 하기
        $('.content_wrap.stack').show()

        // stack 탭에 selected 클래스 추가 (HTML에서 이미 설정되어 있지만 확실히 하기 위해)
        $('.tab[data-type="stack"]').addClass('selected')
        $('.tab[data-type="session"]').removeClass('selected')
    }

    openPopup() {
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

        console.log(v.id)
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

    initChart() {
        const v = this
        const {id} = v

        this.chart = Highcharts.chart(id + '__chart', {
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
                        // 시작 시간값
                        const from = e.point.category
                        const thirtyMinutesInMs = 30 * 60 * 1000; // 30분
                        const to = from + thirtyMinutesInMs - 1; // 29분 59.999

                        v.selectedRow = null

                        v.updateDateTime(from, to)
                        v.getListData(from, to)
                    }
                },
                name: 'Error',
                data: [],
                color: '#ffc700'
            }]
        })
    }

    updateDateTime(from, to) {
        if (from && to) {
            const fromDate = util.timestampToDateTime(from)
            const toDate = util.timestampToDateTime(to)

            const period = fromDate + ' ~ ' + toDate
            $('#dateTime').text(period)
        }
    }

    drawTable() {
        const v = this
        const tableTarget = '#' + v.id + '_list'

        const columnNames = {
            'timestamp': trl('common.tableColumn.timestamp'),
            'errorinfo': 'Error Info'
        }

        v.table = new Tabulator(tableTarget, {
            layout: 'fitDataFill',
            height: '100%',
            placeholder: trl('common.msg.noData'),
            columns: [
                {
                    title: columnNames.timestamp,
                    field: "logTm",
                    width: "14%",
                    formatter: cell => {
                        return util.timestampToDateTime(cell.getValue())
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
                    title: 'Browser',
                    field: "deviceModel",
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
                    title: 'Type',
                    field: "logType",
                    width: "12%",
                    formatter: cell => {
                        return getLogTypeGroup(cell.getValue())
                    }
                },
                {
                    title: columnNames.errorinfo,
                    field: "resMsg",
                    width: "53%",
                    formatter: cell => {
                        const value = cell.getValue()
                        if (value) {
                            return value
                        } else {
                            return '-'
                        }
                    }
                }
            ]
        })

        v.table.on('rowClick', (e, row) => {
            if ($(e.target).closest('.mark-cell').length > 0) return;
            popup.rowClick(e, row, v, (data) => {
                //v.resetData()
                v.getDetailData(data)
            });
        });

        v.table.on('tableBuilt', function () {
            v.getListData()
        })
    }

    getListData(selectFrom, selectTo) {
        const {
            from,
            to,
            resMsg
        } = this

        const param = {
            packageNm: $('#packageNm').val(),
            serverType: $('#packageNm option:checked').data('server-type'),
            from: selectFrom || from,
            to: selectTo || to
        }

        if (resMsg) {
            param.resMsg = resMsg
        }

        ajaxCall('/mf/0000/dashboard/error/list.maxy', param).then(data => {
            if (data) {
                const {chartData, listData} = data
                const {list, totalHits} = listData
                const {chart, count} = chartData
                this.table.setData(list)
                this.chart.series[0].setData(chart)

                $('#totalHits').text(util.comma(totalHits))
                $('#count').text(util.comma(count))
            }
        })
    }

    getDetailData(data) {
        const v = this

        ajaxCall('/mf/0000/dashboard/error/detail.maxy', {
            packageNm: $('#packageNm').val(),
            serverType: $('#packageNm option:checked').data('server-type'),
            from: v.from,
            to: v.to,
            docId: data.docId
        }).then(data => {
            const {detail, events, hasPage} = data

            // 데이터가 없거나 빈 객체인 경우 처리
            if (!detail || Object.keys(detail).length === 0) {
                toast('분석을 위한 정보가 수집되지 않은 케이스 입니다.')
                return
            }

            const packageNm = $('#packageNm').val()
            const serverType = $('#packageNm option:checked').data('server-type')

            const {
                deviceId,
                logTm,
                mxPageId
            } = detail

            // ajax response, loading time 팝업에선 사용자 분석 이동할 때 mxPageId 필요.
            this.userFlowParam = {
                packageNm,
                serverType,
                deviceId,
                logTm,
                mxPageId
            }

            const $btnPageFlow = $('#btnPageFlow')
            if (hasPage) {
                $btnPageFlow.show()
            } else {
                if ($btnPageFlow.is(':visible')) {
                    $btnPageFlow.hide()
                }
            }

            v.detail = detail
            v.sessionEvents = events

            v.setDetailData(detail)
            v.setStackData(detail)
            v.createSessionTable(events)

            $('#' + v.id + ' .popup_right_side_wrap').removeClass('hidden').addClass('show')
        }).catch(error => {
            console.error('getDetailData 에러:', error)
            toast('분석을 위한 정보가 수집되지 않은 케이스 입니다.')
        })
    }

    resetData() {
        const v = this
        const {id} = v  // id 변수를 올바르게 가져오도록 수정
        const $target = $('#' + id)

        if ($target.length === 0) {
            console.warn(`setDetailData: 대상 ID(${id})를 찾을 수 없습니다.`)
            return
        }

        $target.find('#browser').text('-')
        $target.find('#platform').text('-')
        $target.find('#os').text('-')
        $target.find('#deviceModel').text('-')
        $target.find('#timezone').text('-')
        $target.find('#userId').text('-')
        $target.find('#ip').text('-')
        $target.find('#reqUrl').text('-')

        $target.find('#readAt').text('-')
        $target.find('#readFlag').removeClass('on')

        // stack 데이터도 초기화
        const $stackContainer = $target.find('.content_wrap.stack .stack-list')
        if ($stackContainer.length > 0) {
            $stackContainer.empty()
        }
    }

    setDetailData(detail) {
        const v = this
        const {id} = v

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
            reqUrl,
            readFlag,
            readAt,
            resMsg,
            logType
        } = detail

        const $target = $('#' + id)

        if ($target.length === 0) {
            console.warn(`setDetailData: 대상 ID(${id})를 찾을 수 없습니다.`)
            return
        }

        $target.find('#browser').text(deviceModel + (webviewVer ?? '') || '-')
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


        if (readFlag) {
            $target.find('#readFlag').addClass('on')
        } else {
            $target.find('#readFlag').removeClass('on')
        }

        if (readAt) {
            $target.find('#readAt').text(util.timestampToDateTime(readAt))
        } else {
            $target.find('#readAt').text('')
        }
    }

    setStackData(detail) {
        const v = this
        const { id } = v

        if (!detail) {
            console.warn('setStackData: detail 데이터가 유효하지 않습니다.', detail)
            return
        }

        const $target = $('#' + id)
        const $stackContainer = $target.find('.content_wrap.stack .stack-list')

        if ($stackContainer.length === 0) {
            console.warn('setStackData: stack 컨테이너를 찾을 수 없습니다.')
            return
        }

        const {resMsg, mappedErrorStack} = detail
        let stackLines = []

        if (!util.isEmpty(mappedErrorStack)) {
            this.sourceMapHandler.handle(
                mappedErrorStack,
                $('#' + v.id + ' .stack-list'),
                () => {},
                (error) => {
                    // 에러 콜백
                    console.error('Failed to render stack trace:', error);
                }
            )
            return
        }

        if (resMsg && typeof resMsg === 'string') {
            try {
                // 1️⃣ 수동으로 이스케이프 문자 해제
                //    \n → 줄바꿈, \t → 탭, \" → "
                let decodedMsg = resMsg
                    .replace(/\\n/g, '\n')
                    .replace(/\\t/g, '\t')
                    .replace(/\\"/g, '"')
                    .replace(/\\\\/g, '\\') // 백슬래시 이중 제거

                // 2️⃣ 개행 기준으로 분리 + 빈 줄 제거
                stackLines = decodedMsg.split('\n').filter(line => line.trim() !== '')
            } catch (e) {
                console.warn('resMsg 파싱 중 오류 발생:', e)
                stackLines = [resMsg] // 실패 시 원문 그대로 표시
            }
        }

        if (stackLines.length === 0) {
            $stackContainer.addClass('no_data')
            return
        }

        $stackContainer.removeClass('no_data')

        // Handlebars 템플릿 렌더링 - stackLines를 직접 전달
        if (typeof v.stackTemplate === 'function') {
            const html = v.stackTemplate(stackLines)
            $stackContainer.html(html)
        } else {
            console.warn('setStackData: Handlebars 템플릿이 stackTemplate에 지정되어 있지 않습니다.')
            const simpleHtml = stackLines.map(line =>
                `<li class="stack-line">${line}</li>`
            ).join('')
            $stackContainer.html(`<ul class="stack-list">${simpleHtml}</ul>`)
        }
    }

    createSessionTable(events) {
        const v = this
        const {sessionTable} = v

        try {
            if (!events || !Array.isArray(events) || events.length === 0) {
                if (sessionTable) {
                    this.sessionTable.destroy()
                    this.sessionTable = null
                }

                $('.content_wrap.session').addClass('no_data')
                return
            }

            // 발생시간 역순으로 조회되기때문에 순서를 뒤집어야함
            events.reverse()

            const appStartTm = events[0].logTm

            // Tabulator 테이블 생성
            const v = this
            const table = new Tabulator("#sessionListTable", {
                data: events,
                layout: "fitDataFill",
                height: "100%",
                resizableColumns: true,
                movableColumns: true,
                selectable: 1,
                columns: [
                    {
                        title: "Time",
                        field: "logTm",
                        width: "12%",
                        hozAlign: "left",
                        formatter: function (cell) {
                            const time = cell.getValue() - appStartTm
                            return util.convertTime(time, false, false, true)
                        }
                    },
                    {
                        title: "Action",
                        field: "logType",
                        width: "15%",
                        vertAlign: "middle",
                        formatter: function (cell) {
                            const logTypeDetail = getLogTypeDetail(cell.getValue())
                            if (logTypeDetail.toLowerCase() === 'click') {
                                return `<img class="img_icon_action_click" style="padding-right: 0.5em" alt="">${logTypeDetail}`
                            } else {
                                return `<img class="img_icon_action_view_load" style="padding-right: 0.5em" alt="">${logTypeDetail}`
                            }
                        }
                    },
                    {
                        title: "Response Time",
                        field: "intervaltime",
                        width: "17%",
                        formatter: function (cell) {
                            return util.convertTime(cell.getValue(), false, false, true)
                        }
                    },
                    {
                        title: "Event",
                        width: "55%",
                        formatter: function (cell) {
                            const data = cell.getRow().getData()

                            if (data.logTypeDetail === 'Click') {
                                return `${data.logTypeDetail} [${data.clickInfo.text}] on ${data.reqUrl}`
                            } else {
                                return `Load page [${data.reqUrl}]`
                            }
                        }
                    }
                ]
            })

            // 테이블 참조 저장 (나중에 정리할 때 사용)
            this.sessionTable = table

            // v.detail.logTm 값을 기준으로 해당 시간대 row 마킹
            table.on("tableBuilt", function () {
                v.markTargetRow(table, events, v.detail.logTm)
            })
        } catch (error) {
            console.error('액션 리스트 테이블 생성 오류:', error)
        }
    }

    markTargetRow(table, events, targetLogTm) {
        if (!events || events.length === 0 || !targetLogTm) {
            return
        }

        // 마크 대상 row 찾기: events.logTm <= v.detail.logTm 이면서 다음 row의 logTm > v.detail.logTm
        let targetRowIndex = -1

        for (let i = 0; i < events.length; i++) {
            const currentLogTm = events[i].logTm
            const nextLogTm = i < events.length - 1 ? events[i + 1].logTm : null

            // 현재 row의 logTm이 targetLogTm보다 작거나 같고
            // 다음 row가 없거나 다음 row의 logTm이 targetLogTm보다 큰 경우
            if (currentLogTm <= targetLogTm && (nextLogTm === null || nextLogTm > targetLogTm)) {
                targetRowIndex = i
                break
            }
        }

        // 마크 대상 row가 있으면 배경색을 노란색으로 변경
        if (targetRowIndex >= 0) {
            const rows = table.getRows()
            if (rows[targetRowIndex]) {
                const rowElement = rows[targetRowIndex].getElement()
                rowElement.style.backgroundColor = '#FFEBA4'
            }
        }
    }

    getPageFlow() {
        const {userFlowParam} = this

        sessionStorage.setItem('userAnalysisPopupParams', JSON.stringify(userFlowParam))

        const targetUrl = '/fu/0000/view.maxy?popup=true'
        window.open(targetUrl, '_blank')
    }

    truncateUrl(url, maxLength) {
        if (!url || url.length <= maxLength) {
            return url
        }
        return url.substring(0, maxLength) + '...'
    }

    closePopup(v) {
        const popup = '#' + v.id
        const span = popup + ' span'
        const div = popup + ' div'
        const $dimmed = $('.dimmed')
        const $popup = $(popup)

        // 세션 리스트 테이블 정리
        if (this.sessionTable) {
            this.sessionTable.destroy()
            this.sessionTable = null
        }

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