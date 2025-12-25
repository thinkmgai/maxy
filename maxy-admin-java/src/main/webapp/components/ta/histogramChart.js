class HistogramChart {
    constructor(props) {

        this.id = props.id
        this.chart = null
        this.targetPage = props.targetPage
        this.dataMax = null // 차트 최대 시간값, setExtremes을 한번 타야 알수있음..
        this.minRange = 60 * 1000 // navigation 최소 범위, 최소값 5분
        this.data = null // setData로 들어온 data, chart객체에서 가져오려 했는데 navigation바로 보여진 data만 객체안에 들어가는거같음

        this.create()
    }

    create() {
        const {id, targetPage} = this
        const $target = $('#' + id)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + id
        }
        $target.empty()

        // type : error, crash, page
        const type = sessionStorage.getItem('la-tab');

        this.chart = Highcharts.stockChart(id, {
            chart: {
                height: '280px',
                alignTicks: false,
                events: {
                    load: function () {
                        // 차트 그려줄때 로딩바 켜주기
                        util.chartLoading(this, true)
                    }
                }
            },
            subtitle: {
                align: 'right'
            },
            rangeSelector: {
                enabled: false
            },
            navigator: {
                xAxis: {
                    labels: {
                        style: {
                            fontWeight: '0',
                            textShadow: false,
                            textOutline: false
                        }
                    }
                }
            },
            xAxis: [{
                type: 'datetime',
                dateTimeLabelFormats: {
                    second: '%H:%M:%S',
                    minute: '%H:%M',
                    hour: '%H:%M'
                },
                events: {
                    setExtremes: util.debounce(function (event) {
                        const {target} = event // extremes event
                        const {targetPage, minRange} = this

                        // 보여지고 있는 xAxis time 시작과 끝
                        const firstTick = this.chart.xAxis[0].tickPositions[0]
                        let finalTick = this.chart.xAxis[0].tickPositions[this.chart.xAxis[0].tickPositions.length - 1]

                        // 오늘을 포함하고 있으면서 navigator바가 차트 x축끝에 있을때
                        if(target.dataMax < target.userMax){
                            finalTick = Math.floor(target.userMax)
                        }

                        // series data에서 보여지고 있는 xAxis의 값을 찾아서 모두 더해줌
                        const matchedData = this.data.filter(item => item[0] >= firstTick && item[0] <= finalTick);
                        const total = matchedData.reduce((sum, point) => sum + point[1], 0);

                        // 서브타이틀 변경
                        // yyyy-MM-dd HH:mm ~ yyyy-MM-dd HH:mm
                        this.chart.setTitle(null, {'text': util.timestampToDate(firstTick) + ' ' + util.timestampToHourMin(firstTick, 'HH:mm')
                                + ' ~ ' + util.timestampToDate(finalTick) + ' ' + util.timestampToHourMin(finalTick, 'HH:mm') })

                        // histogram navigator 설정 시간
                        targetPage.v.time.from = firstTick

                        // interval 단위로 조정
                        // ex) minRange가 10m이면 newMin과 newMax의 시간이 10분간격으로 보여지게끔...
                        const interval = minRange / 5

                        // navigation의 max가 최대값이고 날짜가 오늘이라면 현재시간의 초 단위를 더해줌
                        // 아니면 interval-1초 더해줌 ex) interval이 10분이면 10분-1초
                        const now = new Date().getTime()

                        // 막대차트 최대 시간값
                        this.dataMax = target.dataMax
                        if(target.dataMax === finalTick && now - finalTick < 60000){
                            targetPage.v.time.to = finalTick + targetPage.v.time.searchToSecond
                        }else{
                            targetPage.v.time.to = finalTick + (interval-1)
                        }

                        // count, table 초기화
                        targetPage.v.chart.count.clear()
                        targetPage.v.chart.table.clear()

                        // log count 데이터 세팅
                        // 함수재조회 안하고 histogram차트의 데이터로 구성
                        // navigation바를 옮겨서 to시간을 현재시간으로 조회할 경우 histogram차트는 함수재조회가 없는 반면
                        // count를 함수재조회 할 경우 늦게들어온 로그로 인해 histogram막대차트와 count수가 맞지않아서
                        // type : error, crash, page
                        let type = sessionStorage.getItem('la-tab');
                        if(type === "page") type += "View"

                        const countData = {}
                        countData[type + 'Total'] = targetPage.v.count.Total
                        countData[type + 'YDA'] = targetPage.v.count.YDA
                        countData[type] = total
                        targetPage.func.set.count(countData)
                        
                        // log table 조회
                        targetPage.func.fetch.table()

                    }, 300, this)
                }
            }],
            yAxis: {
                labels: {
                    enabled: false
                }
            },
            series: [{
                events: {
                    click: function (e) {
                        // 시작 시간값
                        const from = e.point.category
                        // 다른 시리즈와의 시간차이
                        const diff = e.point.series.closestPointRange

                        // 테이블 변수 초기화
                        targetPage.v.chart.table.clear()

                        // 시작시간값 ~ (시작시간 + 차이 - 1)
                        const searchFrom = new Date(from).setMilliseconds("000");
                        const searchTo = new Date(from + diff - 1).getTime()

                        // log table 조회
                        targetPage.func.fetch.table(searchFrom, searchTo)
                    }
                },
                type: 'column',
                name: type,
                data: []
            }]
        })
    }

    setData(data, param) {
        const {chart, targetPage} = this
        this.data = data
        // type : error, crash, page
        const type = sessionStorage.getItem('la-tab');
        let color
        if (type === "page") {
            color = '#7277ff'
        } else if (type === "error") {
            color = '#FFC700'
        } else if (type === "crash") {
            color = '#FF6969'
        }

        // 사용자가 선택한 mix/max 영역
        let min = chart.xAxis[0].getExtremes().userMin
        let max = chart.xAxis[0].getExtremes().userMax

        // interval에따라 최소 설정 가능 범위
        this.minRange = 60 * 1000 // 1분, 초기화
        if (param.interval === '1m') {
            this.minRange = this.minRange * 5 // 5분
        } else if (param.interval === '5m') {
            this.minRange = this.minRange * 25 // 25분
        } else if (param.interval === '10m') {
            this.minRange = this.minRange * 50 // 50분
        } else if (param.interval === '1h') {
            this.minRange = this.minRange * 300 // 5시간
        }

        // interval 단위로 조정
        // ex) minRange가 10m이면 newMin과 newMax의 시간이 10분간격으로 보여지게끔...
        const interval = this.minRange / 5

        // 초기 navigation바 영역 설정
        // 사용자가 지정한 영역이 없다면 영역을 interval에 따라 임의로 지정
        if (typeof min === 'undefined' || typeof max === 'undefined') {
            // min값은 분단위로 떨어지게 하려고
            min = new Date(param.to - targetPage.v.time.searchToSecond - this.minRange).getTime()
            max = param.to

            chart.update({
                xAxis: [{
                    min: min,
                    max: max
                }]
            }, false) // 차트 다시 그리지않음
        } else {
            min = Math.round(Math.round(min) / interval) * interval
            max = Math.floor(Math.floor(max) / interval) * interval

            // 설정 영역이 최소 설정범위보다 작으면
            if(max - min < this.minRange){
                // min값 조정
                min = max - this.minRange
            }

            // navigation의 max가 최대값일때 현재시간의 초 단위를 더해줌
            // 아니면 59.999초 더해줌
            const now = new Date().getTime()
            if(this.dataMax === max && now - max < 60000){
                max += targetPage.v.time.searchToSecond
            }else{
                max += (interval-1)
            }

            // 설정한 값으로 userMin, userMax값 변경
            this.clearUserRange(min, max)
        }

        chart.update({
            plotOptions: {
                column: {
                    color: color
                }
            },
            xAxis: [{
                tickInterval: interval
            }],
            series: [{
                name: type,
                data: data
            }]
        });

        // 보여지고 있는 xAxis time 시작과 끝
        const firstTick = chart.xAxis[0].tickPositions[0]
        const finalTick = chart.xAxis[0].tickPositions[this.chart.xAxis[0].tickPositions.length - 1]

        // 서브타이틀 변경
        // yyyy-MM-dd HH:mm ~ yyyy-MM-dd HH:mm
        chart.setTitle(null, {'text': util.timestampToDate(firstTick) + ' ' + util.timestampToHourMin(firstTick, 'HH:mm')
                + ' ~ ' + util.timestampToDate(finalTick) + ' ' + util.timestampToHourMin(finalTick, 'HH:mm') })

        // 로딩바 꺼주기
        util.chartLoading(chart, false)

        // histogram 설정시간 저장
        targetPage.v.time.from = firstTick
        // navigation의 max가 최대값일때 현재시간의 초 단위를 더해줌
        // 아니면 59.999초 더해줌
        const now = new Date().getTime()
        if(this.dataMax === finalTick && now - finalTick < 60000){
            targetPage.v.time.to = finalTick + targetPage.v.time.searchToSecond
        }else{
            targetPage.v.time.to = finalTick + (interval-1)
        }

        // log count 조회
        targetPage.func.fetch.count()
        // log table 조회
        targetPage.func.fetch.table()
    }

    clear() {
        util.chartLoading(this.chart, true)
        this.chart.series[0].setData([])
    }

    // xAxis의 사용자 설정 min, max값 초기화
    clearUserRange(userMin, userMax) {
        const {chart} = this

        // 사용자가 선택한 mix/max 영역 초기화가 필요한데
        // xAxis.setExtremes 명령어로 바꿀경우 charts의  event.setExtremes 이벤트가 동작해서
        // 잠시 event.setExtremes 이벤트를 비활성화 후 userMin, userMax값을 초기화함

        // 1. 기존 이벤트 핸들러를 저장
        const xAxis = chart.xAxis[0];
        const originalSetExtremes = xAxis.options.events?.setExtremes

        // 2. 이벤트를 비활성화
        xAxis.update({
            events: {
                setExtremes: null
            }
        }, false); // 차트 리렌더링 방지

        // 3. userMin, userMax 초기화
        xAxis.setExtremes(userMin, userMax);

        // 4. 원래 이벤트 핸들러 복원
        xAxis.update({
            events: {
                setExtremes: originalSetExtremes
            }
        }, false); // 차트 리렌더링 방지
    }
}