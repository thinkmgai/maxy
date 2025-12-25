'use strict'

class MaxyMarketingInsight {
    constructor(options) {
        this.id = options.id
        this.title = options.title
        this.comment = options.comment
    }

    addEventListener() {
        const {id} = this

        // All 팝업 버튼 클릭시
        $('#' + id + ' [data-btn="all"]').on('click', function () {
            const param = {
                id: 'allMarketingInsight',
                appendId: 'maxyPopupWrap'
            }
            new MaxyPopUpAllMarketingInsight(param)
        })
    }

    async init() {
        const {id, comment} = this

        const source = await fetch(
            '/components/db/marketing-insight/marketing-insight.html'
        ).then(response => response.text())
        const template = Handlebars.compile(source)
        const $target = $('#' + id)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + id
        }

        const fmtTitle = trl('dashboard.component.title.marketinginsight')
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
                zoomType: 'x'
            },
            xAxis: [{
                type: 'datetime',
                labels: {
                    formatter: function() {
                        return Highcharts.dateFormat('%H:%M', this.value);
                    }
                },
                crosshair: true
            }],
            yAxis: [{
                labels: {
                    format: '{value}%',
                    style: {
                        color: 'black'
                    }
                },
                title: {
                    text: ''
                }
            }, {
                gridLineWidth: 0,
                title: {
                    text: '',
                    style: {
                        color: 'black'
                    }
                },
                labels: {
                    style: {
                        color: 'black'
                    }
                }
            }],
            legend: {
                layout: 'horizontal',
                align: 'center',
                verticalAlign: 'bottom',
                floating: false,
                itemMarginTop: 10,
                itemMarginBottom: -10,
            },
            boost: {
                useGPUTranslations: true,
                usePreAllocated: true
            },
            plotOptions: {
                series: {
                    animation: false,
                    crisp: false,
                    pointInterval: 2,
                    events: {
                        legendItemClick: function (e) {
                            this.setVisible(true, true); // 시리즈를 강제로 보이게 유지
                        }
                    }
                },
            },
            series: []
        })
    }

    getMarketingInsightData() {
        const {id} = this
        const packageNm = sessionStorage.getItem('packageNm')
        const serverType = sessionStorage.getItem('serverType')
        const osType = sessionStorage.getItem('osType')

        const param = {
            packageNm,
            serverType,
            osType
        }

        // Marketing Insight 컴포넌트 데이터 조회
        ajaxCall('/db/0100/getMarketingInsight.maxy', param,
            {disableCursor: true}).then(data => {
            this.setMarketingInsightData(data)
        }).catch(error => {
            // Marketing Insight 설정이 안되어있을 경우
            // no data 문구 대신 설정이 필요하다는 문구로 대체
            if(error.msg === 'dashboard.msg.noSetMarketingInsight'){
                $('#' + id + ' .highcharts-no-data > text').html(trl(error.msg))

                $('#' + id + ' [data-btn="all"]').off('click')
            }else{
                toast(trl(error.msg))
            }
        })
    }

    setMarketingInsightData(data) {
        const {v} = DB0100

        // marketing insight 컴포넌트 객체 , data가 모두 존재하는 경우에만 setData 한다.
        if (v.marketinginsight && data.datas && Object.keys(data.datas).length > 0) {
            v.marketinginsight.setData(data)
        }
    }

    setData(data) {
        const v = this
        const {chart, id} = v

        try {
            const {preUrl, reqUrl} = data
            const {bounce, reach, users} = data.datas

            const packageNm = sessionStorage.getItem('packageNm')
            const serverType = sessionStorage.getItem('serverType')
            // url title 가져오기
            const preUrlTitle = getPageList(packageNm, serverType, preUrl)
            const reqUrlTitle = getPageList(packageNm, serverType, reqUrl)

            // url text, 이미지 추가
            const $preUrlText = $('#' + id + ' [data-loc="pre"]')
            const $reqUrlText = $('#' + id + ' [data-loc="req"]')

            $preUrlText.empty();
            $preUrlText.append('<img src="/images/maxy/icon-page-location-gray.svg">');
            $preUrlText.append('(' + preUrlTitle + ') ' + preUrl);
            $('#' + id + ' [data-pre-url]').attr('data-pre-url', preUrl)

            $reqUrlText.empty();
            $reqUrlText.append('<img src="/images/maxy/icon-page-location-blue.svg">');
            $reqUrlText.append('(' + reqUrlTitle + ') ' + reqUrl);
            $('#' + id + ' [data-req-url]').attr('data-req-url', reqUrl)

            const userStr = trl('common.text.user')
            const bounceStr = trl('common.text.bounce')
            const reachStr = trl('common.text.reach')

            // 차트 데이터 생성
            let bounceRateData = [], reachRateData = []

            // 유저 수에 따른 도달율, 이탈율 계산
            for (let i = 0; i < users.length; i++) {
                const totalCount = Number(bounce[i][1]) + Number(reach[i][1])

                // [timestamp, value] 형태로 데이터 생성
                bounceRateData.push(
                        [users[i][0],
                        this.calcRate(bounce[i][1], totalCount)]
                )

                reachRateData.push(
                    [users[i][0],
                    this.calcRate(reach[i][1], totalCount)]
                )
            }

            // series가 없을 때만 addSeries, 있을 때는 setData
            if (chart.series.length === 0) {
                chart.addSeries({
                    name: reachStr,
                    data: reachRateData,
                    color: '#7277FF',
                    point: {
                        events: {
                            click: function () {
                                // 이탈 or 도달 여부
                                const dataType = 'reach'
                                
                                // 클릭한 포인트의 실제 데이터 값 (도달 수)
                                const reachData = data['datas'][dataType][this.index][1]
                                if (reachData === 0) {
                                    return
                                }

                                v.setPopupData(this, dataType)
                            }
                        }
                    }
                });
                chart.addSeries({
                    name: bounceStr,
                    data: bounceRateData,
                    color: '#CA4A4A',   // 빨간색
                    dashStyle: 'ShortDot', // 점선 스타일
                    point: {
                        events: {
                            click: function () {
                                // 이탈 or 도달 여부
                                const dataType = 'bounce'

                                // 클릭한 포인트의 실제 데이터 값 (이탈 수)
                                const bounceData = data['datas'][dataType][this.index][1]
                                if (bounceData === 0) {
                                    return
                                }
                                v.setPopupData(this, dataType)
                            }
                        }
                    }

                });
            } else {
                chart.series[0].setData(reachRateData, false);
                chart.series[1].setData(bounceRateData, false);
            }

            chart.update({
                tooltip: {
                    useHTML: true, // HTML을 사용하여 툴팁을 렌더링
                    shared: true,
                    formatter: function () {
                        let tooltip = `
                            <span class="marketing_insight_tooltip_name">
                                ${util.timestampToDate(this.x)} ${util.timestampToHourMin(this.x, 'HH:mm')}
                            </span><br/><br/>
                        `;

                        // 전체 유저수, reach 유저수, bounce 유저수 구하기
                        const userValue = util.comma(users.filter(item => item[0] === this.point.x)[0][1]);
                        const reachValue = util.comma(reach.filter(item => item[0] === this.point.x)[0][1]);
                        const bounceValue = util.comma(bounce.filter(item => item[0] === this.point.x)[0][1]);

                        tooltip += `
                            <span class="tooltip-circle user"></span> 
                            <span class="marketing_insight_tooltip">${userStr}: <b>${userValue}</b></span><br/>
                            <span class="tooltip-circle reach"></span> 
                            <span class="marketing_insight_tooltip">${reachStr}: <b>${reachValue} (${this.points[0].y}%)</b></span><br/>
                            <span class="tooltip-circle bounce"></span> 
                            <span class="marketing_insight_tooltip">${bounceStr}: <b>${bounceValue} (${this.points[1].y}%)</b></span>
                        `;
                        return tooltip;
                    }
                }
            });

        } catch (e) {
            console.log(e)
        }
    }

    setPopupData(data, type) {
        const v = this

        // 팝업 - 리스트 조회할 때 필요한 파라미터 세팅
        // from은 시작시간 (선택한 데이터의 x축 시간 값)
        const from = data.x

        // to는 종료시간 (from + 1시간/ from이 09:00이면 to는 09:59:59.999)
        const to = from + (59 * 60 * 1000) + (59 * 1000) + 999

        // 해당 차트의 pre url과 req url 가져오기
        const preUrl = $('#' + v.id + ' [data-loc="pre"]').attr('data-pre-url')
        const reqUrl = $('#' + v.id + ' [data-loc="req"]').attr('data-req-url')

        const param = {
            from, to, preUrl, reqUrl, type
        }

        v.popup = new MaxyPopupMarketingInsight({
            id: 'marketingInsight',
            appendId: 'maxyPopupWrap',
            param
        })
    }

    calcRate(a, b) {
        return parseFloat(((a / b) * 100).toFixed(1))
    }

    reset() {
        const chart = this.chart
        while (chart.series.length) {
            chart.series[0].remove()
        }
    }
}