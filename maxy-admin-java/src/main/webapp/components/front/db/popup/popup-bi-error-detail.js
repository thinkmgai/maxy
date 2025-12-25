/*
   종합 분석 > Basic Information > 팝업 (Error)
*/
class MaxyFrontPopupBiErrorAnalysis {
    constructor(options) {
        // 기본 속성 초기화
        this.appendId = options.appendId       // 팝업이 추가될 DOM 요소의 ID
        this.id = options.id                   // 팝업의 고유 ID
        this.title = options.title             // 팝업 제목
        this.baseDate = options.baseDate       // 기준 날짜
        this.func = options.func               // 콜백 함수
        this.summaryTitle = options.summaryTitle // 요약 제목
        this.type = options.type               // 분석 유형
        this.allTitle = options.allTitle         // 전체 분석 유형
        this.fromDate = ''                     // 시작 날짜
        this.toDate = ''                       // 종료 날짜
        this.appAvgAllUser = []                // 앱 평균 사용자 데이터 저장 배열
        this.data = null                       // 차트 데이터
        this.chart = null                      // Highchart 인스턴스

        // 필수 파라미터 검증
        if (!this.id || !this.appendId || !this.title) {
            console.log('check parameter')
            return false
        }

        // Handlebars 헬퍼 설정
        this.setHandlebarsHelper()
    }

    /**
     * 이벤트 리스너 등록
     */
    addEventListener() {
        $('.dimmed').on('click', () => {
            this.closePopup(this)
        })
    }

    /**
     * 팝업 초기화 및 렌더링
     */
    async init() {
        const {id, title, appendId, type, allTitle, summaryTitle} = this

        try {
            // HTML 템플릿 가져오기
            const source = await fetch('/components/front/db/popup/popup-bi-error-detail.html')
                .then(response => response.text())

            const template = Handlebars.compile(source)
            const $target = $('#' + appendId)

            if (!($target.length > 0)) {
                throw '대상 요소를 찾을 수 없습니다: #' + appendId
            }

            $target.empty()

            // 템플릿 렌더링
            $target.append(template({id, title, summaryTitle, allTitle}))

            // 요약 영역 그리드 설정
            $('#summaryWrap').css('grid-template-columns', 'repeat(' + type + ',1fr')

            // 팝업 방향 설정 (우측 또는 좌측)
            this.setPopupDirection(id)

            // Highchart 초기화
            this.initChart(id)
            this.initTable()

            // 캘린더 초기화
            this.initCalendar()

            // 이벤트 리스너 등록 및 팝업 열기
            this.addEventListener()
            this.openPopup()
        } catch (error) {
            console.error('팝업 초기화 오류:', error)
        }
    }

    initTable() {
        const {id} = this
        const v = this

        v.table = new Tabulator('#' + id + 'LogList', {
            layout: 'fitDataFill',
            placeholder: trl('common.msg.noData'),
            columns: [
                {
                    title: "Count",
                    field: "count",
                    width: "10%",
                    formatter: function (cell) {
                        if (cell.getValue()) {
                            return util.comma(cell.getValue())
                        } else {
                            return 0
                        }
                    }
                },
                {
                    title: "Msg",
                    width: "75%",
                    field: "msg"
                },
                {
                    title: "Rate",
                    field: "rate",
                    width: "10%",
                    formatter: function (cell) {
                        if (cell.getValue()) {
                            return v.getInteger(cell.getValue())
                        } else {
                            return 0 + '%'
                        }
                    },
                }
            ]
        })

        v.table.on('rowClick', (e, row) => {
            if (v.selectedRow) {
                v.selectedRow.getElement().classList.remove('selected_row')
            }
            row.getElement().classList.add('selected_row')
            v.selectedRow = row

            const rowData = row.getData()
            const $target = $('#' + id + 'Detail')

            // error는 필드명이 msg로 crash는 crashNm와 causeBy로 내려옴
            if (typeof rowData.msg !== 'undefined') {
                $target.val(rowData.msg)
            }
        })
    }

