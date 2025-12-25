/*
    종합 분석 > Marketing Insight 팝업
*/
class MaxyPopupMarketingInsight {
    constructor(options) {
        this.appendId = options.appendId
        this.id = options.id
        this.param = options.param
        this.selectedRow = null
        this.offsetIndex = 1
        this.lastId = []
        this.lastPageStartTm = []
        this.type = null
        this.userFlowTemplate = null

        // 팝업 생성 후
        this.init().then(() => {
            this.addEventListener()
            this.openPopup()
        })
    }

    addEventListener() {
        const v = this
        $('.dimmed').on('click', () => {
            v.closePopup(v)
        })

        // 상단의 reach user, bounce user 버튼 클릭 시 
        $('#marketingInsight__popup .btn_common').on('click', (e) => {
            // 선택한 객체 아이디
            const targetId = e.target.id

            // v.param.type값을 선택한 객체 아이디로 바꿔준다
            // 리스트에서 데이터 가져올 때 v.param.type 값으로 분기처리함
            v.param.type = targetId
            v.type = targetId

            v.updateData(targetId)
        })

        // 리스트 상단 우측 페이징 버튼 (이전)
        $('#' + v.id + 'BtnPrev').on('click', () => {
            // 리스트에 선택된 row 값 초기화
            if (v.selectedRow) {
                v.selectedRow = null
            }
            // offsetIndex 감소
            v.offsetIndex--

            // lastId, lastPageStartTm 배열에서 마지막 값 pop
            v.lastId.pop()
            v.lastId.pop()
            v.lastPageStartTm.pop()
            v.lastPageStartTm.pop()

            // 리스트 조회 함수 호출
            v.getMarketingInsightList()
        })

        // 리스트 상단 우측 페이징 버튼 (다음)
        $('#' + v.id + 'BtnNext').on('click', () => {
            if (v.selectedRow) {
                v.selectedRow = null
            }
            v.offsetIndex++

            v.getMarketingInsightList()
        })

        $('#btnPageFlow').on('click', function () {
            v.getUserFlow()
        })

        // 오른쪽 중단 펼치기 버튼
        $('#' + v.id + '__popup' + ' .btn_graphic_open').on('click', async function () {
            if (v.sankeyChart.series[0].data.length === 0) {
                v.getPageRelationsInfo()
            } else {
                // 펼치기: hidden을 제거하고 show 추가
                $('.chart_graphic_wrap').removeClass('hidden').addClass('show')
            }
        })

        // 펼친 화면 접기 버튼
        $('#' + v.id + '__popup' + ' .btn_graphic_close').on('click', function () {
            $('.chart_graphic_wrap').removeClass('show').addClass('hidden');
        })

        userflow.setHandlebars()
        v.setTooltip()
    }

    async getTemplate() {
        return await fetch('/templates/userFlowChart.html')
            .then(response => response.text())
    }

    setTooltip() {
        const tooltipTxt = [
            i18next.tns('common.msg.deviceIdCopy'),
            i18next.tns('common.text.appVersion'),
            i18next.tns('common.text.osVersion'),
            i18next.tns('common.text.networkType'),
            i18next.tns('common.text.carrier'),
            i18next.tns('common.text.location'),
            i18next.tns('common.tableColumn.pageType')
        ]

        // 상단 타이틀 옆 회색 아이콘에 툴팁 추가
        $('.sub_title_wrap .sub_title:not(#marketingInsight_userId)').each(function (idx) {
            const id = $(this).attr('id')
            tippy('#' + id, {
                content: tooltipTxt[idx],
                arrow: false,
                placement: 'bottom',
                allowHTML: true,
                theme: 'maxy-tooltip'
            })
        })

        // 사용자 행동 분석 툴팁
        tippy('#btnPageFlow', {
            content: trl('common.text.userBehavior'),
            arrow: false,
            placement: 'bottom',
            allowHTML: true,
            theme: 'maxy-tooltip'
        })
    }

    openPopup() {
        const {id, param} = this
        $('.dimmed').show()

        const $target = $('#' + id + '__popup')
        $target.show()

        // 타입이 이탈인지 도달인지에 따른 타이틀 활성화 표시
        if (param.type) {
            $('#' + param.type).addClass(param.type)
        }
        // 리스트 가져오기
        this.getMarketingInsightList()

        // user flow chart 템플릿 가져오기
        this.getTemplate().then((templates) => {
            this.userFlowTemplate = templates
        });

    }

