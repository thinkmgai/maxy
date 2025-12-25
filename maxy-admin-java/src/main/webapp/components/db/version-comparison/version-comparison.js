class MaxyVersionComparison {
    constructor(options) {
        this.id = options.id
        this.title = options.title
        this.comment = options.comment
    }

    addEventListener() {
        $('#showAllVersion').on('click', function() {
            const param = {
                id: 'allVersion',
                appendId: 'maxyPopupWrap'
            }
            new MaxyPopUpAllVersionComparison(param)
        })
    }

    async init() {
        const {id, comment} = this

        const source = await fetch(
            '/components/db/version-comparison//version-comparison.html'
        ).then(response => response.text())
        const template = Handlebars.compile(source)
        const $target = $('#' + id)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + id
        }

        const fmtTitle = i18next.tns('dashboard.component.title.versioncomparison')
        $target.empty()
        $target.append(template({id, fmtTitle}))
        updateContent()

        tippy('#' + id + ' .ic_question', {
            content: comment,
            placement: 'bottom',
            allowHTML: true,
            arrow: false,
            theme: 'maxy-tooltip'
        })

        this.chart = Highcharts.chart(id + '__chart', {
            chart: {
                polar: true,
                type: 'line'
            },

            title: {
                text: '',
                x: -80
            },

            pane: {
                size: '100%'
            },

            xAxis: {
                categories: [],
                tickmarkPlacement: 'on',
                lineWidth: 0
            },

            yAxis: {
                gridLineInterpolation: 'polygon',
                lineWidth: 0,
                min: 0,
                max: 100
            },

            legend: {
                layout: 'horizontal',
                align: 'center',
                verticalAlign: 'bottom',
                y: 10
            },
            series: [],
            tooltip: {
                pointFormatter: function () {
                    // point.value를 정수로 변환
                    let value = isNaN(this.value) ? 0 : util.comma(Math.round(this.value))

                    // this.series.name에 'Time' 포함 여부 체크
                    const unit = this.category.includes('Time') ? 'ms' : ''

                    // 툴팁 내용 반환
                    return `<span style="color:${this.color}">\u25CF</span> ${this.series.name}: <b>${value}${unit} (${this.y}%)</b><br/>`
                }
            },
            responsive: {
                rules: [{
                    condition: {
                        maxWidth: 750
                    },
                    chartOptions: {
                        legend: {
                            align: 'center',
                            verticalAlign: 'bottom',
                            layout: 'horizontal'
                        },
                        pane: {
                            size: '70%'
                        }
                    }
                }]
            }
        })
    }

    getVersionComparisonData() {
        // 현재 날짜 (yyyymmdd)
        const yesterday = util.getDate(-1)
        const from = util.dateToTimestamp(util.getDate(-1), true)
        const to = util.dateToTimestamp(util.getDate(-1), false)

        let month = yesterday.getMonth() + 1
        if (month < 10) {
            month = util.padding(month)
        }

        let yesterdayDate = yesterday.getDate()
        if (yesterdayDate < 10) {
            yesterdayDate = util.padding(yesterdayDate)
        }

        const accessDate = '' + yesterday.getFullYear() + month + yesterdayDate
        const packageNm = $('#packageNm').val()
        const serverType = $('#packageNm option:checked').data('server-type')

        const param = {
            accessDate,
            from,
            to,
            packageNm,
            serverType
        }

        ajaxCall('/db/0100/getVersionComparisonData.maxy', param,
            {disableCursor: true}).then(data => {
            this.setVersionComparisonData(data)
        }).catch(error => {
            toast(i18next.tns(error.msg))
        })
    }

    setVersionComparisonData(data) {
        const {v} = DB0100

        try {
            if (!data.totalVersionData) {
                return
            }
            // version comparison 컴포넌트 객체 , data가 모두 존재하는 경우에만 setData 한다.
            if (v.versioncomparison && data && Object.keys(data).length > 0) {
                const {versionData} = data
                const optVersionComparison = {
                    packageNm: versionData[0].packageNm,
                    serverType: versionData[0].serverType,
                    osTypeA: versionData[0].osType,
                    appVerA: versionData[0].appVer,
                    osTypeB: versionData[1].osType,
                    appVerB: versionData[1].appVer
                }

                // JSON 문자열로 변환하여 저장
                sessionStorage.setItem('optVersionComparison', JSON.stringify(optVersionComparison))
                v.versioncomparison.setData(data)
                $('#showAllVersion').show()
            } else {
                $('#showAllVersion').hide()
            }
        } catch (e) {

        }
    }

    setData(data) {
        const v = this
        const {chart} = v

        try {
            /*
            1. 전체 데이터 구하기 ( totalVersionData 안에 있음)
            2. 전체 데이터 대비 버전 별 데이터가 몇 % 차지하는지 비율 구하기
            3. series에 setData 할땐 구한 비율 값을 넣어주기
           */
            const {totalVersionData, versionData} = data

            const dataKeys = []
            const allDataKeys = Object.keys(totalVersionData)
            for (let i = 0; i < allDataKeys.length; i++) {
                const key = allDataKeys[i]
                dataKeys.push(v.formatStr(key))
            }

            const aData = versionData[0]
            const bData = versionData[1]

            const aDataValues = [];
            const bDataValues = [];

            for (let i = 0; i < allDataKeys.length; i++) {
                const key = allDataKeys[i];
                const aValue = isNaN(aData[key]) ? 0 : aData[key];
                const aPct = util.percent(aValue, totalVersionData[key]);
                const bValue = isNaN(bData[key]) ? 0 : bData[key];
                const bPct = util.percent(bValue, totalVersionData[key]);

                // 객체로 구성된 포인트 데이터 생성
                aDataValues.push({ y: aPct, value: aValue });
                bDataValues.push({ y: bPct, value: bValue });
            }

            const aSeries = {
                name: aData['osType'] + ' ' + aData['appVer'],
                data: aDataValues,
                pointPlacement: 'on'
            };

            const bSeries = {
                name: bData['osType'] + ' ' + bData['appVer'],
                data: bDataValues,
                pointPlacement: 'on'
            };

            // series가 없을 때만 addSeries, 있을 때는 setData
            if (chart.series.length === 0) {
                chart.addSeries(aSeries);
                chart.addSeries(bSeries);
            } else {
                chart.series[0].setData(aDataValues, false);
                chart.series[1].setData(bDataValues, false);
            }

            chart.update({
                xAxis: {
                    categories: dataKeys
                }
            })

        } catch(e) {
            console.log(e)
        }
    }

    formatStr(str) {
        if (str === 'dau') {
            return 'DAU'
        } else {
            return str
                .replace(/([A-Z])/g, ' $1') // 대문자 앞에 공백 추가
                .replace(/^./, function(match) { return match.toUpperCase() }) // 첫 글자 대문자로 변환
                .trim() // 앞뒤 공백 제거
        }
    }

    reset() {
        const chart = this.chart
        while (chart.series.length) {
            chart.series[0].remove()
        }
    }
}