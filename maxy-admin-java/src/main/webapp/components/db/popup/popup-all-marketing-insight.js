/*
    종합 분석 > Marketing Insight > All 팝업
*/
class MaxyPopUpAllMarketingInsight {
    constructor(options) {
        this.appendId = options.appendId
        this.id = options.id
        this.data = options.data
        this.selectedDate = null
        this.dateType = 'WEEK' // 오른쪽 상단 1W, 1M 토글버튼 상태값

        // 팝업 생성 후
        this.init().then(() => {
            this.addEventListener()
            this.openPopup()
        })
    }

    async init() {
        const v = this
        const {id, appendId} = v
        const source = await fetch('/components/db/popup/popup-all-marketing-insight.html')
            .then(response => response.text())

        const template = Handlebars.compile(source)

        const $target = $('#' + appendId)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + appendId
        }
        $target.empty()
        $target.append(template({id}))

        const tableTarget = '#' + id + '__list'

        const columnNames = {
            'day': i18next.tns('common.tableColumn.day'),
            'user': i18next.tns('common.tableColumn.user'),
            'reach': i18next.tns('common.tableColumn.reach'),
            'reachRate': i18next.tns('common.tableColumn.reachRate'),
            'lead': i18next.tns('common.tableColumn.leadTimeAvg'),
            'bounce': i18next.tns('common.tableColumn.bounce'),
            'bounceRate': i18next.tns('common.tableColumn.bounceRate'),
        }
        this.table = new Tabulator(tableTarget, {
            layout: 'fitDataFill',
            height: '37vh',
            placeholder: i18next.tns('common.msg.noData'),
            selectableRows: 1,
            initialSort: [{
                column: "pageStartTm", dir: "desc"
            }],
            columns: [{
                title: columnNames.day, field: "pageStartTm", width: "15%", formatter: cell => {
                    return util.timestampToDate(cell.getValue())
                }
            }, {
                title: columnNames.user, field: "users", width: "15%", formatter: cell => {
                    return util.comma(cell.getValue())
                }
            }, {
                title: columnNames.reach, field: "reach", width: "14%", formatter: cell => {
                    return util.comma(cell.getValue())
                }
            }, {
                title: columnNames.reachRate, field: "reachRate", width: "14%", formatter: cell => {
                    return cell.getValue() + '%'
                }
            }, {
                title: columnNames.lead, field: "lead", width: "14%", formatter: cell => {
                    return util.convertTime(Math.floor(cell.getValue()))
                }
            }, {
                title: columnNames.bounce, field: "bounce", width: "14%", formatter: cell => {
                    return util.comma(cell.getValue())
                }
            }, {
                title: columnNames.bounceRate, field: "bounceRate", width: "14%", formatter: cell => {
                    return cell.getValue() + '%'
                }
            }],
        });

        this.chart = Highcharts.chart(id + '__chart', {
            chart: {
                type: 'sankey'
            },
            colors: hcColors.sankey,
            plotOptions: {
                sankey: {
                    minLinkWidth: 5, // 링크 최소 두께 강제
                    nodeWidth: 40, // 노드 가로 폭
                    nodePadding: 15,
                    dataLabels: {
                        enabled: true, // 반드시 label을 켬
                    }
                }
            },
            series: [{
                keys: ['from', 'to', 'weight', 'color'],
                data: [],
                dataLabels: {
                    style: {
                        fontSize: '1em' // node 글씨크기 지정
                    }
                },
                states: {
                    hover: {
                        enabled: false // hover 상태 비활성화
                    },
                    inactive: {
                        enabled: false // 비활성 상태 비활성화
                    }
                }
            }]
        })

