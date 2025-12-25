class Hitmap {
    constructor(elementId, options = {}) {
        this.elementId = elementId;
        this.options = {
            baseColor: 'rgb(0, 96, 100)', // 요청한 색상으로 변경
            ...options
        }
        this.from = null
        this.to = null
        this.durationFrom = null
        this.durationTo = null
        this.selectedRow = null
        this.responseRange = null

        this.getResponseRange().then(() => {
            this.create()
        })
    }

    // responseTimeScatter 차트의 설정 기준 시간 가져오기
    async getResponseRange() {
        ajaxCall('/gm/0302/getComponentConfig.maxy',
            {type: 'responsetimescatter'},
            {disableCursor: true}
        ).then(data => {
            if (data && data.optResponsetimescatterRange) {
                const {optResponsetimescatterRange} = data
                this.responseRange = optResponsetimescatterRange
            }
        }).catch(error => {
            console.log(error)
            toast(trl(error.msg))
        })
    }

    async create() {
        const v = this
        // 차트 기본 설정
        v.chart = Highcharts.chart(v.elementId, {
            chart: {
                type: 'heatmap',
                // 드래그 이벤트를 활성화하기 위한 설정
                zoomType: 'xy',
                events: {
                    // 드래그가 완료되었을 때 실행되는 이벤트 핸들러
                    selection: function(event) {
                        // 드래그 취소 시 이벤트 무시
                        if (event.resetSelection) {
                            return
                        }

                        // 선택된 x축(시간) 범위의 최소값과 최대값 가져오기
                        const minTime = event.xAxis[0].min
                        const maxTime = event.xAxis[0].max

                        // 선택된 y축(지속시간) 범위의 최소값과 최대값 가져오기
                        const minDuration = event.yAxis[0].min
                        const maxDuration = event.yAxis[0].max

                        // PA0000 객체의 getApiListByPageUrl 함수 호출
                        if (typeof PA0000 !== 'undefined') {
                            // 타임스탬프의 소숫점 단위 제거 (밀리초 단위 정리)
                            v.from = Math.floor(minTime / 1000) * 1000
                            v.to = Math.floor(maxTime / 1000) * 1000
                            // 지속시간의 소숫점 단위 제거
                            v.durationFrom = Math.floor(minDuration)
                            v.durationTo = Math.floor(maxDuration)

                            // elementId에 따라 다른 함수 호출
                            const chartId = this.renderTo.id
                            if (chartId === 'ajaxPageChart') {
                                PA0000.v.class.ajaxPage.selectedRow = null
                                // 페이지 URL 분석 차트인 경우
                                PA0000.func.fetch.ajax.getLogListByTime('page',
                                    v.from,
                                    v.to,
                                    v.durationFrom,
                                    v.durationTo)
                            } else if (chartId === 'ajaxApiChart') {
                                PA0000.v.class.ajaxApi.selectedRow = null
                                // API URL 분석 차트인 경우
                                PA0000.func.fetch.ajax.getLogListByTime('api',
                                    v.from,
                                    v.to,
                                    v.durationFrom,
                                    v.durationTo)
                            }
                        }

                        // 기본 동작(줌)을 방지하려면 false 반환
                        // 줌 기능을 유지하려면 true 반환
                        return false
                    }
                },
                zooming: {
                    mouseWheel: false // 마우스 휠 줌 비활성화
                }
            },
            title: {
                text: ''
            },
            xAxis: {
                type: 'datetime',
                labels: {
                    format: '{value:%H:%M}'
                }
            },
            yAxis: {
                labels: {
                    formatter: function() {
                        return util.comma(this.value) + ' ms'
                    }
                }
            },
            colorAxis: {
                min: 0,
                startOnTick: false,
                endOnTick: false,
            },
            legend: {
                enabled: false  // 범례 비활성화
            },
            tooltip: {
                formatter: function () {
                    // this.point가 null이거나 undefined인 경우 기본 메시지 반환
                    if (!this.point) {
                        return '데이터가 없습니다';
                    }

                    return '<b>Time:</b> ' + Highcharts.dateFormat('%H:%M:%S', this.point.x) +
                        '<br><b>Duration:</b> ' + util.comma(this.point.y) + ' ms' +
                        '<br><b>Count:</b> ' + (this.point.value !== null && this.point.value !== undefined ?
                            util.comma(this.point.value) : '0');
                }
            },
            series: [{
                type: 'heatmap',
                name: 'API 호출',
                data: [], // setData에서 교체됨
                turboThreshold: 0, // 많은 데이터 처리 가능
                //colsize: 60 * 1000, // x축 단위: 1분 (예시)
                dataLabels: {
                    enabled: false
                }
            }]
        });
    }

    // 빨간색 계열 색상을 생성하는 헬퍼 메서드 추가
    _getRedColor(value, maxCount) {
        const ratio = Math.max(0, Math.min(1, value / maxCount));

        const darkYn = sessionStorage.getItem('maxyDarkYn')

        const r = 255;
        const g = darkYn === 'Y' ? 69 : 0;
        const b = darkYn === 'Y' ? 65 : 0;
        const a = darkYn === 'Y' ? ratio + 0.2 : ratio + 0.1; // 0(완전 투명) ~ 1(완전 불투명)

        return `rgba(${r}, ${g}, ${b}, ${a})`
    }

    setData(data, interval, type) {
        if (!data.datas || data.datas.length === 0) {
            console.warn('No data provided for heatmap')
            return
        }

        const v = this
        const {datas, maxCount, maxDuration, minTime, maxTime} = data

        if (datas.length === 0) {
            // 모든 count가 0인 경우 처리
            console.warn('모든 카운트 값이 0입니다. 차트를 표시하지 않습니다.');
            v.chart.series[0].setData([]);
            return;
        }

        // 투명도 스케일 생성 (0부터 1까지)
        const baseColor = this.options.baseColor

        const rowsize = Math.max(1, maxDuration / 20) // yAxis 범위를 50개 구간으로 나누어 표시

        // responseRange 값을 기준으로 색상 구분을 위해 데이터 가공
        const processedData = datas.map(point => {
            // point는 [x, y, value] 형태
            const x = point[0];
            const y = point[1]; // 지속시간(duration)
            const value = point[2]; // count 값

            // responseRange보다 큰 값인 경우 추가 속성 설정
            if (v.responseRange && y > v.responseRange) {
                return {
                    x: x,
                    y: y,
                    value: value,
                    color: this._getRedColor(value, maxCount) // 빨간색 계열 색상 생성
                };
            }

            return point; // 기존 값은 그대로 유지
        })

        let yAxisTitle = 'Duration (ms)'
        if (type === 'page') {
            yAxisTitle = 'Loading (ms)'
        } else if (type === 'api') {
            yAxisTitle = 'Response (ms)'
        }

        const darkYn = sessionStorage.getItem('maxyDarkYn')
        // 차트 옵션 업데이트
        v.chart.update({
            series: [{
                rowsize: rowsize,  // 계산된 rowsize 사용
                pointPadding: 0,   // 포인트 간 패딩 제거
                pointPlacement: 'on', // 포인트를 정확히 위치에 배치
                colsize: interval * 60000 // 60000 = 1분
            }],
            colorAxis: {
                min: 1,  // 0에서 1로 변경 - 0보다 큰 값부터 색상 적용
                max: maxCount, // 최대 count 값
                minColor: darkYn === 'Y' ? '#8A9696' : 'rgb(230, 250, 250)', // 아주 연한 밝은 청록
                maxColor: darkYn === 'Y' ? '#004A4D' : 'rgb(0, 96, 100)',    // 요청하신 진한 청록
                nullColor: 'rgba(0,0,0,0)'  // 완전 투명으로 변경
            },
            xAxis: {
                min: minTime,
                max: maxTime
            },
            yAxis: {
                title: {
                    text: yAxisTitle
                },
                min: 0,
                max: maxDuration + 100, // getApiHitmap.maxy에서 DurationStep의 interval값, yAxis-max치에 위치한 데이터 드래그로 조회가능 하게끔
                startOnTick: false, // false로 변경
                endOnTick: false,   // false로 변경
            }
        })

        // 데이터 설정
        v.chart.series[0].setData(processedData)
    }

    /**
     * 테이블 데이터 초기화
     */
    clear() {
        const v = this

        v.chart.series.forEach(series => {
            series.setData([])
        })
    }
}