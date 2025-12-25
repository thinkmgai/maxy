/*
   종합 분석 > Basic Information > CCU (동시 접속자수) 팝업
*/
class MaxyFrontPopupCcuDetail {
    constructor(options) {
        this.appendId = options.appendId
        this.id = options.id
        this.title = options.title
        this.isOsDivision = options.isOsDivision
        this.data = options.data
        this.baseDate = options.baseDate
        this.func = options.func
        this.summaryTitle = options.summaryTitle
        this.type = options.type

        if (!this.id || !this.appendId || !this.title) {
            console.log('check parameter')
            return false
        }
        this.setHandlebarsHelper()
    }

    addEventListener() {
        const v = this
        $('.dimmed').on('click', () => {
            v.closePopup(v)
        })
    }

    async init() {
        const {id, title, appendId, type, summaryTitle} = this
        const v = this
        const source = await fetch(
            '/components/db/popup/popup-ccu-detail.html')
            .then(response => response.text())

        const template = Handlebars.compile(source)
        const $target = $('#' + appendId)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + appendId
        }
        $target.empty()

        $target.append(template({id, title, summaryTitle}))

        $('#summaryWrap').css('grid-template-columns', 'repeat(' + type + ',1fr')

        this.chart = Highcharts.chart(id + 'GraphWrap', {
            chart: {
                zoomType: 'x'
            },
            yAxis: [{
                min: 0,
                labels: {
                    formatter: function () {
                        return util.comma(this.value)
                    }
                }
            }],
            legend: {
                enabled: false
            },
            xAxis: [{
                type: 'datetime',
                labels: {
                    formatter: function () {
                        // 하루치 조회인 경우 시간 형식만 보여줌
                        if (v.fromDate === v.toDate) {
                            return util.timestampToHourMin(+this.value, 'HH:mm') // HH:mm 형식으로 변환
                        } else {
                            // 날짜 멀티선택한 경우 날짜로 구분지어 보여줌
                            return util.timestampToDate(+this.value) // HH:mm 형식으로 변환
                        }

                    }
                }
            }],
            plotOptions: {
                series: {
                    label: {
                        connectorAllowed: false
                    },
                    point: {
                        events: {
                            click: function () {
                                const date = this.x
                                const index = this.index

                                v.updateData(date, index, true)
                            }
                        }
                    }
                }
            },
            series: [],
            tooltip: {
                shared: true, // 여러 시리즈에 대한 툴팁 공유
                formatter: function () {
                    try {
                        let time
                        // 하루치 조회인 경우 시간 형식만 보여줌
                        if (v.fromDate === v.toDate) {
                            time = util.timestampToHourMin(+this.x, 'HH:mm') // HH:mm 형식으로 변환
                        } else {
                            // 날짜 멀티선택한 경우 날짜로 구분지어 보여줌
                            time = util.timestampToDate(+this.x)
                        }

                        let tooltipTime = `${time}<br/>` // x축 값 표시 (시간)
                        let all = 0

                        let tooltipData = ''

                        this.points.forEach(point => {
                            all += point.y // 각 point.y 값을 더함

                            const formattedValue = `<b>${util.comma(point.y)}</b>`; // util.comma 함수 적용하고 <b>로 강조
                            tooltipData += `<span style="color:${point.series.color}">\u25CF</span> ${point.series.name}: ${formattedValue}<br/>`; // 각 시리즈의 색상과 값 표시
                        });


                        return tooltipTime + tooltipData
                    } catch (e) {
                        console.log(e)
                    }
                }
            }
        })

        this.initCalendar()

        updateContent()

