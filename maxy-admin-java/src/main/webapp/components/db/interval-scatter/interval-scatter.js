class MaxyIntervalScatter {
    constructor(options) {
        this.id = options.id
        this.title = options.title
        this.comment = options.comment ? options.comment : ''
        this.func = options.func
        this.type = options.type
        this.limit = options.limit
        this.interval = {}
        this.darkModeYn = sessionStorage.getItem('maxyDarkYn')
        this.data = []
    }

    async init() {
        const v = this
        const {id, title, comment, type} = this
        Handlebars.registerHelper('intervalScatterType', function (type) {
            return type
        })
        const source = await fetch(
            '/components/db/interval-scatter/interval-scatter.html'
        ).then(response => response.text())
        const template = Handlebars.compile(source)
        const $target = $('#' + id)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + id
        }

        let fmtTitle
        if (title.includes('Response')) {
            fmtTitle = i18next.tns('dashboard.component.title.responsetimescatter')
        } else {
            fmtTitle = i18next.tns('dashboard.component.title.loadingtimescatter')
        }
        $target.empty()
        $target.append(template({id, fmtTitle, type}))
        tippy('#' + id + ' .ic_question', {
            content: comment,
            placement: 'bottom',
            allowHTML: true,
            arrow: false,
            theme: 'maxy-tooltip'
        })

        const popupBtnId = '#btnWarnPopup__' + type
        const $popupBtn = $(popupBtnId)
        $popupBtn.off('click')
        $popupBtn.on('click', () => {
            const param = {
                packageNm: $('#packageNm').val(),
                serverType: $('#packageNm option:checked').data('server-type'),
                osType: $('#osType').val(),
                requestType: type.toUpperCase() + '_TIME_SCATTER'
            }
            ajaxCall('/db/0100/getWarningIntervaltimeData.maxy', param).then((response) => {
                if (response.length > 0) {
                    const options = {
                        appendId: 'maxyPopupWrap',
                        id: this.type,
                        data: {
                            packageNm: $('#packageNm').val(),
                            serverType: $('#packageNm option:checked').data('server-type'),
                            osType: $('#osType').val(),
                            requestType: this.type,
                            from: util.today(true),
                            to: util.today(),
                            paramList: response
                        },
                        popupType: this.type === 'loading' ? 'Loading Time' : 'Response Time',
                        popupTitle: 'Warning List',
                        intervalSort: true,
                        limit: this.limit
                    }
                    if (this.type === 'loading') {
                        new AnalysisLoadingWithMultipleUrlPopup(options)
                    } else if (this.type === 'response') {
                        new AnalysisResponseWithMultipleUrlV2Popup(options)
                    }
                } else {
                    toast(trl('dashboard.msg.warnPopup'))
                }
            }).catch((e) => {
                console.log(e)
            })
        })

        tippy(popupBtnId, {
            content: i18next.tns('dashboard.component.desc.warning'),
            placement: 'bottom',
            allowHTML: true,
            arrow: false,
            theme: 'maxy-tooltip'
        })

        const chartOptions = {
            chart: {
                type: 'scatter',
                marginBottom: 73,
                zoomType: 'xy',
                events: {
                    load: function () { // 드래그시 영역 안 scatter 수량 표기하는거
                        let chart = this;
                        let isDragging = false; // 드래그 표기중인지 flag
                        let startX, startY, endX, endY // 마우스 좌표값, count칸 ui
                        let countBox = null

                        // 드래그 시작
                        Highcharts.addEvent(chart.container, 'mousedown', function (e) {
                            isDragging = true;
                            startX = e.chartX;
                            startY = e.chartY;

                            // 커서를 십자가 모양으로 변경
                            chart.container.style.cursor = 'crosshair';

                            // 선택된 요소 개수를 마우스 옆에 표시
                            countBox = chart.renderer.label(0, startX, startY)
                                .css({
                                    color: 'white',
                                    fontSize: '0.8em'
                                })
                                .attr({
                                    padding: 6,
                                    fill: 'rgba(0, 0, 0, 0.7)', // 배경색 검은색, 불투명도 50%
                                    zIndex: 10
                                })
                                .add();
                        });

                        // 드래그 중
                        Highcharts.addEvent(chart.container, 'mousemove', function (e) {
                            if (isDragging) {
                                endX = e.chartX;
                                endY = e.chartY;

                                // 선택 영역 내의 scatter 요소 개수 계산
                                let points = [];
                                for (let i = 0; i < (chart.series || []).length; i++) {
                                    points = points.concat(chart.series[i].data)
                                }
                                let count = 0;

                                points.forEach(point => {
                                    const x = point.plotX + chart.plotLeft;
                                    const y = point.plotY + chart.plotTop;

                                    // 드래그 영역 내에 있는지 확인
                                    if (x >= Math.min(startX, endX) && x <= Math.max(startX, endX) &&
                                        y >= Math.min(startY, endY) && y <= Math.max(startY, endY)) {
                                        count++;
                                    }
                                });

                                // count칸을 차트내부에 표시해주기 위해 위치 수정이 필요하다면..
                                let countBoxX = endX
                                let countBoxY = endY
                                if (countBoxX + countBox.width > chart.chartWidth) {
                                    countBoxX -= countBox.width
                                }

                                if (countBoxY + countBox.height > chart.chartHeight) {
                                    countBoxY -= countBox.height
                                }

                                // count칸 text, 위치조정
                                countBox.attr({
                                    text: count,
                                    x: countBoxX,
                                    y: countBoxY
                                });
                            }
                        });

                        // 드래그 종료
                        Highcharts.addEvent(chart.container, 'mouseup', function (e) {
                            if (isDragging) {
                                isDragging = false;
                                countBox.destroy()
                                countBox = null

                                // 커서를 기본 모양으로 변경
                                chart.container.style.cursor = '';
                            }
                        });

                        // 차트 밖으로 이동
                        Highcharts.addEvent(chart.container, 'mouseleave', function (e) {
                            // 드래그 중일때
                            if (isDragging) {
                                // isDragging을 false로 바꾸지 않는 이유는
                                // 드래깅 상태 유지한채로 다시 차트내부로 들어올 수 있어서
                                countBox.destroy()
                                countBox = null

                                // 커서를 기본 모양으로 변경
                                chart.container.style.cursor = '';
                            }
                        });

                        // 차트 안으로 이동
                        Highcharts.addEvent(chart.container, 'mouseenter', function (e) {
                            if (isDragging && e.buttons === 1) {
                                // 드래그 중이고 왼쪽마우스를 누르고 있을 때
                                // 드래그하면서 차트 밖으로 마우스가 나갔다가 다시 들어옴

                                // 커서를 십자가 모양으로 변경
                                chart.container.style.cursor = 'crosshair';

                                // count칸 다시 만들어주기
                                countBox = chart.renderer.label(0, e.chartX, e.chartY)
                                    .css({
                                        color: 'white',
                                        fontSize: '0.8em'
                                    })
                                    .attr({
                                        padding: 6,
                                        fill: 'rgba(0, 0, 0, 0.7)', // 배경색 검은색, 불투명도 50%
                                        zIndex: 10
                                    })
                                    .add();
                            } else {
                                // 커서가 다시 들어왔던가, 드래그 중 밖에서 마우스를 떼고 다시 들어온 경우
                                isDragging = false;

                                // countBox가 정의되어 있는 경우에만 destroy() 호출
                                if (countBox) {
                                    countBox.destroy();
                                    countBox = null;
                                }

                                // 커서를 기본 모양으로 변경
                                chart.container.style.cursor = '';
                            }
                        });
                    },
                    selection: function (e) {
                        // 기본 줌인 동작을 방지합니다.
                        e.preventDefault();

                        return v.selectPointsByDrag(e, this)
                    }
                }
            },
            legend: {
                layout: 'horizontal',
                align: 'center',
                verticalAlign: 'bottom',
                floating: false,
                itemMarginBottom: -10
            },
            boost: {
                useGPUTranslations: true,
                usePreAllocated: true
            },
            xAxis: {
                type: 'datetime',
                dateTimeLabelFormats: {
                    millisecond: '%H:%M:%S',
                    second: '%H:%M:%S',
                    minute: '%H:%M:%S',
                    hour: '%H:%M:%S',
                    day: '%H:%M:%S',
                    week: '%H:%M:%S',
                    month: '%H:%M:%S',
                    year: '%H:%M:%S'
                },
                crosshair: true
            },
            yAxis: [{
                type: 'logarithmic',
                custom: {
                    allowNegativeLog: true // 0이 들어왔을때를 위한 custom
                },
                min: 0,
                labels: {
                    formatter: function () {
                        return util.convertTime(this.value)
                    },
                    style: {
                        color: 'black'
                    }
                },
                title: false
            }],
            title: {
                text: ''
            },
            tooltip: {
                enabled: false
            },
            plotOptions: {
                series: {
                    animation: false
                },
                scatter: {
                    marker: {
                        radius: 2.5,
                        states: {
                            hover: {
                                enabled: true,
                                lineColor: 'rgb(100,100,100, 0.5)'
                            }
                        }
                    },
                    states: {
                        hover: {
                            marker: {
                                enabled: false
                            }
                        }
                    },
                    jitter: {
                        x: 0.005
                    },
                }
            },
            series: []
        }
        // Loading time 일 경우 native page end 를 추가하기 때문에 series 옵션 추가

        this.chart = Highcharts.chart(id + '__chart', chartOptions)
    }

    applyAnimation(point, chart)  {
        if (point.isAnimating) return

        const x = point.plotX + chart.plotLeft
        const y = point.plotY + chart.plotTop

        // 포인트 크기
        const radius = point.options.marker && point.options.marker.radius ? point.options.marker.radius : 6
        const pointWidth = radius * 2
        const pointHeight = radius * 2

        // 초기 사각형 테두리 그리기
        const borderGraphic = chart.renderer.rect(x - radius, y - radius, pointWidth, pointHeight)
            .attr({
                stroke: point.graphic.fillColor,
                'stroke-width': 1,
                fill: 'none',
                opacity: 0.8
            })
            .add()

        // 포인트에 애니메이션 진행 중 상태 저장
        point.isAnimating = true

        // 확장 및 번쩍임 애니메이션
        borderGraphic.animate({
            width: pointWidth + 3,
            height: pointHeight + 3,
            x: x - radius - 5,
            y: y - radius - 5,
            'stroke-width': 6,
            opacity: 0
        }, {
            duration: 500,
            easing: 'easeOutCirc',
            complete: function () {
                borderGraphic.destroy()
                // 애니메이션이 끝난 상태로 플래그 리셋
                point.isAnimating = false
            }
        })
    }

    async setData(data) {
        let {chart, darkModeYn, type, limit} = this

        if (!chart || !chart.series || !data || data.length === 0) {
            return
        }

        const previousData = this.data || []
        this.data = data

        const newData = data.map(d => {
            const {
                logType,
                logTm,
                intervaltime,
                loadingTime,
                deviceModel,
                deviceId,
                reqUrl,
                comType,
                comSensitivity,
                cpuUsage,
                avgCpuUsage,
                avgComSensitivity,
                simOperatorNm,
                appVer,
                userId,
                userNm,
                birthDay,
                clientNm,
                pageEndTm,
                pageStartTm,
                wtfFlag,
                osType,
                mxPageId,
                _id
            } = d

            return {
                x: d.logTm ? logTm : pageEndTm,
                y: this.type === "response" ? intervaltime : loadingTime,
                interval: util.convertTime(intervaltime),
                logType,
                deviceModel,
                reqUrl,
                appVer,
                comType,
                comSensitivity,
                cpuUsage,
                avgCpuUsage,
                avgComSensitivity,
                simOperatorNm,
                deviceId,
                userId,
                userNm,
                birthDay,
                clientNm,
                pageEndTm,
                pageStartTm,
                wtfFlag,
                osType,
                mxPageId,
                _id
            }
        })

        newData.sort((a, b) => b.y - a.y)

        // 1: bot, 2: middle, 3: top, 4: native
        const q1 = [], q2 = [], q3 = [], q4 = []

        const length = newData.length
        const topN = length * 0.3
        const minN = topN + length * 0.4
        let cursor = 0

        for (let el of newData) {
            if (el.y >= limit) {
                q4.push(el)
            } else {
                if (cursor < topN) {
                    q3.push(el)
                } else if (cursor < minN) {
                    q2.push(el)
                } else {
                    q1.push(el)
                }
                cursor++
            }
        }

        const lowData = {
            name: 'Low',
            id: 'vg' + this.id,
            data: q1,
            marker: {
                symbol: 'square',
                fillColor: darkModeYn !== 'Y' ? hcColors.scatter.light.low : hcColors.scatter.dark.low
            },
            tooltip: {
                headerFormat: '',
                followPointer: false,
            }
        }

        const normalData = {
            name: 'Normal',
            id: 'g' + this.id,
            data: q2,
            marker: {
                symbol: 'square',
                fillColor: darkModeYn !== 'Y' ? hcColors.scatter.light.normal : hcColors.scatter.dark.normal,
                tooltip: {
                    headerFormat: '',
                    followPointer: false
                }
            }
        }

        const highData = {
            name: 'High',
            id: 'n' + this.id,
            data: q3,
            marker: {
                symbol: 'square',
                fillColor: darkModeYn !== 'Y' ? hcColors.scatter.light.high : hcColors.scatter.dark.high
            },
            tooltip: {
                headerFormat: '',
                followPointer: false
            }
        }

        const slowData = {
            name: 'Warning',
            id: 'ic' + this.id,
            data: q4,
            marker: {
                symbol: 'cross',
                lineColor: 'rgb(255,81,81)',
                lineWidth: 1.5
            },
            tooltip: {
                headerFormat: '',
                followPointer: false
            }
        }
        let isFirst
        // series가 없을때만 addSeries , 있을땐 setData
        if (chart.series.length === 0) {
            isFirst = true
            chart.addSeries(lowData)
            chart.addSeries(normalData)
            chart.addSeries(highData)
            chart.addSeries(slowData)
        } else {
            chart.series[0].setData(q1, false)
            chart.series[1].setData(q2, false)
            chart.series[2].setData(q3, false)
            chart.series[3].setData(q4, false)
        }

        const series = chart.series
        chart.redraw()

        // 기본적으로 timeType을 'logTm'으로 설정
        let timeType = 'logTm'
        if (type === 'loading') {
            timeType = 'pageEndTm' // type이 'loading'일 경우, timeType을 'pageEndTm'으로 변경
        }

        // 새로운 데이터에서 기존 데이터와 겹치지 않는 포인트를 필터링하여 newDataList에 저장
        const newDataList = newData.filter(newPoint => {
            return !previousData.some(prevPoint => prevPoint[timeType] === newPoint.x)
        })

        // 기존 데이터와 겹치지 않는 데이터 (새로 들어온 데이터)에 애니메이션 적용하는 로직
        if (!isFirst) {
            // 첫 번째 실행이 아닌 경우에만 아래 로직을 실행
            const randomSubset = newDataList
                .sort(() => Math.random() - 0.5) // 랜덤하게 섞기
                .slice(0, Math.ceil(newDataList.length / 4)); // 1/3의 데이터만 선택

            series.forEach(serie => {
                serie.data.forEach(point => {
                    // 포인트가 그래픽 객체를 가지고 있고, 랜덤으로 선택된 데이터 리스트에 해당 포인트가 포함되어 있으면
                    if (point.graphic && randomSubset.some(newPoint => newPoint.x === point.x)) {
                        // 애니메이션 로직
                        this.applyAnimation(point, serie.chart);
                    }
                });
            });
        }
    }

    selectPointsByDrag(e, t) {
        if (!e.xAxis || !e.yAxis || !t.series) {
            return
        }
        const x = e.xAxis[0], y = e.yAxis[0]
        const {min, max} = x

        const paramList = []

        // Select points
        t.series.forEach(series => {
            if (!series.points) {
                return false
            }
            const {points} = series
            points.forEach(point => {
                if (point.x >= min && point.x <= max
                    && point.y >= y.min && point.y <= y.max) {

                    const {
                        reqUrl,
                        x,
                        y,
                        deviceId,
                        appVer,
                        logType,
                        comType,
                        comSensitivity,
                        cpuUsage,
                        avgCpuUsage,
                        avgComSensitivity,
                        simOperatorNm,
                        deviceModel,
                        userId,
                        userNm,
                        birthDay,
                        clientNm,
                        pageEndTm,
                        pageStartTm,
                        wtfFlag,
                        osType,
                        _id,
                        mxPageId,
                        clientNo
                    } = point
                    paramList.push({
                        reqUrl,
                        logTm: x,
                        intervaltime: y,
                        logType,
                        appVer,
                        deviceModel,
                        comType,
                        comSensitivity,
                        cpuUsage,
                        avgCpuUsage,
                        avgComSensitivity,
                        simOperatorNm,
                        deviceId,
                        userId,
                        userNm,
                        birthDay,
                        clientNm,
                        pageEndTm,
                        pageStartTm,
                        wtfFlag: wtfFlag ? wtfFlag : 'Y', // wtfFlag 가 없는 경우에 대한 하위호환 처리
                        osType,
                        _id,
                        mxPageId,
                        clientNo
                    })
                }
            });
        });

        const param = {
            packageNm: $('#packageNm').val(),
            serverType: $('#packageNm option:checked').data('server-type'),
            osType: $('#osType').val(),
            requestType: this.type,
            from: Math.round(min),
            to: Math.round(max),
            paramList
        }

        if (paramList.length > 0) {
            const options = {
                appendId: 'maxyPopupWrap',
                id: this.type + 'TimePopup',
                data: param,
                popupType: this.type === 'loading' ? 'Loading Time' : 'Response Time',
                popupTitle: 'Profiling',
                limit: this.limit
            }
            if (this.type === 'loading') {
                new AnalysisLoadingWithMultipleUrlPopup(options)
            } else if (this.type === 'response') {
                new AnalysisResponseWithMultipleUrlV2Popup(options)
            }
        }

        // don't zoom
        // return false
    }

    // darkmode - lightmode 전환 시에만 동작하도록 !!
    draw(param) {
        if (param) {
            this.darkModeYn = param
        }

        const {darkModeYn, chart} = this

        if (!chart || !chart.series) {
            return
        }

        try {
            if (darkModeYn === 'Y') {
                chart.series[0].update({
                    marker: {
                        fillColor: hcColors.scatter.dark.low
                    }
                })
                chart.series[1].update({
                    marker: {
                        fillColor: hcColors.scatter.dark.normal
                    }
                })
                chart.series[2].update({
                    marker: {
                        fillColor: hcColors.scatter.dark.high
                    }
                })
            } else {
                chart.series[0].update({
                    marker: {
                        fillColor: hcColors.scatter.light.low
                    }
                })
                chart.series[1].update({
                    marker: {
                        fillColor: hcColors.scatter.light.normal
                    }
                })
                chart.series[2].update({
                    marker: {
                        fillColor: hcColors.scatter.light.high
                    }
                })
            }
        } catch (e) {
            console.log(e)
        }
    }

    reset() {
        const {chart} = this
        while (chart.series.length) {
            chart.series[0].remove()
        }
    }

    destroyChart() {
        const {chart} = this
        chart.destroy({keepContainer: true})
        $('#' + this.id).empty()
    }
}