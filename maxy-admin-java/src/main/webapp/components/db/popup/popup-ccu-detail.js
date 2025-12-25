/*
   종합 분석 > Basic Information > CCU (동시 접속자수) 팝업
*/
class MaxyPopupCcuDetail {
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
            yAxis: {},
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

                        const text = i18next.tns('dashboard.bi.ccutext')
                        tooltipTime += `${text}: <b>${util.comma(all)}</b><br/>`

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

    initCalendar() {
        const {id, func} = this

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

                    func(id, dateParam)
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

            // 줌버튼이 있는 경우 차트의 줌 초기화
            const $zoomResetBtn = $('.highcharts-a11y-proxy-group-zoom > button')
            if($zoomResetBtn.length > 0){
                $zoomResetBtn.trigger('click')
            }

            chart.update({
                chart: {
                    type: fromDate !== toDate ? 'column' : 'line'
                },
                plotOptions: {
                    series: {
                        animation: true // 기본 애니메이션 활성화
                    }
                }
            });

            const {ccu} = data

            // ?.를 사용해 키가 존재하지 않을 경우도 안전하게 처리
            if (!(ccu['Android']?.length > 0 || ccu['iOS']?.length > 0)) {
                const formattedDate = toDate.replace(/-/g, '/');
                $("[data-bitype='date']").text(formattedDate)
                return;
            }

            let lastIndex
            let lastDate
            // osType 별 반복
            Object.keys(ccu).forEach((osType) => {
                const entries = ccu[osType] // os에 해당하는 데이터 배열

                if (entries.length > 0) {
                    // 범위 조회 + 마지막 조회 일자가 오늘이라면
                    if ((fromDate !== toDate)
                        && String(entries[entries.length - 1]['key']) === (util.nowDate() + '000000')) {
                        // 오늘 데이터는 무조건 없으니 삭제!
                        entries.pop()
                    }

                    // [key (시간), value (데이터)] 배열 생성
                    const d = entries.map(entry => [util.dateStringToTimestamp(entry.key), entry.value])
                    lastIndex = d.length - 1
                    lastDate = d[lastIndex][0]
                    // chartType에 맞는 시리즈 추가
                    this.chart.addSeries({
                        name: osType,
                        data: d,
                        color: osType === 'iOS' ? 'rgb(84, 79, 197)' : 'rgb(44, 175, 254)'
                    })

                    // 가장 마지막 날짜, 마지막 인덱스 전달
                    this.updateData(lastDate, lastIndex)
                }
            })
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
            // ios + android 합계 동접자 수
            const ccuData = data['ccu']

            let selectedAndroidCcu = 0
            let selectedIosCcu = 0

            // 선택한 날짜의 Android CCU 값 가져오기
            if (ccuData['Android'] && ccuData['Android'].length > 0) {
                selectedAndroidCcu = ccuData['Android'][index]['value']
            } else {
                selectedAndroidCcu = 0
            }

            // 선택한 날짜의 iOS CCU 값 가져오기
            if (ccuData['iOS'] && ccuData['iOS'].length > 0) {
                selectedIosCcu = ccuData['iOS'][index]['value']
            } else {
                selectedIosCcu = 0
            }

            const selectedAllCcu = selectedAndroidCcu + selectedIosCcu
            $("[data-bitype='CCU']").text(util.comma(selectedAllCcu))

            // ios / 전체 비율 계산
            const rateIos = util.percent(selectedIosCcu, selectedAllCcu)

            // android / 전체 비율 계산
            const rateAndroid = util.percent(selectedAndroidCcu, selectedAllCcu)
            $("[data-bitype='series0']").text(util.comma(selectedIosCcu) + ' (' + rateIos + '%' + ')')
            $("[data-bitype='series1']").text(util.comma(selectedAndroidCcu) + ' (' + rateAndroid + '%' + ')')

            // 차트를 클릭했을 경우엔 PCU 데이터 변경 필요 없음
            if (isClicked) {
                return
            }

            // PCU 데이터
            const pcuData = this.data['peak']
            if (Object.keys(pcuData).length > 0) {
                const iosPcuData = isNaN(pcuData['iOS']) ? 0 : pcuData['iOS']
                const androidPcuData = isNaN(pcuData['Android']) ? 0 : pcuData['Android']

                $("[data-bitype='iosPcu']").text(util.comma(iosPcuData))
                $("[data-bitype='androidPcu']").text(util.comma(androidPcuData))
            }
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