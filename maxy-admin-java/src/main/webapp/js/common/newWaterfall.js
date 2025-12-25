class newWaterfall {
    constructor(props) {
        this.id = props.id
        this.chart = null
        this.waterfallTimeChart = null // 상단 타임라인 차트
        this.waterfallChart = null     // 메인 워터폴 차트
        this.lastScrollPosition = 0    // 마지막 스크롤 위치 저장 변수 추가
        this.resourceData = null
        this.timeData = null
        this.allRequestCount = null
        this.type = 'all' // 기본값을 'all'로 설정

        // 타입별로 필터링된 데이터를 저장할 객체 추가
        this.filteredDataByType = {}

        // 선택된 범위를 저장할 속성
        this.selectedMin = null
        this.selectedMax = null

        this.init().then(() => {
            this.addEventListener()
        })
    }

    async init() {
        const {id} = this

        const source = await fetch(
            '/templates/waterfall.html'
        ).then(response => response.text())
        const template = Handlebars.compile(source)
        const $target = $('#' + id)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + id
        }

        $target.empty()

        $target.append(template({id}))
        this.initCharts()
    }

    activeTab() {
        const v = this
        try {
            // 데이터 없을시 type 탭 버튼 비활성처리
            const graphTitleDiv = document.querySelector('.graph_title')
            const buttons = graphTitleDiv.querySelectorAll('button')

            const filteredData = Object.entries(v.filteredDataByType)

            buttons.forEach((button) => {
                const buttonType = button.dataset.type

                if (buttonType === 'all') {
                    button.disabled = false
                    button.classList.add('exist')
                    return // 이후 로직은 건너뜀
                }

                const isActive = filteredData.some(tab => buttonType && tab[0] === buttonType && tab[1] && tab[1].length > 0)

                if (isActive) {
                    button.disabled = false
                    button.classList.add('exist')
                } else {
                    button.disabled = true
                    button.classList.remove('exist')
                }
            })
        } catch (e) {
            console.log(e)
        }
    }

    addEventListener() {
        const v = this
        // 전역 변수로 waterfallInstance 저장 (다른 클래스에서 접근할 수 있도록)
        window.waterfallInstance = this

        // 공통 유틸리티 사용
        ChartSyncUtils.setupCrosshairSync(
            this.waterfallChart,
            () => {
                // webVital 차트 객체들 가져오기
                const webVitalCharts = window.webVitalInstance ? Object.values(window.webVitalInstance.charts) : []
                // 현재 차트 추가
                return [...webVitalCharts, this.waterfallChart]
            }
        )

        // 기존 이벤트 제거 (같은 ID에 대한 이벤트가 있을 경우)
        $(document).off('click.waterfall-' + v.id, '#' + v.id + ' .graph_title button');

        // waterfall 차트 내 initiator type 탭 버튼 클릭 이벤트
        $(document).on('click.waterfall-' + v.id, '#' + v.id + ' .graph_title button', function () {
            $('.graph_title button').removeClass('selected')

            $(this).addClass('selected')

            const initiatorType = $(this).data('type')

            // 가능한 타입 매핑
            const validTypes = [
                'all', 'resource', 'reformNavigation', 'xhr',
                'css', 'script', 'link', 'font', 'img',
                'manifest', 'media', 'ws', 'longtask',
                'action', 'error'
            ]

            // 타입이 유효하면 그대로 할당, 아니면 'other'
            v.type = validTypes.includes(initiatorType) ? initiatorType : 'other'

            // v.resourceData, v.timeData에 데이터 갱신 안 함 !!
            v.setChartData(null, false)
        })
    }

    /**
     * Highcharts 차트 객체 생성
     * waterfallTimeChart: 상단 타임라인 차트
     * waterfallChart: 메인 워터폴 차트
     */
    initCharts() {
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
            }
        }

        // xAxis 설정을 공통으로 사용하기 위해 먼저 정의
        const commonXAxisConfig = {
            type: 'datetime',
            title: {text: ''},
            lineWidth: 0,      // ← 검은 라인 제거
            tickLength: 0,
            min: 0,
            max: '',
            labels: {
                formatter: function () {
                    return util.convertTime(this.value, true, false, true)
                },
                enabled: true,
                style: {
                    fontSize: '12px'
                }
            },
            tickPixelInterval: 150,
            gridLineWidth: 1,
            crosshair: true,
            animation: false
        }

        // waterfall time chart 생성
        this.waterfallTimeChart = Highcharts.chart(this.id + '__time', {
            chart: {
                type: 'xrange',
                marginLeft: 460,
                marginTop: -10,
                animation: false
            },
            exporting: {
                enabled: false
            },
            title: null,
            xAxis: commonXAxisConfig, // 공통 xAxis 설정 사용
            yAxis: {
                visible: false
            },
            credits: {enabled: false},
            legend: {enabled: false},
            series: [{
                data: [],
                animation: false
            }]
        })

        // waterfall data chart 생성
        this.waterfallChart = Highcharts.chart(this.id + '__waterfall',
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
                    enabled: false,
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
                        name: 'Resources',
                        tooltip: {
                            headerFormat: '',
                            pointFormatter: function () {
                                const c = this.custom
                                const start = Math.max(0, c?.startTime ?? 0)
                                const end = c?.endTime ?? 0
                                const duration = end - start

                                let tooltip = `<div class="tooltip_waterfall">`  // 글씨 크기와 기본 스타일 추가
                                const type = c?.initiatorType || (c?.entryType === 'reformNavigation' ? 'navigation' : c?.entryType) || 'unknown'
                                tooltip += `<div>Type: ${type}</div>`
                                tooltip += `<div>Start Time: ${util.convertTime(start, true, false, true)}</div>`
                                tooltip += `<div>End Time: ${util.convertTime(end, true, false, true)}</div>`
                                tooltip += `<div>Duration: ${util.convertTime(duration, true, false, true)}</div>`
                                const urlText = c?.entryType === 'reformNavigation'
                                    ? (c?.fullUrl || '')
                                    : newWaterfall.extractFileName(c?.fullUrl || '')
                                tooltip += `<div class="waterfall_url">URL: ${urlText}</div>`
                                tooltip += `</div>`

                                return tooltip
                            }
                        },
                        borderRadius: 2,
                        minPointLength: 3,
                        data: []
                    },
                    {
                        type: 'scatter',
                        name: 'Errors',
                        tooltip: {
                            headerFormat: '',
                            pointFormatter: function () {
                                const c = this.custom

                                let tooltip = `<div class="tooltip_waterfall">`

                                // resMsg가 있으면 표시 (error 데이터일 때만 존재)
                                if (c?.resMsg) {
                                    tooltip += `<div class="bold">${util.timestampToDateTime(c.logTm)}</div>`
                                    tooltip += `<div>${c.resMsg}</div>`
                                }

                                tooltip += `</div>`

                                return tooltip
                            }
                        },
                        data: [],
                        marker: {
                            enabled: true,
                            symbol: 'circle',
                            radius: 6
                        },
                        enableMouseTracking: true,
                        stickyTracking: false,
                        states: {
                            inactive: {
                                enabled: false
                            }
                        }
                    }
                ]
            })
        )
    }

    /**
     * 데이터를 타입별로 미리 필터링하여 저장
     */
    preFilterDataByType() {
        const v = this
        const data = v.resourceData || [] // 리소스 데이터가 없을 경우 빈 배열로 초기화

        try {
            // 정의된 타입 목록 (other 제외)
            const definedTypes = [
                'all',
                'resource',
                'reformNavigation',
                'xhr', // 변경: 배열 대신 문자열 키 사용
                'css',
                'script', // js
                'link',
                'font',
                'img', // 변경: 배열 대신 문자열 키 사용
                'manifest',
                'media',
                'websocket', // ws
                'longtask',
                'action',
                'error'
            ]

            // other 타입을 포함한 전체 타입 목록
            const allTypes = [...definedTypes, 'other']

            // 각 타입별로 데이터 필터링하여 저장
            allTypes.forEach(type => {
                // 실제 필터링에 사용할 타입 값 설정
                let filterType = type;

                // 특수 케이스 처리
                if (type === 'xhr') {
                    filterType = ['xmlhttprequest', 'fetch'];
                } else if (type === 'img') {
                    filterType = ['img', 'image'];
                } else if (type === 'media') {
                    filterType = ['video', 'audio'];
                } else if (type === 'action') {
                    filterType = ['action', 'event'];
                }

                // 임시로 현재 타입 설정
                const originalType = v.type
                v.type = filterType

                // 필터링 수행 (시간 범위는 아직 적용하지 않음)
                v.filteredDataByType[type] = data.filter(d => {
                    // 'all' 타입인 경우 모든 데이터 반환
                    if (type === 'all') {
                        return true
                    }

                    // 'resource' 타입인 경우 entryType이 resource인 데이터만 필터링
                    if (type === 'resource') {
                        return d.entryType === 'resource'
                    }

                    // 'error' 타입의 로그 항목 처리
                    if (d.entryType === 'error') {
                        return (
                            type === 'all' ||
                            type === 'error' ||
                            (Array.isArray(filterType) && filterType.includes('error'))
                        )
                    }

                    // 'other' 타입 처리 - 정의되지 않은 모든 타입을 포함
                    if (type === 'other') {
                        // entryType 기준으로 정의되지 않은 타입들 확인
                        const definedEntryTypes = ['resource', 'reformNavigation', 'longtask', 'event', 'error']
                        const definedInitiatorTypes = ['xmlhttprequest', 'fetch', 'css', 'script', 'link', 'font', 'img', 'image', 'manifest', 'video', 'audio', 'websocket', 'action']

                        // entryType이 정의되지 않은 경우이거나, initiatorType이 정의되지 않은 경우
                        const isUndefinedEntryType = !definedEntryTypes.includes(d.entryType)
                        const isUndefinedInitiatorType = d.entryType === 'resource' && !definedInitiatorTypes.includes(d.initiatorType)

                        return isUndefinedEntryType || isUndefinedInitiatorType
                    }

                    // entryType으로 직접 필터링할 수 있는 항목 리스트 정의
                    const entryTypeTargets = ['longtask', 'event', 'reformNavigation', 'error']

                    // entryType을 기준으로 필터링할 타입 리스트 생성
                    const entryTypeList = Array.isArray(filterType) ? filterType.filter(t => entryTypeTargets.includes(t)) : (entryTypeTargets.includes(filterType) ? [filterType] : [])

                    // entryType 기준에 해당하지 않는 나머지는 initiatorType으로 판단
                    const initiatorTypeList = Array.isArray(filterType) ? filterType.filter(t => !entryTypeTargets.includes(t)) : (!entryTypeTargets.includes(filterType) ? [filterType] : [])

                    // 타입 조건 확인
                    const matchByEntryType = entryTypeList.includes(d.entryType) // entryType이 일치하는 경우
                    const matchByInitiator = initiatorTypeList.includes(d.initiatorType) // initiatorType이 일치하는 경우

                    return matchByEntryType || matchByInitiator
                })

                // 원래 타입으로 복원
                v.type = originalType
            })
        } catch (e) {
            console.log(e)
        }
    }

    /**
     * 시간 범위에 따라 미리 필터링된 데이터를 추가로 필터링
     */
    getFilteredDataByTimeRange(min, max) {
        const v = this

        try {
            // 현재 선택된 타입에 해당하는 데이터 가져오기
            const typeKey = Array.isArray(v.type) ? v.type[0] : v.type
            const filteredData = v.filteredDataByType[typeKey] || []

            // 시간 범위 필터링
            return filteredData.filter(d => v.isInTimeRange(d, min, max))
        } catch (e) {
            console.log(e)
        }
    }

    /**
     * 주어진 데이터로 워터폴 차트를 갱신하고 Y축 정보를 구성합니다.
     *
     * @param {Object} data - 웹 퍼포먼스 데이터 객체
     * @param {boolean} isDrag - 사용자가 Web Vital 차트에서 특정 영역을 드래그하여 필터링한 경우 여부
     */
    setChartData(data, isDrag) {
        const v = this

        // y축 그리드 및 차트 초기화
        const $yAxisList = $('#waterfallYaxisList')

        // y축 그리드 헤더
        const $yAxisHeader = $('.yaxis_header')
        // y축 그리드와 차트가 표시될 래퍼
        const $waterfallWrapper = $('.waterfall_chart')

        $yAxisList.empty() // y축 카테고리 초기화

        // data가 유효한 객체인지 먼저 확인
        if (data && typeof data === 'object' && Array.isArray(data['resource'])) {
            v.resourceData = data['resource']
            // 새로운 데이터가 들어왔을 때 타입별로 미리 필터링
            v.preFilterDataByType()
            v.activeTab()
        }

        if (data && typeof data === 'object' && typeof data['time'] === 'object' && !Array.isArray(data['time'])) {
            v.timeData = data['time']
        }

        let filteredData
        // isDrag가 true인 경우, 해당 min max 값을 사용하여 데이터 필터링 된 값이 들어오므로 건너뜀
        if (!isDrag) {
            // 저장된 min, max 값이 있으면 사용
            filteredData = v.getFilteredDataByTimeRange(v.selectedMin, v.selectedMax)
        } else {
            //v.resourceData = data
            filteredData = data
        }

        // 데이터 유효성 검사
        if (!filteredData || filteredData.length === 0) {
            v.resetChart()
            return
        }

        // no data 클래스 제거, 스크롤바 생성
        $waterfallWrapper.removeClass('no_data')
        $waterfallWrapper.addClass('enable_scrollbar')
        $yAxisHeader.removeClass('hide')

        // 데이터를 파싱하여 차트에 표시할 작업 목록 생성
        const tasks = []
        let baseTime = null
        let idCounter = 0

        // 현재 스크롤 위치 저장 (차트가 이미 존재하는 경우)
        if (v.waterfallChart && v.waterfallChart.scrollablePlotArea) {
            v.lastScrollPosition = v.waterfallChart.scrollablePlotArea.scrollPositionY
        }

        // 차트 데이터 초기화
        if (v.waterfallChart && v.waterfallChart.series[0]) {
            v.waterfallChart.series[0].setData([])
        }

        // baseTime이 없을 경우 fallback 처리
        for (const item of filteredData) {
            // 정의된 entryType 목록
            const definedEntryTypes = ['resource', 'reformNavigation', 'longtask', 'event', 'error']

            // 정의되지 않은 entryType은 other로 처리하여 포함
            if (!definedEntryTypes.includes(item.entryType)) {
                // other 타입으로 처리하되, baseTime 계산에는 포함
            }

            const start = item.startTime < 0 ? 0 : item.startTime
            if (start == null) continue

            if (!baseTime || start < baseTime) {
                baseTime = start
            }
        }

        // 차트에 표시할 task 데이터 생성
        for (const item of filteredData) {
            // 정의된 entryType 목록
            const definedEntryTypes = ['resource', 'reformNavigation', 'longtask', 'event', 'error']

            // 정의되지 않은 entryType은 other로 처리하여 포함
            let processedEntryType = item.entryType
            if (!definedEntryTypes.includes(item.entryType)) {
                processedEntryType = 'other'
            }

            const start = item.startTime

            // enrtyType이 longTask거나 event인 경우, endTime이 안 들어오므로 startTime + duration으로 계산
            // other 타입의 경우도 duration을 사용하도록 처리
            const end = (item.entryType === 'longtask'
                || item.entryType === 'event'
                || item.entryType === 'error'
                || processedEntryType === 'other')
                ? item.startTime + (item.duration || 0)
                : item.responseEnd

            if (start == null || end == null) continue

            // 차트에 보여줄 데이터 생성하기
            tasks.push({
                id: `r${idCounter++}`,  // 고유한 값
                name: newWaterfall.extractFileName(item.name || item.entryType),
                x: start,
                x2: end,
                y: undefined,
                color: newWaterfall.getColor(item.entryType),
                custom: {
                    fullUrl: item.entryType === 'reformNavigation' ? item.url : item.name,
                    duration: (end - start).toFixed(2),
                    initiatorType: item.initiatorType,
                    startTime: start,
                    endTime: end,
                    entryType: item.entryType,
                    transferSize: item.transferSize || 0,
                    statusCode: item.responseStatus ?? '-',
                    ...(item.entryType === 'error' ? {resMsg: item.resMsg || '', logTm: item.logTm} : {}), // error 데이터일 때만 resMsg 필드 추가
                    ...(item.mark ? {mark: item.mark} : {}), // mark가 있을 때만 mark 값 추가
                    ...(item.lcpSize ? {lcpSize: item.lcpSize} : {}) // mark가 있을 때만 mark 값 추가
                }
            })
        }


        // navigationTasks와 tasks를 합쳐서 정렬 (navigationTasks는 항상 상위에 배치)
        const baseTasks = [
            // ...navigationTasks, // 순서 유지
            ...tasks
                .map((task, index) => {
                    const isZeroDuration = task.x === task.x2
                    // Check if this is an error type task
                    const isError = task.custom?.entryType === "error"
                    if(task.custom?.entryType === 'error'){

                    }
                    return {
                        name: task.name,
                        id: task.id || `task-${index}`,
                        x: task.x,
                        x2: task.x2,
                        color: isZeroDuration && !isError ? 'transparent' : (isError ? '#FFC700' : task.color), // Red color for errors
                        custom: task.custom,
                        isError: isError, // Set isError flag based on the check
                        sortTime: task.x
                    }
                })
        ]


        // 합친 후 정렬 (navigation → task → error)
        const sortedTasks = [
            ...baseTasks
        ]

        // y 좌표 재할당
        sortedTasks.forEach((task, index) => {
            task.y = index
        })

        // maxTime 계산 (x2가 없을 경우 x 기준)
        const maxTime = Math.max(...sortedTasks.map(t => t.x2 || t.x)) + 100

        // 카테고리 생성
        const categories = sortedTasks.map(task => task.name)

        if (data?.resource?.length > 0 && !isDrag) {
            this.allRequestCount = sortedTasks.length
            $('#allRequestCount').text(util.comma(sortedTasks.length));
        }

        if ($('#allRequestCount').text() === '') {
            $('#allRequestCount').text(this.allRequestCount)
        }

        // y축 카테고리 DOM 생성
        for (let i = 0; i < sortedTasks.length; i++) {
            const row = sortedTasks[i]
            const rowData = row['custom']

            const name = row['name']
            const size = rowData['transferSize'] ? util.convertFileSize(rowData['transferSize'], 0) : 0
            const statusCode = rowData['statusCode']
            const firstDigit = Math.floor(rowData['statusCode'] / 100)
            const duration =
                rowData['duration']
                    ? util.convertTime(rowData['duration'], true, false, true)
                    : '';
            const type = (rowData['entryType'] === 'reformNavigation' || rowData['entryType'] === 'error' || rowData['entryType'] === 'longtask' || rowData['entryType'] === 'event')
                ? rowData['entryType']
                : (rowData['initiatorType'] ?? 'unknown')

            let statusClass = 'etc'

            if (firstDigit === 2) {
                statusClass = 'success'
            } else if (firstDigit === 3) {
                statusClass = 'redirect'
            } else if (firstDigit === 4) {
                statusClass = 'client_error'
            } else if (firstDigit === 5) {
                statusClass = 'server_error'
            }

            $yAxisList.append(`
                <div class="yaxis">
                   <div class="category ${typeof rowData['mark'] !== 'undefined' ? rowData['mark'] : ''}" ${rowData['entryType'] !== 'reformNavigation' ? `title="${rowData?.fullUrl || name}"` : ''}>
                       <i class="type_${type}"></i>
                        ${name}
                    </div>
                    <div class="transfer-size">${size}</div>
                    <div class="status-code">
                        <span class="${statusClass}">${statusCode}</span>
                    </div>
                    <div class="duration">${duration}</div>
                </div>
            `)

            // LCP 요소인 ROW에 Tooltip 추가
            if(typeof rowData['mark'] !== 'undefined') {
                $('.yaxis .category.lcp').prop('title', '')
                const tooltipContent = `LCP Event Information<br>Size: ${util.convertFileSize(rowData['lcpSize'], 2)}<br>Type: ${rowData['initiatorType']}<br>Url:  ${rowData?.fullUrl || name}`;

                // 새로운 tippy 인스턴스 생성
                tippy('.yaxis .category.lcp', {
                    content: tooltipContent,
                    placement: 'bottom',
                    allowHTML: true,
                    arrow: false,
                    theme: 'maxy-tooltip',
                    followCursor: true
                })
            }
        }
        // 정리된 task 리스트 전달
        v.updateCharts(sortedTasks, maxTime, categories)

    }

    /**
     * 주어진 type 조건에 따라 resourceData를 필터링하여 반환
     *
     * 예: 'css', ['xmlhttprequest', 'fetch'], 'navigation'
     * @param {number} min - 최소값 (webVital chart에서 영역 드래그했을때 받아온 시간의 최소값)
     * @param {number} max - 최대값 (webVital chart에서 영역 드래그했을때 받아온 시간의 최소값)
     */
    // filterDataByType 함수는 이제 시간 범위 필터링만 수행
    filterDataByType(min, max) {
        return this.getFilteredDataByTimeRange(min, max)
    }

    isInTimeRange(item, min, max) {
        const start = item.startTime

        // 정의된 entryType 목록
        const definedEntryTypes = ['resource', 'reformNavigation', 'longtask', 'event', 'error']
        const isOtherType = !definedEntryTypes.includes(item.entryType)

        // For error, longtask, event types and other types, use startTime + duration as the end time
        const end = (item.entryType === 'error' || item.entryType === 'longtask' || item.entryType === 'event' || isOtherType)
            ? item.startTime + (item.duration || 0)
            : item.responseEnd

        if (start == null || end == null) return false

        // 에러 항목의 경우 시작 시간이 범위 내에 있어야 함
        if (item.entryType === 'error') {
            return (min == null || start >= min) && (max == null || start <= max)
        }

        // navigation 항목(doc 탭)의 경우도 특별히 처리
        if (item.entryType === 'reformNavigation') {
            // navigation 항목은 전체 페이지 로드를 나타내므로,
            // 선택된 시간 범위와 겹치는 부분이 있으면 표시해야 함
            return (min == null || end >= min) && (max == null || start <= max)
        }

        // 다른 항목들은 기존 로직 유지
        if (min != null && end < min) return false
        if (max != null && start > max) return false

        return true
    }

    updateCharts(sortedTasks, maxTime, categories) {
        const v = this

        if (!sortedTasks || sortedTasks.length === 0) {
            console.warn("No valid data to render chart");
            v.resetChart();
            return;
        }

        // 차트가 존재하는지 확인
        if (!v.waterfallChart || !v.waterfallTimeChart) {
            console.warn("Charts not initialized, initializing now")
            v.initCharts()
        }

        // 카테고리 및 차트 높이 계산 로직 (기존 코드 유지)
        const rowHeight = 30 // 한 줄당 높이 (px)

        // 실제 카테고리 수와 최소 행 수 중 큰 값을 사용하여 총 높이 계산
        let totalHeight;
        if (categories.length <= 1) {
            totalHeight = rowHeight; // 데이터가 1개일 때는 기본 높이만 설정
        } else {
            totalHeight = categories.length * rowHeight; // 여러 개일 때는 기존 방식대로 계산
        }

        const minChartHeight = 30 // 최소 차트 높이

        if (totalHeight < minChartHeight) {
            totalHeight = minChartHeight
        }

        const $tabRequestsCount = $('#tabRequestsCount')

        // 특정 initiator type에 대한 요청 수 업데이트
        const filteredCount = sortedTasks.length
        $tabRequestsCount.text(util.comma(filteredCount) + ' /')

        if (v.waterfallChart) {
            let plotLines = []
            const darkYn = sessionStorage.getItem('maxyDarkYn')

            const lineData = [
                {
                    key: 'fcp',
                    title: 'FCP',
                    value: v.timeData.fcp ?? null,
                    color: hcColors.waterfall.plotline.light.fcp,
                    darkColor: hcColors.waterfall.plotline.dark.fcp,
                },
                {
                    key: 'lcp',
                    title: 'LCP',
                    value: v.timeData.lcp ?? null,
                    color: hcColors.waterfall.plotline.light.lcp,
                    darkColor: hcColors.waterfall.plotline.dark.lcp,
                },
                {
                    key: 'loadTime',
                    title: 'Loading Time',
                    value: v.timeData.loadTime ?? null,
                    color: hcColors.waterfall.plotline.light.loadTime,
                    darkColor: hcColors.waterfall.plotline.dark.loadTime,
                },
                {
                    key: 'fid',
                    title: 'FID',
                    value: v.timeData.fid ?? null,
                    color: hcColors.waterfall.plotline.light.fid,
                    darkColor: hcColors.waterfall.plotline.dark.fid,
                },
                {
                    key: 'ttfb',
                    title: 'TTFB',
                    value: v.timeData.ttfb ?? null,
                    color: hcColors.waterfall.plotline.light.ttfb,
                    darkColor: hcColors.waterfall.plotline.dark.ttfb,
                },
                {
                    key: 'fetchTime',
                    title: 'Fetch',
                    value: v.timeData.fetchTime ?? null,
                    color: hcColors.waterfall.plotline.light.fetchTime,
                    darkColor: hcColors.waterfall.plotline.dark.fetchTime,
                },
                {
                    key: 'dnsLookupTime',
                    title: 'DNS Lookup',
                    value: v.timeData.dnsLookupTime ?? null,
                    color: hcColors.waterfall.plotline.light.dnsLookupTime,
                    darkColor: hcColors.waterfall.plotline.dark.dnsLookupTime,
                },
                {
                    key: 'connectionTime',
                    title: 'TCP Connection',
                    value: v.timeData.connectionTime ?? null,
                    color: hcColors.waterfall.plotline.light.connectionTime,
                    darkColor: hcColors.waterfall.plotline.dark.connectionTime,
                },
                {
                    key: 'redirectTime',
                    title: 'Redirect',
                    value: v.timeData.redirectTime ?? null,
                    color: hcColors.waterfall.plotline.light.redirectTime,
                    darkColor: hcColors.waterfall.plotline.dark.redirectTime,
                },
                {
                    key: 'dclTime',
                    title: 'DOM Content Loaded',
                    value: v.timeData.dclTime ?? null,
                    color: hcColors.waterfall.plotline.light.dclTime,
                    darkColor: hcColors.waterfall.plotline.dark.dclTime,
                }
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

            // ✅ 일반 task와 error task 분리
            const xrangeData = []
            const scatterData = []

            for (const task of sortedTasks) {
                if (task.isError) {
                    scatterData.push({
                        x: task.x,
                        y: task.y,
                        name: task.name,
                        color: task.color,
                        custom: task.custom
                    })
                } else {
                    xrangeData.push({
                        id: task.id,
                        name: task.name,
                        x: task.x,
                        x2: task.x2,
                        y: task.y,
                        color: task.color,
                        custom: task.custom
                    })
                }
            }

            // ✅ 차트 업데이트
            const chartUpdateOptions = {
                chart: {
                    height: totalHeight,
                    scrollablePlotArea: {
                        minHeight: totalHeight
                    },
                    // 데이터가 1개일 때 하단 여백 줄이기
                    spacingBottom: categories.length <= 1 ? 5 : 10
                },
                boost: {
                    enabled: false  // boost 옵션 비활성화 시도
                },
                plotOptions: {
                    series: {
                        animation: false,
                        turboThreshold: 0
                    }
                },
                tooltip: {
                    enabled: true,
                    outside: true,
                    style: {zIndex: 99999},
                    useHTML: true,
                    shared: false
                },
                xAxis: {
                    type: "datetime",
                    min: v.selectedMin !== null ? v.selectedMin : 0,
                    max: v.selectedMax !== null ? v.selectedMax : maxTime,
                    labels: {enabled: false},
                    plotLines: validLines
                },
                yAxis: {
                    reversed: true,
                    gridLineWidth: 1,
                    labels: {enabled: false},
                    categories: categories,
                    staticScale: rowHeight
                },
                series: [
                    {
                        type: 'xrange',
                        pointWidth: rowHeight - 5,
                        data: xrangeData
                    },
                    {
                        type: 'scatter',
                        data: scatterData
                    }
                ]
            }

            v.waterfallChart.update(chartUpdateOptions, false, false)

            // 선택된 range가 없을때만
            let plotLineMax = 0
            if (v.selectedMin === null && v.selectedMax === null) {
                // xAxis의 max값이 plotLine값보다 작으면 plotLine이 표기되지 않음
                // xAxis.max값과 plotLineMax값을 비교해서 chart update 해주기
                for (const plotLine of validLines) {
                    if (Math.max(plotLine.value, plotLineMax) > plotLineMax) {
                        plotLineMax = Math.max(plotLine.value, plotLineMax)
                    }
                }

                // xAxis의 max값 지정
                if (plotLineMax > v.waterfallChart.xAxis[0].max) {
                    v.waterfallChart.xAxis[0].update({
                        max: plotLineMax + 50
                    })
                }
            }

            // 시간 차트 업데이트
            if (v.waterfallTimeChart) {
                if (v.selectedMin !== null && v.selectedMax !== null) {
                    v.waterfallTimeChart.xAxis[0].setExtremes(v.selectedMin, v.selectedMax)
                } else {
                    v.waterfallTimeChart.xAxis[0].setExtremes(0, maxTime)
                }

                if (plotLineMax > v.waterfallTimeChart.xAxis[0].max) {
                    v.waterfallTimeChart.xAxis[0].setExtremes(0, plotLineMax + 50)
                }
            }
        }
    }

    resetChart() {
        console.log("No data to parse")

        const v = this

        if (v.type === 'all') {
            const graphTitleDiv = document.querySelector('.graph_title')
            const buttons = graphTitleDiv.querySelectorAll('button')
            // 데이터 없을시 버튼 비활성처리
            /*buttons.forEach(button => {
                button.disabled = true
            })*/
        }
        // y축 그리드 헤더
        const $yAxisHeader = $('.yaxis_header')
        // y축 그리드와 차트가 표시될 래퍼
        const $waterfallWrapper = $('.waterfall_chart')
        // 데이터 없을땐 그리드 헤더 숨김처리
        $yAxisHeader.addClass('hide')

        // no data 문구 보여주기 위함
        $waterfallWrapper.addClass('no_data')
        // 데이터 없으므로 scrollbar 제거
        $waterfallWrapper.removeClass('enable_scrollbar')

        // 빈 데이터로 차트 업데이트
        v.waterfallChart.series[0].setData([])
        v.waterfallChart.series[1].setData([])

        // crosshair와 tooltip 제거
        v.waterfallChart.tooltip.hide(0)
        v.waterfallChart.pointer.reset()

        // x축 범위 초기화 (기존 extremes 제거)
        v.waterfallTimeChart.xAxis[0].setExtremes(null, null)

        // xAxis의 모든 plotLines 제거
        v.waterfallChart.xAxis[0].plotLinesAndBands.forEach(function (plotLine) {
            v.waterfallChart.xAxis[0].removePlotLine(plotLine.id)
        })

        // xAxis의 labels 숨기기
        v.waterfallChart.xAxis[0].update({
            labels: {
                enabled: false
            }
        })

        $('#tabRequestsCount').text('')
        $('#allRequestCount').text('')
    }

    resetSelectRange() {
        this.selectedMin = null
        this.selectedMax = null

        // 차트의 x축 범위도 초기화
        if (this.waterfallChart && this.waterfallChart.xAxis && this.waterfallChart.xAxis[0]) {
            this.waterfallChart.xAxis[0].setExtremes(null, null)
        }

        if (this.waterfallTimeChart && this.waterfallTimeChart.xAxis && this.waterfallTimeChart.xAxis[0]) {
            this.waterfallTimeChart.xAxis[0].setExtremes(null, null)
        }
    }

    /**
     * initiatorType에 따라 색상 반환
     * @param {string} type - entryType
     * @returns {string} - 색상 코드
     */
    static getColor(type) {
        switch (type) {
            case "resource":
                return "#71B8E7"
            case "longtask":
                return "#fe6a35"
            case "event":
            case "action":
                return "#9364CD"
            default:
                return "#b2df8a"
        }
    }

    static extractFileName(url) {
        if (!url) return '(unnamed)'
        const base = url.split('?')[0]
        const fileName = base.substring(base.lastIndexOf('/') + 1)

        // 파일명이 비어있으면 전체 URL 반환
        if (!fileName) {
            return url
        }

        return fileName + (url.includes('?') ? '?' + url.split('?')[1] : '')
    }
}