        this.addEventListener()
        this.openPopup()
    }


    getBiDetail(key, date) {
        const v = this

        const param = {
            packageNm: $('#packageNm').val(),
            serverType: $('#packageNm option:checked').data('server-type'),
            dateType: 'DAY',
            type: key
        }

        let type
        if (key) {
            if (key.startsWith('count')) {
                type = key.substring(5).toUpperCase()
            }
        }

        if (!date && key === 'countCcu') {
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
                v.data = data
                v.drawChart()
            });
        }
    }

    initCalendar() {
        const {id} = this
        const v = this

        try {
            // 첫 진입 시엔 from, to 모두 오늘 날짜
            this.toDate = util.getDate(0)
            this.toDate = util.getDateToString(this.toDate)

            // 하루 전 날짜
            this.fromDate = this.toDate

            // 캘린더 객체를 변수에 저장하여 나중에 사용
            const calendarInstance = calendar.init({
                id: id + 'Calendar',
                fn: (dates, date) => {
                    // 30일 이상은 조회 안됨
                    const period = util.getDateDiff(this.toDate, this.fromDate)

                    if (period > 30) {
                        toast(trl('common.msg.date30'))
                        return
                    }

                    if (dates.length > 1) {
                        this.fromDate = dates[0]
                        this.toDate = dates[dates.length - 1]
                    } else {
                        this.fromDate = dates[0]
                        this.toDate = dates[0]
                    }

                    // 서버에 보낼 땐 타임스탬프로 변환
                    const from = util.dateToTimestamp(new Date(this.fromDate), true)
                    const to = util.dateToTimestamp(new Date(this.toDate), false)
                    const dateParam = {from, to}

                    v.getBiDetail(id, dateParam)
                },
                created: () => {
                    /* 디폴트는 오늘 날짜
                        최대 6개월까지 선택 가능
                    */
                    const $calendar = $('#' + id + 'Calendar')
                    $calendar.val(this.fromDate)
                    $calendar.siblings('.btn_calendar').unbind('click').bind('click', function(){
                        $calendar.trigger('click')
                    })
                }
            })
        } catch (e) {
            console.log(e)
        }
    }

    drawChart() {
        let {data, chart, fromDate, toDate} = this

        try {
            while (chart.series.length) {
                chart.series[0].remove()
            }

            const darkModeYn = sessionStorage.getItem('maxyDarkYn')

            // 줌버튼이 있는 경우 차트의 줌 초기화
            const $zoomResetBtn = $('.highcharts-a11y-proxy-group-zoom > button')
            if($zoomResetBtn.length > 0){
                $zoomResetBtn.trigger('click')
            }

            chart.update({
                chart: {
                    type: fromDate !== toDate ? 'column' : 'areaspline'
                },
                plotOptions: {
                    series: {
                        animation: false // 기본 애니메이션 활성화
                    },
                    areaspline: {
                        fillOpacity: 0.5,
                        marker: {
                            enabled: false,
                            states: {
                                hover: {
                                    enabled: true
                                }
                            }
                        }
                    }
                }
            });

            const {chartData, peak} = data

            if(!chartData) {
                return
            }

            if (peak) {
                $("[data-bitype='avg']").text(util.comma(peak))
            }

            // 새로운 배열 형식 처리: [202510010000, 0] 형태
            // chartData가 배열 형식인지 확인
            if (Array.isArray(chartData)) {
                // 배열 데이터를 Highcharts 형식으로 변환
                const convertedData = chartData.map(item => {
                    if (Array.isArray(item) && item.length === 2) {
                        // [202510010000, 0] 형태를 [timestamp, value]로 변환
                        const timeString = item[0].toString();
                        // 202510010000 형태를 타임스탬프로 변환 (YYYYMMDDHHMM)
                        const year = parseInt(timeString.substring(0, 4));
                        const month = parseInt(timeString.substring(4, 6)) - 1; // 월은 0부터 시작
                        const day = parseInt(timeString.substring(6, 8));
                        const hour = parseInt(timeString.substring(8, 10));
                        const minute = parseInt(timeString.substring(10, 12));

                        const timestamp = new Date(year, month, day, hour, minute).getTime();

                        return [timestamp, item[1]];
                    }
                    return item;
                });

                let lastIndex = convertedData.length - 1;
                let lastDate = convertedData[lastIndex] ? convertedData[lastIndex][0] : null;

                // 단일 시리즈로 차트에 추가
                this.chart.addSeries({
                    name: 'CCU',
                    data: convertedData,
                    color: {
                        linearGradient: {x1: 0, x2: 0, y1: 0, y2: 1},
                        stops: darkModeYn === 'Y' ? hcColors.stock.background.dark : hcColors.stock.background.light
                    }
                });

                console.log(this.chart)

                // 마지막 날짜와 인덱스가 유효한 경우 업데이트
                if (lastDate !== null && lastIndex >= 0) {
                    this.updateData(lastDate, lastIndex);
                }
            }
        } catch (e) {
            console.log(e)
        }
    }

    updateData(date, index, isClicked) {
        const {fromDate, toDate, data} = this

        try {
            // 선택한 날짜로 일시 변경해줌
            let time
            // 하루치 조회인 경우 시간 형식만 보여줌
            if (fromDate === toDate) {
                time = util.timestampToHourMin(+date, 'HH:mm') // HH:mm 형식으로 변환
            } else {
                // 날짜 멀티선택한 경우 날짜로 구분지어 보여줌
                time = util.timestampToDate(+date)
            }
            $("[data-bitype='date']").text(time)

            // 선택한 시간대의 동접자 수로 변경해줌
            const ccuData = data['chartData']

            // 클릭한 시간의 CCU 데이터 가져오기
            let selectedCcuValue = 0

            if (Array.isArray(ccuData)) {
                // 배열 형식인 경우: [202510010000, 0] 형태
                if (index >= 0 && index < ccuData.length) {
                    selectedCcuValue = ccuData[index][1] || 0
                }
            }

            // data-bitype='all' 요소에 클릭한 시간의 총 CCU 데이터 설정
            $("[data-bitype='all']").text(util.comma(selectedCcuValue))

            // CCU 타입 요소도 같이 업데이트 (기존 로직 유지)
            // $("[data-bitype='CCU']").text(util.comma(selectedCcuValue))

            // 차트를 클릭했을 경우엔 PCU 데이터 변경 필요 없음
            if (isClicked) {
                return
            }

            // PCU 데이터 처리 (기존 로직 주석 처리되어 있음)
            // const pcuData = this.data['peak']
            // if (Object.keys(pcuData).length > 0) {
            //     const iosPcuData = isNaN(pcuData['iOS']) ? 0 : pcuData['iOS']
            //     const androidPcuData = isNaN(pcuData['Android']) ? 0 : pcuData['Android']
            //
            //     $("[data-bitype='iosPcu']").text(util.comma(iosPcuData))
            //     $("[data-bitype='androidPcu']").text(util.comma(androidPcuData))
            // }
        } catch (e) {
            console.log(e)
        }
    }

    setHandlebarsHelper() {
        Handlebars.registerHelper('getTitle', (title) => {
            const tnsNm = i18next.tns(title)

            if (tnsNm) {
                return tnsNm
            } else {
                return title
            }
        })
    }

    // 팝업 열기 함수
    async openPopup() {
        const {id} = this
        $('.dimmed').show()

        const $target = $('#' + id + '__popUp')
        $target.addClass('show')

        await util.sleep(200)
    }

    // 팝업 닫기 함수
    closePopup(v) {
        const popup = '#' + v.id + '__popUp'
        const span = popup + ' span'
        const div = popup + ' div'
        const $dimmed = $('.dimmed')
        const $popup = $(popup)

        v.chart.destroy({keepContainer: true})
        $(span).text('')
        $(div).text('')

        $dimmed.off('click')
        $dimmed.hide()
        $popup.removeClass('show').addClass('hidden');

        // 팝업 닫을 때 커서가 보이면 없애주도록
        const $cursor = $('.maxy_cursor_dots')
        if ($cursor.css('display') === 'block') {
            cursor.hide()
        }
    }
}