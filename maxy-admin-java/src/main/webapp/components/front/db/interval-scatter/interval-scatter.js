/*
* Page Loading Component / Response Time Scatter
* */
class MaxyFrontIntervalScatter {
    constructor(props) {
        this.id = props.id
        this.title = props.title
        this.type = props.type
        this.chart = null

        this.darkModeYn = sessionStorage.getItem('maxyDarkYn')
        this.data = []
    }

    async init() {
        const v = this
        const {id, title, type} = v

        const source = await fetch(
            '/components/front/db/interval-scatter/interval-scatter.html'
        ).then(response => response.text())
        const template = Handlebars.compile(source)
        const $target = $('#' + id)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + id
        }

        $target.empty()
        $target.append(template({id, title, type}))

        let comment
        if (type === 'loading') {
            comment = trl('dashboard.component.desc.frontloadingtimescatter')
        } else {
            comment = trl('dashboard.component.desc.frontresponsetimescatter')
        }

        tippy('#' + id + ' .ic_question', {
            content: comment,
            placement: 'bottom',
            allowHTML: true,
            arrow: false,
            theme: 'maxy-tooltip'
        })

        v.initChart()
    }

    initChart() {
        const v = this

        let tooltipTitle
        if (v.type === 'loading') {
            tooltipTitle = 'Loading Time: '
        } else {
            tooltipTitle = 'Response Time: '
        }

        const chartOptions = {
            chart: {
                type: 'scatter',
                zoomType: 'xy',
                events: {
                    selection: function (e) {
                        // 기본 줌인 동작을 방지합니다.
                        e.preventDefault()

                        return v.selectPointsByDrag(e, this)
                    }
                }
            },
            legend: {
               enabled: false
            },
            boost: {
                useGPUTranslations: true,
                usePreAllocated: true
            },
            tooltip: {
                useHTML: true, // HTML을 사용하여 툴팁을 렌더링
                formatter: function () {
                    // this.x, this.y는 point의 값
                    const date = util.timestampToDateTime(this.x)
                    const formattedY = util.comma(this.y)

                    return `<div class="front_db_tooltip">
                        <div class="title">${date}</div>
                        <div>
                            <span>${tooltipTitle}</span>
                            <span class="data">${formattedY} </span>
                            <span class="unit">ms</span>
                        </div>
                    </div>`;
                            }
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
                type: 'logarithmic',
                custom: {
                    allowNegativeLog: true // 0이 들어왔을때를 위한 custom
                },
                min: 0,
                labels: {
                    formatter: function () {
                        return util.convertTime(this.value)
                    },
                    style: {
                        color: 'black'
                    }
                },
                title: false
            }],
            title: {
                text: ''
            },
            plotOptions: {
                series: {
                    animation: false
                },
                scatter: {
                    marker: {
                        radius: 2.5,
                        states: {
                            hover: {
                                enabled: true,
                                lineColor: 'rgb(100,100,100, 0.5)'
                            }
                        }
                    },
                    states: {
                        hover: {
                            marker: {
                                enabled: false
                            }
                        }
                    },
                    jitter: {
                        x: 0.005
                    },
                }
            },
            series: []
        }
        // Loading time 일 경우 native page end 를 추가하기 때문에 series 옵션 추가

        this.chart = Highcharts.chart(v.id + '__chart', chartOptions)
    }

    selectPointsByDrag(e, t) {
        if (!e.xAxis || !e.yAxis || !t.series) {
            return
        }

        const x = e.xAxis[0], y = e.yAxis[0]

        if (!y) {
            return
        }

        const {min, max} = x
        const {min: yMin, max: yMax} = y

        const paramList = []

        // Select points
        t.series.forEach(series => {
            if (!series.points) {
                return false
            }
            const {points} = series
            points.forEach(point => {
                if (point.x >= min && point.x <= max
                    && point.y >= y.min && point.y <= y.max) {

                    const {
                        reqUrl,
                        x,
                        y,
                        deviceId,
                        appVer,
                        logType,
                        comType,
                        comSensitivity,
                        cpuUsage,
                        avgCpuUsage,
                        avgComSensitivity,
                        simOperatorNm,
                        deviceModel,
                        userId,
                        userNm,
                        birthDay,
                        clientNm,
                        pageEndTm,
                        pageStartTm,
                        _id,
                        mxPageId,
                        clientNo
                    } = point
                    paramList.push({
                        reqUrl,
                        logTm: x,
                        intervaltime: y,
                        logType,
                        appVer,
                        deviceModel,
                        comType,
                        comSensitivity,
                        cpuUsage,
                        avgCpuUsage,
                        avgComSensitivity,
                        simOperatorNm,
                        deviceId,
                        userId,
                        userNm,
                        birthDay,
                        clientNm,
                        pageEndTm,
                        pageStartTm,
                        _id,
                        mxPageId,
                        clientNo
                    })
                }
            })
        })

        const options = {
            appendId: 'maxyPopupWrap',
            id: this.type + 'TimePopup',
            type: this.type === 'loading' ? 'Page Loading' : 'Response Time',
            from: Math.round(min),
            to: Math.round(max),
            logType: this.type === 'loading' ? 'page' : 'ajax',
            topChartId: this.type === 'loading' ? 'webVital' : 'responseDetail',
            botChartId: this.type === 'loading' ? 'waterfall' : 'responseChart',
            yFrom: Math.round(yMin),
            yTo: Math.round(yMax)
        }
        if (this.type === 'loading') {
            new MaxyFrontPopupPageLoading(options)
        } else if (this.type === 'response') {
            new MaxyFrontPopupAjaxResponse(options)
        }
    }

    update(data, type) {
        const v = this

        if (v.type === 'loading') {
            if (!data
                || data[0]?.pageEndTm !== data[0].pageEndTm) {
                v.setData(data)
            }
        } else if (v.type === 'response') {
            if (!data
                || data[0]?.logTm !== data[0].logTm) {
                // data 임시 저장
                v.setData(data)
            }
        }
    }

    setData(data, value) {
        const { chart, darkModeYn, type, id } = this;

        if (!chart || !chart.series || !data || data.length === 0) {
            return;
        }

        if (value && !isNaN(value)) {
            let fmtValue = Math.round(value);
            fmtValue = util.comma(fmtValue);
            $('#' + id).find('#value').text(fmtValue);
        } else if (!value) {
            $('#' + id).find('#value').text(0);
        }

        const previousData = this.data || [];
        this.data = data;

        const newData = [...data].sort((a, b) => b.y - a.y);

        // 1: bot, 2: middle, 3: top
        const q1 = [], q2 = [], q3 = [];
        const length = newData.length;
        const topN = length * 0.3;
        const minN = topN + length * 0.4;
        let cursor = 0;

        for (let el of newData) {
            if (cursor < topN) {
                q3.push(el);
            } else if (cursor < minN) {
                q2.push(el);
            } else {
                q1.push(el);
            }
            cursor++;
        }

        // --- [✅ 각 데이터별 marker.enabled를 isDummy 기준으로 설정] ---
        function withMarkerFlag(data) {
            return data.map(item => {
                const point = { ...item };
                // isDummy === true면 마커 비활성화
                if (point.isDummy) {
                    point.marker = { enabled: false };
                } else {
                    point.marker = { enabled: true };
                }
                return point;
            });
        }

        const lowData = {
            name: 'Low',
            id: 'vg' + this.id,
            data: withMarkerFlag(q1),
            marker: {
                symbol: 'square',
                fillColor: darkModeYn !== 'Y' ? hcColors.scatter.light.low : hcColors.scatter.dark.low
            },
            tooltip: { headerFormat: '', followPointer: false }
        };

        const normalData = {
            name: 'Normal',
            id: 'g' + this.id,
            data: withMarkerFlag(q2),
            marker: {
                symbol: 'square',
                fillColor: darkModeYn !== 'Y' ? hcColors.scatter.light.normal : hcColors.scatter.dark.normal
            },
            tooltip: { headerFormat: '', followPointer: false }
        };

        const highData = {
            name: 'High',
            id: 'n' + this.id,
            data: withMarkerFlag(q3),
            marker: {
                symbol: 'square',
                fillColor: darkModeYn !== 'Y' ? hcColors.scatter.light.high : hcColors.scatter.dark.high
            },
            tooltip: { headerFormat: '', followPointer: false }
        };

        let isFirst;
        if (chart.series.length === 0) {
            isFirst = true;
            chart.addSeries(lowData);
            chart.addSeries(normalData);
            chart.addSeries(highData);
        } else {
            chart.series[0].setData(withMarkerFlag(q1), false);
            chart.series[1].setData(withMarkerFlag(q2), false);
            chart.series[2].setData(withMarkerFlag(q3), false);
        }

        const series = chart.series;
        chart.redraw();

        // 새로운 데이터 중 기존에 없던 x값만 추출
        const newDataList = newData.filter(
            newPoint => !previousData.some(prevPoint => prevPoint['x'] === newPoint.x)
        );

        // 새 데이터 중 일부에 애니메이션 적용 (더미 제외)
        if (!isFirst) {
            const randomSubset = newDataList
                .filter(d => !d.isDummy)
                .sort(() => Math.random() - 0.5)
                .slice(0, Math.ceil(newDataList.length / 4));

            series.forEach(serie => {
                serie.data.forEach(point => {
                    if (point.graphic && randomSubset.some(np => np.x === point.x)) {
                        this.applyAnimation(point, serie.chart);
                    }
                });
            });
        }

        // 툴팁 동기화 재활성화
        if (this.tooltipSynchronizer && this.tooltipSynchronizer.isEnabled) {
            this._reactivateTooltipSync();
        }
    }

    applyAnimation(point, chart) {
        if (point.isAnimating) return

        const x = point.plotX + chart.plotLeft
        const y = point.plotY + chart.plotTop

        // 포인트 크기
        const radius = point.options.marker && point.options.marker.radius ? point.options.marker.radius : 6
        const pointWidth = radius * 2
        const pointHeight = radius * 2

        // 초기 사각형 테두리 그리기
        const borderGraphic = chart.renderer.rect(x - radius, y - radius, pointWidth, pointHeight)
            .attr({
                stroke: point.graphic.fillColor,
                'stroke-width': 1,
                fill: 'none',
                opacity: 0.8
            })
            .add()

        // 포인트에 애니메이션 진행 중 상태 저장
        point.isAnimating = true

        // 확장 및 번쩍임 애니메이션
        borderGraphic.animate({
            width: pointWidth + 3,
            height: pointHeight + 3,
            x: x - radius - 5,
            y: y - radius - 5,
            'stroke-width': 6,
            opacity: 0
        }, {
            duration: 500,
            easing: 'easeOutCirc',
            complete: function () {
                borderGraphic.destroy()
                // 애니메이션이 끝난 상태로 플래그 리셋
                point.isAnimating = false
            }
        })
    }

    /**
     * 툴팁 동기화 기능을 활성화합니다
     * @param {ChartTooltipSynchronizer} synchronizer - 동기화 관리자 인스턴스
     */
    enableTooltipSync(synchronizer) {
        const v = this

        if (!synchronizer || !v.chart) {
            console.warn('[차트 동기화] 동기화 관리자 또는 차트가 없습니다:', v.id)
            return
        }

        // 동기화 관리자 참조 저장
        v.tooltipSynchronizer = synchronizer

        // 차트를 동기화 관리자에 등록
        synchronizer.registerChart(v.id, v)

        // 동기화 이벤트 리스너 설정
        v._setupSyncEventListeners()
    }

    /**
     * 동기화 이벤트 리스너를 설정합니다 (내부 메서드)
     */
    _setupSyncEventListeners() {
        const v = this

        if (!v.chart || !v.chart.container) {
            console.warn('[Interval Scatter] 차트 컨테이너가 없어 이벤트 리스너 설정을 건너뜁니다:', v.id)
            return
        }

        const chart = v.chart

        // 기존 이벤트 리스너 제거 (중복 방지)
        if (v._mouseMoveEventId) {
            Highcharts.removeEvent(chart.container, 'mousemove', v._mouseMoveEventId)
        }
        if (v._mouseLeaveEventId) {
            Highcharts.removeEvent(chart.container, 'mouseleave', v._mouseLeaveEventId)
        }

        // 새로운 이벤트 리스너 생성 및 등록
        v._mouseMoveHandler = function (e) {
            if (!v.tooltipSynchronizer || !v.tooltipSynchronizer.isEnabled) {
                return
            }

            // 마우스 위치에서 시간값 계산
            const timestamp = v.getTimeAtMousePosition(e)
            if (timestamp !== null) {
                // 다른 차트들에 동기화 신호 전송
                v.tooltipSynchronizer.showTooltipsAtTime(timestamp, v.id)
            }
        }

        v._mouseLeaveHandler = function (e) {
            if (!v.tooltipSynchronizer || !v.tooltipSynchronizer.isEnabled) {
                return
            }

            // 모든 차트의 툴팁 숨김
            v.tooltipSynchronizer.hideAllTooltips(v.id)
        }

        // Highcharts 이벤트 등록
        v._mouseMoveEventId = Highcharts.addEvent(chart.container, 'mousemove', v._mouseMoveHandler)
        v._mouseLeaveEventId = Highcharts.addEvent(chart.container, 'mouseleave', v._mouseLeaveHandler)
    }

    /**
     * 동기화 기능을 재활성화합니다 (데이터 업데이트 후 호출)
     */
    _reactivateTooltipSync() {
        const v = this

        if (!v.tooltipSynchronizer) {
            return
        }

        // 이벤트 리스너 재설정
        v._setupSyncEventListeners()
    }

    /**
     * 특정 시간의 툴팁을 표시합니다
     * @param {number} timestamp - 표시할 시간값 (밀리초)
     */
    showTooltipAtTime(timestamp) {
        const v = this

        if (!v.chart || !v.chart.series || !timestamp) {
            return false
        }

        // 가장 가까운 데이터 포인트 찾기 (허용 오차: 30초)
        let closestPoint = null
        let minDistance = Infinity
        const allowedTolerance = 30000 // 30초 허용 오차

        v.chart.series.forEach((series, seriesIndex) => {
            if (!series.data || series.data.length === 0) {
                return
            }

            series.data.forEach(point => {
                const distance = Math.abs(point.x - timestamp)
                if (distance < minDistance) {
                    minDistance = distance
                    closestPoint = point
                }
            })
        })

        // 허용 오차 범위 내의 포인트만 툴팁 표시
        if (closestPoint && minDistance <= allowedTolerance) {
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
    }

    /**
     * 툴팁을 숨깁니다
     */
    hideTooltip() {
        const v = this

        if (!v.chart || !v.chart.tooltip) {
            return
        }

        v.chart.tooltip.hide()
    }

    /**
     * 마우스 위치에서 시간값을 계산합니다
     * @param {Event} event - 마우스 이벤트
     * @returns {number|null} 시간값 (밀리초) 또는 null
     */
    getTimeAtMousePosition(event) {
        const v = this

        if (!v.chart || !v.chart.xAxis || !v.chart.xAxis[0]) {
            return null
        }

        try {
            const chart = v.chart
            const xAxis = chart.xAxis[0]

            // 마우스 위치를 차트 좌표로 변환
            const chartX = event.chartX || (event.offsetX - chart.plotLeft)

            // X축 좌표를 시간값으로 변환
            const timestamp = xAxis.toValue(chartX)

            // 유효한 시간값인지 확인
            if (isNaN(timestamp) || timestamp < 0) {
                return null
            }

            return Math.round(timestamp)
        } catch (error) {
            console.warn('[차트 동기화] 시간값 계산 중 오류:', error)
            return null
        }
    }

    reset() {
        const {chart, id} = this
        while (chart.series.length) {
            chart.series[0].remove()
        }

        const $value = $('#' + id).find(' #value')

        if ($value.text()) {
            $value.text('-')
        }
    }
}