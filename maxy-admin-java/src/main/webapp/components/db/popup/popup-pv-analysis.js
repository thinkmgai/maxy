/*
    종합 분석 > PV Equalizer > All 팝업
*/
class MaxyPopupPvAnalysis {
    /**
     * 생성자 함수
     * @param {Object} options - 초기화 옵션
     * @param {string} options.appendId - 팝업을 추가할 요소의 ID
     * @param {string} options.id - 팝업의 고유 ID
     * @param {Object} options.data - 초기 데이터
     */
    constructor(options) {
        this.appendId = options.appendId
        this.id = options.id
        this.data = options.data
        this.selectedRow = null
        this.dateType = 'DAY'

        // 팝업 생성 후 이벤트 리스너 추가 및 팝업 열기
        this.init().then(() => {
            this.addEventListener()
            this.openPopup()
        })
    }

    /**
     * 이벤트 리스너 등록 메서드
     */
    addEventListener() {
        const v = this

        // 딤드 영역 클릭 시 팝업 닫기
        $('.dimmed').on('click', () => {
            v.closePopup(v)
        })

        // 버튼 토글 함수 (선택된 버튼 스타일 변경)
        const toggle = (t) => {
            $(t).siblings('button').removeClass('on')
            $(t).addClass('on')
        }

        // 날짜 타입 버튼 클릭 이벤트
        $('#' + v.id + '__popup' + ' .maxy_component_btn').on('click', function () {
            // 선택된 날짜 타입 저장
            v.dateType = $(this).data('date')
            v.selectedRow = null

            // 버튼 스타일 변경
            toggle(this)

            // 선택된 날짜 타입으로 데이터 조회
            v.getPageViewInfoList(v.dateType)
        })

        // 데이터 타입 탭 클릭 이벤트 추가 (Page View, Viewer, Stay Time)
        $('#' + v.id + '__popup' + ' .type_tab').on('click', function() {
            // 선택된 탭 스타일 변경
            $(this).siblings().removeClass('selected');
            $(this).addClass('selected');

            // 선택된 탭의 데이터 타입 가져오기
            const dataType = $(this).data('type');

            // 현재 저장된 데이터셋 가져오기
            const datasets = v.currentDatasets;
            if (!datasets) return;

            // 데이터 타입에 따라 적절한 데이터셋과 시리즈 이름 선택
            let dataset, seriesName;
            switch(dataType) {
                case 'pageview':
                    dataset = datasets.viewCountDataset;  // 페이지 뷰 데이터셋
                    seriesName = 'Page View';
                    break;
                case 'viewer':
                    dataset = datasets.viewerDataset;     // 사용자 수 데이터셋
                    seriesName = 'Viewer';
                    break;
                case 'staytime':
                    dataset = datasets.intervaltimeDataset; // 체류 시간 데이터셋
                    seriesName = 'Stay Time (Avg.)';
                    break;
                default:
                    dataset = datasets.viewCountDataset;
                    seriesName = 'Page View';
            }

            // 선택된 데이터셋으로 차트 업데이트
            v.updateChart(dataset, seriesName);
        })
    }

    /**
     * 팝업 열기 메서드
     */
    openPopup() {
        const {id} = this

        // 딤드 배경 표시
        $('.dimmed').show()

        // 팝업 요소 표시
        const $target = $('#' + id + '__popup')
        $target.show()

        // 페이지 뷰 정보 리스트 조회
        this.getPageViewInfoList()
    }

    /**
     * 팝업 닫기 메서드
     * @param {Object} v - 현재 객체 인스턴스
     */
    closePopup(v) {
        const popup = '#' + v.id + '__popup'
        const span = popup + ' span'
        const $dimmed = $('.dimmed')

        // 텍스트 초기화
        $(span).text('')

        // 딤드 이벤트 제거 및 숨기기
        $dimmed.off('click')
        $dimmed.hide()

        // 팝업 숨기기
        $(popup).hide()

        // 팝업 닫을 때 커서가 보이면 없애주도록
        const $cursor = $('.maxy_cursor_dots')
        if ($cursor.css('display') === 'block') {
            cursor.hide()
        }
    }

