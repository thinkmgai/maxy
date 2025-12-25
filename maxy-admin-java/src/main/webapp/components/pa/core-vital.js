class CoreVital {
    constructor(props) {
        this.id = props.id
        this.coreVitalTotalChart = null
        this.coreVitalChart = null
        this.lcpChart = null
        this.fcpChart = null
        this.inpChart = null
        this.clsChart = null
        this.targetPage = props.targetPage
        this.from = null
        this.to = null

        // 상태별 색상코드
        this.COLORS = {
            GOOD: '#35DA9E',
            NEEDS_IMPROVEMENT: '#FFC700',
            POOR: '#FF6969'
        }

        // Core Vital별 상태 기준 값, NEEDS_IMPROVEMENT 이상일 경우 POOR
        this.THRESHOLDS = {
            LCP: {GOOD: 2500, NEEDS_IMPROVEMENT: 4000},
            INP: {GOOD: 200, NEEDS_IMPROVEMENT: 500},
            CLS: {GOOD: 0.1, NEEDS_IMPROVEMENT: 0.25},
            FCP: {GOOD: 1800, NEEDS_IMPROVEMENT: 3000},
        }

        this.THRESHOLDS_DESC = {
            LCP: {GOOD: '≤ 2.5s', NEEDS_IMPROVEMENT: '2.5s ~ 4s', POOR: '> 4s'},
            INP: {GOOD: '≤ 200ms', NEEDS_IMPROVEMENT: '200ms ~ 500ms', POOR: '> 500ms'},
            CLS: {GOOD: '≤ 0.1', NEEDS_IMPROVEMENT: '0.1 ~ 0.25', POOR: '> 0.25'},
            FCP: {GOOD: '≤ 1.8s', NEEDS_IMPROVEMENT: '1.8s ~ 3s', POOR: '> 3s'}
        }

        this.create().then(() => {
        })
    }

    async create() {
        const v = this
        const darkYn = sessionStorage.getItem('maxyDarkYn')
        const packageNm = sessionStorage.getItem('packageNm')
        const serverType = sessionStorage.getItem('serverType')

        // Core Vital Avg 차트
        // 각 항목(LCP, FCP, INP, CLS)의 상태별 기준값에 따라 가로 막대형식으로 차트를 그림
        // 배경 바는 GOOD, NEEDS_IMPROVEMENT, POOR 3개 단계로 색상이 다르게 표시됨
        // 3단계의 영역을 나누는 수치값은 실제값의 색상이 바뀌는 영역을 기준으로 나눔

        // 차트 컨테이너 요소 가져오기
        const chartContainer = document.getElementById('coreVitalChart');

        // coreVitalChart 참조 저장
        v.coreVitalChart = chartContainer;

        // core vital line 차트 기본 옵션
        const basicLineChartOptions = {
            coreVitalInstance: this, // CoreVital 인스턴스 참조 추가
            chart: {
                zoomType: 'x',
                zooming: {
                    mouseWheel: {
                        enabled: false
                    }
                },
                events: {
                    selection: function (event) {
                        v.from = Math.round(event.xAxis[0].min)
                        v.to = Math.round(event.xAxis[0].max)

                        // TODO : 지금은 interval이 5분 고정인데 시간차에 따라 interval이 동적으로 변하면 수정해야함
                        // 선택한 max시간값과 차트 xAxis의 max시간이 같으면 interval만큼 더해주기
                        const toDate = util.timestampToDate(v.to)
                        const toHHmm = util.timestampToHourMin(v.to, 'HHmm')
                        const dataMaxDate = util.timestampToDate(event.xAxis[0].axis.dataMax)
                        const dataMaxHHmm = util.timestampToHourMin(event.xAxis[0].axis.dataMax, 'HHmm')

                        if(toDate ===  dataMaxDate && toHHmm === dataMaxHHmm){
                            v.to += 5 * 60 * 1000 - 1 // 4분 59.999초
                        }

                        // 외부에서 CoreVital 인스턴스에 접근할 수 있도록 설정
                        const coreVitalInstance = this.options.coreVitalInstance

                        // 선택된 범위를 CoreVital 인스턴스에 저장하고 데이터 갱신 함수 호출
                        if (coreVitalInstance) {
                            coreVitalInstance.updateSelectedRange()
                        }

                        return false // 선택 이벤트를 방지하려면 false를 반환합니다.
                    }
                }
            },
            xAxis: [{
                type: 'datetime',
                labels: {
                    formatter: function () {
                        return Highcharts.dateFormat('%H:%M', this.value);
                    }
                },
                crosshair: true
            }],
            yAxis: [{
                labels: {},
                title: {
                    text: ''
                }
            }],
            tooltip: {
                useHTML: true, // HTML을 사용하여 툴팁을 렌더링
            },
            legend: {
                enabled: false // 범례를 비활성화
            },
            boost: {
                useGPUTranslations: true,
                usePreAllocated: true
            },
            plotOptions: {
                series: {
                    //animation: false,
                    //crisp: false,
                },
            },
            series: [{}]
        }

        // LCP 차트 옵션
        const lcpChartOptions = v.createLineChartOptions(
            basicLineChartOptions,
            'LCP',
            [
                {value: v.THRESHOLDS.LCP.GOOD, color: v.COLORS.GOOD},
                {value: v.THRESHOLDS.LCP.NEEDS_IMPROVEMENT, color: v.COLORS.NEEDS_IMPROVEMENT},
                {color: v.COLORS.POOR}
            ],
            function () {
                return Number(this.value).toFixed(0) / 1000 + 's';
            },
            (value) => Number(value).toFixed(0) / 1000 + 's'
        )

        // FCP 차트 옵션
        const fcpChartOptions = v.createLineChartOptions(
            basicLineChartOptions,
            'FCP',
            [
                {value: v.THRESHOLDS.FCP.GOOD, color: v.COLORS.GOOD},
                {value: v.THRESHOLDS.FCP.NEEDS_IMPROVEMENT, color: v.COLORS.NEEDS_IMPROVEMENT},
                {color: v.COLORS.POOR}
            ],
            function () {
                return Number(this.value).toFixed(0) / 1000 + 's';
            },
            (value) => Number(value).toFixed(0) / 1000 + 's'
        )

        // INP 차트 옵션
        const inpChartOptions = v.createLineChartOptions(
            basicLineChartOptions,
            'INP',
            [
                {value: v.THRESHOLDS.INP.GOOD, color: v.COLORS.GOOD},
                {value: v.THRESHOLDS.INP.NEEDS_IMPROVEMENT, color: v.COLORS.NEEDS_IMPROVEMENT},
                {color: v.COLORS.POOR}
            ],
            '{value}ms',
            (value) => value.toFixed(0) + 'ms'
        )

        // CLS 차트 옵션
        const clsChartOptions = v.createLineChartOptions(
            basicLineChartOptions,
            'CLS',
            [
                {value: v.THRESHOLDS.CLS.GOOD, color: v.COLORS.GOOD},
                {value: v.THRESHOLDS.CLS.NEEDS_IMPROVEMENT, color: v.COLORS.NEEDS_IMPROVEMENT},
                {color: v.COLORS.POOR}
            ],
            '{value}',
            (value) => (value === 0 ? 0 : value.toFixed(4))
        )

        // 차트 생성을 배열과 반복문으로 처리
        const chartConfigs = [
            {id: 'lcpChart', options: lcpChartOptions, property: 'lcpChart'},
            {id: 'fcpChart', options: fcpChartOptions, property: 'fcpChart'},
            {id: 'inpChart', options: inpChartOptions, property: 'inpChart'},
            {id: 'clsChart', options: clsChartOptions, property: 'clsChart'}
        ]

        chartConfigs.forEach(config => {
            this[config.property] = Highcharts.chart(config.id, config.options)
        })

        v.table = new Tabulator("#coreVitalTable", {
            selectableRows: 1,
            layout: 'fitDataFill',
            placeholder: 'Data is being processed',
            columns: [
                {
                    title: 'Page URL',
                    field: 'reqUrl',
                    width: "34%",
                    formatter: cell => {
                        return getPageList(packageNm, serverType, cell.getValue())
                    }
                },
                {
                    title: 'Count',
                    field: 'count',
                    width: '12%',
                    formatter: cell => {
                        return util.comma(cell.getValue())
                    }
                },
                {
                    title: 'Loading (Avg.)',
                    field: 'loadingAvg',
                    width: '18%',
                    formatter: cell => {
                        return util.convertTime(cell.getValue(), false, true, false)
                    }
                },
                {
                    title: 'LCP',
                    field: 'lcp',
                    vertAlign: 'middle',
                    hozAlign: 'center',
                    width: '9%',
                    formatter: (cell) => {
                        if(cell.getData().lcp === ''){
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
                }, {
                    title: 'FCP',
                    field: 'fcp',
                    vertAlign: 'middle',
                    hozAlign: 'center',
                    width: '9%',
                    formatter: (cell) => {
                        if(cell.getData().fcp === ''){
                            return `<span class='btn_yn none'>-</span>`
                        }
                        const fcp = Number(cell.getData().fcp).toFixed(0)
                        const fcpTxt = fcp / 1000 + 's'

                        if (fcp < v.THRESHOLDS.FCP.GOOD) {
                            return `<span class='btn_yn good'>${fcpTxt}</span>`
                        } else if (fcp >= v.THRESHOLDS.FCP.GOOD && fcp < v.THRESHOLDS.FCP.NEEDS_IMPROVEMENT) {
                            return `<span class='btn_yn improve'>${fcpTxt}</span>`
                        } else {
                            return `<span class='btn_yn poor'>${fcpTxt}</span>`
                        }
                    }
                },{
                    title: 'INP',
                    field: 'inp',
                    vertAlign: 'middle',
                    hozAlign: 'center',
                    width: '9%',
                    formatter: (cell) => {
                        if(cell.getData().inp === ''){
                            return `<span class='btn_yn none'>-</span>`
                        }
                        const inp = Number(cell.getData().inp).toFixed(0)
                        if (inp < v.THRESHOLDS.INP.GOOD) {
                            return `<span class='btn_yn good'>${inp}ms</span>`
                        } else if (inp >= v.THRESHOLDS.INP.GOOD && inp < v.THRESHOLDS.INP.NEEDS_IMPROVEMENT) {
                            return `<span class='btn_yn improve'>${inp}ms</span>`
                        } else {
                            return `<span class='btn_yn poor'>${inp}ms</span>`
                        }
                    }
                },
                {
                    title: 'CLS',
                    field: 'cls',
                    vertAlign: 'middle',
                    hozAlign: 'center',
                    width: '9%',
                    formatter: (cell) => {
                        if(cell.getData().cls === ''){
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
                },
            ]
        })
        v.table.on('rowClick', PA0000.func.draw.coreVital.tablePopup.bind(this))

        // core vital 항목별 상세설명 툴팁
        v.createLineChartQuestion()
    }

    setCoreVitalTotalChart(type) {
        const v = this
        const {coreVitalTotalChart} = this
        let labels = [];
        const DESC = v.THRESHOLDS_DESC

        if (type === 'lcp') {
            labels = [DESC.LCP.POOR, DESC.LCP.NEEDS_IMPROVEMENT, DESC.LCP.GOOD]
        } else if (type === 'fcp') {
            labels = [DESC.FCP.POOR, DESC.FCP.NEEDS_IMPROVEMENT, DESC.FCP.GOOD]
        } else if (type === 'inp') {
            labels = [DESC.INP.POOR, DESC.INP.NEEDS_IMPROVEMENT, DESC.INP.GOOD]
        } else if (type === 'cls') {
            labels = [DESC.CLS.POOR, DESC.CLS.NEEDS_IMPROVEMENT, DESC.CLS.GOOD]
        }

        coreVitalTotalChart.series.forEach((series, index) => {
            series.update({
                dataLabels: {
                    formatter: function () {
                        return labels[index]; // 새로운 데이터로 데이터 레이블 업데이트
                    }
                }
            }, false)
        })

        coreVitalTotalChart.redraw()
    }

    setCoreVitalChartData(data) {
        const v = this
        let {LCP, FCP, INP, CLS} = data

        // 데이터 형식 변환 (소수점 처리)
        LCP = Number(LCP.toFixed(0))
        FCP = Number(FCP.toFixed(0))
        INP = Number(INP.toFixed(0))
        CLS = Number(CLS.toFixed(4))

        // 각 지표별 색상 결정 (임계값에 따라 GOOD, NEEDS_IMPROVEMENT, POOR 상태 결정)
        const lcpColor = LCP < v.THRESHOLDS.LCP.GOOD ? v.COLORS.GOOD : 
                        (LCP <= v.THRESHOLDS.LCP.NEEDS_IMPROVEMENT ? v.COLORS.NEEDS_IMPROVEMENT : v.COLORS.POOR)

        const fcpColor = FCP < v.THRESHOLDS.FCP.GOOD ? v.COLORS.GOOD : 
                        (FCP <= v.THRESHOLDS.FCP.NEEDS_IMPROVEMENT ? v.COLORS.NEEDS_IMPROVEMENT : v.COLORS.POOR)

        const inpColor = INP < v.THRESHOLDS.INP.GOOD ? v.COLORS.GOOD : 
                        (INP <= v.THRESHOLDS.INP.NEEDS_IMPROVEMENT ? v.COLORS.NEEDS_IMPROVEMENT : v.COLORS.POOR)

        const clsColor = CLS < v.THRESHOLDS.CLS.GOOD ? v.COLORS.GOOD : 
                        (CLS <= v.THRESHOLDS.CLS.NEEDS_IMPROVEMENT ? v.COLORS.NEEDS_IMPROVEMENT : v.COLORS.POOR)

        // 각 지표별 배경 색상 (상태에 따른 색상 설정 - 게이지 배경으로 사용)
        // 배경 바는 상태 색상으로 전체 너비를 채우고, 실제 값 바가 그 위에 겹치기
        const lcpBgColor = lcpColor
        const fcpBgColor = fcpColor
        const inpBgColor = inpColor
        const clsBgColor = clsColor

        // 각 지표별 임계값 설정 (배경 바의 높이를 결정하는 값)
        // LCP 임계값 설정
        let lcpThreshold = v.THRESHOLDS.LCP.NEEDS_IMPROVEMENT
        if (LCP < v.THRESHOLDS.LCP.GOOD) {
            lcpThreshold = v.THRESHOLDS.LCP.GOOD
        }

        // FCP 임계값 설정
        let fcpThreshold = v.THRESHOLDS.FCP.NEEDS_IMPROVEMENT
        if (FCP < v.THRESHOLDS.FCP.GOOD) {
            fcpThreshold = v.THRESHOLDS.FCP.GOOD
        }

        // INP 임계값 설정
        let inpThreshold = v.THRESHOLDS.INP.NEEDS_IMPROVEMENT
        if (INP < v.THRESHOLDS.INP.GOOD) {
            inpThreshold = v.THRESHOLDS.INP.GOOD
        }

        // CLS 임계값 설정
        let clsThreshold = v.THRESHOLDS.CLS.NEEDS_IMPROVEMENT
        if (CLS < v.THRESHOLDS.CLS.GOOD) {
            clsThreshold = v.THRESHOLDS.CLS.GOOD
        }

        // 차트 데이터 업데이트
        if (v.coreVitalChart) {
            // 각 메트릭의 최대값 설정 (차트 스케일링을 위해 - 백분율 계산에 사용)
            // 각 지표의 GOOD, NEEDS_IMPROVEMENT, POOR 영역이 균일한 간격으로 보이도록 최대값 조정
            const maxValues = {
                'LCP': 7500, // LCP 최대값 (ms)
                'FCP': 5400, // FCP 최대값 (ms)
                'INP': 600,  // INP 최대값 (ms)
                'CLS': 0.3   // CLS 최대값
            };

            // 각 메트릭의 임계값과 실제값 설정
            const thresholds = {
                'LCP': lcpThreshold,
                'FCP': fcpThreshold,
                'INP': inpThreshold,
                'CLS': clsThreshold
            };

            const values = {
                'LCP': LCP,
                'FCP': FCP,
                'INP': INP,
                'CLS': CLS
            };

            const colors = {
                'LCP': { bg: lcpBgColor, value: lcpColor },
                'FCP': { bg: fcpBgColor, value: fcpColor },
                'INP': { bg: inpBgColor, value: inpColor },
                'CLS': { bg: clsBgColor, value: clsColor }
            };

            // 각 메트릭의 툴팁 포맷 함수 (단위 및 소수점 처리)
            const formatTooltip = (metric, value) => {
                if (metric === 'LCP' || metric === 'FCP') {
                    // LCP, FCP는 1초 미만이면 ms, 이상이면 s로 표시
                    return value < 1000 ? `${value} ms` : `${(value / 1000).toFixed(2)} s`;
                } else if (metric === 'INP') {
                    // INP는 항상 ms로 표시 (천 단위 콤마 추가)
                    return `${util.comma(value)} ms`;
                } else { // CLS
                    // CLS는 단위 없이 그대로 표시
                    return `${value}`;
                }
            };

            // 각 메트릭 업데이트 (모든 메트릭에 대해 동일한 로직 적용)
            Object.keys(values).forEach(metric => {
                // 3단계 배경 바와 값 바 요소 찾기
                const bgBarGood = v.coreVitalChart.querySelector(`.${metric.toLowerCase()}-bg-bar-good`);
                const bgBarNeeds = v.coreVitalChart.querySelector(`.${metric.toLowerCase()}-bg-bar-needs`);
                const bgBarPoor = v.coreVitalChart.querySelector(`.${metric.toLowerCase()}-bg-bar-poor`);
                const valueBar = v.coreVitalChart.querySelector(`.${metric.toLowerCase()}-value-bar`);

                if (bgBarGood && bgBarNeeds && bgBarPoor && valueBar) {
                    // 실제값의 너비 계산 (백분율로 변환) - 가로 막대 차트용
                    const valueWidth = (values[metric] / maxValues[metric]) * 100;

                    // 너비가 100%를 넘지 않도록 제한 (최대값 초과 시 100%로 제한)
                    const limitedValueWidth = Math.min(valueWidth, 100);

                    // 임계값 백분율 계산 (GOOD과 NEEDS_IMPROVEMENT 임계값)
                    // 각 지표별 임계값을 백분율로 변환하여 배경 바의 영역 너비 계산
                    const goodThresholdPercent = (v.THRESHOLDS[metric].GOOD / maxValues[metric]) * 100;
                    const needsThresholdPercent = (v.THRESHOLDS[metric].NEEDS_IMPROVEMENT / maxValues[metric]) * 100;

                    // 각 영역의 너비 계산 (GOOD, NEEDS_IMPROVEMENT, POOR)
                    // 3단계 영역을 나누는 수치값은 실제값의 색상이 바뀌는 영역을 기준으로 나눔
                    const goodWidth = Math.min(goodThresholdPercent, 100); // GOOD 영역 너비 (0부터 GOOD 임계값까지)
                    const needsWidth = Math.min(needsThresholdPercent - goodThresholdPercent, 100 - goodWidth); // NEEDS_IMPROVEMENT 영역 너비 (GOOD부터 NEEDS_IMPROVEMENT 임계값까지)
                    const poorWidth = Math.max(0, 100 - goodWidth - needsWidth); // POOR 영역 너비 (NEEDS_IMPROVEMENT 임계값 이상)

                    // GOOD 영역 배경 바 업데이트
                    // 뒤에 불투명한 배경을 GOOD, NEEDS_IMPROVEMENT, POOR 3개 단계로 색상이 다르게 표시
                    bgBarGood.style.width = `${goodWidth}%`;
                    bgBarGood.style.left = '0'; // 항상 왼쪽에서 시작

                    // NEEDS_IMPROVEMENT 영역 배경 바 업데이트
                    // 3단계의 영역을 나누는 수치값은 실제값의 색상이 바뀌는 영역을 기준으로 나눔
                    bgBarNeeds.style.width = `${needsWidth}%`;
                    bgBarNeeds.style.left = `${goodWidth}%`; // GOOD 영역 다음에 위치

                    // POOR 영역 배경 바 업데이트
                    // 각 영역은 해당 상태의 색상으로 표시됨 (GOOD, NEEDS_IMPROVEMENT, POOR)
                    bgBarPoor.style.width = `${poorWidth}%`;
                    bgBarPoor.style.left = `${goodWidth + needsWidth}%`; // NEEDS_IMPROVEMENT 영역 다음에 위치

                    // 값 바 업데이트 (실제 값 표시)
                    valueBar.style.width = `${limitedValueWidth}%`;
                    valueBar.style.backgroundColor = colors[metric].value;

                }
            });
        }

        // 각 배경 바에 대한 텍스트 요소 추가 (배경 바 밖에 별도 요소로 생성하여 opacity 영향 받지 않도록 함)
        // 메트릭 이름 배열 (텍스트를 추가할 모든 메트릭)
        const metrics = ['LCP', 'FCP', 'INP', 'CLS'];

        // 각 메트릭에 대해 텍스트 요소 생성 및 위치 설정
        metrics.forEach(metric => {
            // 3단계 배경 바 요소 찾기
            const bgBarGood = v.coreVitalChart.querySelector(`.${metric.toLowerCase()}-bg-bar-good`);
            const bgBarNeeds = v.coreVitalChart.querySelector(`.${metric.toLowerCase()}-bg-bar-needs`);
            const bgBarPoor = v.coreVitalChart.querySelector(`.${metric.toLowerCase()}-bg-bar-poor`);

            if (bgBarGood && bgBarNeeds && bgBarPoor) {
                // 임계값 백분율 계산 (GOOD과 NEEDS_IMPROVEMENT 임계값)
                const maxValues = {
                    'LCP': 7500, // LCP 최대값 (ms)
                    'FCP': 5400, // FCP 최대값 (ms)
                    'INP': 600,  // INP 최대값 (ms)
                    'CLS': 0.3   // CLS 최대값
                };

                // 각 영역의 너비 계산 (백분율)
                const goodThresholdPercent = (v.THRESHOLDS[metric].GOOD / maxValues[metric]) * 100;
                const needsThresholdPercent = (v.THRESHOLDS[metric].NEEDS_IMPROVEMENT / maxValues[metric]) * 100;

                const goodWidth = Math.min(goodThresholdPercent, 100);
                const needsWidth = Math.min(needsThresholdPercent - goodThresholdPercent, 100 - goodWidth);
                const poorWidth = Math.max(0, 100 - goodWidth - needsWidth);

                // 기존 텍스트 요소 제거 (있을 경우)
                const existingTexts = v.coreVitalChart.querySelectorAll(`.${metric.toLowerCase()}-text`);
                existingTexts.forEach(el => el.remove());

                // GOOD 영역 텍스트 요소 생성
                const goodText = document.createElement('div');
                goodText.className = `${metric.toLowerCase()}-text ${metric.toLowerCase()}-good-text core-vital-bg-bar-text core-vital-good-text`;
                goodText.textContent = v.THRESHOLDS_DESC[metric].GOOD;
                goodText.style.left = `${(goodWidth / 2)}%`;
                goodText.style.transform = 'translateX(-50%)';
                bgBarGood.parentElement.appendChild(goodText);

                // NEEDS_IMPROVEMENT 영역 텍스트 요소 생성
                const needsText = document.createElement('div');
                needsText.className = `${metric.toLowerCase()}-text ${metric.toLowerCase()}-needs-text core-vital-bg-bar-text core-vital-needs-text`;
                needsText.textContent = v.THRESHOLDS_DESC[metric].NEEDS_IMPROVEMENT;
                needsText.style.left = `${goodWidth + (needsWidth / 2)}%`;
                needsText.style.transform = 'translateX(-50%)';
                bgBarNeeds.parentElement.appendChild(needsText);

                // POOR 영역 텍스트 요소 생성
                const poorText = document.createElement('div');
                poorText.className = `${metric.toLowerCase()}-text ${metric.toLowerCase()}-poor-text core-vital-bg-bar-text core-vital-poor-text`;
                poorText.textContent = v.THRESHOLDS_DESC[metric].POOR;
                poorText.style.left = `${goodWidth + needsWidth + (poorWidth / 2)}%`;
                poorText.style.transform = 'translateX(-50%)';
                bgBarPoor.parentElement.appendChild(poorText);
            }
        });

        // 평균값 텍스트 업데이트 (차트 아래 표시되는 값)
        // LCP가 1초 미만인 경우엔 ms로 표기
        if (LCP < 1000) $('#lcpAvg').text(LCP + ' ms')
        else $('#lcpAvg').text(LCP / 1000 + ' s')

        // FCP가 1초 미만인 경우엔 ms로 표기
        if (FCP < 1000) $('#fcpAvg').text(FCP + ' ms')
        else $('#fcpAvg').text(FCP / 1000 + ' s')

        // INP는 항상 ms로 표기 (천 단위 콤마 추가)
        $('#inpAvg').text(util.comma(INP) + ' ms')

        // CLS는 단위 없이 그대로 표기
        $('#clsAvg').text(CLS)
    }

    setLineChartData(data) {
        const {lcpChart, fcpChart, inpChart, clsChart} = this

        if (data) {
            const {lcp, fcp, inp, cls} = data

            lcpChart.series[0].setData(lcp)
            fcpChart.series[0].setData(fcp)
            inpChart.series[0].setData(inp)
            clsChart.series[0].setData(cls)
        }
    }

    setTableData(data) {
        const v = this

        v.table.setData(data)
    }

    /**
     * 차트 데이터 초기화
     * 모든 차트와 테이블의 데이터를 초기 상태로 리셋
     */
    clear() {
        const v = this

        // Core Vital 차트 초기화
        if (v.coreVitalChart) {
            // 메트릭 이름 배열 (초기화할 모든 메트릭)
            const metrics = ['LCP', 'FCP', 'INP', 'CLS'];

            // 각 메트릭의 바 요소 초기화 (모든 메트릭에 대해 동일한 초기화 로직 적용)
            metrics.forEach(metric => {
                // 3단계 배경 바와 값 바 요소 찾기 (DOM 요소 선택)
                const valueBar = v.coreVitalChart.querySelector(`.${metric.toLowerCase()}-value-bar`);
                const bgBarGood = v.coreVitalChart.querySelector(`.${metric.toLowerCase()}-bg-bar-good`);
                const bgBarNeeds = v.coreVitalChart.querySelector(`.${metric.toLowerCase()}-bg-bar-needs`);
                const bgBarPoor = v.coreVitalChart.querySelector(`.${metric.toLowerCase()}-bg-bar-poor`);

                if (bgBarGood && bgBarNeeds && bgBarPoor && valueBar) {
                    // 임계값 백분율 계산 (GOOD과 NEEDS_IMPROVEMENT 임계값)
                    // 각 지표의 GOOD, NEEDS_IMPROVEMENT, POOR 영역이 균일한 간격으로 보이도록 최대값 조정
                    const maxValues = {
                        'LCP': 7500, // LCP 최대값 (ms)
                        'FCP': 5400, // FCP 최대값 (ms)
                        'INP': 600,  // INP 최대값 (ms)
                        'CLS': 0.3   // CLS 최대값
                    };

                    // 초기 상태에서 임계값에 따라 3단계 배경 바 설정
                    // 차트 초기화 시에도 3단계 배경 바의 영역을 임계값에 맞게 설정
                    const goodThresholdPercent = (v.THRESHOLDS[metric].GOOD / maxValues[metric]) * 100;
                    const needsThresholdPercent = (v.THRESHOLDS[metric].NEEDS_IMPROVEMENT / maxValues[metric]) * 100;

                    // 각 영역의 너비 계산 (GOOD, NEEDS_IMPROVEMENT, POOR)
                    // 3단계 영역을 나누는 수치값은 실제값의 색상이 바뀌는 영역을 기준으로 나눔
                    const goodWidth = Math.min(goodThresholdPercent, 100); // GOOD 영역 너비 (0부터 GOOD 임계값까지)
                    const needsWidth = Math.min(needsThresholdPercent - goodThresholdPercent, 100 - goodWidth); // NEEDS_IMPROVEMENT 영역 너비 (GOOD부터 NEEDS_IMPROVEMENT 임계값까지)
                    const poorWidth = Math.max(0, 100 - goodWidth - needsWidth); // POOR 영역 너비 (NEEDS_IMPROVEMENT 임계값 이상)

                    // GOOD 영역 배경 바 초기화
                    // 뒤에 불투명한 배경을 GOOD, NEEDS_IMPROVEMENT, POOR 3개 단계로 색상이 다르게 표시
                    bgBarGood.style.width = `${goodWidth}%`;
                    bgBarGood.style.left = '0'; // 항상 왼쪽에서 시작

                    // NEEDS_IMPROVEMENT 영역 배경 바 초기화
                    // 3단계의 영역을 나누는 수치값은 실제값의 색상이 바뀌는 영역을 기준으로 나눔
                    bgBarNeeds.style.width = `${needsWidth}%`;
                    bgBarNeeds.style.left = `${goodWidth}%`; // GOOD 영역 다음에 위치

                    // POOR 영역 배경 바 초기화
                    // 각 영역은 해당 상태의 색상으로 표시됨 (GOOD, NEEDS_IMPROVEMENT, POOR)
                    bgBarPoor.style.width = `${poorWidth}%`;
                    bgBarPoor.style.left = `${goodWidth + needsWidth}%`; // NEEDS_IMPROVEMENT 영역 다음에 위치

                    // 값 바 초기화 (너비와 색상 초기화) - 가로 막대 차트용
                    // 값 바는 초기에 보이지 않게 너비를 0으로 설정
                    valueBar.style.width = '0';                // 너비를 0으로 설정 (가로 막대가 보이지 않게)
                    valueBar.style.backgroundColor = v.COLORS.GOOD; // 색상을 GOOD 상태 색상으로 설정

                    // 기존 텍스트 요소 제거 (있을 경우)
                    const existingTexts = v.coreVitalChart.querySelectorAll(`.${metric.toLowerCase()}-text`);
                    existingTexts.forEach(el => el.remove());

                    // GOOD 영역 텍스트 요소 생성
                    const goodText = document.createElement('div');
                    goodText.className = `${metric.toLowerCase()}-text ${metric.toLowerCase()}-good-text core-vital-bg-bar-text core-vital-good-text`;
                    goodText.textContent = v.THRESHOLDS_DESC[metric].GOOD;
                    goodText.style.left = `${(goodWidth / 2)}%`;
                    goodText.style.transform = 'translateX(-50%)';
                    bgBarGood.parentElement.appendChild(goodText);

                    // NEEDS_IMPROVEMENT 영역 텍스트 요소 생성
                    const needsText = document.createElement('div');
                    needsText.className = `${metric.toLowerCase()}-text ${metric.toLowerCase()}-needs-text core-vital-bg-bar-text core-vital-needs-text`;
                    needsText.textContent = v.THRESHOLDS_DESC[metric].NEEDS_IMPROVEMENT;
                    needsText.style.left = `${goodWidth + (needsWidth / 2)}%`;
                    needsText.style.transform = 'translateX(-50%)';
                    bgBarNeeds.parentElement.appendChild(needsText);

                    // POOR 영역 텍스트 요소 생성
                    const poorText = document.createElement('div');
                    poorText.className = `${metric.toLowerCase()}-text ${metric.toLowerCase()}-poor-text core-vital-bg-bar-text core-vital-poor-text`;
                    poorText.textContent = v.THRESHOLDS_DESC[metric].POOR;
                    poorText.style.left = `${goodWidth + needsWidth + (poorWidth / 2)}%`;
                    poorText.style.transform = 'translateX(-50%)';
                    bgBarPoor.parentElement.appendChild(poorText);
                }
            });

            // 평균값 텍스트 초기화 (차트 아래 표시되는 값들 초기화)
            $('#lcpAvg').text('-'); // LCP 평균값 초기화
            $('#fcpAvg').text('-'); // FCP 평균값 초기화
            $('#inpAvg').text('-'); // INP 평균값 초기화
            $('#clsAvg').text('-'); // CLS 평균값 초기화
        }

        // 라인 차트 초기화 (Highcharts 라인 차트는 그대로 유지)
        v.lcpChart.series[0].setData([]) // LCP 라인 차트 데이터 초기화
        v.fcpChart.series[0].setData([]) // FCP 라인 차트 데이터 초기화
        v.inpChart.series[0].setData([]) // INP 라인 차트 데이터 초기화
        v.clsChart.series[0].setData([]) // CLS 라인 차트 데이터 초기화

        // 테이블 초기화 (테이블 데이터 삭제)
        if (v.table.rowManager.renderer) {
            v.table.clearData() // 테이블 데이터 초기화
        }
    }

    clearTable() {
        const v = this
        if (v.table.rowManager.renderer) {
            v.table.clearData()
        }
    }

    // LCP, FCP, INP, CLS 라인차트 옵션을 각 차트에 맞춤설정
    createLineChartOptions(basicLineChartOptions, metricName, zones, labelFormat, valueFormatter) {
        const options = _.cloneDeep(basicLineChartOptions)
        options.series[0].name = metricName
        options.series[0].zones = zones

        // 라벨 포맷 설정
        if (typeof labelFormat === 'function') {
            options.yAxis[0].labels.formatter = labelFormat
        } else {
            options.yAxis[0].labels.format = labelFormat
        }

        function createLineChartTooltip(timestamp, color, metricName, value) {
            return `
                <div class="core_vital_line_tooltip">
                    <span>
                        ${util.timestampToDate(timestamp)} ${util.timestampToHourMin(timestamp, 'HH:mm')}
                    </span><br/>
                    <span style="color: ${color}">\u25CF</span>
                    <span>${metricName}: </span>
                    <span class="bold">${value}</span>
                </div>
            `
        }

        // 툴팁 포맷터 설정
        options.tooltip.formatter = function () {
            const formattedValue = valueFormatter ? valueFormatter(this.y) : this.y
            return createLineChartTooltip(this.x, this.point.color, metricName, formattedValue)
        };

        return options
    }

    // core vital 항목별 상세설명 툴팁
    createLineChartQuestion() {
        const textGood = trl('dashboard.waterfall.good')
        const textNeedsImprovement = trl('dashboard.waterfall.needsImprovement')
        const textPoor = trl('dashboard.waterfall.poor')

        // 툴팁 생성 함수
        const createTooltip = (metric, criteria, description) => {
            return tippy(`.ic_question.${metric.name.toLowerCase()}`, {
                content: `
                    <div class="tooltip_criteria_wrap" style="color: black;">${metric.fullName}</div>
                    <div class="tooltip_criteria_wrap" style="color: black;">${criteria}</div>
                    <div class="tooltip_vital_desc" style="color: black;">${description}</div>
                `,
                arrow: false,
                placement: 'bottom',
                allowHTML: true,
                theme: 'maxy-tooltip'
            })
        }

        // 기준 HTML 생성 함수
        const createCriteria = (metric, unit = '') => {
            const thresholds = this.THRESHOLDS[metric]
            const formatValue = (value) => {
                // LCP, FCP의 경우 초 단위로 변환
                return metric === 'LCP' || metric === 'FCP' ? Number(value) / 1000 + 's' : value + unit
            };

            return `
                <div class="criteria"><span class="bp bp_green">${textGood} : </span> ≤ ${formatValue(thresholds.GOOD)}</div>
                <div class="criteria"><span class="bp bp_yellow">${textNeedsImprovement} : </span> ${formatValue(thresholds.GOOD)} – ${formatValue(thresholds.NEEDS_IMPROVEMENT)}</div>
                <div class="criteria"><span class="bp bp_red">${textPoor} : </span> > ${formatValue(thresholds.NEEDS_IMPROVEMENT)}</div>
            `
        }

        // 각 지표별 설정
        const metrics = [
            {
                name: 'LCP',
                fullName: 'Largest Contentful Paint',
                unit: '',  // LCP는 createCriteria 내에서 특별 처리
                descKey: 'dashboard.waterfall.vitalLcpDesc'
            },
            {
                name: 'FCP',
                fullName: 'First Contentful Paint',
                unit: '',  // FCP는 createCriteria 내에서 특별 처리
                descKey: 'dashboard.waterfall.vitalFcpDesc'
            },
            {
                name: 'INP',
                fullName: 'Interaction to Next Paint',
                unit: 'ms',
                descKey: 'dashboard.waterfall.vitalInpDesc'
            },
            {
                name: 'CLS',
                fullName: 'Cumulative Layout Shift',
                unit: '',
                descKey: 'dashboard.waterfall.vitalClsDesc'
            }
        ]

        // 각 지표별로 툴팁 생성
        metrics.forEach(metric => {
            const criteria = createCriteria(metric.name, metric.unit)
            const description = trl(metric.descKey)
            createTooltip(metric, criteria, description)
        })
    }

    // CoreVital 클래스에 추가할 메서드
    updateSelectedRange() {
        // 타겟 페이지의 getVitalListByPage 함수 호출
        if (this.targetPage && this.targetPage.func && this.targetPage.func.fetch &&
            this.targetPage.func.fetch.coreVital && this.targetPage.func.fetch.coreVital.getVitalListByPage) {

            this.targetPage.func.fetch.coreVital.getVitalListByPage();
        }
    }
}