        updateContent()
    }

    addEventListener() {
        const {id} = this
        const v = this

        $('.dimmed').on('click', () => {
            v.closePopup(v)
        })

        const toggle = (t) => {
            $(t).siblings('button').removeClass('on')
            $(t).addClass('on')
        }

        // 오른쪽 상단 1W, 1M 버튼
        $('#' + id + '__popup' + ' .maxy_component_btn').on('click', function () {
            const dateType = this.getAttribute('data-date')
            toggle(this)
            v.dateType = dateType
            cursor.show()
            v.getPageViewInfoList(dateType)
        })

        // 테이블 행 선택시
        v.table.on("rowClick", function (e, row) {
            // 이미 선택한것과 동일한 로우 선택하면
            if (this.selectedDate === row.getData().pageStartTm) {
                // 테이블표 전체 일자로 차트조회
                this.selectedDate = ''
                let from, to = +new Date()

                if (v.dateType === 'MONTH') {
                    from = util.dateToTimestamp(util.getDate(-30), true)
                } else {
                    from = util.dateToTimestamp(util.getDate(-6), true)
                }

                v.getPageRelationsInfo(from, to)
            } else {
                // 선택한 행 일자로 차트조회
                this.selectedDate = row.getData().pageStartTm
                const from = row.getData().pageStartTm
                const to = util.dateToTimestamp(new Date(row.getData().pageStartTm), false)

                v.getPageRelationsInfo(from, to)
            }
        });

        // 25.03.27 송호학이사님 / 폴더버튼 없애기로 해서 임시로 주석처리
        /*$('#' + id + '__popup' + ' .btn_graphic_open').on('click', async function () {
            const $graphicWrap = $('.chart_graphic_wrap')

            if ($graphicWrap.hasClass('show')) {
                // 접기: show를 제거하고 hidden 추가
                $graphicWrap.removeClass('show').addClass('hidden')
            } else {
                // 펼치기: hidden을 제거하고 show 추가
                $graphicWrap.removeClass('hidden').addClass('show')
            }
        });*/

        // 25.03.27 송호학이사님 / 폴더버튼 없애기로 해서 임시로 주석처리
        /*$('#' + id + '__popup' + ' .btn_graphic_close').on('click', function () {
            $('.chart_graphic_wrap').removeClass('show').addClass('hidden');
        })*/
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
        const {id} = v

        const packageNm = sessionStorage.getItem('packageNm')
        const serverType = sessionStorage.getItem('serverType')
        const osType = sessionStorage.getItem('osType')
        let from, to = +new Date()

        if (dateType === 'MONTH') {
            from = util.dateToTimestamp(util.getDate(-30), true)
        } else {
            from = util.dateToTimestamp(util.getDate(-6), true)
        }

        const param = {
            packageNm, serverType, osType,
            from, to
        }

        ajaxCall('/db/0100/getDailyMarketingInsight.maxy', param)
            .then(data => {
                const {preUrl, reqUrl, listData} = data

                if (listData.length > 0) {
                    const length = listData.length
                    $('#listCnt').text(' (' + util.comma(length) + ')')

                    const packageNm = sessionStorage.getItem('packageNm')
                    const serverType = sessionStorage.getItem('serverType')
                    // url title 가져오기
                    const preUrlTitle = getPageList(packageNm, serverType, preUrl)
                    const reqUrlTitle = getPageList(packageNm, serverType, reqUrl)

                    $('#' + id + '__preUrl').html(`
                        <img src="/images/maxy/icon-page-location-gray.svg">
                        (${preUrlTitle}) ${preUrl}
                    `)
                    $('#' + id + '__reqUrl').html(`
                        <img src="/images/maxy/icon-page-location-blue.svg">
                        (${reqUrlTitle}) ${reqUrl}
                    `)

                    v.table.setData(listData).then(() => { // tabulator 그려주기
                        // tabulator에서 텍스트 색상 바꾸기
                        $('.tabulator-cell').addClass('non_color')
                        $('.tabulator-cell[data-os-type="' + v.btnType + '"]').removeClass('non_color')
                    })

                    // 그래프 그리기
                    v.getPageRelationsInfo(from, to)
                    //v.drawGraph(chartData, from, to, preUrl)
                }
            })
            .catch((e) => {
                console.log(e)
            })
    }

    getPageRelationsInfo(from, to) {
        const v = this

        const packageNm = sessionStorage.getItem('packageNm')
        const serverType = sessionStorage.getItem('serverType')
        const osType = sessionStorage.getItem('osType')

        const param = {
            packageNm, serverType, osType,
            from, to
        }

        ajaxCall('/db/0100/getMarketingInsightPageRelations.maxy', param)
            .then(data => {
                if('errMsg' in data.datas){
                    toast(trl(data.datas.errMsg))
                    return false
                }
                v.drawGraph(data.datas, from, to, data.preUrl, data.reqUrl)
            })
            .catch((e) => {
                console.log(e)
            })
    }

    drawGraph(data, from, to, preUrl, reqUrl) {
        const v = this
        const {chart} = v

        // nodes에 url alias로 변경
        for (let i = 0; i < data.nodes.length; i++) {
            data.nodes[i].name = getPageList(sessionStorage.getItem('packageNm'), sessionStorage.getItem('serverType'), data.nodes[i].name)

            if(data.nodes[i].id === 'OUT_' + reqUrl){
                data.nodes[i]['dataLabels'] = {
                    enabled: true, // 반드시 보이게
                    allowOverlap: true,    // 겹쳐도 허용
                    style: {
                        fontSize: '1.5em'
                    }
                }
            }
        }

        // preUrl alias로 변경
        data.nodes.push({
            id: preUrl,
            name: getPageList(sessionStorage.getItem('packageNm'), sessionStorage.getItem('serverType'), preUrl),
            dataLabels: {
                style: {
                    fontSize: '2em'
                }
            }
        })

        // 차트 조회 일자 표기
        let title = trl('common.text.searchdate') + ' : '
        if (util.timestampToDate(from) === util.timestampToDate(to)) {
            title += util.timestampToDate(from)
        } else {
            title += util.timestampToDate(from) + ' ~ ' + util.timestampToDate(to)
        }

        chart.update({
            title: {
                text: title,
                y: 20,
                style: {
                    fontSize: 'var(--font-m-size)'
                }
            },
            series: [{
                'data': data.links,
                'nodes': data.nodes
            }],
            // 차트 툴팁 만들기
            tooltip: {
                formatter: function () {
                    let rate = 0
                    if (preUrl === this.point.to) rate = (this.point.weight / data.inCount) * 100
                    else rate = (this.point.weight / data.outCount) * 100
                    rate = rate.toFixed(1)

                    const point = this.point
                    if (point.options.hasOwnProperty('id')) {
                        return `<span>${point.name} : <b>${util.comma(point.sum)}</b></span>`
                    } else {
                        return `<span>${point.fromNode.name} → ${point.toNode.name} : <b>${util.comma(point.weight)} (${rate}%)</b></span>`
                    }
                }
            }
        })
    }
}