    closePopup(v) {
        const popup = '#' + v.id + '__popup'
        const span = popup + ' span'
        const $dimmed = $('.dimmed')
        const btn = '#' + v.id + '__popup .btn_common'

        $(btn).each(function () {
            $(this).removeClass('reach bounce')
        })

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

    async init() {
        const v = this
        const {id, appendId, param} = v
        const source = await fetch(
            '/components/db/popup/popup-marketing-insight.html')
            .then(response => response.text())

        const template = Handlebars.compile(source)

        const $target = $('#' + appendId)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + appendId
        }
        $target.empty()

        // type (reach || bounce) 에 따른 우측 상단 타이틀명 표시 (Bounce User || Reach User)
        if (param.type) {
            v.type = param.type
        }

        $target.append(template({id}))
        updateContent()
        this.initTable()
        this.initSankeyChart()
    }

    initTable() {
        const v = this

        v.table = new Tabulator('#marketingInsight__list', {
            height: '40vh',
            layout: 'fitDataFill',
            selectedRow: 1,
            placeholder: i18next.tns('common.msg.noData'),
            columns: [
                {
                    title: 'Device ID',
                    field: 'deviceId',
                    width: '25%'
                },
                {
                    title: 'User ID',
                    field: 'userId',
                    width: '10%',
                    formatter: idDisplay.getId
                },
                {
                    title: 'From Time',
                    field: 'preUrlTime',
                    width: '12%',
                    formatter: cell => {
                        return util.timestampToTime(cell.getValue(), false)
                    }
                },
                {
                    title: 'To Time',
                    field: 'pageStartTm',
                    width: '12%',
                    formatter: cell => {
                        return util.timestampToTime(cell.getValue(), false)
                    }
                },
                {
                    title: 'Lead Time',
                    field: 'lead',
                    width: '10%',
                    formatter: cell => {
                        // 2025.03.28 박형수 수석님 요청
                        // native에서 필요에 의해 pageStartTm(아마도..?)을 1ms를 더해줘서 lead time 보여줄땐 1ms빼서 보여주기
                        if (cell.getValue() === '-') return '-'
                        else return util.convertTime((cell.getValue() - 1), false, false, true)
                    }
                },
                {
                    title: 'Reaching Page',
                    field: 'reqUrl',
                    width: '30%'
                }
            ],
        })

        // row click 하면 row 전체 데이터를 가지고 detail 데이터 호출
        v.table.on("rowClick", (e, row) => {
            if (v.selectedRow) {
                v.selectedRow.getElement().classList.remove('selected_row')
            }
            row.getElement().classList.add('selected_row')
            v.selectedRow = row

            v.getMarketingInsightDetail(row.getData())
        })
    }

