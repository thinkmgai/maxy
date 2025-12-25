/*
    종합 분석 > Version Conversion > All 팝업
*/
class MaxyPopupVersionConversion {
    constructor(options) {
        this.appendId = options.appendId
        this.id = options.id
        this.data = options.data
        this.selectedRow = null
        this.dateType = 'WEEK' // 오른쪽 상단 1W, 1M 토글버튼 상태값
        this.chartTypes = ['Android', 'iOS'] // osType 유형
        this.chartColors = [] // 차트 시리즈별 색상, 테이블리스트의 컬럼텍스트에 color값 주기 위함
        this.btnType = 'Android' // 차트 토글버튼 상태값
        this.tabulatorColorField = ['appVer', 'user', 'userRate'] // tabulator에서 차트 시리즈의 색상과 연동되어야할 컬럼

        // 팝업 생성 후
        this.init().then(() => {
            this.addEventListener()
            this.openPopup()
        })
    }

    async init() {
        const v = this
        const {id, appendId, chartTypes} = v
        const source = await fetch('/components/db/popup/popup-version-conversion.html')
            .then(response => response.text())

        const template = Handlebars.compile(source)

        const $target = $('#' + appendId)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + appendId
        }
        $target.empty()
        $target.append(template({id}))

        const osType = sessionStorage.getItem('osType')
        // osType이 안드로이드와 ios만 있을거라고 믿음..
        // 선택한 osType에 따라 그래프와 토글 show/hide, 토글 on class 주기
        if (osType !== 'A') {
            // 차트를 그려줄 osType 유형
            this.chartTypes = [osType]
            const popupId = id + '__popup'
            const graphWrapId = id + '_' + osType + 'GraphWrap'

            // 토글버튼
            const $type_tab = $('#' + popupId + ' .type_tab')
            const $type_tab_type = $('#' + popupId + ' [data-type="' + graphWrapId + '"]')

            // 토글버튼 show/hide & 토글버튼 on class 추가
            $type_tab.removeClass('selected')
            $type_tab.hide()
            $type_tab_type.show()
            $type_tab_type.addClass('selected')

            v.btnType = $('#' + popupId + ' .type_tab.selected')[0].innerText

            // tabulator에서 텍스트 색상 바꾸기
            $('.tabulator-cell').addClass('non_color')
            $('.tabulator-cell[data-os-type="' + v.btnType + '"]').removeClass('non_color')

            // 차트 보여주는 영역 show/hide
            $('#' + popupId + ' .graph_wrap').hide()
            $('#' + graphWrapId).show()
        }

        const tableTarget = '#' + id + '__list'