    /**
     * 팝업 초기화 메서드
     * @returns {Promise<void>}
     */
    async init() {
        const v = this
        const {id, appendId} = v

        // HTML 템플릿 가져오기
        const source = await fetch(
            '/components/db/popup/popup-pv-analysis.html')
            .then(response => response.text())

        // Handlebars 템플릿 컴파일
        const template = Handlebars.compile(source)

        // 대상 요소 찾기
        const $target = $('#' + appendId)

        // 대상 요소가 없으면 에러 발생
        if (!($target.length > 0)) {
            throw 'can\'t find #' + appendId
        }

        // 대상 요소 비우고 템플릿 추가
        $target.empty()
        $target.append(template({id}))

        // 메인 차트 객체 생성
        this.chart = Highcharts.chart(id + 'Graph', {
            chart: {
                type: 'xrange',
                height: '100%',
            },
            legend: {
                enabled: false
            },
            xAxis: [{
                lineWidth: 0,
                tickLength: 0,
                labels: {enabled: false},
                animation: false,
                crosshair: {
                    enabled: true,
                    snap: false,
                    zIndex: 4
                },
                gridLineWidth: 0  // x축 가로 그리드 라인 제거
            }],
            yAxis: {
                labels: {
                    step: 2  // 레이블을 2칸 간격으로 표시
                },
                gridLineWidth: 1,  // y축 세로 그리드 라인 추가
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
                            enabled: false  // 흐려지는 효과 제거
                        }
                    }
                }
            },
            tooltip: {
                enabled: true,
                style: {zIndex: 99999},
                shared: false
            },
            series: [
                {
                    type: 'xrange',
                    name: '',
                    data: []
                }
            ]
        })

        // x축 차트 생성 (하단에 표시되는 눈금 차트)
        this.xAxisChart = Highcharts.chart(id + 'xAxis', {
            chart: {
                type: 'xrange',
                marginLeft: 10,
                marginBottom: 70,
                animation: false
            },
            exporting: {
                enabled: false
            },
            xAxis: {
                type: 'linear',  // 선형 축으로 설정
                min: 0,
                labels: {
                    enabled: false,  // 초기에는 레이블 비활성화
                    formatter: function() {
                        // 기본 포맷터 설정 (updateChart에서 재설정됨)
                        return this.value
                    },
                    style: {
                        fontSize: '12px'
                    }
                },
                lineWidth: 0,     // 축 선 제거 (기존 1에서 0으로 변경)
                tickLength: 0,    // 눈금 선 제거 (기존 5에서 0으로 변경)
                gridLineWidth: 0, // 그리드 선 제거 (추가)
            },
            yAxis: {
                visible: false // yAxis 숨김
            },
            credits: {enabled: false},
            legend: {enabled: false},
            plotOptions: {
                series: {
                    enableMouseTracking: false  // 마우스 이벤트 비활성화
                }
            },
            tooltip: {
                enabled: false  // 툴팁 비활성화
            },
            series: [{
                type: 'xrange',
                data: [{
                    x: 0,
                    x2: 1,
                    y: 0,
                    color: 'rgba(0,0,0,0)'  // 투명 색상
                }],
                animation: false,
                showInLegend: false
            }]
        })

        // 콘텐츠 업데이트 (외부 함수)
        updateContent()
    }

    /**
     * 원본 데이터를 차트에 사용할 수 있는 형태로 변환
     * @param {Array} data - 원본 데이터 배열
     * @returns {Object} - 변환된 데이터셋 객체
     */
    transformData(data) {
        // 세 개의 데이터셋 초기화 (사용자 수, 체류 시간, 페이지 뷰)
        const viewerDataset = [];      // 사용자 수 데이터셋
        const intervaltimeDataset = []; // 체류 시간 데이터셋
        const viewCountDataset = [];    // 페이지 뷰 데이터셋

        // 데이터 변환 - 각 항목을 세 가지 데이터셋으로 분리하여 저장
        data.forEach((item, index) => {
            // viewer(사용자 수) 데이터셋
            viewerDataset.push({
                key: item.reqUrl,       // 요청 URL (식별자로 사용)
                value: item.viewer,      // 사용자 수 값
                pageNm: item.pageNm,     // 페이지 이름
                index: index             // y축 위치를 위한 인덱스 추가
            });

            // intervaltime(체류 시간) 데이터셋
            intervaltimeDataset.push({
                key: item.reqUrl,
                value: item.intervaltime, // 체류 시간 값
                pageNm: item.pageNm,
                index: index
            });

            // viewCount(페이지 뷰) 데이터셋
            viewCountDataset.push({
                key: item.reqUrl,
                value: item.viewCount,    // 페이지 뷰 값
                pageNm: item.pageNm,
                index: index
            });
        });

        // 각 데이터셋을 value 기준으로 내림차순 정렬
        viewerDataset.sort((a, b) => b.value - a.value);
        intervaltimeDataset.sort((a, b) => b.value - a.value);
        viewCountDataset.sort((a, b) => b.value - a.value);

        // 세 가지 데이터셋을 객체로 반환
        return {
            viewerDataset,       // 사용자 수 데이터셋
            intervaltimeDataset, // 체류 시간 데이터셋
            viewCountDataset     // 페이지 뷰 데이터셋
        };
    }

    /**
     * 공통 파라미터 생성 메서드
     * @param {string} [customDateType] - 사용자 지정 날짜 타입 (선택적)
     * @returns {Object} - API 호출용 파라미터 객체
     */
    getCommonParams(customDateType) {
        const params = {
            packageNm: $('#packageNm').val(),
            serverType: $('#packageNm option:checked').data('server-type'),
            osType: $('#osType').val(),
            dateType: this.dateType
        }

        // 사용자 지정 날짜 타입이 있으면 덮어쓰기
        if (customDateType) {
            params.dateType = customDateType
        }

        return params
    }

    /**
     * 페이지 뷰 정보 리스트 조회
     * @param {string} [dateType] - 날짜 타입 (선택적)
     */
    getPageViewInfoList(dateType) {
        const v = this
        const param = v.getCommonParams(dateType)

        ajaxCall('/db/0100/getPageViewInfoList.maxy', param,
            {disableDimmed: true})
            .then(data => {
                if (data.length > 0) {
                    const processedData = v.addPageNmToList(data)
                    v.originalData = processedData // 처리된 데이터를 originalData로 설정
                    const length = data.length

                    $('#listCnt').text(' (' + util.comma(length) + (length >= 500 ? '+' : '') + ')')

                    // 새로운 데이터셋 생성
                    const datasets = v.transformData(processedData)
                    v.currentDatasets = datasets // 데이터셋 저장

                    // 현재 선택된 탭 확인
                    const selectedTab = $('#' + v.id + '__popup' + ' .type_tab.selected');
                    const dataType = selectedTab.data('type');

                    // 선택된 탭에 따라 적절한 데이터셋과 시리즈 이름 가져오기
                    const { dataset, seriesName } = v.getDatasetByType(datasets, dataType)

                    // 선택된 탭의 데이터셋으로 차트 업데이트
                    v.updateChart(dataset, seriesName)
                }
                // 차트 데이터 조회
            })
            .catch((e) => {
                console.log(e)
            })
    }

    /**
     * 선택된 탭 유형에 따라 적절한 데이터셋과 시리즈 이름을 반환합니다.
     * @param {Object} datasets - 변환된 데이터셋 객체
     * @param {string} dataType - 선택된 탭 유형
     * @returns {Object} - 선택된 데이터셋과 시리즈 이름을 포함하는 객체
     */
    getDatasetByType(datasets, dataType) {
        switch(dataType) {
            case 'pageview':
                return {
                    dataset: datasets.viewCountDataset,
                    seriesName: 'Page View'
                };
            case 'viewer':
                return {
                    dataset: datasets.viewerDataset,
                    seriesName: 'Viewer'
                };
            case 'staytime':
                return {
                    dataset: datasets.intervaltimeDataset,
                    seriesName: 'Stay Time (Avg.)'
                };
            default:
                return {
                    dataset: datasets.viewCountDataset,
                    seriesName: 'Page View'
                };
        }
    }

    /**
     * 차트 데이터 준비 메서드
     * @param {Array} dataset - 원본 데이터셋
     * @param {string} seriesName - 시리즈 이름
     * @returns {Object} - 차트 데이터 객체
     */
    prepareChartData(dataset, seriesName) {
        // 데이터셋에서 카테고리 배열 생성
        const categories = dataset.map(d => {
            return d.pageNm || d.key;
        });

        // Stay Time (Avg.) 탭인 경우 시간 형식으로 변환
        const isStayTime = seriesName === 'Stay Time (Avg.)'

        // xrange 차트용 데이터 포맷으로 변환
        const seriesData = dataset.map((d, i) => {
            // 색상 설정 (선택적)
            let color;
            if (seriesName === 'Page View') {
                color = '#9AAAD8'; // 페이지 뷰용 색상
            } else if (seriesName === 'Viewer') {
                color = '#B3CF95'; // 사용자 수용 색상
            } else if (seriesName === 'Stay Time (Avg.)') {
                color = '#AB85D4'; // 체류 시간용 색상
            }

            return {
                x: 0,                // 시작 위치 (0에서 시작)
                x2: d.value,         // 끝 위치 (값까지)
                y: i,                // y축 위치 (인덱스)
                name: categories[i], // 이름 (페이지 이름)
                color: color,        // 색상
                originalValue: d.value // 원본 값 저장 (툴팁에서 사용)
            };
        });

        return {
            categories,
            seriesData,
            isStayTime
        };
    }

    /**
     * 차트 높이 계산 메서드
     * @param {number} dataLength - 데이터 길이
     * @returns {Object} - 높이 관련 정보
     */
    calculateChartHeight(dataLength) {
        const rowHeight = 30 // 한 줄당 높이 (px)
        let totalHeight;

        // 컨테이너 높이 계산 (graph_wrap_inner의 실제 높이)
        const containerHeight = $('.graph_wrap_inner').height();

        // 최소 차트 높이를 컨테이너 높이의 80%로 설정 (또는 원하는 비율로 조정)
        const minChartHeight = Math.max(containerHeight, 300); // 최소 300px 또는 컨테이너 높이의 80%

        if (dataLength <= 1) {
            totalHeight = rowHeight; // 데이터가 1개일 때는 기본 높이만 설정
        } else {
            totalHeight = dataLength * rowHeight; // 여러 개일 때는 기존 방식대로 계산
        }

        if (totalHeight < minChartHeight) {
            totalHeight = minChartHeight
        }

        return {
            rowHeight,
            totalHeight,
            minChartHeight
        };
    }

    /**
     * 리스트 UI 업데이트 메서드
     * @param {Array} dataset - 데이터셋
     * @param {Array} categories - 카테고리 배열
     */
    updateListUI(dataset, categories) {
        // 리스트 요소 선택자 수정 및 초기화
        const $listContainer = $('#pvAnalysisList');
        $listContainer.empty(); // 기존 항목 제거

        for (let i = 0; i < categories.length; i++) {
            $listContainer.append(
                `<div class="pv_row" data-req-url="${dataset[i].key}" title="${categories[i]}">
                    <span class="name">${categories[i]}</span>
                </div>`
            );
        }
    }

    /**
     * 메인 차트 설정 업데이트
     * @param {Array} categories - 카테고리 배열
     * @param {Array} seriesData - 시리즈 데이터
     * @param {number} totalHeight - 전체 높이
     * @param {number} rowHeight - 행 높이
     * @param {number} minChartHeight - 최소 차트 높이
     * @param {boolean} isStayTime - 체류 시간 모드 여부
     */
    updateMainChart(categories, seriesData, totalHeight, rowHeight, minChartHeight, isStayTime) {
        this.chart.update({
            chart: {
                height: totalHeight,
                marginTop: 0,
                marginBottom: 0,  // 하단 여백 제거 (x축 차트가 표시할 것이므로)
                scrollablePlotArea: {
                    minHeight: totalHeight
                },
                // 데이터가 1개일 때 하단 여백 줄이기
                spacingBottom: categories.length <= 1 ? 5 : 10
            },
            boost: {
                enabled: false  // boost 옵션 비활성화 시도
            },
            xAxis: {
                type: 'linear',
                min: 0,
                max: Math.max(...seriesData.map(d => d.x2)) * 1.05,  // 최대값에 여유 추가
                labels: {
                    enabled: false  // 메인 차트의 x축 레이블 비활성화 (하단 차트에서 표시)
                },
                gridLineWidth: 1  // 세로 그리드 라인 추가
            },
            yAxis: {
                type: 'category',
                categories: categories,
                reversed: true,
                labels: {
                    enabled: false
                },
                staticScale: rowHeight,
                gridLineWidth: 0,  // 가로 그리드 라인 제거
                min: 0,
                max: Math.max(categories.length - 1, Math.floor(minChartHeight / rowHeight) - 1)
            },
            tooltip: {
                formatter: function() {
                    // 모든 탭에서 originalValue 사용
                    const value = this.point.originalValue

                    if (isStayTime) {
                        return `${this.point.name}: <b>${util.convertTime(value, true, false, true)}</b>`
                    } else {
                        return `${this.point.name}: <b>${util.comma(value)}</b>`
                    }
                }
            },
            plotOptions: {
                series: {
                    pointWidth: 20, // 막대 높이 설정
                    borderRadius: 3, // 막대 모서리 둥글게
                    colorByPoint: false // 각 포인트마다 다른 색상 사용 안 함
                }
            }
        }, false);
    }

    /**
     * X축 차트 업데이트 메서드
     * @param {Array} seriesData - 시리즈 데이터
     * @param {boolean} isStayTime - 체류 시간 모드 여부
     */
    updateXAxisChart(seriesData, isStayTime) {
        const maxValue = Math.max(...seriesData.map(d => d.x2)) * 1.05;  // 최대값에 여유 추가

        this.xAxisChart.update({
            xAxis: {
                type: 'linear',
                min: 0,
                max: maxValue,
                tickPositioner: function() {
                    // 기본 틱 위치 가져오기
                    const defaultPositions = this.getLinearTickPositions(
                        this.tickInterval,
                        this.min,
                        this.max
                    );

                    // 정수 값만 필터링하고 중복 제거
                    const uniquePositions = [];
                    const seen = new Set();

                    defaultPositions.forEach(pos => {
                        const intValue = Math.floor(pos);
                        if (!seen.has(intValue)) {
                            seen.add(intValue);
                            uniquePositions.push(intValue);
                        }
                    });

                    return uniquePositions;
                },
                labels: {
                    enabled: true,  // 데이터 로드 시 레이블 활성화
                    formatter: function() {
                        if (isStayTime) {
                            return util.convertTime(this.value, true, false, true);
                        } else {
                            // 정수로 변환 후 콤마 포맷팅 적용
                            return util.comma(Math.floor(this.value));
                        }
                    },
                    style: {
                        fontSize: '12px'
                    }
                }
            }
        }, false);
    }

    /**
     * 차트 업데이트 함수
     * @param {Array} dataset - 원본 데이터셋
     * @param {string} seriesName - 시리즈 이름
     */
    updateChart(dataset, seriesName) {
        // 차트 데이터 준비
        const { categories, seriesData, isStayTime } = this.prepareChartData(dataset, seriesName);

        // 차트 높이 계산
        const { rowHeight, totalHeight, minChartHeight } = this.calculateChartHeight(dataset.length);

        // 리스트 UI 업데이트
        this.updateListUI(dataset, categories);

        // 메인 차트 설정 업데이트
        this.updateMainChart(categories, seriesData, totalHeight, rowHeight, minChartHeight, isStayTime);

        // 시리즈 데이터 업데이트
        this.chart.series[0].update({
            name: seriesName,
            data: seriesData
        }, false);

        // 하단 x축 차트 업데이트
        this.updateXAxisChart(seriesData, isStayTime);

        // 차트 다시 그리기
        this.chart.redraw();
        this.xAxisChart.redraw();
    }

    /**
     * 페이지 뷰 상세 정보 조회
     * @param {string} reqUrl - 요청 URL
     */
    getPageViewInfoDetail(reqUrl) {
        // 공통 파라미터 가져오기
        const param = this.getCommonParams()
        // 요청 URL 추가
        param.reqUrl = reqUrl

        ajaxCall('/db/0100/getPageViewInfoDetail.maxy', param)
            .then(data => {
                this.drawChart(data)
            })
            .catch((e) => {
                console.log(e)
            })
    }

    /**
     * 데이터 리스트에 페이지 이름 추가 및 정렬
     * @param {Array} data - 원본 데이터 배열
     * @returns {Array} - 페이지 이름이 추가된 정렬된 데이터 배열
     */
    addPageNmToList(data) {
        // 데이터가 없으면 처리하지 않음
        if (!data) {
            return
        }

        // 원본 데이터 복사 (원본 데이터 변경 방지)
        const newList = [...data]

        // 패키지명과 서버 타입 가져오기
        const packageNm = $('#packageNm').val()
        const serverType = $('#packageNm option:checked').data('server-type')

        // 각 항목에 페이지 이름 추가
        newList.forEach((item) => {
            item.pageNm = getPageList(packageNm, serverType, item.reqUrl)
        });

        return newList
    }

    /**
     * 상세 정보 차트 그리기
     * @param {Array} data - 상세 정보 데이터
     */
    drawChart(data) {
        const {dateType} = this

        // 차트에 보여줄 데이터에 맞는 형식으로 변환
        let xAxisData = []  // x축 데이터 (시간/날짜)
        let viewData = []   // 페이지 뷰 데이터
        let viewerData = [] // 사용자 수 데이터
        let time = ''

        // 데이터 변환 및 배열에 추가
        for (let i in data) {
            // 날짜 타입에 따라 시간 형식 변환
            if (dateType === 'DAY') {
                // datetype이 day인 경우 hh:mm 형식으로 변환
                time = util.timestampToTime(data[i].time, true)
            } else if (dateType === 'WEEK' || dateType === 'MONTH') {
                // week 또는 month인 경우 yy-mm-dd 형식으로 변환
                time = util.timestampToDate(data[i].time)
            }

            // 변환된 데이터를 각 배열에 추가
            xAxisData.push(time)           // x축 데이터 추가
            viewData.push(data[i].viewCount) // 페이지 뷰 데이터 추가
            viewerData.push(data[i].viewer)  // 사용자 수 데이터 추가
        }

        // 차트 업데이트
        this.chart.xAxis[0].categories = xAxisData  // x축 카테고리 설정
        this.chart.series[0].setData(viewData)      // 페이지 뷰 시리즈 데이터 설정
        this.chart.series[1].setData(viewerData)    // 사용자 수 시리즈 데이터 설정
    }
}