    initSankeyChart() {
        const v = this

        v.sankeyChart = Highcharts.chart(v.id + '__sankeyChart', {
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
    }

    // 리스트 가져오기
    getMarketingInsightList() {
        const v = this

        v.param.packageNm = sessionStorage.getItem('packageNm')
        v.param.serverType = sessionStorage.getItem('serverType')
        v.param.osType = sessionStorage.getItem('osType')
        v.param.lastPageStartTm = v.lastPageStartTm[v.lastPageStartTm.length - 1]
        v.param.lastId = v.lastId[v.lastId.length - 1]

        const $graphWrap = $('#' + v.id + '__userFlow .graph_wrap');
        // userFlow 그래프 초기화
        $graphWrap.empty();

        ajaxCall('/db/0100/getMarketingInsightList.maxy', v.param,
            {disableDimmed: true})
            .then(data => {
                if (data) {
                    v.handleData(data, v)
                }
                // 차트 데이터 조회
            })
            .catch((e) => {
                console.log(e)
            })
    }

    /**
     * 받아온 데이터로 타입 별 분기처리하여 차트 및 상단 데이터 세팅
     *
     * @param data 받아온 데이터 객체
     * @param v this 객체
     */
    handleData(data, v) {
        if (!data) return

        // 타입에 따라 데이터 분기
        const dataByType = data[v.param.type]
        // 타입에 맞는 리스트만 가져오기
        const list = dataByType['list']
        const listLength = !isNaN(list.length) ? util.comma(list.length) : 0;

        // 상단 타이틀 옆에 리스트 개수 표시        $('#count').text(`(${listLength})`);

        // Prev/Next 버튼 활성화 여부 설정
        $('#marketingInsightBtnPrev').attr('disabled', v.offsetIndex === 1)
        $('#marketingInsightBtnNext').attr('disabled', list.length < 50)

        const $chart = $('#' + v.id + '__userFlow .graph_wrap')

        // 리스트가 0개인 경우 차트 초기화
        if (listLength == 0) {
            v.resetChart($chart)
            return
        }

        $chart.removeClass('no_data')

        // lastId, lastPageStartTm 저장
        v.lastId.push(dataByType['lastId'])
        v.lastPageStartTm.push(dataByType['lastPageStartTm'])

        // 유저 수 및 평균 리드 타임 표시
        $('#pUser').text(util.comma(dataByType['count']))
        $('#pLeadTimeAvg').text(util.convertTime(dataByType['avgLeadTime'], false, false, false))

        v.table.setData(list).then(() => {
            // 첫 번째 행 강제 클릭
            $(`#${v.id}__popup .tabulator-table > div:eq(0)`).trigger('click')
        })
    }

    /**
     * 리스트 데이터 0일 때 차트 및 상단 데이터 초기화
     *
     * @param $chart 차트 객체
     */
    resetChart($chart) {
        const v = this

        // 데이터 없을 때 상단 기본정보 초기화 (모든 값을 -로 처리함)
        const params = {
            deviceId: '-',
            deviceModel: '-',
            osVer: '-',
            comType: '-',
            simOperatorNm: '-',
            logType: '-',
            userId: '-',
            appVer: '-',
            timezone: '-'
        }

        $('#' + v.id + '__popup #btnPageFlow').hide()
        v.setDetailData(params)

        $('#pLeadTimeAvg').text('-')
        $('#pUser').text('0')
        $chart.empty().addClass('no_data')
    }

    /**
     * 상세 데이터 조회
     *
     * @param params 클릭한 row의 데이터 객체 {object}
     */
    getMarketingInsightDetail(params) {
        const v = this

        const param = {
            packageNm: sessionStorage.getItem('packageNm'),
            serverType: sessionStorage.getItem('serverType'),
            osType: sessionStorage.getItem('osType'),
            parentLogDate: params.parentLogDate,
            deviceId: params.deviceId,
            preUrl: params.preUrl,
            reqUrl: params.reqUrl,
            preUrlTime: params.preUrlTime,
            pageStartTm: params.pageStartTm
        }

        ajaxCall('/db/0100/getMarketingInsightDetail.maxy', param)
            .then(data => {
                // 팝업 상단 데이터 세팅
                v.setDetailData(params)

                if (data) {
                    if (data['list'].length > 0) {
                        $('#btnPageFlow').show()
                        // 리스트 하단 user flow 영역 템플릿 가져온 후에 user flow chart 세팅
                        v.setUserFlowChart(data)
                    }
                }
            })
            .catch((e) => {
                console.log(e)
            })
    }

    /**
     * 상세 데이터 조회
     *
     * @param params 클릭한 row의 데이터 객체 {object}
     */
    setDetailData(params) {
        const {id} = this

        const $popup = $('#' + id + '__popup')
        const $target = $popup.find('.sub_title')

        $popup.find('.icon_os').attr('class', 'icon_os')

        $('#marketingInsight_userId').hide()

        // 팝업 최상단 기본 정보 세팅하기
        for (let i = 0; i < $target.length; i++) {
            const $parentEl = $($target[i])
            const $el = $parentEl.find('span')
            const id = $el.attr('id')

            let value = params[id]

            // 타입에 맞는 데이터 알맞게 변환하여 세팅
            switch (id) {
                case 'deviceModel':
                    value = getDeviceModel(params[id])
                    break
                case 'osVer':
                    const osType = params.osType ? params.osType.toLowerCase() : '-'
                    $parentEl.find('i').addClass(osType)
                    break
                case 'comType':
                    value = params.comType !== '-' ? util.convertComType(params.comType) : '-'
                    break
                case 'simOperatorNm':
                    value = util.simOperatorNmFormat(params.simOperatorNm)
                    break
                case 'logType':
                    const pageType = params.logType !== '-' ? util.logTypeToPageType(params.logType) : '-'

                    if (pageType === '-') {
                        value = pageType
                    } else {
                        $parentEl.find('i').addClass(pageType[0])
                        value = pageType[1]
                    }

                    break
                case 'userId':
                    if (params[id] !== '-') {
                        $('#marketingInsight_' + id).css('display', 'flex')

                        const clientNm = params['clientNm']
                        const userNm = params['userNm']
                        const birthDay = params['birthDay']

                        const userInfo = (util.isEmpty(clientNm) ? '-' : clientNm) +
                            ' / ' + (util.isEmpty(userNm) ? '-' : userNm) +
                            ' / ' + value +
                            ' / ' + (util.isEmpty(birthDay) ? '-' : birthDay)

                        if (this.userInfoTooltip) {
                            this.userInfoTooltip[0].setContent(userInfo)
                        } else {
                            this.userInfoTooltip = tippy('#marketingInsight_userId', {
                                content: userInfo,
                                arrow: false,
                                placement: 'bottom',
                                allowHTML: true,
                                theme: 'maxy-tooltip'
                            })
                        }
                        break
                    } else if (params['clientNo'] && params['clientNo'] !== '-') {
                        // userId가 '-'이거나 없는 상황에서 clientNo가 존재하고 '-'가 아닌 경우
                        $('#marketingInsight_' + id).css('display', 'flex')

                        const clientNm = params['clientNm']
                        const userNm = params['userNm']
                        const birthDay = params['birthDay']

                        // clientNo를 value 대신 사용
                        const userInfo = (util.isEmpty(clientNm) ? '-' : clientNm) +
                            ' / ' + (util.isEmpty(userNm) ? '-' : userNm) +
                            ' / ' + params['clientNo'] +
                            ' / ' + (util.isEmpty(birthDay) ? '-' : birthDay)

                        if (this.userInfoTooltip) {
                            this.userInfoTooltip[0].setContent(userInfo)
                        } else {
                            this.userInfoTooltip = tippy('#marketingInsight_userId', {
                                content: userInfo,
                                arrow: false,
                                placement: 'bottom',
                                allowHTML: true,
                                theme: 'maxy-tooltip'
                            })
                        }
                        break
                    }
            }

            $el.text(value)
        }

        const $pDeviceName = $('#marketingInsight_deviceModel')
        $pDeviceName.off('click')
        $pDeviceName.on('click', () => {
            util.copy(params['deviceId'])
        })
    }

    /*
    * 리스트 하단에 user flow chart 그리기
    *
    */
    setUserFlowChart(data) {
        const v = this
        const {id, userFlowTemplate, type} = v
        const {list} = data

        const packageNm = sessionStorage.getItem('packageNm');
        const serverType = sessionStorage.getItem('serverType');
        const $graphWrap = $('#' + id + '__userFlow .graph_wrap');

        // 기존 그래프 초기화
        $graphWrap.empty();

        const template = Handlebars.compile(userFlowTemplate)

        const chart = template(list)
        $graphWrap.append(chart)

        // user flow chart 세팅 (사용자 분석이랑 좀 다름)
        $('#' + id + '__userFlow .page').removeClass('hidden').addClass('visible')
        $('#' + id + '__userFlow .page_content').css('visibility', 'visible')
        $('#' + id + '__userFlow .user_flow_summary_wrap').hide()
        $('#' + id + '__userFlow .content_idx').hide()
        $('#' + id + '__userFlow').off('click', '.page_wrap')

        updateContent()
        userflow.addTooltip(list, this.selectedRow.getData(), type)
    }

    updateData(targetId) {
        const v = this

        const btn = '#' + v.id + '__popup .btn_common'

        // 선택한 객체의 id에 따라 해당 객체에 reach, bounce 클래스 추가
        $(btn).each(function () {
            $(this).removeClass('reach bounce')
        })
        $('#' + targetId).addClass(targetId)

        // 선택한 객체의 id에 따라 리스트, 차트 변경해주기
        // 페이징 관련 변수 초기화
        v.offsetIndex = 1
        v.lastPageStartTm = []
        v.lastId = []

        // tabulator 관련 변수 초기화
        v.selectedRow = null
        // tabulator 초기화
        v.table.clearData()

        // 리스트 받아오기
        v.getMarketingInsightList()
    }

    getUserFlow() {
        const v = this

        const rowData = v.selectedRow.getData()

        const packageNm = v.param.packageNm
        const serverType = v.param.serverType
        const deviceId = rowData.deviceId
        const logTm = rowData.parentLogDate
        const preUrl = rowData.preUrl
        const reqUrl = rowData.reqUrl
        const pageStartTm = rowData.pageStartTm
        const preUrlTime = rowData.preUrlTime
        const type = 'marketingInsight'

        const params = {
            deviceId,
            packageNm,
            serverType,
            logTm,
            preUrl,
            reqUrl,
            pageStartTm,
            preUrlTime,
            type
        }

        sessionStorage.setItem('ua0400Params', JSON.stringify(params))
        // 사용자 행동분석 버튼을 눌러 사용자 분석 화면으로 이동할 떄는 새창으로 열도록 변경
        const targetUrl = '/ua/0000/goMenuUserAnalysisView.maxy'
        window.open(targetUrl, '_blank')
    }

    getPageRelationsInfo() {
        const v = this
        const {id} = this

        const packageNm = sessionStorage.getItem('packageNm')
        const serverType = sessionStorage.getItem('serverType')
        const osType = sessionStorage.getItem('osType')

        const param = {
            packageNm, serverType, osType,
            from: v.param.from,
            to: v.param.to
        }

        ajaxCall('/db/0100/getMarketingInsightPageRelations.maxy', param)
            .then(data => {
                if('errMsg' in data.datas){
                    toast(trl(data.datas.errMsg))
                    return false
                }

                // url title 가져오기
                const preUrlTitle = getPageList(packageNm, serverType, data.preUrl)
                const reqUrlTitle = getPageList(packageNm, serverType, data.reqUrl)

                $('#' + id + '__preUrl').text(`(${preUrlTitle}) ${data.preUrl}`)
                $('#' + id + '__reqUrl').text(`(${reqUrlTitle}) ${data.reqUrl}`)

                v.drawSankeyGraph(data)
            })
            .catch((e) => {
                console.log(e)
            })
    }

    drawSankeyGraph(data) {
        const v = this
        const {sankeyChart} = v
        const {datas, preUrl, reqUrl} = data

        const reachLink = datas.links.filter(i => i[0] === preUrl && i[1] === 'OUT_' + reqUrl)
        const reachCount = reachLink.length > 0 ? reachLink[0][2] : 0
        const reachRate = (reachCount / datas.outCount) * 100
        const bounceRate = 100 - reachRate

        // EX) Reach Count : 216,030 (6%)   /   Bounce Count : 3,478,027 (94%)
        const reachText = `${trl('common.text.reachcount')} : ${util.comma(reachCount)} (${reachRate.toFixed(1)}%)`
        const bounceText = `${trl('common.text.bouncecount')} : ${util.comma(datas.outCount - reachCount)} (${bounceRate.toFixed(1)}%)`

        $('.icon_text.reach').text(reachText)
        $('.icon_text.bounce').text(bounceText)

        // nodes에 url alias로 변경
        for (let i = 0; i < datas.nodes.length; i++) {
            datas.nodes[i].name = getPageList(sessionStorage.getItem('packageNm'), sessionStorage.getItem('serverType'), datas.nodes[i].name)

            if(datas.nodes[i].id === 'OUT_' + reqUrl){
                datas.nodes[i]['dataLabels'] = {
                    enabled: true, // 반드시 보이게
                    allowOverlap: true,    // 겹쳐도 허용
                    style: {
                        fontSize: '1.5em'
                    }
                }
            }
        }

        // preUrl alias로 변경
        datas.nodes.push({
            id: preUrl,
            name: getPageList(sessionStorage.getItem('packageNm'), sessionStorage.getItem('serverType'), preUrl),
            dataLabels: {
                style: {
                    fontSize: '2em'
                }
            }
        })

        sankeyChart.update({
            series: [{
                'data': datas.links,
                'nodes': datas.nodes
            }],
            // 차트 툴팁 만들기
            tooltip: {
                formatter: function () {
                    let rate = 0
                    if (preUrl === this.point.to) rate = (this.point.weight / datas.inCount) * 100
                    else rate = (this.point.weight / datas.outCount) * 100
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

        // 펼치기: hidden을 제거하고 show 추가
        $('.chart_graphic_wrap').removeClass('hidden').addClass('show')
    }
}