    /**
     * 캘린더 초기화 함수
     */
    initCalendar() {
        const {id, func} = this
        const v = this

        try {
            // 날짜 범위 설정 (기본: 어제부터 7일 전까지)
            this.toDate = util.getDate(-1)
            const calendarToDate = util.getDateToString(this.toDate)
            this.toDate = util.getDateToString(this.toDate)

            this.fromDate = util.getDate(-7)
            const calendarFromDate = util.getDateToString(this.fromDate)
            this.fromDate = util.getDateToString(this.fromDate)

            // 캘린더 초기화
            calendar.init({
                id: 'bi' + id + 'Calendar',
                checkedDate: [calendarFromDate + ':' + calendarToDate],
                fn: (dates) => {
                    $('#countErrorDetail').val('')
                    v.selectedRow = null

                    if (dates.length > 1) {
                        this.fromDate = dates[0]
                        this.toDate = dates[dates.length - 1]
                    } else {
                        this.fromDate = dates[0]
                        this.toDate = dates[0]
                    }

                    // 30일 이상은 조회 안됨
                    const period = util.getDateDiff(this.toDate, this.fromDate)

                    if (period > 30) {
                        toast(trl('common.msg.date30'))
                    } else {
                        // 서버에 보낼 땐 타임스탬프로 변환
                        const from = util.dateToTimestamp(new Date(this.fromDate), true)
                        const to = util.dateToTimestamp(new Date(this.toDate), false)

                        const dateParam = {from, to}
                        // 바꾼 날짜로 데이터 호출
                        v.getBiDetail(id, dateParam)
                    }
                },
                created: () => {
                    /* 디폴트는 어제 -7일 ~ 어제 날짜
                       최대 30일까지 선택 가능
                    */
                    const $calendar = $('#bi' + id + 'Calendar')
                    $calendar.val(this.fromDate + ' ~ ' + this.toDate)
                    $calendar.siblings('.btn_calendar').unbind('click').bind('click', function(){
                        $calendar.trigger('click')
                    })
                }
            })
        } catch (error) {
            console.error('캘린더 초기화 오류:', error)
        }
    }

