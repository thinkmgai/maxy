class MaxyWebVital {
    constructor(options) {
        this.opts = options.opts || [] // 여러 ID를 받을 수 있도록 수정
        this.data = null
        this.charts = {} // 각 ID별 chart 저장
        this.categories = ['Actions', 'Errors', 'Resources', 'Long Tasks']

        if (!this.opts.length) {
            console.error('check parameter: opt required')
            return false
        }

        this.init().then(() => {
            this.addEventListener()
        })
    }

    async init() {
        const source = await fetch('/templates/webVital.html').then(res => res.text())
        const template = Handlebars.compile(source)

        // 차트 안에 rangeSelect 기능 구현 로직
        const rangeSelectedEvent = function () {
            // 차트 참조 및 기본 속성 설정
            const chart = this
            const renderer = chart.renderer
            const container = chart.container

            // 선택 영역 관련 요소 - 초기에는 null로 설정
            let selectionBox = null  // 선택된 영역을 표시하는 사각형
            let leftHandle = null    // 왼쪽 드래그 핸들
            let rightHandle = null   // 오른쪽 드래그 핸들
            let rangeInfoText = null // 선택 범위 정보를 표시하는 텍스트 요소
            let resetButton = null   // 초기화 버튼
            let infoContainer = null // 정보와 버튼을 담을 컨테이너

            // 드래그 상태 관리 변수
            let dragMode = null      // 드래그 모드: 'box'(새 선택), 'left'(왼쪽 핸들), 'right'(오른쪽 핸들), 'move'(선택 박스 이동)
            let dragStartX = 0       // 드래그 시작 X 좌표
            let boxOffsetX = 0       // 'move' 모드에서 클릭 지점과 박스 시작점 간의 오프셋

            // 핸들 크기 설정
            const handleWidth = 10   // 핸들의 너비

            // 정보 컨테이너 생성 함수
            const createInfoContainer = () => {
                if (!infoContainer) {
                    // 컨테이너 생성 (초기 위치는 차트 상단 중앙)
                    infoContainer = renderer.g()
                        .attr({
                            zIndex: 21
                        })
                        .add()
                }
                return infoContainer
            }

            // 초기화 버튼 생성 (컨테이너에 추가)
            const createResetButton = () => {
                if (!resetButton) {
                    const darkYn = sessionStorage.getItem('maxyDarkYn')
                    let img = darkYn === 'Y' ? '/images/maxy/dark-icon-reset.svg' : '/images/maxy/icon-reset.svg'

                    // 이미지 버튼 생성
                    resetButton = renderer.image(
                        // 이미지 경로, x위치, y위치, 너비, 높이
                        img, 0, 20, 16, 16
                    )
                        .attr({
                            zIndex: 20,
                            cursor: 'pointer'               // 마우스 오버 시 포인터 커서 표시
                        })
                        .css({
                            opacity: 0.8                    // 약간 투명하게 설정
                        })
                        .on('click', function () {           // 클릭 이벤트 핸들러
                            // 선택 영역 제거
                            removeSelection()

                            // 차트의 전체 범위로 이벤트 발생
                            const fullRangeMin = chart.xAxis[0].getExtremes().min || 0
                            const fullRangeMax = chart.xAxis[0].getExtremes().max

                            // 선택범위 콜백함수가 있다면 차트 전체 범위 min, max값 전달
                            if (typeof chart.options.chart.rangeSelectedCallback === 'function') {
                                chart.options.chart.rangeSelectedCallback({
                                    detail: {min: fullRangeMin, max: fullRangeMax}
                                })
                            }
                        })
                        .add(createInfoContainer())
                }
                return resetButton
            }

            // 컨테이너 위치 업데이트 함수
            const updateInfoContainerPosition = () => {
                if (selectionBox && infoContainer) {
                    const plotTop = chart.plotTop
                    const boxX = parseFloat(selectionBox.attr('x'))
                    const boxWidth = parseFloat(selectionBox.attr('width'))
                    const infoContainerWidth = infoContainer.getBBox().width

                    // 컨테이너를 선택 영역 상단 중앙에 위치시킴
                    const containerX = boxX + (boxWidth / 2) - (infoContainerWidth / 2)

                    // 컨테이너 위치 업데이트 (translate 사용)
                    infoContainer.attr({
                        translateX: containerX,
                        translateY: plotTop - 40  // 선택 영역보다 약간 더 위에 위치하도록 조정
                    })
                }
            }

            // 초기화 버튼 위치 업데이트 함수 (텍스트 길이에 따라 동적으로 위치 조정)
            const updateResetButtonPosition = () => {
                // 범위 정보 텍스트가 없으면 초기화 버튼만 생성
                if (!rangeInfoText) {
                    createResetButton()
                    return
                }

                // 텍스트 요소의 너비 계산 (getBBox 메서드 사용)
                const textBox = rangeInfoText.getBBox()
                const textWidth = textBox.width

                // 초기화 버튼이 없으면 생성
                if (!resetButton) {
                    createResetButton()
                }

                // 초기화 버튼 위치 업데이트 (텍스트 오른쪽에 10px 간격으로 배치)
                resetButton.attr({
                    x: textWidth + 10
                })
            }

            /**
             * X 좌표를 차트 영역 내로 제한하는 함수
             * @param {number} x - 원본 X 좌표
             * @return {number} - 차트 영역 내로 제한된 X 좌표
             */
            function clampX(x) {
                const minX = chart.plotLeft
                const maxX = chart.plotLeft + chart.plotWidth
                return Math.max(minX, Math.min(maxX, x))
            }

            /**
             * 핸들의 X 좌표를 유효한 범위 내로 제한하는 함수
             * @param {number} x - 원본 X 좌표
             * @param {string} side - 'left' 또는 'right' 핸들 구분
             * @return {number} - 제한된 X 좌표
             */
            function clampHandleX(x, side) {
                if (side === 'left') {
                    // 왼쪽 핸들은 오른쪽 핸들보다 최소 5px 왼쪽에 위치해야 함
                    const maxX = parseFloat(rightHandle.attr('x')) - 5  // 최소 너비 확보
                    const minX = chart.plotLeft - handleWidth  // 차트 왼쪽 경계

                    return Math.max(minX, Math.min(x, maxX))
                } else if (side === 'right') {
                    // 오른쪽 핸들은 차트 영역 내에 위치해야 함
                    const min = chart.plotLeft
                    const max = chart.plotLeft + chart.plotWidth - handleWidth
                    return Math.max(min, Math.min(x, max))
                }
            }

            /**
             * 선택 영역 생성 또는 업데이트 함수
             * @param {number} x1 - 시작 X 좌표
             * @param {number} x2 - 끝 X 좌표
             */
            const createSelection = (x1, x2) => {
                const plotHeight = chart.plotHeight
                const plotTop = chart.plotTop
                // 항상 작은 값이 x, 큰 값이 x+width가 되도록 계산
                const x = Math.min(x1, x2)
                const width = Math.abs(x2 - x1)

                // 선택 박스 생성 또는 업데이트
                if (!selectionBox) {
                    selectionBox = renderer.rect(x, plotTop, width, plotHeight)
                        .attr({fill: 'rgba(0, 120, 200, 0.2)', zIndex: 10, cursor: 'move'})
                        .add()
                } else {
                    selectionBox.attr({x, width})
                }

                // 왼쪽 핸들 생성 또는 업데이트
                if (!leftHandle) {
                    leftHandle = renderer.rect(x - handleWidth, plotTop + (plotHeight / 4), handleWidth, plotHeight / 2)
                        .attr({fill: '#007acc', cursor: 'ew-resize', zIndex: 11})
                        .add()
                } else {
                    leftHandle.attr({x: x - handleWidth})
                }

                // 오른쪽 핸들 생성 또는 업데이트
                if (!rightHandle) {
                    rightHandle = renderer.rect(x + width - handleWidth, plotTop + (plotHeight / 4), handleWidth, plotHeight / 2)
                        .attr({fill: '#007acc', cursor: 'ew-resize', zIndex: 11})
                        .add()
                } else {
                    rightHandle.attr({x: x + width})
                }

                // 컨테이너 위치 업데이트
                updateInfoContainerPosition()
            }

            // 선택 범위 정보 업데이트 함수
            const updateRangeInfo = (min, max) => {
                const minText = util.convertTime(min, true, false, true)
                const maxText = util.convertTime(max, true, false, true)
                const rangeText = `${minText} ~ ${maxText}`

                // 컨테이너 생성 (없는 경우)
                createInfoContainer()

                const darkYn = sessionStorage.getItem('maxyDarkYn')

                // 범위 정보 텍스트 생성 또는 업데이트
                if (!rangeInfoText) {
                    rangeInfoText = renderer.text(rangeText, 0, 32)  // y 좌표를 양수 값으로 설정하여 하단에 배치
                        .attr({
                            zIndex: 22,
                            align: 'left',             // 왼쪽 정렬로 변경
                            textAnchor: 'start'        // 텍스트 시작점 기준으로 위치 지정
                        })
                        .css({
                            color: (darkYn === 'Y' ? '#fff' : '#000'),
                            fontSize: '12px',
                        })
                        .add(infoContainer)
                } else {
                    rangeInfoText.attr({
                        text: rangeText
                    })
                }

                // 초기화 버튼 생성 (없는 경우) 또는 위치 업데이트
                updateResetButtonPosition()

                // 컨테이너 위치 업데이트
                updateInfoContainerPosition()
            }

            /**
             * 선택 영역 및 관련 요소 제거 함수
             */
            const removeSelection = () => {
                // 모든 선택 관련 요소 제거
                if (selectionBox) {
                    selectionBox.destroy()
                    selectionBox = null
                }
                if (leftHandle) {
                    leftHandle.destroy()
                    leftHandle = null
                }
                if (rightHandle) {
                    rightHandle.destroy()
                    rightHandle = null
                }
                if (rangeInfoText) {
                    rangeInfoText.destroy()
                    rangeInfoText = null
                }
                if (resetButton) {
                    resetButton.destroy()
                    resetButton = null
                }
                if (infoContainer) {
                    infoContainer.destroy()
                    infoContainer = null
                }

                // 드래그 모드 초기화
                dragMode = null
            }

            // resetSelection 이벤트 리스너 추가
            container.addEventListener('resetSelection', () => {
                removeSelection()
            })

            // 마우스가 차트 영역을 벗어났을 때 드래그 작업 종료
            container.addEventListener('mouseleave', () => {
                if (dragMode) {
                    // mouseup 이벤트를 프로그래밍 방식으로 발생시켜 드래그 종료
                    const mouseUpEvent = new MouseEvent('mouseup', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    })
                    container.dispatchEvent(mouseUpEvent)
                }
            })

            // 마우스 버튼을 누를 때 드래그 시작
            container.addEventListener('mousedown', (e) => {
                const coords = chart.pointer.normalize(e)
                const clickX = clampX(coords.chartX)
                const target = e.target

                // 클릭한 요소에 따라 드래그 모드 결정
                if (leftHandle && target === leftHandle.element) {
                    // 왼쪽 핸들 드래그 시작
                    dragMode = 'left'
                } else if (rightHandle && target === rightHandle.element) {
                    // 오른쪽 핸들 드래그 시작
                    dragMode = 'right'
                } else if (selectionBox && target === selectionBox.element) {
                    // 선택 박스 이동 시작
                    dragMode = 'move'
                    boxOffsetX = clickX - parseFloat(selectionBox.attr('x'))
                } else {
                    // 새로운 선택 영역 생성 시작
                    dragMode = 'box'
                    dragStartX = clickX
                }
            })

            // 마우스 이동 시 드래그 처리
            container.addEventListener('mousemove', (e) => {
                if (!dragMode) return  // 드래그 중이 아니면 무시
                if (chart.series[0].data.length === 0 && chart.series[1].data.length === 0) return // 데이터가 없으면 드래그 처리 없음

                const coords = chart.pointer.normalize(e)
                let currentX = clampX(coords.chartX)

                // 드래그 모드에 따른 처리
                if (dragMode === 'box') {
                    // 새 선택 영역 생성/업데이트
                    createSelection(dragStartX, currentX)
                } else if (dragMode === 'left') {
                    // 왼쪽 핸들 이동
                    currentX = clampHandleX(coords.chartX, 'left')
                    const rightX = parseFloat(rightHandle.attr('x'))
                    const newLeftX = clampHandleX(currentX, 'left')
                    const boxX = newLeftX + handleWidth
                    const boxWidth = rightX - boxX

                    // 너무 작은 선택 영역은 제거
                    if (boxWidth < 1) {
                        removeSelection()

                        // 차트의 전체 범위로 이벤트 발생
                        const fullRangeMin = chart.xAxis[0].getExtremes().min || 0
                        const fullRangeMax = chart.xAxis[0].getExtremes().max

                        // 선택범위 콜백함수가 있다면 차트 전체 범위 min, max값 전달
                        if (typeof chart.options.chart.rangeSelectedCallback === 'function') {
                            chart.options.chart.rangeSelectedCallback({
                                detail: {min: fullRangeMin, max: fullRangeMax}
                            })
                        }
                        return
                    }

                    // 핸들과 선택 박스 업데이트
                    leftHandle.attr({x: newLeftX})
                    selectionBox.attr({x: boxX, width: boxWidth})

                    // 컨테이너 위치 업데이트
                    updateInfoContainerPosition()
                } else if (dragMode === 'right') {
                    // 오른쪽 핸들 이동
                    const leftX = parseFloat(leftHandle.attr('x'))
                    const newRightX = clampHandleX(currentX, 'right')
                    const boxWidth = newRightX - leftX

                    // 너무 작은 선택 영역은 제거
                    if (boxWidth < 1) {
                        removeSelection()

                        // 차트의 전체 범위로 이벤트 발생
                        const fullRangeMin = chart.xAxis[0].getExtremes().min || 0
                        const fullRangeMax = chart.xAxis[0].getExtremes().max

                        // 선택범위 콜백함수가 있다면 차트 전체 범위 min, max값 전달
                        if (typeof chart.options.chart.rangeSelectedCallback === 'function') {
                            chart.options.chart.rangeSelectedCallback({
                                detail: {min: fullRangeMin, max: fullRangeMax}
                            })
                        }
                        return
                    }

                    // 핸들과 선택 박스 업데이트
                    rightHandle.attr({x: newRightX + handleWidth})
                    selectionBox.attr({width: boxWidth})

                    // 컨테이너 위치 업데이트
                    updateInfoContainerPosition()
                } else if (dragMode === 'move') {
                    // 선택 영역 전체 이동
                    const width = parseFloat(selectionBox.attr('width'))
                    let newX = clampX(currentX - boxOffsetX)

                    // 우측 경계 초과 방지
                    if (newX + width > chart.plotLeft + chart.plotWidth) {
                        newX = chart.plotLeft + chart.plotWidth - width
                    }

                    // 좌측 경계 초과 방지
                    if (newX < chart.plotLeft) {
                        newX = chart.plotLeft
                    }

                    // 선택 박스와 핸들 위치 업데이트
                    selectionBox.attr({x: newX})
                    leftHandle.attr({x: newX - handleWidth})
                    rightHandle.attr({x: newX + width})

                    // 컨테이너 위치 업데이트
                    updateInfoContainerPosition()
                }
            })

            // 마우스 버튼을 놓을 때 드래그 종료
            container.addEventListener('mouseup', (e) => {
                if (!dragMode) return
                dragMode = null

                // 선택 영역이 있으면 해당 범위의 데이터 값 계산
                if (selectionBox) {
                    const x = selectionBox.attr('x')
                    const width = selectionBox.attr('width')
                    const min = chart.xAxis[0].toValue(x)
                    const max = chart.xAxis[0].toValue(parseFloat(x) + parseFloat(width))

                    // min과 max값이 0이거나 같으면 선택안함
                    if (min === 0 && max === 0 || min === max) {
                        removeSelection()

                        // 차트의 전체 범위로 이벤트 발생
                        const fullRangeMin = chart.xAxis[0].getExtremes().min || 0
                        const fullRangeMax = chart.xAxis[0].getExtremes().max

                        // 선택범위 콜백함수가 있다면 차트 전체 범위 min, max값 전달
                        if (typeof chart.options.chart.rangeSelectedCallback === 'function') {
                            chart.options.chart.rangeSelectedCallback({
                                detail: {min: fullRangeMin, max: fullRangeMax}
                            })
                        }
                        return
                    }

                    // 선택된 범위를 활용하는 코드 추가 (콘솔 로그 대체)
                    // 예: 이벤트 발생 또는 다른 함수 호출
                    chart.selectedRange = {min, max}

                    // 선택 범위 정보 업데이트
                    updateRangeInfo(min, max)

                    // 선택범위 콜백함수가 있다면 선택범위 min, max값 전달
                    if (typeof chart.options.chart.rangeSelectedCallback === 'function') {
                        chart.options.chart.rangeSelectedCallback({
                            detail: {min, max}
                        })
                    }
                }
            })
        }

        for (const opt of this.opts) {
            const id = opt.id
            const $target = $('#' + id)
            if (!$target.length) {
                console.warn('Missing element for id:', id)
                continue
            }

            $target.empty().append(template({id}))

            this.charts[id] = Highcharts.chart(id + 'Chart', {
                chart: {
                    id: 'webVitalChart_' + id,
                    type: 'xrange',
                    marginTop: 20,
                    events: {
                        load: typeof opt['rangeSelectedCallback'] === 'function' ? rangeSelectedEvent : ''
                    },
                    // rangeSelectedCallback 여부로 rangeSelect 기능 부여
                    //events: typeof opt['rangeSelectedCallback'] === 'function' ? rangeSelectedEvent : '',
                    // rangeSelected 후 선택한 min, max값 반환
                    rangeSelectedCallback: typeof opt['rangeSelectedCallback'] === 'function' ? opt['rangeSelectedCallback'] : '',
                    spacingRight: 20 // 오른쪽 여유 공간 확보
                },
                title: null,
                exporting: {
                    enabled: false
                },
                legend: {
                    enabled: false
                },
                xAxis: {
                    type: 'datetime',
                    title: {text: ''},
                    min: 0,
                    crosshair: {
                        enabled: true,
                        snap: false,
                        zIndex: 4
                    },
                    labels: {
                        formatter: function () {
                            return util.convertTime(this.value, true, false, true)
                        }
                    }
                },
                yAxis: {
                    title: {text: ''},
                    reversed: true
                },
                tooltip: {
                    shared: false,  // 공유 툴팁 비활성화
                    formatter: function () {
                        if (this.series.type === 'scatter') {
                            return `
                                <b>${this.point.tooltip?.logTm ?? ''}</b><br>
                                <pre>${this.point.tooltip?.resMsg ?? ''}</pre>
                            `
                        }
                        return false
                    }
                },
                plotOptions: {
                    series: {
                        animation: false, // 차트 그려지는 애니메이션 끄기
                        events: {
                            // 클릭시 해당 category로 필터링
                            click: function (e) {
                                let type

                                if (Number(e.point.y) === 0) type = 'action'
                                else if (Number(e.point.y) === 1) type = 'error'
                                else if (Number(e.point.y) === 2) type = 'resource'
                                else if (Number(e.point.y) === 3) type = 'longtask'
                                else return

                                // Water Fall차트 부분 Filter 버튼 클릭
                                $('.graph_title button[data-type="' + type + '"]').trigger('click')
                            }
                        }
                    },
                    scatter: {
                        stickyTracking: false,  // 스캐터 시리즈에 대해 sticky tracking 비활성화
                        enableMouseTracking: true  // 마우스 트래킹 활성화
                    }
                },
                series: [
                    {
                        data: [],
                        minPointLength: 3,
                    },
                    {
                        type: 'scatter',
                        marker: {
                            symbol: 'circle',
                            radius: 6,
                            fillColor: 'var(--point-yellow)'
                        },
                        data: []
                    }
                ]
            })
        }
    }

    addEventListener() {
        // 전역 변수로 webVitalInstance 저장 (다른 클래스에서 접근할 수 있도록)
        window.webVitalInstance = this

        // 공통 유틸리티 사용
        ChartSyncUtils.setupCrosshairSync(
            Object.values(this.charts),
            () => {
                // newWaterfall 차트 객체들 가져오기
                const waterfallChart = window.waterfallInstance ? [window.waterfallInstance.waterfallChart] : []
                // 현재 차트 추가
                return [...waterfallChart, ...Object.values(this.charts)]
            }
        )
    }

    setData(data, params) {
        this.data = data
        for (const id of Object.keys(this.charts)) {
            const chart = this.charts[id]

            // 차트 컨테이너에 resetSelection 이벤트 발생
            const resetEvent = new CustomEvent('resetSelection')
            chart.container.dispatchEvent(resetEvent)

            this.draw(id, params)
        }
    }

    draw(id, params) {
        const chart = this.charts[id]
        const categories = this.categories

        const {performanceData, errorData, timingData} = this.data
        if (!chart || !performanceData) return

        const error = []
        const xrange = []
        let dummyData = []

        for (const item of (performanceData.click || [])) {
            xrange.push({
                x: item.startTime,
                x2: item.endTime,
                y: 0,
                color: '#9364CD'
            })
        }

        for (const item of (errorData || [])) {
            error.push({
                x: Number(item.logTm) - Number(params.pageStartTm),
                y: 1,
                tooltip: {
                    logTm: util.timestampToDateTime(item.logTm),
                    resMsg: item.resMsg
                }
            })
        }

        for (const item of (performanceData.resource || [])) {
            xrange.push({
                x: item.startTime,
                x2: item.responseEnd,
                y: 2,
                color: '#71B8E7'
            })
        }

        for (const item of (performanceData.longTask || [])) {
            xrange.push({
                x: item.startTime,
                x2: item.endTime,
                y: 3
            })
        }

        if (xrange.length !== 0 || error.length !== 0) {
            // 더미 데이터 생성 (투명하게 처리)
            dummyData = categories.map((_, index) => ({
                x: 0, // 의미 없는 시간값
                x2: 0,
                y: index,
                color: 'rgba(0,0,0,0)',
                borderColor: 'rgba(0,0,0,0)',
                enableMouseTracking: false,
                showInLegend: false,
                includeInDataExport: false
            }))
        }

        // 차트 내부에 Page Timing 항목 실선으로 발생 시간 표시
        // FCP, LCP, LT
        const plotLines = this.drawWebVitalTimingLine(timingData)

        // 웹 성능 측정 지표
        const {lcp, inp, cls} = timingData

        // LCP, CLS, INP 값에 따른 상태 표시
        const vital = {
            Lcp: (lcp != null) ? Math.round(Number(lcp) / 1000 * 1000) / 1000 : '',
            Cls: (cls != null) ? Number(cls).toFixed(4) : '',
            Inp: (inp != null) ? Math.round(Number(inp)) : '',
        }

        const status = this.getWebVitalStatus(vital)
        this.setWebvitalStatus(status)

        // web_vital_inline_box에 표시항목 추가
        // DOM Interactive, DOM Content Loaded, FCP, Loading Event, Loading Time, FID, TTFB, TBT
        this.drawWebVitalTimingBox(timingData)

        // xAxis의 max값이 plotLine값보다 작으면 plotLine이 표기되지 않음
        // xAxis.max값과 plotLineMax값을 비교해서 chart update 해주기
        let plotLineMax = 0
        for (const plotLine of plotLines) {
            if (Math.max(plotLine.value, plotLineMax) > plotLineMax) {
                plotLineMax = Math.max(plotLine.value, plotLineMax)
            }
        }

        chart.update({
            xAxis: {
                plotLines: plotLines,
                max: null // max값 초기화 안해주면 지정해준 max값으로 계속 유지됨
            },
            yAxis: {
                categories: categories
            },
            series: [
                {data: [...dummyData, ...xrange]},
                {data: error}
            ]
        })

        // xAxis의 max값 지정
        if (plotLineMax > chart.xAxis[0].max) {
            chart.xAxis[0].update({
                max: plotLineMax + 50
            })
        } else {
            chart.xAxis[0].update({
                max: chart.xAxis[0].max
            })
        }

        // 다국어 적용
        updateContent()
    }

    // 웹 바이탈 상태를 판단하여 색상 상태(green/yellow/red)로 반환하는 함수
    getWebVitalStatus(webVital) {
        const result = {}

        for (const [key, value] of Object.entries(webVital)) {
            const data = {
                value: value
            }

            // LCP 기준: 2.5 s 이하 green / 2.5 s ~ 4 s yellow / 4 s 초과 red
            if (key === 'Lcp') {
                if (value === '') data['status'] = 'none'
                else if (value <= 2.5) data['status'] = 'green'
                else if (value <= 4) data['status'] = 'yellow'
                else data['status'] = 'red'

                // CLS 기준: 0.1 이하 green / 0.1 ~ 0.25 yellow / 0.25 초과 red
            } else if (key === 'Cls') {
                if (value === '') data['status'] = 'none'
                else if (value <= 0.1) data['status'] = 'green'
                else if (value <= 0.25) data['status'] = 'yellow'
                else data['status'] = 'red'

                // INP 기준: 200 ms 이하 green / 200 ms ~ 500 ms yellow / 500 ms 초과 red
            } else if (key === 'Inp') {
                if (value === '') data['status'] = 'none'
                else if (value <= 200) data['status'] = 'green'
                else if (value <= 500) data['status'] = 'yellow'
                else data['status'] = 'red'
            }

            result[key] = data
        }

        return result
    }

    // 판단된 웹 바이탈 상태를 각 요소에 class로 적용하는 함수, 툴팁박스 생성
    setWebvitalStatus(data) {
        Object.entries(data).forEach(([key, value]) => {
            this.opts.forEach(opt => {
                const id = opt.id
                // 각 ID에 대해, 해당 key의 박스(span.bp)를 찾아 상태 클래스(bp_green, bp_yellow 등) 추가
                const $box = $('#' + id + key + 'Box')
                const $value = $('#' + id + key + 'Box span.value')
                const $bp = $('#' + id + key + 'Box span.bp')

                // 기존 툴팁 제거 후 새로 생성
                const element = document.querySelector('#' + id + key + 'Box')
                if (element && element._tippy) {
                    element._tippy.destroy()
                }

                const textGood = trl('dashboard.waterfall.good')
                const textNeedsImprovement = trl('dashboard.waterfall.needsImprovement')
                const textPoor = trl('dashboard.waterfall.poor')

                // 툴팁 새로 생성
                let status = ''
                if (key === 'Lcp') {
                    if (value['value'] <= 2.5) status = textGood
                    else if (value['value'] <= 4) status = textNeedsImprovement
                    else status = textPoor
                } else if (key === 'Cls') {
                    if (value['value'] <= 0.1) status = textGood
                    else if (value['value'] <= 0.25) status = textNeedsImprovement
                    else status = textPoor
                } else if (key === 'Inp') {
                    if (value['value'] <= 200) status = textGood
                    else if (value['value'] <= 500) status = textNeedsImprovement
                    else status = textPoor
                }

                // 기준 텍스트 구성 (기존 addEventListener 메서드의 코드 재사용)
                let criteria = ''
                let tooltipValue = ''
                let vitalDesc = ''
                if (key === 'Lcp') {
                    tooltipValue = value['value'] + 's'
                    criteria = `
                        <div class="criteria"><span class="bp bp_green">${textGood} : </span> ≤ 2.5s</div>
                        <div class="criteria"><span class="bp bp_yellow">${textNeedsImprovement} : </span> 2.5s – 4s</div>
                        <div class="criteria"><span class="bp bp_red">${textPoor} : </span> > 4s</div>
                    `
                    vitalDesc = trl('dashboard.waterfall.vitalLcpDesc')
                } else if (key === 'Cls') {
                    tooltipValue = value['value']
                    criteria = `
                        <div class="criteria"><span class="bp bp_green">${textGood} : </span> ≤ 0.1</div>
                        <div class="criteria"><span class="bp bp_yellow">${textNeedsImprovement} : </span> 0.1s – 0.25</div>
                        <div class="criteria"><span class="bp bp_red">${textPoor} : </span> > 0.25</div>
                    `
                    vitalDesc = trl('dashboard.waterfall.vitalClsDesc')
                } else if (key === 'Inp') {
                    tooltipValue = util.comma(value['value']) + 'ms'
                    criteria = `
                        <div class="criteria"><span class="bp bp_green">${textGood} : </span> <span>≤ 200ms</span></div>
                        <div class="criteria"><span class="bp bp_yellow">${textNeedsImprovement} : </span> <span>200ms – 500ms</span></div>
                        <div class="criteria"><span class="bp bp_red">${textPoor} : </span> <span> > 500ms</span></div>
                    `
                    vitalDesc = trl('dashboard.waterfall.vitalInpDesc')
                }

                if (value['status'] !== 'none') {
                    if(key === 'Cls') $value.text(value['value'])
                    else $value.text(util.comma(value['value']))

                    $bp.removeClass()
                    $bp.addClass(`bp bp_${value['status']}`)
                    $box.css('display', 'flex')

                    const msg = trl('dashboard.waterfall.vitalTooltip', [
                        key.toUpperCase(),
                        tooltipValue,
                        status
                    ])

                    tippy('#' + id + key + 'Box', {
                        content: `
                            <div class="tooltip_vital_title">${msg}</div>
                            <div class="tooltip_criteria_wrap">${criteria}</div>
                            <div class="tooltip_vital_desc">${vitalDesc}</div>
                        `,
                        arrow: false,
                        placement: 'bottom',
                        allowHTML: true,
                        theme: 'maxy-tooltip'
                    })
                } else {
                    $box.hide()
                }
            })
        })
    }

    drawWebVitalTimingLine(data) {
        const darkYn = sessionStorage.getItem('maxyDarkYn')
        let plotLines = []
        // Page Timing 항목 FCP, LCP, LoadTime
        const lineData = [
            {
                key: 'fcp',
                title: 'FCP',
                value: data.fcp,
                color: hcColors.waterfall.plotline.light.fcp,
                darkColor: hcColors.waterfall.plotline.dark.fcp,
            },
            {
                key: 'lcp',
                title: 'LCP',
                value: data.lcp,
                color: hcColors.waterfall.plotline.light.lcp,
                darkColor: hcColors.waterfall.plotline.dark.lcp,
            },
            {
                key: 'loadTime',
                title: 'Loading Time',
                value: data.loadTime,
                color: hcColors.waterfall.plotline.light.loadTime,
                darkColor: hcColors.waterfall.plotline.dark.loadTime
            },
            {
                key: 'fid',
                title: 'FID',
                value: data.fid,
                color: hcColors.waterfall.plotline.light.fid,
                darkColor: hcColors.waterfall.plotline.dark.fid
            },
            {
                key: 'ttfb',
                title: 'TTFB',
                value: data.ttfb,
                color: hcColors.waterfall.plotline.light.ttfb,
                darkColor: hcColors.waterfall.plotline.dark.ttfb
            },
            {
                key: 'fetchTime',
                title: 'Fetch',
                value: data.fetchTime,
                color: hcColors.waterfall.plotline.light.fetchTime,
                darkColor: hcColors.waterfall.plotline.dark.fetchTime
            },
            {
                key: 'dnsLookupTime',
                title: 'DNS Lookup',
                value: data.dnsLookupTime,
                color: hcColors.waterfall.plotline.light.dnsLookupTime,
                darkColor: hcColors.waterfall.plotline.dark.dnsLookupTime
            },
            {
                key: 'connectionTime',
                title: 'TCP Connection',
                value: data.connectionTime,
                color: hcColors.waterfall.plotline.light.connectionTime,
                darkColor: hcColors.waterfall.plotline.dark.connectionTime
            },
            {
                key: 'redirectTime',
                title: 'Redirect',
                value: data.redirectTime,
                color: hcColors.waterfall.plotline.light.redirectTime,
                darkColor: hcColors.waterfall.plotline.dark.redirectTime
            },
            {
                key: 'dclTime',
                title: 'DOM Content Loaded',
                value: data.dclTime,
                color: hcColors.waterfall.plotline.light.dclTime,
                darkColor: hcColors.waterfall.plotline.dark.dclTime
            },
        ]

        const validLines = []
        lineData.forEach(line => {
            if (line.value != null) {
                validLines.push({
                    color: darkYn === 'Y' ? line.darkColor : line.color,
                    value: line.value,
                    width: 1,
                    zIndex: 5,
                    label: {
                        text: line.title,
                        rotation: 0,
                        verticalAlign: 'top',
                        textAlign: 'left',
                        style: {
                            color: darkYn === 'Y' ? line.darkColor : line.color,
                            fontWeight: 'bold'
                        }
                    }
                })
            }
        })

        validLines.sort((a, b) => a.value - b.value)

        let y = 10
        validLines.forEach(line => {
            line.label.y = y
            y += 16
        })

        return validLines
    }

    drawWebVitalTimingBox(data) {
        // 웹 바이탈 메트릭 정의 - 데이터 구조화
        const metrics = [
            {
                key: 'domInteractive',
                title: 'DOM Interactive',
                value: data.domInteractive,
                color: '#888888',
                desc: trl('dashboard.waterfall.domInteractiveDesc')
            },
            {
                key: 'dcl',
                title: 'DOM Content Loaded',
                value: data.dcl,
                color: '#888888',
                desc: trl('dashboard.waterfall.dclDesc')
            },
            {key: 'fcp', title: 'FCP', value: data.fcp, color: '#888888', desc: trl('dashboard.waterfall.fcpDesc')},
            {
                key: 'loadTime',
                title: 'Loading Time',
                value: data.loadTime,
                color: '#888888',
                desc: trl('dashboard.waterfall.loadTimeDesc')
            },
            {key: 'fid', title: 'FID', value: data.fid, color: '#888888', desc: trl('dashboard.waterfall.fidDesc')},
            {key: 'ttfb', title: 'TTFB', value: data.ttfb, color: '#888888', desc: trl('dashboard.waterfall.ttfbDesc')},
            {key: 'tbt', title: 'TBT', value: data.tbt, color: '#888888', desc: trl('dashboard.waterfall.tbtDesc')}
        ]

        for (const opt of this.opts) {
            const id = opt.id
            const $webVitalInlineBox = $('#' + id + ' .web_vital_inline_box')
            $webVitalInlineBox.empty()

            // 각 메트릭에 대해 반복 처리
            metrics.forEach(metric => {
                if (metric.value != null) {
                    const $element = this.createMetricElement(metric)
                    $webVitalInlineBox.append($element)
                    this.metricTooltip(metric)
                }
            })
        }
    }

    // 메트릭 요소 생성을 위한 헬퍼 함수
    createMetricElement(metric) {
        return $(`
        <div data-key="${metric.key}">
            <span class="title" style="color: ${metric.color}">${metric.title}</span>
            <span class="text">${util.convertTime(metric.value, true, false, true)}</span>
        </div>
    `)
    }

    // event timing 툴팁 생성
    metricTooltip(metric) {
        tippy('.web_vital_inline_box div[data-key="' + metric.key + '"]', {
            content: `
                <div>${metric.desc}</div>
            `,
            arrow: false,
            placement: 'bottom',
            allowHTML: true,
            theme: 'maxy-tooltip'
        })
    }
}
