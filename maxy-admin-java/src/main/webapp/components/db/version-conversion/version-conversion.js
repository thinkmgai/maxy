'use strict'

class MaxyVersionConversion {
    constructor(options) {
        this.id = options.id
        this.size = options.size
        this.title = options.title
        this.comment = options.comment
        this.chartTypes = ['Android', 'iOS'] // osType 유형

        this.func = options.func
        if (!this.id) {
            console.log('please check parameter')
            return false
        }
    }

    async init() {
        const {id, data, comment, chartTypes} = this
        const source = await fetch('/components/db/version-conversion/version-conversion.html')
            .then(response => response.text())
        const template = Handlebars.compile(source)
        const $target = $('#' + id)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + id
        }

        const fmtTitle = i18next.tns('dashboard.component.title.versionconversion')
        $target.empty()
        $target.append(template({id, data, fmtTitle}))

        tippy('#' + id + ' .ic_question', {
            content: comment, placement: 'bottom', allowHTML: true, arrow: false, theme: 'maxy-tooltip'
        })

        this.$target = $target

        const osType = sessionStorage.getItem('osType')
        // osType이 안드로이드와 ios만 있을거라고 믿음..
        // 선택한 osType에 따라 그래프와 토글 show/hide, 토글 on class 주기
        if (osType !== 'A') {
            // 차트를 그려줄 osType 유형
            this.chartTypes = [osType]

            // 토글버튼
            const $btn_tab = $('#' + id + ' .btn_tab')
            const $btn_tab_type = $('#' + id + ' [data-tab="versionConversion' + osType + '"]')

            // 토글버튼 show/hide & 토글버튼 on class 추가
            $btn_tab.removeClass('on')
            $btn_tab.hide()
            $btn_tab_type.show()
            $btn_tab_type.addClass('on')

            // 차트 보여주는 영역 show/hide
            $('#' + id + ' .maxy_component_item_wrap').addClass('hidden')
            $('#versionConversion' + osType).removeClass('hidden')
        }

        // 차트만들기
        chartTypes.forEach(type => {
            this[type + '__chart'] = Highcharts.chart('column_' + type + '__chart', {
                chart: {
                    type: 'column' //막대차트
                },
                xAxis: {
                    minPadding: 0,
                    maxPadding: 0,
                    tickInterval: 24 * 3600 * 1000, // 하루간격으로 카테고리 라벨 표시
                    type: 'datetime', // x축제목 형식
                    dateTimeLabelFormats: { // x축제목 format
                        day: '%m/%d'
                    }
                },
                yAxis: {
                    min: 0, // y축 값 최소값
                    max: 100, // y축 값 최대값
                    title: {
                        text: null
                    }
                },
                plotOptions: {
                    series: {
                        animation: false
                    },
                    column: { // 컬럼 차트 전체 옵션 지정
                        maxPointWidth: 30, // 막대의 최대 너비를 30px로 제한
                        stacking: 'percent',
                        dataLabels: {
                            enabled: true, format: '{point.y}%' // 각 막대의 시리즈 값을 표시
                        }
                    }
                },
                series: []
            })
        })
    }

    addEventListener() {
        const {id} = this
        const v = this
        const $container = $('#' + id)
        const $btnTab = $('#' + id + ' .btn_tab') // 토글버튼
        const osType = sessionStorage.getItem('osType')

        if(osType !== 'A' && osType !== 'Android' && osType !== 'iOS') {
            return
        }

        const $clickBtnTab = $('#' + id + ' .btn_tab.on') // 눌려있는 토글버튼
        v.btnType = $clickBtnTab[0].innerText

        // 토글버튼 클릭시
        $btnTab.on('click', function () {
            const tab = $(this).data('tab')
            // 누른 토글버튼은 on, 아닌건 on빼기
            $('#' + id + ' .btn_tab').addClass('on')
            $(this).siblings('#' + id + ' .btn_tab').removeClass('on')

            v.btnType = $clickBtnTab[0].innerText

            // 차트 보여주는 영역
            const $maxyComponentItemWrap = $container.find('.maxy_component_item_wrap')
            $maxyComponentItemWrap.addClass('hidden')
            $('#' + tab).removeClass('hidden')
        })

        // All 버튼 클릭시
        $('#' + id + ' .maxy_component_btn').off('click').on('click', function () {
            // All 팝업 열기
            new MaxyPopupVersionConversion({
                appendId: 'maxyPopupWrap', id: 'versionConversion'
            })
        })
    }

    async setData(data) {
        const {chartTypes} = this

        try {
            /**
             * series 생성 공통 함수
             * @param name series 명
             * @param data 차트에 표시해줄 데이터
             * @param fillColor 차트 배경 색상 (ios/android 별로 다름)
             * @param lineColor 차트 테두리 색상 (ios/android 별로 다름)
             * @return Object
             */
            const createSeries = (name, data, color) => {
                return {
                    name: name,
                    data: data,
                    color: color
                }
            }

            // 차트 series 넣어주기
            chartTypes.forEach((type) => {
                if(type !== 'Android' && type !== 'iOS') return

                const chart = this[type + '__chart']
                // 그려줄 데이터
                let draw_data = data.filter(item => item.osType === type)

                draw_data = draw_data.map((item) => ({
                    ...item, name: item.osType + " " + item.appVer
                }))

                if (chart.series.length === 0) {
                    for (let i = 0; i < draw_data.length; i++) {
                        chart.addSeries(createSeries(draw_data[i].name, draw_data[i].data, hcColors.multiColumns[i]))
                    }
                } else {
                    for (let i = 0; i < draw_data.length; i++) {
                        chart.series[i].setData(draw_data[i].data)
                    }
                }

                chart.update({
                    // 차트 툴팁 만들기
                    tooltip: {
                        shared: true, // 여러 시리즈의 값을 공유하여 표시
                        formatter: function () {
                            let tooltip = '<span class="version_conversion_tooltip_name">' + util.timestampToDate(this.point.x) + '</span><br/><br/>'
                            for (let i = 0; i < this.points.length; i++) {
                                // 시리즈 색상
                                const color = this.points[i].color
                                // 시리즈명 appVer
                                const name = this.points[i].series.name
                                // 시리즈 값
                                const countData = draw_data.filter(item => item.name === name)
                                const firstCountData = countData[0] ?? {} // 첫 번째 요소가 없을 경우 빈 객체 반환
                                const countKey = firstCountData.count?.filter(item => item[0] === this.key) ?? []
                                let count = countKey.length > 0 ? util.comma(countKey[0][1]) : 0
                                // 백분율
                                const percent = '(' + this.points[i].y + '%)'

                                tooltip += `
                                    <span style="color:${color}">\u25CF</span> 
                                    <span class="version_conversion_tooltip">${name}: ${count} ${percent}</span><br/>
                                `
                        }
                            return tooltip
                        }
                    }
                })

                chart.redraw()
            })
        } catch (e) {
            console.log(e)
        }
    }

    reset() {
        const {chartTypes} = this;

        chartTypes.forEach(type => {
            let chart = this[type + '__chart']

            while (chart && chart.series && chart.series.length > 0) {
                chart.series[0].remove()
            }
        })
    }
}