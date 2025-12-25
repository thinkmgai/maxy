class MaxyLogChart {
    constructor(options) {
        this.id = options.id
        this.title = options.title
        this.type = options.type
        this.size = options.size
        this.data = options.data
        this.comment = options.comment ? options.comment : ''

        if (!this.id) {
            console.log('check parameter')
            return false
        }

        this.init().then(() => {
        })
    }

    async init() {
        const {id, size, data, type} = this
        const $target = $('#' + id)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + id
        }

        $target.empty()

        let color
        if (id === "pageChart") {
            color = '#7277ff'
        } else if (id === "errorChart") {
            color = '#FFC700'
        } else if (id === "crashChart") {
            color = '#FF6969'
        }

        const object = document.getElementById(id);
        let width = object.offsetWidth;
        let height = object.offsetHeight;

        const searchFromDt = new Date($('#searchFromDt').val())
        const searchToDt = new Date($('#searchToDt').val())

        const getDateDiff = (d1, d2) => {
            const date1 = new Date(d1);
            const date2 = new Date(d2);

            const diffDate = date1.getTime() - date2.getTime();

            return Math.abs(diffDate / (1000 * 60 * 60 * 24)); // 밀리세컨 * 초 * 분 * 시 = 일
        }

        const period = getDateDiff(searchFromDt, searchToDt)
        let rangeCnt = 30
        let rangeText = '30m'

        if (period >= 15 && period <= 90) {
            rangeCnt = 40
            rangeText = '40m'
        } else if (period >= 90 && period <= 150) {
            rangeCnt = 100
            rangeText = '100m'
        } else if (period > 150) {
            rangeCnt = 280
            rangeText = '280m'
        }

        Highcharts.stockChart(id, {
            credits: {
                enabled: false
            },
            chart: {
                events: {
                    load: function () {
                        const {v, func} = TA0000

                        /**
                         * 차트를 유지하면 tab을 누르거나 검색 팝업으로 검색을 할 때 마다 series가 좌우로 늘어나는
                         * 현상이 있음.
                         * range를 왼쪽 끝에 갖다놓으면 오른쪽 series만 추가되고 오른쪽 끝에 갖다 놓으면 왼쪽 series만
                         * 추가되는 현상.
                         *
                         * v.fromDelete 가 true면 series의 왼쪽을 지우고, v.toDelete 가 true면 series의 오른쪽을 지운다.
                         * 차트를 많이 줄여서 series의 갯수가 극한으로 줄어든 상태라면 해당 경우에 맞게 flag(v,short)를 준다.
                         */

                        if (v.pageFlowSearchFromTime <= v.stayChartFromTime && v.pageFlowSearchToTime >= v.stayChartToTime) {
                            if (v.stay === true) {// 차트 유지 날짜가 조회 날짜 범위에 포함되는 경우
                                func.parseDate()
                                if (v.pageFlowSearchFromTime === v.stayChartFromTime && v.pageFlowSearchToTime === v.stayChartToTime) { // 차트의 range가 꽉 찬 경우
                                    v.stay = false;
                                } else if (v.pageFlowSearchFromTime === v.stayChartFromTime) { // 차트의 왼쪽 range가 찬 경우
                                    if (v.short === true) { // 차트의 범위를 극한으로 줄인 경우엔 series를 지우지 않는다.
                                        v.fromDelete = false
                                        v.toDelete = false
                                    } else {
                                        v.toDelete = true
                                    }
                                } else if (v.pageFlowSearchToTime === v.stayChartToTime) { // 차트의 오른쪽 range가 찬 경우
                                    v.fromDelete = true;
                                }
                                this.xAxis[0].setExtremes(v.stayChartFromTime, v.stayChartToTime, false)
                            }
                        } else {
                            // 차트 유지 날짜가 조회 날짜 범위에 없는 경우
                            if (v.stayChartFromTime !== "" && v.stayChartToTime !== "") {
                                v.stayChartFromTime = v.pageFlowSearchFromTime
                                v.stayChartToTime = v.pageFlowSearchToTime
                            }
                            v.stay = false;
                        }
                        // 차트가 처음 로딩되었을때
                        v.chartLoad = true;
                        const from = new Date(this.series[0].processedXData[0])
                        const to = new Date(this.series[0].processedXData[this.series[0].processedXData.length - 1])

                        let fromSeconds = from.getSeconds();
                        let fromMilliseconds = from.getMilliseconds();
                        let toSeconds = to.getSeconds();
                        let toMilliseconds = to.getMilliseconds();

                        // 총 초로 변환
                        let fromTotalSeconds = fromSeconds + fromMilliseconds / 1000;
                        let toTotalSeconds = toSeconds + toMilliseconds / 1000;

                        // 30초 단위로 반내림
                        let flooredSeconds = Math.floor(fromTotalSeconds / 30) * 30;
                        let roundedSeconds = Math.round(toTotalSeconds / 30) * 30;


                        from.setSeconds(Math.floor(flooredSeconds));
                        to.setSeconds(Math.floor(roundedSeconds));
                        from.setMilliseconds(0);
                        to.setMilliseconds(0);

                        if (roundedSeconds === 0 || roundedSeconds === 30) {
                            to.setSeconds(roundedSeconds + 29);
                            to.setMilliseconds(999)
                        }

                        if (v.stay !== true) {
                            this.setTitle(null, {text: util.timestampToDateTime(from.getTime()) + ' ~ ' + util.timestampToDateTime(v.pageFlowSearchToTime)});
                        } else {
                            this.setTitle(null, {text: util.timestampToDateTime(v.stayChartFromTime) + ' ~ ' + util.timestampToDateTime(v.searchToPaddedDt)});
                        }

                        v.searchFromPaddedDt = from.getTime()
                        v.searchToPaddedDt = to.getTime()
                    }
                },
                zoomType: 'x',
                height: size.height,
                type: 'column'
            },
            subtitle: {
                align: 'right'
            },
            rangeSelector: {
                x: width - 160,
                y: height - 10,
                buttons: [
                    {
                        type: 'minute',
                        count: 4.9,
                        text: '5m',
                    },
                    {
                        type: 'minute',
                        count: rangeCnt,
                        text: rangeText,
                    }, {
                        type: 'hour',
                        count: 1,
                        text: '1h',
                    }, {
                        type: 'day',
                        count: 1,
                        text: '1d',
                    },
                ],
                inputEnabled: true,
                selected: 0,
            },
            time: {
                useUTC: false
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
            plotOptions: {
                column: {
                    color: color
                }
            },
            tooltip: {
                shared: true
            },
            xAxis: [{
                events: {
                    setExtremes: this.debounce(function (e) {
                        const {v, func} = TA0000

                        if (v.tab === true && v.stay === true) { // 차트 범위가 유지되는 조건일 때
                            // 차트가 계속 from to가 늘어나는 현상으로 인해 늘어나는 데이터는 삭제
                            if (v.fromDelete === true) {
                                this.series[0].processedXData.shift()
                            } else if (v.toDelete === true) {
                                this.series[0].processedXData.pop()
                            } else {
                                if (v.short !== true) { // 차트 범위가 극한적으로 줄인 경우가 아닐 경우에만 series 삭제
                                    this.series[0].processedXData.shift()
                                    this.series[0].processedXData.pop()
                                }

                            }
                        }
                        const from = new Date(this.series[0].processedXData[0])
                        const to = new Date(this.series[0].processedXData[this.series[0].processedXData.length - 1])

                        let fromSeconds = from.getSeconds();
                        let fromMilliseconds = from.getMilliseconds();
                        let toSeconds = to.getSeconds();
                        let toMilliseconds = to.getMilliseconds();

                        // 총 초로 변환
                        let fromTotalSeconds = fromSeconds + fromMilliseconds / 1000;
                        let toTotalSeconds = toSeconds + toMilliseconds / 1000;

                        // 30초 단위로 반내림
                        let flooredSeconds = Math.floor(fromTotalSeconds / 30) * 30;
                        let roundedSeconds = Math.round(toTotalSeconds / 30) * 30;

                        from.setSeconds(Math.floor(flooredSeconds));
                        to.setSeconds(Math.floor(roundedSeconds));
                        from.setMilliseconds(0);
                        to.setMilliseconds(0);


                        if (roundedSeconds === 0 || roundedSeconds === 30) {
                            to.setSeconds(roundedSeconds + 29);
                            to.setMilliseconds(999)
                        }

                        v.searchFromPaddedDt = from.getTime()
                        v.searchToPaddedDt = to.getTime()

                        if (v.searchToPaddedDt >= v.pageFlowSearchToTime) {
                            v.searchToPaddedDt = v.pageFlowSearchToTime
                        }

                        this.chart.setTitle(null, {text: util.timestampToDateTime(Math.floor(v.searchFromPaddedDt)) + ' ~ ' + util.timestampToDateTime(Math.floor(v.searchToPaddedDt))});

                        v.stayChartFromTime = v.searchFromPaddedDt
                        v.stayChartToTime = v.searchToPaddedDt

                        v.offsetIndex = 0;
                        v.btnType = 'next'
                        v.chart = true;
                        v.chartLoad = false;
                        v.stay = true; // tab 이동시에는 차트 범위 유지를 위함.
                        v.tab = false;
                        v.fromDelete = false;
                        v.toDelete = false;

                        if (this.series[0].processedXData.length <= 8) { // 차트를 극한으로 줄였을 경우
                            v.short = true
                            v.fromDelete = true
                        }

                        func.getLogList(false, false, true)
                        func.getLogCount(true)
                    }, 500) // 0.3초 딜레이
                }
            }],
            legend: {
                layout: 'horizontal',
                align: 'center',
                verticalAlign: 'bottom'
            },
            series: [{
                events: {
                    click: function (e) {
                        const {v, func} = TA0000
                        const fromDt = e.point.category
                        v.offsetIndex = 0
                        v.chart = true;
                        v.chartLoad = false;
                        v.btnType = 'next'
                        v.searchFromPaddedDt = new Date(fromDt).setMilliseconds("000");
                        let timeArr = [];

                        if ($(this)[0].groupedData === null) {
                            for (const item of $(this)[0].xData) {
                                timeArr.push(item)
                            }
                        } else {
                            for (const item of $(this)[0].groupedData) {
                                timeArr.push(item.category)
                            }
                        }

                        const index = timeArr.indexOf(e.point.category)

                        if (index === timeArr.length - 1) {
                            let time1 = timeArr[index]
                            let time2 = timeArr[index - 1]
                            let diff = time1 - time2

                            v.searchToPaddedDt = time1 + diff
                        } else {
                            v.searchToPaddedDt = timeArr[index + 1]
                        }

                        v.searchToPaddedDt = v.searchToPaddedDt - 1

                        if (v.searchToPaddedDt >= v.pageFlowSearchToTime) {
                            v.searchToPaddedDt = v.pageFlowSearchToTime
                        }

                        if (id === 'pageChart') {
                            v.type = "page"
                        } else if (id === 'errorChart') {
                            v.type = "error"
                        } else if (id === 'crashChart') {
                            v.type = "crash"
                        }
                        $('.gray_bg_wrap').hide()
                        func.getLogList(v.searchFromPaddedDt, v.searchToPaddedDt)
                    }
                },
                data: data,
                name: type,
                dataGrouping: {
                    units: [[
                        'second', // unit name
                        [30] // allowed multiples
                    ], [
                        'hour',
                        [1, 2, 3]
                    ]]
                }
            }],
            // export 관련
            exporting: {
                enabled: false
            },
        })
    }

    draw(data) {

    }

    debounce(func, delay) {
        let timer;
        return function () {
            const context = this;
            const args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function () {
                func.apply(context, args)
            }, delay);
        }
    }
}