        const columnNames = {
            'osType': i18next.tns('common.tableColumn.os'),
            'appVer': i18next.tns('common.tableColumn.version'),
            'user': i18next.tns('common.tableColumn.user'),
            'userRate': i18next.tns('common.tableColumn.userRate'),
            'error': i18next.tns('common.tableColumn.error'),
            'errorRate': i18next.tns('common.tableColumn.errorRate'),
            'crash': i18next.tns('common.tableColumn.crash'),
            'crashRate': i18next.tns('common.tableColumn.crashRate'),
        }
        this.table = new Tabulator(tableTarget, {
            layout: 'fitDataFill',
            height: '35vh',
            placeholder: i18next.tns('common.msg.noData'),
            initialSort: [{
                column: "osType", dir: "asc"
            }],
            columns: [{
                title: columnNames.osType, field: "osType", width: "13%", sorter: "string"
            }, {
                title: columnNames.appVer, field: "appVer", width: "13%"
            }, {
                title: columnNames.user, field: "user", width: "13%", formatter: cell => {
                    return util.comma(cell.getValue())
                }
            }, {
                title: columnNames.userRate, field: "userRate", width: "13%", formatter: cell => {
                    return cell.getValue() + '%'
                }
            }, {
                title: columnNames.error, field: "error", width: "12%", formatter: cell => {
                    return util.comma(cell.getValue())
                }
            }, {
                title: columnNames.errorRate, field: "errorRate", width: "12%", formatter: cell => {
                    return cell.getValue() + '%'
                }
            }, {
                title: columnNames.crash, field: "crash", width: "12%", formatter: cell => {
                    return util.comma(cell.getValue())
                }
            }, {
                title: columnNames.crashRate, field: "crashRate", width: "12%", formatter: cell => {
                    return cell.getValue() + '%'
                }
            }],
            // row 한줄씩 그려줄때
            rowFormatter: function (row) {
                // 행의 데이터 가져오기
                const rowData = row.getData();
                const element = row.getElement();

                // 차트 시리즈 색상데이터
                const data = v.chartColors.filter(e => e.osType == rowData.osType && e.appVer == rowData.appVer)
                let color
                if (data.length !== 0) {
                    color = data[0].color
                }

                // 색상을 줘야할 필드를 찾아서 색상주기
                v.tabulatorColorField.forEach(field => {
                    element.querySelector("[tabulator-field='" + field + "']").setAttribute("data-os-type", rowData.osType);
                    element.querySelector("[tabulator-field='" + field + "']").style.color = color
                    element.querySelector("[tabulator-field='" + field + "']").classList.add('non_color')
                })
            },
        });

        // chart 객체 생성
        chartTypes.forEach(type => {
            this[type + 'GraphWrap'] = Highcharts.chart(id + '_' + type + 'GraphWrap', {
                chart: {
                    type: 'column'
                }, xAxis: {
                    minPadding: 0,
                    maxPadding: 0,
                    tickInterval: 24 * 3600 * 1000, // 하루간격으로 카테고리 라벨 표시
                    type: 'datetime',
                    dateTimeLabelFormats: {
                        day: '%m/%d'
                    }
                }, yAxis: {
                    min: 0, max: 100
                }, plotOptions: {
                    column: {
                        maxPointWidth: 50, // 막대의 최대 너비를 50px로 제한
                        stacking: 'percent',
                        dataLabels: {
                            enabled: true, format: '{point.y}%' // 각 막대의 시리즈 값을 표시
                        }
                    }
                }, series: []
            })
        })

