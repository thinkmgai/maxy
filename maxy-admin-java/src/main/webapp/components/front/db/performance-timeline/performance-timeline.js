class MaxyFrontPerformanceTimeLine {
    constructor(options) {
        this.id = options.id
        this.title = options.title
        this.type = options.type
        this.data = options.data
        this.darkModeYn = sessionStorage.getItem('maxyDarkYn')
    }

    async init() {
        const v = this
        const {id, title, type} = v

        const source = await fetch(
            '/components/front/db/performance-timeline/performance-timeline.html'
        ).then(response => response.text())

        const template = Handlebars.compile(source)
        const $target = $('#' + id)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + id
        }

        $target.empty()
        $target.append(template({id, title}))

        let comment
        if (type === 'loading') {
            comment = trl('dashboard.component.desc.frontpageloadingcount')
        } else if (type === 'response'){
            comment = trl('dashboard.component.desc.frontresponsecount')
        } else {
            comment = trl('dashboard.component.desc.fronterrorcount')
        }

        tippy('#' + id + ' .ic_question', {
            content: comment,
            placement: 'bottom',
            allowHTML: true,
            arrow: false,
            theme: 'maxy-tooltip'
        })

        this.seriesName = title

        let tooltipTitle
        if (type === 'loading') {
            tooltipTitle = 'Page Requested Count: '
        } else if (type === 'response') {
            tooltipTitle = 'Ajax Response Count: '
        } else if (type === 'error') {
            tooltipTitle = 'Error Count: '
        }
        const chartOptions = {
            chart: {
                zoomType: 'x',
                events: {
                    selection: function (e) {
                        e.preventDefault()
                        v.selectPointsByDrag(e, this)
                    }
                }
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
                        return util.comma(this.value)
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
                                enabled: false
                            }
                        }
                    }
                }
            },
            tooltip: {
                useHTML: true, // HTML을 사용하여 툴팁을 렌더링
                formatter: function () {
                    // this.x, this.y는 point의 값
                    const date = util.timestampToDateTime(this.x)
                    //      const formattedTime = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
                    return `<div class="front_db_tooltip">
                        <div class="title">${date}</div>
                        <div ><span>${tooltipTitle}</span> <span class="data">${util.comma(this.y)}</span></div>
                    </div>`;
                }
            },
            series: []
        }

        this.chart = Highcharts.chart(id + '__chart', chartOptions)
    }

    /**
     * 툴팁 동기화 기능을 활성화합니다
     * @param {ChartTooltipSynchronizer} synchronizer - 동기화 관리자 인스턴스
     */
    enableTooltipSync(synchronizer) {
        const v = this

        if (!synchronizer || !v.chart) {
            console.warn('[Performance Timeline] 동기화 활성화 실패: synchronizer 또는 chart가 없습니다')
            return
        }

        v.synchronizer = synchronizer

        // 동기화 이벤트 리스너 설정
        v._setupSyncEventListeners()
    }

    /**
     * 동기화 이벤트 리스너를 설정합니다 (내부 메서드)
     */
    _setupSyncEventListeners() {
        const v = this

        if (!v.chart || !v.chart.container) {
            console.warn('[Performance Timeline] 차트 컨테이너가 없어 이벤트 리스너 설정을 건너뜁니다:', v.id)
            return
        }

        const chartContainer = v.chart.container

        // 기존 이벤트 리스너 제거 (중복 방지)
        if (v._mouseMoveHandler) {
            chartContainer.removeEventListener('mousemove', v._mouseMoveHandler)
        }
        if (v._mouseLeaveHandler) {
            chartContainer.removeEventListener('mouseleave', v._mouseLeaveHandler)
        }

        // 새로운 이벤트 리스너 생성 및 등록
        v._mouseMoveHandler = (event) => {
            if (!v.synchronizer || !v.synchronizer.isEnabled) return

            const timestamp = v.getTimeAtMousePosition(event)
            if (timestamp !== null) {
                v.synchronizer.showTooltipsAtTime(timestamp, v.id)
            }
        }

        v._mouseLeaveHandler = (event) => {
            if (!v.synchronizer || !v.synchronizer.isEnabled) return

            v.synchronizer.hideAllTooltips(v.id)
        }

        chartContainer.addEventListener('mousemove', v._mouseMoveHandler)
        chartContainer.addEventListener('mouseleave', v._mouseLeaveHandler)
    }

    /**
     * 동기화 기능을 재활성화합니다 (데이터 업데이트 후 호출)
     */
    _reactivateTooltipSync() {
        const v = this

        if (!v.synchronizer) {
            return
        }

        // 이벤트 리스너 재설정
        v._setupSyncEventListeners()
    }

    addEventListener() {
        const v = this
    }

    setData(data, value) {
        let {chart, darkModeYn, seriesName, id, type} = this

        if (!chart || !chart.series) {
            return
        }

        if (!data || Object.keys(data).length === 0) {
            return
        }

        if (value >= 0) {
            $('#' + id).find(' #total').text(util.comma(value) || 0)
        }

        const series = []

        data.forEach(item => {
            const x = item['key'];
            const y = item['count'];

            // 숫자로 변환
            const xNum = Number(x);
            const yNum = Number(y);

            // NaN 체크
            if (!isNaN(xNum) && !isNaN(yNum)) {
                series.push({
                    x: xNum,
                    y: yNum
                });
            } else {
                console.warn('NaN 값 무시됨:', x, y);
            }
        });

        series.sort((b, a) => b.x - a.x)

        const chartData = {
            name: seriesName,
            type: 'areaspline',
            data: series,
            color: {
                linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
                stops:
                    type === 'error'
                        ? (darkModeYn === 'Y'
                            ? hcColors.stock.background.error.dark
                            : hcColors.stock.background.error.light)
                        : (darkModeYn === 'Y'
                            ? hcColors.stock.background.dark
                            : hcColors.stock.background.light)
            }
        };
        // series가 없을때만 addSeries , 있을땐 setData
        if (chart.series.length === 0) {
            chart.addSeries(chartData)
        } else {
            chart.series[0].setData(series, false)
        }

        chart.redraw()

        // 데이터 업데이트 후 동기화 기능 재활성화
        if (this.synchronizer && this.synchronizer.isEnabled) {
            this._reactivateTooltipSync()
        }
    }

    selectPointsByDrag(e, t) {
        const {type} = this

        if (!e.xAxis || !e.yAxis || !t.series) {
            console.log('no')
            return
        }

        const x = e.xAxis[0], y = e.yAxis[0]
        const {min, max} = x

        const param = {
            packageNm: $('#packageNm').val(),
            serverType: $('#packageNm option:checked').data('server-type'),
            osType: $('#osType').val(),
            from: Math.round(min),
            to: Math.round(max)
        }

        if (param.from && param.to) {
            const options = {
                appendId: 'maxyPopupWrap',
                id: type + 'TimeLinePopup',
                type: type === 'loading' ? 'Page Loading' : 'Response Time',
                from: Math.round(min),
                to: Math.round(max),
                logType: type === 'loading' ? 'page' : 'ajax',
                intervalSort: true,
                data: param,
                topChartId: this.type === 'loading' ? 'webVital' : 'responseDetail',
                botChartId: this.type === 'loading' ? 'waterfall' : 'responseChart'
            }

            if (type === 'loading') {
                new MaxyFrontPopupPageLoading(options)
            } else if (type === 'response') {
                new MaxyFrontPopupAjaxResponse(options)
            } else if (type === 'error') {
                new MaxyFrontPopupError(options)
            }
        }
    }

    /**
     * 특정 시간의 툴팁을 표시합니다
     * @param {number} timestamp - 표시할 시간값 (밀리초)
     */
    showTooltipAtTime(timestamp) {
        const v = this

        if (!v.chart || !v.chart.series || v.chart.series.length === 0) {
            return false
        }

        try {
            const series = v.chart.series[0]
            if (!series.data || series.data.length === 0) {
                return false
            }

            // 가장 가까운 데이터 포인트 찾기 (허용 오차: 30초)
            let closestPoint = null
            let minDistance = Infinity
            const allowedTolerance = 30000 // 30초 허용 오차

            series.data.forEach(point => {
                const distance = Math.abs(point.x - timestamp)
                if (distance < minDistance) {
                    minDistance = distance
                    closestPoint = point
                }
            })

            if (closestPoint && minDistance <= allowedTolerance) {
                // 툴팁 표시
                v.chart.tooltip.refresh(closestPoint)

                // 크로스헤어 표시
                if (v.chart.xAxis && v.chart.xAxis[0]) {
                    v.chart.xAxis[0].drawCrosshair(null, closestPoint)
                }

                return true
            } else {
                // 허용 오차 범위 밖이면 툴팁 숨김
                v.hideTooltip()
                return false
            }
        } catch (error) {
            return false
        }
    }

    /**
     * 툴팁을 숨깁니다
     */
    hideTooltip() {
        const v = this

        if (!v.chart) {
            return
        }

        try {
            // 툴팁 숨기기
            v.chart.tooltip.hide()

            // 크로스헤어 숨기기
            if (v.chart.xAxis && v.chart.xAxis[0]) {
                v.chart.xAxis[0].hideCrosshair()
            }
        } catch (error) {
            console.warn('[Performance Timeline] 툴팁 숨김 중 오류:', error)
        }
    }

    /**
     * 마우스 위치에서 시간값을 계산합니다
     * @param {MouseEvent} event - 마우스 이벤트
     * @returns {number|null} 시간값 (밀리초) 또는 null
     */
    getTimeAtMousePosition(event) {
        const v = this

        if (!v.chart || !v.chart.xAxis || !v.chart.xAxis[0]) {
            return null
        }

        try {
            const xAxis = v.chart.xAxis[0]
            const chartPosition = Highcharts.offset(v.chart.container)

            // 마우스의 차트 내 상대 위치 계산
            const mouseX = event.clientX - chartPosition.left

            // X축 좌표를 시간값으로 변환
            const timestamp = xAxis.toValue(mouseX)

            // 유효한 시간값인지 확인
            if (isNaN(timestamp) || timestamp < 0) {
                return null
            }

            return Math.round(timestamp)
        } catch (error) {
            console.warn('[Performance Timeline] 시간값 계산 중 오류:', error)
            return null
        }
    }

    reset() {
        const {chart, id} = this
        while (chart.series.length) {
            chart.series[0].remove()
        }

        const $total = $('#' + id).find(' #total')

        if ($total.text()) {
            $total.text('-')
        }
    }
}