    /**
     * Highchart 초기화 함수
     * @param {string} id - 차트 컨테이너 ID
     */
    initChart(id) {
        try {
            let yAxisMax = null  // y축 최대값 설정용

            this.chart = Highcharts.chart(id + 'GraphWrap', {
                chart: {
                    type: 'column'
                },
                legend: {
                    enabled: false
                },
                xAxis: {
                    type: 'datetime',// countMau 아닐 때만 datetime
                    labels: {
                        formatter: function () {
                            // timestamp → 날짜 형식
                            return Highcharts.dateFormat('%Y-%m-%d', this.value)
                        }
                    },
                    crosshair: true
                },
                yAxis: [{
                    min: 0,
                    max: yAxisMax,  // 기준선이 있는 경우 최대값 설정
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
                tooltip: {
                    formatter: function () {
                        try {
                            let time = util.timestampToDate(+this.x)

                            let tooltipTime = `${time}<br/>` // x축 값 표시 (시간)
                            let tooltipData = ''

                            this.points.forEach(point => {
                                // 차트 유형에 맞는 값 형식 변환
                                const formattedValue = `<b>${util.comma(point.y)}</b>`

                                // 툴팁에 시리즈 색상과 데이터 값 추가
                                tooltipData += `
                                    <span style="color:${point.series.color}">\u25CF</span> 
                                    ${point.series.name}: ${formattedValue}<br/>
                                `;
                            });

                            return tooltipTime + tooltipData
                        } catch (e) {
                            console.error('툴팁 생성 오류:', e)
                            return ''
                        }
                    }
                },
                plotOptions: {
                    column: {
                        pointPadding: 0.2,
                        borderWidth: 0
                    }
                },
                series: []
            })
        } catch (error) {
            console.error('차트 초기화 오류:', error)
        }
    }

    /**
     * 팝업 방향 설정 (우측 또는 좌측)
     * @param {string} id - 팝업 ID
     */
    setPopupDirection(id) {
        // 팝업 요소 선택
        const $popup = $('#' + id + '__popUp');

        // 우측 팝업 목록에 없으면 좌측 팝업으로 설정
        if ((id)) {
            $popup.addClass('left-side')
        }
    }

    checkScreenWidth() {
        return window.innerWidth <= 1440;
    }

    getBiDetail(key, date) {
        const v = this

        const param = {
            packageNm: $('#packageNm').val(),
            serverType: $('#packageNm option:selected').data('serverType'),
            dateType: 'DATE',
            type: 'countError'
        }

        if (!date && key) {
            // default 시간은 일주일 전 ~ 하루 전
            param.from = util.dateToTimestamp(util.getDate(-7), true)
            param.to = util.dateToTimestamp(util.getDate(-1), false)
        } else if (date) {
            param.from = date.from
            param.to = date.to
        }

        if (key) {
            ajaxCall(`/mf/0000/bi/ERROR.maxy`, param
                // 필요시 파라미터 추가
            ).then(data => {
                const {chartData, list} = data
                // 테이블에 데이터 설정
                const biDetailArray = Object.entries(data)
                v.processChartData(biDetailArray, key)

                v.setTableData(list)
            });
        }
    }

    setTableData(data) {
        const v = this

        if (v.table) {
            v.table.setData(data)
        }
    }

    /**
     * 차트 데이터 처리
     * @param {Array} data - 서버에서 받은 데이터
     * @param {string} key - 데이터 키
     */
    processChartData(data, key) {
        try {
            // data 구조: [["chartData", chartArray], ["biData", biObject]]
            const chartData = data[0] && data[0][1] ? data[0][1] : null;

            // 차트 데이터와 biData를 인스턴스 변수에 저장
            this.chartData = chartData;

            if (!Array.isArray(chartData) || chartData.length === 0) {
                console.log('차트 데이터가 없습니다.');
                this.resetChartAndGrid();
                return;
            }

            // 차트 유형에 따른 데이터 처리
            let processedData = this.processDataByChartType(chartData, key);

            // 차트 그리기
            this.drawChart(processedData.keys, processedData.highChartData);

            // 전체 데이터 업데이트
           this.updateSummaryData(processedData.totalSum, processedData.avgValue, processedData.dataCount);

        } catch (error) {
            console.error('차트 데이터 처리 오류:', error);
        }
    }

    /**
     * 차트 유형별 데이터 처리
     * @param {Array} chartData - 차트 데이터
     * @param {string} key - 차트 키
     * @returns {Object} 처리된 데이터
     */
    processDataByChartType(chartData, key) {
        let highChartData = {};
        let chartKeys = [];
        let totalSum = 0;
        let dataCount = chartData.length;

        // 일반적인 단일 시리즈 처리
        for (let i = 0; i < chartData.length; i++) {
            const dataPoint = chartData[i];

            if (!Array.isArray(dataPoint) || dataPoint.length < 2) {
                console.warn('잘못된 데이터 형식:', dataPoint);
                continue;
            }

            const [dateValue, countValue] = dataPoint;
            const timestamp = this.convertDateToTimestamp(dateValue, key);

            const value = Number(countValue) || 0;
            totalSum += value;

            if (!highChartData[key]) {
                highChartData[key] = [];
                chartKeys.push(key);
            }

            highChartData[key].push([timestamp, value]);
        }

        const avgValue = dataCount > 0 ? Math.round(totalSum / dataCount) : 0;

        return {
            highChartData,
            keys: chartKeys,
            totalSum,
            avgValue,
            dataCount
        };
    }

    /**
     * 날짜를 타임스탬프로 변환
     * @param {string|number} dateValue - 날짜 값
     * @param {string} key - 고유 id
     * @returns {number} 타임스탬프
     */
    convertDateToTimestamp(dateValue, key) {
        if (key !== 'countMau') {
            const formattedDate = String(dateValue).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
            return util.dateToTimestamp(new Date(formattedDate), true);
        } else {
            const dateStr = util.dateFormat(String(dateValue), false)
            return util.dateToTimestamp(new Date(dateStr), true)
        }
    }

    /**
     * 요약 데이터 업데이트
     * @param {number} totalSum - 총합
     * @param {number} avgValue - 평균값
     * @param {number} dataCount - 데이터 개수
     */
    updateSummaryData(totalSum, avgValue, dataCount) {
        try {
            // 기간별 sum 데이터
            $("[data-bitype='sum']").text(util.comma(totalSum))

            // 평균 데이터
            $("[data-bitype='avg']").text(util.comma(avgValue))

        } catch (error) {
            console.error('요약 데이터 업데이트 오류:', error);
        }
    }

    /**
     * 차트 데이터를 Highcharts 형식으로 변환
     * @param {Array} chartData - 원본 차트 데이터 [[날짜, 값], ...]
     * @returns {Array} Highcharts 형식 데이터 [[timestamp, value], ...]
     */
    convertToHighchartsFormat(chartData) {
        if (!Array.isArray(chartData)) {
            return [];
        }

        return chartData.map(dataPoint => {
            if (!Array.isArray(dataPoint) || dataPoint.length < 2) {
                return null;
            }

            const [dateValue, countValue] = dataPoint;

            // 날짜 변환
            let timestamp;
            if (typeof dateValue === 'string') {
                // '20250922' → '2025-09-22'
                const formattedDate = dateValue.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
                timestamp = util.dateToTimestamp(new Date(formattedDate), true);
            } else {
                timestamp = dateValue;
            }

            const value = Number(countValue) || 0;
            return [timestamp, value];
        }).filter(item => item !== null); // null 값 제거
    }

    /**
     * 차트 데이터 설정 (기존 메서드 개선)
     * @param {Array} chartData - [[20250922,1], [20250923,2]] 형식
     * @param {string} seriesName - 시리즈 이름
     */
    setChartData(chartData, seriesName = 'Data') {
        try {
            if (!this.chart) {
                console.error('차트가 초기화되지 않았습니다.');
                return;
            }

            // 기존 시리즈 제거
            while (this.chart.series.length) {
                this.chart.series[0].remove();
            }

            // 차트 데이터 변환
            const highchartsData = this.convertToHighchartsFormat(chartData);

            if (highchartsData.length === 0) {
                console.warn('변환된 차트 데이터가 없습니다.');
                return;
            }

            // 시리즈 추가
            this.chart.addSeries({
                name: seriesName,
                data: highchartsData,
                color: '#ffc700',
                type: 'column'
            });

            console.log('차트 데이터 설정 완료:', highchartsData);
        } catch (error) {
            console.error('차트 데이터 설정 오류:', error);
        }
    }


    /**
     * 차트와 그리드 데이터 초기화
     */
    resetChartAndGrid() {
        // 차트 시리즈 제거
        while (this.chart.series.length) {
            this.chart.series[0].remove();
        }

        // 그리드 데이터 초기화
        const elementsWithDataContent = document.querySelectorAll('[data-bitype]');

        elementsWithDataContent.forEach((element, index) => {
            if (index !== 0) {
                element.textContent = '-';
            } else if (index === 0) {
                const date = util.getDateToString(new Date(this.toDate));
                $("[data-bitype='date']").text(date);
            }
        });
    }

    /**
     * 차트 그리기 (다중 시리즈 지원)
     * @param {Array} keys - 시리즈 키 배열
     * @param {Object} data - 차트 데이터
     */
    drawChart(keys, data) {
        try {
            if (!data || !keys || (Array.isArray(keys) && keys.length === 0)) {
                this.resetChartAndGrid();
                return;
            }

            // 기존 시리즈 제거
            while (this.chart.series.length) {
                this.chart.series[0].remove();
            }

            // 색상 설정
            const seriesColor = '#ffc700'

            // 시리즈 추가
            keys.forEach((key, index) => {
                const rawData = data[key];
                if (rawData && rawData.length > 0) {
                    let seriesName = key;
                    let color = seriesColor

                    seriesName = 'Error'

                    this.addChartSeries(seriesName, rawData, color);
                } else {
                    console.warn(`키 "${key}"에 해당하는 데이터가 없거나 비어 있습니다.`);
                }
            });

            // 차트 처음 로드 시 마지막 날짜 데이터를 기본으로 표시
            if (this.chart.series[0] && this.chart.series[0].data.length > 0) {
                const series0Data = this.chart.series[0].data;
                const length = series0Data.length;
                this.updateChart(series0Data[length - 1], keys[0]);
            }
        } catch (error) {
            console.error('차트 그리기 오류:', error);
        }
    }

    /**
     * 요소에 tippy 툴팁이 없는 경우에만 추가
     * @param {HTMLElement} element - 툴팁을 추가할 요소
     * @param {string} content - 툴팁에 표시할 내용
     */
    addTooltipIfNotExists(element, content) {
        if (!element) return;

        // 이미 tippy 인스턴스가 있는지 확인
        if (!element._tippy) {
            tippy(element, {
                content: content,
                arrow: false,
                theme: 'maxy-tooltip'
            });
        } else {
            // 이미 존재하는 경우 내용만 업데이트
            element._tippy.setContent(content);
        }
    }

    /**
     * 차트에 시리즈 추가
     * @param {string} name - 시리즈 이름
     * @param {Array} data - 시리즈 데이터
     * @param {string} color - 시리즈 색상
     */
    addChartSeries(name, data, color) {
        try {
            this.chart.addSeries({
                name,
                color,
                data,
                point: {
                    events: {
                        click: (event) => {
                            let key
                            this.updateChart(event.point, key);
                        }
                    }
                }
            });
        } catch (error) {
            console.error('시리즈 추가 오류:', error);
        }
    }

    /**
     * 차트 클릭 시 그리드 데이터 업데이트 (개선된 버전)
     * @param {Object} target - 클릭된 차트 포인트
     * @param {string} key - 고유 id
     */
    updateChart(target, key) {
        try {
            const chart = target.series.chart;
            const clickedIndex = target.index;
            const chartId = chart.renderTo.id;

            // 날짜 표시 업데이트
            let date = util.timestampToDate(target.x);

            $("[data-bitype='date']").text(date);

            // 차트 유형별 특별 처리

            // 기존 로직 유지
            this.updateGeneralChart(target, clickedIndex);
        } catch (error) {
            console.error('차트 업데이트 오류:', error);
        }
    }

    /**
     * 일반 차트 처리
     * @param {Object} target - 클릭된 포인트
     * @param {number} clickedIndex - 클릭된 인덱스
     */
    updateGeneralChart(target, clickedIndex) {
        const chart = target.series.chart;
        const allSeriesData = chart.series.map(series => series.data.map(point => point.y));
        const chartId = chart.renderTo.id;

        // 기존 updateGridByDataTypes 로직 호출
        const chartDataTypes = {
            'countErrorGraphWrap': ['series0']
        };

        const datas = chartDataTypes[chartId] || ['all'];
        let clickedData0 = !isNaN(allSeriesData[0][clickedIndex]) ? allSeriesData[0][clickedIndex] : 0;

        this.updateGridByDataTypes(datas, clickedData0, 0, clickedIndex, allSeriesData, chartId);
    }

    /**
     * 데이터 타입별 그리드 업데이트
     * @param {Array} dataTypes - 데이터 타입 배열
     * @param {number} clickedData0 - 첫 번째 시리즈 데이터
     * @param {number} clickedData1 - 두 번째 시리즈 데이터
     * @param {number} clickedIndex - 클릭된 인덱스
     * @param {Array} allSeriesData - 모든 시리즈 데이터
     * @param {string} chartId - 차트 ID
     */
    updateGridByDataTypes(dataTypes, clickedData0, clickedData1, clickedIndex, allSeriesData, chartId) {
        for (const dataType of dataTypes) {
            switch (dataType) {
                case 'all':
                    // 전체 데이터 합계
                    let all = 0;
                    for (let i = 0; i < (allSeriesData || []).length; i++) {
                        all += allSeriesData[i][clickedIndex];
                    }

                    $("[data-bitype='all']").text(util.comma(all));

                    break;

                case 'series0':
                    // 첫 번째 시리즈 데이터
                    let series0;
                    series0 = util.comma(clickedData0);

                    // 비율 정보 포함 여부 확인
                    if (dataTypes.includes('rateSeries0')) {
                        const rateSeries0 = util.percent(clickedData0, clickedData0 + clickedData1);
                        $("[data-bitype='series0']").text(series0 + " (" + rateSeries0 + "%)");
                    } else {
                        $("[data-bitype='series0']").text(series0);
                    }
                    break;

                case 'series1':
                    // 두 번째 시리즈 데이터
                    const series1 = util.comma(clickedData1);

                    // 비율 정보 포함 여부 확인
                    if (dataTypes.includes('rateSeries1')) {
                        const rateSeries1 = util.percent(clickedData1, clickedData0 + clickedData1);
                        $("[data-bitype='series1']").text(series1 + " (" + rateSeries1 + "%)");
                    } else {
                        $("[data-bitype='series1']").text(series1);
                    }
                    break;

                case 'avgSeries0':
                    // 첫 번째 시리즈 평균
                    this.updateAvgSeries(0, allSeriesData, chartId, osType);
                    break;
            }
        }
    }

    /**
     * 시리즈 평균 업데이트
     * @param {number} seriesIndex - 시리즈 인덱스
     * @param {Array} allSeriesData - 모든 시리즈 데이터
     * @param {string} chartId - 차트 ID
     * @param {string} osType - OS 타입
     */
    updateAvgSeries(seriesIndex, allSeriesData, chartId, osType) {
        let avgSeriesData;

        avgSeriesData = allSeriesData[seriesIndex];

        // 평균 계산
        let sumSeries = 0;
        let avgSeries = 0;

        if (avgSeriesData && avgSeriesData.length > 0) {
            sumSeries = avgSeriesData.reduce((acc, cur) => acc + cur, 0);
            avgSeries = (Number(sumSeries) / avgSeriesData.length).toFixed(0);
        }

        // 체류시간 특수 처리
        let avg;
        avg = util.comma(avgSeries);

        $(`[data-bitype='avgSeries${seriesIndex}']`).text(avg);
    }

    /**
     * 차트 키 변환
     * @param {string} key - 변환할 키
     * @returns {string} 변환된 키
     */
    convertChartKeys(key) {
        return trl('dashboard.bi.' + key);
    }

    getInteger(data) {
        try {
            let displayRate = Math.round(data)
            displayRate = displayRate + '%'
            return displayRate
        } catch (e) {

        }
    }

    /**
     * Handlebars 헬퍼 설정
     */
    setHandlebarsHelper() {
        Handlebars.registerHelper('getTitle', (title) => {
            const tnsNm = trl(title);
            if (!tnsNm) {
                return title;
            } else {
                return tnsNm || title;
            }

        });
    }

    /**
     * 팝업 열기
     */
    async openPopup() {
        try {
            const {id} = this;
            $('.dimmed').show();

            const $target = $('#' + id + '__popUp');
            $target.addClass('show');

            await util.sleep(200);
        } catch (error) {
            console.error('팝업 열기 오류:', error);
        }
    }

    /**
     * 팝업 닫기
     * @param {Object} v - 팝업 객체
     */
    closePopup(v) {
        try {
            const popup = '#' + v.id + '__popUp';
            const span = popup + ' span';
            const div = popup + ' div';
            const $dimmed = $('.dimmed');
            const $popup = $(popup);

            // 차트 제거
            if (v.chart) {
                v.chart.destroy({keepContainer: true});
            }

            // 텍스트 초기화
            $(span).text('');
            $(div).text('');

            // 이벤트 제거 및 팝업 숨기기
            $dimmed.off('click');
            $dimmed.hide();
            $popup.removeClass('show').addClass('hidden');

            // 커서 숨기기
            const $cursor = $('.maxy_cursor_dots');
            if ($cursor.css('display') === 'block') {
                cursor.hide();
            }
        } catch (error) {
            console.error('팝업 닫기 오류:', error);
        }
    }
}