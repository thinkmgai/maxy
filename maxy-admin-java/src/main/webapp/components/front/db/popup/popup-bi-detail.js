/*
   종합 분석 > Basic Information > 팝업 (Log, Error, Crash 제외한 나머지)
*/
class MaxyFrontPopupBiAnalysis {
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
            const source = await fetch('/components/front/db/popup/popup-bi-detail.html')
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

            // 캘린더 초기화
            this.initCalendar()

            // 이벤트 리스너 등록 및 팝업 열기
            this.addEventListener()
            this.openPopup()
        } catch (error) {
            console.error('팝업 초기화 오류:', error)
        }
    }

    /**
     * 팝업 방향 설정 (우측 또는 좌측)
     * @param {string} id - 팝업 ID
     */
    setPopupDirection(id) {
        // 우측에서 나오는 팝업 목록
        const rightSidePopups = [
            'countNew',
            'countDau',
            'countMau',
            'countCcu',
            'countPv',
            'avgUseTime',
            'countRevisit'
        ];

        // 팝업 요소 선택
        const $popup = $('#' + id + '__popUp');

        // 우측 팝업 목록에 없으면 좌측 팝업으로 설정
        if (!rightSidePopups.includes(id)) {
            $popup.addClass('left-side')
        }
    }

    checkScreenWidth() {
        return window.innerWidth <= 1440;
    }

    /**
     * Highchart 초기화 함수
     * @param {string} id - 차트 컨테이너 ID
     */
    initChart(id) {
        try {
            const createPlotLine = (value, color, textColor, labelKey) => ({
                value,
                color: color,
                width: 2,
                label: {
                    text: trl(labelKey),
                    align: 'right',
                    verticalAlign: 'bottom',
                    y: 15,
                    style: {
                        color: textColor
                    }
                }
            })

            let plotLines = []
            let yAxisMax = null  // y축 최대값 설정용

            switch (id) {
                case 'avgLcp':
                    plotLines = [
                        createPlotLine(2500, '#FFC700', '#FCB500', 'dashboard.waterfall.needsImprovement'),
                        createPlotLine(4000, '#EEBEBE', '#FF6969', 'dashboard.waterfall.poor')
                    ]
                    yAxisMax = 4200  // 기준선(4000)보다 약간 높게 설정
                    break

                case 'avgInp':
                    plotLines = [
                        createPlotLine(200, '#FFC700', '#FCB500', 'dashboard.waterfall.needsImprovement'),
                        createPlotLine(500, '#EEBEBE', '#FF6969', 'dashboard.waterfall.poor')
                    ]
                    yAxisMax = 520   // 기준선(500)보다 약간 높게 설정
                    break

                case 'avgCls':
                    plotLines = [
                        createPlotLine(0.1, '#FFC700', '#FCB500', 'dashboard.waterfall.needsImprovement'),
                        createPlotLine(0.25, '#EEBEBE','#FF6969','dashboard.waterfall.poor')
                    ]
                    yAxisMax = 0.27  // 기준선(0.25)보다 약간 높게 설정
                    break
            }

            this.chart = Highcharts.chart(id + 'GraphWrap', {
                chart: {
                    type: 'column',
                    events: {
                        render: function() {
                            // 차트가 그려진 후 y축 최대값 조정
                            if ((id === 'avgLcp' || id === 'avgInp' || id === 'avgCls') && this.yAxis && this.yAxis[0]) {
                                const currentMax = this.yAxis[0].max;
                                const dataMax = this.yAxis[0].dataMax;

                                // 데이터 최대값이 기준선보다 작으면 y축 최대값을 기준선보다 높게 설정
                                if (dataMax < yAxisMax && currentMax !== yAxisMax) {
                                    this.yAxis[0].setExtremes(0, yAxisMax, false);
                                }
                            }
                        }
                    }
                },
                legend: {
                   enabled: false
                },
                xAxis: {
                    type: 'datetime',// countMau 아닐 때만 datetime
                    labels: {
                        formatter: function () {
                            if (id === 'countMau') {
                                return Highcharts.dateFormat('%Y-%m', this.value);
                            } else {
                                // timestamp → 날짜 형식
                                return Highcharts.dateFormat('%Y-%m-%d', this.value);
                            }
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
                                // 평균 사용 시간인 경우 시간 형식으로 변환
                                if (id === 'avgUseTime'
                                    || id === 'avgLcp'
                                    || id === 'avgFcp'
                                    || id === 'avgInp'
                                    || id === 'avgTtfb') {
                                    return util.convertTime(this.value, false, false, false);
                                } else {
                                    return util.convertNum(this.value);
                                }
                            } catch (e) {
                                console.error('Y축 라벨 포맷 오류:', e)
                                return this.value;
                            }
                        }
                    },
                    plotLines: plotLines
                }],
                tooltip: {
                    formatter: function () {
                        try {
                            let time = util.timestampToDate(+this.x)
                            // MAU 차트인 경우 연월 형식으로 표시
                            if (id === 'countMau') {
                                time = time.substr(0, 7)
                            }

                            let tooltipTime = `${time}<br/>` // x축 값 표시 (시간)
                            let tooltipData = ''

                            this.points.forEach(point => {
                                // 차트 유형에 맞는 값 형식 변환
                                const formattedValue = id === 'avgUseTime'
                                || id === 'avgLcp'
                                || id === 'avgFcp'
                                || id === 'avgInp'
                                || id === 'avgTtfb'
                                    ? `<b>${util.convertTime(point.y, true, false, true)}</b>`
                                    : `<b>${util.comma(point.y)}</b>`

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

    getBiDetail(key, date) {
        const v = this

        const param = {
            packageNm: $('#packageNm').val(),
            serverType: $('#packageNm option:selected').data('serverType'),
            dateType: 'DATE',
            type: key
        }

        let type
        if (key) {
            if (key.startsWith('count')) {
                type = key.substring(5).toUpperCase()
            } else if (key.startsWith('avg')) {
                const suffix = key.substring(3);
                if (suffix === 'UseTime') {
                    type = 'using_time';
                    type = type.toUpperCase()
                } else {
                    type = suffix.toUpperCase()
                }
            }
        }

        if (!date && key !== 'countMau' && key !== 'countCcu') {
            // default 시간은 일주일 전 ~ 하루 전
            param.from = util.dateToTimestamp(util.getDate(-7), true)
            param.to = util.dateToTimestamp(util.getDate(-1), false)
        } else if (key === 'countMau') {
            param.from = util.dateToTimestamp(util.getDate(-365), true)
            param.to = util.dateToTimestamp(util.getDate(-1), false)
        } else if (!date && key === 'countCcu') {
            param.dateType = 'DAY'
            param.from = util.dateToTimestamp(util.getDate(0), true)
            param.to = new Date().getTime()
        } else if (date) {
            param.from = date.from
            param.to = date.to
        }

        if (key) {
            ajaxCall(`/mf/0000/bi/${type}.maxy`, param
                // 필요시 파라미터 추가
            ).then(data => {
                // 테이블에 데이터 설정
                const biDetailArray = Object.entries(data)
                v.processChartData(biDetailArray, key)
            });
        }
    }

    /**
     * 캘린더 초기화 함수
     */
    initCalendar() {
        const {id, func} = this
        const v = this

        try {
            // MAU 차트는 캘린더가 필요 없음
            if (id === 'countMau') {
                return
            }

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
                fn: (dates, date) => {
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
     * 차트 데이터 처리
     * @param {Array} data - 서버에서 받은 데이터
     * @param {string} key - 데이터 키
     */
    processChartData(data, key) {
        try {
            // data 구조: [["chartData", chartArray], ["biData", biObject]]
            const chartData = data[0] && data[0][1] ? data[0][1] : null;
            const biData = data[1] && data[1][1] ? data[1][1] : null;

            // 차트 데이터와 biData를 인스턴스 변수에 저장
            this.chartData = chartData;
            this.biData = biData;

            if (!Array.isArray(chartData) || chartData.length === 0) {
                console.log('차트 데이터가 없습니다.');
                this.resetChartAndGrid();
                return;
            }

            // 차트 유형에 따른 데이터 처리
            let processedData = this.processDataByChartType(chartData, key);

            // countRevisit의 경우 추가 데이터 저장
            if (key === 'countRevisit') {
                this.processedRevisitData = processedData;
            }

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
        let mauDateArr = []

        // 재방문 차트의 경우 두 개의 시리즈가 필요
        if (key === 'countRevisit') {
            return this.processRevisitData(chartData);
        }

        // 일반적인 단일 시리즈 처리
        for (let i = 0; i < chartData.length; i++) {
            const dataPoint = chartData[i];

            if (!Array.isArray(dataPoint) || dataPoint.length < 2) {
                console.warn('잘못된 데이터 형식:', dataPoint);
                continue;
            }

            const [dateValue, countValue] = dataPoint;
            const timestamp = this.convertDateToTimestamp(dateValue, key);

            mauDateArr.push(timestamp)
            this.setMauDate(mauDateArr)

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
     * 재방문 데이터 처리 (전체 DAU와 재방문 두 시리즈)
     * @param {Array} chartData - 차트 데이터
     * @returns {Object} 처리된 재방문 데이터
     */
    processRevisitData(chartData) {
        let highChartData = {
            'DAU': [],
            'Revisit': []
        };
        let chartKeys = ['DAU', 'Revisit'];
        let totalDauSum = 0;
        let totalRevisitSum = 0;
        let dataCount = chartData.length;

        // biData에서 각 날짜의 DAU와 재방문 데이터를 가져와서 차트 구성
        for (let i = 0; i < chartData.length; i++) {
            const dataPoint = chartData[i];

            if (!Array.isArray(dataPoint) || dataPoint.length < 2) {
                continue;
            }

            const [dateValue, revisitValue] = dataPoint;
            const timestamp = this.convertDateToTimestamp(dateValue);
            const revisit = Number(revisitValue) || 0;

            // biData에서 해당 날짜의 DAU 데이터 찾기
            const dateKey = String(dateValue).replace(/-/g, '');
            let dau = 0;

            if (this.biData && this.biData[dateKey] && this.biData[dateKey].countDau !== undefined) {
                dau = Number(this.biData[dateKey].countDau) || 0;
            }

            totalDauSum += dau;
            totalRevisitSum += revisit;

            highChartData['DAU'].push([timestamp, dau]);
            highChartData['Revisit'].push([timestamp, revisit]);
        }

        const avgDau = dataCount > 0 ? Math.round(totalDauSum / dataCount) : 0;
        const avgRevisit = dataCount > 0 ? Math.round(totalRevisitSum / dataCount) : 0;

        return {
            highChartData,
            keys: chartKeys,
            totalSum: totalDauSum, // 주 데이터로 DAU 사용
            avgValue: avgDau,
            dataCount,
            totalRevisitSum,
            avgRevisit
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
            const date = util.dateToTimestamp(new Date(dateStr), true)

            return date
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
            // countRevisit 특별 처리
            if (this.id === 'countRevisit') {
                // processRevisitData에서 반환된 추가 데이터 활용
                const processedData = this.processedRevisitData;
                if (processedData) {
                    // 전체 사용자 (DAU) 합계
                    $("[data-bitype='sum']").text(util.comma(totalSum));

                    // 일 평균 (DAU 평균)
                    $("[data-bitype='avg']").text(util.comma(avgValue));

                    // 재방문 합계
                    $("[data-bitype='series1Sum']").text(util.comma(processedData.totalRevisitSum));

                    // 재방문 비율 계산 (재방문 합계 / 전체 사용자 합계 * 100)
                    const revisitRate = totalSum > 0 ? util.percent(processedData.totalRevisitSum, totalSum) : 0;
                    $("[data-bitype='rate']").text(revisitRate + '%');
                }
                return;
            }

            // avgUseTime인 경우 시간 형식으로 변환
            if (this.id === 'avgUseTime'
                || this.id === 'avgLcp'
                || this.id === 'avgInp'
                || this.id === 'avgFcp'
                || this.id === 'avgTtfb') {
                // 기간별 sum 데이터 - 시간 형식 변환
                $("[data-bitype='sum']").text(util.convertTime(totalSum, true, false, true))

                // 평균 데이터 - 시간 형식 변환
                $("[data-bitype='avg']").text(util.convertTime(avgValue, true, false, true))
            } else {
                // 기간별 sum 데이터
                $("[data-bitype='sum']").text(util.comma(totalSum))

                // 평균 데이터
                $("[data-bitype='avg']").text(util.comma(avgValue))
            }
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
                color: '#7277FF',
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
            const seriesColors = ['rgb(114, 119, 255)', 'rgb(255, 105, 105)']; // 파란색, 빨간색

            // 시리즈 추가
            keys.forEach((key, index) => {
                const rawData = data[key];
                if (rawData && rawData.length > 0) {
                    let seriesName = key;
                    let color = seriesColors[index] || seriesColors[0];

                    const seriesMap = {
                        countNew: 'User',
                        countDau: 'DAU',
                        countMau: 'MAU',
                        countPv: 'PV',
                        avgUseTime: '체류시간',
                        countRevisit: '재방문',
                        avgLcp: 'LCP',
                        avgFcp: 'FCP',
                        avgInp: 'INP',
                        avgCls: 'CLS',
                        avgTtfb: 'TTFB',
                        countError: 'Error'
                    };

                    seriesName = seriesMap[key] || key; // 매핑 없으면 원래 key 그대로 사용

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
                            if (name === 'MAU') {
                                key = 'countMau'
                            }
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
            if (key === 'countMau') {
                date = date.substr(0, 7);
            }

            $("[data-bitype='date']").text(date);

            // 클릭된 날짜에 해당하는 biData 표시
            this.displayBiDataForDate(target.x, key);

            // 차트 유형별 특별 처리
            if (chartId === 'countRevisitGraphWrap') {
                this.updateRevisitChart(target, clickedIndex);
            } else {
                // 기존 로직 유지
                this.updateGeneralChart(target, clickedIndex);
            }

        } catch (error) {
            console.error('차트 업데이트 오류:', error);
        }
    }

    /**
     * 재방문 차트 특별 처리
     * @param {Object} target - 클릭된 포인트
     * @param {number} clickedIndex - 클릭된 인덱스
     */
    updateRevisitChart(target, clickedIndex) {
        const chart = target.series.chart;
        const allSeriesData = chart.series.map(series => series.data.map(point => point.y));

        if (allSeriesData.length >= 2) {
            const dauValue = allSeriesData[0][clickedIndex] || 0; // DAU (전체 방문자)
            const revisitValue = allSeriesData[1][clickedIndex] || 0; // 재방문자
            const rate = dauValue > 0 ? util.percent(revisitValue, dauValue) : 0;

            // 그리드 업데이트
            $("[data-bitype='series0']").text(util.comma(dauValue)); // 전체 방문자
            $("[data-bitype='series1']").text(util.comma(revisitValue)); // 재방문자
            $("[data-bitype='rate']").text(rate + '%'); // 재방문율
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
            'countNewGraphWrap': ['all'],
            'countMauGraphWrap': ['all'],
            'countDauGraphWrap': ['all'],
            'avgUseTimeGraphWrap': ['series0'],
            'avgLcpGraphWrap': ['series0'],
            'avgFcpGraphWrap': ['series0'],
            'avgInpGraphWrap': ['series0'],
            'avgClsGraphWrap': ['series0'],
            'avgTtfbGraphWrap': ['series0'],
            'countErrorGraphWrap': ['series0']
        };

        const datas = chartDataTypes[chartId] || ['all'];
        let clickedData0 = !isNaN(allSeriesData[0][clickedIndex]) ? allSeriesData[0][clickedIndex] : 0;

        this.updateGridByDataTypes(datas, clickedData0, 0, clickedIndex, allSeriesData, chartId);
    }


    /**
     * 클릭된 날짜에 해당하는 biData를 summary_wrap에 표시
     * @param {number} timestamp - 클릭된 날짜의 타임스탬프
     * @param {key} - 고유 key
     */
    displayBiDataForDate(timestamp, key) {
        try {
            if (!this.biData) {
                console.warn('biData가 없습니다.');
                return;
            }

            // 타임스탬프를 '20250924' 형식으로 변환
            let clickedDate = util.timestampToDate(timestamp).replace(/-/g, '');

            if (key === 'countMau') {
                clickedDate = clickedDate.substr(0, 6)
            }

            // biData에서 해당 날짜의 데이터 찾기
            const dateData = this.biData[clickedDate];

            if (!dateData || !Object.keys(dateData).length) {
                // 기본값으로 차트 데이터 표시
                this.displayChartDataForDate(timestamp, key);
                return;
            }

            // biData를 summary_wrap에 표시
            this.updateSummaryWithBiData(dateData, clickedDate);

        } catch (error) {
            console.error('biData 표시 오류:', error);
        }
    }

    /**
     * biData가 없을 때 차트 데이터로 대체 표시
     * @param {number} timestamp - 클릭된 날짜의 타임스탬프
     * @param {string} key - 고유 id
     */
    displayChartDataForDate(timestamp, key) {
        try {
            let clickedDate = util.timestampToDate(timestamp).replace(/-/g, '');

            if (key === 'countMau') {
                clickedDate = clickedDate.substr(0, 6)
            }

            // 현재 차트에서 해당 날짜의 값 찾기
            if (this.chart && this.chart.series.length > 0) {
                const series = this.chart.series[0];
                const dataPoint = series.data.find(point => {
                    const pointDate = util.timestampToDate(point.x).replace(/-/g, '');
                    return pointDate === clickedDate;
                });

                if (dataPoint) {
                    // 차트 데이터를 summary에 표시
                    const chartKey = this.id; // 현재 차트의 키
                    const mockBiData = {};
                    mockBiData[chartKey] = dataPoint.y;

                    this.updateSummaryWithBiData(mockBiData, clickedDate);
                }
            }
        } catch (error) {
            console.error('차트 데이터 표시 오류:', error);
        }
    }

    /**
     * biData를 이용해서 summary_wrap 업데이트
     * @param {Object} dateData - 해당 날짜의 biData 객체
     * @param {string} dateString - 날짜 문자열 (예: '20250924')
     */
    updateSummaryWithBiData(dateData, dateString) {
        try {
            // summary_wrap 내의 각 요소에 biData 값 표시
            const $summaryItems = $('#summaryWrap .grid_content_wrap');

            $summaryItems.each(function() {
                const $item = $(this);
                const $valueElement = $item.find('[data-bitype]');
                const biType = $valueElement.attr('data-bitype');

                if (biType && dateData.hasOwnProperty(biType)) {
                    const value = dateData[biType];
                    let formattedValue;

                    // 데이터 타입에 따라 포맷팅
                    if (biType.startsWith('avg') && (biType.includes('Time') || biType.includes('Lcp') || biType.includes('Inp') || biType.includes('Fcp'))) {
                        // 시간 관련 데이터
                        formattedValue = util.convertTime(value, true, false, true);
                    } else if (biType === 'avgCls') {
                        // CLS 데이터
                        formattedValue = Number(value).toFixed(3);
                    } else {
                        // 일반 숫자 데이터
                        formattedValue = util.comma(value);
                    }

                    $valueElement.text(formattedValue);
                }
            });

        } catch (error) {
            console.error('summary_wrap biData 업데이트 오류:', error);
        }
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

                    // avgUseTime인 경우 시간 형식으로 변환
                    if (this.id === 'avgUseTime'
                        || this.id === 'avgLcp'
                        || this.id === 'avgFcp'
                        || this.id === 'avgInp'
                        || this.id === 'avgTtfb') {
                        $("[data-bitype='all']").text(util.convertTime(all, true, false, true));
                    } else {
                        $("[data-bitype='all']").text(util.comma(all));
                    }
                    break;

                case 'series0':
                    // 첫 번째 시리즈 데이터
                    let series0;
                    if (this.id === 'avgUseTime'
                        || this.id === 'avgLcp'
                        || this.id === 'avgFcp'
                        || this.id === 'avgInp'
                        || this.id === 'avgTtfb') {
                        series0 = util.convertTime(clickedData0, true, false, true);
                    } else {
                        series0 = util.comma(clickedData0);
                    }

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

                case 'rateSeries0':
                    // 첫 번째 시리즈 비율
                    const rateSeries0 = util.percent(clickedData0, clickedData0 + clickedData1);
                    $("[data-bitype='rateSeries0']").text(rateSeries0 + "%");
                    break;

                case 'rateSeries1':
                    // 두 번째 시리즈 비율
                    const rateSeries1 = util.percent(clickedData1, clickedData0 + clickedData1);
                    $("[data-bitype='rateSeries1']").text(rateSeries1 + "%");
                    break;

                case 'avgSeries0':
                    // 첫 번째 시리즈 평균
                    this.updateAvgSeries(0, allSeriesData, chartId, osType);
                    break;

                case 'avgSeries1':
                    // 두 번째 시리즈 평균
                    this.updateAvgSeries(1, allSeriesData, chartId, osType);
                    break;

                case 'pvPerPerson':
                    // 인당 PV (PV / Viewer)
                    let pvPerPerson = 0;
                    if (clickedData0 && clickedData1) {
                        pvPerPerson = (Number(clickedData0) / Number(clickedData1)).toFixed(2);
                    }
                    $("[data-bitype='pvPerPerson']").text(util.comma(pvPerPerson));
                    break;

                case 'rate':
                    // 비율 (두 번째 / 첫 번째)
                    const rate = util.percent(clickedData1, clickedData0);
                    $("[data-bitype='rate']").text(rate + '%');
                    break;

                case 'noLogin':
                    // 비로그인 사용자 (전체 - 로그인)
                    $("[data-bitype='noLogin']").text(util.comma(clickedData0 - clickedData1));
                    break;

                case 'appAvgAllUser':
                    // 일평균 사용자
                    $("[data-bitype='appAvgAllUser']").text(util.comma(this.appAvgAllUser[clickedIndex]));
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

        // MAU 차트 특수 처리
        if (chartId === 'appMauCountGraphWrap') {
            if ((seriesIndex === 0 && osType === 'Android') ||
                (seriesIndex === 1 && osType === 'iOS')) {
                avgSeriesData = 0;
            } else {
                avgSeriesData = allSeriesData[seriesIndex === 0 ? 0 : 0];
            }
        } else {
            avgSeriesData = allSeriesData[seriesIndex];
        }

        // 평균 계산
        let sumSeries = 0;
        let avgSeries = 0;

        if (avgSeriesData && avgSeriesData.length > 0) {
            sumSeries = avgSeriesData.reduce((acc, cur) => acc + cur, 0);
            avgSeries = (Number(sumSeries) / avgSeriesData.length).toFixed(0);
        }

        // 체류시간 특수 처리
        let avg;
        if (chartId === 'appAvgUseTimeGraphWrap') {
            avg = util.convertTime(Number(avgSeries), true, false, true);
        } else {
            avg = util.comma(avgSeries);
        }

        $(`[data-bitype='avgSeries${seriesIndex}']`).text(avg);
    }

    /**
     * MAU 차트 날짜 설정
     * @param {Array} data - 날짜 배열
     */
    setMauDate(data) {
        try {
            let dateList = '';

            if (data.length === 1) {
                dateList = util.timestampToDate(data[0]);
                dateList = dateList.substr(0, 7);
            } else if (data.length > 1) {
                const startDate = util.timestampToDate(data[0]).substr(0,7)
                const endDate = util.timestampToDate(data[data.length - 1]).substr(0,7)
                dateList = startDate + ' ~ ' + endDate
            }

            $('#date').text(dateList);
        } catch (error) {
            console.error('MAU 날짜 설정 오류:', error);
        }
    }

    /**
     * 차트 키 변환
     * @param {string} key - 변환할 키
     * @returns {string} 변환된 키
     */
    convertChartKeys(key) {
        return trl('dashboard.bi.' + key);
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