        updateContent()
    }

    addEventListener() {
        const {id} = this
        const v = this
        const $container = $('#' + id + '__popup')
        const $typeTab = $('#' + id + '__popup' + ' .type_tab')

        $('.dimmed').on('click', () => {
            v.closePopup(v)
        })

        const toggle = (t) => {
            $(t).siblings('button').removeClass('on')
            $(t).addClass('on')
        }

        $('.type_tab').on('click', this.toggleTab)

        // 오른쪽 상단 1W, 1M 버튼
        $('#' + id + '__popup' + ' .maxy_component_btn').on('click', function () {
            const dateType = this.getAttribute('data-date')
            toggle(this)
            cursor.show()
            v.getPageViewInfoList(dateType)
        })

        // 차트 OS Type 토글버튼
        $typeTab.on('click', function () {
            const tab = $(this).data('type')
            // 누른 토글버튼은 on, 아닌건 on빼기
            $('#' + id + '__popup' + ' .btn_tab').addClass('selected')
            $(this).siblings('#' + id + '__popup' + ' .btn_tab').removeClass('selected')

            v.btnType = $('#' + id + '__popup' + ' .type_tab.selected')[0].innerText

            // tabulator에서 텍스트 색상 바꾸기
            $('.tabulator-cell').addClass('non_color')
            $('.tabulator-cell[data-os-type="' + v.btnType + '"]').removeClass('non_color')

            // 선택한 os에 따라서 tabulator 정렬
            if (v.btnType === 'Android') {
                v.table.setSort("osType", "asc")
            } else if (v.btnType === 'iOS') {
                v.table.setSort("osType", "desc")
            }

            // 차트 보여주는 영역 show/hide
            const $graphWrap = $container.find('.graph_wrap')
            $graphWrap.hide()
            $('#' + tab).show()
        })
    }

    openPopup() {
        const {id} = this
        $('.dimmed').show()

        const $target = $('#' + id + '__popup')
        $target.show()

        this.getPageViewInfoList()
    }

    closePopup(v) {
        const popup = '#' + v.id + '__popup'
        const span = popup + ' span'
        const $dimmed = $('.dimmed')

        v.table.clearData()
        $(span).text('')
        $dimmed.off('click')
        $dimmed.hide()
        $(popup).hide()

        // 팝업 닫을 때 커서가 보이면 없애주도록
        const $cursor = $('.maxy_cursor_dots')
        if ($cursor.css('display') === 'block') {
            cursor.hide()
        }
    }

    // 데이터 가져오기
    getPageViewInfoList(dateType) {
        const v = this
        const {chartTypes} = v

        const param = {
            packageNm: $('#packageNm').val(),
            serverType: $('#packageNm option:checked').data('server-type'),
            osType: $('#osType').val(),
            dateType: v.dateType
        }

        if (dateType) {
            param.dateType = dateType
        }

        ajaxCall('/db/0100/getVersionConversionInfoList.maxy', param, {disableDimmed: true})
            .then(data => {
                if (data.listResult.length > 0) {
                    const length = data.listResult.length
                    $('#listCnt').text(' (' + util.comma(length) + ')')

                    // 차트 비워주기
                    chartTypes.forEach(type => {
                        const chart = this[type + 'GraphWrap']

                        while (chart.series.length) {
                            chart.series[0].remove()
                        }
                    })

                    this.drawChart(data.chartResult).then(() => { // 차트 그려주기
                        v.table.setData(data.listResult).then(() => { // tabulator 그려주기
                            // tabulator에서 텍스트 색상 바꾸기
                            $('.tabulator-cell').addClass('non_color')
                            $('.tabulator-cell[data-os-type="' + v.btnType + '"]').removeClass('non_color')
                        })
                    })
                }
            })
            .catch((e) => {
                console.log(e)
            })
    }

    // 선택한 탭에 대한 데이터만 보여준다
    toggleTab(e) {
        const $clickedTab = $(e.target)

        const type = $clickedTab.data('type')
        // tab 선택
        const $tab = $('.type_tab')
        $tab.removeClass('selected')
        $clickedTab.addClass('selected')

        $('#' + type).show()
    }

    async drawChart(data) {
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

            // 차트 시리즈별 색상, 테이블리스트의 컬럼텍스트에 color값 주기 위함
            this.chartColors = []

            // 차트 series 넣어주기
            chartTypes.forEach(type => {
                const chart = this[type + 'GraphWrap']
                // 그려줄 데이터
                let draw_data = data.filter(item => item.osType === type)

                draw_data = draw_data.map((item) => ({
                    ...item, name: item.osType + " " + item.appVer
                }))

                for (let i = 0; i < draw_data.length; i++) {
                    chart.addSeries(createSeries(draw_data[i].name, draw_data[i].data, hcColors.multiColumns[i]))
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
                                const countData = draw_data.filter(item => item.name === name);
                                const firstCountData = countData[0] ?? {}; // 첫 번째 요소가 없을 경우 빈 객체 반환
                                const countKey = firstCountData.count?.filter(item => item[0] === this.key) ?? [];
                                let count = countKey.length > 0 ? util.comma(countKey[0][1]) : 0;
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

                // 차트 시리즈별 색상, 테이블리스트의 컬럼텍스트에 color값 주기 위함
                chart.series.forEach((series) => {
                    const appVer = series.name.replace(type + ' ', '')

                    this.chartColors.push({
                        "osType": type,
                        "appVer": appVer,
                        "color": series.color
                    })
                });

                chart.redraw()
            })
        } catch (e) {
            console.log(e)
        }
    }
}
