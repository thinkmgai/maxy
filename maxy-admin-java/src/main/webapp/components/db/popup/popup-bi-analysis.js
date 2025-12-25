/*
   종합 분석 > Basic Information > 팝업 (Log, Error, Crash 제외한 나머지)
*/
class MaxyPopupBiAnalysis {
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
            const source = await fetch('/components/db/popup/popup-bi-analysis.html')
                .then(response => response.text())

            const template = Handlebars.compile(source)
            const $target = $('#' + appendId)

            if (!($target.length > 0)) {
                throw '대상 요소를 찾을 수 없습니다: #' + appendId
            }

            $target.empty()

            // Log Count 팝업일때만 아이콘 변경
            let iconClass = 'icon_user'
            if(id === 'appLogCount') {
                iconClass = 'icon_log'
            }
            
            // 템플릿 렌더링
            $target.append(template({id, title, allTitle, summaryTitle, iconClass}))

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
            'appInstallCount',
            'appIosConnectCount',
            'appAndroidConnectCount',
            'appMauCount',
            'appConnectCount',
            'appUseCount'
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
            this.chart = Highcharts.chart(id + 'GraphWrap', {
                chart: {
                    type: 'column',
                },
                legend: {
                    layout: 'horizontal',
                    align: 'center',
                    verticalAlign: 'bottom',
                    floating: false,
                    itemMarginBottom: 3
                },
                xAxis: {
                    type: 'datetime',
                    labels: {
                        formatter: function () {
                            // MAU 차트인 경우 월 단위로 표시
                            if (id === 'appMauCount') {
                                return Highcharts.dateFormat('%Y-%m', this.value)
                            } else {
                                return Highcharts.dateFormat('%Y-%m-%d', this.value)
                            }
                        }
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
                                // 평균 사용 시간인 경우 시간 형식으로 변환
                                if (id === 'appAvgUseTime') {
                                    return util.convertTime(this.value, false, false, false);
                                } else {
                                    return util.convertNum(this.value);
                                }
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
                            // MAU 차트인 경우 연월 형식으로 표시
                            if (id === 'appMauCount') {
                                time = time.substr(0, 7)
                            }

                            let tooltipTime = `${time}<br/>` // x축 값 표시 (시간)
                            let tooltipData = ''

                            this.points.forEach(point => {
                                // 차트 유형에 맞는 값 형식 변환
                                const formattedValue = id === 'appAvgUseTime'
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

    /**
     * 캘린더 초기화 함수
     */
    initCalendar() {
        const {id, func} = this

        try {
            // MAU 차트는 캘린더가 필요 없음
            if (id === 'appMauCount') {
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
                        func(id, dateParam)
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
     * 데이터 유형에 따라 차트 데이터 처리
     * @param {string} key - 데이터 키
     * @param {Object} data - 처리할 데이터
     */
    getDataByType(key, data) {
        try {
            // 차트 데이터 초기화
            let chartData = (key === 'appMauCount') ? data[1][1] : data[0][1]
            const osType = $('#osType').val()

            let highChartData = {};
            let chartKeys = [];
            let iosCountSum = 0;
            let androidCountSum = 0;
            let mauDateArr = [];

            this.data = chartData;
            this.appAvgAllUser = [];

            // 데이터가 없는 경우 차트 초기화 및 그리드 데이터 리셋
            if (!chartData || Object.keys(chartData).length === 0) {
                this.resetChartAndGrid();
                return;
            }

            // 차트 데이터 처리
            for (let dateKey in chartData) {
                const dataByOstype = (key === 'appMauCount') ? chartData[dateKey] : chartData[dateKey][osType];

                // OS 유형에 맞는 데이터가 없으면 건너뛴다
                if (!dataByOstype) {
                    console.log('해당 OS 타입의 데이터가 없습니다');
                    continue;
                }

                const dateStr = util.dateFormat(dateKey, false);
                const date = util.dateToTimestamp(new Date(dateStr), true);

                // 차트 유형별 데이터 처리
                const result = this.processChartData(key, dataByOstype, date, osType);

                if (result) {
                    const { iosCount, androidCount, chartKeysResult } = result;

                    // 합계 누적
                    if (iosCount !== undefined) iosCountSum += iosCount;
                    if (androidCount !== undefined) androidCountSum += androidCount;

                    // 차트 키 설정
                    if (chartKeysResult) chartKeys = chartKeysResult;

                    // 각 데이터 포인트를 highChartData에 추가
                    if (result.highChartUpdates) {
                        result.highChartUpdates.forEach(update => {
                            this.addToHighChartData(highChartData, update.key, date, update.value);
                        });
                    }

                    // MAU 차트인 경우 날짜 배열에 추가
                    if (key === 'appMauCount') {
                        mauDateArr.push(dateStr.substr(0, 7));
                    }
                }
            }

            // 차트 유형별 그리드 데이터 업데이트
            this.updateGridData(key, iosCountSum, androidCountSum, chartData);

            // MAU 차트인 경우 날짜 설정
            if (key === 'appMauCount') {
                this.setMauDate(mauDateArr);
            }

            // 차트 그리기
            this.drawChart(chartKeys, highChartData);

        } catch (error) {
            console.error('차트 데이터 처리 오류:', error);
        }
    }

    /**
     * 차트 유형별 데이터 처리 로직
     * @param {string} key - 차트 유형 키
     * @param {Object} dataByOstype - OS 유형별 데이터
     * @param {number} date - 타임스탬프 형식의 날짜
     * @param {string} osType - OS 유형 (A, iOS, Android)
     * @returns {Object} 처리된 데이터 객체
     */
    processChartData(key, dataByOstype, date, osType) {
        let iosCount = 0;
        let androidCount = 0;
        let chartKeys = [];
        let highChartUpdates = [];

        switch (key) {
            case 'appInstallCount':
                if (osType === 'A') {
                    // iOS와 Android 설치 수 가져오기
                    ({iosCount, androidCount} = this.getCount(dataByOstype, 'iosInstallCount', 'androidInstallCount'));

                    highChartUpdates = [
                        {key: 'iOS', value: iosCount},
                        {key: 'Android', value: androidCount}
                    ];
                    chartKeys = ['iOS', 'Android'];
                } else if (osType === 'iOS') {
                    ({iosCount} = this.getCount(dataByOstype, 'appInstallCount'));
                    highChartUpdates = [{key: 'iOS', value: iosCount}];
                    chartKeys = ['iOS'];
                } else {
                    ({androidCount} = this.getCount(dataByOstype, 'appInstallCount'));
                    highChartUpdates = [{key: 'Android', value: androidCount}];
                    chartKeys = ['Android'];
                }
                break;

            case 'appIosConnectCount':
            case 'appAndroidConnectCount':
                ({iosCount, androidCount} = this.getCount(dataByOstype, 'appIosConnectCount', 'appAndroidConnectCount'));

                highChartUpdates = [
                    {key: 'iOS', value: iosCount},
                    {key: 'Android', value: androidCount}
                ];
                chartKeys = ['iOS', 'Android'];
                break;

            case 'appMauCount':
                // MAU 데이터 처리
                const iosObj = dataByOstype['iOS'] || {};
                const androidObj = dataByOstype['Android'] || {};

                iosCount = isNaN(iosObj[key]) ? 0 : Number(iosObj[key]);
                androidCount = isNaN(androidObj[key]) ? 0 : Number(androidObj[key]);

                if (osType === 'A') {
                    highChartUpdates = [
                        {key: 'iOS', value: iosCount},
                        {key: 'Android', value: androidCount}
                    ];
                    chartKeys = ['iOS', 'Android'];
                } else if (osType === 'iOS') {
                    highChartUpdates = [{key: 'iOS', value: iosCount}];
                    chartKeys = ['iOS'];
                } else {
                    highChartUpdates = [{key: 'Android', value: androidCount}];
                    chartKeys = ['Android'];
                }
                break;

            case 'appConnectCount':
                ({iosCount, androidCount} = this.getCount(dataByOstype, 'appIosConnectCount', 'appAndroidConnectCount'));

                highChartUpdates = [
                    {key: 'iOS', value: iosCount},
                    {key: 'Android', value: androidCount}
                ];
                chartKeys = ['iOS', 'Android'];
                break;

            case 'appUseCount':
                ({iosCount, androidCount} = this.getCount(dataByOstype, key, 'appConnectCount'));

                highChartUpdates = [
                    {key: 'PV', value: iosCount},
                    {key: 'Viewer', value: androidCount}
                ];
                chartKeys = ['PV', 'Viewer'];
                break;

            case 'appReconnectCount':
            case 'appSleepUserCount':
            case 'appLoginUserCount':
                ({iosCount, androidCount} = this.getCount(dataByOstype, 'appConnectCount', key));

                highChartUpdates = [
                    {key: 'appConnectCount', value: iosCount},
                    {key: key, value: androidCount}
                ];
                chartKeys = ['appConnectCount', key];
                break;

            case 'appAvgUseTime':
                ({iosCount, androidCount} = this.getCount(dataByOstype, 'appConnectCount', key));

                highChartUpdates = [{key: key, value: androidCount}];
                this.appAvgAllUser.push(iosCount);
                chartKeys = [key];
                break;

            case 'appLogCount':
                ({iosCount} = this.getCount(dataByOstype, 'Log', null));

                highChartUpdates = [{key: key, value: iosCount}];
                chartKeys = [key];
                break;
        }

        return {
            iosCount,
            androidCount,
            chartKeysResult: chartKeys,
            highChartUpdates
        };
    }

    /**
     * 차트 유형별 그리드 데이터 업데이트
     * @param {string} key - 차트 유형 키
     * @param {number} iosCountSum - iOS 데이터 합계
     * @param {number} androidCountSum - Android 데이터 합계
     * @param {Object} chartData - 차트 데이터
     */
    updateGridData(key, iosCountSum, androidCountSum, chartData) {
        const daysCount = Object.keys(chartData).length;
        const totalSum = iosCountSum + androidCountSum;

        const $dataSum =  $("[data-bitype='sum']")
        const $dataSeries0Sum = $("[data-bitype='series0Sum']")
        const $dataSeries1Sum = $("[data-bitype='series1Sum']")
        const $dataSeries0Avg = $("[data-bitype='series0Avg']")
        const $dataSeries1Avg = $("[data-bitype='series1Avg']")

        // 차트 유형별 그리드 데이터 업데이트
        switch (key) {
            case 'appInstallCount':
                const avgInstall = daysCount > 0 ? Math.round(totalSum / daysCount) : 0

                $dataSum.text(util.comma(totalSum))
                $("[data-bitype='avgSum']").text(util.comma(avgInstall))
                $dataSeries0Sum.text(util.comma(iosCountSum))
                $dataSeries1Sum.text(util.comma(androidCountSum))
                break;

            case 'appIosConnectCount':
            case 'appAndroidConnectCount':
                const rate = key === 'appIosConnectCount'
                    ? util.percent(iosCountSum, totalSum)
                    : util.percent(androidCountSum, totalSum)

                const series0Sum = key === 'appIosConnectCount' ? iosCountSum : androidCountSum
                $dataSum.text(util.comma(totalSum))
                $dataSeries0Sum.text(util.comma(series0Sum) + ' (' + rate + '%' + ')')
                break;

            case 'appMauCount':
            case 'appConnectCount':
                const iosAvg = daysCount > 0 ? Math.round(iosCountSum / daysCount) : 0
                const androidAvg = daysCount > 0 ? Math.round(androidCountSum / daysCount) : 0

                if (key === 'appMauCount') {
                    if (this.checkScreenWidth()) {
                        // 원본 데이터 저장 (쉼표 포함)
                        const fullDataSum = util.comma(totalSum);
                        const fullDataIosSum = util.comma(iosCountSum);
                        const fullDataIosAvg = util.comma(iosAvg);
                        const fullDataAndroidSum = util.comma(androidCountSum);
                        const fullDataAndroidAvg = util.comma(androidAvg);

                        // 간략화된 데이터 표시
                        $dataSum.text(util.convertNum(totalSum));
                        $dataSeries0Sum.text(util.convertNum(iosCountSum));
                        $dataSeries0Avg.text(util.convertNum(iosAvg));
                        $dataSeries1Sum.text(util.convertNum(androidCountSum));
                        $dataSeries1Avg.text(util.convertNum(androidAvg));

                        // tippy 툴팁 추가 (이미 존재하는 경우 생성하지 않음)
                        this.addTooltipIfNotExists($dataSum[0], fullDataSum);
                        this.addTooltipIfNotExists($dataSeries0Sum[0], fullDataIosSum);
                        this.addTooltipIfNotExists($dataSeries0Avg[0], fullDataIosAvg);
                        this.addTooltipIfNotExists($dataSeries1Sum[0], fullDataAndroidSum);
                        this.addTooltipIfNotExists($dataSeries1Avg[0], fullDataAndroidAvg);

                        return;
                    }
                }

                $dataSum.text(util.comma(totalSum))
                $dataSeries0Sum.text(util.comma(iosCountSum))
                $dataSeries0Avg.text(util.comma(iosAvg))
                $dataSeries1Sum.text(util.comma(androidCountSum))
                $dataSeries1Avg.text(util.comma(androidAvg))
                break;
            case 'appUseCount':
                const pvAvg = daysCount > 0 ? Math.round(totalSum / daysCount) : 0
                $dataSum.text(util.comma(iosCountSum))
                $dataSeries1Sum.text(util.comma(androidCountSum))
                $dataSeries1Avg.text(util.comma(pvAvg))
                const pvPerPerson = (androidCountSum > 0) ? (iosCountSum / androidCountSum).toFixed(2) : 0
                $dataSeries0Avg.text(util.comma(pvPerPerson))
                break;
            case 'appReconnectCount':
            case 'appSleepUserCount':
                const returnRate = (androidCountSum > 0) ? util.percent(androidCountSum, iosCountSum) : 0
                const avg = daysCount > 0 ? Math.round(totalSum / daysCount) : 0

                $dataSum.text(util.comma(iosCountSum))
                $dataSeries1Avg.text(util.comma(avg))
                $dataSeries1Sum.text(util.comma(androidCountSum))
                $dataSeries0Avg.text(util.comma(returnRate) + '%')
                break;
            case 'appLoginUserCount':
                const loginRate = (androidCountSum > 0) ? util.percent(androidCountSum, iosCountSum) : 0
                const loginAvg = daysCount > 0 ? Math.round(androidCountSum / daysCount) : 0

                $dataSum.text(util.comma(iosCountSum))
                $dataSeries1Avg.text(util.comma(loginAvg))
                $dataSeries1Sum.text(util.comma(androidCountSum))
                $dataSeries0Avg.text(util.comma(loginRate) + '%')
                break;
            case 'appAvgUseTime':
                const timeAvg = daysCount > 0 ? Math.round(androidCountSum / daysCount) : 0

                $dataSum.text(util.comma(iosCountSum))
                $dataSeries1Sum.text(util.convertTime(androidCountSum, true, false, true))
                $dataSeries1Avg.text(util.convertTime(timeAvg,true, false, true))
                break;
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
     * dataByOstype에서 특정 키에 대한 값 추출
     * @param {Object} dataByOstype - OS 유형별 데이터
     * @param {string} iosKey - iOS 데이터 키
     * @param {string} androidKey - Android 데이터 키
     * @returns {Object} 추출된 iOS 및 Android 값
     */
    getCount(dataByOstype, iosKey, androidKey) {
        try {
            const iosCount = isNaN(dataByOstype[iosKey]) ? 0 : Number(dataByOstype[iosKey]);
            const androidCount = isNaN(dataByOstype[androidKey]) ? 0 : Number(dataByOstype[androidKey]);
            return {iosCount, androidCount};
        } catch (error) {
            console.error('데이터 추출 오류:', error);
            return {iosCount: 0, androidCount: 0};
        }
    }

    /**
     * Highchart 데이터 형식에 맞게 데이터 추가
     * @param {Object} highChartData - Highchart 데이터 객체
     * @param {string} key - 시리즈 키
     * @param {number} date - 날짜 타임스탬프
     * @param {number} value - 데이터 값
     */
    addToHighChartData(highChartData, key, date, value) {
        try {
            if (!highChartData[key]) {
                highChartData[key] = [];
            }

            highChartData[key].push([date, value]);
        } catch (error) {
            console.error('Highchart 데이터 추가 오류:', error);
        }
    }

    /**
     * 차트 그리기
     * @param {Array} keys - 시리즈 키 배열
     * @param {Object} data - 차트 데이터
     */
    drawChart(keys, data) {
        try {
            // 데이터 유효성 검사 추가
            if (!data || !keys || (Array.isArray(keys) && keys.length === 0)) {
                this.resetChartAndGrid();
                return;
            }

            // 기존 시리즈 제거
            while (this.chart.series.length) {
                this.chart.series[0].remove();
            }

            // 색상 배열 설정
            let seriesColors = ['rgb(84, 79, 197)', 'rgb(44, 175, 254)'];

            // 단일 시리즈인 경우 색상 설정
            if (keys.length === 1) {
                if (keys[0] === 'Android') {
                    seriesColors = ['rgb(44, 175, 254)'];
                } else {
                    seriesColors = ['rgb(84, 79, 197)'];
                }
            }

            // appLogCount 처리
            if (keys[0] === 'appLogCount' || keys === 'appLogCount') {
                const appLogCountData = data.appLogCount || data;
                this.addChartSeries('Log', appLogCountData, seriesColors[0]);
            } else {
                // 여러 키 처리
                keys.forEach((key) => {
                    const rawData = data[key];
                    if (rawData && rawData.length > 0) {
                        const newKey = this.isSpecialKey(key) ? this.convertChartKeys(key) : key;
                        this.addChartSeries(newKey, rawData, seriesColors[this.chart.series.length]);
                    } else {
                        console.warn(`키 "${key}"에 해당하는 데이터가 없거나 비어 있습니다.`);
                    }
                });
            }

            // 차트의 마지막 시리즈를 클릭한것 처럼 해주는 이벤트
            // 차트 처음 열었을 때는 가장 마지막 날짜의 데이터를 grid에 표시
            if (this.chart.series[0] && this.chart.series[0].data.length > 0) {
                const series0Data = this.chart.series[0].data;
                const length = series0Data.length;
                this.updateChart(series0Data[length - 1]);
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
     * 특수 키 여부 확인
     * @param {string} key - 확인할 키
     * @returns {boolean} 특수 키 여부
     */
    isSpecialKey(key) {
        try {
            const excludedKeys = ['iOS', 'Android', 'PV', 'Viewer'];
            return !excludedKeys.includes(key);
        } catch (error) {
            console.error('키 확인 오류:', error);
            return false;
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
                            this.updateChart(event.point);
                        }
                    }
                }
            });
        } catch (error) {
            console.error('시리즈 추가 오류:', error);
        }
    }

    /**
     * 차트 클릭 시 그리드 데이터 업데이트
     * @param {Object} target - 클릭된 차트 포인트
     */
    updateChart(target) {
        try {
            const chart = target.series.chart;
            const clickedIndex = target.index;
            const allSeriesData = chart.series.map(series => series.data.map(point => point.y));
            const chartId = chart.renderTo.id;

            // 날짜 표시 업데이트
            let date = util.timestampToDate(target.x);
            if (chartId === 'appMauCountGraphWrap') {
                date = date.substr(0, 7);
            }
            $("[data-bitype='date']").text(date);

            // 차트 ID별 데이터 타입 매핑
            const chartDataTypes = {
                'appInstallCountGraphWrap': ['all', 'series0', 'series1', 'rateSeries0', 'rateSeries1'],
                'appIosConnectCountGraphWrap': ['all', 'series0', 'rateSeries0'],
                'appAndroidConnectCountGraphWrap': ['all', 'series1', 'rateSeries1'],
                'appMauCountGraphWrap': ['all', 'series0', 'series1', 'avgSeries0', 'avgSeries1'],
                'appConnectCountGraphWrap': ['all', 'series0', 'series1', 'avgSeries0', 'avgSeries1'],
                'appUseCountGraphWrap': ['series0', 'series1', 'pvPerPerson', 'avgSeries0'],
                'appReconnectCountGraphWrap': ['series0', 'series1', 'rate', 'avgSeries1'],
                'appSleepUserCountGraphWrap': ['series0', 'series1', 'rate', 'avgSeries1'],
                'appLoginUserCountGraphWrap': ['series0', 'series1', 'rate', 'noLogin'],
                'appAvgUseTimeGraphWrap': ['appAvgAllUser', 'series0', 'avgSeries0'],
                'appLogCountGraphWrap': ['series0']
            };

            const datas = chartDataTypes[chartId] || [];
            const osType = sessionStorage.getItem('osType');

            // 클릭된 데이터 값 추출
            let clickedData0 = 0;
            let clickedData1 = 0;

            if (chartId === 'appMauCountGraphWrap') {
                if (allSeriesData.length === 1) {
                    if (osType === 'Android') {
                        clickedData0 = 0;
                        clickedData1 = allSeriesData[0][clickedIndex];
                    } else {
                        clickedData0 = !isNaN(allSeriesData[0][clickedIndex]) ? allSeriesData[0][clickedIndex] : 0;
                        clickedData1 = 0;
                    }
                } else {
                    clickedData0 = !isNaN(allSeriesData[0][clickedIndex]) ? allSeriesData[0][clickedIndex] : 0;
                    clickedData1 = !isNaN(allSeriesData[1][clickedIndex]) ? allSeriesData[1][clickedIndex] : 0;
                }
            } else {
                clickedData0 = !isNaN(allSeriesData[0][clickedIndex]) ? allSeriesData[0][clickedIndex] : 0;
                clickedData1 = allSeriesData.length === 1 ? 0 : allSeriesData[1][clickedIndex];
            }

            // 데이터 타입별 그리드 업데이트
            this.updateGridByDataTypes(datas, clickedData0, clickedData1, clickedIndex, allSeriesData, chartId, osType);

        } catch (error) {
            console.error('차트 업데이트 오류:', error);
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
     * @param {string} osType - OS 타입
     */
    updateGridByDataTypes(dataTypes, clickedData0, clickedData1, clickedIndex, allSeriesData, chartId, osType) {
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
                    if (chartId === 'appAvgUseTimeGraphWrap') {
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
                dateList = data[0];
            } else if (data.length > 1) {
                dateList = data[0] + ' ~ ' + data[data.length - 1];
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
            return tnsNm || title;
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